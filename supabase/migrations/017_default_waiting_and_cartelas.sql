-- Update default settings for game_settings table:
-- waiting_period_s default = 30
-- max_cartelas_per_user default = 4

ALTER TABLE IF EXISTS game_settings 
  ALTER COLUMN waiting_period_s SET DEFAULT 30,
  ALTER COLUMN max_cartelas_per_user SET DEFAULT 4;

UPDATE game_settings 
SET waiting_period_s = 30,
    max_cartelas_per_user = 4
WHERE id IS NOT NULL;
