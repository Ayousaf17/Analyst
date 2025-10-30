# Fix: Response Data Not Showing in Summarize Results

## Problem
The "Summarize Results for AI" node is receiving:
```json
"response_data": {
  "object": "list",
  "uri": "/api/tickets"
}
```

Instead of the actual ticket data:
```json
"response_data": {
  "data": [
    {"id": 123, "subject": "Order issue", "status": "open", ...},
    {"id": 456, "subject": "Refund request", ...}
  ],
  "meta": {...}
}
```

## Root Cause
The HTTP Request nodes are configured with `fullResponse: true`, which causes n8n to return metadata instead of the actual API response body.

## Solution

### Option 1: Fix HTTP Request Nodes (RECOMMENDED)
Update ALL Gorgias HTTP Request nodes:

1. Open each HTTP Request node (list_tickets, get_ticket, etc.)
2. Go to the **Options** section
3. Set:
   - **Response Format:** `json`
   - **Full Response:** `false` ← IMPORTANT!
4. Save each node

This makes n8n return the Gorgias API response directly without wrapping.

### Option 2: Fix Format Log Node
If you can't change the HTTP nodes, update the **Format Log** node:

```javascript
// Format for api_logs + carry HTTP result
const httpResult = $json;
const normalizeData = $('Normalize Step').first().json;

// Extract the actual response data
let responseBody;

// Check if this is a wrapped response (fullResponse: true)
if (httpResult.body !== undefined) {
  responseBody = httpResult.body;
} else if (httpResult.json !== undefined) {
  responseBody = httpResult.json;
} else {
  // Direct response (fullResponse: false)
  responseBody = httpResult;
}

// Remove n8n metadata if present
if (responseBody.object && responseBody.uri && !responseBody.data) {
  console.error('WARNING: Got n8n metadata instead of API response!');
  console.error('Set HTTP Request node option: Full Response = false');
  // Try to access the actual data
  responseBody = httpResult.json || httpResult.body || httpResult;
}

const logEntry = {
  workflow_id: $workflow.id,
  node_name: normalizeData.action,
  duration_ms: 150,
  run_id: normalizeData.correlation_id,
  direction: 'request',
  method: httpResult.statusCode ? 'GET' : 'PUT',
  url: 'https://ironsidecomputers.gorgias.com/api/tickets/' + (normalizeData.ticket_id || ''),
  status_code: httpResult.statusCode || httpResult.status || 200,
  request_body: JSON.stringify(normalizeData),
  response_body: JSON.stringify(responseBody),
  error_message: null,
  actor_user: normalizeData.user_id,
  channel: normalizeData.slack_channel,
  thread_ts: normalizeData.slack_thread_ts,
  ticket_id: normalizeData.ticket_id,
  tags: [],
  extra: {
    step_number: normalizeData.step_number || normalizeData.step,
    action: normalizeData.action
  },
  http_result: httpResult
};

return [{json: logEntry}];
```

## Verification Steps

### 1. Test the HTTP Request Node
Add a temporary **Code** node right after one of your HTTP Request nodes:

```javascript
console.log('Raw HTTP Response:', JSON.stringify($json, null, 2));
return [$json];
```

Execute the workflow and check the output. You should see:
- ✅ GOOD: `{"data": [...], "meta": {...}}`
- ❌ BAD: `{"object": "list", "uri": "/api/tickets"}`

### 2. Check Supabase api_logs
After executing the workflow, query Supabase:

```sql
SELECT response_body
FROM api_logs
WHERE action = 'list_tickets'
ORDER BY created_at DESC
LIMIT 1;
```

The `response_body` should contain the full ticket array.

### 3. Test Summarize Results
The "Summarize Results for AI" node should now receive:

```json
{
  "results": [
    {
      "step": 1,
      "action": "list_tickets",
      "response_data": {
        "data": [
          {"id": 123, "subject": "Order issue", ...},
          {"id": 456, "subject": "Refund request", ...}
        ],
        "meta": {"total_count": 50}
      }
    }
  ]
}
```

## Why This Happens

n8n HTTP Request node has two modes:

### fullResponse: true
Returns:
```json
{
  "statusCode": 200,
  "statusMessage": "OK",
  "headers": {...},
  "body": {
    "object": "list",
    "uri": "/api/tickets"
  }
}
```

### fullResponse: false (DEFAULT)
Returns the API response directly:
```json
{
  "data": [
    {"id": 123, "subject": "...", ...},
    {"id": 456, "subject": "...", ...}
  ],
  "meta": {"total_count": 50}
}
```

## Recommended Fix: Use fullResponse: false

For your workflow, you want `fullResponse: false` (the default) because:
1. ✅ Returns actual API data directly
2. ✅ Simpler to work with
3. ✅ No need to access `.body` property
4. ✅ Works with the current Collect Results logic

## Next Steps
1. Update all 22 HTTP Request nodes to use `fullResponse: false`
2. Update Format Log node to handle both cases (for backward compatibility)
3. Test with `list_tickets` action
4. Verify Supabase logs contain full data
5. Confirm Summarize Results receives proper data
6. Test end-to-end Slack command

---

**Status:** Ready to implement
**Priority:** HIGH - This is blocking proper AI responses
**Estimated Time:** 10-15 minutes to update all HTTP nodes
