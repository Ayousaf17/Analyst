-- ============================================================================
-- Gorgias Terminal - Common Debugging Queries
-- ============================================================================
-- Quick reference queries for debugging and monitoring
-- ============================================================================

-- ============================================================================
-- SECTION 1: Execution Tracing
-- ============================================================================

-- Query: Get full execution trace by correlation_id
-- Use when: User reports "command not working" - trace entire flow
SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at) as step,
    node_name,
    method,
    url,
    status_code,
    duration_ms,
    error_message,
    created_at
FROM api_logs 
WHERE run_id = 'corr_2025-11-06_U09BSMA8U75_a3f2e1'
ORDER BY created_at;

-- Query: Get request/response for specific step
-- Use when: Need to see exact data sent/received
SELECT 
    node_name,
    request_body,
    response_body,
    status_code
FROM api_logs 
WHERE run_id = 'corr_2025-11-06_U09BSMA8U75_a3f2e1' 
    AND node_name = 'search_tickets';

-- Query: Find correlation_id by user and time
-- Use when: User says "my command from 2 hours ago failed"
SELECT 
    ags.id,
    ags.user_id,
    ags.raw_text,
    ags.action,
    ags.created_at,
    COUNT(al.id) as api_calls,
    BOOL_OR(al.error_message IS NOT NULL) as has_errors
FROM agent_sessions ags
LEFT JOIN api_logs al ON ags.thread_ts = al.thread_ts
WHERE ags.user_id = 'U09BSMA8U75'
    AND ags.created_at > NOW() - INTERVAL '3 hours'
GROUP BY ags.id
ORDER BY ags.created_at DESC;

-- ============================================================================
-- SECTION 2: Error Analysis
-- ============================================================================

-- Query: Recent errors (last 24 hours)
-- Use when: Monitoring system health
SELECT 
    created_at,
    node_name,
    method,
    url,
    status_code,
    error_message,
    run_id,
    actor_user
FROM api_logs 
WHERE error_message IS NOT NULL
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Query: Error summary by node (last 7 days)
-- Use when: Identifying problematic nodes
SELECT 
    node_name,
    COUNT(*) as error_count,
    COUNT(DISTINCT run_id) as affected_sessions,
    ARRAY_AGG(DISTINCT status_code) as status_codes,
    ARRAY_AGG(DISTINCT error_message) as error_messages
FROM api_logs
WHERE error_message IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days'
GROUP BY node_name
ORDER BY error_count DESC;

-- Query: Failed sessions (sessions with at least one error)
-- Use when: Measuring reliability
SELECT 
    ags.user_id,
    ags.raw_text,
    ags.action,
    ags.created_at,
    al.node_name as failed_at,
    al.error_message
FROM agent_sessions ags
INNER JOIN api_logs al ON al.thread_ts = ags.thread_ts
WHERE al.error_message IS NOT NULL
    AND ags.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ags.created_at DESC;

-- ============================================================================
-- SECTION 3: Performance Analysis
-- ============================================================================

-- Query: Slow API calls (> 5 seconds)
-- Use when: Investigating latency issues
SELECT 
    node_name,
    method,
    url,
    duration_ms,
    duration_ms / 1000.0 as duration_seconds,
    status_code,
    run_id,
    created_at
FROM api_logs
WHERE duration_ms > 5000
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY duration_ms DESC;

-- Query: Performance metrics by node (last 7 days)
-- Use when: Establishing baselines
SELECT 
    node_name,
    COUNT(*) as total_calls,
    ROUND(AVG(duration_ms)) as avg_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY duration_ms) as p90_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_ms,
    MAX(duration_ms) as max_ms,
    COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors,
    ROUND(100.0 * COUNT(*) FILTER (WHERE error_message IS NOT NULL) / COUNT(*), 2) as error_rate
FROM api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
    AND duration_ms IS NOT NULL
GROUP BY node_name
ORDER BY total_calls DESC;

-- Query: Session duration (start to finish)
-- Use when: Measuring end-to-end latency
SELECT 
    run_id,
    MIN(created_at) as started_at,
    MAX(created_at) as completed_at,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as total_seconds,
    COUNT(*) as api_calls
FROM api_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY run_id
ORDER BY total_seconds DESC
LIMIT 20;

-- ============================================================================
-- SECTION 4: Usage Analytics
-- ============================================================================

-- Query: Commands per day (last 30 days)
-- Use when: Measuring adoption
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_commands,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT action) as unique_actions
FROM agent_sessions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Query: Most popular actions (last 7 days)
-- Use when: Understanding user behavior
SELECT 
    action,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM agent_sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY count DESC;

