# ⚡ Quick Start: Dynamic API Architecture

## The Problem You're Solving

Your current workflow has **20+ hardcoded HTTP nodes** that are painful to maintain:

```
User: "show open tickets"
  ↓
Hardcoded OpenAI functions (manually defined)
  ↓
Switch router with 20+ cases
  ↓
Individual HTTP node for each action
  ↓
Custom formatter for each response type
```

**Pain Points**:
- ❌ Adding new action = update 3+ nodes manually
- ❌ Changing API = find and update multiple HTTP nodes
- ❌ Can't support multiple APIs without duplicating everything
- ❌ Testing new features requires workflow edits

---

## The Solution: Schema-Driven Dynamic Routing

```
User: "show open tickets"
  ↓
Load API schema from database (dynamic)
  ↓
LLM chooses action from schema
  ↓
Universal HTTP Executor (builds request from schema)
  ↓
Universal Formatter (formats based on schema)
```

**Benefits**:
- ✅ Adding new action = 1 SQL INSERT (2 minutes)
- ✅ All APIs use same executor (no duplication)
- ✅ A/B test by swapping schemas (instant)
- ✅ Production changes via DB, no workflow edits

---

## Architecture Comparison

### Before (Hardcoded)

```
n8n Workflow Nodes:
├── Parse Slack
├── Build OpenAI Request (hardcoded 20+ functions) ❌
├── OpenAI API Call
├── Handle Response
├── Route by Action (switch with 20+ cases) ❌
│
├── [list_tickets HTTP node] ❌
├── [get_ticket HTTP node] ❌
├── [create_ticket HTTP node] ❌
├── [assign_ticket HTTP node] ❌
├── [set_priority HTTP node] ❌
├── [set_status HTTP node] ❌
├── [update_tags HTTP node] ❌
├── [find_user HTTP node] ❌
├── [reply_public HTTP node] ❌
├── [comment_internal HTTP node] ❌
├── [list_customers HTTP node] ❌
├── ... (10+ more) ❌
│
└── Custom formatters for each type ❌

Total: 35+ nodes for one API
```

### After (Dynamic)

```
n8n Workflow Nodes:
├── Parse Slack
├── Load API Functions (from DB) ✅
├── OpenAI API Call
├── Handle Response
├── Universal HTTP Executor (handles ALL actions) ✅
├── Response Router ✅
└── Universal Formatter ✅

Supabase Database:
└── api_schemas table
    ├── gorgias schema (7+ endpoints)
    ├── stripe schema (future)
    └── shopify schema (future)

Total: 7 nodes for ANY number of APIs
```

---

## Implementation Steps (2 Hours)

### 1. Setup Database (15 min)

```sql
-- Run in Supabase SQL Editor
-- File: implementation/setup_schema_table.sql

CREATE TABLE api_schemas (...);
INSERT INTO api_schemas VALUES ('gorgias', ...);
```

### 2. Replace Function Loader (30 min)

```javascript
// Replace "Build OpenAI Request" node
// File: implementation/dynamic_function_loader.js

// Before: 200 lines of hardcoded functions
// After: 20 lines that load from DB
const schema = await fetchSchemaFromSupabase();
const functions = schema.endpoints.map(endpoint => ({
  name: endpoint.id,
  description: endpoint.description,
  parameters: buildFromSchema(endpoint)
}));
```

### 3. Install Universal Executor (45 min)

```javascript
// Replace 20+ HTTP nodes with 1 dynamic executor
// File: implementation/universal_http_executor.js

// Reads schema
const endpoint = schema.endpoints.find(e => e.id === action);

// Builds request dynamically
const url = buildURL(endpoint, args);
const body = buildBody(endpoint, args);

// Executes
const response = await fetch(url, {method: endpoint.method, body});
```

### 4. Test & Deploy (30 min)

Test all actions work:
- List tickets ✅
- Get ticket ✅
- Create ticket ✅
- Analytics ✅

Remove old nodes ✅

---

## Real-World Example: Adding a New Action

### Before (Hardcoded) - 30 minutes

1. Edit "Build OpenAI Request" code
   - Add new function definition
   - Define parameters manually
   - Test syntax

2. Edit "Route by Action" switch
   - Add new case
   - Map to new HTTP node

3. Create new HTTP Request node
   - Configure URL, method, headers
   - Set up authentication
   - Add body template
   - Test endpoint

