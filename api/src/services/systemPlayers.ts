import { supabase } from './supabase';

export interface SystemPlayer {
  id?: number;
  telegram_id: string; // 8 digits starting from 10000000
  first_name: string;
  total_wins: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SystemPlayersConfig {
  enabled: boolean;
  schedule_enabled: boolean;
  time_start: string; // "03:00"
  time_end: string;   // "05:00"
  target_stakes: number[];
  min_players_per_game: number;
  max_players_per_game: number;
  min_cartelas_per_player: number;
  max_cartelas_per_player: number;
}

export const DEFAULT_CONFIG: SystemPlayersConfig = {
  enabled: false,
  schedule_enabled: false,
  time_start: '03:00',
  time_end: '05:00',
  target_stakes: [10, 20, 50, 100],
  min_players_per_game: 50,
  max_players_per_game: 100,
  min_cartelas_per_player: 1,
  max_cartelas_per_player: 4,
};

// ── Core Ethiopian Names Base ──────────────────────────────────────────────
export const ETHIOPIAN_FIRST_NAMES = [
  'Abebe', 'Almaz', 'Aster', 'Bekele', 'Birhanu', 'Chala', 'Dawit', 'Desta',
  'Ebrahim', 'Elias', 'Ermias', 'Eshetu', 'Eyob', 'Fikadu', 'Girma', 'Habtamu',
  'Haile', 'Hana', 'Helen', 'Henok', 'Hiwot', 'Kalkidan', 'Kassahun', 'Kebede',
  'Kidist', 'Konjit', 'Lensa', 'Mahlet', 'Marta', 'Melaku', 'Meron', 'Mesfin',
  'Michael', 'Mohammed', 'Mulugeta', 'Nahom', 'Natnael', 'Nebiyu', 'Rahel',
  'Robel', 'Ruth', 'Saba', 'Samuel', 'Sara', 'Seid', 'Selam', 'Semir',
  'Senait', 'Sisay', 'Solomon', 'Surafel', 'Tariku', 'Tewodros', 'Tigist',
  'Tilahun', 'Tsige', 'Tsion', 'Wondwossen', 'Worku', 'Yared', 'Yohannes',
  'Yonas', 'Yosef', 'Zelalem', 'Zerihun', 'Abinet', 'Addisu', 'Alazar',
  'Alemayehu', 'Amanuel', 'Ashenafi', 'Ayantu', 'Betelhem', 'Biniyam',
  'Biruk', 'Danawit', 'Derartu', 'Ephrem', 'Fasil', 'Fitsum', 'Gezahegn',
  'Getachew', 'Halima', 'Hawi', 'Jemberu', 'Lemlem', 'Luwam', 'Mastewal',
  'Melat', 'Meseret', 'Misgana', 'Mulu', 'Rebecca', 'Samrawit', 'Seble',
  'Sifan', 'Sosina', 'Temesgen', 'Tesfaye', 'Weini', 'Winta', 'Woinshet',
  'Yetnayet', 'Zebiba', 'Zinash', 'Abel', 'Afework', 'Aklilu', 'Amare',
  'Anteneh', 'Baye', 'Belay', 'Berhane', 'Bogale', 'Chaltu', 'Dagnachew',
  'Dejene', 'Endale', 'Fekadu', 'Fisseha', 'Getnet', 'Gashaw', 'Gossa',
  'Gutu', 'Kibrom', 'Legesse', 'Mamo', 'Mehari', 'Mekonnen', 'Mintesinot',
  'Negash', 'Nigus', 'Seyoum', 'Shibashi', 'Shimelis', 'Tamirat', 'Taye',
  'Tekle', 'Tadesse', 'Tolesa', 'Yadeta', 'Yoseph', 'Zewdu'
];

export const ETHIOPIAN_FATHER_NAMES = [
  'Abebe', 'Bekele', 'Girma', 'Kebede', 'Tadesse', 'Tesfaye', 'Worku',
  'Desta', 'Haile', 'Mulugeta', 'Tekle', 'Lemma', 'Belay', 'Assefa',
  'Mengistu', 'Getachew', 'Hailu', 'Berhanu', 'Ayele', 'Kassahun',
  'Fikadu', 'Negash', 'Solomon', 'Yilma', 'Zewdu', 'Tamirat', 'Tilahun',
  'Seyoum', 'Bogale', 'Mamo', 'Chala', 'Tolesa', 'Gutu', 'Dejene'
];

/**
 * Generate an authentic list of up to 1000 Ethiopian names.
 */
export function generate1000EthiopianNames(): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  // 1. Single prominent first names
  for (const fn of ETHIOPIAN_FIRST_NAMES) {
    if (result.length >= 1000) break;
    if (!seen.has(fn)) {
      seen.add(fn);
      result.push(fn);
    }
  }

