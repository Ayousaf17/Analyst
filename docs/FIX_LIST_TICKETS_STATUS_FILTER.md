# Fix: list_tickets Not Respecting Status Filter

## Problem

User asks: **"show open tickets"**
System returns: **Closed tickets**

**Root Cause:** The `list_tickets` HTTP Request node is not sending the `status` parameter to the Gorgias API.

---

## Current Behavior

**User command:**
```
@Gorgias Terminal show open tickets
```

**Expected:** Only open tickets
**Actual:** All tickets (open + closed)

**Why:** The HTTP request node only sends:
- ✅ `limit`
- ✅ `order_by`
- ✅ `cursor`
- ❌ **Missing: `status`**

So even though the Plan AI correctly extracts `status: "open"`, the HTTP request ignores it!

---

## The Fix (2 minutes)

### Step 1: Open list_tickets Node
1. In n8n workflow editor, find the `list_tickets` HTTP Request node
2. Click to open it

### Step 2: Add Status Parameter
1. Scroll down to **"Query Parameters"** section
2. You should see 3 existing parameters:
   - `limit`
   - `order_by`
   - `cursor`

3. Click **"Add Parameter"**
4. Set the new parameter:
   - **Name:** `status`
   - **Value:** `={{ $json.status || 'open' }}`

### Step 3: Reorder Parameters (Optional but Recommended)
Drag the new `status` parameter to be **second** (after `limit`, before `order_by`).

Final order should be:
1. `limit`
2. `status` ← **NEW**
3. `order_by`
4. `cursor`

### Step 4: Save and Test
1. Click **"Save"** or **"Execute Node"**
2. Test with: `@Gorgias Terminal show open tickets`
3. Should now only show open tickets!

---

## Updated Configuration

### Query Parameters (CORRECT):
```
Parameter 1:
  Name: limit
  Value: ={{ $json.limit || 100 }}

Parameter 2:
  Name: status
  Value: ={{ $json.status || 'open' }}     ← NEW!

Parameter 3:
  Name: order_by
  Value: ={{ $json.order_by || 'created_datetime:desc' }}

Parameter 4:
  Name: cursor
  Value: ={{ $json.cursor }}
```

---

## How It Works

### Before Fix:
```
User: "show open tickets"
  ↓
Plan AI: { action: "list_tickets", status: "open" }
  ↓
list_tickets HTTP: GET /api/tickets?limit=100&order_by=created_datetime:desc
  ↓
API returns: ALL tickets (open + closed)
```

### After Fix:
```
User: "show open tickets"
  ↓
Plan AI: { action: "list_tickets", status: "open" }
  ↓
list_tickets HTTP: GET /api/tickets?limit=100&status=open&order_by=created_datetime:desc
  ↓
API returns: ONLY open tickets ✅
```

---

## Default Behavior

With `={{ $json.status || 'open' }}`, the behavior is:

| User Request | status value | API Filter |
|--------------|--------------|------------|
| "show open tickets" | `"open"` | Only open |
| "show closed tickets" | `"closed"` | Only closed |
| "list tickets" (vague) | `"open"` (default) | Only open |
| "show all tickets" | `null` (no default) | All tickets |

**Reasoning:** Most users want open tickets by default, so we default to `"open"` when no status is specified.

---

## Testing Commands

After applying the fix, test these:

### Test 1: Open Tickets
```
@Gorgias Terminal show open tickets
```
**Expected:** All tickets have status = "open"

### Test 2: Closed Tickets
```
@Gorgias Terminal show closed tickets
```
**Expected:** All tickets have status = "closed"

### Test 3: All Tickets
```
@Gorgias Terminal list all tickets
```
**Expected:** Mix of open and closed tickets

---

## Verification Checklist

After applying the fix:

- [ ] `list_tickets` node has 4 query parameters
- [ ] Second parameter is `status` with value `={{ $json.status || 'open' }}`
- [ ] Test "show open tickets" - only returns open tickets
- [ ] Test "show closed tickets" - only returns closed tickets
- [ ] Check API logs in Supabase - URL includes `?status=open`

---

## Related Files

- **Node:** `list_tickets` HTTP Request node
- **Position:** Routed from "Route by Action" node
- **API Endpoint:** `https://ironsidecomputers.gorgias.com/api/tickets`
- **Query Params:** limit, **status** (new), order_by, cursor

---

## Summary

✅ **What's Fixed:** Status filter now works
✅ **User Impact:** "show open tickets" returns only open tickets
✅ **Time to Fix:** 2 minutes
✅ **Breaking Changes:** None (defaults to "open" if not specified)

**Next Step:** Update the `list_tickets` node in n8n workflow as described above.
