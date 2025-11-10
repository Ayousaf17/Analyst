# Gorgias Terminal - Modular Architecture Handoff

**Session Date:** November 10, 2025
**Architecture:** Modular Sub-Workflow Pattern
**Status:** SW1, SW2, SW3 Complete | SW4, SW5 Pending

---

## 🏗️ Architecture Overview

### **Modular Design Pattern**

The Gorgias Terminal now uses a **modular sub-workflow architecture** instead of the monolithic v23 pattern:

```
Slack User @mentions →
  Router (Main Orchestrator) →
    SW1 (Ticket Read) |
    SW2 (Ticket Write) |
    SW3 (Tags & Macros) |
    SW4 (Resource Discovery) |
    SW5 (Customer Ops)
  → Response → Slack
```

### **Benefits Over v23 Monolithic:**

- ✅ **Separation of Concerns** - Each sub-workflow handles one domain
- ✅ **Easier Testing** - Test workflows independently
- ✅ **Better Maintainability** - Update one area without affecting others
- ✅ **Scalability** - Add new sub-workflows without modifying core logic
- ✅ **Clearer Debugging** - Isolate issues to specific workflows
- ✅ **Parallel Development** - Multiple developers can work simultaneously

---

## 📦 Workflow Inventory

### ✅ **Router - Main Orchestrator**

**File:** `workflows/modular/router/router-main-orchestrator.json`
**n8n Workflow ID:** TBD (to be created)
**Status:** Complete, needs fixes before enabling

**Architecture:** AI Agent pattern
**Model:** gpt-4o-mini (temp 0.2)

