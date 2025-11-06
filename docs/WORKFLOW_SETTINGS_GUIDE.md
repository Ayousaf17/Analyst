# Workflow Settings Configuration Guide

## Overview

This guide explains how to configure workflow-level settings for production resilience, retry logic, and optimal performance of the Gorgias Slack Terminal.

---

## Recommended Settings

### Complete Configuration

```json
{
  "settings": {
    "executionTimeout": 3600,
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "retryOnFail": true,
    "retryCount": 3,
    "retryDelay": 1000,
    "timezone": "UTC",
    "callerPolicy": "workflowsFromSameOwner"
  }
}
```

---

## Implementation Methods

### Method 1: Using n8n UI (Recommended)

1. Open your workflow in n8n
2. Click the **⚙️ gear icon** in the top right (Workflow Settings)
3. Configure each setting as shown below
4. Click **Save**

#### Execution Settings

**Execution Timeout:**
- **Value:** `3600` (seconds = 1 hour)
- **Why:** Complex multi-step operations may take several minutes
- **Location:** Settings → Execution → Execution Timeout

**Save Manual Executions:**
- **Value:** `✅ Enabled`
- **Why:** Preserves test executions for debugging
- **Location:** Settings → Execution → Save Manual Executions

**Save Execution Progress:**
- **Value:** `✅ Enabled`
- **Why:** Allows seeing which node caused failure
- **Location:** Settings → Execution → Save Execution Progress

#### Error Handling Settings

**Retry on Fail:**
- **Value:** `✅ Enabled`
- **Why:** Automatically retries transient errors (network issues, rate limits)
- **Location:** Settings → Error Handling → Retry on Fail

**Retry Count:**
- **Value:** `3`
- **Why:** Balance between resilience and response time
- **Location:** Settings → Error Handling → Retry Count

**Retry Delay:**
- **Value:** `1000` (milliseconds = 1 second)
- **Why:** Gives APIs time to recover between retries
- **Location:** Settings → Error Handling → Retry Delay

#### General Settings

**Timezone:**
- **Value:** `UTC`
- **Why:** Consistent timestamps across all logs
- **Location:** Settings → General → Timezone

**Caller Policy:**
- **Value:** `Workflows from same owner`
- **Why:** Security - only your workflows can call this workflow
- **Location:** Settings → General → Caller Policy

---

### Method 2: Direct JSON Edit

If you prefer to edit the workflow JSON directly:

1. Export your workflow as JSON
2. Add/update the `settings` section at the root level
3. Import the updated JSON back into n8n

**Location in JSON:**
```json
{
  "name": "Gorgias Intelligent v23",
  "nodes": [...],
  "connections": {...},
  "settings": {
    "executionTimeout": 3600,
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "retryOnFail": true,
    "retryCount": 3,
    "retryDelay": 1000,
    "timezone": "UTC",
    "callerPolicy": "workflowsFromSameOwner"
  }
}
```

---

## Setting Details

### Execution Timeout

**What it does:** Maximum time (in seconds) a workflow execution can run before being terminated.

**Recommended value:** `3600` (1 hour)

**Why this value:**
- Typical execution: 2-5 seconds
- Complex multi-step: 10-30 seconds
- 1 hour provides ample buffer for edge cases
- Prevents infinite loops or hung workflows

**When to adjust:**
- **Increase:** If legitimate executions are timing out
- **Decrease:** For simple workflows that should complete quickly

**Environment variable approach:**
```json
{
  "executionTimeout": "={{ parseInt($env.EXECUTION_TIMEOUT) }}"
}
```

---

### Save Manual Executions

**What it does:** Stores execution data when workflow is triggered manually (vs webhook).

**Recommended value:** `true`

**Why enable:**
- ✅ Debug test commands
- ✅ Review execution flow
- ✅ Analyze performance
- ✅ Troubleshoot issues

**Storage impact:**
- ~1-5MB per execution
- Managed by n8n's execution data pruning

---

### Save Execution Progress

**What it does:** Records the state after each node execution.

**Recommended value:** `true`

**Why enable:**
- ✅ See exactly which node failed
- ✅ View intermediate data transformations
- ✅ Debug data flow issues
- ✅ Understand execution path

**Performance impact:**
- Minimal (<100ms per workflow)
- Slight increase in database writes

---

### Retry on Fail

**What it does:** Automatically retries the workflow if any node fails.

**Recommended value:** `true`

**Why enable:**
- ✅ Handles transient network errors
- ✅ Overcomes temporary API unavailability
- ✅ Improves reliability
- ✅ Reduces manual intervention