  // 2. First name + Father initial (e.g. "Abebe K.", "Almaz T.", "Dawit B.")
  const initials = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'K.', 'L.', 'M.', 'N.', 'R.', 'S.', 'T.', 'W.', 'Y.', 'Z.'];
  for (const init of initials) {
    for (const fn of ETHIOPIAN_FIRST_NAMES) {
      if (result.length >= 1000) break;
      const combined = `${fn} ${init}`;
      if (!seen.has(combined)) {
        seen.add(combined);
        result.push(combined);
      }
    }
  }

  // 3. First name + Full Father Name (e.g. "Chala Girma", "Meron Haile")
  for (const ln of ETHIOPIAN_FATHER_NAMES) {
    for (const fn of ETHIOPIAN_FIRST_NAMES) {
      if (result.length >= 1000) break;
      if (fn !== ln) {
        const combined = `${fn} ${ln}`;
        if (!seen.has(combined)) {
          seen.add(combined);
          result.push(combined);
        }
      }
    }
  }

  return result.slice(0, 1000);
}

// ── Configuration Manager ──────────────────────────────────────────────────
let _cfgCache: SystemPlayersConfig | null = null;
let _cfgCacheAt = 0;

export async function getSystemPlayersConfig(): Promise<SystemPlayersConfig> {
  if (_cfgCache && Date.now() - _cfgCacheAt < 10000) return _cfgCache;

  try {
    // Try dedicated table
    const { data, error } = await supabase
      .from('system_players_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data) {
      _cfgCache = {
        enabled: Boolean(data.enabled),
        schedule_enabled: Boolean(data.schedule_enabled),
        time_start: data.time_start || DEFAULT_CONFIG.time_start,
        time_end: data.time_end || DEFAULT_CONFIG.time_end,
        target_stakes: Array.isArray(data.target_stakes) && data.target_stakes.length > 0 ? data.target_stakes : DEFAULT_CONFIG.target_stakes,
        min_players_per_game: Number(data.min_players_per_game) || DEFAULT_CONFIG.min_players_per_game,
        max_players_per_game: Number(data.max_players_per_game) || DEFAULT_CONFIG.max_players_per_game,
        min_cartelas_per_player: Number(data.min_cartelas_per_player) || DEFAULT_CONFIG.min_cartelas_per_player,
        max_cartelas_per_player: Number(data.max_cartelas_per_player) || DEFAULT_CONFIG.max_cartelas_per_player,
      };
      _cfgCacheAt = Date.now();
      return _cfgCache;
    }
  } catch {}

  // Fallback to settings table
  try {
    const { data: sData } = await supabase.from('settings').select('value').eq('key', 'system_players_config').maybeSingle();
    if (sData?.value) {
      const parsed = typeof sData.value === 'string' ? JSON.parse(sData.value) : sData.value;
      _cfgCache = { ...DEFAULT_CONFIG, ...parsed };
      _cfgCacheAt = Date.now();
      return _cfgCache!;
    }
  } catch {}

  _cfgCache = { ...DEFAULT_CONFIG };
  _cfgCacheAt = Date.now();
  return _cfgCache;
}

