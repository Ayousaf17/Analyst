# Multi-Criteria Search Implementation Guide

## 🎯 What This Enables

After implementation, these commands will work:
- "search open tickets"
- "search urgent tickets"
- "search tickets assigned to spencer"
- "search urgent open tickets about billing"
- "search tickets for customer@example.com"
- "search tickets tagged urgent"

---

## 📋 Implementation Steps

### Step 1: Update Build OpenAI Request

**File:** `workflows/FULL_CODE_1_search_tickets_function.js`

1. Open your **Build OpenAI Request** node in n8n
2. Find the `search_tickets` function (around line 81-99)
3. It currently looks like this:
   ```javascript
   {
     type: "function",
     function: {
       name: "search_tickets",
       description: "Search for tickets using keywords or search terms...",
       parameters: {
         type: "object",
         properties: {
           query: {
             type: "string",
             description: "Search term or keywords to find in tickets"
           },
           limit: {
             type: "number",
             description: "Maximum number of results",
             default: 30
           }
         },
         required: ["query"]
       }
     }
   },
   ```

4. **Replace the entire search_tickets function** with this:
   ```javascript
   {
     type: "function",
     function: {
       name: "search_tickets",
       description: "Search for tickets using text search and/or filters like status, priority, assignee, customer, or tags. Use when user wants to find specific tickets matching criteria.",
       parameters: {
         type: "object",
         properties: {
           query: {
             type: "string",
             description: "Text to search for in ticket content, subject, or messages (e.g., 'billing', 'refund', 'shipping issue')"
           },
           status: {
             type: "string",
             enum: ["open", "closed", "pending"],
             description: "Filter by ticket status. Use 'open' for active tickets, 'closed' for resolved, 'pending' for awaiting response"
           },
           priority: {
             type: "string",
             enum: ["low", "normal", "high", "urgent"],
             description: "Filter by ticket priority level"
           },
           customer_email: {
             type: "string",
             description: "Filter by customer's email address to find all tickets from a specific customer"
           },
           assignee_email: {
             type: "string",
             description: "Filter by assignee's email address to find tickets assigned to a specific team member"
           },
           tags: {
             type: "string",
             description: "Filter by tag name (e.g., 'urgent', 'billing', 'ORDER-STATUS')"
           },
           limit: {
             type: "number",
             description: "Maximum number of results to return",
             default: 30
           }
         }
       }
     }
   },
   ```

5. Click "Execute Node" to save
6. Save workflow

**✅ After this step:** OpenAI will now extract status, priority, assignee_email, customer_email, and tags from user requests

---

### Step 2: Add "Build Search Request with Filters" Code Node

**File:** `workflows/FULL_CODE_2_Build_Search_Filters.js`

1. In your workflow canvas, find the connection: **Route by Action → search**
2. Click on the connection line to select it
3. Press Delete to remove the connection
4. Click the **"+" button** to add a new node
5. Search for **"Code"** and select it
6. Name the node: **Build Search Request with Filters**
7. **Paste this entire code:**

```javascript
const input = $json;

// Build filters object based on available criteria
const filters = {};

// Add status filter (open, closed, pending)
if (input.status && input.status !== '') {
  filters.status = input.status;
}

// Add priority filter (low, normal, high, urgent)
if (input.priority && input.priority !== '') {
  filters.priority = input.priority;
}

// Add customer email filter
if (input.customer_email && input.customer_email !== '') {
  filters.customer = { email: input.customer_email };
}

// Add assignee email filter
if (input.assignee_email && input.assignee_email !== '') {
  filters.assignee_user = { email: input.assignee_email };
}

// Add tags filter
if (input.tags && input.tags !== '') {
  // Handle both string and array of tags
  const tagArray = Array.isArray(input.tags) ? input.tags : [input.tags];
  filters.tags = tagArray.map(tag => ({ name: tag }));
}

console.log('🔍 Search Filters:', JSON.stringify(filters, null, 2));

// Build the final search request
const searchRequest = {
  search: input.query || "",
  filters: Object.keys(filters).length > 0 ? filters : ""
};

console.log('📤 Search Request:', JSON.stringify(searchRequest, null, 2));

return [{
  json: searchRequest
}];
```

8. Click "Execute Node" to save
9. **Reconnect the nodes:**
   - Route by Action (search_tickets output) → Build Search Request with Filters
   - Build Search Request with Filters → search

**✅ After this step:** The node will build proper filter objects based on what OpenAI extracted

---

### Step 3: Update search HTTP Request Node Body

