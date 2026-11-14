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

export interface StakePlayerRange {
  min: number;
  max: number;
}

export interface SystemPlayersConfig {
  enabled: boolean;
  schedule_enabled: boolean;
  time_start: string; // e.g. "01:00"
  time_end: string;   // e.g. "24:00"
  target_stakes: number[];
  min_players_per_game: number;
  max_players_per_game: number;
  min_cartelas_per_player: number;
  max_cartelas_per_player: number;
  stake_player_ranges: Record<string, StakePlayerRange>;
}

export const DEFAULT_STAKE_RANGES: Record<string, StakePlayerRange> = {
  "10":  { min: 10, max: 31 },
  "20":  { min: 9,  max: 15 },
  "50":  { min: 5,  max: 11 },
  "100": { min: 3,  max: 6  },
};

export const DEFAULT_CONFIG: SystemPlayersConfig = {
  enabled: false,
  schedule_enabled: false,
  time_start: '01:00',
  time_end: '24:00',
  target_stakes: [10, 20, 50, 100],
  min_players_per_game: 10,
  max_players_per_game: 31,
  min_cartelas_per_player: 1,
  max_cartelas_per_player: 4,
  stake_player_ranges: DEFAULT_STAKE_RANGES,
};


// ── Ethiopian Regional Names Base (Amhara, Oromia, Tigray, Southern, Muslim/Harari/Somali/Afar) ──
export const ETHIOPIAN_FIRST_NAMES_BY_REGION = {
  amhara: [
    'Abebe', 'Bekele', 'Tewodros', 'Fisseha', 'Melaku', 'Getnet', 'Birhanu', 'Kassa',
    'Tamirat', 'Sisay', 'Assefa', 'Wondwossen', 'Endale', 'Worku', 'Desta', 'Girma',
    'Kassahun', 'Fikadu', 'Negash', 'Solomon', 'Yilma', 'Zewdu', 'Tilahun', 'Seyoum',
    'Bogale', 'Mamo', 'Taye', 'Tekle', 'Tadesse', 'Amare', 'Anteneh', 'Baye', 'Belay',
    'Berhane', 'Dagnachew', 'Dejene', 'Getachew', 'Gashaw', 'Shibashi', 'Shimelis',
    'Yetnayet', 'Zinash', 'Aster', 'Almaz', 'Hana', 'Hiwot', 'Konjit', 'Mahlet', 'Marta',
    'Rahel', 'Ruth', 'Saba', 'Sara', 'Selam', 'Senait', 'Tigist', 'Tsige', 'Tsion'
  ],
  oromo: [
    'Chala', 'Tolesa', 'Gutu', 'Bonsa', 'Bilisuma', 'Ayantu', 'Yadeta', 'Gemechu',
    'Lencho', 'Sifan', 'Hawi', 'Tolera', 'Kumsa', 'Galata', 'Ifa', 'Urji', 'Gudeta',
    'Dibaba', 'Feyisa', 'Tariku', 'Derartu', 'Chaltu', 'Lensa', 'Boontu', 'Obsa',
    'Bikila', 'Kenenisa', 'Guta', 'Roba', 'Dinqa', 'Badasa', 'Olana', 'Hirpha',
    'Soboka', 'Megersa', 'Jaleta', 'Nagasa', 'Hundessa', 'Gamachu', 'Kumera', 'Bultum',
    'Gudina', 'Tullu', 'Motuma', 'Damise', 'Wayessa', 'Bekuma', 'Sena', 'Kenna'
  ],
  tigray: [
    'Berhane', 'Gebre', 'Haleka', 'Kibrom', 'Luwam', 'Mehari', 'Natnael', 'Semhar',
    'Tsigabu', 'Weini', 'Winta', 'Yohannes', 'Araya', 'Hagos', 'Teklay', 'Solomon',
    'Mulugeta', 'Fessehaye', 'Berhe', 'Haile', 'Kahsay', 'Asmelash', 'Girmay', 'Abraha',
    'Weldu', 'Alganesh', 'Letebirhan', 'Abrehet', 'Roman', 'Freweini', 'Danawit', 'Biruk',
    'Alazar', 'Tesfamariam', 'Tesfaldet', 'Hailay', 'Kinfe', 'Mebrahtu', 'Teshome'
  ],
  southern: [
    'Markos', 'Dagne', 'Temesgen', 'Zerihun', 'Mesele', 'Sintayehu', 'Tariku', 'Biniam',
    'Daniel', 'Ewnetu', 'Alemayehu', 'Fikadu', 'Matewos', 'Yohana', 'Petros', 'Wondimu',
    'Shiferaw', 'Zeleke', 'Tesfaye', 'Eyob', 'Habtamu', 'Samuel', 'Abel', 'Yosef',
    'Misgana', 'Mastewal', 'Sosina', 'Lemlem', 'Taye', 'Asrat', 'Mekbib', 'Tadesse',
    'Beshah', 'Girma', 'Melese', 'Teshale', 'Wondimu', 'Kassa', 'Wale', 'Bantie'
  ],
  muslim_harari_afar_somali: [
    'Ebrahim', 'Mohammed', 'Semir', 'Ahmed', 'Mustafa', 'Bilal', 'Hamza', 'Khalid',
    'Ali', 'Usman', 'Fuad', 'Ridwan', 'Halima', 'Zebiba', 'Fatima', 'Zahra', 'Amina',
    'Aisha', 'Khadija', 'Farhan', 'Abdi', 'Hassan', 'Hussein', 'Nasir', 'Zakaria',
    'Idris', 'Tariq', 'Jamal', 'Omar', 'Yasin', 'Nuredin', 'Muktar', 'Anwar', 'Jamil',
    'Sufian', 'Mahad', 'Kamil', 'Sultan', 'Harun', 'Abubeker', 'Bashir', 'Munir'
  ],
};

