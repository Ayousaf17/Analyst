# Switch Router Debug Guide - "Destination node not found" Error

**Error:** `Problem in node 'Route by Action' - Destination node not found`

**Node:** Format Clarification Response

**Date:** November 5, 2025

---

## 🔍 Problem Analysis

The Switch Router (Route by Action) is configured to route `ask_clarification` action to "Format Clarification Response" node, but n8n cannot find the destination node.

**What's Working:**
✅ Handle Plan Response creates correct output: `{action: "ask_clarification", question: "..."}`
✅ Format Clarification Response node exists in workflow
✅ Input data reaches the node correctly
✅ Code in Format Clarification Response is valid

**What's NOT Working:**
❌ Route by Action cannot route to Format Clarification Response
❌ Error occurs BEFORE Format Clarification Response executes
❌ No output from Format Clarification Response

---

## 🎯 Root Cause: Switch Output Configuration

In n8n Switch nodes, the **output index** must match the **routing rule order**.

### How n8n Switch Works:

```
Switch Node Outputs:
├─ Output 0 → First routing rule
├─ Output 1 → Second routing rule
├─ Output 2 → Third routing rule
└─ Output N → Fallback (if enabled)
```

### The Problem:

If you have **Route 0** for `ask_clarification` but the **connection** is on **Output 20**, n8n will look for a connection on output 0 and won't find it.

---

## 🔧 Fix Method 1: Reorder Routes (RECOMMENDED)

### Step 1: Open Route by Action Node

1. Double-click "Route by Action" node in n8n
2. Look at the routing rules list

### Step 2: Verify Route Order

Your routes should be in this exact order:

```
Route 0: ask_clarification    ← Must be FIRST!
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

### Step 3: Move ask_clarification to Top

If `ask_clarification` is NOT Route 0:

1. In the Switch node editor, find the `ask_clarification` route
2. **Drag it to the top** of the list (above all other routes)
3. Click "Execute Node" to save

### Step 4: Reconnect Output 0

1. Delete the old connection from Route by Action to Format Clarification Response
2. **Click on Route by Action node**
3. **Drag from the TOP output dot** (this is Output 0) to Format Clarification Response
4. Save workflow

---

## 🔧 Fix Method 2: Delete and Recreate Route

If dragging doesn't work, recreate the route:

### Step 1: Delete Existing ask_clarification Route

1. Open Route by Action node
2. Find the `ask_clarification` routing rule
3. Click the trash icon to delete it
4. Save

### Step 2: Add New Route at Position 0

1. Click **"Add Routing Rule"** button
2. **Important:** Add it BEFORE any other routes (at the top)
3. Configure:
   - **Mode:** Rules
   - **Condition:** `{{ $json.plan[0].action === "ask_clarification" }}`
4. Save

### Step 3: Reconnect

1. Click on Route by Action node
2. Drag from the **first output dot** (Output 0) to Format Clarification Response
3. Save workflow

---

## 🔧 Fix Method 3: Check Node Name (Case-Sensitive)

Node names in n8n are **case-sensitive** and must match EXACTLY.

### Step 1: Verify Node Name

1. Click on the node in the canvas
2. Look at the top of the node properties panel
3. The name field should show: **Format Clarification Response**

### Step 2: Check for Typos

Common issues:
- Extra spaces: "Format Clarification Response " (trailing space)
- Wrong case: "format clarification response"
- Underscore vs space: "Format_Clarification_Response"

### Step 3: Rename if Needed

If the name doesn't match exactly:

1. Click the node
2. Edit the name field to: `Format Clarification Response` (exact match)
3. Save workflow

---

## 🔧 Fix Method 4: Recreate Format Clarification Response Node

If all else fails, delete and recreate the node:

### Step 1: Copy the Code

1. Open Format Clarification Response node
2. Copy all the code
3. Or refer to: `workflows/Format_Clarification_Response.js`

### Step 2: Delete Old Node

1. Click Format Clarification Response node
2. Press Delete key
3. Confirm deletion

### Step 3: Create New Node

1. Click "+" button in n8n
2. Search for "Code"
3. Select "Code" (JavaScript)
4. Name it: **Format Clarification Response** (exact name)

### Step 4: Paste Code

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

### Step 5: Reconnect Everything

1. Route by Action (Output 0) → Format Clarification Response
2. Format Clarification Response → Final Slack Reply
3. Save workflow

---

## 🧪 How to Test Which Output is Being Used

### Test with Console Logs:

Add this to the TOP of Format Clarification Response code:

```javascript
console.log('🎯 Format Clarification Response EXECUTED');
console.log('📥 Input:', JSON.stringify($json, null, 2));

