# Switch Node Setup Guide - Step by Step

**Date:** October 31, 2025
**Goal:** Configure n8n Switch node to route actions to 13 HTTP nodes
**Time:** 15-20 minutes

---

## 🎯 What the Switch Node Does

The Switch node receives the Plan AI output (action + parameters) and routes it to the correct HTTP node based on the action name.

**Input from Plan AI:**
```json
{
  "step": 1,
  "action": "get_ticket",
  "ticket_id": "234136710"
}
```

**Switch node decision:** "action = get_ticket → route to Output 0 → HTTP: get_ticket node"

---

## 📋 Step-by-Step Setup

### Step 1: Open Your Switch Node

1. In your n8n workflow, find the **Switch** node
2. Double-click to open the configuration
3. You should see "Mode: Rules" or "Mode: Expression"
   - If you see "Mode: Rules" → Perfect! Continue below
   - If you see "Mode: Expression" → Switch to "Rules" mode

---

### Step 2: Configure Switch Mode

**In the Switch node settings:**

1. **Mode:** Rules
2. **Property Name:** `action` (or `{{ $json.action }}`)
   - This tells the Switch to look at the "action" field in the incoming data

---

### Step 3: Add 13 Routing Rules (Outputs)

You'll create 13 outputs, one for each HTTP node. Here's the exact configuration:

---

#### **Output 0: get_ticket**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `get_ticket`
- **Output:** 0

**Connects to:** HTTP: get_ticket node

---

#### **Output 1: list_tickets**

**Click "Add Routing Rule"**

- **Operation:** Any of (or "is in array")
- **Value:** `list_tickets, list_metrics, search_tickets_by_email`

  **OR if "Any of" isn't available, create 3 separate rules:**
  - Rule 1: Equal → `list_tickets` → Output 1
  - Rule 2: Equal → `list_metrics` → Output 1
  - Rule 3: Equal → `search_tickets_by_email` → Output 1

**Connects to:** HTTP: list_tickets node

**Why multiple actions?**
- `list_tickets` → direct route
- `list_metrics` → same node, AI does analysis
- `search_tickets_by_email` → same as list_tickets with customer_email filter

---

#### **Output 2: search**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `search_tickets`

**Connects to:** HTTP: search node

---

#### **Output 3: create_ticket**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `create_ticket`

**Connects to:** HTTP: create_ticket node

---

#### **Output 4: set_status**

**Click "Add Routing Rule"**

- **Operation:** Any of
- **Value:** `set_status, close_ticket`

  **OR create 2 separate rules:**
  - Rule 1: Equal → `set_status` → Output 4
  - Rule 2: Equal → `close_ticket` → Output 4

**Connects to:** HTTP: set_status node

**Why multiple actions?**
- `set_status` → direct route
- `close_ticket` → just a status change to "closed"

**IMPORTANT:** If routing `close_ticket` to this node, you need a small transformation:

**Add a Code node BEFORE set_status** (optional but recommended):

```javascript
// Transform close_ticket to set_status
const data = $json;

if (data.action === 'close_ticket') {
  return [{
    json: {
      ...data,
      action: 'set_status',
      status: 'closed'
    }
  }];
}

return [{ json: data }];
```

**OR** update the set_status HTTP node to handle both:

```javascript
// In set_status HTTP node body:
{
  "status": "{{ $json.status || ($json.action === 'close_ticket' ? 'closed' : '') }}"
}
```

---

#### **Output 5: set_priority**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `set_priority`

**Connects to:** HTTP: set_priority node

---

#### **Output 6: assign_ticket**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `assign_ticket`

**Connects to:** HTTP: assign_ticket node

---

#### **Output 7: update_tags**

**Click "Add Routing Rule"**

- **Operation:** Any of
- **Value:** `update_tags, add_tags, remove_tags`

  **OR create 3 separate rules:**
  - Rule 1: Equal → `update_tags` → Output 7
  - Rule 2: Equal → `add_tags` → Output 7
  - Rule 3: Equal → `remove_tags` → Output 7

**Connects to:** HTTP: update_tags node

**Why multiple actions?**
- All tag operations use the same HTTP endpoint
- AI generates the full tags array (with tags added or removed)