4. Create/update formatter
   - Add response handling
   - Format output for Slack

5. Test end-to-end

**Total: ~30 minutes per action**

### After (Dynamic) - 2 minutes

1. Add to schema:

```sql
UPDATE api_schemas
SET schema_data = jsonb_insert(
  schema_data,
  '{endpoints, 999}',
  '{
    "id": "add_tags",
    "path": "/api/tickets/{ticket_id}",
    "method": "PUT",
    "description": "Add tags to a ticket",
    "parameters": {
      "path": [{"name": "ticket_id", "type": "string", "required": true}],
      "body": {"tags": {"type": "string", "required": true}}
    }
  }'
)
WHERE service_name = 'gorgias';
```

2. Test immediately:
   - User: "add urgent tag to ticket 12345"
   - System: ✅ Works without any workflow changes

**Total: ~2 minutes per action (15x faster)**

---

## Files You Need

```
Analyst/
├── docs/
│   └── DYNAMIC_ARCHITECTURE_REDESIGN.md  (Full architecture docs)
│
├── schemas/
│   └── gorgias_api_schema.json           (Schema format reference)
│
└── implementation/
    ├── setup_schema_table.sql            (Supabase setup - RUN FIRST)
    ├── dynamic_function_loader.js        (Replace "Build OpenAI Request")
    ├── universal_http_executor.js        (Replace all HTTP nodes)
    ├── MIGRATION_GUIDE.md                (Step-by-step migration)
    └── QUICK_START.md                    (This file)
```

---

## Quick Start Commands

### 1. Setup Supabase

```bash
# Copy SQL to Supabase SQL Editor
cat implementation/setup_schema_table.sql

# Or use Supabase CLI
supabase db execute -f implementation/setup_schema_table.sql
```

### 2. Test Schema Access

```bash
# Test from terminal
curl "${SUPABASE_URL}/rest/v1/api_schemas?service_name=eq.gorgias" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}"

# Should return: JSON with endpoints array
```

### 3. Deploy to n8n

1. Backup workflow: `Workflows → Export`
2. Create new Code node: Copy `dynamic_function_loader.js`
3. Create Universal Executor: Copy `universal_http_executor.js`
4. Test with: `"show me open tickets"`
5. If working, delete old nodes

---

## Environment Variables Required

Set these in n8n:

```bash
# Supabase (for schema storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Gorgias (for API calls)
GORGIAS_EMAIL=your_email@company.com
GORGIAS_API_KEY=your_api_key

# OpenAI (for function calling)
OPENAI_MODEL=gpt-4-turbo
OPENAI_TEMPERATURE_PLAN=0.3
OPENAI_MAX_TOKENS=1000
```

---

## Troubleshooting

### "Schema fetch failed"
→ Check `SUPABASE_URL` and `SUPABASE_KEY` variables

### "Unknown action: xyz"
→ Action not in schema. Add to `api_schemas` table.

### "HTTP 401"
→ Check `GORGIAS_EMAIL` and `GORGIAS_API_KEY`

### "LLM didn't call function"
→ Adjust prompt or temperature in dynamic_function_loader.js

---

## What's Next?

Once you have Gorgias working dynamically, you can:

1. **Add Stripe API** (payments, subscriptions)
2. **Add Shopify API** (orders, products)
3. **Add Internal APIs** (your custom services)
4. **Version APIs** (v1, v2 side-by-side)
5. **A/B Test** (swap schemas without code changes)

All using the **same Universal Executor** - just add new schemas to the database.

---

## Support & Resources

- **Full Architecture**: `docs/DYNAMIC_ARCHITECTURE_REDESIGN.md`
- **Migration Guide**: `implementation/MIGRATION_GUIDE.md`
- **Schema Format**: `schemas/gorgias_api_schema.json`
- **Example Code**: `implementation/*.js`

---

## 30-Second Summary

**Problem**: 20+ hardcoded HTTP nodes per API = maintenance nightmare

**Solution**: Store API definitions in database, use 1 universal executor

**Result**: Add new actions in 2 minutes via SQL, not 30 minutes via workflow edits

**Time to implement**: 2 hours
**Time saved per new action**: 28 minutes (93% faster)

**Ready? Start with**: `implementation/setup_schema_table.sql` 🚀
