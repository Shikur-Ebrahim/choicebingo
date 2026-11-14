-- Migration 020: System Players (Bots) and Schedule Configuration
CREATE TABLE IF NOT EXISTS system_players (
  id SERIAL PRIMARY KEY,
  telegram_id VARCHAR(32) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  total_wins INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_players_tid ON system_players(telegram_id);
CREATE INDEX IF NOT EXISTS idx_system_players_active ON system_players(is_active);

CREATE TABLE IF NOT EXISTS system_players_config (
  id INT PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN DEFAULT FALSE,
  schedule_enabled BOOLEAN DEFAULT FALSE,
  time_start VARCHAR(10) DEFAULT '03:00',
  time_end VARCHAR(10) DEFAULT '05:00',
  target_stakes INT[] DEFAULT '{10,20,50,100}',
  min_players_per_game INT DEFAULT 10,
  max_players_per_game INT DEFAULT 31,
  min_cartelas_per_player INT DEFAULT 1,
  max_cartelas_per_player INT DEFAULT 4,
  stake_player_ranges JSONB DEFAULT '{"10":{"min":10,"max":31},"20":{"min":9,"max":15},"50":{"min":5,"max":11},"100":{"min":3,"max":6}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default row for config
INSERT INTO system_players_config (id, enabled, schedule_enabled, time_start, time_end, target_stakes, min_players_per_game, max_players_per_game, min_cartelas_per_player, max_cartelas_per_player, stake_player_ranges)
VALUES (1, false, false, '01:00', '24:00', '{10,20,50,100}', 10, 31, 1, 4, '{"10":{"min":10,"max":31},"20":{"min":9,"max":15},"50":{"min":5,"max":11},"100":{"min":3,"max":6}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE system_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_players_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_system_players_all" ON system_players;
CREATE POLICY "anon_system_players_all" ON system_players FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_system_players_config_all" ON system_players_config;
CREATE POLICY "anon_system_players_config_all" ON system_players_config FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE system_players REPLICA IDENTITY FULL;
ALTER TABLE system_players_config REPLICA IDENTITY FULL;
