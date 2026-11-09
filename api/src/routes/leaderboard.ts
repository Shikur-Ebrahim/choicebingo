import { Router } from 'express';
import { AuthRequest, optionalTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

// GET /api/leaderboard/players?period=all|daily|weekly|monthly
router.get('/players', optionalTelegramAuth, async (req: AuthRequest, res) => {
  const period = (req.query.period as string) || 'all';
  const telegramId = req.telegramUser?.id ? req.telegramUser.id.toString() : null;

  // Build date filter using UTC so server timezone doesn't skew results
  let fromDate: string | null = null;
  const now = new Date();
  if (period === 'daily') {
    // Today only: from today's midnight UTC
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    fromDate = d.toISOString();
  } else if (period === 'weekly') {
    // Last 7 days including today: from midnight of (today - 6 days) UTC
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - 6);
    fromDate = d.toISOString();
  } else if (period === 'monthly') {
    // Last 30 days including today: from midnight of (today - 29 days) UTC
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - 29);
    fromDate = d.toISOString();
  }
  // 'all' period: fromDate stays null (no filter)

  // ALL PERIODS: query bingo_games so the source of truth is always consistent
  let q = supabase
    .from('bingo_games')
    .select('id, winner_telegram_id, winner_first_name, winner_prize, finished_at')
    .eq('status', 'finished');
  if (fromDate) q = q.gte('finished_at', fromDate);
  const { data: games } = await q;

  // Identify 2-way tie games that need second winner lookup (where winner_telegram_id has only 1 ID)
  const tieGameIds: string[] = [];
  for (const g of games || []) {
    if (!g.winner_telegram_id || g.winner_first_name === 'REMATCH' || (g.winner_first_name || '').startsWith('REMATCH')) continue;
    if (g.winner_first_name && g.winner_first_name.includes(' & ') && !g.winner_telegram_id.includes(',')) {
      tieGameIds.push(g.id);
    }
  }

  // Pre-fetch player details for historical tie games to find second winner accurately
  const gamePlayerMap: Record<string, { telegram_id: string; first_name: string }[]> = {};
  if (tieGameIds.length > 0) {
    const { data: tiePlayers } = await supabase
      .from('bingo_players')
      .select('game_id, telegram_id, first_name')
      .in('game_id', tieGameIds);

    for (const p of tiePlayers || []) {
      if (!gamePlayerMap[p.game_id]) gamePlayerMap[p.game_id] = [];
      gamePlayerMap[p.game_id].push({ telegram_id: p.telegram_id, first_name: p.first_name });
    }
  }

  // Count wins and prizes per verified winner:
  // 1) REMATCH games never add wins
  // 2) Ties give EXACTLY 1 win (+1) to winner 1 and EXACTLY 1 win (+1) to winner 2
  // 3) Non-winning players in tie games get 0 wins
  const map: Record<string, { wins: number; total_prize: number }> = {};

  for (const g of games || []) {
    // 1. Rematch check: REMATCH games NEVER add any wins to leaderboard
    if (!g.winner_telegram_id || g.winner_first_name === 'REMATCH' || (g.winner_first_name || '').startsWith('REMATCH')) {
      continue;
    }

    const prize = Number(g.winner_prize) || 0;
    const isTie = g.winner_first_name && g.winner_first_name.includes(' & ');

    // Use a Set to ensure every winning player gets EXACTLY 1 win per game (never duplicated by multiple cartelas)
    const winnersForThisGame = new Set<string>();

    if (isTie) {
      const parts = g.winner_first_name.split(' & ').map((s: string) => s.trim());
      const w2Name = parts[1] || '';

      // Comma-separated IDs (stored by BingoEngine for 2-way ties)
      const ids = g.winner_telegram_id.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (ids.length >= 2) {
        winnersForThisGame.add(ids[0]);
        winnersForThisGame.add(ids[1]);
      } else {
        // Historical games: winner1 is in winner_telegram_id
        const w1Id = ids[0] || g.winner_telegram_id;
        winnersForThisGame.add(w1Id);

        // Find second winner from tie players whose name matches w2Name
        const players = gamePlayerMap[g.id] || [];
        const matchW2 = players.find(p => p.telegram_id !== w1Id && (p.first_name?.trim() === w2Name || w2Name.includes(p.first_name?.trim())));
        if (matchW2) {
          winnersForThisGame.add(matchW2.telegram_id);
        }
      }
    } else {
      // Normal single winner game
      const wId = g.winner_telegram_id.trim();
      if (wId) winnersForThisGame.add(wId);
    }

    // Award exactly 1 win to each verified winner for this game
    for (const tid of winnersForThisGame) {
      if (!map[tid]) {
        map[tid] = { wins: 0, total_prize: 0 };
      }
      map[tid].wins += 1;
      map[tid].total_prize += prize;
    }
  }

  // Fetch accurate first_names from users table
  const allIds = Object.keys(map);
  const nameMap: Record<string, string> = {};
  if (allIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('telegram_id, first_name')
      .in('telegram_id', allIds);
    for (const u of usersData || []) {
      nameMap[u.telegram_id] = u.first_name || 'User';
    }
  }

  const topPlayers = Object.entries(map)
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, 50)
    .map(([tid, v], i) => ({
      rank: i + 1,
      telegram_id: tid,
      first_name: nameMap[tid] || 'User',
      username: '',
      wins: v.wins,
      total_prize: v.total_prize,
    }));

  // Find current user's rank
  const myRank = telegramId ? (topPlayers.findIndex(p => p.telegram_id === telegramId) + 1 || null) : null;

  res.json({ players: topPlayers, my_rank: myRank });
});

// GET /api/leaderboard/inviters — top users by number of invited users who deposited
router.get('/inviters', optionalTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser?.id ? req.telegramUser.id.toString() : null;

  // Get all users with inviter_id set
  const { data: invited } = await supabase
    .from('users')
    .select('inviter_id')
    .not('inviter_id', 'is', null);

  // Count invites per inviter
  const countMap: Record<string, number> = {};
  for (const row of invited || []) {
    if (!row.inviter_id) continue;
    countMap[row.inviter_id] = (countMap[row.inviter_id] || 0) + 1;
  }

  if (Object.keys(countMap).length === 0) {
    res.json({ inviters: [], my_rank: null });
    return;
  }

  // Fetch names for top inviters
  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([id]) => id);

  const { data: users } = await supabase
    .from('users')
    .select('telegram_id, first_name, username')
    .in('telegram_id', topIds);

  const nameMap: Record<string, { first_name: string; username: string }> = {};
  for (const u of users || []) {
    nameMap[u.telegram_id] = { first_name: u.first_name || 'User', username: u.username || '' };
  }

  const inviters = topIds.map((id, i) => ({
    rank: i + 1,
    telegram_id: id,
    first_name: nameMap[id]?.first_name || 'User',
    username: nameMap[id]?.username || '',
    invites: countMap[id] || 0,
  }));

  const myRank = telegramId ? (inviters.findIndex(p => p.telegram_id === telegramId) + 1 || null) : null;

  res.json({ inviters, my_rank: myRank });
});

export default router;
