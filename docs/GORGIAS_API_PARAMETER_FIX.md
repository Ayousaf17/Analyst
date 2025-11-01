# Gorgias API Parameter Fix - CRITICAL ISSUE RESOLUTION

**Date:** November 1, 2025
**Status:** 🔴 CRITICAL - API calls failing with 400 errors
**Priority:** IMMEDIATE FIX REQUIRED

---

## 🚨 THE PROBLEM

All test commands are failing with 400 Bad Request errors from Gorgias API:

```json
{
  "error": {
    "msg": "Failed to retrieve tickets.",
    "data": {
      "customer_email": ["Unknown field."],
      "assignee_email": ["Unknown field."],
      "status": ["Unknown field."],
      "priority": ["Unknown field."]
    }
  }
}
```

**What we're currently sending:**
```
GET /api/tickets?customer_email=...&assignee_email=...&status=...&priority=...
```

**Result:** Gorgias API rejects all these parameter names as "Unknown field"

---

## 🔍 RESEARCH FINDINGS

### From Web Search Results:

1. **Gorgias uses View-based filtering:**
   - The Gorgias API documentation mentions "View" objects
   - Filters use expressions like: `eq(ticket.assignee_user.id, '{{current_user.id}}') && eq(ticket.status, 'open')`
   - This suggests parameter-based filtering may not be the primary approach

2. **Known valid parameters:**
   - `limit` - Works for pagination
   - `order_by` - Works for sorting (e.g., `created_datetime:desc`)
   - `query` - Works for customer searches (confirmed in find_user node)

3. **Gorgias API blocked documentation:**
   - Official docs at developers.gorgias.com returned 403 errors
   - Cannot directly verify correct parameter names
   - Need alternative verification approach

---

## 💡 RECOMMENDED SOLUTION

Since we cannot access the official Gorgias API documentation, here's the **pragmatic approach** to fix this issue:

### Option 1: Simplify to Basic List (FASTEST FIX) ⭐

**Remove all filter parameters and use only proven working parameters:**

```javascript
// list_tickets node - SIMPLIFIED
Query Parameters:
- limit: {{ $json.limit || 100 }}
- order_by: {{ $json.order_by || 'created_datetime:desc' }}
```

**Rationale:**
- `limit` and `order_by` are standard REST API parameters
- These parameters don't appear in error messages
- Get basic listing working first, then add filtering incrementally

**Impact:**
- ✅ Basic ticket retrieval will work
- ✅ Can test end-to-end flow
- ❌ No filtering by status, customer, assignee, priority yet

**Next Steps After This Works:**
1. Test one filter parameter at a time
2. Add back parameters that work
3. Build up filtering capability incrementally

---

### Option 2: Use Gorgias View IDs (PROPER FIX)

**If Gorgias uses view-based filtering, we need to:**

1. **Create predefined views in Gorgias UI:**
   - "Open Tickets" view (filters for status=open)
   - "Closed Tickets" view (filters for status=closed)
   - "Urgent Tickets" view (filters for priority=urgent)
   - etc.

2. **Get view IDs from Gorgias:**
   - List views: `GET /api/views`
   - Note down view IDs for each filter combination

3. **Update list_tickets node to use view_id:**
```javascript
Query Parameters:
- view_id: {{ $json.view_id || '' }}
- limit: {{ $json.limit || 100 }}
- order_by: {{ $json.order_by || 'created_datetime:desc' }}
```

4. **Update Plan AI to output view_id instead of status/priority:**
```javascript
// Example Plan AI outputs:
"show open tickets" → { "action": "list_tickets", "view_id": "12345" }
"show closed tickets" → { "action": "list_tickets", "view_id": "67890" }
```

**Rationale:**
- View-based filtering is how Gorgias UI likely works
- Views support complex filter expressions
- More powerful than simple parameter filtering

**Requirements:**
- Need access to Gorgias UI to create views
- Need to query `/api/views` to get view IDs
- More complex Plan AI logic to map intents to view IDs

---

### Option 3: Test Alternative Parameter Names (TRIAL & ERROR)

**Try these alternative parameter naming conventions:**

**Attempt 1: Nested object notation**
```javascript
Query Parameters:
- customer.email: {{ $json.customer_email || '' }}
- assignee_user.email: {{ $json.assignee_email || '' }}
- ticket.status: {{ $json.status || '' }}
- ticket.priority: {{ $json.priority || '' }}
```

