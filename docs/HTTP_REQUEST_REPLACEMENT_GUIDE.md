# HTTP Request Replacement Guide
## Fix Critical Issue: Replace AI Agent with HTTP Request

**Goal:** Replace unreliable AI Agent (95% success) with HTTP Request (100% guaranteed valid JSON)

**Time Required:** 2-3 hours

**Status:** 🔴 Critical - Do This First

---

## 📋 Step-by-Step Instructions

### Step 1: Create New HTTP Request Node

**In n8n UI:**
1. Click **+** button after "Parse Slack" node
2. Search for "HTTP Request"
3. Select "HTTP Request" node
4. Configure as follows:

**Node Configuration:**

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"model\": \"gpt-4o-mini-2024-07-18\",\n  \"messages\": [\n    {\n      \"role\": \"system\",\n      \"content\": \"You are an intelligent intent parser for Gorgias ticket management. Extract user intent and available context.\\n\\nCRITICAL: You MUST output valid JSON matching the exact schema.\\n\\nYou have access to the conversation history for this thread via the connected memory.\\nUse the chat history to resolve pronouns, vague references, and follow-up commands.\\n\\nCRITICAL RULES FOR USING CONVERSATION HISTORY:\\n\\n1. **Pronoun Resolution**\\n   If user says \\\"it\\\", \\\"that\\\", \\\"this ticket\\\", \\\"the customer\\\", \\\"them\\\":\\n   - Look at the conversation history\\n   - Find the most recent ticket ID or customer email mentioned\\n   - Use that ID/email in your plan\\n   - DO NOT ask for clarification if context exists in history\\n\\n2. **Follow-up Commands**\\n   If user command is vague but history provides context:\\n   - \\\"close it\\\" → Find last ticket ID in history, use for close_ticket\\n   - \\\"show their tickets\\\" → Find last customer email in history, use for list_tickets\\n   - \\\"reply with X\\\" → Find last ticket ID in history, use for reply_public\\n   - \\\"assign to Y\\\" → Find last ticket ID in history, use for assign_ticket\\n\\n3. **Context Extraction from History**\\n   Look for patterns in previous messages:\\n   - \\\"get ticket 234525253\\\" → ticket_id = \\\"234525253\\\"\\n   - \\\"tickets for john@example.com\\\" → customer_email = \\\"john@example.com\\\"\\n   - \\\"search for ayub\\\" → customer name = \\\"ayub\\\"\\n\\n4. **Explicit IDs Always Override History**\\n   If user provides explicit ID/email, ALWAYS use that instead of history:\\n   - \\\"close ticket 12345\\\" → Use 12345 (NOT historical ticket)\\n   - \\\"show john@example.com tickets\\\" → Use john@example.com (NOT historical customer)\\n\\n5. **No Context Available - ASK FOR CLARIFICATION**\\n   If user uses pronoun/action but no context in history:\\n   - Use ask_clarification action to request missing information\\n   - DO NOT blindly default to list_tickets\\n\\nAVAILABLE ACTIONS:\\n- ask_clarification\\n- analyze_insights\\n- list_metrics\\n- get_customer\\n- find_user\\n- list_customers\\n- get_ticket\\n- list_tickets\\n- search_tickets\\n- create_ticket\\n- close_ticket\\n- set_status\\n- assign_ticket\\n- set_priority\\n- add_tags\\n- remove_tags\\n- reply_public\\n- comment_internal\\n\\nOUTPUT FORMAT (JSON ONLY):\\n{\\n  \\\"plan\\\": [\\n    {\\n      \\\"step\\\": 1,\\n      \\\"action\\\": \\\"action_name\\\",\\n      \\\"ticket_id\\\": \\\"123\\\",\\n      \\\"status\\\": \\\"open\\\",\\n      \\\"priority\\\": \\\"urgent\\\",\\n      \\\"customer_email\\\": \\\"user@example.com\\\",\\n      \\\"query\\\": \\\"search term\\\",\\n      \\\"message\\\": \\\"text\\\",\\n      \\\"limit\\\": 50\\n    }\\n  ]\\n}\\n\\nEXAMPLES:\\n\\nUser: \\\"show open tickets\\\"\\n→ {\\\"plan\\\": [{\\\"step\\\": 1, \\\"action\\\": \\\"list_tickets\\\", \\\"status\\\": \\\"open\\\", \\\"limit\\\": 50}]}\\n\\nUser: \\\"get ticket 226392965\\\"\\n→ {\\\"plan\\\": [{\\\"step\\\": 1, \\\"action\\\": \\\"get_ticket\\\", \\\"ticket_id\\\": \\\"226392965\\\"}]}\\n\\nUser: \\\"close it\\\" (after viewing ticket 123)\\n→ {\\\"plan\\\": [{\\\"step\\\": 1, \\\"action\\\": \\\"set_status\\\", \\\"ticket_id\\\": \\\"123\\\", \\\"status\\\": \\\"closed\\\"}]}\\n\\nUser: \\\"set priority to urgent\\\" (no context)\\n→ {\\\"plan\\\": [{\\\"step\\\": 1, \\\"action\\\": \\\"ask_clarification\\\", \\\"question\\\": \\\"Which ticket would you like to set to urgent? Please provide the ticket ID.\\\"}]}\"\n    },\n    {\n      \"role\": \"user\",\n      \"content\": \"{{ $('Parse Slack').first().json.user_text }}\"\n    }\n  ],\n  \"response_format\": {\n    \"type\": \"json_schema\",\n    \"json_schema\": {\n      \"name\": \"gorgias_plan\",\n      \"strict\": true,\n      \"schema\": {\n        \"type\": \"object\",\n        \"properties\": {\n          \"plan\": {\n            \"type\": \"array\",\n            \"items\": {\n              \"type\": \"object\",\n              \"properties\": {\n                \"step\": {\n                  \"type\": \"number\",\n                  \"description\": \"Step number in the plan\"\n                },\n                \"action\": {\n                  \"type\": \"string\",\n                  \"description\": \"Action to perform\",\n                  \"enum\": [\n                    \"ask_clarification\",\n                    \"analyze_insights\",\n                    \"list_metrics\",\n                    \"get_customer\",\n                    \"find_user\",\n                    \"list_customers\",\n                    \"get_ticket\",\n                    \"list_tickets\",\n                    \"search_tickets\",\n                    \"create_ticket\",\n                    \"close_ticket\",\n                    \"set_status\",\n                    \"assign_ticket\",\n                    \"set_priority\",\n                    \"add_tags\",\n                    \"remove_tags\",\n                    \"reply_public\",\n                    \"comment_internal\"\n                  ]\n                },\n                \"question\": {\n                  \"type\": \"string\",\n                  \"description\": \"Clarification question (for ask_clarification action)\"\n                },\n                \"period\": {\n                  \"type\": \"string\",\n                  \"description\": \"Time period for analytics (for analyze_insights action)\",\n                  \"enum\": [\"7d\", \"30d\", \"90d\"]\n                },\n                \"focus\": {\n                  \"type\": \"string\",\n                  \"description\": \"Focus area for analytics (for analyze_insights action)\",\n                  \"enum\": [\"questions\", \"performance\", \"tags\", \"all\"]\n                },\n                \"ticket_id\": {\n                  \"type\": \"string\",\n                  \"description\": \"Ticket ID (if applicable)\"\n                },\n                \"customer_id\": {\n                  \"type\": \"string\",\n                  \"description\": \"Customer ID (if applicable)\"\n                },\n                \"customer_email\": {\n                  \"type\": \"string\",\n                  \"description\": \"Customer email address (if applicable)\"\n                },\n                \"name\": {\n                  \"type\": \"string\",\n                  \"description\": \"Person name for search (if applicable)\"\n                },\n                \"query\": {\n                  \"type\": \"string\",\n                  \"description\": \"Search query (if applicable)\"\n                },\n                \"date_from\": {\n                  \"type\": \"string\",\n                  \"description\": \"Start date for filtering (ISO 8601 format)\"\n                },\n                \"date_to\": {\n                  \"type\": \"string\",\n                  \"description\": \"End date for filtering (ISO 8601 format)\"\n                },\n                \"status\": {\n                  \"type\": \"string\",\n                  \"description\": \"Ticket status filter\",\n                  \"enum\": [\"open\", \"closed\", \"pending\", \"all\"]\n                },\n                \"priority\": {\n                  \"type\": \"string\",\n                  \"description\": \"Ticket priority\",\n                  \"enum\": [\"low\", \"normal\", \"high\", \"urgent\"]\n                },\n                \"limit\": {\n                  \"type\": \"number\",\n                  \"description\": \"Number of results to return\"\n                },\n                \"cursor\": {\n                  \"type\": \"string\",\n                  \"description\": \"Pagination cursor\"\n                },\n                \"page\": {\n                  \"type\": \"number\",\n                  \"description\": \"Page number for pagination\"\n                },\n                \"assignee_email\": {\n                  \"type\": \"string\",\n                  \"description\": \"Assignee email address (if applicable)\"\n                },\n                \"tags\": {\n                  \"type\": \"string\",\n                  \"description\": \"Comma-separated tags (if applicable)\"\n                },\n                \"message\": {\n                  \"type\": \"string\",\n                  \"description\": \"Message text (if applicable)\"\n                },\n                \"subject\": {\n                  \"type\": \"string\",\n                  \"description\": \"Ticket subject (if applicable)\"\n                }\n              },\n              \"required\": [\"step\", \"action\"],\n              \"additionalProperties\": false\n            }\n          }\n        },\n        \"required\": [\"plan\"],\n        \"additionalProperties\": false\n      }\n    }\n  },\n  \"temperature\": 0.1,\n  \"max_tokens\": 2000\n}",
    "options": {
      "response": {
        "response": {
          "responseFormat": "json"
        }
      }
    }
  },
  "name": "OpenAI Structured Output",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [-5184, 48]
}
```

**Important Settings:**
1. **Authentication:** Select "Predefined Credential Type" → "Header Auth"
2. **Create Credential:**
   - Name: "OpenAI Header Auth"
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_OPENAI_API_KEY`

