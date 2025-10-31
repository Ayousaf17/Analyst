# HTTP Nodes Implementation Guide - Step by Step

**Date:** October 31, 2025
**Goal:** Refine 24 HTTP nodes down to 13 essential nodes
**Time:** ~1 hour

---

## 📋 Implementation Checklist

### Phase 1: Update Flexible Nodes ⚙️
- [ ] Update list_tickets with dynamic parameters
- [ ] Rename add_tags → update_tags
- [ ] Update find_user (if name search is supported)

### Phase 2: Delete Redundant Nodes 🗑️
- [ ] Delete close_ticket
- [ ] Delete search_tickets_by_email
- [ ] Delete list_metrics
- [ ] Delete remove_tags

### Phase 3: Delete Unnecessary Nodes 🗑️
- [ ] Delete list_views
- [ ] Delete get_view_items
- [ ] Delete list_tags
- [ ] Delete list_macros
- [ ] Delete list_integrations

### Phase 4: Update Routing & Plan AI 🔄
- [ ] Update Switch node routing
- [ ] Update Plan AI action list
- [ ] Test all natural language commands

---

## 🔧 PHASE 1: Update Flexible Nodes

### Step 1.1: Update `list_tickets` Node

**Open the node in n8n and update these fields:**

**Query Parameters → Replace with:**

```javascript
// Parameter 1
name: customer_email
value: ={{ $json.customer_email || '' }}

// Parameter 2
name: assignee_email
value: ={{ $json.assignee_email || '' }}

// Parameter 3
name: status
value: ={{ $json.status || '' }}

// Parameter 4
name: priority
value: ={{ $json.priority || '' }}

// Parameter 5
name: limit
value: ={{ $json.limit || 100 }}

// Parameter 6
name: order_by
value: ={{ $json.order_by || 'created_datetime:desc' }}
```

**What this does:**
- Accepts dynamic filters from Plan AI
- Falls back to sensible defaults if not provided
- One node handles all list/filter/metrics use cases

**Test after updating:**
```
"show me open tickets"
"show john@email.com's tickets"
"who are my best agents"
"show urgent tickets"
```

---

### Step 1.2: Rename `add_tags` → `update_tags`

**In n8n:**
1. Click on the `add_tags` node
2. Change the node name from "add_tags" to "update_tags"
3. Save

**Note:** The code stays the same! It already accepts a tags array. The AI will generate the full tags array (with tags added or removed).

---

### Step 1.3: Update `find_user` Node (Optional)

**Check if Gorgias API supports name search:**

If the `/api/users` endpoint supports searching by name, update Query Parameters:

```javascript
// Parameter 1
name: email
value: ={{ $json.email || '' }}

// Parameter 2 (NEW)
name: name
value: ={{ $json.name || '' }}

// Parameter 3
name: limit
value: 50
```

**If Gorgias doesn't support name search:**
- Keep as is (email only)
- Document that name searches need to go through customers, not users
- Update Plan AI to route name searches to list_customers + filter

---

## 🗑️ PHASE 2: Delete Redundant Nodes

### Step 2.1: Delete `close_ticket`

**Why:** Redundant with `set_status`

**In n8n:**
1. Click on `close_ticket` node
2. Press Delete key or right-click → Delete
3. Confirm deletion

