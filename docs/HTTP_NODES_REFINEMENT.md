# HTTP Nodes Refinement - Remove Redundancy

**Date:** October 31, 2025
**Goal:** Simplify HTTP nodes by removing redundant endpoints and focusing on core natural language use cases

---

## 🔍 Current State Analysis

You have **24 HTTP nodes**, but many are redundant or not needed for natural language interactions.

### Redundancies Found:

1. **close_ticket** → Redundant with **set_status**
2. **search_tickets_by_email** → Redundant with **list_tickets** (just add customer_email query param)
3. **list_metrics** → Identical to **list_tickets** (same API call, just different intent)
4. **add_tags** vs **remove_tags** → Same node, different parameters

### Rarely Needed for NL Use Cases:

5. **list_views** → Views are UI-specific, not needed for AI agent
6. **get_view_items** → Views are UI-specific
7. **list_tags** → Tags can be seen in ticket data
8. **list_macros** → Macros are templates, not needed for dynamic AI
9. **list_integrations** → Admin/config, not user-facing

---

## ✅ RECOMMENDED: Core HTTP Nodes (13 nodes)

Keep these nodes that support natural language operations:

### **Ticket Operations (6 nodes)**
1. ✅ **get_ticket** - GET /tickets/{ticket_id}
2. ✅ **list_tickets** - GET /tickets (with flexible query params)
3. ✅ **search** - POST /search (full-text search)
4. ✅ **create_ticket** - POST /tickets
5. ✅ **set_status** - PUT /tickets/{ticket_id} (handles open/closed/spam/etc.)
6. ✅ **set_priority** - PUT /tickets/{ticket_id} (set priority)

### **Ticket Modifications (3 nodes)**
7. ✅ **assign_ticket** - PUT /tickets/{ticket_id} (assign to agent)
8. ✅ **update_tags** - PUT /tickets/{ticket_id} (handle both add/remove tags)
9. ✅ **reply_public** - POST /tickets/{ticket_id}/messages (public reply)
10. ✅ **comment_internal** - POST /tickets/{ticket_id}/messages (internal note)

### **Customer/User Operations (3 nodes)**
11. ✅ **get_customer** - GET /customers/{customer_id}
12. ✅ **list_customers** - GET /customers
13. ✅ **find_user** - GET /users (find agents by email/name)

---

## ❌ REMOVE: Redundant/Unnecessary Nodes (11 nodes)

### Remove These:

1. ❌ **close_ticket** → Use set_status(status="closed") instead
2. ❌ **search_tickets_by_email** → Use list_tickets(customer_email="...") instead
3. ❌ **list_metrics** → Use list_tickets (Conversational AI does the analysis)
4. ❌ **remove_tags** → Merge with add_tags into single update_tags node
5. ❌ **list_views** → Not needed for NL agent
6. ❌ **get_view_items** → Not needed for NL agent
7. ❌ **list_tags** → Tags visible in ticket data
8. ❌ **list_macros** → Not needed (AI generates responses dynamically)
9. ❌ **list_integrations** → Admin-only, not user-facing

**Result:** 24 nodes → 13 nodes (54% reduction!)

---

## 🔧 Required Node Updates

### 1. **list_tickets** - Make It Flexible

**Current:** Hardcoded limit=100, order_by=created_datetime:desc

**Updated:** Accept dynamic parameters from Plan AI

```javascript
{
  "parameters": {
    "url": "https://ironsidecomputers.gorgias.com/api/tickets",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpBasicAuth",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        {
          "name": "customer_email",
          "value": "={{ $json.customer_email || '' }}"
        },
        {
          "name": "assignee_email",
          "value": "={{ $json.assignee_email || '' }}"
        },
        {
          "name": "status",
          "value": "={{ $json.status || '' }}"
        },
        {
          "name": "priority",
          "value": "={{ $json.priority || '' }}"
        },
        {
          "name": "limit",
          "value": "={{ $json.limit || 100 }}"
        },
        {
          "name": "order_by",
          "value": "={{ $json.order_by || 'created_datetime:desc' }}"
        }
      ]
    },
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Accept",
          "value": "application/json"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "options": {
      "response": {
        "response": {
          "fullResponse": true,
          "responseFormat": "json"
        }
      }
    }
  }
}
```