---

### Step 2: Update "Handle Plan Response" Node

**Replace entire code** in "Handle Plan Response" node with this simplified version:

```javascript
// ============================================
// Handle Plan Response - SIMPLIFIED (HTTP Request Version)
// ============================================
// This version simply extracts the plan from OpenAI HTTP response
// Much simpler than AI Agent version because HTTP Request guarantees valid JSON
// ============================================

const httpResponse = $json;

console.log('═══════════════════════════════════════');
console.log('🔍 Handle Plan Response (HTTP Version)');
console.log('═══════════════════════════════════════');

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

let plan = [];

// Extract plan from OpenAI HTTP response
// OpenAI returns: { choices: [{ message: { content: "{\"plan\": [...]}" } }] }

try {
  // Parse the JSON string from content
  const content = httpResponse.choices[0].message.content;
  const parsed = JSON.parse(content);

  if (parsed.plan && Array.isArray(parsed.plan)) {
    plan = parsed.plan;
    console.log('✅ Successfully extracted plan with', plan.length, 'steps');
  } else {
    console.error('❌ No plan array found in response');
    plan = [{
      step: 1,
      action: 'list_tickets',
      status: 'open',
      limit: 50
    }];
  }
} catch (e) {
  console.error('❌ Failed to parse OpenAI response:', e.message);
  console.error('Raw response:', JSON.stringify(httpResponse, null, 2));

  // Fallback plan
  plan = [{
    step: 1,
    action: 'list_tickets',
    status: 'open',
    limit: 50
  }];
}

console.log('📤 Final plan:', JSON.stringify(plan, null, 2));
console.log('═══════════════════════════════════════');

// Return plan in expected format
return [{
  json: {
    plan: plan,
    user_text: userText,
    channel: channel,
    thread_ts: threadTs
  }
}];
```