**When NOT to enable:**
- Workflow has destructive operations (creates/deletes resources)
- Operations are not idempotent

**For Gorgias Terminal:**
- ✅ Safe: Most operations are reads (get_ticket, list_tickets, search_tickets)
- ⚠️ Caution: Create, delete, or update operations may execute multiple times

---

### Retry Count

**What it does:** Number of times to retry after initial failure.

**Recommended value:** `3`

**Why this value:**
- 1 retry: Often insufficient for network issues
- 3 retries: 93.75% success rate for 50% transient failure rate
- 5+ retries: Diminishing returns, delays response too much

**Retry attempt timeline:**
```
Attempt 1: 0s (initial)
Attempt 2: 1s (after 1s delay)
Attempt 3: 2s (after 1s delay)
Attempt 4: 3s (after 1s delay)
Total time: 3 seconds for 3 retries
```

**When to adjust:**
- **Increase:** If transient errors are common
- **Decrease:** For time-sensitive operations

---

### Retry Delay

**What it does:** Time to wait (in milliseconds) before retrying.

**Recommended value:** `1000` (1 second)

**Why this value:**
- Too short (<500ms): API may not have recovered
- Too long (>2s): User waits too long for response
- 1 second: Good balance

**Exponential backoff alternative:**
```
Retry 1: 1s
Retry 2: 2s
Retry 3: 4s
```

Not currently supported in n8n workflow-level settings, but can be implemented per-node.

---

### Timezone

**What it does:** Timezone for workflow execution and scheduling.

**Recommended value:** `UTC`

**Why UTC:**
- ✅ Consistent with Supabase timestamps
- ✅ No daylight saving time issues
- ✅ Industry standard
- ✅ Easier log correlation

**When to use local timezone:**
- Scheduled workflows need to run at local business hours
- Reports need to show local timestamps

**For Gorgias Terminal:**
- Use UTC for all timestamps
- Convert to local time in UI/reports if needed

---

### Caller Policy

**What it does:** Controls which workflows can call this workflow as a sub-workflow.

**Recommended value:** `workflowsFromSameOwner`

**Options:**
- **any:** Any workflow can call this one (⚠️ least secure)
- **workflowsFromSameOwner:** Only workflows owned by same user (✅ recommended)
- **workflowsFromAList:** Only specific workflows can call (most secure)
- **none:** Cannot be called as sub-workflow

**Why "workflowsFromSameOwner":**
- ✅ Prevents unauthorized workflow calls
- ✅ Allows legitimate sub-workflow usage
- ✅ Maintains security in multi-user n8n instances

---

## Environment-Specific Configurations

### Development

```json
{
  "settings": {
    "executionTimeout": 1800,
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "retryOnFail": false,
    "retryCount": 0,
    "retryDelay": 1000,
    "timezone": "UTC",
    "callerPolicy": "workflowsFromSameOwner"
  }
}
```

**Why these settings:**
- Shorter timeout (30min) for faster feedback
- Retry disabled for faster debugging
- Progress saved for detailed analysis

---

### Staging

```json
{
  "settings": {
    "executionTimeout": 3600,
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "retryOnFail": true,
    "retryCount": 2,
    "retryDelay": 1000,
    "timezone": "UTC",
    "callerPolicy": "workflowsFromSameOwner"
  }
}
```

**Why these settings:**
- Full timeout for realistic testing
- Fewer retries (2) for faster feedback
- All executions saved for analysis

---

### Production

```json
{
  "settings": {
    "executionTimeout": 3600,
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "retryOnFail": true,
    "retryCount": 3,
    "retryDelay": 1000,
    "timezone": "UTC",
    "callerPolicy": "workflowsFromSameOwner"
  }
}
```

**Why these settings:**
- Maximum resilience with 3 retries
- All executions saved for monitoring
- Full timeout for complex operations

---

## Testing Settings

### Test 1: Verify Execution Timeout

**Steps:**
1. Add a temporary "Wait" node with 30 second delay
2. Set execution timeout to 10 seconds
3. Run workflow
4. Verify it times out after 10 seconds

**Expected:**
- Workflow stops after 10 seconds
- Error: "Workflow execution timed out"

### Test 2: Verify Retry Logic

**Steps:**
1. Temporarily break a Gorgias API credential
2. Enable retry on fail with 2 retries
3. Trigger any action
4. Watch execution logs

**Expected:**
- Initial request fails
- Retry 1 after 1 second (fails)
- Retry 2 after 1 second (fails)
- Total: 3 attempts

### Test 3: Verify Save Execution Progress

**Steps:**
1. Enable save execution progress
2. Run any workflow
3. Click on execution in history
4. Verify each node shows input/output data

