import { Router, Response, NextFunction } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { randomUUID } from 'crypto';

const router = Router();

export interface LoyaltyReward {
  id: string;
  telegram_id: string;
  recipient_name?: string;
  recipient_username?: string;
  amount: number;
  title: string;
  message: string;
  scheduled_at: string; // ISO string
  status: 'pending' | 'claimed' | 'cancelled';
  created_at: string;
  claimed_at?: string;
  created_by?: string;
}

const SETTINGS_KEY = 'loyalty_rewards_data';

// Helper: load all rewards from settings table
async function loadRewards(): Promise<LoyaltyReward[]> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error || !data || !data.value) return [];
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[loyaltyRewards] Failed to load rewards from settings:', err);
    return [];
  }
}

// Helper: save all rewards to settings table
async function saveRewards(rewards: LoyaltyReward[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: SETTINGS_KEY,
        value: JSON.stringify(rewards),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      console.error('[loyaltyRewards] Error saving rewards:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[loyaltyRewards] Exception saving rewards:', err);
    return false;
  }
}

// Admin guard middleware (Allows both Admin and Worker roles)
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const telegramId = req.telegramUser?.id?.toString() || '';
  if (!telegramId) {
    res.status(401).json({ error: 'Unauthorized: Missing user info' });
    return;
  }
  const clean = telegramId.replace(/[^\d]/g, '');

  let query = supabase.from('users').select('role, permissions');
  if (clean && clean !== telegramId) {
    query = query.or(`telegram_id.eq.${telegramId},telegram_id.eq.${clean}`);
  } else {
    query = query.eq('telegram_id', telegramId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error || !data) {
    // Fallback: check direct eq by clean
    const fallback = await supabase.from('users').select('role').eq('telegram_id', clean || telegramId).maybeSingle();
    if (fallback.data && (fallback.data.role === 'admin' || fallback.data.role === 'worker')) {
      return next();
    }
    res.status(403).json({ error: 'Access denied: Admin or Worker required' });
    return;
  }

  if (data.role !== 'admin' && data.role !== 'worker') {
    res.status(403).json({ error: 'Access denied: Admin or Worker required' });
    return;
  }
  next();
};

// ==========================================
// USER ENDPOINTS (Authenticated via Telegram)
// ==========================================

/**
 * GET /api/loyalty-rewards/check
 * Checks if the logged-in user has any eligible pending loyalty reward that has reached its scheduled time.
 */
router.get('/check', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tgId = req.telegramUser?.id?.toString() || '';
    if (!tgId) {
      res.json({ hasReward: false });
      return;
    }

    const cleanId = tgId.replace(/[^\d]/g, '');
    const rewards = await loadRewards();
    const now = Date.now();

    // Find the first pending reward assigned to this user whose scheduled time has arrived
    const reward = rewards.find((r) => {
      const matchTarget = r.telegram_id === tgId || (cleanId && r.telegram_id === cleanId);
      if (!matchTarget) return false;
      if (r.status !== 'pending') return false;

      const schedTime = r.scheduled_at ? new Date(r.scheduled_at).getTime() : 0;
      return schedTime <= now;
    });

    if (!reward) {
      res.json({ hasReward: false });
      return;
    }

    res.json({
      hasReward: true,
      reward: {
        id: reward.id,
        amount: reward.amount,
        title: reward.title,
        message: reward.message,
        scheduled_at: reward.scheduled_at,
        created_at: reward.created_at,
      },
    });
  } catch (err: any) {
    console.error('[loyaltyRewards] check error:', err);
    res.status(500).json({ error: 'Failed to check loyalty rewards' });
  }
});

/**
 * POST /api/loyalty-rewards/claim
 * Claims a pending reward, adds the amount to the user's bonus_balance in DB, and permanently marks it claimed.
 */
