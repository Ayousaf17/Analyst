# Hybrid Architecture - Complete Logging Flow

## Overview
This diagram shows how all 3 Supabase tables get populated in the hybrid architecture.

```
┌─────────────────────────────────────────────────────────────────┐
│ Parse Slack                                                     │
│ - Generates correlation_id: "corr_2025-01-15_U123_abc123"      │
│ - Captures start_timestamp: 1736956800000                       │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ Intent Classifier                                               │
│ - Analyzes user_text                                            │
│ - Routes to appropriate path                                    │
└────┬────────────────────┬───────────────────┬───────────────────┘
     ↓                    ↓                   ↓
┌────────────┐   ┌─────────────────┐   ┌──────────────┐
│ v23 Path   │   │ AI Agent Path   │   │ Analytics    │
└────┬───────┘   └────┬────────────┘   └────┬─────────┘
     ↓                ↓                      ↓
     │                │                      │
     │ ✅ CHECKPOINT 1: Session Tracking (agent_sessions table)
     │                │                      │
     ↓                ↓                      ↓
┌────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Insert Session │ │ Insert Session   │ │ Insert Session  │
│ origin: v23    │ │ origin: ai-agent │ │ origin: analytics│
└────┬───────────┘ └────┬─────────────┘ └────┬────────────┘
     ↓                  ↓                     ↓
     │                  │                     │
     │ ✅ CHECKPOINT 2: API Call Tracking (api_logs table)
     │                  │                     │
     ↓                  ↓                     ↓
┌────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Execute Tools  │ │ AI Agent +       │ │ Fetch Tickets + │
│ (in loop)      │ │ Tool Wrappers    │ │ Analytics Agent │
│   ↓            │ │   ↓              │ │   ↓             │
│ Format Log     │ │ Batch Log        │ │ Format Log      │
│   ↓            │ │   ↓              │ │   ↓             │
│ Insert api_logs│ │ Insert api_logs  │ │ Insert api_logs │
└────┬───────────┘ └────┬─────────────┘ └────┬────────────┘
     ↓                  ↓                     ↓
     │                  │                     │
     └──────────────────┴─────────────────────┘
                        ↓
         ┌──────────────────────────────┐
         │ Collect & Process Results    │
         │ - Deduplicate                │
         │ - Summarize                  │
         │ - Calculate Standard Metrics │
         └──────────────┬───────────────┘
                        ↓
                        │
         ✅ CHECKPOINT 3: Performance Summary (performance_metrics table)
                        │
                        ↓
         ┌──────────────────────────────┐
         │ Calculate Performance Metrics│
         │ - Reads start_timestamp      │
         │ - Calculates execution_time  │
         │ - Counts api_calls           │
         │ - Estimates tokens           │
         └──────────────┬───────────────┘
                        ↓
         ┌──────────────────────────────┐
         │ Insert Performance Metrics   │
         │ - Uses correlation_id        │
         │ - Ties all logs together     │
         └──────────────┬───────────────┘
                        ↓
         ┌──────────────────────────────┐
         │ Final Slack Reply            │
         └──────────────────────────────┘
```

## What Gets Logged Where

### 1. agent_sessions Table
**Logged at**: Start of each path (right after Intent Classifier)

**Purpose**: Track which path handled the request

**Example rows**:
```sql
-- v23 structured path
INSERT INTO agent_sessions VALUES (
  'U09BSMA8U75',
  'C09BXTD0WR0',
  'get ticket 12345',
  'get_ticket',
  'v23-structured',
  'corr_2025-01-15_U123_abc123',
  '1736956800.012345'
);

-- AI Agent natural language path
INSERT INTO agent_sessions VALUES (
  'U09BSMA8U75',
  'C09BXTD0WR0',
  'show me spencers stuff',
  'natural_language',
  'ai-agent-natural',
  'corr_2025-01-15_U123_def456',
  '1736956801.023456'
);

-- Analytics path
INSERT INTO agent_sessions VALUES (
  'U09BSMA8U75',
  'C09BXTD0WR0',
  'analyze insights',
  'analyze_insights',
  'analytics-path',
  'corr_2025-01-15_U123_ghi789',
  '1736956802.034567'
);
```

### 2. api_logs Table
**Logged at**: Each API call to Gorgias (during tool execution)

**Purpose**: Detailed audit trail of every external API call

