-- 016_increment_user_balance.sql
-- Function to increment user balance atomically

CREATE OR REPLACE FUNCTION increment_user_balance(p_telegram_id TEXT, p_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET main_balance = COALESCE(main_balance, 0) + p_amount,
      updated_at = NOW()
  WHERE telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql;
