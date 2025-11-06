# Simplified Search Architecture

## Overview

After extensive testing with the Gorgias API, we discovered that the `/api/tickets/search` endpoint has severe limitations and does NOT support filtering by status, priority, assignee, customer, tags, or date ranges.

**Solution:** Keep text search via API, do ALL filtering client-side after fetching tickets.

## Architecture

```
┌─────────────────────────────────┐
│  Build Search Request (Code)    │
│  - Extracts text query          │
│  - Stores ALL filters in        │
│    _client_side_filters object  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Search Text (HTTP Request)     │
│  POST /api/tickets/search       │
│  Body: { search, filters }      │
│  (ONLY text search, no filters) │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Merge Node                     │
│  - Input 1: Build Search output │
│  - Input 2: Search API response │
│  - Preserves filter flags       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Filter Results (Code)          │
│  - Applies ALL client-side      │
│    filters to tickets:          │
│    • Status                     │
│    • Priority                   │
│    • Assignee email             │
│    • Customer email             │
│    • Tags                       │
│    • Date range                 │
└────────────┬────────────────────┘
             │
             ▼
        (Filtered tickets)
```

## Implementation Steps

### 1. Build Search Request Node (Code)

**File:** `workflows/Build_Search_Request_SIMPLE.js`

**Input:** From OpenAI function call (search_tickets)
```json
{
  "query": "shipping issue",
  "status": "closed",
  "assignee_email": "ay17yousaf@gmail.com",
  "date_from": "2024-01-01",
  "date_to": "2024-01-31"
}
```

**Output:**
```json
{
  "search": "shipping issue",
  "filters": "",
  "_client_side_filters": {
    "status": "closed",
    "assignee_email": "ay17yousaf@gmail.com",
    "date_from": "2024-01-01",
    "date_to": "2024-01-31"
  }
}
```

**Code:** Copy entire contents of `Build_Search_Request_SIMPLE.js`

### 2. Search Text Node (HTTP Request)

**Method:** POST
**URL:** `https://{{ $credentials.domain }}/api/tickets/search`
**Authentication:** Gorgias API credentials
**JSON Body:**
```javascript
{
  "search": "={{ $json.search }}",
  "filters": "={{ $json.filters }}"
}
```

Or use the simpler approach from `search_node_json_body_SIMPLE.js`:
```javascript
={{
  {
    search: $json.search || "",
    filters: $json.filters || ""
  }
}}
```

**Note:** This intentionally does NOT send `_client_side_filters` to the API - that's metadata for our workflow only.

### 3. Merge Node

**Mode:** Multiplex
**Input 1:** Build Search Request output (has filter flags)
**Input 2:** Search Text API response (has tickets)

This preserves the `_client_side_filters` object so Filter Results can access it.

### 4. Filter Results Node (Code)

**File:** `workflows/Filter_Results_CLIENT_SIDE_COMPLETE.js`

**Input 1 (from Merge):** Build Search Request output with `_client_side_filters`
**Input 2 (from Merge):** Search API response with tickets array

**Processing:**
1. Extracts `_client_side_filters` from first input
2. Extracts tickets array from second input (API response)
3. Applies filters sequentially:
   - Status filter
   - Priority filter
   - Assignee email filter
   - Customer email filter
   - Tags filter
   - Date range filter
4. Returns filtered tickets with metadata

**Output:**
```json
{
  "data": [ /* filtered tickets */ ],
  "meta": {
    "total_count": 5,
    "filtered": true,
    "applied_filters": {
      "status": "closed",
      "assignee_email": "ay17yousaf@gmail.com"
    }
  }
}
```

**Code:** Copy entire contents of `Filter_Results_CLIENT_SIDE_COMPLETE.js`

## Example Queries

### Example 1: Text Search Only
**User:** "find tickets about billing"

**OpenAI Function Call:**
```json
{
  "function": "search_tickets",
  "arguments": {
    "query": "billing"
  }
}
```

**Build Search Request Output:**
```json
{
  "search": "billing",
  "filters": "",
  "_client_side_filters": {}
}
```

