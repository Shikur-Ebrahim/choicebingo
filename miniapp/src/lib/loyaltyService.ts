import { supabase } from './supabase';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const SETTINGS_KEY = 'loyalty_rewards_data';

export interface LoyaltyReward {
  id: string;
  telegram_id: string;
  recipient_name?: string;
  recipient_username?: string;
  amount: number;
  title: string;
  message: string;
  scheduled_at: string;
  status: 'pending' | 'claimed' | 'cancelled';
  created_at: string;
  claimed_at?: string;
  created_by?: string;
}

export interface UserCandidate {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  main_balance: number;
  bonus_balance: number;
  total_wins: number;
  total_games: number;
}

function getAuthHeaders() {
  let initData = '';
  if (typeof WebApp !== 'undefined' && WebApp.initData) {
    initData = WebApp.initData;
  }
  const pwaPhone = typeof window !== 'undefined' ? localStorage.getItem('cb_pwa_phone') || '' : '';
  return {
    'Content-Type': 'application/json',
    'x-telegram-init-data': initData,
    'x-pwa-phone': pwaPhone,
  };
}

/**
 * Helper to generate a unique ID without external dependencies
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'lr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * 1. Fetch all loyalty rewards (API with Supabase fallback)
 */
export async function getLoyaltyRewards(): Promise<LoyaltyReward[]> {
  try {
    const res = await fetch(`${API_URL}/loyalty-rewards/admin/list`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.rewards)) return data.rewards;
    }
  } catch {}

  // Failsafe: Direct Supabase query (never 404s)
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error || !data || !data.value) return [];
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    const rewards: LoyaltyReward[] = Array.isArray(parsed) ? parsed : [];
    rewards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return rewards;
  } catch (err) {
    console.error('[loyaltyService] Error reading rewards from Supabase:', err);
    return [];
  }
}

/**
 * 2. Search users by username, first_name, or telegram_id (API with Supabase fallback)
 */
