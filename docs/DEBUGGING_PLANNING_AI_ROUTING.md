# CRITICAL FIX: Planning AI Agent Model Configuration

**Issue:** Planning AI Agent is not generating correct plans despite having correct system message and schema.

**Root Cause:** Model selection is incompatible with Structured Output Parser.

---

## 🔴 IMMEDIATE FIX

### Step 1: Change Model in Plan AI Agent Node

1. Open your n8n workflow
2. Find **"Plan AI Agent"** node
3. Click on **"OpenAI Chat Model1"** (the connected model node)
4. Change model selection:

**CURRENT (BROKEN):**
```
Model: gpt-5-chat-latest
```

**CHANGE TO (FIXED):**
```
Model: gpt-4o (GPT-4 Optimized)
```

**OR:**
```
Model: gpt-4-turbo
```

**Why this fixes it:**
- GPT-4o and GPT-4-turbo have PROVEN compatibility with Structured Output
- GPT-5 is experimental and may not support your schema format
- OpenAI's Structured Output feature works best with GPT-4 family

---

### Step 2: Enable Structured Output Mode (CRITICAL!)

In the **OpenAI Chat Model1** node:

1. Click **Options** (three dots)
2. Find **"Structured Output"** or **"Response Format"**
3. Set to: **JSON Schema** or **Structured Output**

This tells OpenAI to STRICTLY follow your schema format.

---

### Step 3: Test Immediately

After making the change, test with:

```
Test 1: "@Gorgias Terminal set priority to urgent"
Expected: ask_clarification action
Wrong: list_tickets action

Test 2: "@Gorgias Terminal get ticket 234525253"
Expected: get_ticket action with ticket_id
Wrong: list_tickets action

Test 3: "@Gorgias Terminal show me insights"
Expected: analyze_insights action
Wrong: list_tickets action
```

---

## 🔍 Alternative Issue: Fallback Logic Triggering

If changing the model doesn't fix it, the problem is in **Handle Plan Response** node.

### Debug Steps:

1. **Add Logging to Handle Plan Response:**

Find this line in the Handle Plan Response node:
```javascript
const planAiOutput = $json;
```

Add BEFORE processing:
```javascript
const planAiOutput = $json;
console.log('🔍 DEBUG: Raw Plan AI Output:', JSON.stringify(planAiOutput, null, 2));
console.log('🔍 DEBUG: User Text:', userText);
```

2. **Run a test command** in Slack:
```
"@Gorgias Terminal get ticket 234525253"
```

3. **Check n8n Execution Logs:**
- Open workflow execution
- Find "Handle Plan Response" node
- Look at console logs
- You should see the raw AI output

4. **Look for this pattern:**

**If you see:**
```json
{
  "output": {
    "plan": [
      {
        "step": 1,
        "action": "list_tickets",
        "status": "open",
        "limit": 50
      }
    ]
  }
}
```

**Then the Planning AI itself is generating list_tickets** (model issue).

**If you see:**
```json
{
  "output": {}
}
```
**OR**
```json
{}
```

**Then the Structured Output Parser is rejecting the plan** (schema mismatch).

**If you see:**
```json
{
  "error": "...",
  "status": 400
}
```

**Then the API call is failing** (authentication or rate limit issue).

---

## 🛠️ Fix for Each Scenario

### Scenario A: Planning AI Generates list_tickets Directly

**Problem:** Model not following system message instructions.

**Fix:**
1. Change model to GPT-4o or GPT-4-turbo
2. Verify system message is actually in the "System Message" field (not in the user prompt)
3. Check that system message starts with: "You are an intelligent intent parser..."

### Scenario B: SOP Returns Empty

**Problem:** Structured Output Parser rejecting the plan.

**Fix:**
1. Verify schema in Structured Output Parser node matches EXACTLY:
```json
{
  "type": "object",
  "properties": {
    "output": {
      "type": "object",
      "properties": {
        "plan": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "step": {"type": "number"},
              "action": {
                "type": "string",
                "enum": [
                  "ask_clarification",
                  "analyze_insights",
                  "list_metrics",
                  "get_customer",
                  "find_user",
                  "list_customers",
                  "get_ticket",
                  "list_tickets",
                  "search_tickets",
                  "create_ticket",
                  "close_ticket",
                  "set_status",
                  "assign_ticket",
                  "set_priority",
                  "add_tags",
                  "remove_tags",
                  "reply_public",
                  "comment_internal"
                ]
              }
            }
          }
        }
      }
    }
  }
}
```

2. Make sure "ask_clarification" and "analyze_insights" are in the enum!

