import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { generateBingoCard, checkBingo, setPlayerMode } from '../services/BingoEngine';
import { getSettings } from './adminSettings';
import { randomUUID } from 'crypto';

const router = Router();

// ── GET /api/bingo/pools ── server-side unique player count (bypasses RLS) ──
router.get('/pools', validateTelegramAuth, async (_req, res) => {
  const { data: allGames } = await supabase
    .from('bingo_games')
    .select('id, stake, prize_pool, start_at, status, created_at')
    .in('status', ['waiting', 'calling'])
    .order('created_at', { ascending: false });

  if (!allGames || allGames.length === 0) { res.json({ pools: [] }); return; }

  // Deduplicate by stake: keep the newest game for each stake
  const seenStakes = new Set<number>();
  const games: typeof allGames = [];
  for (const g of allGames) {
    if (!seenStakes.has(g.stake)) {
      seenStakes.add(g.stake);
      games.push(g);
    }
  }

  const ids = games.map(g => g.id);
  const { data: rows } = await supabase
    .from('bingo_players')
    .select('game_id, telegram_id')
    .in('game_id', ids);

  // Count unique players per game
  const uniqueMap: Record<string, Set<string>> = {};
  (rows || []).forEach((r: any) => {
    if (!uniqueMap[r.game_id]) uniqueMap[r.game_id] = new Set();
    uniqueMap[r.game_id].add(r.telegram_id);
  });

  const pools = games.map(g => ({
    stake: g.stake,
    prize_pool: g.prize_pool,
    start_at: g.start_at,
    status: g.status,
    unique_players: uniqueMap[g.id]?.size || 0,
  }));

  res.json({ pools });
});

