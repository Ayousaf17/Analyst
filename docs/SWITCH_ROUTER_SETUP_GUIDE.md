# Switch Router Setup Guide - Ask Clarification Flow

**Purpose:** Route `ask_clarification` action to Slack (end workflow) instead of continuing to execute actions

**Date:** November 5, 2025

---

## 🎯 Goal

When OpenAI asks for clarification (missing parameters), we need to:
1. Detect it in Handle Plan Response ✅ (done)
2. Route to special handler (Switch Router setup needed)
3. Send question back to Slack
4. End workflow (don't execute action)

---

## 🔀 Switch Router Configuration

### Current State
Your Switch Router currently routes based on action type:
- Route 1: `list_tickets`
- Route 2: `search_tickets`
- Route 3: `get_ticket`
- Route 4: `create_ticket`
- Route 5-10: Other actions...

### Required Change
**Add `ask_clarification` as Route 0 (FIRST route)**

---

## 📋 Step-by-Step Setup

### Step 1: Open Switch Router Node

1. In n8n, find your "Switch Router" node (or "Switch" node)
2. Double-click to open it

---

### Step 2: Add New Route (Route 0)

**Click "Add Routing Rule"** at the TOP of the list

**Important:** This must be the FIRST route (Route 0) so it's evaluated before other routes.

---

### Step 3: Configure Route 0 for ask_clarification

**Mode:** Rules

**Rule 1:**
- **Field:** `{{ $json.plan[0].action }}`
- **Operation:** `Equal to`
- **Value:** `ask_clarification`

**Or use expression mode:**
```javascript
{{ $json.plan[0].action === "ask_clarification" }}
```

---

### Step 4: Verify Route Order

After adding, your Switch Router should have routes in this order:

```
Route 0: ask_clarification    ← NEW (must be first!)
Route 1: list_tickets
Route 2: search_tickets
Route 3: get_ticket
Route 4: create_ticket
Route 5: close_ticket
Route 6: assign_ticket
Route 7: set_priority
Route 8: set_status
Route 9: add_tags
Route 10: remove_tags
```

**Why order matters:** Switch evaluates routes top-to-bottom and takes the FIRST match. If `ask_clarification` is last, other routes might match first.

---

### Step 5: Create Format Clarification Response Node

**Node Type:** Code (JavaScript)

**Node Name:** "Format Clarification Response"

**Code:**
```javascript
const plan = $json.plan[0];
const question = plan.question;
const channel = $json.channel;
const threadTs = $json.thread_ts;
const correlationId = $json.correlation_id;

console.log('❓ Sending clarification question to Slack:', question);

return [{
  json: {
    text: `❓ ${question}`,
    channel: channel,
    thread_ts: threadTs,
    correlation_id: correlationId
  }
}];
```

**Where to get this code:** `workflows/Format_Clarification_Response.js`

---

### Step 6: Connect the Flow

**From:** Switch Router → Route 0 (ask_clarification)
**To:** Format Clarification Response

**From:** Format Clarification Response
**To:** Your Slack reply node (probably called "Slack" or "Send to Slack")

**From:** Slack reply node
**To:** Nothing (END - workflow stops here)

---

## 🌳 Visual Flow Diagram

```
Handle Plan Response
        ↓
   Switch Router
        ├─ Route 0: ask_clarification ──→ Format Clarification Response ──→ Slack Reply ──→ END
        │
        ├─ Route 1: list_tickets ──→ Normalize Step ──→ List Tickets ──→ [continues...]
        │
        ├─ Route 2: search_tickets ──→ Normalize Step ──→ Search Tickets ──→ [continues...]
        │
        ├─ Route 3: get_ticket ──→ Normalize Step ──→ Get Ticket ──→ [continues...]
        │
        └─ ... (other routes)
```

---

## 🧪 Testing the Setup

### Test 1: Incomplete Command (Should Trigger Clarification)

**Command:** `"add a tag to ticket 234945454"`

**Expected Flow:**
1. Build OpenAI Request → Creates request with 11 functions
2. OpenAI Structured Output → Returns: `{content: "What tag would you like to add?"}`
3. Handle Plan Response → Creates: `{action: "ask_clarification", question: "What tag..."}`
4. Switch Router → Routes to Route 0 (ask_clarification)
5. Format Clarification Response → Formats: `{text: "❓ What tag...", channel: "...", thread_ts: "..."}`
6. Slack Reply → Sends to Slack
7. Workflow ends

**What you should see in Slack:**
```
❓ What tag would you like to add to ticket 234945454?
```

**Workflow status:** Should show green checkmark (success) and END at Slack Reply node

---

### Test 2: Complete Command (Should NOT Trigger Clarification)

**Command:** `"show me open tickets"`

**Expected Flow:**
1. Build OpenAI Request → Creates request
2. OpenAI Structured Output → Returns: `{tool_calls: [{function: {name: "list_tickets", arguments: {status: "open"}}}]}`
3. Handle Plan Response → Creates: `{action: "list_tickets", status: "open"}`
4. Switch Router → Routes to Route 1 (list_tickets) - SKIPS Route 0
5. Normalize Step → Normalizes data
6. List Tickets → Executes Gorgias API call
7. [Rest of workflow continues normally...]

**What you should see:** Normal list_tickets response (not clarification)

---

## ✅ Verification Checklist

Before testing, verify:

- [ ] Route 0 exists in Switch Router
- [ ] Route 0 condition is: `{{ $json.plan[0].action === "ask_clarification" }}`
- [ ] Route 0 is the FIRST route (top of the list)
- [ ] Format Clarification Response node exists
- [ ] Format Clarification Response has correct code
- [ ] Format Clarification Response is connected to Slack Reply
- [ ] Slack Reply is connected to nothing (endpoint)
- [ ] Other routes (list_tickets, search_tickets, etc.) still exist and work

---

## 🚨 Common Issues & Troubleshooting

### Issue 1: Clarification Not Being Detected

**Symptom:** Incomplete commands don't trigger clarification, workflow continues to execute action with empty params

**Cause:** Route 0 is not first in the list

**Fix:** Reorder routes so `ask_clarification` is Route 0 (top)

**How to check:**
1. Open Switch Router
2. Look at route order
3. Drag `ask_clarification` route to the top if it's not already there

---

### Issue 2: Workflow Continues After Clarification

**Symptom:** Clarification question sent to Slack, but workflow continues executing other nodes

**Cause:** Format Clarification Response or Slack Reply is connected to more nodes instead of ending

**Fix:**
1. Click Format Clarification Response node
2. Look at output connections
3. Should only connect to Slack Reply, nothing else
4. Click Slack Reply node
5. Should have no output connections (dead end)

---

### Issue 3: Route Not Matching

**Symptom:** Switch Router shows "Fallback" or goes to wrong route

**Cause:** Expression syntax wrong or accessing wrong field

**Fix:** Use exact expression:
```javascript
{{ $json.plan[0].action === "ask_clarification" }}
```

**Not:**
- `{{ $json.action === "ask_clarification" }}` ❌ (missing .plan[0])
- `{{ $json.plan.action === "ask_clarification" }}` ❌ (plan is array, need [0])

---

### Issue 4: Error in Format Clarification Response

**Symptom:** Node throws error about undefined `question` or `channel`

**Cause:** Data structure mismatch

**Fix:** Check Handle Plan Response output - should have:
```json
{
  "plan": [{
    "action": "ask_clarification",
    "question": "What tag..."
  }],
  "channel": "C09BXTD0WR0",
  "thread_ts": "1762368832.302499",
  "correlation_id": "corr_..."
}
```

If missing fields, check Handle Plan Response code is correct.

---

## 🎯 Success Criteria

You'll know it's working when:

1. **Incomplete command:** Sends clarification question to Slack, workflow ends
2. **Complete command:** Executes action normally, no clarification sent
3. **Switch Router Route 0:** Always evaluated first
4. **No errors:** All nodes execute successfully

---

## 📸 Visual Reference - Switch Router UI

In n8n, your Switch Router should look like:

```
┌─────────────────────────────────────────────┐
│  Switch Router                              │
├─────────────────────────────────────────────┤
│                                             │
│  Mode: [Rules ▼]                            │
│                                             │
│  ┌─ Route 0 ─────────────────────────────┐ │
│  │ {{ $json.plan[0].action === "ask_c... │ │
│  │ [ask_clarification]                    │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ Route 1 ─────────────────────────────┐ │
│  │ {{ $json.plan[0].action === "list_... │ │
│  │ [list_tickets]                         │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ Route 2 ─────────────────────────────┐ │
│  │ {{ $json.plan[0].action === "searc... │ │
│  │ [search_tickets]                       │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ... (more routes)                          │
│                                             │
│  [+ Add Routing Rule]                       │
└─────────────────────────────────────────────┘
```

**Key:** Route 0 at the top!

---

## 🔄 What Happens Next (After Setup)

Once this is working:

### Scenario 1: User Provides Incomplete Info
```
User: "add a tag to ticket 12345"
  ↓
Slack: "❓ What tag would you like to add to ticket 12345?"
  ↓
User must provide complete command next time
```

### Scenario 2: User Provides Complete Info
```
User: "add billing tag to ticket 12345"
  ↓
Executes add_tags action
  ↓
Slack: "✅ Added billing tag to ticket 12345"
```

---

## 📝 Notes

- **Workflow stops after clarification** - User must provide complete command in next message
- **No conversation memory yet** - Phase 2 feature
- **ask_clarification must be Route 0** - Order matters!
- **Test both scenarios** - Incomplete and complete commands

---

## 🚀 Ready to Configure?

**Follow steps 1-6 above**, then test with:
- `"add a tag to ticket 234945454"` (incomplete - should clarify)
- `"show me open tickets"` (complete - should execute)

**Report back:** Did clarification question appear in Slack? ✅

---

**Last Updated:** November 5, 2025
