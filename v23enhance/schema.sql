-- ============================================================================
-- Gorgias Terminal - Supabase Database Schema
-- ============================================================================
-- Version: 2.0
-- Last Updated: 2025-11-06
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: agent_sessions
-- ============================================================================
-- Purpose: Tracks each user command/interaction
-- Relationship: One session per user command (1:N with api_logs)
-- Retention: Indefinite (for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User Context
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    action TEXT NOT NULL,
    origin TEXT DEFAULT 'ai-agent-with-fallback',
    thread_ts TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id 
    ON agent_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_thread_ts 
    ON agent_sessions(thread_ts);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at 
    ON agent_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_action 
    ON agent_sessions(action);

-- Comments for Documentation
COMMENT ON TABLE agent_sessions IS 'Tracks each user command and AI agent interaction';
COMMENT ON COLUMN agent_sessions.user_id IS 'Slack user ID (e.g., U09BSMA8U75)';
COMMENT ON COLUMN agent_sessions.channel IS 'Slack channel ID (e.g., C09BXTD0WR0)';
COMMENT ON COLUMN agent_sessions.raw_text IS 'Original user input text (cleaned)';
COMMENT ON COLUMN agent_sessions.action IS 'Detected action (e.g., list_tickets, search_tickets)';
COMMENT ON COLUMN agent_sessions.origin IS 'Source of action detection (ai-agent-with-fallback)';
COMMENT ON COLUMN agent_sessions.thread_ts IS 'Slack thread timestamp for grouping conversations';

-- ============================================================================
-- TABLE: api_logs
-- ============================================================================
-- Purpose: Full observability of all API calls made during workflow execution
-- Relationship: Multiple logs per session (N:1 with agent_sessions via run_id)
-- Retention: 90 days recommended (can be compressed/archived after 30 days)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Workflow Context
    workflow_id TEXT,
    node_name TEXT NOT NULL,
    duration_ms INTEGER,
    run_id TEXT NOT NULL, -- correlation_id from workflow (links to agent_sessions)
    
    -- HTTP Details
    direction TEXT CHECK (direction IN ('request', 'response')),
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status_code INTEGER,
    
    -- Request/Response Data
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    
    -- User Context (denormalized for easier querying)
    actor_user TEXT,
    channel TEXT,
    thread_ts TEXT,
    
    -- Business Context
    ticket_id TEXT,
    tags TEXT[],
    extra JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_logs_run_id 
    ON api_logs(run_id);

CREATE INDEX IF NOT EXISTS idx_logs_ticket_id 
    ON api_logs(ticket_id) 
    WHERE ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logs_created_at 
    ON api_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_node_name 
    ON api_logs(node_name);

CREATE INDEX IF NOT EXISTS idx_logs_status_code 
    ON api_logs(status_code);

CREATE INDEX IF NOT EXISTS idx_logs_actor_user 
    ON api_logs(actor_user);

CREATE INDEX IF NOT EXISTS idx_logs_errors 
    ON api_logs(error_message) 
    WHERE error_message IS NOT NULL;

-- JSONB Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_logs_response_body_gin 
    ON api_logs USING GIN (response_body);

CREATE INDEX IF NOT EXISTS idx_logs_extra_gin 
    ON api_logs USING GIN (extra);

-- Comments for Documentation
COMMENT ON TABLE api_logs IS 'Complete observability log of all API calls and workflow executions';
COMMENT ON COLUMN api_logs.workflow_id IS 'n8n workflow ID';
COMMENT ON COLUMN api_logs.node_name IS 'n8n node name that made the call';
COMMENT ON COLUMN api_logs.duration_ms IS 'Time taken for the API call in milliseconds';
COMMENT ON COLUMN api_logs.run_id IS 'Correlation ID (format: corr_TIMESTAMP_USER_RANDOM)';
COMMENT ON COLUMN api_logs.direction IS 'request or response';
COMMENT ON COLUMN api_logs.method IS 'HTTP method (GET, POST, PUT, DELETE)';
COMMENT ON COLUMN api_logs.url IS 'Full API endpoint URL';
COMMENT ON COLUMN api_logs.status_code IS 'HTTP status code (200, 404, 500, etc.)';
COMMENT ON COLUMN api_logs.request_body IS 'Full request payload (JSON)';
COMMENT ON COLUMN api_logs.response_body IS 'Full response payload (JSON)';
COMMENT ON COLUMN api_logs.error_message IS 'Error message if call failed';
COMMENT ON COLUMN api_logs.actor_user IS 'Slack user who triggered the action';
COMMENT ON COLUMN api_logs.ticket_id IS 'Gorgias ticket ID if applicable';
COMMENT ON COLUMN api_logs.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN api_logs.extra IS 'Additional metadata (flexible JSONB)';

-- ============================================================================
-- VIEWS: Analytics Views for Dashboard
-- ============================================================================

-- View: Daily Command Usage
CREATE OR REPLACE VIEW daily_command_usage AS
SELECT 
    DATE(created_at) as date,
    action,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM agent_sessions
GROUP BY DATE(created_at), action
ORDER BY date DESC, count DESC;

COMMENT ON VIEW daily_command_usage IS 'Daily breakdown of command usage by action type';

-- View: User Adoption Metrics
CREATE OR REPLACE VIEW user_adoption_metrics AS
SELECT 
    user_id,
    COUNT(*) as total_commands,
    COUNT(DISTINCT action) as unique_actions,
    MIN(created_at) as first_usage,
    MAX(created_at) as last_usage,
    DATE_PART('day', MAX(created_at) - MIN(created_at)) as days_active
FROM agent_sessions
GROUP BY user_id
ORDER BY total_commands DESC;

COMMENT ON VIEW user_adoption_metrics IS 'User-level adoption and engagement metrics';

-- View: API Performance Metrics
CREATE OR REPLACE VIEW api_performance_metrics AS
SELECT 
    node_name,
    COUNT(*) as total_calls,
    AVG(duration_ms) as avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY duration_ms) as p90_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    COUNT(*) FILTER (WHERE error_message IS NOT NULL) as error_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE error_message IS NOT NULL) / COUNT(*), 2) as error_rate_pct