**Key Nodes:**
1. Slack Trigger (app_mention on #test_gorgias)
2. Parse Slack (extracts entities, resolves assignee names to IDs)
3. Router AI Agent (orchestrates sub-workflow calls)
4. 5 Tool Workflow nodes (SW1-SW5)
5. Conversation Memory (buffer window, thread-based)
6. Build Slack Reply (formats response)
7. Send Slack Message (posts to thread)

**Critical Issues:**
- ❌ SW1 and SW2 are `disabled: true` (need to enable)
- ❌ SW2 tags field uses `stringValue` instead of `JSON.stringify()` (CRITICAL BUG)
- ❌ SW3 field mappings inconsistent with SW2 pattern
- ✅ SW3 already enabled (no disabled flag)

**System Message Highlights:**
- Instructs AI to call each tool ONLY ONCE per request
- SW2 handles multi-operations in single call (priority + tags + status)
- Parse Slack pre-resolves assignee names to IDs
- Tools extract what they need from preprocessed data

---

### ✅ **SW1 - Ticket Read Operations**

**File:** `workflows/modular/sw1-ticket-read/sw1-ticket-read-operations.json`
**n8n Workflow ID:** `0hs6veRenQKxqMRx`
**Status:** Complete, ready to enable

**Architecture:** AI Agent + HTTP Request Tools
**Model:** gpt-4o-mini (temp 0.1)

**Operations (2 tools):**
1. `gorgias_tickets_read` - List/filter tickets
2. `gorgias_search` - Keyword search, email lookup

**Capabilities:**
- Get ticket by ID (AI extracts ID from query)
- List tickets with filters (status, priority, assignee)
- Analytics (assignee workload, ticket volume, priority distribution)
- Search by keyword or customer email

**Key Nodes:**
1. When Executed by Another Workflow (trigger)
2. SW1 AI Agent
3. OpenAI Model (gpt-4o-mini, temp 0.1)
4. gorgias_tickets_read (HTTP Request Tool)
5. gorgias_search (HTTP Request Tool)
6. Format Response
7. Prepare Log Entry
8. Insert api_logs (Supabase)
9. Prepare Final Response

**Testing Status:**
- ⏳ Not yet tested via Router (workflow disabled in Router)
- ✅ Pinned test data: "get ticket 235393098"

---

### ✅ **SW2 - Ticket Write Operations (Multi-Op)**

**File:** `workflows/modular/sw2-ticket-write/sw2-ticket-write-multi-op.json`
**n8n Workflow ID:** `1MuOdHXpSMIQIEOh`
**Status:** Complete, ready to enable

**Architecture:** Switch-based routing (NOT AI Agent)
**Reason:** AI Agent can't pass credentials to Code Tools; Switch is deterministic

**Operations (8 HTTP Request nodes):**
1. `create_ticket`
2. `assign_ticket`
3. `set_priority`
4. `set_status`
5. `update_tags`
6. `reply_public`
7. `comment_internal`
8. (close_ticket merged into set_status)

**Multi-Operation Support:**
- Executes multiple operations in ONE workflow call
- Example: "set to high, tag urgent, and close" = 3 operations in 1 execution
- Prevents Router from calling SW2 multiple times

**Key Nodes:**
1. When Executed by Another Workflow (trigger)
2. Detect All Operations (Code node - identifies operations from input)
3. Prepare Operations (Code node - creates operation items)
4. Route Operations (Switch node - routes to HTTP Request nodes)
5. 8 HTTP Request nodes (one per operation type)
6. Aggregate Results (combines all operation results)
7. Prepare Log → Insert api_logs → Prepare Final Response

**Critical Fixes Applied:**
- ✅ Priority values must be lowercase ("high" not "High")
- ✅ Tags must be arrays, not stringified JSON
- ✅ Null/empty value detection prevents unnecessary API calls
- ✅ isPresent() helper validates true presence (not "null" strings)

**Testing Status:**
- ✅ Close ticket
- ✅ Set priority (high, low, critical)
- ✅ Update tags (single and multiple)
- ✅ Multi-op: Priority + Tags
- ✅ Multi-op: Priority + Tags + Close (3 operations)
- ⏳ Not yet tested via Router (workflow disabled in Router)

---

### ✅ **SW3 - Tags & Macros Operations**

**File:** `workflows/modular/sw3-tags-macros/sw3-tags-macros-operations.json`
**n8n Workflow ID:** `XZYe7dKHwQzgugiM`
**Status:** Complete, enabled in Router

**Architecture:** AI Agent + HTTP Request Tools (same pattern as SW1)
**Model:** gpt-4o-mini (temp 0.1)

**Operations (4 tools):**
1. `gorgias_list_tags` - List all tags
2. `gorgias_get_tag` - Get specific tag by ID
3. `gorgias_list_macros` - List all macros
4. `gorgias_get_macro` - Get specific macro by ID

**AI-Powered Features (mentioned in system message but NOT implemented as tools):**
- `recommend_tags` - Suggest tags based on ticket content
- `recommend_macros` - Suggest macros based on query
- Keyword matching and filtering
- Fuzzy matching for typos

**Key Nodes:**
1. When Executed by Another Workflow (trigger)
2. SW3 AI Agent
3. OpenAI Model (gpt-4o-mini, temp 0.1)
4. gorgias_list_tags (HTTP Request Tool)
5. gorgias_get_tag (HTTP Request Tool)
6. gorgias_list_macros (HTTP Request Tool)
7. gorgias_get_macro (HTTP Request Tool)
8. Format Response → Prepare Log Entry → Insert api_logs → Prepare Final Response

**Testing Status:**
- ✅ List all tags
- ✅ List all macros
- ✅ Filter macros by keyword ("shipping macros")
- ⏳ Not yet tested via Router end-to-end

**Router Integration:**
- ✅ Enabled (no disabled flag)
- ⚠️ Field mappings use `$json.query` instead of `$('Parse Slack').first().json.raw_text`

---

### 🚧 **SW4 - Resource Discovery** (PLANNED)

**File:** `workflows/modular/sw4-resource-discovery/` (not yet created)
**Status:** Designed, not implemented

**Architecture:** AI Agent + HTTP Request Tools (same pattern as SW1/SW3)

**Operations (6 tools planned):**
1. `gorgias_list_users` - List team members
2. `gorgias_get_user` - Get user by ID
3. `gorgias_search_users` - Find users by name/email (fuzzy)
4. `gorgias_list_views` - List ticket views
5. `gorgias_list_integrations` - List active integrations
6. `gorgias_list_custom_fields` - List available custom fields

**Use Cases:**
- "list all users" → team overview
- "find user named Sarah" → search with fuzzy matching
- "show me all views" → ticket view discovery
- "what integrations are connected" → system status
- "list custom fields" → field discovery for advanced operations

**Why Keep Despite Parse Slack Resolution:**
- Parse Slack: Assignee name→ID resolution for ticket operations
- SW4: Discovery, search, system resource listing
- Different purposes, complementary functionality

---

### 🚧 **SW5 - Customer Operations** (PLANNED)

**File:** `workflows/modular/sw5-customer-ops/` (not yet created)
**Status:** Designed, not implemented

**Architecture:** AI Agent + HTTP Request Tools

**Operations (planned):**
1. `gorgias_list_customers` - List all customers
2. `gorgias_get_customer` - Get customer by ID
3. `gorgias_search_customers` - Search customers by email/name
4. `gorgias_get_customer_tickets` - Get all tickets for customer

**Use Cases:**
- "customer info for email@example.com"
- "list all customers"
- "show me all tickets for customer X"
- "customer purchase history" (if integrated)

---

## 🐛 Critical Bugs to Fix

### **Bug #1: SW2 Tags Field Type (CRITICAL)**

**Location:** Router → SW2_TicketWriteOps Tool → Field Mappings

**Current Code:**
```json
{
  "name": "tags",
  "stringValue": "={{ $('Parse Slack').first().json.tags }}"
}
```

**Problem:**
- Parse Slack outputs: `{ tags: ["urgent", "followup"] }`
- n8n `stringValue` converts array to comma string: `"urgent,followup"`
- SW2's parseTags receives `"urgent,followup"` (NOT valid JSON)
- parseTags wraps as single item: `["urgent,followup"]` ❌
- Creates tag named "urgent,followup" instead of two separate tags

**Fix:**
```json
{
  "name": "tags",
  "stringValue": "={{ JSON.stringify($('Parse Slack').first().json.tags || []) }}"
}
```

**Why This Works:**
- Parse Slack outputs: `{ tags: ["urgent", "followup"] }`
- JSON.stringify converts: `'["urgent","followup"]'` (valid JSON string)
- SW2's parseTags does `JSON.parse()`: `["urgent", "followup"]` ✅

---

### **Bug #2: SW1 and SW2 Disabled**

**Location:** Router → SW1_TicketReadOps and SW2_TicketWriteOps

**Current State:**
```json
{
  "name": "SW1_TicketReadOps",
  "disabled": true,
  ...
}
```

**Fix:**
Remove `"disabled": true` from both tool configurations.

---

### **Bug #3: SW3 Inconsistent Field Mappings**

**Location:** Router → SW3_TagOps Tool → Field Mappings

**Current Code:**
```json
{
  "name": "query",
  "stringValue": "={{ $json.query }}"
}
```

**Problem:**
- SW2 uses `$('Parse Slack').first().json.raw_text` (direct node reference)
- SW3 uses `$json.query` (AI Agent context)
- Inconsistent and might not pass all preprocessed data

**Fix:**
```json
{
  "name": "query",
  "stringValue": "={{ $('Parse Slack').first().json.raw_text }}"
}
```

---

## 🔧 Router Configuration Fix Summary

### **Changes Needed:**

1. **Enable SW1:**
   - Remove `disabled: true` from SW1_TicketReadOps tool

2. **Fix and Enable SW2:**
   - Change tags field: `JSON.stringify($('Parse Slack').first().json.tags || [])`
   - Remove `disabled: true` from SW2_TicketWriteOps tool

3. **Fix SW3 Field Mappings:**
   - Change `query` field to use `$('Parse Slack').first().json.raw_text`
   - Change `ticket_id`, `user`, `channel` to use Parse Slack node reference

---

## 📋 Testing Checklist

### **Phase 1: Individual Sub-Workflow Testing**

**SW1 - Ticket Read:**
- [ ] Test: "get ticket 235393098"
- [ ] Test: "list all open tickets"
- [ ] Test: "how many tickets assigned to Sarah"
- [ ] Test: "find tickets for email@example.com"

**SW2 - Ticket Write:**
- [ ] Test: "close ticket 235841768"
- [ ] Test: "set ticket 235841768 to high priority"
- [ ] Test: "tag ticket 235841768 with urgent"
- [ ] Test: "set ticket 235841768 to low, tag with resolved, and close it" (multi-op)

**SW3 - Tags & Macros:**
- [ ] Test: "list all tags"
- [ ] Test: "list all macros"
- [ ] Test: "show me shipping macros"
- [ ] Test: "get macro 123"

### **Phase 2: End-to-End Router Testing**

- [ ] Slack → Router → SW1 → Response
- [ ] Slack → Router → SW2 (single op) → Response
- [ ] Slack → Router → SW2 (multi-op) → Response
- [ ] Slack → Router → SW3 → Response
- [ ] Error handling (invalid ticket ID, missing fields)
- [ ] Supabase logging verification

### **Phase 3: SW4 and SW5 Implementation**

- [ ] Build SW4 - Resource Discovery
- [ ] Build SW5 - Customer Operations
- [ ] Router integration for SW4/SW5
- [ ] End-to-end testing

---

## 🔑 Key Technical Patterns

### **Sub-Workflow Input Format**

All sub-workflows receive this structure from Router:

```json
{
  "query": "user's natural language request",
  "raw_text": "cleaned slack text",
  "ticket_id": "123",
  "action": "close",
  "priority": "high",
  "tags": ["urgent", "followup"],
  "assignee_id": "456",
  "status": "closed",
  "message": "reply text",
  "note": "internal note",
  "customer_email": "user@example.com",
  "subject": "ticket subject",
  "channel": "C09BXTD0WR0",
  "thread_ts": "1699564809.012840",
  "user": "U09BSMA8U75"
}
```

### **Sub-Workflow Output Format**

All sub-workflows return this structure to Router:

```json
{
  "workflow": "SW1" | "SW2" | "SW3" | "SW4" | "SW5",
  "operation": "get_ticket" | "multi_operation" | "list_tags" | etc,
  "success": true | false,
  "data": {
    /* operation-specific data */
  },
  "summary": "Human-readable summary for Slack",
  "error": "Error message if failed" | null
}
```

### **Supabase Logging Structure**

All workflows log to `api_logs` table:

```sql
workflow_id: "SW1" | "SW2" | "SW3" | etc
run_id: execution.id
node_name: "SW1_AI_Agent"
direction: "request" | "response"
method: "read" | "write" | "multi_write" | etc
url: "https://ironsidecomputers.gorgias.com/api/..."
status_code: 200 | 500
request_body: JSON string
response_body: JSON string
error_message: string | null
actor_user: Slack user ID
channel: Slack channel ID
thread_ts: Slack thread timestamp
ticket_id: Gorgias ticket ID | null
tags: Array of tags
duration_ms: Execution time
extra: JSON metadata
```

---

## 🌳 Directory Structure

```
workflows/
├── README.md (old v23 monolithic docs)
└── modular/
    ├── MODULAR_ARCHITECTURE_HANDOFF.md (this file)
    ├── router/
    │   ├── router-main-orchestrator.json
    │   └── README.md
    ├── sw1-ticket-read/
    │   ├── sw1-ticket-read-operations.json
    │   └── README.md
    ├── sw2-ticket-write/
    │   ├── sw2-ticket-write-multi-op.json
    │   └── README.md
    ├── sw3-tags-macros/
    │   ├── sw3-tags-macros-operations.json
    │   └── README.md
    ├── sw4-resource-discovery/
    │   └── (pending creation)
    └── sw5-customer-ops/
        └── (pending creation)
```

---

## 📚 Next Steps

### **Immediate (Fixes):**
1. Fix Router bugs (tags field, enable SW1/SW2, fix SW3 mappings)
2. Test SW1 via Router
3. Test SW2 via Router (single-op and multi-op)
4. Test SW3 via Router
5. Verify Supabase logging for all workflows

### **Short-Term (New Workflows):**
1. Build SW4 - Resource Discovery
2. Build SW5 - Customer Operations
3. Integration testing
4. Documentation updates

### **Long-Term (Enhancements):**
1. Add recommend_tags/recommend_macros tools to SW3
2. Advanced analytics in SW1
3. Batch operations support in SW2
4. Performance optimization
5. Rate limit handling

---

## 🔐 Environment & Credentials

**Environment Variables:**
- `GORGIAS_BASE_URL`: `https://ironsidecomputers.gorgias.com`

**Credentials (n8n IDs):**
- Gorgias: `00RVVVUesFbtpYkL5` (httpBasicAuth)
- OpenAI: `lQEKjK3ZzGMrPX6v` (API key)
- Supabase: `xapu3wcO3s3Vehps` (API)
- Slack: `7QbUDT9ZBWKbl976` (API)

---

**Version:** 1.0
**Last Updated:** November 10, 2025
**Status:** SW1, SW2, SW3 Complete | Router Needs Fixes | SW4, SW5 Pending

**Ready to deploy?** Fix Router bugs first, then enable workflows for testing! 🚀
