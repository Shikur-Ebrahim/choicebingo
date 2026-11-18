import { Router } from 'express';
import { AuthRequest, optionalTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

// GET /api/leaderboard/players — directly sourced from users and system_players total_wins (no bingo_games dependency)
router.get('/players', optionalTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser?.id ? req.telegramUser.id.toString() : null;

  try {
    // 1. Fetch system players with total_wins
    const { data: spRows, error: spErr } = await supabase
      .from('system_players')
      .select('telegram_id, first_name, total_wins')
      .gt('total_wins', 0)
      .eq('is_active', true);

    if (spErr) {
      console.error('[Leaderboard] Error fetching system players:', spErr.message);
    }

    // 2. Fetch real users with total_wins > 0
    const { data: userRows, error: userErr } = await supabase
      .from('users')
      .select('telegram_id, first_name, username, total_wins')
      .gt('total_wins', 0);

    if (userErr) {
      console.error('[Leaderboard] Error fetching users:', userErr.message);
    }

    // Map by telegram_id to deduplicate
    const playerMap = new Map<string, { telegram_id: string; first_name: string; username: string; wins: number }>();

    // Add system players
    for (const sp of spRows || []) {
      const tid = String(sp.telegram_id);
      const wins = Number(sp.total_wins || 0);
      if (wins > 0) {
        playerMap.set(tid, {
          telegram_id: tid,
          first_name: sp.first_name || 'System Player',
          username: '',
          wins,
        });
      }
    }

    // Add users (real users take precedence if duplicate)
    for (const u of userRows || []) {
      const tid = String(u.telegram_id);
      const wins = Number(u.total_wins || 0);
      if (wins > 0) {
        playerMap.set(tid, {
          telegram_id: tid,
          first_name: u.first_name || u.username || 'Player',
          username: u.username || '',
          wins,
        });
      }
    }

    // Sort by total_wins descending
    const allPlayers = Array.from(playerMap.values())
      .sort((a, b) => b.wins - a.wins)
      .map((p, index) => ({
        rank: index + 1,
        telegram_id: p.telegram_id,
        first_name: p.first_name,
        username: p.username,
        wins: p.wins,
      }));

    // Pagination (defaults to 50 players per page)
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(10, Math.min(100, parseInt(req.query.limit as string, 10) || 50));
    const total = allPlayers.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pagedPlayers = allPlayers.slice(offset, offset + limit);

    // Find current user's rank across entire leaderboard
    const myRank = telegramId ? (allPlayers.findIndex(p => p.telegram_id === telegramId) + 1 || null) : null;

    res.json({
      players: pagedPlayers,
      total,
      page,
      totalPages,
      limit,
      my_rank: myRank,
    });
  } catch (err: any) {
    console.error('[Leaderboard] Error loading players leaderboard:', err?.message || err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
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
    res.json({ inviters: [], total: 0, page: 1, totalPages: 1, limit: 50, my_rank: null });
    return;
  }

  // Fetch names for top inviters
  const allInviterEntries = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
  const allIds = allInviterEntries.map(([id]) => id);

  const { data: users } = await supabase
    .from('users')
    .select('telegram_id, first_name, username')
    .in('telegram_id', allIds.slice(0, 500));

  const nameMap: Record<string, { first_name: string; username: string }> = {};
  for (const u of users || []) {
    nameMap[u.telegram_id] = { first_name: u.first_name || 'User', username: u.username || '' };
  }

  const allInviters = allInviterEntries.map(([id, count], i) => ({
    rank: i + 1,
    telegram_id: id,
    first_name: nameMap[id]?.first_name || 'User',
    username: nameMap[id]?.username || '',
    invites: count,
  }));

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.max(10, Math.min(100, parseInt(req.query.limit as string, 10) || 50));
  const total = allInviters.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const pagedInviters = allInviters.slice(offset, offset + limit);

  const myRank = telegramId ? (allInviters.findIndex(p => p.telegram_id === telegramId) + 1 || null) : null;

  res.json({
    inviters: pagedInviters,
    total,
    page,
    totalPages,
    limit,
    my_rank: myRank,
  });
});

export default router;
