# Fix: Structured Output Parser Not Running

**Critical Finding:** The Structured Output Parser (SOP) is not executing in the Planning AI Agent node.

**Result:** Raw OpenAI output passes through without parsing → `{ "output": {} }`

---

## Root Cause

The Planning AI Agent node is likely:
1. **Not configured to use the parser** - Chain doesn't include SOP
2. **Wrong node type** - Using basic OpenAI node instead of Agent node
3. **Parser misconfigured** - Schema validation failing silently

---

## Fix: Reconfigure Planning AI Agent

### Option 1: Use OpenAI Functions Agent (Recommended)

**This is the correct n8n node setup for structured outputs.**

#### Step 1: Check Current Node Type

1. Open your **Planning AI Agent** node
2. Check what type it is:
   - ❌ If it's "OpenAI Chat Model" → Wrong, just a basic LLM call
   - ❌ If it's "Conversational Agent" without tools → Wrong setup
   - ✅ Should be: "OpenAI Functions Agent" or "Agent" with structured output

#### Step 2: Reconfigure the Node

**If using wrong node type, here's the correct setup:**

1. **Add/Update to "Agent" node**
   - Node Type: `Agent`
   - Agent Type: `OpenAI Functions Agent`

2. **Configure the Agent:**
   ```
   System Message: [Your Planning AI prompt]
   Model: gpt-4o-2024-08-06
   Temperature: 0.1
   ```

3. **Define Tools/Functions:**

Instead of using Structured Output Parser separately, define the function directly:

```json
{
  "name": "route_gorgias_action",
  "description": "Route user request to appropriate Gorgias action with parameters",
  "parameters": {
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
          "conversational"
        ],
        "description": "The Gorgias action to perform"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "ticket_id": { "type": "string" },
          "status": { "type": "string", "enum": ["open", "closed", "pending", "spam"] },
          "since": { "type": "string" },
          "until": { "type": "string" },
          "query": { "type": "string" },
          "customer_email": { "type": "string" },
          "limit": { "type": "integer", "default": 10 }
        }
      },
      "reasoning": {
        "type": "string",
        "description": "Brief explanation of why this action was chosen"
      }
    },
    "required": ["action", "parameters", "reasoning"]
  }
}
```

4. **Tool Calling Mode:** Set to `Parallel` or `Single` (either works)

---

### Option 2: Use OpenAI with Structured Outputs

**If you want to keep the current node structure:**

#### Step 1: Configure OpenAI Chat Model

1. Open **Planning AI Agent** → **OpenAI Chat Model** sub-node
2. Set these parameters:
   - Model: `gpt-4o-2024-08-06`
   - Temperature: `0.1`
   - **Response Format:** `JSON Schema` or `Structured Output`

3. **In the JSON Schema field, paste:**

```json
{
  "name": "gorgias_action",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["get_ticket", "list_tickets", "search_tickets", "analyze_tickets", "get_insights", "conversational"]
      },
      "parameters": {
        "type": "object",
        "properties": {
          "ticket_id": { "type": "string" },
          "status": { "type": "string" },
          "since": { "type": "string" },
          "query": { "type": "string" },
          "limit": { "type": "integer" }
        },
        "additionalProperties": true
      },
      "reasoning": { "type": "string" }
    },
    "required": ["action", "parameters"],
    "additionalProperties": false
  }
}
```

#### Step 2: Remove/Bypass Structured Output Parser

If the parser isn't working, bypass it:

1. Delete the **Structured Output Parser** node
2. Have **OpenAI Chat Model** output directly to **Handle Plan Response**
3. Handle Plan Response will parse the JSON

#### Step 3: Update Handle Plan Response

Use this version that handles JSON string responses:

```javascript
const planAiOutput = $json;

console.log('📥 Raw Input:', JSON.stringify(planAiOutput, null, 2));

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

let action = 'unknown';
let parameters = {};
let reasoning = '';

// Try to extract from different response formats
if (planAiOutput?.action) {
  // Already parsed JSON object
  action = planAiOutput.action;
  parameters = planAiOutput.parameters || {};
  reasoning = planAiOutput.reasoning || '';

} else if (planAiOutput?.choices?.[0]?.message?.content) {
  // OpenAI raw response with JSON string
  try {
    const parsed = JSON.parse(planAiOutput.choices[0].message.content);
    action = parsed.action;
    parameters = parsed.parameters || {};
    reasoning = parsed.reasoning || '';
  } catch (e) {
    console.log('❌ Failed to parse JSON from content');
  }

} else if (planAiOutput?.choices?.[0]?.message?.function_call) {
  // Function calling format
  const functionCall = planAiOutput.choices[0].message.function_call;
  const args = JSON.parse(functionCall.arguments);
  action = args.action;
  parameters = args.parameters || {};
  reasoning = args.reasoning || '';

} else if (planAiOutput?.output) {
  // Nested in output (current broken state)
  if (Object.keys(planAiOutput.output).length === 0) {
    console.log('⚠️  Empty output - using fallback inference');

    // Fallback to text pattern matching
    const lowerText = userText.toLowerCase();

    if (/get\s+ticket\s+(\d+)/.test(lowerText)) {
      action = 'get_ticket';
      const match = lowerText.match(/get\s+ticket\s+(\d+)/);
      parameters = { ticket_id: match[1] };
    } else if (/(show|list|display)\s+(open|closed|all)?\s*tickets?/.test(lowerText)) {
      action = 'list_tickets';
      parameters = { status: lowerText.includes('open') ? 'open' : null, limit: 10 };
    } else if (/(analyze|analysis|insights?)/.test(lowerText)) {
      action = 'analyze_tickets';
      parameters = { since: '30 days ago', limit: 100 };
    } else if (/(search|find)\s+tickets?/.test(lowerText)) {
      action = 'search_tickets';
      const queryMatch = lowerText.match(/(?:about|for)\s+(.+)$/);
      parameters = { query: queryMatch ? queryMatch[1] : userText, limit: 10 };
    } else {
      action = 'conversational';
    }

    reasoning = 'Inferred from user text (parser failed)';
  }
}

console.log('✅ Extracted:', { action, parameters, reasoning });

return {
  action,
  parameters,
  reasoning,
  user_text: userText,
  channel,
  thread_ts: threadTs
};
```

