# Error Handling Implementation Guide

## Overview

This guide explains how to implement centralized error handling in the Gorgias Slack Terminal workflow. The error handling system captures errors from any node, logs them appropriately, and sends user-friendly notifications to Slack.

---

## Architecture

```
Any Node Error
  ↓
Error Handler Node (Code)
  ↓
Format Error for Slack (Code)
  ↓
Send Error to Slack (Slack API)
  ↓
User receives friendly error message in thread
```

---

## Implementation Steps

### Step 1: Add Error Handler Node

**File:** `workflows/Error_Handler_Node.json`

1. Open your main workflow in n8n
2. Add a new **Code** node
3. Name it: "Error Handler - Gorgias Terminal"
4. Position: Bottom-center of workflow (suggested coordinates: 1000, 1000)
5. Copy the code from `workflows/Error_Handler_Node.json`
6. Save the node

**What This Node Does:**
- Captures error information from failed nodes
- Extracts correlation_id and user_id from Parse Slack node
- Formats error data for downstream processing
- Logs errors to n8n console for debugging

---

### Step 2: Add Format Error for Slack Node

**File:** `workflows/Format_Error_For_Slack.js`

1. Add a new **Code** node after Error Handler
2. Name it: "Format Error for Slack"
3. Position: To the right of Error Handler (suggested: 1200, 1000)
4. Copy the code from `workflows/Format_Error_For_Slack.js`
5. Save the node
6. Connect: Error Handler → Format Error for Slack

**What This Node Does:**
- Converts technical errors to user-friendly messages
- Maps error types to emojis and descriptions
- Preserves Slack thread context
- Includes correlation ID for support tracking

---

### Step 3: Add Send Error to Slack Node

**File:** `workflows/Send_Error_To_Slack_Node.json`

1. Add a new **Slack** node
2. Name it: "Send Error to Slack"
3. Position: To the right of Format Error (suggested: 1400, 1000)
4. Configure:
   - Resource: **Message**
   - Operation: **Post**
   - Channel: `={{ $json.channel }}`
   - Text: `={{ $json.text }}`
   - Other Options → Thread TS: `={{ $json.thread_ts }}`
5. Select your Slack credential
6. Save the node
7. Connect: Format Error for Slack → Send Error to Slack

---

### Step 4: Connect Error Outputs to Error Handler

Now connect the error output of critical nodes to the Error Handler node.

#### A. OpenAI Nodes (2 nodes)

**Nodes:**
1. OpenAI Structured Output (HTTP Request)
2. Conversational Response AI (HTTP Request)

**Steps for Each:**
1. Right-click the node
2. Click "Add connection"
3. Select "On Error" output
4. Connect to "Error Handler - Gorgias Terminal" node
5. Save workflow

#### B. Gorgias API Nodes (16 nodes)

**Nodes:**
1. list_tickets
2. search_tickets
3. get_ticket
4. create_ticket
5. assign_ticket
6. close_ticket
7. set_priority
8. set_status
9. add_tags
10. remove_tags
11. reply_public
12. comment_internal
13. list_customers
14. get_customer
15. find_user
16. list_metrics

**Steps for Each:**
1. Right-click the node
2. Click "Add connection"
3. Select "On Error" output
4. Connect to "Error Handler - Gorgias Terminal" node
5. Save workflow

#### C. Supabase Nodes (2-4 nodes)

**Nodes:**
- Insert Session
- Insert api_logs
- Any other Supabase operations

**Steps for Each:**
1. Right-click the node
2. Click "Add connection"
3. Select "On Error" output
4. Connect to "Error Handler - Gorgias Terminal" node
5. Save workflow

#### D. Final Slack Reply Node

**Node:** Final Slack Reply

**Steps:**
1. Right-click the node
2. Click "Add connection"
3. Select "On Error" output
4. Connect to "Error Handler - Gorgias Terminal" node
5. Save workflow

---

## Error Message Format

### User-Facing Message (Slack)

```
❌ *Error Processing Your Request*

🌐 Network error while communicating with the API

*Action:* get_ticket
*Error:* HTTP 404: Ticket not found
*Status Code:* 404
*Failed at:* Get Ticket Details

*When:* 11/6/2025, 3:45:23 PM

_If this persists, please contact support with this ID:_
`1730923523-12345`
```

### Error Types and Messages

