# Debugging Guide - Gorgias Terminal

## Quick Reference

| Symptom | Likely Cause | Check | Fix |
|---------|--------------|-------|-----|
| "Command not understood" | OpenAI function calling failed | Build OpenAI Request node | Improve function descriptions |
| "Search returns wrong results" | Filter logic error | Client-Side Filter node | Fix filter conditions |
| "Getting error in Slack" | API call failed | api_logs table | Check error_message column |
| "Slow response" | API latency or heavy processing | api_logs.duration_ms | Optimize or add caching |
| "Duplicate tickets" | Deduplication failed | Deduplicate Results node | Check ticket ID matching |

---

## Debugging Workflow

### Step 1: Get the correlation_id

**From Slack**: User can provide the thread timestamp or you can query:

```sql
SELECT 
    id,
    raw_text,
    action,
    created_at,
    thread_ts
FROM agent_sessions
WHERE user_id = 'U09BSMA8U75'
    AND created_at > NOW() - INTERVAL '3 hours'
ORDER BY created_at DESC;
```

**Generate correlation_id format**: `corr_TIMESTAMP_USER_RANDOM`

Example: `corr_2025-11-06T19-23-45-678Z_U09BSMA8U75_a3f2e1`

### Step 2: Trace the Execution

```sql
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
WHERE run_id = 'YOUR_CORRELATION_ID'
ORDER BY created_at;
```

**What to look for**:
- ❌ No records? → Issue in Parse Slack or OpenAI call
- ❌ `error_message` present? → API call failed
- ❌ Wrong `node_name`? → Routing issue in Router
- ✅ All steps present, no errors → Issue in response formatting

### Step 3: Examine Request/Response

```sql
SELECT 
    node_name,
    request_body,
    response_body,
    status_code
FROM api_logs 
WHERE run_id = 'YOUR_CORRELATION_ID' 
    AND node_name = 'search_tickets';
```

**What to look for**:
- Check if filters are correct in `request_body`
- Check if response has expected data
- Verify `status_code` (200 = success, 404 = not found, 500 = server error)

---

## Common Issues & Solutions

### Issue 1: "Command Not Understood"

**Symptoms**:
- User types command, AI doesn't detect correct action
- AI asks for clarification when it shouldn't
- Wrong function called

**Root Causes**:
1. Ambiguous function descriptions in `Build OpenAI Request`
2. Missing function for the user's intent
3. User phrasing doesn't match function description

**How to Debug**:

```sql
-- Check what function was called
SELECT 
    response_body->'choices'->0->'message'->'tool_calls'->0->'function'->>'name' as function_called,
    response_body->'choices'->0->'message'->'tool_calls'->0->'function'->>'arguments' as arguments
FROM api_logs
WHERE node_name = 'OpenAI Structured Output'
    AND run_id = 'YOUR_CORRELATION_ID';
```

**How to Fix**:
1. **Improve function descriptions** in `nodes/build-openai-request.js`:
   ```javascript
   description: "Search for tickets using text search and/or filters. Use when user wants to find tickets. Examples: 'show urgent tickets', 'find tickets from john@example.com'"
   ```

2. **Add new function** if needed:
   ```javascript
   {
     type: "function",
     function: {
       name: "bulk_close_tickets",
       description: "Close multiple tickets at once. Use when user says 'close tickets', 'bulk close', 'close all'",
       parameters: { /* ... */ }
     }
   }
   ```

3. **Test with variations**:
   ```
   @Gorgias Terminal show urgent tickets
   @Gorgias Terminal list urgent tickets
   @Gorgias Terminal display urgent tickets
   @Gorgias Terminal what are the urgent tickets
   ```

---

### Issue 2: "Search Returns Wrong Results"

**Symptoms**:
- User searches for "urgent tickets" but gets all tickets
- Filter by assignee returns wrong person
- Date range filter not working

**Root Causes**:
1. Client-side filter logic error
2. Filter parameter name mismatch
3. Case-sensitivity issues

**How to Debug**:

