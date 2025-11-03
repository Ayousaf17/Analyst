# CRITICAL FIX: Structured Output Parser Schema Update

**Date:** November 3, 2025
**Priority:** 🔴 **CRITICAL - BLOCKING ALL OTHER FIXES**
**Time Required:** 5 minutes
**Impact:** Fixes all routing issues immediately

---

## 🚨 The Problem

**Current State:** Your Slack commands are routing incorrectly despite updating the Planning AI and Conversational AI system messages.

**Root Cause:** The Structured Output Parser (SOP) schema is **missing the new actions** (`ask_clarification` and `analyze_insights`).

### How The Failure Happens:

```
User: "set priority to urgent"
  ↓
Planning AI (correctly) generates:
  {"plan": [{"step": 1, "action": "ask_clarification", "question": "Which ticket?"}]}
  ↓
Structured Output Parser validates against schema
  ❌ "ask_clarification" NOT in enum → VALIDATION FAILS
  ↓
SOP returns empty: {"output": {}}
  ↓
Handle Plan Response detects empty plan → Triggers fallback
  ↓
Fallback defaults to: list_tickets
  ↓
Result: Shows ticket table instead of asking clarification (WRONG!)
```

### Evidence From Your Slack Logs:

```
✅ WORKS: "make it priority urgent" (routes to set_priority)
❌ FAILS: "set priority to urgent" (should ask clarification, shows list_tickets instead)

✅ WORKS: Commands with all required parameters
❌ FAILS: Commands that need clarification (triggers ask_clarification → SOP rejects → fallback)
```

**The Pattern:** When Planning AI tries to use `ask_clarification`, SOP rejects it → everything breaks.

---

## ✅ The Solution

