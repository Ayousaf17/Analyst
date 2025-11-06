# Performance Metrics - Start Time Fix

## Problem

The `Calculate_Performance_Metrics.js` node needs the start timestamp to calculate execution time, but currently the Parse Slack node doesn't capture it.

## Solution

Add start timestamp capture to the Parse Slack node.

## Implementation

### Update Parse Slack Node

Add these lines to the Parse Slack node code (after line that creates correlation_id):

```javascript
// Generate correlation_id
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const random = Math.random().toString(36).substr(2, 6);
const correlation_id = `corr_${timestamp}_${user_id}_${random}`;

// ✅ ADD THESE LINES:
const start_timestamp = Date.now();
const start_time_iso = new Date().toISOString();

return [{
  json: {
    user_text: cleaned || text || '',
    channel,
    thread_ts,
    user_id,
    correlation_id,
    start_timestamp: start_timestamp,      // ✅ ADD THIS
    start_time: start_time_iso,            // ✅ ADD THIS
    perf_metrics: {                        // ✅ ADD THIS
      start: start_timestamp
    }
  }
}];
```

## Testing

After adding the start timestamp, test with:

```bash
@Gorgias Terminal get ticket 12345
```

Then check the performance_metrics table in Supabase to verify execution time is calculated correctly.

## Expected Output

```sql
SELECT * FROM performance_metrics ORDER BY created_at DESC LIMIT 1;
```

Should show:
- execution_time_ms: ~2000-5000ms (2-5 seconds typical)
- execution_time_seconds: ~2.0-5.0s
- correlation_id: matches the session

## Next Steps

1. Update Parse Slack node code
2. Test execution time calculation
3. Verify metrics in Supabase
4. Create dashboard for visualization
