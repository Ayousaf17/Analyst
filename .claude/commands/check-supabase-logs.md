# Check Supabase Logs

Query and analyze logs from Supabase for debugging and monitoring.

## Task

I'll help query and analyze Supabase logs for $ARGUMENTS

## Available Tables

Based on the Analyst project:
- `agent_sessions` - Slack command sessions
- `api_logs` - Individual API call logs

## Common Queries

### Recent Errors
```sql
SELECT * FROM api_logs
WHERE status >= 400
ORDER BY created_at DESC
LIMIT 20;
```

### Session Trace
```sql
SELECT * FROM api_logs
WHERE correlation_id = 'YOUR_CORRELATION_ID'
ORDER BY created_at;
```

### Slow Requests
```sql
SELECT * FROM api_logs
WHERE response_time_ms > 3000
ORDER BY created_at DESC
LIMIT 10;
```

### Action Distribution
```sql
SELECT action_type, COUNT(*) as count
FROM agent_sessions
GROUP BY action_type
ORDER BY count DESC;
```

## Analysis

I'll help you:
1. Identify patterns in errors
2. Trace full execution paths via correlation_id
3. Calculate success rates and response times
4. Spot performance bottlenecks
5. Generate monitoring recommendations

## Output

Provide analysis summary with:
- Key findings
- Recommended fixes
- Monitoring suggestions
