# Quick Fix: Status & Cursor Parameter Errors

## The Errors You're Seeing

### Error 1: Status Parameter
```json
{
  "errorMessage": "Bad request - please check your parameters",
  "errorDetails": {
    "rawErrorMessage": ["400 - {\"error\":{\"msg\":\"Failed to retrieve tickets.\",\"data\":{\"status\":[\"Unknown field.\"]}}}"]
  }
}
```

### Error 2: Cursor Parameter
You mentioned "cursor under parameters is returning [incomplete message]"

---

## Root Cause

**The Gorgias API does NOT accept these query parameters:**
- ❌ `status` - Not supported (causes 400 error)
- ❌ `cursor` - Only valid when paginating (must be omitted on first request)

The previous documentation was **INCORRECT** when it suggested adding a `status` query parameter.

---

## Quick Fix (5 minutes)

### Step 1: Fix list_tickets Node

1. Open your n8n workflow
2. Find the `list_tickets` HTTP Request node
3. Click to open it
4. Go to "Query Parameters" section

**Current Parameters (INCORRECT):**
```
Name: limit          Value: ={{ $json.limit || 100 }}
Name: status         Value: ={{ $json.status || 'open' }}     ← REMOVE THIS!
Name: order_by       Value: ={{ $json.order_by || 'created_datetime:desc' }}
Name: cursor         Value: ={{ $json.cursor }}               ← MIGHT CAUSE ISSUES
```

**Updated Parameters (CORRECT):**
```
Name: limit          Value: ={{ $json.limit || 100 }}
Name: order_by       Value: ={{ $json.order_by || 'created_datetime:desc' }}
```

**Actions:**
- ✅ **DELETE** the `status` parameter entirely
- ✅ **DELETE** the `cursor` parameter for now (we'll add it back properly later if needed)

5. Save the node

---

### Step 2: Update Summarize Results Node

Since we can't filter by status in the API, we need to filter **after fetching** the tickets.

1. Find the "Summarize Results for AI" node (or "Universal Table Formatter")
2. Click to open it
3. **Replace the entire code** with the updated version:

📄 **Use this file:** `/home/user/Analyst/node_code/SUMMARIZE_RESULTS_WITH_STATUS_FILTER.js`

**Key changes:**
- ✅ Adds `filterByStatus()` function
- ✅ Filters tickets client-side after API fetch
- ✅ Tracks original vs. filtered counts
- ✅ Logs filtering activity for debugging

---

### Step 3: Test

1. Save the workflow
2. Test with:
```
@Gorgias Terminal show open tickets
```

**Expected behavior:**
- API request: `GET /api/tickets?limit=100&order_by=created_datetime:desc` (no status parameter)
- Response: All tickets fetched
- Filtering: Applied in "Summarize Results" node
- Output: Only open tickets shown

---

## Understanding the Fix

### Why Remove `status` Parameter?

The Gorgias API uses a **view-based filtering system**. It does NOT accept simple query parameters like:
- ❌ `?status=open`
- ❌ `?assignee=john@example.com`
- ❌ `?priority=high`

Instead, Gorgias expects:
1. **Use predefined views:** `?view_id=12345`
2. **Filter client-side:** Fetch all, then filter in your code

### Why Remove `cursor` Parameter?

The `cursor` parameter is only used for **pagination**:

- **First request:** NO cursor (must be omitted entirely)
- **Next page:** cursor value from previous response

**Problem:** Setting `cursor` to an empty string `""` or `undefined` causes issues.

**Solution:**
- Only include `cursor` parameter when it has a valid value
- Omit it entirely on the first request

---

## Proper Cursor Implementation (Optional)

If you need pagination, here's how to do it correctly:

### Option A: Conditional Parameters (n8n 1.0+)

Use a "Set" node before `list_tickets`:

```javascript
// Set node code
const params = {
  limit: $json.limit || 100,
  order_by: $json.order_by || 'created_datetime:desc'
};

// Only add cursor if it exists and has a value
if ($json.cursor) {
  params.cursor = $json.cursor;
}

return { json: params };
```

Then in `list_tickets` query parameters:
```
Name: limit       Value: ={{ $json.limit }}
Name: order_by    Value: ={{ $json.order_by }}
Name: cursor      Value: ={{ $json.cursor }}
```

### Option B: Dynamic URL

Instead of query parameters, build the URL dynamically:

```javascript
// URL field
https://ironsidecomputers.gorgias.com/api/tickets?limit={{ $json.limit || 100 }}&order_by={{ $json.order_by || 'created_datetime:desc' }}{{ $json.cursor ? '&cursor=' + $json.cursor : '' }}
```

---

## Verification Checklist

After applying the fix:

- [ ] `list_tickets` node has NO `status` parameter
- [ ] `list_tickets` node has NO `cursor` parameter (or it's properly conditional)
- [ ] Query parameters are: `limit` and `order_by` only
- [ ] `Summarize Results` node has filtering code
- [ ] Test "show open tickets" → only open tickets appear
- [ ] Test "show closed tickets" → only closed tickets appear
- [ ] No 400 errors in execution logs

---

## Testing Commands

### Test 1: Open Tickets
```
@Gorgias Terminal show open tickets
```
**Expected:** Only tickets with `status: "open"`

### Test 2: Closed Tickets
```
@Gorgias Terminal show closed tickets
```
**Expected:** Only tickets with `status: "closed"`

### Test 3: All Tickets
```
@Gorgias Terminal list all tickets
```
**Expected:** All tickets (no filtering)

---

## Monitoring

Check the execution logs for these messages:

```
✅ Found response_data array with 87 tickets
🔍 Status Filter: 87 → 12 tickets (status: open)
✅ Created 12 summaries
```

This confirms:
1. API returned 87 tickets total
2. Filter reduced it to 12 open tickets
3. Summaries were created successfully

---

## Summary

### What Changed:

| Before | After |
|--------|-------|
| ❌ Status filtering in API (400 error) | ✅ Status filtering client-side (works!) |
| ❌ Cursor always included (might cause issues) | ✅ Cursor omitted when not needed |
| ❌ Gorgias rejects request | ✅ Gorgias accepts request |

### How It Works Now:

```
User: "show open tickets"
  ↓
Planning AI: { action: "list_tickets", status: "open" }
  ↓
list_tickets HTTP: GET /api/tickets?limit=100&order_by=created_datetime:desc
  ↓
Gorgias API: Returns ALL tickets (100 tickets)
  ↓
Summarize Results: Filters to only status="open" (12 tickets)
  ↓
Conversational AI: Formats response
  ↓
Slack: "📋 Found 12 open tickets..."
```

---

## Files Reference

- ✅ **Corrected Documentation:** `/home/user/Analyst/docs/FIX_LIST_TICKETS_STATUS_FILTER_CORRECTED.md`
- ✅ **Updated Code:** `/home/user/Analyst/node_code/SUMMARIZE_RESULTS_WITH_STATUS_FILTER.js`
- ❌ **Outdated (Do NOT use):** `/home/user/Analyst/docs/FIX_LIST_TICKETS_STATUS_FILTER.md`

---

## Next Steps

1. **Immediate:** Apply Step 1 and Step 2 above
2. **Test:** Run all three test commands
3. **Verify:** Check execution logs for filtering messages
4. **Optional:** Implement proper cursor pagination if needed

---

**Estimated Time:** 5 minutes
**Impact:** ✅ Fixes 400 errors, ✅ Restores status filtering, ✅ Prevents cursor issues