**Replacement:** When Plan AI outputs `close_ticket` action, Switch routes to `set_status` node (we'll update routing in Phase 4)

---

### Step 2.2: Delete `search_tickets_by_email`

**Why:** Redundant with flexible `list_tickets`

**In n8n:**
1. Click on `search_tickets_by_email` node
2. Delete
3. Confirm

**Replacement:** `list_tickets(customer_email="...")` handles this

---

### Step 2.3: Delete `list_metrics`

**Why:** Identical to `list_tickets` (AI does the analysis)

**In n8n:**
1. Click on `list_metrics` node
2. Delete
3. Confirm

**Replacement:** When Plan AI outputs `list_metrics` action, Switch routes to `list_tickets` node (AI analyzes the results)

---

### Step 2.4: Delete `remove_tags`

**Why:** Merged into `update_tags`

**In n8n:**
1. Click on `remove_tags` node
2. Delete
3. Confirm

**Replacement:** `update_tags` handles both add and remove operations

---

## 🗑️ PHASE 3: Delete Unnecessary Nodes

These nodes aren't needed for natural language agent use cases:

### Delete These Nodes:
1. **list_views** - Views are UI-specific
2. **get_view_items** - Views are UI-specific
3. **list_tags** - Tags visible in ticket data
4. **list_macros** - AI generates responses dynamically
5. **list_integrations** - Admin/config, not user-facing

**For each node:**
1. Click on the node
2. Press Delete
3. Confirm deletion

---

## 🔄 PHASE 4: Update Routing & Plan AI

### Step 4.1: Update Switch Node Routing

**Find your Switch node** (the one that routes actions to HTTP nodes)

**Update the routing logic** to handle consolidated actions:

**If you're using a Switch (if/else) node:**

Add these routing rules:

```javascript
// Route metrics to list_tickets
if ($json.action === 'list_metrics') {
  return { json: $json, route: 'list_tickets' };
}

// Route close_ticket to set_status
if ($json.action === 'close_ticket') {
  return { json: { ...$json, status: 'closed' }, route: 'set_status' };
}

// Route remove_tags to update_tags
if ($json.action === 'remove_tags' || $json.action === 'add_tags') {
  return { json: $json, route: 'update_tags' };
}

// Route search_tickets_by_email to list_tickets
if ($json.action === 'search_tickets_by_email') {
  return { json: $json, route: 'list_tickets' };
}

// Default routing
const actionMap = {
  'get_ticket': 'get_ticket',
  'list_tickets': 'list_tickets',
  'search_tickets': 'search',
  'create_ticket': 'create_ticket',
  'set_status': 'set_status',
  'set_priority': 'set_priority',
  'assign_ticket': 'assign_ticket',
  'update_tags': 'update_tags',
  'reply_public': 'reply_public',
  'comment_internal': 'comment_internal',
  'get_customer': 'get_customer',
  'list_customers': 'list_customers',
  'find_user': 'find_user'
};

const route = actionMap[$json.action] || 'list_tickets';
return { json: $json, route: route };
```

**OR if you're using n8n's native Switch node:**

Update output routes to point to the correct nodes:
- Output 0: get_ticket
- Output 1: list_tickets (handles list_tickets, list_metrics, search_tickets_by_email)
- Output 2: search
- Output 3: create_ticket
- Output 4: set_status (handles set_status, close_ticket)
- Output 5: set_priority
- Output 6: assign_ticket
- Output 7: update_tags (handles update_tags, add_tags, remove_tags)
- Output 8: reply_public
- Output 9: comment_internal
- Output 10: get_customer
- Output 11: list_customers
- Output 12: find_user

---

### Step 4.2: Update Plan AI System Message

**Open your Plan AI Agent node (OpenAI Structured Output)**

**Find the "Available Actions" section** in the system message

**Replace it with:**

```
═══════════════════════════════════════════════════════════════════
AVAILABLE ACTIONS (13 Core Actions)
═══════════════════════════════════════════════════════════════════

**Ticket Operations:**
1. get_ticket - Get single ticket by ID
   Parameters: ticket_id (required)
   Example: {"action": "get_ticket", "ticket_id": "234136710"}

2. list_tickets - List tickets with optional filters
   Parameters: customer_email, assignee_email, status, priority, limit (all optional)
   Example: {"action": "list_tickets", "status": "open", "limit": 50}
   Example: {"action": "list_tickets", "customer_email": "john@email.com"}

3. search_tickets - Full-text search across tickets
   Parameters: query (required)
   Example: {"action": "search_tickets", "query": "billing"}

4. create_ticket - Create new ticket
   Parameters: customer_email, subject, message, priority (optional)
   Example: {"action": "create_ticket", "customer_email": "...", "subject": "...", "message": "..."}

5. set_status - Set ticket status
   Parameters: ticket_id, status (open, closed, spam)
   Example: {"action": "set_status", "ticket_id": "12345", "status": "closed"}
   Note: For "close ticket X", use set_status with status="closed"

6. set_priority - Set ticket priority
   Parameters: ticket_id, priority (low, normal, high, urgent)
   Example: {"action": "set_priority", "ticket_id": "12345", "priority": "urgent"}

**Ticket Modifications:**
7. assign_ticket - Assign ticket to agent
   Parameters: ticket_id, assignee_user_id or assignee_email
   Example: {"action": "assign_ticket", "ticket_id": "12345", "assignee_email": "agent@email.com"}

8. update_tags - Add or update ticket tags
   Parameters: ticket_id, tags (array or comma-separated)
   Example: {"action": "update_tags", "ticket_id": "12345", "tags": ["urgent", "billing"]}

9. reply_public - Send public reply to ticket
   Parameters: ticket_id, message
   Example: {"action": "reply_public", "ticket_id": "12345", "message": "Thank you..."}

10. comment_internal - Add internal note to ticket
    Parameters: ticket_id, note or message
    Example: {"action": "comment_internal", "ticket_id": "12345", "note": "Customer called..."}

**Customer/User Operations:**
11. get_customer - Get customer by ID
    Parameters: customer_id
    Example: {"action": "get_customer", "customer_id": "12345"}

12. list_customers - List all customers
    Parameters: limit (optional)
    Example: {"action": "list_customers", "limit": 50}

13. find_user - Find agent/user by email or name
    Parameters: email or name
    Example: {"action": "find_user", "email": "agent@email.com"}
    Example: {"action": "find_user", "name": "Spencer"}

**Special Actions:**
- list_metrics - Get performance stats/analytics
  Note: This uses list_tickets to fetch data, then AI analyzes it
  Example: {"action": "list_metrics"} (routes to list_tickets with limit=100)
  The Conversational AI will calculate stats, group by assignee, rank performance

═══════════════════════════════════════════════════════════════════
```

**Key changes:**
- Updated action list to 13 core actions
- Added note that `close_ticket` should use `set_status`
- Added note that `list_metrics` uses `list_tickets` + AI analysis
- Updated examples to show flexible parameters

---

## ✅ PHASE 5: Testing

After all changes, test these natural language commands:

### Test 1: Flexible list_tickets
```
"show me open tickets"
Expected: list_tickets(status="open")

"show john@email.com's tickets"
Expected: list_tickets(customer_email="john@email.com")

"show urgent tickets"
Expected: list_tickets(priority="urgent")

"show tickets assigned to spencer@email.com"
Expected: list_tickets(assignee_email="spencer@email.com")
```

### Test 2: Metrics routing
```
"who are my best agents"
Expected: list_metrics → routes to list_tickets → AI analyzes

"how many tickets today"
Expected: list_metrics → routes to list_tickets → AI calculates
```

### Test 3: Close ticket routing
```
"close ticket 12345"
Expected: close_ticket → routes to set_status(status="closed")
```

### Test 4: Tags routing
```
"tag ticket 12345 with urgent"
Expected: add_tags → routes to update_tags
```

### Test 5: General operations
```
"get ticket 234136710"
Expected: get_ticket → works normally

"search tickets about billing"
Expected: search_tickets → works normally

"assign ticket 12345 to spencer@email.com"
Expected: assign_ticket → works normally
```

---

## 🎯 Final State

**Before:** 24 HTTP nodes (cluttered, redundant)
**After:** 13 HTTP nodes (clean, flexible)

**Removed Nodes:**
- close_ticket (use set_status)
- search_tickets_by_email (use list_tickets)
- list_metrics (use list_tickets)
- remove_tags (use update_tags)
- list_views, get_view_items (not needed)
- list_tags, list_macros, list_integrations (not needed)

**Updated Nodes:**
- list_tickets (now flexible with dynamic filters)
- update_tags (renamed from add_tags, handles both operations)

**Routing:**
- Switch node maps old actions to new consolidated nodes
- Plan AI knows the 13 core actions

---

## 🚨 Troubleshooting

### Issue: "Action not found" errors
**Solution:** Check Switch node routing - ensure old action names map to new nodes

### Issue: list_tickets not filtering properly
**Solution:** Verify query parameters use `{{ $json.parameter_name || '' }}` syntax

### Issue: Metrics queries show ticket list instead of analysis
**Solution:** Check Conversational AI system message - ensure metrics handling section exists

### Issue: Tags not updating
**Solution:** Verify update_tags node accepts tags as array, AI generates full tag array

---

## 📝 Rollback Plan

If something breaks:

1. **Stop workflow**
2. **Re-import backup JSON** (you did backup first, right?)
3. **Identify which change caused the issue**
4. **Apply changes incrementally** instead of all at once

**Recommended approach:** Apply changes in phases, test after each phase

---

## ✅ Done!

After completing all phases:
- ✅ Simpler workflow (13 nodes vs 24)
- ✅ More flexible (dynamic parameters)
- ✅ Easier to maintain
- ✅ All natural language use cases work
- ✅ AI does the intelligence, nodes just execute

---

**Ready to implement? Let's start with Phase 1! 🚀**
