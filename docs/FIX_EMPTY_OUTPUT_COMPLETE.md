# Complete Fix: Planning AI Empty Output Issue

**Root Cause Confirmed:**
```json
Input: { "output": {} }
OpenAI finish_reason: "tool_calls"
Text: ""
```

The OpenAI model is making **tool_calls** but the Structured Output Parser returns empty `{ "output": {} }` because it can't parse them.

---

## Two Fix Options

### Option A: Smart Fallback Parser (QUICK FIX - Use This First)
Update Handle Plan Response to:
1. Try extracting from tool_calls if present
2. Fall back to text pattern matching if parser fails
3. Works immediately without changing Planning AI node

### Option B: Fix Structured Output Configuration (PROPER FIX)
Reconfigure Planning AI Agent to use proper Structured Outputs
- More reliable long-term
- Requires updating Planning AI node configuration

**Recommendation: Start with Option A (quick fix), then implement Option B for long-term stability.**

---

## ✅ Option A: Smart Fallback Parser (IMMEDIATE FIX)

### Step 1: Deploy Updated Handle Plan Response

**Replace your Handle Plan Response node code with:**

📄 **File: `node_code/HANDLE_PLAN_RESPONSE_TOOL_CALLS.js`**

**What this does:**
- ✅ Extracts action from tool_calls format (if present)
- ✅ Falls back to smart text inference if parser fails
- ✅ Handles all action types: get_ticket, list_tickets, search_tickets, analyze_tickets
- ✅ Works immediately without changing other nodes

### Step 2: Test

Run these commands:
```
@Gorgias Terminal get ticket 234525253
@Gorgias Terminal show open tickets
@Gorgias Terminal analyze last 30 days
@Gorgias Terminal search tickets about shipping
```

### Expected Results After Fix:

**Command:** `show open tickets`
```json
{
  "action": "list_tickets",
  "parameters": {
    "status": "open",
    "limit": 10
  },
  "reasoning": "Inferred from user text pattern"
}
```

**Command:** `analyze last 30 days`
```json
{
  "action": "analyze_tickets",
  "parameters": {
    "since": "30 days ago",
    "limit": 100
  },
  "reasoning": "Inferred from user text pattern"
}
```

**Command:** `search tickets about shipping`
```json
{
  "action": "search_tickets",
  "parameters": {
    "query": "shipping",
    "limit": 10
  },
  "reasoning": "Inferred from user text pattern"
}
```

---

## 🔧 Option B: Fix Structured Output Configuration (PROPER LONG-TERM FIX)

### Issue: Parser Schema Mismatch

The Structured Output Parser is likely:
1. Missing action types in the schema (only has get_ticket)
2. Configured incorrectly for OpenAI's structured outputs
3. Using wrong response format

### Step 1: Update Planning AI Agent Node

Open **Planning AI Agent** node and find the **Structured Output Parser** configuration.

### Step 2: Update Schema

**Replace the existing schema with this complete version:**

```json
{
  "name": "gorgias_action",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "get_ticket",
          "list_tickets",
          "search_tickets",
          "analyze_tickets",
          "get_insights",
          "get_customer",
          "list_customers",
          "conversational",
          "unknown"
        ],
        "description": "The Gorgias action to perform based on user request"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "ticket_id": {
            "type": ["string", "null"],
            "description": "Ticket ID for get_ticket action (e.g., '234525253')"
          },
          "status": {
            "type": ["string", "null"],
            "enum": ["open", "closed", "spam", "pending", null],
            "description": "Filter tickets by status"
          },
          "since": {
            "type": ["string", "null"],
            "description": "Start date/time for filtering. Examples: '30 days ago', '2025-01-01', 'today'"
          },
          "until": {
            "type": ["string", "null"],
            "description": "End date/time for filtering"
          },
          "query": {
            "type": ["string", "null"],
            "description": "Search query text for search_tickets action"
          },
          "assignee": {
            "type": ["string", "null"],
            "description": "Filter by assignee email"
          },
          "customer_email": {
            "type": ["string", "null"],
            "description": "Filter by customer email or ID"
          },
          "limit": {
            "type": ["integer", "null"],
            "description": "Maximum number of results to return",
            "default": 10,
            "minimum": 1,
            "maximum": 100
          },
          "tags": {
            "type": ["array", "null"],
            "items": {
              "type": "string"
            },
            "description": "Filter by ticket tags"
          },
          "priority": {
            "type": ["string", "null"],
            "enum": ["low", "normal", "high", "urgent", null],
            "description": "Filter by ticket priority"
          }
        },
        "additionalProperties": false,
        "required": []
      },
      "reasoning": {
        "type": "string",
        "description": "Brief explanation (1-2 sentences) of why this action was chosen based on user intent"
      }
    },
    "required": ["action", "parameters", "reasoning"],
    "additionalProperties": false
  }
}
```

### Step 3: Verify OpenAI Chat Model Settings

In the **Planning AI Agent** node, check the **OpenAI Chat Model** configuration:

**Required Settings:**
- ✅ Model: `gpt-4o-2024-08-06` (or `gpt-4o`)
- ✅ Response Format: **Structured Outputs** (NOT function calling)
- ✅ Schema: Should reference the schema above

**If using n8n OpenAI node:**
1. Open OpenAI Chat Model sub-node
2. Look for "Response Format" or "Structured Output" option
3. Select "JSON Schema" or "Structured Output"
4. Paste the schema above