---

### Option 3: Simpler Approach - Direct JSON Mode

**Simplest configuration that works:**

#### Step 1: OpenAI Chat Model Settings

```
Model: gpt-4o-2024-08-06
Temperature: 0.1
Response Format: json_object
```

#### Step 2: Update System Prompt

Add this to the END of your Planning AI system prompt:

```
IMPORTANT: You MUST respond with valid JSON in this exact format:

{
  "action": "get_ticket|list_tickets|search_tickets|analyze_tickets|conversational",
  "parameters": {
    "ticket_id": "string (for get_ticket)",
    "status": "open|closed|pending (for list_tickets)",
    "since": "time range string (for list/analyze)",
    "query": "search text (for search_tickets)",
    "limit": 10
  },
  "reasoning": "brief explanation of why you chose this action"
}

EXAMPLES:

User: "get ticket 234525253"
Response: {"action": "get_ticket", "parameters": {"ticket_id": "234525253"}, "reasoning": "User requested specific ticket by ID"}

User: "show open tickets"
Response: {"action": "list_tickets", "parameters": {"status": "open", "limit": 10}, "reasoning": "User wants to see open tickets"}

User: "analyze last 30 days"
Response: {"action": "analyze_tickets", "parameters": {"since": "30 days ago", "limit": 100}, "reasoning": "User wants analytics for the past month"}

User: "search tickets about shipping"
Response: {"action": "search_tickets", "parameters": {"query": "shipping", "limit": 10}, "reasoning": "User wants to find tickets related to shipping"}

Always respond with ONLY the JSON, no other text.
```

#### Step 3: Handle Plan Response

```javascript
const planAiOutput = $json;
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

let parsed;

// Parse JSON from OpenAI response
if (typeof planAiOutput === 'string') {
  parsed = JSON.parse(planAiOutput);
} else if (planAiOutput?.choices?.[0]?.message?.content) {
  parsed = JSON.parse(planAiOutput.choices[0].message.content);
} else if (planAiOutput?.action) {
  parsed = planAiOutput;
} else {
  // Fallback
  parsed = { action: 'conversational', parameters: {}, reasoning: 'Could not parse' };
}

return {
  action: parsed.action || 'conversational',
  parameters: parsed.parameters || {},
  reasoning: parsed.reasoning || '',
  user_text: userText,
  channel,
  thread_ts: threadTs
};
```

---

## Quick Fix: Use Fallback Parser Now

**Since SOP isn't running, use the smart fallback parser immediately:**

📄 **Deploy: `node_code/HANDLE_PLAN_RESPONSE_TOOL_CALLS.js`**

This will:
- ✅ Work with the broken setup right now
- ✅ Extract actions from user text patterns
- ✅ Route correctly until you fix the Planning AI node

**Then fix the Planning AI node properly using Option 3 (simplest).**

---

## Verification Steps

After fixing:

### 1. Check OpenAI Output

Add debug logging BEFORE Handle Plan Response:

```javascript
console.log('OpenAI Raw Output:', JSON.stringify($json, null, 2));
```

You should see:
```json
{
  "action": "list_tickets",
  "parameters": {...},
  "reasoning": "..."
}
```

NOT:
```json
{
  "output": {}
}
```

### 2. Test Commands

```
@Gorgias Terminal show open tickets
```

Should route to `list_tickets` with correct parameters.

---

## Recommended Path Forward

### Immediate (5 min):
1. Deploy `HANDLE_PLAN_RESPONSE_TOOL_CALLS.js` (fallback parser)
2. This fixes routing RIGHT NOW

### Short-term (15 min):
1. Implement Option 3 (Direct JSON Mode)
2. Update system prompt with JSON examples
3. Set Response Format to `json_object`
4. Test all commands

### Long-term:
1. Consider Option 1 (OpenAI Functions Agent) for production
2. More robust, built-in structured outputs
3. Better error handling

---

**Deploy the fallback parser NOW, then we'll fix the Planning AI node properly!** 🚀