**Why:** One flexible node handles all these use cases:
- "show me open tickets" → list_tickets(status="open")
- "show john@email.com's tickets" → list_tickets(customer_email="john@email.com")
- "show tickets assigned to spencer" → list_tickets(assignee_email="spencer@...")
- "show urgent tickets" → list_tickets(priority="urgent")
- "who are my best agents" → list_tickets(limit=100) + AI analysis

---

### 2. **update_tags** - Replace add_tags and remove_tags

**Why:** Tags are managed via PUT with the full tags array. Whether adding or removing, you send the complete updated tags array.

**Updated Node:**

```javascript
{
  "parameters": {
    "method": "PUT",
    "url": "https://ironsidecomputers.gorgias.com/api/tickets/{{$json.ticket_id}}",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpBasicAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Accept",
          "value": "application/json"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ { tags: Array.isArray($json.tags) ? $json.tags.map(t => ({name: String(t)})) : ($json.tags ? [{name: String($json.tags)}] : []) } }}",
    "options": {
      "response": {
        "response": {
          "fullResponse": true,
          "responseFormat": "json"
        }
      }
    }
  },
  "name": "update_tags"
}
```

**How to use:**
- Add tags: Plan AI outputs tags array with new tags included
- Remove tags: Plan AI outputs tags array with tags excluded
- AI handles the logic, node just updates

---

### 3. **find_user** - Make It More Flexible

**Current:** Only searches by email

**Updated:** Search by email OR name

```javascript
{
  "parameters": {
    "url": "https://ironsidecomputers.gorgias.com/api/users",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpBasicAuth",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        {
          "name": "email",
          "value": "={{ $json.email || '' }}"
        },
        {
          "name": "name",
          "value": "={{ $json.name || '' }}"
        },
        {
          "name": "limit",
          "value": "50"
        }
      ]
    },
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Accept",
          "value": "application/json"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "options": {
      "response": {
        "response": {
          "fullResponse": true,
          "responseFormat": "json"
        }
      }
    }
  },
  "name": "find_user"
}
```

**Note:** Check Gorgias API docs to confirm if `/users` endpoint supports name search. If not, you might need to:
- Use `/users` to list all users, then filter by name in a Code node
- Or use the email search only and guide users to use email addresses

---

## 🎯 How This Aligns with Natural Language Use Cases

### Use Case 1: "who are my best agents"
**Flow:**
1. Plan AI → `list_metrics` action
2. Route to → `list_tickets` node (with limit=100)
3. Conversational AI → Analyzes tickets, groups by assignee, ranks performance

**Why list_tickets works:** It returns all tickets with assignee info. AI does the grouping/ranking.

---

### Use Case 2: "show me john@email.com's tickets"
**Flow:**
1. Plan AI → Detects email → `list_tickets(customer_email="john@email.com")`
2. Route to → `list_tickets` node (with customer_email filter)
3. Conversational AI → Formats ticket list

**Why flexible list_tickets works:** One node handles all filtering variations.

---

### Use Case 3: "close ticket 12345"
**Flow:**
1. Plan AI → `close_ticket` action (or `set_status`)
2. Route to → `set_status` node (with status="closed")
3. Conversational AI → "✅ Ticket #12345 closed successfully"

**Why set_status works:** Handles all status changes (open/closed/spam/etc.)

---

### Use Case 4: "find ayub's tickets"
**Flow:**
1. Plan AI → Detects name → `find_user(name="ayub")`
2. Route to → `find_user` node (searches by name)
3. AI receives user data → Extracts email or customer_id
4. (Optional) Follow-up: `list_tickets(customer_email=<from step 1>)`

**Why find_user works:** Helps locate people by name, then fetch their tickets.

---

## 📋 Implementation Plan

### Phase 1: Update Flexible Nodes (30 min)
1. Update **list_tickets** to accept dynamic query parameters
2. Rename **add_tags** to **update_tags** (keep same logic)
3. Update **find_user** to accept name parameter (if supported)

