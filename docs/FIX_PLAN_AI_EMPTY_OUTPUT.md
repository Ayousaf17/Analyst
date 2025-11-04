# Fix: Plan AI Agent Returning Empty Output for list_tickets

**Problem:** Planning AI returns `{ "output": {} }` for list_tickets and other actions, but works perfectly for get_ticket.

**Evidence from logs:**
```json
User: "analyze last 30 days"
Plan AI Output: { "output": {} }
OpenAI finish_reason: "tool_calls"
Structured Output Parser: { "output": {} }
```

---

## Root Cause Analysis

### Issue 1: Structured Output Parser Schema
The schema likely only defines `get_ticket` properly but not `list_tickets`, `search_tickets`, or analytics actions.

### Issue 2: Handle Plan Response Logic
The Handle Plan Response node might have hardcoded logic that only handles `get_ticket` action.

### Issue 3: Planning AI Prompt
The prompt might not have clear examples for list_tickets and analytics actions.

---

## Diagnostic Steps

### Step 1: Check Structured Output Parser Schema

1. Open **Planning AI Agent** node
2. Look for the **Structured Output Parser** configuration
3. Check if the schema includes ALL these actions:
   - ✅ `get_ticket`
   - ❓ `list_tickets`
   - ❓ `search_tickets`
   - ❓ `analyze_tickets`
   - ❓ `get_insights`

**Expected Schema Structure:**
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
          "get_customer",
          "unknown"
        ],
        "description": "The action to perform"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "ticket_id": { "type": ["string", "null"] },
          "status": { "type": ["string", "null"] },
          "since": { "type": ["string", "null"] },
          "until": { "type": ["string", "null"] },
          "query": { "type": ["string", "null"] },
          "assignee": { "type": ["string", "null"] },
          "customer_email": { "type": ["string", "null"] },
          "limit": { "type": ["integer", "null"] }
        },
        "additionalProperties": false
      }
    },
    "required": ["action", "parameters"],
    "additionalProperties": false
  }
}
```

### Step 2: Check Handle Plan Response Node

1. Open **Handle Plan Response** node
2. Check if it has logic for ALL action types
3. Look for code like:

```javascript
const action = planAiOutput?.action || planAiOutput?.output?.action || 'unknown';

switch(action) {
  case 'get_ticket':
    // ... handles get_ticket
    break;
  case 'list_tickets':
    // ... DOES THIS EXIST?
    break;
  case 'search_tickets':
    // ... DOES THIS EXIST?
    break;
}
```

### Step 3: Check OpenAI Chat Model Configuration

1. Open **Planning AI Agent** node
2. Find **OpenAI Chat Model** sub-node
3. Verify settings:
   - ✅ Model: `gpt-4o-2024-08-06` (or `gpt-4o`)
   - ✅ Response Format: Should be using Structured Outputs
   - ✅ Schema should match the parser

---

## Most Likely Issues

### Issue A: Missing Actions in Schema

**Symptom:** Parser returns `{ "output": {} }` because it can't validate the response.

**Fix:** Update Structured Output Parser schema to include all actions.

### Issue B: Incorrect Schema Structure

**Symptom:** Model outputs `tool_calls` but parser expects different format.

**Current (Wrong):**
```json
{
  "output": {}  ← Empty because parser can't extract data
}
```

**Expected (Right):**
```json
{
  "action": "list_tickets",
  "parameters": {
    "status": "open",
    "since": "30 days ago"
  }
}
```

**Fix:** Ensure the schema's top-level structure matches what Handle Plan Response expects.

### Issue C: Handle Plan Response Missing Logic

**Symptom:** get_ticket works because it's handled, but list_tickets falls through to default case.

**Fix:** Add handling for all action types in Handle Plan Response node.

---

## Quick Test: Check What Model is Actually Outputting

Add debug logging to **Handle Plan Response** node:

```javascript
// At the very top of the code
const planAiOutput = $json;
console.log('🔍 RAW Plan AI Output:', JSON.stringify(planAiOutput, null, 2));

// Check if it's nested
console.log('🔍 Output Action:', planAiOutput?.action);
console.log('🔍 Output.Action:', planAiOutput?.output?.action);
console.log('🔍 Response Action:', planAiOutput?.response?.action);

// Check for tool_calls
if (planAiOutput.tool_calls) {
  console.log('🔍 Tool Calls:', JSON.stringify(planAiOutput.tool_calls, null, 2));
}
```

Run a test with: `@Gorgias Terminal show open tickets`

Check the logs to see:
1. What structure is actually coming from the parser
2. Where the action is nested
3. If tool_calls are present but not being parsed

---

## Solution A: Fix Structured Output Parser Schema

If the schema is missing `list_tickets`:

**In Planning AI Agent node, update the Structured Output Parser schema:**

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
          "unknown"
        ],
        "description": "The Gorgias action to perform based on user request"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "ticket_id": {
            "type": ["string", "null"],
            "description": "Ticket ID for get_ticket action"
          },
          "status": {
            "type": ["string", "null"],
            "enum": ["open", "closed", "spam", "pending", null],
            "description": "Filter tickets by status"
          },
          "since": {
            "type": ["string", "null"],
            "description": "Start date/time for filtering (e.g., '30 days ago', '2025-01-01')"
          },
          "until": {
            "type": ["string", "null"],
            "description": "End date/time for filtering"
          },
          "query": {
            "type": ["string", "null"],
            "description": "Search query text for search_tickets"
          },
          "assignee": {
            "type": ["string", "null"],
            "description": "Filter by assignee email"
          },
          "customer_email": {
            "type": ["string", "null"],
            "description": "Filter by customer email"
          },
          "limit": {
            "type": ["integer", "null"],
            "description": "Maximum number of results to return",
            "default": 10
          },
          "tags": {
            "type": ["array", "null"],
            "items": { "type": "string" },
            "description": "Filter by tags"
          }
        },
        "additionalProperties": false
      },
      "reasoning": {
        "type": "string",
        "description": "Brief explanation of why this action was chosen"
      }
    },
    "required": ["action", "parameters"],
    "additionalProperties": false
  }
}
```

