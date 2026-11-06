-- Update default settings for welcome bonus, first deposit bonus and second deposit bonus
INSERT INTO settings (key, value, updated_at)
VALUES 
  ('welcome_bonus_amount', '0', NOW()),
  ('first_deposit_bonus_pct', '7', NOW()),
  ('second_deposit_bonus_pct', '3', NOW())
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    updated_at = NOW();