export const ETHIOPIAN_FIRST_NAMES = Array.from(new Set([
  ...ETHIOPIAN_FIRST_NAMES_BY_REGION.amhara,
  ...ETHIOPIAN_FIRST_NAMES_BY_REGION.oromo,
  ...ETHIOPIAN_FIRST_NAMES_BY_REGION.tigray,
  ...ETHIOPIAN_FIRST_NAMES_BY_REGION.southern,
  ...ETHIOPIAN_FIRST_NAMES_BY_REGION.muslim_harari_afar_somali,
]));

export const ETHIOPIAN_FATHER_NAMES = [
  'Abebe', 'Bekele', 'Girma', 'Kebede', 'Tadesse', 'Tesfaye', 'Worku',
  'Desta', 'Haile', 'Mulugeta', 'Tekle', 'Lemma', 'Belay', 'Assefa',
  'Mengistu', 'Getachew', 'Hailu', 'Berhanu', 'Ayele', 'Kassahun',
  'Fikadu', 'Negash', 'Solomon', 'Yilma', 'Zewdu', 'Tamirat', 'Tilahun',
  'Seyoum', 'Bogale', 'Mamo', 'Chala', 'Tolesa', 'Gutu', 'Dejene',
  'Gemechu', 'Tariq', 'Ahmed', 'Ali', 'Kassa', 'Abdi', 'Weldu'
];

/**
 * Generate an authentic list of up to 1000 Ethiopian names representing all regions.
 */