export async function searchUsers(query: string): Promise<UserCandidate[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(`${API_URL}/loyalty-rewards/admin/search-users?q=${encodeURIComponent(q)}`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) return data.users;
    }
  } catch {}

  // Failsafe: Direct Supabase query
  try {
    let dbQuery = supabase
      .from('users')
      .select('id, telegram_id, username, first_name, main_balance, bonus_balance, total_wins, total_games')
      .or(`username.ilike.%${q}%,first_name.ilike.%${q}%,telegram_id.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: users, error } = await dbQuery;
    if (error) throw error;
    return (users || []).map((u) => ({
      id: u.id,
      telegram_id: u.telegram_id,
      username: u.username || '',
      first_name: u.first_name || 'User',
      main_balance: Number(u.main_balance || 0),
      bonus_balance: Number(u.bonus_balance || 0),
      total_wins: Number(u.total_wins || 0),
      total_games: Number(u.total_games || 0),
    }));
  } catch (err) {
    console.error('[loyaltyService] Error searching users from Supabase:', err);
    return [];
  }
}

/**
 * 3. Create a new loyalty reward (API with Supabase fallback)
 */
export async function createLoyaltyReward(payload: {
  telegram_id: string;
  amount: number;
  title?: string;
  message?: string;
  scheduled_at?: string;
}): Promise<{ success: boolean; reward?: LoyaltyReward; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/loyalty-rewards/admin/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.reward) return { success: true, reward: data.reward };
    }
  } catch {}

  // Failsafe: Direct Supabase creation
  try {
    const tgId = payload.telegram_id.trim();
    const cleanId = tgId.replace(/[^\d]/g, '');

    // Look up recipient info
    const { data: userRow } = await supabase
      .from('users')
      .select('telegram_id, first_name, username')
      .or(`telegram_id.eq.${tgId},telegram_id.eq.${cleanId}`)
      .limit(1)
      .maybeSingle();

    const numericAmount = Math.max(1, Number(payload.amount) || 50);
    const validScheduledAt = payload.scheduled_at && !isNaN(Date.parse(payload.scheduled_at))
      ? new Date(payload.scheduled_at).toISOString()
      : new Date().toISOString();

    const newReward: LoyaltyReward = {
      id: generateId(),
      telegram_id: tgId,
      recipient_name: userRow?.first_name || 'Loyal Player',
      recipient_username: userRow?.username || '',
      amount: numericAmount,
      title: (payload.title || 'የታማኝ ደንበኛ ልዩ ስጦታ 🎁').trim(),
      message: (payload.message || 'ለ Choice Bingo ላሳዩት ታማኝነት የተዘጋጀ ልዩ ስጦታ! ቦነሱን ተጠቅመው ይጫወቱ እና ያሸንፉ!').trim(),
      scheduled_at: validScheduledAt,
      status: 'pending',
      created_at: new Date().toISOString(),
      created_by: 'Staff',
    };

    // Load existing rewards
    const { data: existingRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    let existingList: LoyaltyReward[] = [];
    if (existingRow && existingRow.value) {
      existingList = typeof existingRow.value === 'string' ? JSON.parse(existingRow.value) : existingRow.value;
    }
    if (!Array.isArray(existingList)) existingList = [];

    existingList.unshift(newReward);

    const { error: upsertErr } = await supabase
      .from('settings')
      .upsert({
        key: SETTINGS_KEY,
        value: JSON.stringify(existingList),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (upsertErr) throw upsertErr;

    return { success: true, reward: newReward };
  } catch (err: any) {
    console.error('[loyaltyService] Error saving reward to Supabase:', err);
    return { success: false, error: err.message || 'ስጦታውን ማስተላለፍ አልተቻለም' };
  }
}

/**
 * 4. Cancel a pending loyalty reward (API with Supabase fallback)
 */
export async function cancelLoyaltyReward(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/loyalty-rewards/admin/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return true;
    }
  } catch {}

  // Failsafe: Direct Supabase cancellation
  try {
    const { data: existingRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (!existingRow || !existingRow.value) return false;
    let list: LoyaltyReward[] = typeof existingRow.value === 'string' ? JSON.parse(existingRow.value) : existingRow.value;
    if (!Array.isArray(list)) return false;

    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    list[idx].status = 'cancelled';

    const { error: saveErr } = await supabase
      .from('settings')
      .upsert({
        key: SETTINGS_KEY,
        value: JSON.stringify(list),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    return !saveErr;
  } catch (err) {
    console.error('[loyaltyService] Error cancelling reward in Supabase:', err);
    return false;
  }
}

/**
 * 5. Check if current user has an active pending reward (API with Supabase fallback)
 */
export async function checkEligibleLoyaltyReward(userTelegramId: string): Promise<LoyaltyReward | null> {
  if (!userTelegramId) return null;

  try {
    const res = await fetch(`${API_URL}/loyalty-rewards/check`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.hasReward && data.reward) return data.reward;
      if (data.hasReward === false) return null;
    }
  } catch {}

  // Failsafe: Direct Supabase query
  try {
    const tgId = userTelegramId.toString().trim();
    const cleanId = tgId.replace(/[^\d]/g, '');

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error || !data || !data.value) return null;
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    if (!Array.isArray(parsed)) return null;

    const now = Date.now();
    const reward = parsed.find((r: LoyaltyReward) => {
      const matches = r.telegram_id === tgId || (cleanId && r.telegram_id === cleanId);
      if (!matches) return false;
      if (r.status !== 'pending') return false;
      const sched = r.scheduled_at ? new Date(r.scheduled_at).getTime() : 0;
      return sched <= now;
    });

    return reward || null;
  } catch (err) {
    console.error('[loyaltyService] Error checking eligible reward:', err);
    return null;
  }
}

/**
 * 6. Claim a loyalty reward (API with Supabase fallback)
 */
export async function claimLoyaltyReward(
  userTelegramId: string,
  rewardId: string
): Promise<{ success: boolean; newBonusBalance?: number; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/loyalty-rewards/claim`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rewardId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, newBonusBalance: data.newBonusBalance };
      }
    }
  } catch {}

  // Failsafe: Direct Supabase atomic claim
  try {
    const tgId = userTelegramId.toString().trim();
    const cleanId = tgId.replace(/[^\d]/g, '');

    // 1. Fetch rewards list
    const { data: row } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (!row || !row.value) return { success: false, error: 'ስጦታው አልተገኘም' };
    let list: LoyaltyReward[] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    if (!Array.isArray(list)) return { success: false, error: 'ስጦታው አልተገኘም' };

    const idx = list.findIndex(
      (r) =>
        r.id === rewardId &&
        (r.telegram_id === tgId || (cleanId && r.telegram_id === cleanId)) &&
        r.status === 'pending'
    );

    if (idx === -1) return { success: false, error: 'የሚወሰድ ስጦታ አልተገኘም' };

    const reward = list[idx];
    const now = Date.now();
    const sched = reward.scheduled_at ? new Date(reward.scheduled_at).getTime() : 0;
    if (sched > now) {
      return { success: false, error: 'ስጦታው የሚደርስበት ሰዓት ገና አልደረሰም' };
    }

    // 2. Fetch user to update bonus_balance
    let userQuery = supabase
      .from('users')
      .select('id, telegram_id, bonus_balance')
      .limit(1);

    if (cleanId && cleanId !== tgId) {
      userQuery = userQuery.or(`telegram_id.eq.${tgId},telegram_id.eq.${cleanId}`);
    } else {
      userQuery = userQuery.eq('telegram_id', tgId);
    }

    const { data: userData, error: userErr } = await userQuery.maybeSingle();
    if (userErr || !userData) {
      return { success: false, error: 'የተጠቃሚ ሂሳብ አልተገኘም' };
    }

    const currentBonus = Number(userData.bonus_balance || 0);
    const addedAmount = Number(reward.amount || 50);
    const newBonusBalance = Number((currentBonus + addedAmount).toFixed(2));

    // 3. Mark reward as claimed in settings
    list[idx].status = 'claimed';
    list[idx].claimed_at = new Date().toISOString();

    await supabase
      .from('settings')
      .upsert({
        key: SETTINGS_KEY,
        value: JSON.stringify(list),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    // 4. Update user's bonus_balance in users table
    const { error: updErr } = await supabase
      .from('users')
      .update({
        bonus_balance: newBonusBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.id);

    if (updErr) {
      console.error('[loyaltyService] Error updating user bonus balance:', updErr);
      return { success: false, error: 'የቦነስ ሂሳብን ማዘመን አልተቻለም' };
    }

    return { success: true, newBonusBalance };
  } catch (err: any) {
    console.error('[loyaltyService] Claim exception:', err);
    return { success: false, error: err.message || 'ስጦታውን መውሰድ አልተቻለም' };
  }
}