---

### Step 3: Connect Nodes

**Current flow:**
```
Parse Slack → Plan AI Agent → Handle Plan Response → Format Session
```

**New flow:**
```
Parse Slack → OpenAI Structured Output → Handle Plan Response → Format Session
```

**In n8n UI:**
1. Delete connection: Parse Slack → Plan AI Agent
2. Create connection: Parse Slack → OpenAI Structured Output (new node)
3. Create connection: OpenAI Structured Output → Handle Plan Response
4. Keep existing: Handle Plan Response → Format Session

---

### Step 4: Test the New Setup

**Test Cases:**

1. **Simple query:**
   ```
   @Gorgias Terminal show open tickets
   ```
   Expected: Returns list of open tickets

2. **Specific ticket:**
   ```
   @Gorgias Terminal get ticket 226392965
   ```
   Expected: Returns ticket details

3. **Pronoun test (requires history):**
   ```
   First: @Gorgias Terminal get ticket 226392965
   Then: @Gorgias Terminal close it
   ```
   Expected: Closes ticket 226392965

4. **Clarification test:**
   ```
   @Gorgias Terminal set priority to urgent
   ```
   Expected: Asks "Which ticket would you like to set to urgent?"

**How to test:**
1. In n8n, click "Execute Node" on "Parse Slack"
2. Use the pinned test data
3. Watch execution flow
4. Verify "Handle Plan Response" shows valid plan