Update the SOP schema to include **ALL actions**, including the two new ones:
- `ask_clarification` - For asking clarifying questions
- `analyze_insights` - For analytics intelligence (client's favorite feature)

---

## 🔧 Implementation Steps (5 minutes)

### Step 1: Open Your n8n Workflow

1. Go to your n8n instance
2. Open the Gorgias AI workflow
3. Find the **"Structured Output Parser"** node
   - It's after the "Plan AI Agent" node
   - It's before the "Handle Plan Response" node

### Step 2: Update the Schema

1. Click on the **"Structured Output Parser"** node
2. Find the **"JSON Schema"** field (or "Schema" field)
3. You'll see the current schema with this action enum:

**CURRENT SCHEMA (BROKEN):**
```json
{
  "type": "object",
  "properties": {
    "output": {
      "type": "object",
      "properties": {
        "plan": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "action": {
                "type": "string",
                "description": "Action to perform",
                "enum": [
                  "list_metrics",
                  "get_customer",
                  "find_user",
                  "list_customers",
                  "get_ticket",
                  "list_tickets",
                  "search_tickets",
                  "create_ticket",
                  "close_ticket",
                  "set_status",
                  "assign_ticket",
                  "set_priority",
                  "add_tags",
                  "remove_tags",
                  "reply_public",
                  "comment_internal"
                  // ❌ MISSING: "ask_clarification"
                  // ❌ MISSING: "analyze_insights"
                ]
              }
              // ... other fields
            }
          }
        }
      }
    }
  }
}
```

4. **Replace the ENTIRE schema** with the content from:
   - `docs/FIXED_SOP_SCHEMA_V2.json`

**NEW SCHEMA (FIXED):**
```json
{
  "type": "object",
  "properties": {
    "output": {
      "type": "object",
      "properties": {
        "plan": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "step": {
                "type": "number",
                "description": "Step number in the plan"
              },
              "action": {
                "type": "string",
                "description": "Action to perform",
                "enum": [
                  "ask_clarification",    // ✅ ADDED
                  "analyze_insights",     // ✅ ADDED
                  "list_metrics",
                  "get_customer",
                  "find_user",
                  "list_customers",
                  "get_ticket",
                  "list_tickets",
                  "search_tickets",
                  "create_ticket",
                  "close_ticket",
                  "set_status",
                  "assign_ticket",
                  "set_priority",
                  "add_tags",
                  "remove_tags",
                  "reply_public",
                  "comment_internal"
                ]
              },
              "question": {
                "type": "string",
                "description": "Clarification question (for ask_clarification action)"
              },
              "period": {
                "type": "string",
                "description": "Time period for analytics (for analyze_insights action)",
                "enum": ["7d", "30d", "90d"]
              },
              "focus": {
                "type": "string",
                "description": "Focus area for analytics (for analyze_insights action)",
                "enum": ["questions", "performance", "tags", "all"]
              },
              "ticket_id": {
                "type": "string",
                "description": "Ticket ID (if applicable)"
              },
              "customer_id": {
                "type": "string",
                "description": "Customer ID (if applicable)"
              },
              "customer_email": {
                "type": "string",
                "description": "Customer email address (if applicable)"
              },
              "name": {
                "type": "string",
                "description": "Person name for search (if applicable)"
              },
              "query": {
                "type": "string",
                "description": "Search query (if applicable)"
              },
              "date_from": {
                "type": "string",
                "description": "Start date for filtering (ISO 8601 format)"
              },
              "date_to": {
                "type": "string",
                "description": "End date for filtering (ISO 8601 format)"
              },
              "status": {
                "type": "string",
                "description": "Ticket status filter",
                "enum": ["open", "closed", "pending", "all"]
              },
              "priority": {
                "type": "string",
                "description": "Ticket priority",
                "enum": ["low", "normal", "high", "urgent"]
              },
              "limit": {
                "type": "number",
                "description": "Number of results to return"
              },
              "cursor": {
                "type": "string",
                "description": "Pagination cursor"
              },
              "page": {
                "type": "number",
                "description": "Page number for pagination"
              },
              "assignee_email": {
                "type": "string",
                "description": "Assignee email address (if applicable)"
              },
              "tags": {
                "type": "string",
                "description": "Comma-separated tags (if applicable)"
              },
              "message": {
                "type": "string",
                "description": "Message text (if applicable)"
              },
              "subject": {
                "type": "string",
                "description": "Ticket subject (if applicable)"
              }
            },
            "required": ["step", "action"]
          }
        }
      },
      "required": ["plan"]
    }
  },
  "required": ["output"]
}
```

5. Click **Save**
6. Click **Execute Workflow** or activate the workflow

---

## 🧪 Test Immediately (5 minutes)

Run these commands in Slack to verify the fix:

### Test 1: Clarifying Questions (MOST IMPORTANT)
```
@Gorgias Terminal set priority to urgent
```

**Before Fix:**
```
📋 Tickets (15 results)
[... shows table ...]
(WRONG - should ask which ticket!)
```

**After Fix:**
```
Which ticket would you like to set to urgent? Please provide the ticket ID.
(CORRECT - asks clarification!)
```

**Pass Criteria:**
- ✅ Response is ONLY the question
- ✅ NO table shown
- ✅ NO suggestions

---

### Test 2: Memory with Pronouns
```
@Gorgias Terminal get ticket 226392965
@Gorgias Terminal make it priority urgent
```

**Before Fix:**
```
Second command shows list_tickets table (WRONG!)
```

**After Fix:**
```
✅ Set ticket #226392965 to urgent.
(CORRECT - uses ticket ID from memory!)
```

**Pass Criteria:**
- ✅ Second command acts on ticket 226392965
- ✅ No table shown
- ✅ Brief confirmation only

---

### Test 3: All Actions Route Correctly
```
@Gorgias Terminal set ticket 226392965 priority to urgent
@Gorgias Terminal add note to ticket 226392965: test note
@Gorgias Terminal assign ticket 226392965 to alex@example.com
```

**Expected:**
- All commands execute successfully
- NO list_tickets tables shown
- Brief confirmations only

**Pass Criteria:**
- ✅ Each action routes to correct node (not list_tickets)
- ✅ No table spam
- ✅ Actions execute successfully

---

### Test 4: Analytics Insights (When Implemented)
```
@Gorgias Terminal show me insights
```

**Expected:**
```
📊 Closed Ticket Insights (last 30 days)
• Analyzed: 1,284 tickets
• Avg resolution: 410 min

🔁 Top Recurring Questions:
1️⃣ "When will my PC ship?" — 142 tickets (11.1%)
[... full analytics response ...]
```

**Note:** This requires implementing the Ticket Analytics Agent node (see TICKET_ANALYTICS_INTELLIGENCE.md). But the routing will work correctly now.

---

## 🔍 How To Verify The Fix Is Applied

### Check 1: Examine n8n Execution Logs

1. Run: `@Gorgias Terminal set priority to urgent`
2. Open n8n execution
3. Look at **Plan AI Agent** output:
   ```json
   {
     "plan": [
       {
         "step": 1,
         "action": "ask_clarification",
         "question": "Which ticket would you like to set to urgent?"
       }
     ]
   }
   ```

4. Look at **Structured Output Parser** output:
   - **Before Fix:** `{"output": {}}` (empty - validation failed)
   - **After Fix:** Same as Plan AI Agent output (validation passed!)

5. Look at **Handle Plan Response** routing:
   - **Before Fix:** Routes to fallback → list_tickets
   - **After Fix:** Routes to ask_clarification handler → returns question

---

## 📊 Expected Results After Fix

### Routing Distribution (Check After 24 Hours)

Run this query in your Supabase/database:
```sql
SELECT
  node_name as action,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
FROM api_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY node_name
ORDER BY count DESC;
```

**Before Fix:**
```
Action             Count    Percent
─────────────────────────────────
list_tickets       450      90.0%   ← Everything routing here!
get_ticket         30       6.0%
set_priority       10       2.0%
Other actions      10       2.0%
```

**After Fix:**
```
Action               Count    Percent
───────────────────────────────────
list_tickets         200      40.0%   ← Normal usage
get_ticket           100      20.0%
search_tickets       80       16.0%
set_priority         50       10.0%
ask_clarification    30       6.0%    ← NEW - Working!
assign_ticket        20       4.0%
Other actions        20       4.0%
```

**Key Indicator:** If `list_tickets` drops from 90% to ~40%, the fix is working!

---

## 🚨 Troubleshooting

### Issue 1: Still Routing to list_tickets After Fix

**Check:**
1. Did you save the SOP node after updating schema?
2. Did you activate/re-execute the workflow?
3. Is the schema in the correct format (valid JSON)?

**Verify Schema Is Applied:**
1. Open SOP node
2. Check that `"ask_clarification"` appears in the action enum
3. Check that `"analyze_insights"` appears in the action enum

**Test The Schema:**
```json
// This should PASS validation now:
{
  "output": {
    "plan": [
      {
        "step": 1,
        "action": "ask_clarification",
        "question": "Which ticket?"
      }
    ]
  }
}
```

### Issue 2: "Invalid Schema" Error in n8n

**Possible Causes:**
- JSON syntax error (missing comma, bracket)
- Copy-paste formatting issue

**Fix:**
1. Copy schema from `docs/FIXED_SOP_SCHEMA_V2.json` exactly
2. Validate JSON at https://jsonlint.com/
3. Ensure no extra characters or line breaks

### Issue 3: Some Actions Still Not Working

**If date filtering still broken:**
- Update search_tickets node body (see PRODUCTION_FIXES_IMPLEMENTATION_GUIDE.md)

**If pagination still broken:**
- Add cursor parameter to list_tickets node (see PRODUCTION_FIXES_IMPLEMENTATION_GUIDE.md)

**If message bodies not showing:**
- Update Universal Table Formatter code (see PRODUCTION_FIXES_IMPLEMENTATION_GUIDE.md)

**BUT:** The SOP schema fix must be applied FIRST. Without it, nothing else will work.

---

## 🎯 Why This Fix Is Critical

### The Cascading Failure:

```
SOP Schema Missing Actions
  ↓
Planning AI generates ask_clarification
  ↓
SOP rejects it (not in enum)
  ↓
Returns empty plan
  ↓
Fallback triggers
  ↓
Defaults to list_tickets
  ↓
❌ Everything breaks
```

### After The Fix:

```
SOP Schema Has All Actions
  ↓
Planning AI generates ask_clarification
  ↓
SOP accepts it (in enum)
  ↓
Returns valid plan
  ↓
Router sends to correct action
  ↓
✅ Everything works
```

---

## 📋 Checklist

Before moving on to other fixes:

- [ ] Opened Structured Output Parser node in n8n
- [ ] Replaced schema with FIXED_SOP_SCHEMA_V2.json
- [ ] Verified `ask_clarification` is in the enum
- [ ] Verified `analyze_insights` is in the enum
- [ ] Saved the node
- [ ] Activated/executed the workflow
- [ ] Tested: "set priority to urgent" → asks clarification ✅
- [ ] Tested: "get ticket X" → "make it urgent" → uses memory ✅
- [ ] Checked n8n logs → SOP no longer returns empty ✅

---

## 🚀 Next Steps After This Fix

Once the SOP schema is updated and verified working:

1. **Phase 1:** Update Planning AI system message
   - File: `docs/PLANNING_AI_PRODUCTION_FIXED.txt`
   - Node: Plan AI Agent → Options → System Message
   - Time: 5 minutes

2. **Phase 2:** Update Conversational AI system message
   - File: `docs/CONVERSATIONAL_AI_PRODUCTION_FIXED.txt`
   - Node: Conversational Response AI → Options → System Message
   - Time: 5 minutes

3. **Phase 3:** Add date filtering to search_tickets
   - Node: search (HTTP Request)
   - Update body to include date filters
   - Time: 5 minutes

4. **Phase 4:** Add pagination to list_tickets
   - Node: list_tickets (HTTP Request)
   - Add cursor query parameter
   - Time: 5 minutes

5. **Phase 5:** (Optional) Implement Analytics Intelligence
   - See: `TICKET_ANALYTICS_INTELLIGENCE.md`
   - Time: 1 hour

---

## 📖 Related Documentation

- **Root Cause Analysis:** `PRODUCTION_FIXES_COMPREHENSIVE.md`
- **Full Implementation Guide:** `PRODUCTION_FIXES_IMPLEMENTATION_GUIDE.md`
- **Quick Start:** `QUICK_START_GUIDE.md`
- **Analytics Feature:** `TICKET_ANALYTICS_INTELLIGENCE.md`
- **Updated Planning AI:** `PLANNING_AI_PRODUCTION_FIXED.txt`
- **Updated Conversational AI:** `CONVERSATIONAL_AI_PRODUCTION_FIXED.txt`

---

## ✅ Summary

**What This Fixes:**
- ✅ Commands no longer default to list_tickets
- ✅ Clarifying questions work correctly
- ✅ Memory works with pronouns ("make it urgent")
- ✅ All actions route correctly
- ✅ Enables analytics insights feature

**Time Required:** 5 minutes

**Impact:** Unblocks ALL other production fixes

**Critical Success Factor:** This MUST be applied before any other fixes will work.

---

**Ready to apply!** 🚀

Once you update the SOP schema and verify the tests pass, all other fixes will start working immediately.