// ── GET /api/bingo/current ──────────────────────────────────────────────────
router.get('/current', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const stake = Number(req.query.stake) || 10;
  const excludeId = req.query.exclude_id ? String(req.query.exclude_id) : null;

  // 1. Check if a game finished in the last 2 seconds (< 2.0s)
  // Serves finished game for 2s so client catches the finish event & celebration triggers immediately.
  // After 2s, automatically serves the NEW waiting game so the new game loads behind the celebration card!
  const { data: latestFinished } = await supabase
    .from('bingo_games')
    .select('*')
    .eq('stake', stake)
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let game: any = null;
  const finishElapsed = latestFinished && latestFinished.finished_at
    ? Date.now() - new Date(latestFinished.finished_at).getTime()
    : Infinity;

  const isExcluded = Boolean(excludeId && latestFinished && latestFinished.id === excludeId);

  // Serve finished game for only 2 seconds (2000ms)
  if (latestFinished && finishElapsed >= 0 && finishElapsed < 2000 && !isExcluded) {
    game = latestFinished;
  } else {
    // 2. After 2s, immediately serve active new game (waiting or calling)
    const { data: activeGame } = await supabase
      .from('bingo_games')
      .select('*')
      .eq('stake', stake)
      .in('status', ['waiting', 'calling'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    game = activeGame;
  }

  // 3. Fallback: create fresh waiting game if none exists
  if (!game) {
    const id = randomUUID();
    const start_at = new Date(Date.now() + 86400000 * 365).toISOString();
    const { data: newGame } = await supabase.from('bingo_games').insert({
      id,
      stake,
      prize_pool: 0,
      status: 'waiting',
      called_numbers: [],
      start_at,
    }).select().single();
    game = newGame;
  }

  if (!game) { res.json({ game: null, taken_cartelas: [], my_card: null, my_cartelas: [], max_players: 200, max_cartelas_per_user: 4 }); return; }

  const { data: rows } = await supabase
    .from('bingo_players')
    .select('cartela_number, telegram_id, card_matrix, bonus_used, main_used')
    .eq('game_id', game.id);

  const taken_cartelas = (rows || []).map((p: any) => Number(p.cartela_number));
  const unique_players = new Set((rows || []).map((p: any) => p.telegram_id)).size;
  
  const myRows = (rows || []).filter((p: any) => p.telegram_id === telegramId);
  const my_cartelas = myRows.map((p: any) => ({
    cartela_number: p.cartela_number,
    card_matrix: p.card_matrix,
    bonus_used: Number(p.bonus_used || 0),
    main_used: Number(p.main_used || 0),
  }));
  // Backward compat: my_card = first cartela
  const my_card = my_cartelas.length > 0 ? my_cartelas[0] : null;

  const cfg = await getSettings();
  const maxPlayersAllowed = Math.min(500, cfg.max_players || 200);
  res.json({ game, taken_cartelas, unique_players, my_card, my_cartelas, max_players: maxPlayersAllowed, max_cartelas_per_user: cfg.max_cartelas_per_user });
});

// ── POST /api/bingo/join ────────────────────────────────────────────────────
router.post('/join', validateTelegramAuth, async (req: AuthRequest, res) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { cartela_number } = req.body;
    const seat = Number(cartela_number);
    const cfg = await getSettings();
    const maxPlayersAllowed = Math.min(500, cfg.max_players || 200);

    if (!seat || seat < 1 || seat > maxPlayersAllowed) {
      res.status(400).json({ error: `Pick a cartela between 1 and ${maxPlayersAllowed}` }); return;
    }

    const requestedStake = req.body.stake || 10;
    const requestedGameId = req.body.game_id; // frontend can pass the exact game id

    let game: any = null;

    // 1. If frontend sent the specific game id, use that directly (most reliable)
    if (requestedGameId) {
      const { data } = await supabase
        .from('bingo_games')
        .select('id, stake, status, start_at')
        .eq('id', requestedGameId)
        .eq('status', 'waiting')
        .maybeSingle();
      game = data;
    }

    // 2. Fallback: find any waiting game for this stake
    if (!game) {
      const { data: gamesData } = await supabase
        .from('bingo_games')
        .select('id, stake, status, start_at')
        .eq('status', 'waiting')
        .eq('stake', Number(requestedStake))
        .order('created_at', { ascending: false })
        .limit(1);
      game = gamesData?.[0] ?? null;
    }

    if (!game) {
      res.status(400).json({ error: 'No game accepting players for this stake right now.' }); return;
    }

    // 3. Fast pre-check: Is seat already taken?
    const { data: seatTaken } = await supabase
      .from('bingo_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('cartela_number', seat)
      .maybeSingle();

    if (seatTaken) {
      res.status(400).json({ error: 'This cartela is already taken! Please pick another.' }); return;
    }

    const { data: existing } = await supabase
      .from('bingo_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('telegram_id', telegramId);
    const existingCount = existing?.length || 0;
    if (existingCount >= (cfg.max_cartelas_per_user || 4)) {
      res.status(400).json({ error: `You can only pick ${cfg.max_cartelas_per_user || 4} cartelas per game` }); return;
    }

    const { data: user } = await supabase.from('users').select('main_balance, bonus_balance, first_name').eq('telegram_id', telegramId).single();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    
    const stakeAmt = Number(game.stake);
    const mainBal = Number(user.main_balance || 0);
    const bonusBal = Number(user.bonus_balance || 0);
    
    if (mainBal + bonusBal < stakeAmt) {
      res.status(400).json({ error: `Insufficient balance — need ${stakeAmt} ETB` }); return;
    }

    let toDeduct = stakeAmt;
    let newBonus = bonusBal;
    let newMain = mainBal;

    // Track how much came from each wallet for accurate refund later
    let bonusUsed = 0;
    let mainUsed = 0;

    // Deduct from BONUS BALANCE first, fallback to MAIN BALANCE
    if (newBonus >= toDeduct) {
      bonusUsed = toDeduct;
      newBonus -= toDeduct;
      toDeduct = 0;
    } else {
      bonusUsed = newBonus;
      toDeduct -= newBonus;
      newBonus = 0;
      mainUsed = toDeduct;
      newMain -= toDeduct;
      toDeduct = 0;
    }

    const { error: deductErr } = await supabase
      .from('users')
      .update({ main_balance: newMain, bonus_balance: newBonus })
      .eq('telegram_id', telegramId);

    if (deductErr) { res.status(400).json({ error: 'Payment failed — please try again' }); return; }

    // Validate or generate card_matrix
    let card_matrix = req.body.card_matrix;
    if (!card_matrix || !Array.isArray(card_matrix) || card_matrix.length !== 5) {
      card_matrix = generateBingoCard();
    } else {
      // Basic validation to prevent obvious cheating
      let valid = true;
      const zones = [[1,15],[16,30],[31,45],[46,60],[61,75]];
      for (let c=0; c<5; c++) {
        const [lo, hi] = zones[c];
        const seen = new Set();
        for (let r=0; r<5; r++) {
          if (c===2 && r===2) continue; // Free space
          const val = card_matrix[r][c];
          if (typeof val !== 'number' || val < lo || val > hi || seen.has(val)) valid = false;
          seen.add(val);
        }
      }
      if (!valid) card_matrix = generateBingoCard();
      card_matrix[2][2] = 0; // Ensure free space
    }

    const { error: insertErr } = await supabase.from('bingo_players').insert({
      game_id: game.id,
      telegram_id: telegramId,
      first_name: user.first_name || 'User',
      cartela_number: seat,
      card_matrix,
      bonus_used: bonusUsed,
      main_used: mainUsed,
    });

    if (insertErr) {
      await supabase.from('users').update({ main_balance: mainBal, bonus_balance: bonusBal }).eq('telegram_id', telegramId);
      if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key')) {
        res.status(400).json({ error: 'Cartela was just taken by another player! Please pick another.' });
      } else {
        res.status(400).json({ error: `Could not join: ${insertErr.message}` });
      }
      return;
    }

    const { data: pRows } = await supabase.from('bingo_players').select('telegram_id').eq('game_id', game.id);
    const unique_players = new Set((pRows || []).map((r: any) => r.telegram_id)).size;
    const total_cartelas = pRows?.length ?? 1;

    // Derash = total cartelas × stake (pot grows per cartela bought)
    // Commission only applies when unique players >= 3
    const rawPool = total_cartelas * stakeAmt;
    const prizePool = unique_players < 3
      ? rawPool
      : Math.floor(rawPool * (cfg.prize_percent || 80) / 100);

    let newStartAt = game.start_at;
    // Trigger countdown from settings waiting_period_s when first player joins
    if (new Date(game.start_at).getTime() > Date.now() + 86400000) {
      newStartAt = new Date(Date.now() + Math.min(30, cfg.waiting_period_s || 30) * 1000).toISOString();
    }

    await supabase.from('bingo_games').update({
      prize_pool: prizePool,
      start_at: newStartAt,
      updated_at: new Date().toISOString()
    }).eq('id', game.id);

    res.json({
      success: true,
      cartela_number: seat,
      card_matrix,
      unique_players,
      bonus_used: bonusUsed,
      main_used: mainUsed,
      main_balance: newMain,
      bonus_balance: newBonus,
    });
  } catch (err: any) {
    console.error('Error in /api/bingo/join:', err);
    res.status(500).json({ error: err.message || 'Server error joining game' });
  }
});

