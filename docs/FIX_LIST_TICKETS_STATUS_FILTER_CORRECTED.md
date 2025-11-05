# Fix: list_tickets Status Filter - CORRECTED VERSION

## Problem

The Gorgias API returns error: `400 - {"error":{"msg":"Failed to retrieve tickets.","data":{"status":["Unknown field."]}}}`

**Root Cause:** The Gorgias API **does NOT accept `status` as a simple query parameter**. The previous fix documentation was incorrect.

---

## Understanding Gorgias API Filtering

### What Gorgias API Accepts:

The GET `/api/tickets` endpoint accepts these query parameters:

✅ **Supported Parameters:**
- `limit` - Number of tickets to return (default: 100)
- `order_by` - Sort order (e.g., `created_datetime:desc`)
- `cursor` - Pagination cursor for next/previous page
- `view_id` - ID of a predefined view (this provides filtering)

❌ **NOT Supported:**
- `status` - Simple query parameter doesn't work
- `filters` - Not accepted as a query parameter on list endpoint

### How to Filter by Status:

There are **2 options**:

#### Option 1: Use Predefined Views (Recommended)
Create views in Gorgias UI for "Open Tickets" and "Closed Tickets", then use their `view_id`:

```
GET /api/tickets?view_id=12345&limit=100
```

#### Option 2: Filter Results Client-Side
Fetch all tickets and filter them in your code after receiving the response.

---

## The Correct Fix

### Solution: Client-Side Filtering

Since Gorgias API doesn't support status filtering via query parameters, we need to **filter the results after fetching them**.

### Implementation Options:

#### Option A: Filter in Summarize Results Node

Update the "Summarize Results" node (or create a new "Filter Results" node) to filter tickets by status:

**Add this code at the beginning of the summarize/filter node:**

```javascript
// Get the requested status from the parameters
const requestedStatus = $json.status || 'open';

// Get the raw results
let results = $json.results || [];

// Filter by status if specified
if (requestedStatus && requestedStatus !== 'all') {
  results = results.filter(ticket => {
    const ticketStatus = ticket.status?.toLowerCase();
    return ticketStatus === requestedStatus.toLowerCase();
  });
}

// Continue with existing summarize logic...
return {
  json: {
    ...inputData,
    results: results, // Use filtered results
    filtered_by: requestedStatus,
    original_count: ($json.results || []).length,
    filtered_count: results.length
  }
};
```

#### Option B: Use Gorgias Views (Better Long-Term)

1. **Create Views in Gorgias:**
   - Go to Gorgias → Views
   - Create view "Open Tickets" with filter: `ticket.status = "open"`
   - Create view "Closed Tickets" with filter: `ticket.status = "closed"`
   - Note the view IDs from the URL

2. **Update list_tickets Node:**

Add a new query parameter:
- **Name:** `view_id`
- **Value:**
```javascript
{{ $json.status === 'open' ? '12345' : ($json.status === 'closed' ? '12346' : '') }}
```

Replace `12345` and `12346` with your actual view IDs.

---

## Recommended Implementation (Quick Fix)

### Step 1: Remove the `status` Parameter

1. Open `list_tickets` HTTP Request node in n8n
2. Go to "Query Parameters" section
3. **Remove the `status` parameter if it exists** (it causes the 400 error)
4. Keep only:
   - `limit` → `={{ $json.limit || 100 }}`
   - `order_by` → `={{ $json.order_by || 'created_datetime:desc' }}`
   - `cursor` → `={{ $json.cursor }}`

### Step 2: Add Filter Logic to Summarize Results

1. Find the "Summarize Results" or "Universal Table Formatter" node
2. Add the filtering code at the **beginning** of the JavaScript:

```javascript
// ==========================================
// FILTER BY STATUS (if requested)
// ==========================================
const inputData = $input.first().json;
let results = inputData.results || [];
const requestedStatus = inputData.status;

// Apply status filter if specified
if (requestedStatus && requestedStatus !== 'all') {
  const statusLower = requestedStatus.toLowerCase();
  results = results.filter(ticket => {
    const ticketStatus = (ticket.status || '').toLowerCase();
    return ticketStatus === statusLower;
  });

  console.log(`Filtered ${inputData.results.length} tickets to ${results.length} with status: ${requestedStatus}`);
}

// Update the inputData with filtered results
inputData.results = results;

// ==========================================
// CONTINUE WITH EXISTING SUMMARIZE LOGIC...
// ==========================================
```