---

## Solution B: Fix Handle Plan Response Node

If Handle Plan Response doesn't handle list_tickets:

**Add debug logging + comprehensive action handling:**

```javascript
// ============================================
// Handle Plan Response - UPDATED VERSION
// ============================================

const planAiOutput = $json;

// Debug logging
console.log('🔍 DEBUG: Raw Plan AI Output:', JSON.stringify(planAiOutput, null, 2));

// Extract action and parameters (handle multiple possible structures)
let action = planAiOutput?.action
          || planAiOutput?.output?.action
          || planAiOutput?.response?.action
          || 'unknown';

let parameters = planAiOutput?.parameters
              || planAiOutput?.output?.parameters
              || planAiOutput?.response?.parameters
              || {};

let reasoning = planAiOutput?.reasoning
             || planAiOutput?.output?.reasoning
             || '';

console.log('🔍 DEBUG: Extracted Action:', action);
console.log('🔍 DEBUG: Extracted Parameters:', JSON.stringify(parameters, null, 2));

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

// Build output based on action type
let output = {
  action: action,
  parameters: parameters,
  reasoning: reasoning,
  user_text: userText,
  channel: channel,
  thread_ts: threadTs
};

// Action-specific handling
switch(action) {
  case 'get_ticket':
    // Validate ticket_id is present
    if (!parameters.ticket_id) {
      output.action = 'error';
      output.error_message = 'Missing ticket_id for get_ticket action';
    }
    break;

  case 'list_tickets':
    // Set defaults for list_tickets
    output.parameters.limit = parameters.limit || 10;
    output.parameters.status = parameters.status || null;

    // Parse time ranges if present
    if (parameters.since) {
      output.parameters.since_parsed = parseDateString(parameters.since);
    }
    break;

  case 'search_tickets':
    // Validate query is present
    if (!parameters.query) {
      // Use user_text as fallback query
      output.parameters.query = userText;
    }
    output.parameters.limit = parameters.limit || 10;
    break;

  case 'analyze_tickets':
  case 'get_insights':
    // Set time range defaults for analytics
    output.parameters.since = parameters.since || '30 days ago';
    output.parameters.limit = parameters.limit || 100;
    break;

  case 'get_customer':
    // Validate customer identifier
    if (!parameters.customer_email && !parameters.customer_id) {
      output.action = 'error';
      output.error_message = 'Missing customer_email or customer_id';
    }
    break;

  case 'unknown':
  default:
    // Fallback: Try to infer action from user text
    output.action = 'conversational';
    output.fallback = true;
    break;
}

console.log('🔍 DEBUG: Final Output:', JSON.stringify(output, null, 2));

return output;

// Helper function to parse date strings
function parseDateString(dateStr) {
  if (!dateStr) return null;

  // Handle "X days ago"
  const daysAgoMatch = dateStr.match(/(\d+)\s+days?\s+ago/i);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1]);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  // Handle ISO date strings
  try {
    return new Date(dateStr).toISOString();
  } catch (e) {
    return null;
  }
}
```

---

## Solution C: Update Planning AI Prompt

If the prompt doesn't have good examples for list_tickets:

**Add these examples to the Planning AI system prompt:**

```
EXAMPLE REQUESTS AND ACTIONS:

User: "get ticket 234525253"
Action: get_ticket
Parameters: { "ticket_id": "234525253" }

User: "show open tickets"
Action: list_tickets
Parameters: { "status": "open", "limit": 10 }

User: "analyze last 30 days"
Action: analyze_tickets
Parameters: { "since": "30 days ago", "limit": 100 }

User: "show tickets from today"
Action: list_tickets
Parameters: { "since": "today", "limit": 10 }

User: "search tickets about shipping"
Action: search_tickets
Parameters: { "query": "shipping", "limit": 10 }

User: "show me insights"
Action: get_insights
Parameters: { "since": "30 days ago" }
```

---

## Implementation Steps

### Step 1: Add Debug Logging
Use the debug logging code above in **Handle Plan Response** to see what's actually being output.

### Step 2: Run Test
Test with: `@Gorgias Terminal show open tickets`

### Step 3: Check Logs
Look for the debug output to see:
- What is planAiOutput structure?
- Is action present? Where is it nested?
- Are parameters present?

### Step 4: Apply Fix
Based on what you see in logs:
- If schema is wrong → Fix Structured Output Parser schema (Solution A)
- If action handling is missing → Fix Handle Plan Response (Solution B)
- If examples are missing → Update Planning AI prompt (Solution C)

---

## Expected Results After Fix

### Before (Current):
```
User: "show open tickets"
Plan AI Output: { "output": {} }
Result: "No tickets found" (empty data)
```

### After (Fixed):
```
User: "show open tickets"
Plan AI Output: {
  "action": "list_tickets",
  "parameters": {
    "status": "open",
    "limit": 10
  }
}
Result: List of actual open tickets
```

---

## Next Steps

1. **Add debug logging** to Handle Plan Response (code above)
2. **Test** with `@Gorgias Terminal show open tickets`
3. **Check logs** to see the actual structure
4. **Share the debug output** with me so I can see exactly what's happening
5. **Apply the appropriate fix** based on what we discover

---

The key is to see what the Structured Output Parser is actually outputting. Once we see that, we'll know exactly which fix to apply! 🔍
