# Performance Metrics Implementation Guide

## Overview

This guide explains how to implement performance tracking for the Gorgias Slack Terminal workflow. Track execution time, API calls, token usage, and more for data-driven optimization.

---

## Architecture

```
Parse Slack (capture start time)
  ↓
[Main workflow execution]
  ↓
Calculate Performance Metrics (before Final Slack Reply)
  ↓
Insert Performance Metrics (Supabase)
  ↓
Final Slack Reply
```

---

## Supabase Table Setup

### Create Table

```sql
CREATE TABLE performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  execution_time_seconds DECIMAL(10,2) NOT NULL,
  api_calls_count INTEGER NOT NULL,
  actions_executed INTEGER NOT NULL,
  primary_action TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  token_count_estimate INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_performance_correlation ON performance_metrics(correlation_id);
CREATE INDEX idx_performance_created_at ON performance_metrics(created_at);
CREATE INDEX idx_performance_primary_action ON performance_metrics(primary_action);
CREATE INDEX idx_performance_execution_time ON performance_metrics(execution_time_ms);
```

### Table Schema Details

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Auto-incrementing primary key |
| correlation_id | TEXT | Links to agent_sessions table |
| execution_time_ms | INTEGER | Total execution time in milliseconds |
| execution_time_seconds | DECIMAL(10,2) | Execution time in seconds (2 decimal places) |
| api_calls_count | INTEGER | Number of API calls made |
| actions_executed | INTEGER | Number of actions in plan |
| primary_action | TEXT | Main action (list_tickets, get_ticket, etc.) |
| result_count | INTEGER | Number of results returned |
| token_count_estimate | INTEGER | Estimated tokens used (rough) |
| created_at | TIMESTAMP | When metrics were recorded |

---

## Implementation Steps

### Step 1: Update Parse Slack Node

Add start timestamp capture:

**Current Parse Slack code - Add these lines:**

```javascript
// ... existing Parse Slack code ...

return [{
  json: {
    // ... existing fields ...
    correlation_id: `${thread_ts}-${Date.now()}`,
    start_time: new Date().toISOString(),
    start_timestamp: Date.now(),  // ← ADD THIS
    perf_metrics: {                // ← ADD THIS
      start: Date.now()
    }
    // ... rest of fields ...
  }
}];
```

---

### Step 2: Add Calculate Performance Metrics Node

**Type:** Code
**Name:** Calculate Performance Metrics
**Position:** Before "Final Slack Reply" node

**Code:** Copy from `workflows/Calculate_Performance_Metrics.js`

**What it does:**
1. Calculates execution time (end - start)
2. Counts API calls made
3. Counts actions executed
4. Estimates token usage
5. Identifies primary action
6. Returns metrics for Supabase insertion

---

### Step 3: Add Insert Performance Metrics Node

**Type:** Supabase
**Name:** Insert Performance Metrics
**Position:** After "Calculate Performance Metrics"

**Configuration:**

**Operation:** Insert
**Table:** performance_metrics

**Fields Mapping:**
```json
{
  "correlation_id": "={{ $json.performance_metrics.correlation_id }}",
  "execution_time_ms": "={{ $json.performance_metrics.execution_time_ms }}",
  "execution_time_seconds": "={{ $json.performance_metrics.execution_time_seconds }}",
  "api_calls_count": "={{ $json.performance_metrics.api_calls_count }}",
  "actions_executed": "={{ $json.performance_metrics.actions_executed }}",
  "primary_action": "={{ $json.performance_metrics.primary_action }}",
  "result_count": "={{ $json.performance_metrics.result_count }}",
  "token_count_estimate": "={{ $json.performance_metrics.token_count_estimate }}"
}
```

**Alternative: HTTP Request to Supabase**

```json
{
  "method": "POST",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/performance_metrics",
  "body": {
    "correlation_id": "={{ $json.performance_metrics.correlation_id }}",
    "execution_time_ms": "={{ $json.performance_metrics.execution_time_ms }}",
    "execution_time_seconds": "={{ $json.performance_metrics.execution_time_seconds }}",
    "api_calls_count": "={{ $json.performance_metrics.api_calls_count }}",
    "actions_executed": "={{ $json.performance_metrics.actions_executed }}",
    "primary_action": "={{ $json.performance_metrics.primary_action }}",
    "result_count": "={{ $json.performance_metrics.result_count }}",
    "token_count_estimate": "={{ $json.performance_metrics.token_count_estimate }}"
  }
}
```

---

### Step 4: Connect Nodes