export async function saveSystemPlayersConfig(cfg: Partial<SystemPlayersConfig>): Promise<SystemPlayersConfig> {
  const current = await getSystemPlayersConfig();
  const updated: SystemPlayersConfig = {
    ...current,
    ...cfg,
    min_players_per_game: Math.max(1, Number(cfg.min_players_per_game ?? current.min_players_per_game)),
    max_players_per_game: Math.max(1, Number(cfg.max_players_per_game ?? current.max_players_per_game)),
    min_cartelas_per_player: Math.max(1, Math.min(4, Number(cfg.min_cartelas_per_player ?? current.min_cartelas_per_player))),
    max_cartelas_per_player: Math.max(1, Math.min(4, Number(cfg.max_cartelas_per_player ?? current.max_cartelas_per_player))),
  };

  _cfgCache = updated;
  _cfgCacheAt = Date.now();

  // Try saving to system_players_config table
  try {
    await supabase.from('system_players_config').upsert({
      id: 1,
      enabled: updated.enabled,
      schedule_enabled: updated.schedule_enabled,
      time_start: updated.time_start,
      time_end: updated.time_end,
      target_stakes: updated.target_stakes,
      min_players_per_game: updated.min_players_per_game,
      max_players_per_game: updated.max_players_per_game,
      min_cartelas_per_player: updated.min_cartelas_per_player,
      max_cartelas_per_player: updated.max_cartelas_per_player,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  // Always mirror in settings table for guaranteed persistence
  try {
    await supabase.from('settings').upsert({
      key: 'system_players_config',
      value: JSON.stringify(updated),
      updated_at: new Date().toISOString(),
    });
  } catch {}

  return updated;
}

/**
 * Check if the current time in East Africa Time (EAT = UTC+3) is within the scheduled window.
 */
export function isWithinSchedule(cfg: SystemPlayersConfig): boolean {
  if (!cfg.enabled) return false;
  if (!cfg.schedule_enabled) return true; // 24/7 active if schedule is disabled

  // Calculate current time in UTC+3 (Ethiopian standard time)
  const now = new Date();
  const eatHours = (now.getUTCHours() + 3) % 24;
  const eatMinutes = now.getUTCMinutes();
  const currentTotal = eatHours * 60 + eatMinutes;

  const [sH, sM] = (cfg.time_start || '00:00').split(':').map(Number);
  const [eH, eM] = (cfg.time_end || '23:59').split(':').map(Number);
  const startTotal = (sH || 0) * 60 + (sM || 0);
  const endTotal = (eH || 0) * 60 + (eM || 0);

  if (startTotal <= endTotal) {
    return currentTotal >= startTotal && currentTotal <= endTotal;
  } else {
    // Overnight schedule (e.g. 22:00 to 04:00)
    return currentTotal >= startTotal || currentTotal <= endTotal;
  }
}

// ── Player Database Operations ─────────────────────────────────────────────

/**
 * Fetch system players list with pagination and search.
 */
export async function getSystemPlayers(page = 1, limit = 50, search = ''): Promise<{ players: SystemPlayer[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Try dedicated system_players table
  try {
    let q = supabase
      .from('system_players')
      .select('*', { count: 'exact' });

    if (search.trim()) {
      q = q.or(`first_name.ilike.%${search.trim()}%,telegram_id.ilike.%${search.trim()}%`);
    }

    q = q.order('id', { ascending: true }).range(from, to);

    const { data, count, error } = await q;
    if (!error && data) {
      return {
        players: data as SystemPlayer[],
        total: count || data.length,
      };
    }
  } catch {}

  // Fallback: check users table where role = 'system_player'
  try {
    let q = supabase
      .from('users')
      .select('telegram_id, first_name, total_wins, created_at, status', { count: 'exact' })
      .eq('role', 'system_player');

    if (search.trim()) {
      q = q.or(`first_name.ilike.%${search.trim()}%,telegram_id.ilike.%${search.trim()}%`);
    }

    q = q.order('created_at', { ascending: true }).range(from, to);
    const { data, count } = await q;
    if (data) {
      const players: SystemPlayer[] = data.map((u: any, idx: number) => ({
        id: from + idx + 1,
        telegram_id: u.telegram_id,
        first_name: u.first_name,
        total_wins: Number(u.total_wins || 0),
        is_active: u.status !== 'blocked',
        created_at: u.created_at,
      }));
      return { players, total: count || players.length };
    }
  } catch {}

  return { players: [], total: 0 };
}

/**
 * Seed or regenerate up to 1000 Ethiopian system players.
 * Telegram IDs start at 10000000, 10000001, etc.
 */
export async function seedSystemPlayers(count = 1000): Promise<{ count: number; message: string }> {
  const names = generate1000EthiopianNames().slice(0, count);
  const rows: SystemPlayer[] = names.map((name, i) => {
    const tid = String(10000000 + i);
    return {
      telegram_id: tid,
      first_name: name,
      total_wins: 0,
      is_active: true,
    };
  });

  // Batch insert into system_players table (in chunks of 100 to avoid payload limits)
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    try {
      await supabase.from('system_players').upsert(chunk, { onConflict: 'telegram_id' });
    } catch {}

    // Also mirror to users table so leaderboard & audit seamlessly see them as real users
    const userChunk = chunk.map(b => ({
      telegram_id: b.telegram_id,
      first_name: b.first_name,
      role: 'system_player',
      status: 'active',
      main_balance: 0,
      bonus_balance: 0,
      total_wins: 0,
      total_games: 0,
      total_stake: 0,
    }));
    try {
      await supabase.from('users').upsert(userChunk, { onConflict: 'telegram_id' });
    } catch {}

    inserted += chunk.length;
  }

  // Also save complete roster in settings table as secondary safety backup
  try {
    await supabase.from('settings').upsert({
      key: 'system_players_list',
      value: JSON.stringify(rows),
      updated_at: new Date().toISOString(),
    });
  } catch {}

  return { count: inserted, message: `Successfully seeded ${inserted} Ethiopian system players (IDs 10000000 to ${10000000 + inserted - 1})` };
}

/**
 * Update a specific system player's details (e.g. name, wins, active status).
 */
export async function updateSystemPlayer(
  telegramId: string,
  updates: { first_name?: string; total_wins?: number; is_active?: boolean }
): Promise<boolean> {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.first_name !== undefined) payload.first_name = updates.first_name.trim();
    if (updates.total_wins !== undefined) payload.total_wins = Number(updates.total_wins);
    if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);

    await supabase.from('system_players').update(payload).eq('telegram_id', telegramId);

    // Sync to users table
    const userPayload: any = {};
    if (updates.first_name !== undefined) userPayload.first_name = updates.first_name.trim();
    if (updates.total_wins !== undefined) userPayload.total_wins = Number(updates.total_wins);
    if (updates.is_active !== undefined) userPayload.status = updates.is_active ? 'active' : 'blocked';
    if (Object.keys(userPayload).length > 0) {
      await supabase.from('users').update(userPayload).eq('telegram_id', telegramId);
    }
    return true;
  } catch (e) {
    console.error('Error updating system player:', e);
    return false;
  }
}

