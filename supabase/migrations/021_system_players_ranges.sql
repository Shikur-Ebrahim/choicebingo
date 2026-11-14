-- Migration 021: Add stake_player_ranges to system_players_config and set default ranges
-- Stake 10: 10 to 31 players
-- Stake 20: 9 to 15 players
-- Stake 50: 0 players (OFF by default)
-- Stake 100: 0 players (OFF by default)

ALTER TABLE public.system_players_config
ADD COLUMN IF NOT EXISTS stake_player_ranges JSONB DEFAULT '{"10":{"min":10,"max":31},"20":{"min":9,"max":15},"50":{"min":0,"max":0},"100":{"min":0,"max":0}}'::jsonb;

-- Update row 1 with the default ranges
UPDATE public.system_players_config
SET 
  target_stakes = '{10,20}'::integer[],
  min_players_per_game = 10,
  max_players_per_game = 31,
  min_cartelas_per_player = 1,
  max_cartelas_per_player = 3,
  stake_player_ranges = '{"10":{"min":10,"max":31},"20":{"min":9,"max":15},"50":{"min":0,"max":0},"100":{"min":0,"max":0}}'::jsonb,
  updated_at = NOW()
WHERE id = 1;