**Result:** API searches for "billing", no client-side filtering needed.

### Example 2: Filter Only (No Text)
**User:** "show me closed tickets by ayub"

**OpenAI Function Call:**
```json
{
  "function": "search_tickets",
  "arguments": {
    "status": "closed",
    "assignee_email": "ay17yousaf@gmail.com"
  }
}
```

**Build Search Request Output:**
```json
{
  "search": "",
  "filters": "",
  "_client_side_filters": {
    "status": "closed",
    "assignee_email": "ay17yousaf@gmail.com"
  }
}
```

**Result:** API fetches recent tickets (empty search), client-side filters by status and assignee.

### Example 3: Complex Multi-Criteria
**User:** "show me closed tickets about shipping from last month by spencer"

**OpenAI Function Call:**
```json
{
  "function": "search_tickets",
  "arguments": {
    "query": "shipping",
    "status": "closed",
    "assignee_email": "spencer@example.com",
    "date_from": "2024-01-01",
    "date_to": "2024-01-31"
  }
}
```

**Build Search Request Output:**
```json
{
  "search": "shipping",
  "filters": "",
  "_client_side_filters": {
    "status": "closed",
    "assignee_email": "spencer@example.com",
    "date_from": "2024-01-01",
    "date_to": "2024-01-31"
  }
}
```

**Result:** API searches for "shipping", client-side filters by status, assignee, and date range.

## API Limitations Discovered

### /api/tickets/search Endpoint
- ✅ Supports: `search` (text query), `filters` (string, not object)
- ❌ Does NOT support: limit, order_by, status, priority, assignee_email, customer_email, tags, date ranges
- ❌ Errors with: "filters": ["Not a valid string."] when sending objects
- ❌ Requires: `search` parameter (cannot omit, even for filter-only queries)

### /api/tickets Endpoint (List)
- ✅ Supports: limit, order_by
- ❌ Does NOT support: status, assignee_email filtering
- ❌ Errors with: "status": ["Unknown field."], "assignee_email": ["Unknown field."]

## Why This Approach Works

1. **Reliability:** No complex API routing or endpoint switching
2. **Simplicity:** One endpoint for search, all filtering happens in one place
3. **Flexibility:** Can add new filter types without API constraints
4. **Performance:** Fetch once via text search, filter in-memory
5. **Maintainability:** Clear separation of concerns

## Console Logging

The Filter Results node includes detailed logging:

```
🔧 Applying client-side filters: { status: 'closed', assignee_email: '...' }
📊 Initial ticket count: 25
✅ Status filter (closed): 25 → 12
✅ Assignee filter (ay17yousaf@gmail.com): 12 → 5
📊 Final ticket count after all filters: 5
```

This helps debug which filters are being applied and how many tickets pass each filter.

## Files Reference

- `workflows/Build_Search_Request_SIMPLE.js` - Build request with filters
- `workflows/Filter_Results_CLIENT_SIDE_COMPLETE.js` - Apply all filters
- `workflows/search_node_json_body_SIMPLE.js` - HTTP Request body (optional)
- `workflows/Build_OpenAI_Request_COMPLETE.js` - Full function definitions

## Testing Checklist

- [ ] Text search only: "find tickets about billing"
- [ ] Status filter only: "show me open tickets"
- [ ] Assignee filter only: "show me tickets assigned to ayub"
- [ ] Multiple filters: "show me closed tickets by ayub"
- [ ] Date range: "show me tickets from last week"
- [ ] Complex query: "show me closed tickets about shipping from last month by spencer"
- [ ] Tags filter: "show me tickets tagged as urgent"
- [ ] Priority filter: "show me high priority tickets"

## Next Steps

1. Update Build Search Request node with `Build_Search_Request_SIMPLE.js`
2. Update Search Text node JSON body to filter out `_client_side_filters`
3. Ensure Merge node is connected properly (Build Request → Input 1, Search → Input 2)
4. Update Filter Results node with `Filter_Results_CLIENT_SIDE_COMPLETE.js`
5. Test with various query types
6. Commit changes to git
