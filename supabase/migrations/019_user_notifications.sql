-- 019_user_notifications.sql
-- In-app user notifications table (matching all Telegram Bot activity)

CREATE TABLE IF NOT EXISTS user_notifications (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  telegram_id   TEXT NOT NULL,
  type          TEXT NOT NULL, -- 'broadcast' | 'deposit' | 'withdrawal' | 'win' | 'reward' | 'refund' | 'transfer'
  title         TEXT NOT NULL,
  title_am      TEXT,
  message       TEXT NOT NULL,
  message_am    TEXT,
  amount        NUMERIC,
  status        TEXT DEFAULT 'info', -- 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'purple'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_telegram_id ON user_notifications(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Disable Row Level Security so server role / anon key can read & write seamlessly
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;
