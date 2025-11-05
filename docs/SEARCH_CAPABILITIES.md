# Search Tickets - Full Capabilities Guide

**Date:** November 5, 2025

---

## 🎯 Overview

The `search_tickets` function can now handle **multi-criteria searches** including:
- Text search (keywords in ticket content)
- Status filtering (open, closed, pending)
- Priority filtering (low, normal, high, urgent)
- Customer email filtering
- Assignee filtering (who's assigned)
- Tag filtering

---

## 📋 Current Implementation (Basic)

**What works NOW:**

```
Status: BASIC TEXT SEARCH ONLY ❌
```

**Current search node body:**
```javascript
={{ {
  search: $json.query || "",
  filters: ""
} }}
```

**Limitations:**
- ❌ Only searches text content
- ❌ Ignores status, priority, assignee, customer, tags
- ❌ Can't filter by specific criteria

**Example queries that DON'T work properly:**
- "search open tickets" → Returns ALL tickets (ignores "open")
- "search urgent tickets" → Returns ALL tickets (ignores "urgent")
- "search tickets assigned to john@example.com" → Returns ALL tickets
- "search tickets for customer@example.com" → Returns ALL tickets

---

## 🚀 Enhanced Implementation (Multi-Criteria)

**To enable full filtering, add this Code node:**

### Step 1: Add Code Node Before search HTTP Request

1. Add **Code** node between Route by Action and search HTTP Request
2. Name it: **"Build Search Request with Filters"**
3. Copy code from: `workflows/Build_Search_Request_with_Filters.js`

### Step 2: Update search Node JSON Body

Change the search node body from:
```javascript
={{ {
  search: $json.query || "",
  filters: ""
} }}
```

To:
```javascript
={{ $json }}
```

(The Code node now builds the entire request)

### Step 3: Reconnect Nodes

```
Route by Action (search_tickets output)
    ↓
Build Search Request with Filters (NEW CODE NODE)
    ↓
search (HTTP Request node)
```

---

## ✅ Supported Commands After Enhancement

### 1. Text Search (Already Working)

**User:** "search tickets about billing"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "query": "billing"
}
```

**API Request:**
```json
{
  "search": "billing",
  "filters": ""
}
```

**Result:** All tickets containing "billing" in content

---

### 2. Status Filtering

**User:** "search open tickets"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "status": "open"
}
```

**API Request:**
```json
{
  "search": "",
  "filters": {
    "status": "open"
  }
}
```

**Result:** All open tickets

**Other variations:**
- "search closed tickets"
- "search pending tickets"
- "show me all open tickets"

---

### 3. Priority Filtering

**User:** "search urgent tickets"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "priority": "urgent"
}
```

**API Request:**
```json
{
  "search": "",
  "filters": {
    "priority": "urgent"
  }
}
```

**Result:** All urgent priority tickets

**Other variations:**
- "search high priority tickets"
- "show me normal priority tickets"
- "find low priority tickets"

---

### 4. Combined Text + Status

**User:** "search open tickets about billing"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "query": "billing",
  "status": "open"
}
```

**API Request:**
```json
{
  "search": "billing",
  "filters": {
    "status": "open"
  }
}
```

**Result:** Open tickets containing "billing"

---

### 5. Assignee Filtering

**User:** "search tickets assigned to john@example.com"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "assignee_email": "john@example.com"
}
```

**API Request:**
```json
{
  "search": "",
  "filters": {
    "assignee_user": {
      "email": "john@example.com"
    }
  }
}
```

**Result:** All tickets assigned to john@example.com

**Other variations:**
- "show me my tickets" (if OpenAI knows user's email)
- "what tickets is spencer working on"
- "list tickets assigned to support team"

---

### 6. Customer Email Filtering

**User:** "search tickets for customer@example.com"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "customer_email": "customer@example.com"
}
```

**API Request:**
```json
{
  "search": "",
  "filters": {
    "customer": {
      "email": "customer@example.com"
    }
  }
}
```

**Result:** All tickets from that customer

---

### 7. Tag Filtering