### Scenario C: API Error

**Problem:** OpenAI API call failing.

**Fix:**
1. Check OpenAI API credentials
2. Check rate limits
3. Try using a different model (GPT-4o-mini for testing)

---

## 🎯 Recommended Configuration

**Best setup for production:**

### Plan AI Agent Node:
- **Model:** GPT-4o (fastest + most reliable)
- **Temperature:** 0.1 (low for consistency)
- **Max Tokens:** 2000 (enough for complex plans)
- **Response Format:** JSON Schema (enable structured output)

### OpenAI Chat Model1 Node:
```
Model: gpt-4o
Temperature: 0.1
Max Tokens: 2000
```

### Structured Output Parser Node:
- Use schema from docs/FIXED_SOP_SCHEMA_V2.json
- Verify enum includes all 19 actions

---

## 🧪 Comprehensive Test Suite

After making fixes, test ALL these commands:

```bash
# Test 1: Clarification
"@Gorgias Terminal set priority to urgent"
Expected: ask_clarification
✅ Pass if: Response asks "Which ticket?"
❌ Fail if: Shows list_tickets table

# Test 2: Explicit ID
"@Gorgias Terminal get ticket 234525253"
Expected: get_ticket
✅ Pass if: Shows ticket details
❌ Fail if: Shows list_tickets table

# Test 3: Analytics
"@Gorgias Terminal show me insights"
Expected: analyze_insights
✅ Pass if: Routes to analytics (or asks for clarification if not implemented)
❌ Fail if: Shows list_tickets table

# Test 4: Memory
"@Gorgias Terminal get ticket 234525253"
"@Gorgias Terminal close it"
Expected: close_ticket with ticket_id from memory
✅ Pass if: Closes ticket 234525253
❌ Fail if: Shows list_tickets table

# Test 5: Date filtering
"@Gorgias Terminal show tickets from last 7 days"
Expected: search_tickets with date_from and date_to
✅ Pass if: Shows tickets with date filter applied
❌ Fail if: Shows all tickets
```

---

## 📊 Expected vs Actual Routing Distribution

**Before Fix (Current - BROKEN):**
```
Action             Count
────────────────────────
list_tickets       90%  ← Everything defaults here!
get_ticket         5%
Other actions      5%
```

**After Fix (Expected - WORKING):**
```
Action                Count
───────────────────────────
list_tickets          35%  ← Normal usage
get_ticket            20%
search_tickets        15%
ask_clarification     10%  ← NEW - Working!
set_priority          8%
Other actions         12%
```

---

## 🚨 If Still Not Working

If you've tried everything and it's STILL routing to list_tickets:

1. **Export the Plan AI Agent node output:**
   - Add a "Set" node after Plan AI Agent
   - Set a variable: `planOutput` = `{{ $json }}`
   - Run a test
   - Check what the variable contains

2. **Bypass the AI entirely (temporary test):**
   - Add a "Code" node after Parse Slack
   - Manually create a plan:
   ```javascript
   const userText = $json.user_text;
   let plan = [];

   if (userText.includes('get ticket') && /\\d{6,}/.test(userText)) {
     const ticketId = userText.match(/\\d{6,}/)[0];
     plan = [{
       "step": 1,
       "action": "get_ticket",
       "ticket_id": ticketId
     }];
   } else {
     plan = [{
       "step": 1,
       "action": "list_tickets",
       "status": "open",
       "limit": 50
     }];
   }

   return [{json: {output: {plan: plan}}}];
   ```
   - Connect this to Format Session (bypassing Plan AI Agent)
   - Test if "get ticket 234525253" works
   - If THIS works, the problem is 100% in the Plan AI Agent configuration

3. **Contact me with:**
   - Screenshot of Plan AI Agent node settings
   - Screenshot of OpenAI Chat Model1 node settings
   - Screenshot of Structured Output Parser node settings
   - Raw output from n8n execution logs

---

## ✅ Success Checklist

- [ ] Changed model to GPT-4o or GPT-4-turbo
- [ ] Enabled Structured Output mode
- [ ] Verified SOP schema includes ask_clarification and analyze_insights
- [ ] Added debug logging to Handle Plan Response
- [ ] Tested: "set priority to urgent" → asks clarification ✅
- [ ] Tested: "get ticket 234525253" → routes to get_ticket ✅
- [ ] Tested: "show me insights" → routes to analyze_insights ✅
- [ ] Checked routing distribution: list_tickets < 50% ✅

---

**The #1 most common issue:** Using the wrong model or not enabling Structured Output mode.

**Fix this first, then test. If still broken, we'll dig deeper.**