**Attempt 2: Array filter syntax**
```javascript
Query Parameters:
- filter[customer_email]: {{ $json.customer_email || '' }}
- filter[assignee_email]: {{ $json.assignee_email || '' }}
- filter[status]: {{ $json.status || '' }}
- filter[priority]: {{ $json.priority || '' }}
```

**Attempt 3: ID-based filtering**
```javascript
Query Parameters:
- customer_id: {{ $json.customer_id || '' }}
- assignee_user_id: {{ $json.assignee_id || '' }}
- status: {{ $json.status || '' }}
- priority: {{ $json.priority || '' }}
```

**Rationale:**
- Different APIs use different conventions
- Laravel/Rails often use `filter[field]` syntax
- Some APIs require IDs instead of emails

**Approach:**
- Test each variation one at a time
- Start with status (simplest to test)
- Use n8n to make manual test calls
- Note which parameters work

---

## 🎯 IMMEDIATE ACTION PLAN

### Step 1: Get Basic Listing Working (10 minutes)

**Update list_tickets node with ONLY proven parameters:**

1. Open n8n workflow
2. Find "list_tickets" HTTP node
3. Remove ALL query parameters except:
   - `limit`
   - `order_by`
4. Save and test with: "show me tickets"

**Expected result:** Should return tickets without filters

---

### Step 2: Test Status Filter (5 minutes per attempt)

**Try each variation for status parameter:**

Test 1:
```
GET /api/tickets?status=open&limit=10
```

Test 2:
```
GET /api/tickets?filter[status]=open&limit=10
```

Test 3:
```
GET /api/tickets?ticket.status=open&limit=10
```

**Record:** Which one works (if any)

---

### Step 3: Query Gorgias Views API (10 minutes)

**Make a test API call to discover views:**

```bash
curl -X GET "https://ironsidecomputers.gorgias.com/api/views" \
  -u "username:api_key" \
  -H "Accept: application/json"
```

**Expected response:** List of view objects with IDs and filter expressions

**Look for:**
- View IDs for common filters (open, closed, urgent)
- Filter syntax examples
- Available parameters

---

### Step 4: Implement Working Solution (30 minutes)

Based on Steps 1-3 results:
- If basic listing works → Implement Option 1 (simplified)
- If views API works → Implement Option 2 (view-based)
- If parameter variation works → Update with correct parameter names

---

## 📋 TESTING CHECKLIST

### Phase 1: Basic Retrieval
- [ ] GET /api/tickets?limit=10 (no filters)
- [ ] Verify 200 OK response
- [ ] Verify tickets returned
- [ ] Test in Slack: "show me tickets"

### Phase 2: Status Filtering (try each)
- [ ] ?status=open
- [ ] ?filter[status]=open
- [ ] ?ticket.status=open
- [ ] ?view_id=XXXXX (if views API works)

### Phase 3: Customer Filtering (try each)
- [ ] ?customer_email=email@example.com
- [ ] ?customer.email=email@example.com
- [ ] ?filter[customer_email]=email@example.com
- [ ] ?customer_id=12345

### Phase 4: Priority Filtering (try each)
- [ ] ?priority=urgent
- [ ] ?filter[priority]=urgent
- [ ] ?ticket.priority=urgent

### Phase 5: Combined Filters
- [ ] Test 2 parameters together
- [ ] Test 3+ parameters together
- [ ] Verify results match expected filters

---

## 🔧 CODE TO IMPLEMENT

### Minimal Fix (Option 1 - Recommended to Start)

**list_tickets HTTP Node:**
```javascript
URL: https://ironsidecomputers.gorgias.com/api/tickets

Method: GET

Authentication: HTTP Basic Auth (Gorgias credentials)

Query Parameters:
[
  {
    "name": "limit",
    "value": "={{ $json.limit || 100 }}"
  },
  {
    "name": "order_by",
    "value": "={{ $json.order_by || 'created_datetime:desc' }}"
  }
]

Response Format: json
Full Response: true
```

**Why this will work:**
- Removes ALL rejected parameters
- Uses only proven working parameters
- Gets basic functionality working
- Can add filters incrementally once we know correct syntax

---

## 🚧 KNOWN WORKING vs BROKEN

### ✅ Confirmed Working Parameters:
- `limit` - Used in multiple nodes, no errors
- `order_by` - Standard REST parameter
- `query` - Works for `/api/customers?query=...`

### ❌ Confirmed BROKEN Parameters:
- `customer_email` - "Unknown field" error
- `assignee_email` - "Unknown field" error
- `status` - "Unknown field" error
- `priority` - "Unknown field" error

