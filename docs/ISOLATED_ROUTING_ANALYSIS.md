# Isolated Routing Analysis - Plan AI Agent & Handle Response

**Based on your Slack thread, here's what's happening:**

---

## Command Routing Analysis

| Command | Should Route To | Actually Routes To | Result |
|---------|----------------|-------------------|--------|
| `get ticket 234525253` | get_ticket | ✅ get_ticket | ✅ **WORKS** |
| `show me insights` | get_insights | ❌ list_tickets | ❌ Empty |
| `analyze last 30 days` | analyze_tickets | ❌ list_tickets | ❌ Empty |
| `show tickets` | list_tickets | ✅ list_tickets | ❌ Empty |
| `show open tickets` | list_tickets | ✅ list_tickets | ❌ Empty |
| `show open tickets from today` | list_tickets | ✅ list_tickets | ❌ Empty |
| `any tickets` | list_tickets | ✅ list_tickets | ❌ Empty |
| `search tickets about shipping` | search_tickets | ❓ Unknown | ❓ Unknown |

---

## Two Separate Problems Identified

### Problem 1: Planning AI Returns Empty Output
```json
Plan AI Agent Output: { "output": {} }
```

**Evidence:**
- Your logs show `{ "output": {} }` for "analyze last 30 days"
- OpenAI finish_reason: "tool_calls" (model tries to use tools)
- Structured Output Parser gets empty object
- **Result:** Handle Plan Response has no action to work with

**Impact:**
- Commands like "analyze" and "insights" can't be routed correctly
- Falls back to default action (probably list_tickets)

---

### Problem 2: list_tickets Returns Empty Data
```
✅ Step: list_tickets
Ticket: (empty)
Status: (empty)
HTTP Code: 200
```

**Evidence:**
- HTTP request succeeds (200 OK)
- But returns no tickets
- Happens for ALL list_tickets requests

**Possible Causes:**
1. Missing query parameters on the HTTP request
2. Wrong API endpoint
3. Filters are too restrictive (no tickets match)
4. API credentials issue (can read specific tickets but not list)

---

## Diagnostic Plan

### Step 1: Add Debug Logging to Handle Plan Response

**Replace the code in your Handle Plan Response node with:**

📄 **File: `node_code/HANDLE_PLAN_RESPONSE_DEBUG.js`**

This will show us:
- ✅ What structure the Planning AI is actually outputting
- ✅ Where the action is nested (if anywhere)
- ✅ What keys exist in the output object
- ✅ Whether output is truly empty or just wrong structure

### Step 2: Test and Capture Logs

Run these commands in Slack:
1. `@Gorgias Terminal get ticket 234525253` (we know this works)
2. `@Gorgias Terminal show open tickets` (should be list_tickets, but returns empty)
3. `@Gorgias Terminal analyze last 30 days` (should be analyze_tickets, routes to list_tickets)

**After each command, check the n8n execution logs for the debug output.**

### Step 3: Analyze the Debug Output

Look for these sections in the logs:

```
═══════════════════════════════════════
🔍 DEBUG: Handle Plan Response
═══════════════════════════════════════
📥 RAW Input (planAiOutput):
{ ... }  ← What structure is this?

🎯 Action Detection:
  planAiOutput.action = ???
  planAiOutput.output = ???
  planAiOutput.output.action = ???

🔑 All Keys in planAiOutput:
[ ... ]  ← What keys exist?

📤 Extracted Values:
  Action: ???  ← What action was extracted?
  Parameters: ???  ← What parameters?
═══════════════════════════════════════
```

### Step 4: Share Debug Output With Me

Copy the debug logs from one of the failing commands (like "show open tickets") and share them. I'll be able to see:
1. Exactly what structure Planning AI is outputting
2. Where the action should be extracted from
3. Why it's defaulting to list_tickets
4. What fix to apply

---

## Expected Findings

### Scenario A: Empty Output Object
```json
{
  "output": {}
}
```
**Cause:** Structured Output Parser schema doesn't include list_tickets/analyze_tickets
**Fix:** Update schema to include all actions

### Scenario B: Wrong Nesting
```json
{
  "response": {
    "action": "list_tickets",
    "parameters": {...}
  }
}
```
**Cause:** Action is nested in different location than expected
**Fix:** Update Handle Plan Response extraction logic

