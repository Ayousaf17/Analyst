# 🚀 Migration Guide: Hardcoded → Dynamic Architecture

## Overview

This guide will walk you through migrating your workflow from **20+ hardcoded actions** to a **schema-driven dynamic system**.

**Time estimate**: 2-3 hours
**Risk level**: Low (we'll do it incrementally)
**Rollback plan**: Keep old nodes during testing

---

## 📋 Pre-Migration Checklist

- [ ] Supabase access confirmed
- [ ] Backup current workflow (export JSON)
- [ ] Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `GORGIAS_EMAIL`
  - `GORGIAS_API_KEY`
- [ ] Test environment available (or use same workflow with feature flag)

---

## Phase 1: Setup Schema Storage (30 minutes)

### Step 1.1: Create Supabase Table

1. Open Supabase SQL Editor
2. Run `implementation/setup_schema_table.sql`
3. Verify table created:

```sql
SELECT * FROM api_schemas WHERE service_name = 'gorgias';
```

Expected output: 1 row with 7+ endpoints

### Step 1.2: Test Schema Access from n8n

Create a test node in your workflow:

**Node Type**: Code
**Node Name**: Test Schema Access

```javascript
const response = await fetch(
  `${$vars.SUPABASE_URL}/rest/v1/api_schemas?service_name=eq.gorgias&select=schema_data`,
  {
    headers: {
      'apikey': $vars.SUPABASE_KEY,
      'Authorization': `Bearer ${$vars.SUPABASE_KEY}`
    }
  }
);

const data = await response.json();
console.log('Schema endpoints:', data[0].schema_data.endpoints.length);

return [{ json: data[0].schema_data }];
```

**Expected output**: JSON with 7+ endpoints

✅ **Checkpoint**: If you see the schema data, proceed to Phase 2

---

## Phase 2: Install Dynamic Function Loader (45 minutes)

### Step 2.1: Create New Code Node

1. **Duplicate your workflow** (so you have a backup)
2. Find the **"Build OpenAI Request"** node
3. Create a new Code node **next to it** (not replacing yet)
4. Name it: `Dynamic Function Loader (NEW)`
5. Copy code from: `implementation/dynamic_function_loader.js`
6. Set input: `Parse Slack` node

### Step 2.2: Test Function Generation

1. Manually trigger workflow with pinned Slack data
2. Check node output - should see:
   - `json.model`: "gpt-4-turbo"
   - `json.tools`: Array of 7+ functions
   - `json.messages`: User message

### Step 2.3: Connect to OpenAI

1. Disconnect **old** "Build OpenAI Request" node from "OpenAI Structured Output"
2. Connect **new** "Dynamic Function Loader (NEW)" → "OpenAI Structured Output"
3. Test with message: `"show me open tickets"`

**Expected**: OpenAI should call `list_tickets` function with `status: "open"`

✅ **Checkpoint**: If OpenAI function call works, proceed to Phase 3

---

## Phase 3: Install Universal HTTP Executor (1 hour)

### Step 3.1: Create Universal Executor Node

1. Find the **"Route by Action"** switch node
2. Create new Code node **after** "Handle Plan Response"
3. Name it: `Universal HTTP Executor (NEW)`
4. Copy code from: `implementation/universal_http_executor.js`

### Step 3.2: Wire Up New Flow

**OLD FLOW**:
```
Handle Plan Response → Format Session → Insert Session → Expand Plan →
Split Steps → Normalize Step → Route by Action → [20+ HTTP nodes]
```

**NEW FLOW**:
```
Handle Plan Response → Universal HTTP Executor (NEW) →
[Response Formatter] → Slack Reply
```

**Connections**:
1. `Handle Plan Response` → `Universal HTTP Executor (NEW)`
2. `Universal HTTP Executor (NEW)` → New response formatter (create next)

### Step 3.3: Test Single Action

Test with pinned data:

**Slack message**: `"show me open tickets"`

**Expected**:
- Universal Executor runs
- Makes GET request to `/api/tickets?status=open`
- Returns data with `action: "list_tickets"`

### Step 3.4: Create Response Router

Some actions need different post-processing:
- Regular actions → Format as table
- Analytics actions → Route to AI agent

**Node Type**: Code
**Node Name**: Response Router

```javascript
const executorResult = $json;

// Check if requires post-processing
if (executorResult.requires_post_processing) {
  const processor = executorResult.post_processor;

  if (processor.route_to === 'Ticket Analytics Agent') {
    // Route to analytics path
    return [{
      json: executorResult,
      route: 'analytics'
    }];
  }
}

// Default: format and reply
return [{
  json: executorResult,
  route: 'standard'
}];
```

Add Switch node after Response Router:
- Output 1 (analytics): → Existing analytics nodes
- Output 2 (standard): → New Universal Formatter

✅ **Checkpoint**: If single action works end-to-end, proceed to Phase 4

---

## Phase 4: Universal Response Formatter (30 minutes)

### Step 4.1: Create Formatter Node

**Node Type**: Code
**Node Name**: Universal Response Formatter

```javascript
const executorResult = $json;
const action = executorResult.action;
const data = executorResult.data;
const responseType = executorResult.response_type;

let output = '';

// Format based on response type
if (responseType === 'list') {
  // List of items (tickets, customers, etc.)
  const items = Array.isArray(data) ? data : (data.data || []);

  if (items.length === 0) {
    output = `No results found for ${action}`;
  } else {
    output = `Found ${items.length} item(s):\n\n`;

    // Format as numbered list
    items.slice(0, 20).forEach((item, i) => {
      output += `${i + 1}. **${item.subject || item.name || item.id}**\n`;
      output += `   Status: ${item.status || 'N/A'} | `;
      output += `ID: ${item.id}\n\n`;
    });

    if (items.length > 20) {
      output += `\n_(Showing 20 of ${items.length} results)_`;
    }
  }

} else if (responseType === 'object') {
  // Single object (ticket details, customer info, etc.)
  output = `**Details**\n\n`;
  output += `ID: ${data.id}\n`;
  output += `Subject: ${data.subject || 'N/A'}\n`;
  output += `Status: ${data.status || 'N/A'}\n`;
  output += `Created: ${data.created_datetime || 'N/A'}\n`;

} else {
  // Unknown type - dump JSON
  output = '```json\n' + JSON.stringify(data, null, 2) + '\n```';
}

return [{
  json: {
    output: output,
    channel: executorResult.slack_channel,
    thread_ts: executorResult.slack_thread_ts,
    correlation_id: executorResult.correlation_id,
    original_action: action
  }
}];
```

### Step 4.2: Connect to Slack Reply

1. `Universal Response Formatter` → `Calculate Performance Metrics` → `Final Slack Reply`
2. Test with various actions:
   - List: `"show open tickets"`
   - Single: `"get ticket 12345"`
   - Create: `"create ticket for test@example.com"`

✅ **Checkpoint**: All action types format correctly

---

## Phase 5: Cleanup & Optimization (30 minutes)

### Step 5.1: Remove Old Nodes

Once testing passes for **all** actions:

1. Delete old "Build OpenAI Request" node
2. Delete "Route by Action" switch node
3. Delete 20+ individual HTTP nodes:
   - `list_tickets`
   - `get_ticket`
   - `create_ticket`
   - `assign_ticket`
   - `set_priority`
   - `set_status`
   - etc.
4. Delete old formatters if replaced

**Before deletion**: Export workflow as backup!

### Step 5.2: Rename Nodes

Clean up naming:
- `Dynamic Function Loader (NEW)` → `Load API Functions`
- `Universal HTTP Executor (NEW)` → `Execute API Call`

### Step 5.3: Add Schema Caching (Optional)

For better performance, cache schema in workflow:

**Node**: Load API Functions (at the top of code)

```javascript
// Cache schema for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const cacheKey = 'gorgias_schema_v1';

// Check workflow static data for cached schema
if ($workflow.staticData[cacheKey]) {
  const cached = $workflow.staticData[cacheKey];

  if (Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ Using cached schema');
    schema = cached.data;
  }
}

// If not cached, fetch and cache
if (!schema) {
  // ... fetch from Supabase ...

  // Store in cache
  $workflow.staticData[cacheKey] = {
    data: schema,
    timestamp: Date.now()
  };
}
```

✅ **Checkpoint**: Workflow is clean and optimized

---

## Phase 6: Testing & Validation (30 minutes)

### Test Cases

Run these Slack messages and verify responses:

1. ✅ `"show me open tickets"` → List of tickets
2. ✅ `"get ticket 12345"` → Single ticket details
3. ✅ `"create ticket for test@example.com about billing"` → New ticket created
4. ✅ `"close ticket 12345"` → Ticket closed
5. ✅ `"assign ticket 12345 to john@example.com"` → Ticket assigned
6. ✅ `"search for refund"` → Search results
7. ✅ `"analyze insights from last 7 days"` → Analytics report

### Performance Validation

Check `performance_metrics` table:

```sql
SELECT
  primary_action,
  AVG(execution_time_seconds) as avg_time,
  COUNT(*) as count
FROM performance_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY primary_action
ORDER BY avg_time DESC;
```

**Expected**: Similar or better performance than old architecture

### Error Handling Test

Test error scenarios:

1. ❌ `"get ticket 999999"` → Should gracefully handle 404
2. ❌ `"create ticket"` (missing params) → Should ask for clarification
3. ❌ Invalid action → Should fallback gracefully

✅ **Checkpoint**: All tests pass

---

## 🎉 Migration Complete!

### What You've Achieved

✅ **Reduced nodes**: 20+ HTTP nodes → 1 Universal Executor
✅ **Zero hardcoding**: All actions defined in database
✅ **Easy maintenance**: Add new endpoints in <2 minutes
✅ **Scalable**: Same executor works for ANY API

### Adding New Endpoints

To add a new action (e.g., "delete_ticket"):

1. Open Supabase SQL Editor
2. Run:

```sql
UPDATE api_schemas
SET schema_data = jsonb_set(
  schema_data,
  '{endpoints}',
  schema_data->'endpoints' || '[{
    "id": "delete_ticket",
    "path": "/api/tickets/{ticket_id}",
    "method": "DELETE",
    "description": "Delete a ticket permanently",
    "parameters": {
      "path": [{
        "name": "ticket_id",
        "type": "string",
        "required": true
      }]
    },
    "response": {
      "type": "object"
    }
  }]'::jsonb
)
WHERE service_name = 'gorgias';
```

3. Test immediately: `"delete ticket 12345"`

**No workflow changes needed!** 🚀

---

## Troubleshooting

### Issue: "Schema fetch failed"

**Solution**: Check environment variables:
```bash
echo $vars.SUPABASE_URL
echo $vars.SUPABASE_KEY
```

### Issue: "No function call found in LLM response"

**Solution**: Check OpenAI response in logs. May need to adjust temperature or prompt.

### Issue: "Unknown action: xyz"

**Solution**: Schema doesn't include this action. Add it to `api_schemas` table.

### Issue: "HTTP 401 Unauthorized"

**Solution**: Check Gorgias credentials in Universal Executor:
- `$vars.GORGIAS_EMAIL`
- `$vars.GORGIAS_API_KEY`

---

## Next Steps: Multi-Service Support

Now that you have a dynamic system, you can easily add:

1. **Stripe API** - Payment operations
2. **Shopify API** - Order management
3. **Slack API** - Channel/user management
4. **Custom APIs** - Your internal services

All using the **same Universal Executor**! Just add new schemas to the table.

Example for Stripe:

```sql
INSERT INTO api_schemas (service_name, version, schema_data)
VALUES ('stripe', 'v1', '{
  "service": "stripe",
  "base_url": "https://api.stripe.com/v1",
  "auth": {"type": "bearer", "credential_id": "stripe_cred"},
  "endpoints": [...]
}'::jsonb);
```

---

## Support

Questions? Check the docs:
- `docs/DYNAMIC_ARCHITECTURE_REDESIGN.md` - Full architecture explanation
- `schemas/gorgias_api_schema.json` - Schema format reference
- `implementation/` - All source code

**You're now running a production-grade, schema-driven AI agent system!** 🎊
