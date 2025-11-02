-- Thread Memory Table for Gorgias AI Agent
-- Stores conversation context per Slack thread

CREATE TABLE IF NOT EXISTS thread_memory (
  -- Primary key: Slack thread timestamp
  thread_ts TEXT PRIMARY KEY,

  -- Thread metadata
  channel TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Current context (what we're currently focused on)
  current_ticket_id TEXT,
  current_customer_id TEXT,
  current_customer_email TEXT,
  current_query TEXT,

  -- Last action performed
  last_action TEXT,
  last_action_timestamp TIMESTAMP,

  -- Recent history (JSONB array of last 5 actions)
  recent_history JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_thread_memory_expires
ON thread_memory(expires_at);

CREATE INDEX IF NOT EXISTS idx_thread_memory_channel_user
ON thread_memory(channel, user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_thread_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.expires_at = NOW() + INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER thread_memory_update_timestamp
BEFORE UPDATE ON thread_memory
FOR EACH ROW
EXECUTE FUNCTION update_thread_memory_timestamp();

-- Cleanup function (run periodically to remove expired memories)
CREATE OR REPLACE FUNCTION cleanup_expired_thread_memory()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM thread_memory
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Example: Schedule cleanup every hour (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-thread-memory', '0 * * * *', 'SELECT cleanup_expired_thread_memory()');

-- Grant permissions (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON thread_memory TO your_app_role;

-- Example queries:

-- Get memory for a thread
-- SELECT * FROM thread_memory WHERE thread_ts = '1762052904.296909';

-- Insert new memory
-- INSERT INTO thread_memory (thread_ts, channel, user_id, last_action)
-- VALUES ('1762052904.296909', 'C09BXTD0WR0', 'U09BSMA8U75', 'list_customers')
-- ON CONFLICT (thread_ts) DO UPDATE
-- SET last_action = EXCLUDED.last_action,
--     updated_at = NOW();

-- Manual cleanup
-- SELECT cleanup_expired_thread_memory();