**File:** `workflows/FULL_CODE_3_search_node_body.js`

1. Open your **search** HTTP Request node
2. Scroll to the **JSON Body** field
3. It currently shows:
   ```javascript
   ={{ {
     search: $json.query || "",
     filters: ""
   } }}
   ```

4. **Replace it with just:**
   ```javascript
   ={{ $json }}
   ```

5. Click "Execute Node" to save
6. Save workflow

**✅ After this step:** The search node will use the full request object built by the previous Code node

---

## 🧪 Testing

### Test 1: Text Search Only
**Command:** "search tickets about billing"

**Expected:**
- Build Search Request output: `{ search: "billing", filters: "" }`
- Returns tickets containing "billing"

### Test 2: Status Filter
**Command:** "search open tickets"

**Expected:**
- Build Search Request output: `{ search: "", filters: { status: "open" } }`
- Returns only open tickets

### Test 3: Priority Filter
**Command:** "search urgent tickets"

**Expected:**
- Build Search Request output: `{ search: "", filters: { priority: "urgent" } }`
- Returns only urgent priority tickets

### Test 4: Combined Filters
**Command:** "search urgent open tickets about billing"

**Expected:**
- Build Search Request output: `{ search: "billing", filters: { status: "open", priority: "urgent" } }`
- Returns urgent open tickets containing "billing"

### Test 5: Assignee Filter
**Command:** "search tickets assigned to spencer@ironsidecomputers.com"

**Expected:**
- Build Search Request output: `{ search: "", filters: { assignee_user: { email: "spencer@ironsidecomputers.com" } } }`
- Returns tickets assigned to Spencer

---

## 🔍 Troubleshooting

### Issue 1: OpenAI still not extracting filters

**Symptom:** Input to Build Search Request shows empty status, priority, etc.

**Check:**
1. Did you update Build OpenAI Request with the new function definition?
2. Did you save the node?
3. Did you save the workflow?
4. Try reopening Build OpenAI Request to verify the changes saved

**Fix:** Repeat Step 1, making sure to click "Execute Node" and save workflow

### Issue 2: "filters is not a valid string" error

**Symptom:** API error about filters type

**Cause:** The Code node isn't running or search node is using old body

**Fix:**
1. Verify connections: Route by Action → Build Search Request with Filters → search
2. Verify search node body is `={{ $json }}`

### Issue 3: No results returned

**Symptom:** Search returns empty array

**Cause:** Filters too restrictive, no tickets match ALL criteria

**Test:** Try simpler query like "search open tickets" to verify filtering works

---

## 📊 Before vs After

### BEFORE (Current State)

**User:** "search urgent open tickets about billing"

**OpenAI extracts:**
```json
{
  "query": "billing",
  "status": "",
  "priority": ""
}
```

**API Request:**
```json
{
  "search": "billing",
  "filters": ""
}
```

**Result:** All tickets containing "billing" (ignores urgent/open)

### AFTER (Enhanced State)

**User:** "search urgent open tickets about billing"

**OpenAI extracts:**
```json
{
  "query": "billing",
  "status": "open",
  "priority": "urgent"
}
```

**API Request:**
```json
{
  "search": "billing",
  "filters": {
    "status": "open",
    "priority": "urgent"
  }
}
```

**Result:** ONLY urgent open tickets containing "billing"

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] Build OpenAI Request has updated search_tickets function with 7 parameters
- [ ] Build Search Request with Filters Code node exists
- [ ] Connections: Route by Action → Build Search Request → search
- [ ] search node body is `={{ $json }}`
- [ ] Test: "search open tickets" returns only open tickets
- [ ] Test: "search urgent tickets" returns only urgent tickets
- [ ] Test: "search urgent open tickets" returns only urgent AND open tickets

---

## 🎉 Success Criteria

You'll know it's working when:

1. **Input to Build Search Request shows values:**
   ```json
   {
     "status": "open",
     "priority": "urgent",
     "query": "billing"
   }
   ```

2. **Output from Build Search Request shows filters:**
   ```json
   {
     "search": "billing",
     "filters": {
       "status": "open",
       "priority": "urgent"
     }
   }
   ```

3. **API returns filtered results** (fewer tickets, only matching criteria)

---

**Files Reference:**
- `workflows/FULL_CODE_1_search_tickets_function.js`
- `workflows/FULL_CODE_2_Build_Search_Filters.js`
- `workflows/FULL_CODE_3_search_node_body.js`
- `docs/SEARCH_CAPABILITIES.md` (full capabilities guide)

**Last Updated:** November 5, 2025
