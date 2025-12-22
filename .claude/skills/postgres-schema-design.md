# PostgreSQL Schema Design

PostgreSQL-specific database design patterns for Supabase and production systems.

## Key Design Principles

### Primary Keys
```sql
-- Preferred: BIGINT with identity
CREATE TABLE api_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ...
);

-- NOT: serial (legacy), UUID (slower joins)
```

### Foreign Keys
```sql
-- PostgreSQL does NOT auto-index FKs - add manually
CREATE INDEX idx_api_logs_session_id ON api_logs(session_id);
```

### Timestamps
```sql
-- ALWAYS use TIMESTAMPTZ (with timezone)
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()

-- NOT: timestamp (without timezone)
```

## Your Supabase Tables

### agent_sessions
```sql
CREATE TABLE agent_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correlation_id UUID NOT NULL,
  slack_user_id TEXT NOT NULL,
  slack_channel_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  action_type TEXT NOT NULL,
  parameters JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_sessions_correlation ON agent_sessions(correlation_id);
CREATE INDEX idx_sessions_created ON agent_sessions(created_at DESC);
CREATE INDEX idx_sessions_status ON agent_sessions(status) WHERE status != 'completed';
```

### api_logs
```sql
CREATE TABLE api_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correlation_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_logs_correlation ON api_logs(correlation_id);
CREATE INDEX idx_logs_created ON api_logs(created_at DESC);
CREATE INDEX idx_logs_errors ON api_logs(status_code) WHERE status_code >= 400;
```

## JSONB Best Practices

```sql
-- Index specific JSONB paths you query often
CREATE INDEX idx_logs_action ON api_logs((request_body->>'action'));

-- GIN index for full JSONB search (slower writes, faster reads)
CREATE INDEX idx_logs_request_gin ON api_logs USING GIN(request_body);
```

## Partitioning for Scale

If `api_logs` grows beyond 100M rows:
```sql
-- Partition by month
CREATE TABLE api_logs (
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE api_logs_2024_01 PARTITION OF api_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Data Retention

```sql
-- 90-day retention policy (your recommendation)
DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Or use pg_partman for automatic partition management
```

## Row-Level Security (Supabase)

```sql
-- Enable RLS
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own logs
CREATE POLICY user_logs ON api_logs
  FOR SELECT USING (auth.uid()::text = slack_user_id);
```

## Common Gotchas

1. **Identifier case**: Unquoted names → lowercase. Use `snake_case`
2. **UNIQUE with NULLs**: Multiple NULLs allowed by default
3. **Sequence gaps**: Normal after rollbacks - don't rely on continuity
4. **Connection pooling**: Use Supabase's pooler for serverless