/**
 * Add a new custom system player.
 */
export async function addSystemPlayer(first_name: string, total_wins = 0): Promise<SystemPlayer | null> {
  try {
    // Find highest telegram_id among system players
    const { data: latest } = await supabase
      .from('system_players')
      .select('telegram_id')
      .order('telegram_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextId = 10000000;
    if (latest && latest.telegram_id && !isNaN(Number(latest.telegram_id))) {
      nextId = Math.max(10000000, Number(latest.telegram_id) + 1);
    }

    const newBot: SystemPlayer = {
      telegram_id: String(nextId),
      first_name: first_name.trim(),
      total_wins: Math.max(0, Number(total_wins) || 0),
      is_active: true,
    };

    await supabase.from('system_players').insert(newBot);

    // Sync to users
    await supabase.from('users').upsert({
      telegram_id: newBot.telegram_id,
      first_name: newBot.first_name,
      role: 'system_player',
      status: 'active',
      main_balance: 0,
      bonus_balance: 0,
      total_wins: newBot.total_wins,
    }, { onConflict: 'telegram_id' });

    return newBot;
  } catch (e) {
    console.error('Error adding system player:', e);
    return null;
  }
}

/**
 * Get a random pool of active system players for joining a game.
 */
export async function getActiveSystemPlayersPool(limit = 150): Promise<SystemPlayer[]> {
  try {
    const { data, error } = await supabase
      .from('system_players')
      .select('telegram_id, first_name, total_wins, is_active')
      .eq('is_active', true)
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as SystemPlayer[];
    }
  } catch {}

  // Fallback: check users table where role = 'system_player'
  try {
    const { data } = await supabase
      .from('users')
      .select('telegram_id, first_name, total_wins')
      .eq('role', 'system_player')
      .neq('status', 'blocked')
      .limit(limit);

    if (data && data.length > 0) {
      return data.map((u: any) => ({
        telegram_id: u.telegram_id,
        first_name: u.first_name,
        total_wins: Number(u.total_wins || 0),
        is_active: true,
      }));
    }
  } catch {}

  // Ultimate fallback: generate 100 on the fly
  return generate1000EthiopianNames().slice(0, 50).map((name, i) => ({
    telegram_id: String(10000000 + i),
    first_name: name,
    total_wins: 0,
    is_active: true,
  }));
}

/**
 * Check if a telegramId belongs to a system player (8-digit ID starting with 1000).
 */
export function isSystemPlayer(telegramId: string): boolean {
  if (!telegramId) return false;
  const tid = String(telegramId).trim();
  return tid.length === 8 && tid.startsWith('1000');
}

/**
 * Record a game win for a system player in both system_players and users table.
 */
export async function recordSystemPlayerWin(telegramId: string): Promise<void> {
  try {
    const tid = String(telegramId).trim();
    // 1. Update in system_players
    const { data: sp } = await supabase
      .from('system_players')
      .select('total_wins')
      .eq('telegram_id', tid)
      .maybeSingle();

    const newWins = (Number(sp?.total_wins) || 0) + 1;
    await supabase.from('system_players').update({
      total_wins: newWins,
      updated_at: new Date().toISOString(),
    }).eq('telegram_id', tid);

    // 2. Mirror into users table for leaderboard rankings
    const { data: u } = await supabase
      .from('users')
      .select('total_wins')
      .eq('telegram_id', tid)
      .maybeSingle();

    if (u) {
      await supabase.from('users').update({
        total_wins: (Number(u.total_wins) || 0) + 1,
      }).eq('telegram_id', tid);
    }
    console.log(`🤖 [SystemPlayers] Recorded win for bot ${tid} (total: ${newWins})`);
  } catch (err: any) {
    console.error(`[SystemPlayers] Failed to record win for bot ${telegramId}:`, err?.message || err);
  }
}