router.post('/claim', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tgId = req.telegramUser?.id?.toString() || '';
    const cleanId = tgId.replace(/[^\d]/g, '');
    const { rewardId } = req.body;

    if (!rewardId) {
      res.status(400).json({ error: 'Reward ID is required' });
      return;
    }

    const rewards = await loadRewards();
    const now = Date.now();

    const rewardIndex = rewards.findIndex(
      (r) => r.id === rewardId &&
        (r.telegram_id === tgId || (cleanId && r.telegram_id === cleanId)) &&
        r.status === 'pending'
    );

    if (rewardIndex === -1) {
      res.status(404).json({ error: 'No claimable loyalty reward found' });
      return;
    }

    const reward = rewards[rewardIndex];
    const schedTime = reward.scheduled_at ? new Date(reward.scheduled_at).getTime() : 0;
    if (schedTime > now) {
      res.status(400).json({ error: 'Reward is scheduled for a future time' });
      return;
    }

    // 1. Fetch current user from DB
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('id, telegram_id, bonus_balance')
      .or(`telegram_id.eq.${tgId},telegram_id.eq.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (userErr || !userData) {
      res.status(404).json({ error: 'User record not found' });
      return;
    }

    const currentBonus = Number(userData.bonus_balance || 0);
    const addedAmount = Number(reward.amount || 50);
    const newBonusBalance = Number((currentBonus + addedAmount).toFixed(2));

    // 2. Mark reward as claimed in storage
    reward.status = 'claimed';
    reward.claimed_at = new Date().toISOString();
    rewards[rewardIndex] = reward;
    await saveRewards(rewards);

    // 3. Atomically update bonus_balance in users table
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        bonus_balance: newBonusBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.id);

    if (updateErr) {
      console.error('[loyaltyRewards] Failed to credit bonus balance:', updateErr);
      res.status(500).json({ error: 'Failed to update bonus balance' });
      return;
    }

    res.json({
      success: true,
      message: `Successfully claimed ${addedAmount} ETB bonus!`,
      newBonusBalance,
      reward,
    });
  } catch (err: any) {
    console.error('[loyaltyRewards] claim error:', err);
    res.status(500).json({ error: 'Failed to process reward claim' });
  }
});

// ==========================================
// ADMIN ENDPOINTS (Requires Admin privileges)
// ==========================================

/**
 * GET /api/loyalty-rewards/admin/list
 * Returns all granted loyalty rewards.
 */
router.get('/admin/list', validateTelegramAuth, requireAdmin, async (_req, res) => {
  try {
    const rewards = await loadRewards();
    // Sort newest first
    rewards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ success: true, rewards });
  } catch (err: any) {
    console.error('[loyaltyRewards] admin list error:', err);
    res.status(500).json({ error: 'Failed to fetch rewards list' });
  }
});

/**
 * GET /api/loyalty-rewards/admin/search-users?q=...
 * Autocomplete search for admin to easily pick a user.
 */
router.get('/admin/search-users', validateTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    let query = supabase
      .from('users')
      .select('id, telegram_id, username, first_name, main_balance, bonus_balance, total_wins, total_games')
      .order('created_at', { ascending: false })
      .limit(20);

    if (q) {
      query = query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%,telegram_id.ilike.%${q}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    res.json({ success: true, users: users || [] });
  } catch (err: any) {
    console.error('[loyaltyRewards] search-users error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * POST /api/loyalty-rewards/admin/create
 * Creates a new loyalty reward for a specific loyal customer.
 * Default amount is 50 ETB.
 */
router.post('/admin/create', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      telegram_id,
      amount = 50,
      title = 'የታማኝ ደንበኛ ልዩ ስጦታ 🎁',
      message = 'ለ Choice Bingo ላሳዩት ታማኝነት የተዘጋጀ ልዩ ስጦታ! ቦነሱን ተጠቅመው ይጫወቱ እና ያሸንፉ!',
      scheduled_at,
    } = req.body;

    if (!telegram_id || !telegram_id.toString().trim()) {
      res.status(400).json({ error: 'Target customer Telegram ID is required' });
      return;
    }

    const targetTgId = telegram_id.toString().trim();
    const cleanId = targetTgId.replace(/[^\d]/g, '');

    // Look up user details in DB
    const { data: userRow } = await supabase
      .from('users')
      .select('telegram_id, first_name, username')
      .or(`telegram_id.eq.${targetTgId},telegram_id.eq.${cleanId}`)
      .limit(1)
      .maybeSingle();

    const numericAmount = Math.max(1, Number(amount) || 50);
    const validScheduledAt = scheduled_at && !isNaN(Date.parse(scheduled_at))
      ? new Date(scheduled_at).toISOString()
      : new Date().toISOString();

    const newReward: LoyaltyReward = {
      id: randomUUID(),
      telegram_id: targetTgId,
      recipient_name: userRow?.first_name || 'Loyal Player',
      recipient_username: userRow?.username || '',
      amount: numericAmount,
      title: (title || 'የታማኝ ደንበኛ ልዩ ስጦታ 🎁').trim(),
      message: (message || 'ለ Choice Bingo ላሳዩት ታማኝነት የተዘጋጀ ልዩ ስጦታ! ቦነሱን ተጠቅመው ይጫወቱ እና ያሸንፉ!').trim(),
      scheduled_at: validScheduledAt,
      status: 'pending',
      created_at: new Date().toISOString(),
      created_by: req.telegramUser?.username || req.telegramUser?.id?.toString() || 'Admin',
    };

    const rewards = await loadRewards();
    rewards.unshift(newReward);
    const saved = await saveRewards(rewards);

    if (!saved) {
      res.status(500).json({ error: 'Failed to persist loyalty reward' });
      return;
    }

    res.json({ success: true, reward: newReward });
  } catch (err: any) {
    console.error('[loyaltyRewards] admin create error:', err);
    res.status(500).json({ error: 'Failed to create loyalty reward' });
  }
});

/**
 * DELETE /api/loyalty-rewards/admin/:id
 * Cancels or removes a pending loyalty reward.
 */
router.delete('/admin/:id', validateTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const rewards = await loadRewards();
    const index = rewards.findIndex((r) => r.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Reward not found' });
      return;
    }

    // If pending, mark as cancelled
    rewards[index].status = 'cancelled';
    await saveRewards(rewards);

    res.json({ success: true, message: 'Reward cancelled successfully' });
  } catch (err: any) {
    console.error('[loyaltyRewards] admin delete error:', err);
    res.status(500).json({ error: 'Failed to cancel reward' });
  }
});

export default router;