### Scenario C: Tool Calls Format
```json
{
  "tool_calls": [
    {
      "function": {
        "name": "list_tickets",
        "arguments": "{...}"
      }
    }
  ]
}
```
**Cause:** Model using function calling instead of structured output
**Fix:** Update parser to extract from tool_calls

---

## Next Steps After Diagnosis

### If Problem 1 is Structural (empty output):

**Fix A: Update Structured Output Parser Schema**
- Add all missing actions to the enum
- Ensure schema is "strict": true
- Make parameters more flexible

**Fix B: Update Handle Plan Response Extraction**
- Check different nesting paths
- Handle tool_calls format
- Add better error handling

### If Problem 2 is HTTP Request (empty data):

**Fix C: Debug the list_tickets HTTP Node**
1. Check what URL is being called
2. Check what query parameters are sent
3. Add debug logging to see the API response
4. Compare working get_ticket request vs failing list_tickets request

---

## Immediate Action Required

### 1. Deploy Debug Version

Replace **Handle Plan Response** node code with:
📄 `node_code/HANDLE_PLAN_RESPONSE_DEBUG.js`

### 2. Run Test Commands

```
@Gorgias Terminal show open tickets
```

### 3. Check n8n Execution Logs

Look for the debug output sections with:
- 🔍 DEBUG: Handle Plan Response
- 📥 RAW Input
- 🎯 Action Detection
- 📤 Extracted Values

### 4. Share the Debug Output

Copy the logs and share them with me. I'll analyze exactly what's happening and provide the precise fix.

---

## Why This Approach

**Isolating the concern:**
1. ✅ We know get_ticket works (your fixes are good)
2. ❓ We need to see what Planning AI outputs for other commands
3. ❓ We need to see why list_tickets returns empty data
4. 🎯 Debug logging will show us both issues clearly

**Two separate fixes needed:**
1. **Fix Planning AI routing** → So "analyze" goes to analyze_tickets, not list_tickets
2. **Fix list_tickets HTTP request** → So it actually returns ticket data

We can't fix #2 until we know what #1 is outputting, because the parameters from Planning AI control the HTTP request.

---

## Example: What Good Debug Output Looks Like

```
═══════════════════════════════════════
🔍 DEBUG: Handle Plan Response
═══════════════════════════════════════
📥 RAW Input (planAiOutput):
{
  "action": "list_tickets",
  "parameters": {
    "status": "open",
    "limit": 10
  },
  "reasoning": "User wants to see open tickets"
}
───────────────────────────────────────
🎯 Action Detection:
  planAiOutput.action = "list_tickets"
  planAiOutput.output = undefined
  planAiOutput.output.action = undefined
───────────────────────────────────────
📤 Extracted Values:
  Action: list_tickets
  Parameters: {
    "status": "open",
    "limit": 10
  }
═══════════════════════════════════════
```

**This would tell us:**
- ✅ Planning AI is correctly outputting the action
- ✅ Parameters are present and correct
- ➡️ Problem is in the HTTP request, not the routing

---

## Example: What Bad Debug Output Looks Like

```
═══════════════════════════════════════
🔍 DEBUG: Handle Plan Response
═══════════════════════════════════════
📥 RAW Input (planAiOutput):
{
  "output": {}
}
───────────────────────────────────────
🎯 Action Detection:
  planAiOutput.action = undefined
  planAiOutput.output = {}
  planAiOutput.output.action = undefined
───────────────────────────────────────
⚠️  Empty output object detected!
───────────────────────────────────────
📤 Extracted Values:
  Action: empty_output_error
  Parameters: {}
═══════════════════════════════════════
```

**This would tell us:**
- ❌ Planning AI is not outputting a valid action
- ❌ Structured Output Parser is failing
- ➡️ Problem is in the Planning AI/parser configuration

---

## Deploy and Test Now

1. **Copy `node_code/HANDLE_PLAN_RESPONSE_DEBUG.js` into Handle Plan Response node**
2. **Save the node**
3. **Run: `@Gorgias Terminal show open tickets`**
4. **Check execution logs**
5. **Share the debug output here**

Then we'll know exactly what's wrong and can apply the precise fix! 🎯