```
... existing workflow ...
  ↓
Conversational Response AI
  ↓
Calculate Performance Metrics ← NEW
  ↓
Insert Performance Metrics ← NEW
  ↓
Final Slack Reply
```

**Important:** Ensure metrics are captured AFTER all actions complete but BEFORE final reply.

---

## Metrics Tracked

### Execution Time

**execution_time_ms:** Total milliseconds from Parse Slack to metrics calculation

**execution_time_seconds:** Same in seconds with 2 decimal precision

**Use cases:**
- Identify slow executions
- Track performance over time
- Optimize slow actions

**Example values:**
- Fast: 1500ms (1.5s)
- Normal: 2500ms (2.5s)
- Slow: 5000ms+ (5s+)

---

### API Calls Count

**api_calls_count:** Number of Gorgias API calls made

**Tracking:**
- Single action: 1 call
- Multi-step: Multiple calls
- Fetched from "Fetch Loop Results" node

**Use cases:**
- Monitor API usage
- Identify heavy operations
- Track rate limit risk

---

### Actions Executed

**actions_executed:** Number of actions in the execution plan

**Examples:**
- Simple: 1 action (get_ticket)
- Complex: 3 actions (search → get → assign)

**Use cases:**
- Understand workflow complexity
- Identify common patterns
- Optimize multi-step flows

---

### Primary Action

**primary_action:** The main action from the plan (first action)

**Values:**
- list_tickets
- search_tickets
- get_ticket
- create_ticket
- etc. (all 16 actions)

**Use cases:**
- Group metrics by action type
- Compare performance across actions
- Identify problematic actions

---

### Result Count

**result_count:** Number of results returned

**Examples:**
- list_tickets: 0-50+ results
- get_ticket: 1 result
- search_tickets: 0-100+ results

**Use cases:**
- Understand data volume
- Correlate with execution time
- Identify large result sets

---

### Token Count Estimate

**token_count_estimate:** Rough estimate of tokens used

**Calculation:**
```javascript
const resultString = JSON.stringify(results);
const estimatedTokens = Math.ceil(resultString.length / 4);
```

**Accuracy:** ~80% accurate (rough approximation)

**Use cases:**
- Estimate costs
- Track token usage trends
- Identify token-heavy operations

**Note:** For exact token counts, integrate with OpenAI's token counting API.

---

## Analytics Queries

### Average Execution Time by Action

```sql
SELECT
  primary_action,
  COUNT(*) as execution_count,
  AVG(execution_time_seconds) as avg_time_seconds,
  MIN(execution_time_seconds) as min_time,
  MAX(execution_time_seconds) as max_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_seconds) as median_time
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY primary_action
ORDER BY avg_time_seconds DESC;
```

**Output:**
```
primary_action    | execution_count | avg_time | min_time | max_time | median_time
------------------|-----------------|----------|----------|----------|------------
search_tickets    | 45              | 3.24     | 1.8      | 6.5      | 3.1
list_tickets      | 120             | 2.15     | 1.2      | 4.2      | 2.0
get_ticket        | 80              | 1.45     | 0.9      | 2.8      | 1.4
```

---

### API Calls Distribution

```sql
SELECT
  api_calls_count,
  COUNT(*) as execution_count,
  AVG(execution_time_seconds) as avg_time
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY api_calls_count
ORDER BY api_calls_count;
```

**Output:**
```
api_calls | executions | avg_time
----------|------------|----------
1         | 180        | 1.8
2         | 35         | 2.5
3         | 12         | 3.2
4+        | 5          | 4.5
```

---

### Performance Trends Over Time

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_executions,
  AVG(execution_time_seconds) as avg_time,
  AVG(token_count_estimate) as avg_tokens,
  SUM(api_calls_count) as total_api_calls
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Output:**
```
date       | executions | avg_time | avg_tokens | api_calls
-----------|------------|----------|------------|----------
2025-11-06 | 45         | 2.1      | 1250       | 62
2025-11-05 | 52         | 2.3      | 1180       | 70
2025-11-04 | 38         | 2.0      | 1100       | 48
```

---

### Slowest Executions

```sql
SELECT
  correlation_id,
  primary_action,
  execution_time_seconds,
  api_calls_count,
  result_count,
  created_at
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY execution_time_seconds DESC
LIMIT 10;
```

---

### Token Usage by Action

```sql
SELECT
  primary_action,
  COUNT(*) as executions,
  AVG(token_count_estimate) as avg_tokens,
  SUM(token_count_estimate) as total_tokens
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY primary_action
ORDER BY total_tokens DESC;
```