// Rest of your code...
```

Then run the workflow and check the logs:

- **If you see the log:** The connection works, problem is elsewhere
- **If you DON'T see the log:** The connection is not being used (wrong output index)

---

## 📋 Verification Checklist

After making changes, verify:

- [ ] ask_clarification is Route 0 (first in the list)
- [ ] Route by Action has output connection from **Output 0** (first dot)
- [ ] Output 0 connects to node named exactly: "Format Clarification Response"
- [ ] Format Clarification Response node is NOT disabled
- [ ] Format Clarification Response connects to Final Slack Reply
- [ ] No typos in node name (case-sensitive)
- [ ] Workflow saved after all changes

---

## 🔍 Diagnostic: Export Current Configuration

To help debug, you can export the Route by Action node configuration:

### Step 1: Open Route by Action Node

Double-click the node

### Step 2: Copy Routing Rules

For EACH routing rule, note:
1. Rule number (0, 1, 2, etc.)
2. Condition expression
3. Which action it's checking for

**Example:**
```
Route 0: {{ $json.plan[0].action === "ask_clarification" }}
Route 1: {{ $json.plan[0].action === "list_tickets" }}
Route 2: {{ $json.plan[0].action === "search_tickets" }}
...
```

### Step 3: Check Output Connections

1. Click on Route by Action node
2. Count the output dots from top to bottom
3. Note which output has a line connecting to Format Clarification Response

**Should be:** Output 0 (the FIRST dot) → Format Clarification Response

---

## ⚠️ Common Mistakes

### Mistake 1: ask_clarification Not First
**Symptom:** Error "Destination node not found"
**Fix:** Move ask_clarification route to position 0 (top of list)

### Mistake 2: Connected to Wrong Output
**Symptom:** Error "Destination node not found"
**Fix:** Delete connection, reconnect from Output 0 (first dot)

### Mistake 3: Node Name Mismatch
**Symptom:** Error "Destination node not found"
**Fix:** Rename node to exactly "Format Clarification Response"

### Mistake 4: Node Disabled
**Symptom:** Node grayed out, workflow skips it
**Fix:** Right-click node → Enable

---

## 🎯 Expected Behavior After Fix

Once fixed, the workflow should:

1. **User types:** "add a tag to ticket 234945454"
2. **Handle Plan Response output:** `{action: "ask_clarification", question: "What tag..."}`
3. **Route by Action:** Routes to Output 0 → Format Clarification Response ✅
4. **Format Clarification Response:** Formats: `{text: "❓ What tag...", channel: "...", thread_ts: "..."}`
5. **Final Slack Reply:** Sends message to Slack
6. **Workflow ends successfully** ✅

---

## 📸 Visual Reference

Your Route by Action should look like this:

```
┌─────────────────────────────────────────┐
│  Route by Action                        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Route 0 (Output 0) ──────────────┐ │
│  │ ask_clarification                  │ ├──→ Format Clarification Response
│  └────────────────────────────────────┘ │
│                                         │
│  ┌─ Route 1 (Output 1) ──────────────┐ │
│  │ list_tickets                       │ ├──→ Normalize Step (List)
│  └────────────────────────────────────┘ │
│                                         │
│  ┌─ Route 2 (Output 2) ──────────────┐ │
│  │ search_tickets                     │ ├──→ Normalize Step (Search)
│  └────────────────────────────────────┘ │
│                                         │
│  ... (more routes)                      │
│                                         │
└─────────────────────────────────────────┘
```

**Key:** Output 0 is the TOP dot on the node!

---

## 🚀 Quick Fix Summary

**Most Common Fix (90% of cases):**

1. Open Route by Action node
2. Drag `ask_clarification` route to the TOP (Route 0)
3. Delete old connection
4. Reconnect from **Output 0** (first dot) to Format Clarification Response
5. Save workflow
6. Test with: "add a tag to ticket 234945454"

---

**Last Updated:** November 5, 2025