**v23 path** (existing behavior - logs each iteration):
```sql
-- First API call in loop
INSERT INTO api_logs VALUES (
  'workflow_abc123',
  'list_tickets',
  150,
  'corr_2025-01-15_U123_abc123',
  'request',
  'GET',
  'https://ironsidecomputers.gorgias.com/api/tickets',
  200,
  '{"status":"open","limit":50}',
  '{"data":[...]}',
  NULL,
  'U09BSMA8U75',
  'C09BXTD0WR0',
  '1736956800.012345',
  NULL,
  '[]',
  '{"step_number":1,"action":"list_tickets","path":"v23"}'
);

-- Second API call in loop (if multi-step)
INSERT INTO api_logs VALUES (
  'workflow_abc123',
  'get_ticket',
  120,
  'corr_2025-01-15_U123_abc123',
  ...
);
```

**AI Agent path** (new - batch log):
```sql
-- Single log entry for all AI Agent tools
INSERT INTO api_logs VALUES (
  'workflow_abc123',
  'ai_agent_batch',
  1200,
  'corr_2025-01-15_U123_def456',
  'request',
  'AI_AGENT',
  'multiple_tools',
  200,
  '{"user_text":"show me spencers stuff","tools_called":["search_tickets","get_ticket"]}',
  '{"results":[...]}',
  NULL,
  'U09BSMA8U75',
  'C09BXTD0WR0',
  '1736956801.023456',
  NULL,
  '[]',
  '{"path":"ai-agent","tools_count":2}'
);
```

### 3. performance_metrics Table
**Logged at**: End of workflow (right before Final Slack Reply)

**Purpose**: High-level execution metrics for monitoring and optimization

**Example row**:
```sql
INSERT INTO performance_metrics VALUES (
  'corr_2025-01-15_U123_abc123',
  'U09BSMA8U75',
  'C09BXTD0WR0',
  '1736956800.012345',
  3200,               -- execution_time_ms
  3.2,                -- execution_time_seconds
  'list_tickets',     -- primary_action
  1,                  -- actions_executed
  2,                  -- api_calls_count
  50,                 -- result_count (50 tickets returned)
  450,                -- token_count_estimate
  'success',          -- status
  NULL,               -- error_message
  '2025-01-15T10:00:00Z'
);
```

## Query Examples

### Get all requests from a user
```sql
SELECT 
  s.raw_text,
  s.origin,
  pm.execution_time_ms,
  pm.api_calls_count,
  pm.status
FROM agent_sessions s
JOIN performance_metrics pm ON s.correlation_id = pm.correlation_id
WHERE s.user_id = 'U09BSMA8U75'
ORDER BY s.created_at DESC
LIMIT 20;
```

### Compare path performance
```sql
SELECT 
  s.origin,
  COUNT(*) as request_count,
  AVG(pm.execution_time_ms) as avg_time_ms,
  AVG(pm.api_calls_count) as avg_api_calls,
  SUM(CASE WHEN pm.status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM agent_sessions s
JOIN performance_metrics pm ON s.correlation_id = pm.correlation_id
WHERE s.created_at > NOW() - INTERVAL '7 days'
GROUP BY s.origin;
```

### Find slow requests
```sql
SELECT 
  s.user_id,
  s.raw_text,
  s.origin,
  pm.execution_time_ms,
  pm.api_calls_count,
  al.node_name,
  al.duration_ms
FROM agent_sessions s
JOIN performance_metrics pm ON s.correlation_id = pm.correlation_id
JOIN api_logs al ON s.correlation_id = al.run_id
WHERE pm.execution_time_ms > 5000
ORDER BY pm.execution_time_ms DESC
LIMIT 10;
```

### Get detailed request trace
```sql
-- Full audit trail for a specific request
SELECT 
  'session' as log_type,
  s.created_at as timestamp,
  s.raw_text,
  s.action,
  s.origin,
  NULL as api_node,
  NULL as api_duration
FROM agent_sessions s
WHERE s.correlation_id = 'corr_2025-01-15_U123_abc123'

UNION ALL

SELECT 
  'api_call' as log_type,
  al.created_at,
  NULL,
  al.node_name,
  NULL,
  al.node_name,
  al.duration_ms
FROM api_logs al
WHERE al.run_id = 'corr_2025-01-15_U123_abc123'

UNION ALL

SELECT 
  'performance' as log_type,
  pm.timestamp,
  NULL,
  pm.primary_action,
  NULL,
  NULL,
  pm.execution_time_ms
FROM performance_metrics pm
WHERE pm.correlation_id = 'corr_2025-01-15_U123_abc123'

ORDER BY timestamp;
```

## Benefits of This Logging Approach

✅ **Path Comparison**: Track which path (v23, AI Agent, Analytics) is faster/more accurate
✅ **Cost Analysis**: Monitor API calls per path for cost optimization
✅ **Error Attribution**: Know exactly which path failed
✅ **A/B Testing**: Compare user satisfaction across different paths
✅ **Performance Optimization**: Identify bottlenecks in specific paths
✅ **Audit Trail**: Complete request trace from start to finish
✅ **Usage Analytics**: Understand user behavior patterns by path