-- Query: Active users by day of week
-- Use when: Planning maintenance windows
SELECT 
    TO_CHAR(created_at, 'Day') as day_of_week,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_commands
FROM agent_sessions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
ORDER BY EXTRACT(DOW FROM created_at);

-- Query: Hourly usage pattern
-- Use when: Understanding peak hours
SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as command_count,
    COUNT(DISTINCT user_id) as unique_users
FROM agent_sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- Query: User engagement metrics
-- Use when: Identifying power users vs. casual users
SELECT 
    user_id,
    COUNT(*) as total_commands,
    COUNT(DISTINCT action) as unique_actions_used,
    MIN(created_at) as first_command,
    MAX(created_at) as last_command,
    EXTRACT(DAY FROM (MAX(created_at) - MIN(created_at))) as days_active,
    ROUND(COUNT(*)::NUMERIC / NULLIF(EXTRACT(DAY FROM (MAX(created_at) - MIN(created_at))), 0), 2) as avg_commands_per_day
FROM agent_sessions
GROUP BY user_id
ORDER BY total_commands DESC;

-- ============================================================================
-- SECTION 5: Ticket Operations Analysis
-- ============================================================================

-- Query: Tickets touched by AI agent (last 7 days)
-- Use when: Measuring business impact
SELECT 
    COUNT(DISTINCT ticket_id) as unique_tickets,
    COUNT(*) as total_operations,
    COUNT(DISTINCT actor_user) as unique_users
FROM api_logs
WHERE ticket_id IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days';

-- Query: Most operated tickets
-- Use when: Identifying high-touch tickets
SELECT 
    ticket_id,
    COUNT(*) as operation_count,
    ARRAY_AGG(DISTINCT node_name) as operations,
    MIN(created_at) as first_operation,
    MAX(created_at) as last_operation
FROM api_logs
WHERE ticket_id IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days'
GROUP BY ticket_id
ORDER BY operation_count DESC
LIMIT 20;

-- Query: Operations by type
-- Use when: Understanding workflow patterns
SELECT 
    node_name as operation,
    COUNT(*) as count,
    COUNT(DISTINCT ticket_id) as unique_tickets,
    COUNT(DISTINCT actor_user) as unique_users
FROM api_logs
WHERE ticket_id IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days'
GROUP BY node_name
ORDER BY count DESC;

-- ============================================================================
-- SECTION 6: Search & Filter Analysis
-- ============================================================================

-- Query: Search filters used
-- Use when: Understanding how users search
SELECT 
    response_body->'meta'->'applied_filters' as filters,
    COUNT(*) as usage_count
FROM api_logs
WHERE node_name = 'Filter Results (Client-Side)'
    AND created_at > NOW() - INTERVAL '7 days'
    AND response_body ? 'meta'
GROUP BY filters
ORDER BY usage_count DESC;

-- Query: Search result counts
-- Use when: Evaluating search relevance
SELECT 
    CASE 
        WHEN (response_body->'meta'->>'total_count')::INT = 0 THEN '0 results'
        WHEN (response_body->'meta'->>'total_count')::INT BETWEEN 1 AND 5 THEN '1-5 results'
        WHEN (response_body->'meta'->>'total_count')::INT BETWEEN 6 AND 20 THEN '6-20 results'
        WHEN (response_body->'meta'->>'total_count')::INT BETWEEN 21 AND 50 THEN '21-50 results'
        ELSE '50+ results'
    END as result_range,
    COUNT(*) as search_count
FROM api_logs
WHERE node_name = 'Filter Results (Client-Side)'
    AND created_at > NOW() - INTERVAL '7 days'
    AND response_body ? 'meta'
GROUP BY result_range
ORDER BY 
    CASE result_range
        WHEN '0 results' THEN 1
        WHEN '1-5 results' THEN 2
        WHEN '6-20 results' THEN 3
        WHEN '21-50 results' THEN 4
        ELSE 5
    END;

-- ============================================================================
-- SECTION 7: OpenAI & Analytics Usage
-- ============================================================================

-- Query: OpenAI function calls
-- Use when: Tracking AI usage patterns
SELECT 
    response_body->'choices'->0->'message'->'tool_calls'->0->'function'->>'name' as function_called,
    COUNT(*) as call_count
FROM api_logs
WHERE node_name = 'OpenAI Structured Output'
    AND created_at > NOW() - INTERVAL '7 days'
    AND response_body ? 'choices'
GROUP BY function_called
ORDER BY call_count DESC;

-- Query: Analytics requests (expensive Claude Sonnet calls)
-- Use when: Monitoring Claude Sonnet usage and cost
SELECT 
    DATE(created_at) as date,
    COUNT(*) as analytics_requests,
    COUNT(DISTINCT actor_user) as unique_users