// ── POST /api/bingo/release ── release / unselect a bought cartela in waiting phase ──
router.post('/release', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { cartela_number, game_id } = req.body;
  const seat = Number(cartela_number);

  if (!seat) {
    res.status(400).json({ error: 'cartela_number is required' });
    return;
  }

  // 1. Find the waiting game
  let gameQuery = supabase.from('bingo_games').select('*').eq('status', 'waiting');
  if (game_id) {
    gameQuery = gameQuery.eq('id', game_id);
  }
  const { data: games } = await gameQuery.limit(1);
  const game = games?.[0];

  if (!game) {
    res.status(400).json({ error: 'Game not found or has already started' });
    return;
  }

  // 2. Find the player entry
  const { data: playerEntry } = await supabase
    .from('bingo_players')
    .select('*')
    .eq('game_id', game.id)
    .eq('telegram_id', telegramId)
    .eq('cartela_number', seat)
    .maybeSingle();

  if (!playerEntry) {
    res.status(404).json({ error: 'Cartela not found for this user in this game' });
    return;
  }

  // 3. Delete player entry
  const { error: delErr } = await supabase
    .from('bingo_players')
    .delete()
    .eq('id', playerEntry.id);

  if (delErr) {
    res.status(500).json({ error: 'Failed to release cartela' });
    return;
  }

  // 4. Refund user balances
  const bonusRefund = Number(playerEntry.bonus_used || 0);
  const mainRefund = Number(playerEntry.main_used !== undefined ? playerEntry.main_used : (playerEntry.bonus_used ? 0 : game.stake));

  const { data: user } = await supabase
    .from('users')
    .select('main_balance, bonus_balance')
    .eq('telegram_id', telegramId)
    .single();

  const newMain = Number(user?.main_balance || 0) + mainRefund;
  const newBonus = Number(user?.bonus_balance || 0) + bonusRefund;

  await supabase
    .from('users')
    .update({ main_balance: newMain, bonus_balance: newBonus })
    .eq('telegram_id', telegramId);

  // 5. Recalculate game prize pool & unique players
  const { data: remainingPlayers } = await supabase
    .from('bingo_players')
    .select('telegram_id')
    .eq('game_id', game.id);

  const totalCartelas = remainingPlayers?.length || 0;
  const uniquePlayers = new Set((remainingPlayers || []).map((r: any) => r.telegram_id)).size;
  const cfg = await getSettings();
  const rawPool = totalCartelas * Number(game.stake);
  const prizePool = uniquePlayers < 3
    ? rawPool
    : Math.floor(rawPool * (cfg.prize_percent || 80) / 100);

  // If no players left, reset start_at countdown
  let newStartAt = game.start_at;
  if (totalCartelas === 0) {
    newStartAt = new Date(Date.now() + 86400000 * 365).toISOString();
  }

  await supabase.from('bingo_games').update({
    prize_pool: prizePool,
    start_at: newStartAt,
    updated_at: new Date().toISOString()
  }).eq('id', game.id);

  res.json({
    success: true,
    cartela_number: seat,
    refunded_main: mainRefund,
    refunded_bonus: bonusRefund,
    main_balance: newMain,
    bonus_balance: newBonus,
    unique_players: uniquePlayers,
    total_cartelas: totalCartelas,
    prize_pool: prizePool
  });
});