**User:** "search tickets tagged urgent"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "tags": "urgent"
}
```

**API Request:**
```json
{
  "search": "",
  "filters": {
    "tags": [
      { "name": "urgent" }
    ]
  }
}
```

**Result:** All tickets with "urgent" tag

---

### 8. Multiple Criteria Combined

**User:** "search urgent open tickets about billing assigned to spencer"

**OpenAI extracts:**
```json
{
  "action": "search_tickets",
  "query": "billing",
  "status": "open",
  "priority": "urgent",
  "assignee_email": "spencer@ironsidecomputers.com"
}
```

**API Request:**
```json
{
  "search": "billing",
  "filters": {
    "status": "open",
    "priority": "urgent",
    "assignee_user": {
      "email": "spencer@ironsidecomputers.com"
    }
  }
}
```

**Result:** Urgent open tickets about billing assigned to Spencer

---

## 📊 OpenAI Function Definition

To enable these searches, your `search_tickets` function in Build OpenAI Request should have:

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
          description: "Text to search for in ticket content, subject, or messages"
        },
        status: {
          type: "string",
          enum: ["open", "closed", "pending"],
          description: "Filter by ticket status"
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "Filter by ticket priority"
        },
        customer_email: {
          type: "string",
          description: "Filter by customer's email address"
        },
        assignee_email: {
          type: "string",
          description: "Filter by assignee's email address (who the ticket is assigned to)"
        },
        tags: {
          type: "string",
          description: "Filter by tag name"
        }
      }
    }
  }
}
```

---

## 🎓 Key Learnings

### 1. OpenAI is Already Extracting These Fields

Your input payload shows OpenAI is providing:
```json
{
  "status": "",
  "priority": "",
  "assignee_email": "",
  "customer_email": "",
  "tags": ""
}
```

**But we're not using them!** They're all empty strings currently.

### 2. Why OpenAI Doesn't Fill Them

If your `search_tickets` function definition in Build OpenAI Request **doesn't have these parameters**, OpenAI won't extract them.

**Check your Build OpenAI Request code:**
- Does `search_tickets` function have `status` parameter? ❓
- Does it have `priority` parameter? ❓
- Does it have `assignee_email` parameter? ❓

If not, that's why they're empty!

### 3. Two Parts Needed

For full search to work:

**Part 1: OpenAI Function Definition** (in Build OpenAI Request)
- Needs all parameters defined (query, status, priority, etc.)
- OpenAI extracts values from user's natural language

**Part 2: API Request Building** (in search node or Code node)
- Needs to USE those extracted values
- Build proper `filters` object for Gorgias API

---

## 🔧 Implementation Checklist

To enable full multi-criteria search:

- [ ] **Step 1:** Check Build OpenAI Request - does `search_tickets` function have all parameters?
- [ ] **Step 2:** Add "Build Search Request with Filters" Code node
- [ ] **Step 3:** Update search node body to `={{ $json }}`
- [ ] **Step 4:** Reconnect: Route by Action → Build Search Request with Filters → search
- [ ] **Step 5:** Test with: "search open urgent tickets about billing"
- [ ] **Step 6:** Verify OpenAI extracts: status="open", priority="urgent", query="billing"
- [ ] **Step 7:** Verify API request includes filters object

---

## 📋 Example Test Commands

Once enhanced, test these:

1. ✅ "search tickets about billing" (text only)
2. ✅ "search open tickets" (status only)
3. ✅ "search urgent tickets" (priority only)
4. ✅ "search open tickets about billing" (text + status)
5. ✅ "search urgent open tickets" (priority + status)
6. ✅ "search tickets assigned to spencer@ironsidecomputers.com"
7. ✅ "search urgent open tickets about billing assigned to spencer"
8. ✅ "search tickets tagged urgent"
9. ✅ "search closed tickets for customer@example.com"
10. ✅ "search high priority pending tickets"

---

## 🚨 Common Issues

### Issue 1: Filters Always Empty

**Symptom:** All searches return same results, ignoring status/priority

**Cause:** OpenAI function definition missing parameters

**Fix:** Update `search_tickets` function in Build OpenAI Request to include all parameters

### Issue 2: "filters is not a valid string"

**Symptom:** API error about filters type

**Cause:** Passing object when should be string (or vice versa)

**Fix:** Use Code node to conditionally set filters:
- If no filters: `filters: ""`
- If filters exist: `filters: { status: "open", ... }`

### Issue 3: No Results Returned

**Symptom:** Search returns empty array

**Cause:** Too many filters applied, no tickets match ALL criteria

**Fix:** Check API request - are filters correct? Try fewer filters.

---

## 🎯 Performance Notes

**Basic Text Search:**
- Fast (~200-500ms)
- Returns up to 50 results by default

**Multi-Criteria Filtered Search:**
- Slightly slower (~300-700ms)
- More accurate results
- Fewer results returned (only matching criteria)

**Best Practices:**
- Combine text search with 1-2 filters for best results
- Avoid too many filters (can return 0 results)
- Use status filter to narrow down searches quickly

---

**Last Updated:** November 5, 2025