**Use:** Identify token-heavy actions for optimization.

---

### Multi-Action Analysis

```sql
SELECT
  actions_executed,
  COUNT(*) as execution_count,
  AVG(execution_time_seconds) as avg_time,
  AVG(api_calls_count) as avg_api_calls
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY actions_executed
ORDER BY actions_executed;
```

**Output:**
```
actions | executions | avg_time | avg_api_calls
--------|------------|----------|---------------
1       | 200        | 1.8      | 1.0
2       | 30         | 2.8      | 2.0
3       | 8          | 4.2      | 3.0
```

---

## Visualization Dashboard

### Recommended Metrics to Display

**1. Overview Card**
- Total executions today
- Average execution time
- Total API calls
- Estimated tokens used

**2. Performance Chart**
- Line chart: Execution time over last 7 days
- Bar chart: Executions by action type

**3. Action Breakdown Table**
- Action name
- Count
- Avg time
- Avg tokens
- Success rate

**4. Alerts**
- Executions > 5 seconds
- API calls > 10 per execution
- Token usage > threshold

---

## Supabase Dashboard Setup

### Create View for Dashboard

```sql
CREATE VIEW performance_summary AS
SELECT
  primary_action,
  COUNT(*) as total_executions,
  AVG(execution_time_seconds)::NUMERIC(10,2) as avg_time_seconds,
  AVG(api_calls_count)::NUMERIC(10,2) as avg_api_calls,
  AVG(result_count)::NUMERIC(10,2) as avg_results,
  SUM(token_count_estimate) as total_tokens
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY primary_action;
```

### Grant Access

```sql
GRANT SELECT ON performance_summary TO authenticated;
GRANT SELECT ON performance_metrics TO authenticated;
```

---

## Monitoring & Alerts

### Slow Execution Alert

Create a Supabase Edge Function or scheduled query:

```sql
-- Find executions > 5 seconds in last hour
SELECT
  correlation_id,
  primary_action,
  execution_time_seconds,
  created_at
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND execution_time_seconds > 5
ORDER BY created_at DESC;
```

**Action:** Send Slack alert if count > threshold

---

### Token Usage Alert

```sql
-- Daily token usage exceeds budget
SELECT
  DATE(created_at) as date,
  SUM(token_count_estimate) as total_tokens
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY DATE(created_at)
HAVING SUM(token_count_estimate) > 100000; -- Your threshold
```

---

## Cost Estimation

### OpenAI Cost Calculation

**gpt-4o-mini pricing:**
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**Estimation (rough):**
```sql
SELECT
  SUM(token_count_estimate) / 1000000.0 * 0.375 as estimated_cost_usd
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Note:** This uses average of input/output rates. For accurate costs, track separately.

---

## Optimization

### Based on Metrics

**If avg execution time > 3s:**
- Review slow nodes
- Optimize data processing
- Consider caching

**If api_calls_count high:**
- Combine operations
- Implement batch APIs
- Add caching layer

**If token_count high:**
- Implement smart sampling
- Reduce result size
- Compress data

---

## Testing

### Test Metrics Capture

**Command in Slack:**
```
@Gorgias Terminal get ticket 12345
```

**Verify in Supabase:**
```sql
SELECT * FROM performance_metrics
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
```json
{
  "correlation_id": "1730923523-12345",
  "execution_time_ms": 1850,
  "execution_time_seconds": 1.85,
  "api_calls_count": 1,
  "actions_executed": 1,
  "primary_action": "get_ticket",
  "result_count": 1,
  "token_count_estimate": 450
}
```

---

## Troubleshooting

### Issue: Metrics Not Inserted

**Solutions:**
1. Check Supabase credential configured
2. Verify table exists
3. Check node connection (Calculate → Insert)
4. Review n8n execution logs

### Issue: Incorrect Execution Time

**Solutions:**
1. Verify start_timestamp captured in Parse Slack
2. Check Date.now() accuracy
3. Ensure metrics calculated before final reply

### Issue: API Calls Count Wrong

**Solutions:**
1. Verify "Fetch Loop Results" node name exact
2. Fall back to plan.length estimation
3. Add manual counting if needed

---

## Next Steps

After implementing performance metrics:

1. **Week 1:** Collect baseline data
2. **Week 2:** Create dashboard visualizations
3. **Week 3:** Set up alerts for anomalies
4. **Week 4:** Optimize based on data
5. **Ongoing:** Monthly performance reviews

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Status:** Ready for Implementation