```sql
-- Check applied filters
SELECT 
    request_body->'_client_side_filters' as filters_requested,
    response_body->'meta'->'applied_filters' as filters_applied,
    response_body->'meta'->>'total_count' as result_count
FROM api_logs
WHERE node_name = 'Filter Results (Client-Side)'
    AND run_id = 'YOUR_CORRELATION_ID';
```

**How to Fix**:

Check `nodes/client-side-filter.js`:

```javascript
// FILTER: Priority
if (filters.priority) {
  tickets = tickets.filter(ticket =>
    ticket.priority?.toLowerCase() === filters.priority.toLowerCase()
  );
  console.log(`✅ Priority filter (${filters.priority}): ${tickets.length} results`);
}
```

**Common mistakes**:
- ❌ Forgot `.toLowerCase()` → case mismatch
- ❌ Using `===` instead of `.includes()` → partial match fails
- ❌ Not checking if field exists → crashes on null

**Correct patterns**:
```javascript
// Exact match (case-insensitive)
ticket.status?.toLowerCase() === filters.status.toLowerCase()

// Partial match (case-insensitive)
ticket.customer?.email?.toLowerCase().includes(filters.customer_email.toLowerCase())

// Array contains (tags)
ticket.tags?.some(tag => tag.name?.toLowerCase().includes(filters.tag.toLowerCase()))
```

---

### Issue 3: "Getting Errors in Slack"

**Symptoms**:
- Error message appears in Slack thread
- Workflow stops mid-execution
- User sees technical error details

**Root Causes**:
1. Gorgias API returned error (404, 401, 500)
2. Invalid ticket ID
3. Missing required parameter
4. Rate limiting

**How to Debug**:

```sql
-- Get error details
SELECT 
    node_name,
    method,
    url,
    status_code,
    error_message,
    request_body,
    response_body
FROM api_logs
WHERE error_message IS NOT NULL
    AND run_id = 'YOUR_CORRELATION_ID';
```

**How to Fix by Status Code**:

| Status Code | Meaning | Fix |
|-------------|---------|-----|
| 400 | Bad Request | Check request_body format, validate parameters |
| 401 | Unauthorized | Check Gorgias credentials in n8n |
| 403 | Forbidden | Check API permissions |
| 404 | Not Found | Ticket doesn't exist, validate ticket_id |
| 429 | Rate Limited | Add exponential backoff, reduce request rate |
| 500 | Server Error | Gorgias issue, retry or report to Gorgias |

**Example Fix - 404 Not Found**:

```javascript
// In normalize-step.js, validate ticket_id before API call
if (action === 'get_ticket' && !ticket_id) {
  return [{
    json: {
      action: 'ask_clarification',
      question: 'Which ticket ID would you like to view?'
    }
  }];
}
```

---

### Issue 4: "Slow Response Times"

**Symptoms**:
- User waits 10+ seconds for response
- Timeout errors
- Inconsistent response times

**Root Causes**:
1. Gorgias API slow
2. Fetching too many tickets
3. Complex calculations
4. Multiple sequential API calls

**How to Debug**:

```sql
-- Find slow nodes
SELECT 
    node_name,
    duration_ms,
    duration_ms / 1000.0 as seconds,
    url
FROM api_logs
WHERE run_id = 'YOUR_CORRELATION_ID'
ORDER BY duration_ms DESC;

-- Check total execution time
SELECT 
    run_id,
    MIN(created_at) as started,
    MAX(created_at) as finished,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as total_seconds
FROM api_logs
WHERE run_id = 'YOUR_CORRELATION_ID'
GROUP BY run_id;
```

**How to Fix**:

1. **Reduce data fetched**:
   ```javascript
   // Instead of:
   const limit = 1000;
   
   // Use:
   const limit = $json.limit || 50; // User can override
   ```

2. **Add pagination**:
   ```javascript
   // For large result sets, paginate
   if (tickets.length > 100) {
     return {
       tickets: tickets.slice(0, 100),
       has_more: true,
       next_cursor: tickets[100].id
     };
   }
   ```