FROM api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY node_name
ORDER BY total_calls DESC;

COMMENT ON VIEW api_performance_metrics IS 'API call performance and error metrics (last 7 days)';

-- View: Error Summary
CREATE OR REPLACE VIEW error_summary AS
SELECT 
    DATE(created_at) as date,
    node_name,
    status_code,
    COUNT(*) as error_count,
    COUNT(DISTINCT run_id) as affected_sessions,
    ARRAY_AGG(DISTINCT error_message) as error_messages
FROM api_logs
WHERE error_message IS NOT NULL
GROUP BY DATE(created_at), node_name, status_code
ORDER BY date DESC, error_count DESC;

COMMENT ON VIEW error_summary IS 'Daily error summary by node and status code';

-- View: Ticket Operations Summary
CREATE OR REPLACE VIEW ticket_operations_summary AS
SELECT 
    DATE(al.created_at) as date,
    al.node_name as operation,
    COUNT(DISTINCT al.ticket_id) as unique_tickets,
    COUNT(*) as total_operations,
    COUNT(DISTINCT al.actor_user) as unique_users
FROM api_logs al
WHERE al.ticket_id IS NOT NULL
GROUP BY DATE(al.created_at), al.node_name
ORDER BY date DESC, total_operations DESC;

COMMENT ON VIEW ticket_operations_summary IS 'Daily summary of ticket operations by type';

-- ============================================================================
-- FUNCTIONS: Helper Functions
-- ============================================================================

-- Function: Get Execution Trace by correlation_id
CREATE OR REPLACE FUNCTION get_execution_trace(p_correlation_id TEXT)
RETURNS TABLE (
    step_order INTEGER,
    node_name TEXT,
    method TEXT,
    url TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY al.created_at)::INTEGER as step_order,
        al.node_name,
        al.method,
        al.url,
        al.status_code,
        al.duration_ms,
        al.error_message,
        al.created_at
    FROM api_logs al
    WHERE al.run_id = p_correlation_id
    ORDER BY al.created_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_execution_trace IS 'Returns step-by-step execution trace for a given correlation_id';

-- Example usage:
-- SELECT * FROM get_execution_trace('corr_2025-11-06_U09BSMA8U75_a3f2e1');

-- Function: Get Request/Response by correlation_id and node_name
CREATE OR REPLACE FUNCTION get_request_response(
    p_correlation_id TEXT,
    p_node_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    node_name TEXT,
    request_body JSONB,
    response_body JSONB,
    status_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.node_name,
        al.request_body,
        al.response_body,
        al.status_code,
        al.created_at
    FROM api_logs al
    WHERE al.run_id = p_correlation_id
        AND (p_node_name IS NULL OR al.node_name = p_node_name)
    ORDER BY al.created_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_request_response IS 'Returns request/response data for debugging';

-- Example usage:
-- SELECT * FROM get_request_response('corr_2025-11-06_U09BSMA8U75_a3f2e1', 'search_tickets');

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to agent_sessions
CREATE TRIGGER update_agent_sessions_updated_at
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- ============================================================================
-- Uncomment if you need multi-tenant support or access control

-- ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see their own sessions
-- CREATE POLICY user_sessions_policy ON agent_sessions
--     FOR SELECT
--     USING (user_id = current_setting('app.current_user_id')::TEXT);

-- ============================================================================
-- DATA RETENTION POLICY
-- ============================================================================
-- Recommended: Archive or delete old logs to manage database size

-- Delete api_logs older than 90 days (run as scheduled job)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_api_logs IS 'Deletes api_logs older than 90 days - run as cron job';

-- Example scheduled execution (using pg_cron extension):
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', 'SELECT cleanup_old_api_logs();');

-- ============================================================================
-- SAMPLE QUERIES (See queries.sql for more examples)
-- ============================================================================

-- Get total commands today
-- SELECT COUNT(*) FROM agent_sessions WHERE DATE(created_at) = CURRENT_DATE;

-- Get error rate last 24 hours
-- SELECT 
--     COUNT(*) FILTER (WHERE error_message IS NOT NULL)::FLOAT / COUNT(*) * 100 as error_rate_pct
-- FROM api_logs 
-- WHERE created_at > NOW() - INTERVAL '24 hours';

-- Get most active users this week
-- SELECT user_id, COUNT(*) as commands
-- FROM agent_sessions
-- WHERE created_at > NOW() - INTERVAL '7 days'
-- GROUP BY user_id
-- ORDER BY commands DESC
-- LIMIT 10;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