| Error Type | Emoji | User Message |
|------------|-------|--------------|
| HTTPError | 🌐 | Network error while communicating with the API |
| ValidationError | ⚠️ | Invalid data provided |
| AuthenticationError | 🔒 | Authentication failed |
| NotFoundError | 🔍 | Resource not found |
| RateLimitError | ⏱️ | Rate limit exceeded, please try again shortly |
| UnknownError | ❓ | An unexpected error occurred |

---

## Testing Error Handling

### Test 1: Invalid Ticket ID

**Command in Slack:**
```
@Gorgias Terminal get ticket 99999999
```

**Expected Result:**
- Error Handler captures the 404 error
- User receives formatted error message in Slack thread
- Error includes correlation ID
- Error is logged in n8n execution logs

### Test 2: API Timeout

**Steps:**
1. Temporarily set a very low timeout on a Gorgias HTTP node (e.g., 1ms)
2. Trigger any action
3. Verify error handling flow

**Expected Result:**
- Timeout error captured by Error Handler
- User receives "Network error" message
- Correlation ID included

### Test 3: Authentication Failure

**Steps:**
1. Temporarily invalidate Gorgias API credential
2. Trigger any action
3. Restore valid credential after test

**Expected Result:**
- Authentication error captured
- User receives "Authentication failed" message
- Error logged with full details

### Test 4: OpenAI Rate Limit

**Steps:**
1. Trigger multiple commands rapidly
2. If rate limit hit, verify error handling

**Expected Result:**
- Rate limit error captured
- User receives "Rate limit exceeded" message
- Includes "try again shortly" guidance

---

## Monitoring & Logging

### n8n Execution Logs

All errors are logged to n8n execution logs with this format:

```javascript
console.error('❌ Gorgias Terminal Error:', {
  correlation_id: 'xxx',
  node: 'Get Ticket Details',
  action: 'get_ticket',
  error: 'HTTP 404: Not found'
});
```

### Viewing Logs

1. Open n8n UI
2. Go to **Executions** tab
3. Filter by **Error** status
4. Click on execution to see detailed logs
5. Search for `❌ Gorgias Terminal Error:` in logs

### Supabase Error Logging (Optional Enhancement)

Consider adding a Supabase error logging node after Error Handler:

**Table Schema:**
```sql
CREATE TABLE error_logs (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  user_id TEXT,
  node TEXT,
  action TEXT,
  error_message TEXT,
  error_type TEXT,
  http_status INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_error_logs_correlation ON error_logs(correlation_id);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
```

---

## Error Handler Node Details

### Input

The Error Handler node receives error data from failed nodes. The structure varies by node type:

**HTTP Request Errors:**
```json
{
  "error": {
    "message": "HTTP 404: Not found",
    "code": "ENOTFOUND",
    "type": "HTTPError"
  },
  "httpCode": 404,
  "node": "Get Ticket Details",
  "action": "get_ticket"
}
```

**Code Node Errors:**
```json
{
  "message": "ReferenceError: variable is not defined",
  "stack": "...",
  "node": "Format Results"
}
```

### Output

The Error Handler node outputs standardized error objects:

```json
{
  "correlation_id": "1730923523-12345",
  "user_id": "U12345678",
  "timestamp": "2025-11-06T15:45:23.000Z",
  "node": "Get Ticket Details",
  "action": "get_ticket",
  "error_message": "HTTP 404: Not found",
  "error_code": "ENOTFOUND",
  "error_type": "HTTPError",
  "http_status": 404,
  "request_data": {...},
  "response_data": {...},
  "stack_trace": null
}
```

---

## Troubleshooting

### Issue: Error Handler Not Triggered

**Symptoms:**
- Workflow fails but error handler doesn't execute
- No error message sent to Slack

**Solutions:**
1. Verify error output is connected from failed node to Error Handler
2. Check node settings → Error Handling → "Continue On Fail" should be OFF
3. Ensure Error Handler node is active (not disabled)
4. Check n8n execution logs for error details

### Issue: Correlation ID Missing

**Symptoms:**
- Error message shows `unknown` for correlation ID

**Solutions:**
1. Verify Parse Slack node is named exactly "Parse Slack"
2. Check Parse Slack node sets `correlation_id` field
3. Verify Error Handler can access `$('Parse Slack').first().json`

### Issue: Slack Message Not Sent

**Symptoms:**
- Error Handler and Format Error execute successfully
- No message appears in Slack