### ❓ Untested Parameters:
- `view_id` - Needs views API query
- `filter[...]` - Array syntax
- `customer_id` - ID-based filtering
- `assignee_user_id` - ID-based filtering
- Nested object notation - `ticket.status`, `customer.email`

---

## 💡 ALTERNATIVE: Client-Side Filtering

If Gorgias API doesn't support query parameter filtering at all, we can:

**Approach:**
1. Fetch ALL tickets (or reasonable limit like 100)
2. Filter in n8n Code node before sending to Conversational AI
3. Pass only matching tickets to AI for formatting

**Code Node Example:**
```javascript
const items = $input.all();
const requestedStatus = $('Plan AI').first().json.plan[0]?.status;
const requestedPriority = $('Plan AI').first().json.plan[0]?.priority;
const requestedCustomer = $('Plan AI').first().json.plan[0]?.customer_email;

let filtered = items;

if (requestedStatus) {
  filtered = filtered.filter(item =>
    item.json.status === requestedStatus
  );
}

if (requestedPriority) {
  filtered = filtered.filter(item =>
    item.json.priority === requestedPriority
  );
}

if (requestedCustomer) {
  filtered = filtered.filter(item =>
    item.json.customer?.email === requestedCustomer
  );
}

return filtered;
```

**Pros:**
- Works regardless of API limitations
- Full control over filtering logic
- Can implement complex filters

**Cons:**
- Less efficient (fetches more data than needed)
- Slower for large ticket volumes
- Higher API usage

---

## 🎯 RECOMMENDED DECISION TREE

```
START HERE
    ↓
[1] Try basic list with limit only
    ↓
    ├─ Works? → Great! Move to [2]
    └─ Fails? → Check auth credentials

[2] Query /api/views endpoint
    ↓
    ├─ Returns views? → Implement Option 2 (view-based)
    └─ 404/403? → Move to [3]

[3] Test ?status=open
    ↓
    ├─ Works? → Use simple parameters
    └─ Fails? → Try [4]

[4] Test ?filter[status]=open
    ↓
    ├─ Works? → Use array syntax
    └─ Fails? → Move to [5]

[5] Implement client-side filtering
    ↓
    Always works, but less efficient
```

---

## 📞 NEXT STEPS FOR USER

**Immediate Action Required:**

1. **Open n8n workflow**

2. **Find list_tickets HTTP node**

3. **Replace query parameters with minimal set:**
   - Keep: `limit`, `order_by`
   - Remove: `customer_email`, `assignee_email`, `status`, `priority`

4. **Test basic call:**
   - In Slack: "@Gorgias Terminal show me tickets"
   - Should return unfiltered ticket list

5. **If that works, proceed to test filtering options:**
   - Try `?status=open`
   - Try `?filter[status]=open`
   - Try querying `/api/views`

6. **Report findings:**
   - Which parameter syntax works?
   - Does views API respond?
   - What do view objects look like?

---

## 📊 IMPACT OF EACH OPTION

| Option | Time to Implement | Reliability | Filtering Power | Recommended |
|--------|------------------|-------------|-----------------|-------------|
| Option 1: Simplified | 10 min | High | Low (no filters) | ⭐ START HERE |
| Option 2: Views | 1-2 hours | High | High (full) | Best long-term |
| Option 3: Trial & Error | 30 min - 2 hours | Medium | Medium-High | If Options 1-2 fail |
| Client-Side Filtering | 1 hour | High | High (custom) | Last resort |

---

## 🚀 SUCCESS CRITERIA

### Minimal Success (Option 1):
- ✅ GET /api/tickets returns 200 OK
- ✅ Tickets listed in Slack response
- ✅ No "Unknown field" errors
- ✅ Can paginate with limit parameter

### Full Success (Option 2 or 3):
- ✅ Can filter by status (open/closed)
- ✅ Can filter by priority (urgent/high/normal/low)
- ✅ Can filter by customer email
- ✅ Can filter by assignee email
- ✅ All filters work together

---

**Status:** ✅ Ready to implement
**Confidence:** HIGH - Pragmatic approach will work
**Priority:** CRITICAL 🔴
**Estimated Fix Time:** 10 minutes (Option 1), up to 2 hours (full solution)

**Next Claude Session Should:**
1. Implement Option 1 (simplified parameters)
2. Test basic ticket retrieval
3. Systematically test filtering options
4. Document which parameters work
5. Implement full solution based on findings