router.get('/card', async (req, res) => {
  const { game_id, cartela } = req.query;
  if (!game_id || !cartela) { res.json({ matrix: null }); return; }
  const cNum = Number(cartela);
  const { data } = await supabase.from('bingo_players')
    .select('card_matrix')
    .eq('game_id', String(game_id))
    .eq('cartela_number', isNaN(cNum) ? cartela : cNum)
    .maybeSingle();
  res.json({ matrix: data?.card_matrix || null });
});

router.get('/winners', async (req, res) => {
  const { game_id } = req.query;
  if (!game_id) { res.status(400).json({ error: 'game_id required' }); return; }
  const { data: game } = await supabase.from('bingo_games').select('called_numbers').eq('id', String(game_id)).maybeSingle();
  if (!game) { res.json({ winners: [] }); return; }
  
  const { data: players } = await supabase.from('bingo_players').select('first_name, cartela_number, card_matrix').eq('game_id', String(game_id));
  
  const winners = (players || []).filter(p => checkBingo(p.card_matrix as number[][], game.called_numbers));
  res.json({ winners });
});

// ── POST /api/bingo/claim ── manual bingo claim validation and reward ─────────
router.post('/claim', validateTelegramAuth, async (req: AuthRequest, res) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { game_id, cartela_number } = req.body;

    if (!game_id) {
      res.status(400).json({ error: 'game_id required' });
      return;
    }

    const { data: game } = await supabase
      .from('bingo_games')
      .select('*')
      .eq('id', game_id)
      .single();

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.status !== 'calling') {
      res.status(400).json({ error: 'Game is not active or already finished' });
      return;
    }

    const { data: pRows } = await supabase
      .from('bingo_players')
      .select('cartela_number, card_matrix, first_name')
      .eq('game_id', game_id)
      .eq('telegram_id', telegramId);

    if (!pRows || pRows.length === 0) {
      res.status(400).json({ error: 'No cartela registered for this game' });
      return;
    }

    const cardsToCheck = cartela_number
      ? pRows.filter((p: any) => Number(p.cartela_number) === Number(cartela_number))
      : pRows;

    const winningCartela = cardsToCheck.find((p: any) => checkBingo(p.card_matrix as number[][], game.called_numbers));

    if (!winningCartela) {
      res.status(400).json({ error: 'False Bingo claim! No winning pattern found.' });
      return;
    }

    const cfg = await getSettings();
    let finalPrize = Number(game.prize_pool || 0);
    const called = game.called_numbers || [];
    let isEarlyCall = false;

    if (cfg.early_call_8_enabled && called.length <= 8) {
      const rewards8 = cfg.early_call_8_rewards as Record<string, number>;
      const rew = rewards8[String(game.stake)];
      if (rew) { finalPrize = Number(rew); isEarlyCall = true; }
    } else if (cfg.early_call_10_enabled && called.length <= 10) {
      const rewards10 = cfg.early_call_10_rewards as Record<string, number>;
      const rew = rewards10[String(game.stake)];
      if (rew) { finalPrize = Number(rew); isEarlyCall = true; }
    }

    const { data: claim, error: claimErr } = await supabase
      .from('bingo_games')
      .update({
        status: 'finished',
        winner_telegram_id: telegramId,
        winner_first_name: isEarlyCall ? `🚀 EARLY BINGO: ${winningCartela.first_name}` : winningCartela.first_name,
        winner_cartela: winningCartela.cartela_number,
        winner_prize: finalPrize,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', game.id)
      .eq('status', 'calling')
      .select('id');

    if (claimErr || !claim || claim.length === 0) {
      res.status(400).json({ error: 'Game already claimed or finished' });
      return;
    }

    const { data: u } = await supabase
      .from('users')
      .select('main_balance, total_wins')
      .eq('telegram_id', telegramId)
      .single();

    if (u) {
      await supabase.from('users').update({
        main_balance: Number(u.main_balance || 0) + finalPrize,
        total_wins: Number(u.total_wins || 0) + 1,
      }).eq('telegram_id', telegramId);
    }

    res.json({
      success: true,
      winner: winningCartela.first_name,
      cartela: winningCartela.cartela_number,
      prize: finalPrize,
    });
  } catch (err: any) {
    console.error('[Claim Bingo Error]', err);
    res.status(500).json({ error: 'Internal server error while claiming bingo' });
  }
});

// ── POST /api/bingo/mode ── player toggles Auto vs Manual mode ────────────────
router.post('/mode', validateTelegramAuth, (req: AuthRequest, res) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { game_id, is_auto } = req.body;
    if (!game_id) {
      res.status(400).json({ error: 'game_id required' });
      return;
    }
    setPlayerMode(String(game_id), telegramId, is_auto !== false);
    res.json({ success: true, is_auto: is_auto !== false });
  } catch (err: any) {
    console.error('[Set Mode Error]', err);
    res.status(500).json({ error: 'Failed to update mode' });
  }
});

router.get('/tts', async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) { res.status(400).send('No text'); return; }
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=am&client=tw-ob&q=' + encodeURIComponent(String(text));
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!r.ok) throw new Error('TTS failed');
    const buffer = await r.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=864000');
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error('[TTS Proxy Error]', e);
    res.status(500).send('Error');
  }
});
export default router;
