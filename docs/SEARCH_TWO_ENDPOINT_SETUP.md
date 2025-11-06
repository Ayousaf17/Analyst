# Complete Search Setup with Two Endpoints

**Problem:** Gorgias API has two different search endpoints that can't be combined:
- `/api/tickets/search` - Text search (doesn't support filtering)
- `/api/tickets` - List with filters (doesn't support text search)

**Solution:** Route to the correct endpoint based on search type

---

## Architecture

```
Route by Action (search_tickets output)
    ↓
Build Search Request with Filters
    ↓
IF: Check Endpoint Type
    ├─ TRUE (_use_search_endpoint = true) → Search Text Node (POST /api/tickets/search)
    └─ FALSE (_use_search_endpoint = false) → Search Filter Node (GET /api/tickets)
```

---

## Step 1: Update "Build Search Request with Filters"

**Replace the entire code with:** `workflows/Build_Search_Request_FINAL.js`

This code outputs `_use_search_endpoint` flag to determine routing.

---

## Step 2: Add IF Node for Routing

1. **Delete** the current connection from Build Search Request to search node
2. **Add IF node** after Build Search Request
3. **Name it:** "Check Search Type"
4. **Configure condition:**
   - **Value 1:** `={{ $json._use_search_endpoint }}`
   - **Operation:** Equal to
   - **Value 2:** `true`

---

## Step 3: Rename Current search Node

1. Click on your current "search" HTTP node
2. Rename it to: **Search Filter (List)**
3. **Configure:**
   - **Method:** GET
   - **URL:** `https://ironsidecomputers.gorgias.com/api/tickets`
   - **Send Body:** NO (turn off)
   - **Send Query Parameters:** YES (turn on)
   - **Query Parameters Expression:**
     ```javascript
     ={{ Object.entries($json).filter(([key]) => !key.startsWith('_')).map(([key, value]) => ({name: key, value: String(value)})) }}
     ```
     (This filters out the `_use_search_endpoint` flag and sends only the actual params)

---

## Step 4: Add New Search Text Node

1. **Add new HTTP Request node**
2. **Name it:** "Search Text"
3. **Configure:**
   - **Method:** POST
   - **URL:** `https://ironsidecomputers.gorgias.com/api/tickets/search`
   - **Authentication:** HTTP Basic Auth (Gorgias)
   - **Send Headers:** YES
     - Accept: application/json
     - Content-Type: application/json
   - **Send Body:** YES
   - **Body Content Type:** JSON
   - **JSON Body:**
     ```javascript
     ={{ {
       search: $json.search || "",
       filters: $json.filters || ""
     } }}
     ```
   - **Options → Response:**
     - Full Response: YES
     - Response Format: JSON

---

## Step 5: Connect the Nodes

```
Build Search Request with Filters
    ↓
Check Search Type (IF)
    ├─ TRUE → Search Text (POST /api/tickets/search)
    └─ FALSE → Search Filter (GET /api/tickets)
```

Both Search Text and Search Filter should output to the same next node (whatever comes after search).

---

## How It Works

### Example 1: Text Search Only

**User:** "search tickets about billing"

**Build Search Request output:**
```json
{
  "_use_search_endpoint": true,
  "search": "billing",
  "filters": ""
}
```

**Routing:** TRUE → Search Text → POST to /api/tickets/search

---

### Example 2: Filter Only

**User:** "show me closed tickets by ayub, his email is ay17yousaf@gmail.com"

**Build Search Request output:**
```json
{
  "_use_search_endpoint": false,
  "status": "closed",
  "assignee_email": "ay17yousaf@gmail.com",
  "limit": 50,
  "order_by": "created_datetime:desc"
}
```

**Routing:** FALSE → Search Filter → GET to /api/tickets?status=closed&assignee_email=...

---

### Example 3: Both Text and Filters

**User:** "search urgent tickets about billing"

**Build Search Request output:**
```json
{
  "_use_search_endpoint": false,
  "priority": "urgent",
  "limit": 50,
  "order_by": "created_datetime:desc"
}
```

**Routing:** FALSE → Search Filter → GET to /api/tickets?priority=urgent...

**Note:** Text search is ignored when filters are present (API limitation)

---

## Testing

### Test Case 1: Text Search
**Command:** "search tickets about billing"
**Expected:** Routes to Search Text, uses POST /api/tickets/search

### Test Case 2: Status Filter
**Command:** "show me closed tickets"
**Expected:** Routes to Search Filter, uses GET /api/tickets?status=closed

### Test Case 3: Assignee Filter
**Command:** "show me tickets assigned to ay17yousaf@gmail.com"
**Expected:** Routes to Search Filter, uses GET /api/tickets?assignee_email=...

### Test Case 4: Combined Filters
**Command:** "show me closed urgent tickets"
**Expected:** Routes to Search Filter, uses GET /api/tickets?status=closed&priority=urgent

---

## Troubleshooting

### Issue: "JSON parameter needs to be valid JSON"
**Cause:** Search Filter node has "Send Body" enabled
**Fix:** Turn OFF "Send Body" in Search Filter node (GET doesn't use body)

### Issue: No results from text search
**Cause:** Routed to wrong endpoint
**Fix:** Check IF node condition is exactly `={{ $json._use_search_endpoint }}`

### Issue: Filters not working
**Cause:** Query parameters not set up correctly
**Fix:** Verify Query Parameters expression filters out `_use_search_endpoint`

---

**Last Updated:** November 6, 2025