### Step 4: Update System Prompt

Make sure the Planning AI system prompt includes examples for all actions:

```
EXAMPLE USER REQUESTS AND EXPECTED ACTIONS:

1. "get ticket 234525253"
   → action: get_ticket
   → parameters: { "ticket_id": "234525253" }

2. "show open tickets"
   → action: list_tickets
   → parameters: { "status": "open", "limit": 10 }

3. "analyze last 30 days"
   → action: analyze_tickets
   → parameters: { "since": "30 days ago", "limit": 100 }

4. "show tickets from today"
   → action: list_tickets
   → parameters: { "since": "today", "limit": 10 }

5. "search tickets about shipping"
   → action: search_tickets
   → parameters: { "query": "shipping", "limit": 10 }

6. "show me insights"
   → action: get_insights
   → parameters: { "since": "30 days ago" }

7. "list tickets for customer john@example.com"
   → action: list_tickets
   → parameters: { "customer_email": "john@example.com", "limit": 10 }

Always extract specific parameters from the user's request:
- Ticket IDs (9+ digit numbers)
- Status keywords (open, closed, pending)
- Time ranges (today, yesterday, last X days, dates)
- Search keywords (after "about", "for", "regarding")
- Email addresses (for customer filtering)

If the request is conversational or you cannot determine a specific action, use action "conversational".
```

---

## 🧪 Testing Both Fixes

### Test Case 1: Get Ticket (Should Already Work)
```
@Gorgias Terminal get ticket 234525253
```
**Expected:**
- ✅ Action: get_ticket
- ✅ Parameters: { ticket_id: "234525253" }
- ✅ Full ticket details displayed

### Test Case 2: List Open Tickets
```
@Gorgias Terminal show open tickets
```
**Expected:**
- ✅ Action: list_tickets
- ✅ Parameters: { status: "open", limit: 10 }
- ✅ List of open tickets displayed (NOT empty)

### Test Case 3: Analyze Tickets
```
@Gorgias Terminal analyze last 30 days
```
**Expected:**
- ✅ Action: analyze_tickets
- ✅ Parameters: { since: "30 days ago", limit: 100 }
- ✅ Analytics/insights displayed

### Test Case 4: Search Tickets
```
@Gorgias Terminal search tickets about shipping
```
**Expected:**
- ✅ Action: search_tickets
- ✅ Parameters: { query: "shipping", limit: 10 }
- ✅ Search results displayed

---

## 🐛 Still Getting Empty Results?

If you still see empty ticket lists after fixing the routing, the issue is in the **HTTP Request** nodes, not the Planning AI.

### Next Debug Step: Check HTTP Request for list_tickets

1. Find the **HTTP Request** node that handles list_tickets
2. Add debug logging to see what URL and parameters are being sent
3. Check if the API response is truly empty or if the data isn't being parsed

**Add this to the HTTP Request node:**
```javascript
// Before the request
console.log('🌐 HTTP Request for list_tickets');
console.log('  URL:', $json.url);
console.log('  Parameters:', JSON.stringify($json.parameters));

// After the request (in a Code node after HTTP Request)
console.log('📥 HTTP Response:');
console.log('  Status:', $json.statusCode);
console.log('  Data:', JSON.stringify($json.data, null, 2));
```

---

## 📊 Comparison: Option A vs Option B

| Aspect | Option A (Fallback Parser) | Option B (Schema Fix) |
|--------|----------------------------|----------------------|
| **Implementation Time** | 5 minutes | 15-20 minutes |
| **Reliability** | Good (pattern matching) | Excellent (proper parsing) |
| **Maintenance** | May need pattern updates | Self-maintaining |
| **Token Usage** | Same | Same |
| **Recommended?** | ✅ Use first for immediate fix | ✅ Implement after for long-term |

---

## 🎯 Recommended Implementation Path

### Phase 1: Immediate Fix (5 minutes)
1. Deploy **Option A** (HANDLE_PLAN_RESPONSE_TOOL_CALLS.js)
2. Test all commands
3. Verify routing works correctly

### Phase 2: Proper Fix (15 minutes)
1. Update Structured Output Parser schema (Option B)
2. Update Planning AI system prompt with examples
3. Test to ensure model uses structured outputs correctly
4. Keep Option A code as fallback (it won't hurt)

### Phase 3: Debug Empty Data (if needed)
If routing works but data is still empty:
1. Debug the HTTP Request nodes
2. Check API parameters
3. Verify API credentials/permissions

---

## ✅ Success Criteria

After implementing Option A, you should see:

**Debug logs showing:**
```
🔄 Fallback inference used
📤 Final Extracted Values:
  Action: list_tickets
  Parameters: { "status": "open", "limit": 10 }
  Reasoning: Inferred from user text pattern
```

**Slack output showing:**
- ✅ Correct action routing (not all defaulting to list_tickets)
- ✅ Proper parameters extracted from user text
- ✅ Data returned (if API is configured correctly)

---

## 🚀 Deploy Now

**Quick Start:**
1. Open **Handle Plan Response** node
2. Replace code with **`node_code/HANDLE_PLAN_RESPONSE_TOOL_CALLS.js`**
3. Save and test with: `@Gorgias Terminal show open tickets`

This should immediately fix the routing issue! 🎯
