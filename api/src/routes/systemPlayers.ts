import { Router, Response, NextFunction } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import {
  getSystemPlayersConfig,
  saveSystemPlayersConfig,
  getSystemPlayers,
  seedSystemPlayers,
  updateSystemPlayer,
  addSystemPlayer,
} from '../services/systemPlayers';

const router = Router();
router.use(validateTelegramAuth);

// Admin authorization guard
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const telegramId = req.telegramUser?.id?.toString() || '';
  const clean = telegramId.replace(/[^\d]/g, '');

  const { data } = await supabase
    .from('users')
    .select('role')
    .or(`telegram_id.eq.${telegramId},telegram_id.eq.${clean}`)
    .limit(1)
    .maybeSingle();

  if (data?.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Admin only' });
    return;
  }
  next();
};

router.use(requireAdmin);

// GET /api/admin/system-players/config
router.get('/config', async (_req, res) => {
  try {
    const config = await getSystemPlayersConfig();
    res.json({ success: true, config, ...config });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch config' });
  }
});

// PUT /api/admin/system-players/config
router.put('/config', async (req, res) => {
  try {
    const updated = await saveSystemPlayersConfig(req.body);
    res.json({ success: true, config: updated, ...updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save config' });
  }
});

// GET /api/admin/system-players/players?page=1&limit=50&search=
router.get('/players', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(10, Math.min(100, Number(req.query.limit) || 50));
    const search = String(req.query.search || req.query.q || '');

    const { players, total } = await getSystemPlayers(page, limit, search);
    const totalPages = Math.ceil(total / limit) || 1;
    res.json({ players, total, page, limit, totalPages });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch system players' });
  }
});

// POST /api/admin/system-players/seed
router.post('/seed', async (req, res) => {
  try {
    const count = Math.max(10, Math.min(1000, Number(req.body?.count) || 1000));
    const result = await seedSystemPlayers(count);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed system players' });
  }
});

// PUT /api/admin/system-players/players/:telegramId
router.put('/players/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { first_name, total_wins, is_active } = req.body;

    const ok = await updateSystemPlayer(telegramId, { first_name, total_wins, is_active });
    if (!ok) {
      res.status(400).json({ error: 'Failed to update system player' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update player' });
  }
});

// POST /api/admin/system-players/players
router.post('/players', async (req, res) => {
  try {
    const { first_name, total_wins } = req.body;
    if (!first_name || !first_name.trim()) {
      res.status(400).json({ error: 'First name is required' });
      return;
    }

    const created = await addSystemPlayer(first_name.trim(), Number(total_wins) || 0);
    if (!created) {
      res.status(500).json({ error: 'Could not create system player' });
      return;
    }
    res.json({ success: true, player: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add player' });
  }
});

export default router;