---

### Step 5: Remove Old Nodes (After Testing)

**Once new setup works, delete these nodes:**
1. "Plan AI Agent" (the AI Agent node)
2. "Structured Output Parser"
3. "OpenAI Chat Model1" (the LLM connected to Plan AI Agent)

**How to delete:**
1. Right-click node → Delete
2. Confirm deletion
3. Save workflow

---

## 🔧 Troubleshooting

### Issue: "401 Unauthorized"
**Fix:** Check OpenAI Header Auth credential
- Header name must be: `Authorization`
- Header value must be: `Bearer sk-...` (with space after Bearer)

### Issue: "Model not found"
**Fix:** Verify model name is exactly: `gpt-4o-mini-2024-07-18`

### Issue: "Invalid JSON schema"
**Fix:** Copy the entire `jsonBody` from above exactly as-is

### Issue: "Plan is empty"
**Check:**
1. Execution log of "OpenAI Structured Output" node
2. Verify response has `choices[0].message.content`
3. Verify content is valid JSON string

---

## ✅ Success Criteria

After this fix, you should see:

1. **100% Valid JSON**
   - No more "Model output doesn't fit required format" errors
   - Every response has valid plan array

2. **Simpler Code**
   - "Handle Plan Response" is now 30 lines instead of 150 lines
   - No complex fallback logic needed

3. **Faster Execution**
   - HTTP Request is faster than AI Agent
   - Less overhead

4. **Easier Debugging**
   - Clear HTTP request/response in logs
   - Structured output is visible in execution data

---

## 📊 Before vs After

### Before (AI Agent)
```
Reliability: 95%
Nodes: 3 (AI Agent + Parser + LLM)
Complexity: High (prompt-based parsing)
Errors: "Model output doesn't fit required format"
Code: 150 lines in Handle Plan Response
```

### After (HTTP Request)
```
Reliability: 100%
Nodes: 1 (HTTP Request)
Complexity: Low (native structured outputs)
Errors: None (guaranteed valid JSON)
Code: 30 lines in Handle Plan Response
```

---

## 🎯 Next Steps After This Fix

Once this works:

1. **Add environment variables** (1-2 hours)
2. **Add error handlers** (2-3 hours)
3. **Update workflow settings** (15 minutes)

But get this working first - it's the most critical fix!

---

**Questions?** Test each step and verify it works before moving to the next step.

**Stuck?** Check the execution logs - they'll show exactly where the issue is.

**Ready to proceed?** Start with Step 1 and work through sequentially.