**Solutions:**
1. Verify Slack credential is configured and valid
2. Check Slack bot has permission to post messages
3. Verify channel exists and bot is member
4. Check thread_ts is valid
5. Test Send Error to Slack node independently

### Issue: Generic Error Messages

**Symptoms:**
- All errors show "Unknown error occurred"

**Solutions:**
1. Check Error Handler is extracting error details correctly
2. Verify error object structure matches expected format
3. Add console.log to Error Handler to debug error structure
4. Update Format Error for Slack to handle additional error types

---

## Best Practices

### Do's ✅

- ✅ Connect all critical nodes to Error Handler
- ✅ Include correlation ID in all error messages
- ✅ Keep error messages user-friendly
- ✅ Log detailed error info to n8n logs
- ✅ Test error handling for each action type
- ✅ Monitor error logs regularly
- ✅ Update error type mappings as needed

### Don'ts ❌

- ❌ Don't expose sensitive data in Slack error messages
- ❌ Don't show stack traces to users
- ❌ Don't ignore authentication errors
- ❌ Don't let errors fail silently
- ❌ Don't use generic "Something went wrong" messages

---

## Connection Checklist

Use this checklist to ensure all nodes are connected to error handler:

### OpenAI Nodes
- [ ] OpenAI Structured Output → Error Handler
- [ ] Conversational Response AI → Error Handler

### Gorgias API Nodes
- [ ] list_tickets → Error Handler
- [ ] search_tickets → Error Handler
- [ ] get_ticket → Error Handler
- [ ] create_ticket → Error Handler
- [ ] assign_ticket → Error Handler
- [ ] close_ticket → Error Handler
- [ ] set_priority → Error Handler
- [ ] set_status → Error Handler
- [ ] add_tags → Error Handler
- [ ] remove_tags → Error Handler
- [ ] reply_public → Error Handler
- [ ] comment_internal → Error Handler
- [ ] list_customers → Error Handler
- [ ] get_customer → Error Handler
- [ ] find_user → Error Handler
- [ ] list_metrics → Error Handler

### Supabase Nodes
- [ ] Insert Session → Error Handler
- [ ] Insert api_logs → Error Handler

### Slack Nodes
- [ ] Final Slack Reply → Error Handler

### Error Flow Nodes
- [ ] Error Handler → Format Error for Slack
- [ ] Format Error for Slack → Send Error to Slack

---

## Performance Considerations

### Error Handler Efficiency

- **Execution Time:** <50ms (JavaScript parsing)
- **Memory Usage:** Minimal (processes one error at a time)
- **Network Calls:** 0 (pure JavaScript)

### Format Error for Slack Efficiency

- **Execution Time:** <50ms (string formatting)
- **Memory Usage:** Minimal
- **Network Calls:** 0 (pure JavaScript)

### Send Error to Slack Efficiency

- **Execution Time:** ~200-500ms (Slack API call)
- **Rate Limits:** Slack Web API: 1+ request/second
- **Retry Logic:** Built into Slack node

---

## Integration with Observability

### Correlation ID Flow

```
User Command in Slack
  ↓
Parse Slack (generates correlation_id)
  ↓
[Normal execution OR error]
  ↓
Error Handler (preserves correlation_id)
  ↓
Slack Error Message (includes correlation_id)
```

### Tracking Errors in Supabase

Link errors to session logs using correlation_id:

```sql
-- Find all logs for an errored session
SELECT
  s.*,
  e.*
FROM agent_sessions s
LEFT JOIN error_logs e ON s.correlation_id = e.correlation_id
WHERE s.correlation_id = '1730923523-12345';
```

---

## Future Enhancements

### Phase 2 Improvements

1. **Error Analytics Dashboard**
   - Track error frequency by type
   - Identify problematic actions
   - Monitor error trends

2. **Smart Error Recovery**
   - Auto-retry transient errors
   - Suggest alternative actions
   - Cache successful responses

3. **Error Categorization**
   - User errors (invalid input)
   - System errors (API down)
   - Configuration errors (wrong credentials)

4. **Escalation Workflows**
   - Auto-create support tickets for repeated errors
   - Alert team for critical errors
   - Send daily error summary

---

## Next Steps

After implementing error handling:

1. **Task 1.5:** Update workflow settings (timeout, retry logic)
2. **Test:** Trigger errors for each action type
3. **Verify:** Check Slack messages and n8n logs
4. **Document:** Add error scenarios to UAT checklist
5. **Monitor:** Track error frequency for first week

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Status:** Ready for Implementation