### Phase 2: Remove Redundant Nodes (10 min)
1. Delete **close_ticket** (use set_status instead)
2. Delete **search_tickets_by_email** (use list_tickets instead)
3. Delete **list_metrics** (use list_tickets instead)
4. Delete **remove_tags** (use update_tags instead)
5. Delete **list_views**, **get_view_items** (not needed)
6. Delete **list_tags**, **list_macros**, **list_integrations** (not needed)

### Phase 3: Update Switch Node Routing (15 min)
Update your Switch node to route actions correctly:

```javascript
// Switch routing
const action = $json.action;

switch(action) {
  case 'get_ticket': return 0;
  case 'list_tickets': return 1;
  case 'search_tickets': return 2;
  case 'create_ticket': return 3;
  case 'close_ticket': return 4; // Routes to set_status
  case 'set_status': return 4;
  case 'set_priority': return 5;
  case 'assign_ticket': return 6;
  case 'add_tags': return 7; // Routes to update_tags
  case 'remove_tags': return 7; // Routes to update_tags
  case 'update_tags': return 7;
  case 'reply_public': return 8;
  case 'comment_internal': return 9;
  case 'get_customer': return 10;
  case 'list_customers': return 11;
  case 'find_user': return 12;
  case 'list_metrics': return 1; // Routes to list_tickets!
  default: return 1; // Default to list_tickets
}
```

### Phase 4: Update Plan AI Action List (5 min)
Update your Plan AI system message to reflect the consolidated actions:

```
AVAILABLE ACTIONS (13 core actions):

**Ticket Operations:**
- get_ticket - Get single ticket by ID
- list_tickets - List tickets with filters (customer_email, status, priority, assignee_email)
- search_tickets - Full-text search across tickets
- create_ticket - Create new ticket
- set_status - Set ticket status (open, closed, spam, etc.)
- set_priority - Set ticket priority (low, normal, high, urgent)

**Ticket Modifications:**
- assign_ticket - Assign ticket to agent
- update_tags - Add or remove tags
- reply_public - Send public reply
- comment_internal - Add internal note

**Customer/User Operations:**
- get_customer - Get customer by ID
- list_customers - List all customers
- find_user - Find agent by email or name

**Special Actions:**
- list_metrics - Get performance stats (uses list_tickets + AI analysis)
```

---

## ✅ Benefits of Refinement

1. **Simpler workflow** - 13 nodes instead of 24 (54% reduction)
2. **Less maintenance** - Fewer nodes to update/debug
3. **More flexible** - Dynamic parameters vs hardcoded
4. **Clearer intent** - Each node has one clear purpose
5. **Better for AI** - AI generates parameters dynamically, nodes just execute

---

## 🎯 Final Node List

### Core 13 HTTP Nodes:

1. **get_ticket** - GET /tickets/{id}
2. **list_tickets** - GET /tickets (flexible filters)
3. **search_tickets** - POST /search
4. **create_ticket** - POST /tickets
5. **set_status** - PUT /tickets/{id} (status)
6. **set_priority** - PUT /tickets/{id} (priority)
7. **assign_ticket** - PUT /tickets/{id} (assignee)
8. **update_tags** - PUT /tickets/{id} (tags)
9. **reply_public** - POST /tickets/{id}/messages
10. **comment_internal** - POST /tickets/{id}/messages
11. **get_customer** - GET /customers/{id}
12. **list_customers** - GET /customers
13. **find_user** - GET /users

**These 13 nodes support ALL natural language use cases!**

---

## 🚨 Important: Before Deleting

1. **Backup workflow** - Export current JSON
2. **Check switch routing** - Ensure all actions route correctly
3. **Update Plan AI** - Remove references to deleted actions
4. **Test thoroughly** - Verify all NL use cases still work

---

## 📝 Testing After Refinement

Test these natural language variations:

1. "show me open tickets" → list_tickets(status="open")
2. "who are my best agents" → list_tickets + AI analysis
3. "find john@email.com's tickets" → list_tickets(customer_email="...")
4. "close ticket 12345" → set_status(status="closed")
5. "tag ticket 12345 with urgent" → update_tags
6. "show me ayub's workload" → find_user(name="ayub")

All should work with the refined 13 nodes!

---

**Status:** ✅ READY TO IMPLEMENT
**Estimated Time:** 1 hour (update + test)
**Priority:** Medium (cleanup, not blocking)
**Result:** Simpler, more maintainable workflow