---

#### **Output 8: reply_public**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `reply_public`

**Connects to:** HTTP: reply_public node

---

#### **Output 9: comment_internal**

**Click "Add Routing Rule"**

- **Operation:** Any of
- **Value:** `comment_internal, add_note`

  **OR create 2 separate rules:**
  - Rule 1: Equal → `comment_internal` → Output 9
  - Rule 2: Equal → `add_note` → Output 9

**Connects to:** HTTP: comment_internal node

**Why multiple actions?**
- `comment_internal` and `add_note` mean the same thing

---

#### **Output 10: get_customer**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `get_customer`

**Connects to:** HTTP: get_customer node

---

#### **Output 11: list_customers**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `list_customers`

**Connects to:** HTTP: list_customers node

---

#### **Output 12: find_user**

**Click "Add Routing Rule"**

- **Operation:** Equal
- **Value:** `find_user`

**Connects to:** HTTP: find_user node

---

### Step 4: Set Default/Fallback Output

**At the bottom of the Switch node:**

- **Enable "Fallback Output"** (checkbox)
- **Fallback Output:** Output 1 (list_tickets)

**Why?** If the action doesn't match any rule, default to showing open tickets (safe fallback).

---

### Step 5: Connect Switch Outputs to HTTP Nodes

**After configuring all rules, connect each output:**

1. **Click on the Switch node**
2. You'll see 13+ connection dots on the right side (one per output)
3. **Drag from each output dot to the corresponding HTTP node:**

```
Switch Output 0  →  HTTP: get_ticket
Switch Output 1  →  HTTP: list_tickets
Switch Output 2  →  HTTP: search
Switch Output 3  →  HTTP: create_ticket
Switch Output 4  →  HTTP: set_status
Switch Output 5  →  HTTP: set_priority
Switch Output 6  →  HTTP: assign_ticket
Switch Output 7  →  HTTP: update_tags
Switch Output 8  →  HTTP: reply_public
Switch Output 9  →  HTTP: comment_internal
Switch Output 10 →  HTTP: get_customer
Switch Output 11 →  HTTP: list_customers
Switch Output 12 →  HTTP: find_user
```

---

## 🎨 Visual Layout Recommendation

Arrange your nodes in n8n like this for clarity:

```
Plan AI Agent
     ↓
[Split Steps] (if multi-step)
     ↓
  SWITCH NODE
     ↓ (13 outputs)
     ├→ Output 0  → [get_ticket]
     ├→ Output 1  → [list_tickets] ← handles list_tickets, list_metrics, search_tickets_by_email
     ├→ Output 2  → [search]
     ├→ Output 3  → [create_ticket]
     ├→ Output 4  → [set_status] ← handles set_status, close_ticket
     ├→ Output 5  → [set_priority]
     ├→ Output 6  → [assign_ticket]
     ├→ Output 7  → [update_tags] ← handles update_tags, add_tags, remove_tags
     ├→ Output 8  → [reply_public]
     ├→ Output 9  → [comment_internal]
     ├→ Output 10 → [get_customer]
     ├→ Output 11 → [list_customers]
     └→ Output 12 → [find_user]
```

**All HTTP nodes connect to → Format Log / Summarize Results**

---

## 📋 Quick Reference: Action → Output Mapping

| Action(s) | Output | HTTP Node |
|-----------|--------|-----------|
| get_ticket | 0 | get_ticket |
| list_tickets, list_metrics, search_tickets_by_email | 1 | list_tickets |
| search_tickets | 2 | search |
| create_ticket | 3 | create_ticket |
| set_status, close_ticket | 4 | set_status |
| set_priority | 5 | set_priority |
| assign_ticket | 6 | assign_ticket |
| update_tags, add_tags, remove_tags | 7 | update_tags |
| reply_public | 8 | reply_public |
| comment_internal, add_note | 9 | comment_internal |
| get_customer | 10 | get_customer |
| list_customers | 11 | list_customers |
| find_user | 12 | find_user |

---

## 🔧 Alternative: Using IF/Code Node for Routing

If you prefer more control, you can replace the Switch node with a **Code node**:

```javascript
// Advanced routing with transformations
const action = $json.action;
const data = $json;

// Map actions to routes
const routeMap = {
  'get_ticket': { output: 0, node: 'get_ticket', data },
  'list_tickets': { output: 1, node: 'list_tickets', data },
  'list_metrics': { output: 1, node: 'list_tickets', data }, // Same as list_tickets
  'search_tickets_by_email': { output: 1, node: 'list_tickets', data },
  'search_tickets': { output: 2, node: 'search', data },
  'create_ticket': { output: 3, node: 'create_ticket', data },
  'set_status': { output: 4, node: 'set_status', data },
  'close_ticket': { output: 4, node: 'set_status', data: {...data, status: 'closed'} }, // Transform
  'set_priority': { output: 5, node: 'set_priority', data },
  'assign_ticket': { output: 6, node: 'assign_ticket', data },
  'update_tags': { output: 7, node: 'update_tags', data },
  'add_tags': { output: 7, node: 'update_tags', data },
  'remove_tags': { output: 7, node: 'update_tags', data },
  'reply_public': { output: 8, node: 'reply_public', data },
  'comment_internal': { output: 9, node: 'comment_internal', data },
  'add_note': { output: 9, node: 'comment_internal', data },
  'get_customer': { output: 10, node: 'get_customer', data },
  'list_customers': { output: 11, node: 'list_customers', data },
  'find_user': { output: 12, node: 'find_user', data }
};

// Get route info
const route = routeMap[action] || { output: 1, node: 'list_tickets', data }; // Default to list_tickets

// Return data for the matched output
return [{ json: route.data }];
```

**But this is more complex!** Use the native Switch node unless you need special transformations.

---

## ✅ Testing Your Switch Configuration

After setting up, test with these Plan AI outputs:

### Test 1: get_ticket
**Input:**
```json
{"action": "get_ticket", "ticket_id": "12345"}
```
**Expected:** Routes to Output 0 → HTTP: get_ticket

---

### Test 2: list_metrics
**Input:**
```json
{"action": "list_metrics"}
```
**Expected:** Routes to Output 1 → HTTP: list_tickets

---

### Test 3: close_ticket
**Input:**
```json
{"action": "close_ticket", "ticket_id": "12345"}
```
**Expected:** Routes to Output 4 → HTTP: set_status

---

### Test 4: add_tags
**Input:**
```json
{"action": "add_tags", "ticket_id": "12345", "tags": ["urgent"]}
```
**Expected:** Routes to Output 7 → HTTP: update_tags

---

## 🚨 Common Issues & Solutions

### Issue 1: "No matching rule" error
**Cause:** Action name doesn't match any Switch rule
**Solution:**
- Check spelling in Switch rules (case-sensitive!)
- Enable fallback output

### Issue 2: Multiple outputs trigger
**Cause:** Rules overlap or aren't mutually exclusive
**Solution:**
- Use "Equal" operation, not "Contains"
- Ensure each action only matches one rule

### Issue 3: close_ticket doesn't set status
**Cause:** HTTP node doesn't know to use status="closed"
**Solution:**
- Add transformation Code node before set_status
- OR update set_status HTTP node JSON body to check for close_ticket action

### Issue 4: Can't find "Any of" operation
**Solution:**
- Create multiple rules with same output number
- Rule 1: list_tickets → Output 1
- Rule 2: list_metrics → Output 1
- Rule 3: search_tickets_by_email → Output 1

---

## 📝 Checklist

After setup, verify:

- [ ] Switch node has 13+ routing rules configured
- [ ] Each output connected to correct HTTP node
- [ ] Fallback output enabled (points to list_tickets)
- [ ] Tested with at least 3 different actions
- [ ] Multi-action outputs work (list_metrics → list_tickets)
- [ ] close_ticket transforms to set_status correctly

---

## 🎯 Summary

**What you've built:**
- One Switch node that intelligently routes 16+ different actions to 13 HTTP nodes
- Consolidated routing (multiple actions → same node)
- Fallback for unknown actions
- Clean, maintainable architecture

**Next step:** Test with natural language commands through the full workflow!

---

**Need help with a specific output? Let me know which one and I'll provide detailed configuration!** 🚀