FROM api_logs
WHERE node_name = 'Ticket Analytics Agent'
    AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- SECTION 8: System Health Checks
-- ============================================================================

-- Query: Overall health metrics (last 24 hours)
-- Use when: Daily health check
SELECT 
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE action = 'analyze_insights') as analytics_requests,
    (
        SELECT COUNT(*) 
        FROM api_logs 
        WHERE error_message IS NOT NULL 
            AND created_at > NOW() - INTERVAL '24 hours'
    ) as total_errors,
    ROUND(
        100.0 * (
            SELECT COUNT(*) 
            FROM api_logs 
            WHERE error_message IS NOT NULL 
                AND created_at > NOW() - INTERVAL '24 hours'
        ) / NULLIF(
            (SELECT COUNT(*) FROM api_logs WHERE created_at > NOW() - INTERVAL '24 hours'),
            0
        ),
        2
    ) as error_rate_pct
FROM agent_sessions
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Query: Database size monitoring
-- Use when: Planning storage capacity
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('agent_sessions', 'api_logs')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Query: Oldest records (for retention policy)
-- Use when: Planning data cleanup
SELECT 
    'agent_sessions' as table_name,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    COUNT(*) as total_records
FROM agent_sessions
UNION ALL
SELECT 
    'api_logs' as table_name,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    COUNT(*) as total_records
FROM api_logs;

-- ============================================================================
-- SECTION 9: User-Specific Debugging
-- ============================================================================

-- Query: All actions by specific user (last 7 days)
-- Use when: User reports issues - see their full activity
SELECT 
    ags.created_at,
    ags.raw_text,
    ags.action,
    ags.thread_ts,
    COUNT(al.id) as api_calls,
    BOOL_OR(al.error_message IS NOT NULL) as had_errors
FROM agent_sessions ags
LEFT JOIN api_logs al ON ags.thread_ts = al.thread_ts
WHERE ags.user_id = 'U09BSMA8U75'
    AND ags.created_at > NOW() - INTERVAL '7 days'
GROUP BY ags.id
ORDER BY ags.created_at DESC;

-- Query: User's failed commands
-- Use when: User says "nothing works for me"
SELECT 
    ags.created_at,
    ags.raw_text,
    ags.action,
    al.node_name as failed_at,
    al.error_message,
    al.status_code
FROM agent_sessions ags
INNER JOIN api_logs al ON ags.thread_ts = al.thread_ts
WHERE ags.user_id = 'U09BSMA8U75'
    AND al.error_message IS NOT NULL
    AND ags.created_at > NOW() - INTERVAL '7 days'
ORDER BY ags.created_at DESC;

-- ============================================================================
-- SECTION 10: Advanced Analytics
-- ============================================================================

-- Query: Conversion funnel (command → execution → success)
-- Use when: Measuring reliability end-to-end
WITH funnel AS (
    SELECT 
        ags.id as session_id,
        ags.action,
        EXISTS(SELECT 1 FROM api_logs WHERE thread_ts = ags.thread_ts) as executed,
        NOT EXISTS(SELECT 1 FROM api_logs WHERE thread_ts = ags.thread_ts AND error_message IS NOT NULL) as successful
    FROM agent_sessions ags
    WHERE ags.created_at > NOW() - INTERVAL '7 days'
)
SELECT 
    COUNT(*) as total_commands,
    COUNT(*) FILTER (WHERE executed) as executed_commands,
    COUNT(*) FILTER (WHERE executed AND successful) as successful_commands,
    ROUND(100.0 * COUNT(*) FILTER (WHERE executed) / COUNT(*), 2) as execution_rate,
    ROUND(100.0 * COUNT(*) FILTER (WHERE executed AND successful) / COUNT(*) FILTER (WHERE executed), 2) as success_rate
FROM funnel;

-- Query: Retry analysis (same user, same action, within 5 minutes)
-- Use when: Identifying user frustration
WITH retries AS (
    SELECT 
        user_id,
        action,
        created_at,
        LAG(created_at) OVER (PARTITION BY user_id, action ORDER BY created_at) as prev_attempt,
        EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY user_id, action ORDER BY created_at))) as seconds_since_last
    FROM agent_sessions
    WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT 
    user_id,
    action,
    COUNT(*) as retry_count,
    AVG(seconds_since_last) as avg_retry_delay_seconds
FROM retries
WHERE seconds_since_last < 300 -- Within 5 minutes
GROUP BY user_id, action
HAVING COUNT(*) >= 3
ORDER BY retry_count DESC;

-- ============================================================================
-- END OF QUERIES
-- ============================================================================