**Expected:**
- See data for every node
- Can click each node to see details

---

## Monitoring & Optimization

### Metrics to Track

**Execution Time:**
```sql
SELECT
  AVG(execution_time) as avg_time,
  MAX(execution_time) as max_time
FROM workflow_executions
WHERE workflow_id = 'gorgias-terminal'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Retry Rate:**
```sql
SELECT
  COUNT(*) FILTER (WHERE retry_count > 0) / COUNT(*) * 100 as retry_percentage
FROM workflow_executions
WHERE workflow_id = 'gorgias-terminal'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Timeout Rate:**
```sql
SELECT
  COUNT(*) FILTER (WHERE error_type = 'Timeout') / COUNT(*) * 100 as timeout_percentage
FROM workflow_executions
WHERE workflow_id = 'gorgias-terminal'
  AND created_at > NOW() - INTERVAL '7 days';
```

### Optimization Based on Metrics

**If retry rate > 10%:**
- Investigate API reliability
- Consider increasing retry delay
- Check network connectivity

**If timeout rate > 1%:**
- Review execution times per node
- Optimize slow nodes
- Consider increasing timeout

**If execution time increasing:**
- Check for data growth
- Review API response times
- Optimize data processing nodes

---

## Troubleshooting

### Issue: Workflow Times Out

**Symptoms:**
- Execution stops mid-workflow
- Error: "Workflow execution timed out"

**Solutions:**
1. Check executionTimeout setting
2. Review execution logs to find slow node
3. Optimize or split slow operations
4. Increase timeout if operations are legitimate

### Issue: Retries Not Working

**Symptoms:**
- Workflow fails immediately on error
- No retry attempts in logs

**Solutions:**
1. Verify retryOnFail is enabled
2. Check retryCount > 0
3. Ensure node error is retryable (network error, not validation error)
4. Some errors are not retryable by design

### Issue: Executions Not Saved

**Symptoms:**
- Cannot see execution history
- No data in execution logs

**Solutions:**
1. Verify saveManualExecutions is enabled
2. Check n8n database connectivity
3. Review n8n storage configuration
4. Check disk space on n8n host

### Issue: Too Many Retries

**Symptoms:**
- Workflows take very long to fail
- Multiple duplicate API calls

**Solutions:**
1. Reduce retryCount
2. Reduce retryDelay
3. Add node-level error handling
4. Skip retries for certain error types

---

## Best Practices

### Do's ✅

- ✅ Enable retry for production workflows
- ✅ Save execution progress for debugging
- ✅ Use UTC timezone consistently
- ✅ Set appropriate timeout (not too short, not too long)
- ✅ Test retry logic before production
- ✅ Monitor retry and timeout rates
- ✅ Document any custom settings

### Don'ts ❌

- ❌ Don't disable execution progress in production
- ❌ Don't set timeout too short (<5 minutes)
- ❌ Don't set retry count too high (>5)
- ❌ Don't mix timezones across workflows
- ❌ Don't retry non-idempotent operations without checking
- ❌ Don't ignore high retry rates

---

## Integration with Other Tasks

### With Environment Variables (Task 1.2)

Use environment variables in settings:

```json
{
  "settings": {
    "executionTimeout": "={{ parseInt($env.EXECUTION_TIMEOUT) }}",
    "retryCount": "={{ parseInt($env.RETRY_COUNT) }}",
    "retryDelay": "={{ parseInt($env.RETRY_DELAY) }}"
  }
}
```

Add to `.env`:
```env
EXECUTION_TIMEOUT=3600
RETRY_COUNT=3
RETRY_DELAY=1000
```

### With Error Handler (Task 1.3)

Settings + Error Handler = Complete error resilience:
- Retry handles transient errors
- Error Handler captures permanent errors
- User gets clear feedback either way

---

## Deployment Checklist

### Pre-Deployment
- [ ] Review all settings
- [ ] Set appropriate timeout
- [ ] Enable retry logic
- [ ] Configure timezone to UTC
- [ ] Set caller policy
- [ ] Test in staging

### Post-Deployment
- [ ] Monitor execution times
- [ ] Track retry rates
- [ ] Check for timeouts
- [ ] Verify executions being saved
- [ ] Adjust settings if needed
- [ ] Document any changes

---

## Next Steps

After configuring workflow settings:

1. **Test:** Run integration tests to verify settings
2. **Update README:** Document settings in main README
3. **Monitor:** Track metrics for first week
4. **Optimize:** Adjust based on real usage
5. **Move to P2:** Begin Priority 2 tasks (emojis, deduplication, health check)

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Status:** Ready for Implementation