3. Then continue with the existing summarize/format logic

---

## About the Cursor Parameter

You mentioned: "also the cursor under parameters is returning [incomplete message]"

### Cursor Parameter Behavior:

The `cursor` parameter is used for **pagination**. Here's how it works:

- **First Request:** No cursor → `cursor` is `undefined` or `null`
- **Subsequent Requests:** Use cursor from previous response → `cursor` has a value

### Correct Configuration:

```javascript
Name: cursor
Value: ={{ $json.cursor }}
```

**Important:** Don't use `|| ''` as a fallback for cursor! An empty string `''` is invalid.

If cursor is `undefined`, the parameter should be **omitted entirely** from the request.

### Fix for Cursor:

**Option 1: Conditional Parameter (Best)**

If your n8n version supports it, use "Send Query Parameters" with condition:

```javascript
{{ $json.cursor ? {cursor: $json.cursor} : {} }}
```

**Option 2: Pre-processing Node**

Add a "Set" node before `list_tickets` that only includes cursor if it exists:

```javascript
{
  limit: $json.limit || 100,
  order_by: $json.order_by || 'created_datetime:desc',
  ...($ json.cursor ? {cursor: $json.cursor} : {})
}
```

---

## Testing

### Test 1: List Open Tickets
```
@Gorgias Terminal show open tickets
```

**Expected:**
- API request: `GET /api/tickets?limit=100&order_by=created_datetime:desc`
- Client-side filter applied: only tickets with `status: "open"`
- Response: Table showing only open tickets

### Test 2: List Closed Tickets
```
@Gorgias Terminal show closed tickets
```

**Expected:**
- Same API request (no status parameter)
- Client-side filter applied: only tickets with `status: "closed"`
- Response: Table showing only closed tickets

### Test 3: List All Tickets
```
@Gorgias Terminal list all tickets
```

**Expected:**
- Same API request
- No filter applied (status = "all" or undefined)
- Response: Table showing all tickets

---

## Summary of Changes

### ❌ OLD (Incorrect) Approach:
```
GET /api/tickets?limit=100&status=open&order_by=created_datetime:desc
                              ↑ CAUSES 400 ERROR
```

### ✅ NEW (Correct) Approach:
```
GET /api/tickets?limit=100&order_by=created_datetime:desc
     ↓
Fetch all tickets
     ↓
Filter client-side by status in Summarize Results node
```

---

## Files to Update

1. **list_tickets node:** Remove `status` parameter
2. **Summarize Results node:** Add filtering logic
3. **Documentation:** Mark old `FIX_LIST_TICKETS_STATUS_FILTER.md` as incorrect

---

## Why the Original Fix Was Wrong

The original documentation (`FIX_LIST_TICKETS_STATUS_FILTER.md`) suggested adding `status` as a query parameter:

```
?status=open  ← Gorgias API does NOT support this
```

This was based on an assumption that Gorgias API works like typical REST APIs. However, Gorgias uses a **view-based filtering system** instead.

**The Gorgias API Design:**
- Filtering is done via `view_id` (predefined views)
- Or by fetching all and filtering client-side
- NOT via simple query parameters like `?status=open`

---

## Next Steps

1. **Immediate:** Remove `status` parameter from `list_tickets` node query parameters
2. **Quick Fix:** Add client-side filtering to Summarize Results node
3. **Long-Term:** Consider creating Gorgias views and using `view_id` parameter

---

## Related Documentation

- ❌ **OUTDATED:** `docs/FIX_LIST_TICKETS_STATUS_FILTER.md` (incorrect - suggests using status parameter)
- ✅ **CORRECT:** This document (client-side filtering approach)
- 📚 **Gorgias API:** View object documentation shows proper filter syntax

---

## Reference: Gorgias API Filter Syntax

From Gorgias View object documentation:

```json
{
  "filters": "eq(ticket.status, 'open')"
}
```

This syntax is used for creating **Views**, not for the list tickets endpoint query parameters.