export function generate1000EthiopianNames(): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const regions = [
    ETHIOPIAN_FIRST_NAMES_BY_REGION.amhara,
    ETHIOPIAN_FIRST_NAMES_BY_REGION.oromo,
    ETHIOPIAN_FIRST_NAMES_BY_REGION.tigray,
    ETHIOPIAN_FIRST_NAMES_BY_REGION.southern,
    ETHIOPIAN_FIRST_NAMES_BY_REGION.muslim_harari_afar_somali,
  ];

  // 1. Single prominent first names from all regions round-robin
  let maxLen = Math.max(...regions.map(r => r.length));
  for (let i = 0; i < maxLen; i++) {
    for (const reg of regions) {
      if (result.length >= 1000) break;
      const fn = reg[i];
      if (fn && !seen.has(fn)) {
        seen.add(fn);
        result.push(fn);
      }
    }
  }

  // 2. First name + Father initial (e.g. "Chala T.", "Abebe K.", "Luwam G.")
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

  // 3. First name + Full Father Name (e.g. "Bonsa Tolesa", "Dawit Kebede")
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
  // Query settings table (always supports full JSON)
  let sObj: any = null;
  try {
    const { data: sData } = await supabase.from('settings').select('value').eq('key', 'system_players_config').maybeSingle();
    if (sData?.value) {
      sObj = typeof sData.value === 'string' ? JSON.parse(sData.value) : sData.value;
    }
  } catch {}

  // Query system_players_config table
  let tObj: any = null;
  try {
    const { data: tData } = await supabase.from('system_players_config').select('*').eq('id', 1).maybeSingle();
    if (tData) tObj = tData;
  } catch {}

  // Merge: settings table handles JSON fields reliably, table handles row fields
  const merged: SystemPlayersConfig = {
    enabled: sObj?.enabled !== undefined ? Boolean(sObj.enabled) : (tObj?.enabled !== undefined ? Boolean(tObj.enabled) : DEFAULT_CONFIG.enabled),
    schedule_enabled: sObj?.schedule_enabled !== undefined ? Boolean(sObj.schedule_enabled) : (tObj?.schedule_enabled !== undefined ? Boolean(tObj.schedule_enabled) : DEFAULT_CONFIG.schedule_enabled),
    time_start: sObj?.time_start || tObj?.time_start || DEFAULT_CONFIG.time_start,
    time_end: sObj?.time_end || tObj?.time_end || DEFAULT_CONFIG.time_end,
    target_stakes: Array.isArray(sObj?.target_stakes) ? sObj.target_stakes : (Array.isArray(tObj?.target_stakes) ? tObj.target_stakes : DEFAULT_CONFIG.target_stakes),
    min_players_per_game: Number(sObj?.min_players_per_game ?? tObj?.min_players_per_game ?? DEFAULT_CONFIG.min_players_per_game),
    max_players_per_game: Number(sObj?.max_players_per_game ?? tObj?.max_players_per_game ?? DEFAULT_CONFIG.max_players_per_game),
    min_cartelas_per_player: Number(sObj?.min_cartelas_per_player ?? tObj?.min_cartelas_per_player ?? DEFAULT_CONFIG.min_cartelas_per_player),
    max_cartelas_per_player: Number(sObj?.max_cartelas_per_player ?? tObj?.max_cartelas_per_player ?? DEFAULT_CONFIG.max_cartelas_per_player),
    stake_player_ranges: sObj?.stake_player_ranges || tObj?.stake_player_ranges || DEFAULT_STAKE_RANGES,
  };

  _cfgCache = merged;
  _cfgCacheAt = Date.now();
  return merged;
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
    stake_player_ranges: cfg.stake_player_ranges ?? current.stake_player_ranges ?? DEFAULT_STAKE_RANGES,
  };

  // 1. Dual-write to settings table first (guaranteed persistence)
  try {
    await supabase.from('settings').upsert({
      key: 'system_players_config',
      value: JSON.stringify(updated),
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[systemPlayers] Failed to save in settings table:', e);
  }

  // 2. Dual-write to system_players_config table
  try {
    const tablePayload: any = {
      id: 1,
      enabled: Boolean(updated.enabled),
      schedule_enabled: Boolean(updated.schedule_enabled),
      time_start: updated.time_start,
      time_end: updated.time_end,
      target_stakes: updated.target_stakes,
      min_players_per_game: updated.min_players_per_game,
      max_players_per_game: updated.max_players_per_game,
      min_cartelas_per_player: updated.min_cartelas_per_player,
      max_cartelas_per_player: updated.max_cartelas_per_player,
      stake_player_ranges: updated.stake_player_ranges,
      updated_at: new Date().toISOString(),
    };

    const { error: err1 } = await supabase.from('system_players_config').upsert(tablePayload);
    if (err1) {
      delete tablePayload.stake_player_ranges;
      await supabase.from('system_players_config').upsert(tablePayload);
    }
  } catch (e) {
    console.error('[systemPlayers] Failed to save in system_players_config table:', e);
  }

  _cfgCache = updated;
  _cfgCacheAt = Date.now();
  return updated;
}


/**
 * Check if current time in East Africa Time (EAT = UTC+3) is within the scheduled 1-24 hour window.
 */
export function isWithinSchedule(cfg: SystemPlayersConfig): boolean {
  if (!cfg.enabled) return false;
  if (!cfg.schedule_enabled) return true; // 24/7 active if schedule is disabled

  // Calculate current time in UTC+3 (Ethiopian standard time)
  const now = new Date();
  const eatHours = (now.getUTCHours() + 3) % 24;
  const eatMinutes = now.getUTCMinutes();
  const currentTotal = eatHours * 60 + eatMinutes;

  const parseHourMinute = (val: string, fallback: number): number => {
    if (!val) return fallback;
    const parts = val.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    if (h >= 24) return 24 * 60; // 1440
    return h * 60 + m;
  };

  const startTotal = parseHourMinute(cfg.time_start, 0);
  const endTotal = parseHourMinute(cfg.time_end, 1440);

  if (startTotal <= endTotal) {
    return currentTotal >= startTotal && currentTotal <= endTotal;
  } else {
    // Overnight schedule (e.g. 22:00 to 05:00)
    return currentTotal >= startTotal || currentTotal <= endTotal;
  }
}

/**
 * Automatically check and seed 1000 Ethiopian players across all regions in the background.
 */
let _autoSeedChecked = false;
export async function ensureDefaultSystemPlayersSeeded(): Promise<void> {
  if (_autoSeedChecked) return;
  _autoSeedChecked = true;
  try {
    const { count, error } = await supabase
      .from('system_players')
      .select('*', { count: 'exact', head: true });

    if (!error && (count === null || count < 100)) {
      console.log(`🤖 [SystemPlayers] Background auto-seeding 1000 diverse Ethiopian regional names...`);
      await seedSystemPlayers(1000);
      console.log(`🤖 [SystemPlayers] Background auto-seeding completed!`);
    }
  } catch (err: any) {
    console.error('[SystemPlayers] Background auto-seed error:', err?.message || err);
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