3. **Cache frequent queries**:
   ```javascript
   // Cache list_tickets results for 5 minutes
   const cacheKey = `tickets_${status}_${priority}`;
   const cached = cache.get(cacheKey);
   if (cached && Date.now() - cached.timestamp < 300000) {
     return cached.data;
   }
   ```

4. **Parallel API calls** (if possible):
   ```javascript
   // Instead of sequential:
   const ticket1 = await getTicket(123);
   const ticket2 = await getTicket(456);
   
   // Use parallel:
   const [ticket1, ticket2] = await Promise.all([
     getTicket(123),
     getTicket(456)
   ]);
   ```

---

### Issue 5: "Duplicate Tickets in Results"

**Symptoms**:
- Same ticket appears multiple times
- List shows 50 tickets but only 30 unique
- Ticket count doesn't match display

**Root Causes**:
1. Multi-step workflow fetches same ticket twice
2. Deduplication logic failed
3. Different ticket IDs for same ticket (shouldn't happen)

**How to Debug**:

```sql
-- Check for duplicates
SELECT 
    ticket_id,
    COUNT(*) as occurrences,
    ARRAY_AGG(node_name) as from_nodes
FROM api_logs
WHERE run_id = 'YOUR_CORRELATION_ID'
    AND ticket_id IS NOT NULL
GROUP BY ticket_id
HAVING COUNT(*) > 1;
```

**How to Fix**:

Check `nodes/deduplicate-results.js`:

```javascript
const uniqueTickets = {};

results.forEach(result => {
  const ticketId = result.id || result.ticket?.id || result.data?.id;
  
  if (!ticketId) {
    // Preserve results without IDs
    uniqueTickets[`no_id_${Math.random()}`] = result;
    return;
  }
  
  if (!uniqueTickets[ticketId]) {
    uniqueTickets[ticketId] = result;
  } else {
    // Keep newer version
    const existingDate = new Date(uniqueTickets[ticketId].updated_at || 0);
    const newDate = new Date(result.updated_at || 0);
    
    if (newDate > existingDate) {
      uniqueTickets[ticketId] = result;
    }
  }
});

const deduped = Object.values(uniqueTickets);
```

---

### Issue 6: "Analytics Takes Too Long"

**Symptoms**:
- `analyze_insights` command times out
- Response takes 30+ seconds
- High Claude Sonnet costs

**Root Causes**:
1. Fetching too many tickets (1000+)
2. Claude Sonnet processing large payload
3. Complex semantic analysis

**How to Debug**:

```sql
-- Check analytics requests
SELECT 
    node_name,
    duration_ms / 1000.0 as seconds,
    (response_body->'body'->'data')::jsonb AS ticket_count
FROM api_logs
WHERE node_name IN ('Fetch Tickets for Analytics', 'Ticket Analytics Agent')
    AND run_id = 'YOUR_CORRELATION_ID';
```

**How to Fix**:

1. **Reduce ticket count**:
   ```javascript
   // In Fetch Tickets for Analytics
   const limit = $json.period === '7d' ? 300 : 1000;
   ```

2. **Summarize before sending to Claude**:
   ```javascript
   // Don't send full ticket bodies
   const summarized = tickets.map(t => ({
     id: t.id,
     subject: t.subject.substring(0, 100),
     status: t.status,
     tags: t.tags.map(tag => tag.name),
     created: t.created_datetime.split('T')[0]
   }));
   ```

3. **Cache analytics results**:
   ```javascript
   // Cache by period
   const cacheKey = `analytics_${period}`;
   // Check if cached result is < 1 hour old
   ```

---

## Testing Checklist

Before deploying changes:

### 1. Unit Test Individual Nodes

```javascript
// Test Parse Slack
const input = {
  event: {
    text: '<@U09ERK6M65C> show urgent tickets <mailto:test@example.com|test@example.com>'
  }
};
const result = parseSlack(input);
// Expect: user_text = "show urgent tickets test@example.com"
```

### 2. Integration Test End-to-End

Test in `#test_gorgias` channel:

```
@Gorgias Terminal list tickets
@Gorgias Terminal search urgent tickets
@Gorgias Terminal get ticket 123
@Gorgias Terminal assign ticket 123 to spencer@example.com
@Gorgias Terminal close ticket 123
@Gorgias Terminal analyze insights
```

### 3. Error Handling Test

```
@Gorgias Terminal get ticket 999999999  (non-existent)
@Gorgias Terminal assign ticket 123 to invalid_email
@Gorgias Terminal [gibberish command]
```

### 4. Performance Test

```sql
-- Check average response time
SELECT 
    action,
    COUNT(*) as requests,
    AVG(EXTRACT(EPOCH FROM (MAX(al.created_at) - MIN(al.created_at)))) as avg_seconds
FROM agent_sessions ags
JOIN api_logs al ON ags.thread_ts = al.thread_ts
WHERE ags.created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY avg_seconds DESC;
```

---

## Monitoring Dashboards

### Key Metrics to Track

1. **System Health**:
   - Total commands per day
   - Error rate (< 2% target)
   - Avg response time (< 5s target)
   - Uptime (> 99% target)

2. **User Adoption**:
   - Active users per day
   - Commands per user
   - Most used actions
   - New user onboarding

3. **Performance**:
   - P50, P90, P95 latency by action
   - Slow queries (> 5s)
   - Failed requests by node
   - API rate limit hits

4. **Business Impact**:
   - Tickets processed
   - Time saved vs. manual Gorgias
   - Agent productivity increase
   - Customer satisfaction (indirect)

### Alerting Rules

Set up alerts for:
- Error rate > 5% in last hour
- Avg response time > 10s
- No commands received in 6 hours (system down?)
- Analytics requests > 50 per day (cost concern)

---

## Performance Optimization Tips

### 1. Token Usage

```javascript
// ❌ Bad: Send full ticket to AI
const prompt = `Summarize this ticket: ${JSON.stringify(ticket)}`;

// ✅ Good: Pre-format in JavaScript
const summary = `Ticket #${ticket.id}: ${ticket.subject} (${ticket.status})`;
```

### 2. Database Queries

```sql
-- ❌ Bad: No index
SELECT * FROM api_logs WHERE run_id = 'corr_...';

-- ✅ Good: Indexed column
CREATE INDEX idx_logs_run_id ON api_logs(run_id);
```

### 3. API Calls

```javascript
// ❌ Bad: Fetch all, filter later
const all = await fetchTickets({ limit: 1000 });
const filtered = all.filter(t => t.status === 'open');

// ✅ Good: Filter at API level when possible
const filtered = await fetchTickets({ status: 'open', limit: 50 });
```

### 4. Caching

```javascript
// Cache frequently accessed data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}
```

---

## Getting Help

### 1. Check Logs First

```sql
-- Recent errors
SELECT * FROM api_logs 
WHERE error_message IS NOT NULL 
    AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 2. Review Documentation

- `ARCHITECTURE.md` - System design
- `NODE_REFERENCE.md` - Detailed node docs
- `queries.sql` - Common debugging queries

### 3. Enable Debug Logging

Add console.log statements:

```javascript
console.log('🔍 Debug: filters =', JSON.stringify(filters, null, 2));
console.log('📊 Debug: ticket count before filter =', tickets.length);
```

### 4. Ask Claude Code

Provide:
- correlation_id
- User's command
- Error message
- Relevant logs

---

## Common Error Messages & Meanings

| Error Message | Meaning | Fix |
|--------------|---------|-----|
| "Function call failed" | OpenAI couldn't parse request | Check Build OpenAI Request syntax |
| "No function called" | OpenAI didn't call any function | Improve function descriptions |
| "Network request failed" | Can't reach Gorgias API | Check credentials, internet |
| "Invalid ticket_id" | Ticket doesn't exist | Validate ID before API call |
| "Rate limit exceeded" | Too many requests | Add delays, implement backoff |
| "Parse error" | Can't parse JSON | Validate JSON structure |
| "Timeout" | Request took too long | Reduce payload, optimize query |

---

## End of Debugging Guide
