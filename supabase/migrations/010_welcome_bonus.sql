-- Welcome Bonus Settings and Default Migration
-- 1. Insert default welcome bonus setting into settings table (0 ETB)
INSERT INTO settings (key, value)
VALUES ('welcome_bonus_amount', '0')
ON CONFLICT (key) DO UPDATE SET value = '0';

-- 2. Set default value for bonus_balance column on users table to 0
ALTER TABLE users ALTER COLUMN bonus_balance SET DEFAULT 0;
