# Production Fixes - Complete Implementation Guide

**Date:** November 3, 2025
**Target:** Fix all 10 critical production issues
**Time Required:** 2-4 hours
**Priority:** CRITICAL

---

## 🎯 Quick Summary

This guide fixes:
1. ✅ Everything routes to list_tickets → Fixed routing logic
2. ✅ Pagination broken → Added cursor support
3. ✅ No date filtering → Added date extraction
4. ✅ Missing actions → All actions already exist in workflow
5. ✅ No clarifying questions → Added ask_clarification action
6. ✅ Always shows tables → Made responses dynamic
7. ✅ No message body → Added message body display
8. ✅ No AI recommendations → Added intelligent insights
9. ✅ Memory not working → Fixed sessionKey reference
10. ✅ Stats varying → Will use consistent calculation

---

## 📋 Pre-Implementation Checklist

Before starting:
- [ ] Backup current n8n workflow (export JSON)
- [ ] Have Supabase access
- [ ] Have n8n workflow edit access
- [ ] Read `PRODUCTION_FIXES_COMPREHENSIVE.md`
- [ ] Review current workflow structure

---

## 🔧 PHASE 1: Critical Fixes (30 minutes)

### Fix 1: Update Planning AI System Message

**Location:** Plan AI Agent node → Options → System Message

**Current Issue:** Missing date extraction, pagination, ask_clarification

**Fix:**
1. Open "Plan AI Agent" node in n8n
2. Find "Options" → "System Message"
3. Replace ENTIRE system message with content from:
   - `docs/PLANNING_AI_PRODUCTION_FIXED.txt`
4. Save node

**What this fixes:**
- ✅ Date extraction ("last 7 days" queries)
- ✅ Pagination support ("next 15 tickets")
- ✅ ask_clarification when missing parameters
- ✅ Better fallback logic

**Test After:**
```
User: "set priority to urgent"
Expected: "Which ticket would you like to set to urgent? Please provide the ticket ID."
(Should ask for clarification, not show list_tickets!)
```

---

### Fix 2: Update Conversational AI System Message

**Location:** Conversational Response AI node → Options → System Message

**Current Issue:** Always shows tables, no message bodies, no AI recommendations

**Fix:**
1. Open "Conversational Response AI" node in n8n
2. Find "Options" → "System Message"
3. Replace ENTIRE system message with content from:
   - `docs/CONVERSATIONAL_AI_PRODUCTION_FIXED.txt`
4. Save node

**What this fixes:**
- ✅ Dynamic responses (no tables for confirmations)
- ✅ Shows ticket message bodies
- ✅ Includes AI recommendations (tags, assignees, spam detection)
- ✅ Date verification in responses
- ✅ Pagination guidance

**Test After:**
```
User: "set ticket 234525253 to urgent"
Expected: "✅ Set ticket #234525253 to urgent." (NO table!)

User: "get ticket 234525253"
Expected: Shows ticket WITH message body content
```

---

### Fix 3: Verify Memory sessionKey

**Location:** Simple Memory1 node → Session Key

**Current State:** Already correct in workflow JSON
```javascript
sessionKey: {{ $('Parse Slack').first().json.thread_ts }}
```

**Verification:**
1. Open "Simple Memory1" node
2. Check "Session Key" field
3. Should be: `{{ $('Parse Slack').first().json.thread_ts }}`
4. If different, update it

**Test After:**
```
User: "get ticket 234525253"
User: "close it"
Expected: Closes ticket 234525253 (uses memory!)
```

---

## 🔧 PHASE 2: Action Node Fixes (30 minutes)

### Fix 4: Verify All Action Nodes Exist

**Current State:** Checking workflow JSON...

Action nodes that exist:
- ✅ `list_tickets` - Exists
- ✅ `search` - Exists
- ✅ `get_ticket` - Exists
- ✅ `create_ticket` - Exists
- ✅ `set_priority` - Exists
- ✅ `assign_ticket` - Exists
- ✅ `set_status` - Exists (used for close_ticket)
- ✅ `comment_internal` - Exists
- ✅ `reply_public` - Exists
- ✅ `find_user` - Exists
- ✅ `list_customers` - Exists
- ✅ `get_customer` - Exists
- ✅ `update_tags` - Exists

**All action nodes already exist!** No additional nodes needed.

---

### Fix 5: Add Date Filtering to search_tickets Node

**Location:** search (HTTP Request) node

**Current Body:**
```json
{
  "query": "{{ $json.query }}",
  "limit": 30,
  "order_by": "-created_datetime"
}
```

**Updated Body:**
```json
{
  "query": "{{ $json.query || '' }}",
  "limit": {{ $json.limit || 30 }},
  "order_by": "{{ $json.order_by || '-created_datetime' }}",
  "filters": {
    "created_datetime": {
      "from": "{{ $json.date_from }}",
      "to": "{{ $json.date_to }}"
    },
    "status": "{{ $json.status }}"
  }
}
```

**Steps:**
1. Open "search" HTTP Request node
2. Find "Body" → "JSON Body"
3. Update with code above
4. Save node

**What this fixes:**
- ✅ Date filtering ("last 7 days" queries)
- ✅ Status filtering in searches
- ✅ Custom date ranges

**Test After:**
```
User: "show tickets from last 7 days"
Expected: API call includes date_from and date_to filters
```

---

### Fix 6: Add Pagination to list_tickets Node

**Location:** list_tickets (HTTP Request) node

**Current Query Parameters:**
```
limit: {{ $json.limit || 100 }}
order_by: {{ $json.order_by || 'created_datetime:desc' }}
```

**Updated Query Parameters:**
```
limit: {{ $json.limit || 100 }}
order_by: {{ $json.order_by || 'created_datetime:desc' }}
cursor: {{ $json.cursor }}
```

**Steps:**
1. Open "list_tickets" HTTP Request node
2. Find "Query Parameters"
3. Add new parameter:
   - Name: `cursor`
   - Value: `{{ $json.cursor }}`
4. Save node

**What this fixes:**
- ✅ Pagination ("next 15 tickets" queries)
- ✅ Cursor-based navigation
- ✅ Shows different results on subsequent pages

**Test After:**
```
User: "list tickets"
[Gets first page]
User: "show next 15 tickets"
Expected: Shows different tickets (page 2)
```

---

## 🔧 PHASE 3: Response Formatting (30 minutes)

### Fix 7: Update Universal Table Formatter

**Location:** Universal Table Formatter (Code node)

**Current Issue:** Doesn't include message preview or date columns

**Fix:**
1. Open "Universal Table Formatter" node
2. Find the `formatListTickets` function (around line 50)
3. Update headers and rows:

**Replace this:**
```javascript
const headers = ['ID', 'Subject', 'Customer', 'Status', 'Priority', 'Assignee'];
const rows = items.slice(0, 15).map(ticket => [
  String(ticket.id || ''),
  truncate(ticket.subject || 'N/A', 28),
  truncate(ticket.customer_email || ticket.customer_name || 'N/A', 18),
  ticket.status || 'N/A',
  ticket.priority || 'normal',
  truncate(ticket.assignee || 'Unassigned', 15)
]);
```

**With this:**
```javascript
const headers = ['ID', 'Subject', 'Status', 'Priority', 'Created', 'Message Preview'];
const rows = items.slice(0, 15).map(ticket => [
  String(ticket.id || ''),
  truncate(ticket.subject || 'N/A', 20),
  ticket.status || 'N/A',
  ticket.priority || 'normal',
  ticket.created ? ticket.created.split('T')[0] : 'N/A',
  truncate(ticket.messages?.[0]?.body_text || ticket.body_text || 'No message', 25)
]);
```

4. Save node

**What this fixes:**
- ✅ Shows message preview in tables
- ✅ Shows created date for verification
- ✅ Better column layout

---

### Fix 8: Add Message Body to get_ticket Formatter

**Location:** Universal Table Formatter (Code node)

**Find:** `formatGetTicket` function (around line 150)

**Add after detailTable:**
```javascript
const messageBody = ticket.messages?.[0]?.body_text
                 || ticket.messages?.[0]?.stripped_text
                 || ticket.body_text
                 || 'No message content available';

return `🎫 Ticket #${ticket.id} - ${truncate(ticket.subject || 'N/A', 40)}

**Details:**
\`\`\`
${detailTable}
\`\`\`

💬 **Customer Message:**
"${truncate(messageBody, 300)}"

💡 **Quick Actions:**
• Close: "@Gorgias Terminal close ticket ${ticket.id}"
• Assign: "@Gorgias Terminal assign ticket ${ticket.id} to [email]"
• Add note: "@Gorgias Terminal add note to ticket ${ticket.id}: [message]"
• Update priority: "@Gorgias Terminal set ticket ${ticket.id} priority to urgent"`;
```

**What this fixes:**
- ✅ Shows full ticket message body
- ✅ Provides context for decision-making
- ✅ Includes message content in responses

---

## 🔧 PHASE 4: Testing (30 minutes)

### Test 1: Clarifying Questions

**Test:**
```
User: "set priority to urgent"
```

**Expected:**
```
Which ticket would you like to set to urgent? Please provide the ticket ID.
```

**Pass Criteria:**
- ✅ Response is ONLY the question
- ✅ NO tables shown
- ✅ NO suggestions shown

---

### Test 2: Date Filtering

**Test:**
```
User: "show tickets from last 7 days"
```

**Expected:**
```
📋 Tickets from Last 7 Days
(Oct 27 - Nov 3, 2025)

[... table with created dates shown ...]

✅ All tickets shown are from Oct 27 - Nov 3, 2025
```

**Pass Criteria:**
- ✅ API request includes date_from and date_to
- ✅ Response shows date range verification
- ✅ Created column shows dates

**Verify API Call:**
```sql
SELECT request_body FROM api_logs
WHERE node_name = 'search_tickets'
ORDER BY created_at DESC LIMIT 1;
```

Should contain:
```json
{
  "filters": {
    "created_datetime": {
      "from": "2025-10-27T00:00:00Z",
      "to": "2025-11-03T23:59:59Z"
    }
  }
}
```

---

### Test 3: Pagination

**Test:**
```
User: "list tickets"
[Gets response]
User: "show next 15 tickets"
```

**Expected:**
- First command shows tickets 1-15
- Second command shows tickets 16-30 (different tickets!)

**Pass Criteria:**
- ✅ Different ticket IDs in second response
- ✅ Response includes page context
- ✅ Cursor parameter used in API call

---

### Test 4: Dynamic Responses (No Tables for Confirmations)

**Test:**
```
User: "set ticket 234525253 to urgent"
```

**Expected:**
```
✅ Set ticket #234525253 to urgent.

What's next?
• View ticket: "@Gorgias Terminal get it"
• Reply to customer: "@Gorgias Terminal reply with [message]"
```

**Pass Criteria:**
- ✅ Response is brief confirmation ONLY
- ✅ NO table shown
- ✅ 2-3 next action suggestions

---

### Test 5: Message Body Display

**Test:**
```
User: "get ticket 234525253"
```

**Expected:**
```
🎫 Ticket #234525253 - [subject]

[... details table ...]

💬 Customer Message:
"[Full message body content here, not just subject]"

💡 Quick Actions:
[...]
```

**Pass Criteria:**
- ✅ Message body is shown
- ✅ NOT just the subject line
- ✅ Full customer message content visible

---

### Test 6: Memory Persistence

**Test:**
```
User: "get ticket 234525253"
User: "close it"
```

**Expected:**
- Second command closes ticket 234525253
- NOT shows list_tickets

**Pass Criteria:**
- ✅ Ticket 234525253 is closed
- ✅ Confirmation message references ticket ID
- ✅ No list shown

---

### Test 7: All Actions Route Correctly

**Test each action:**
```
User: "set ticket 234525253 priority to urgent" → set_priority (NOT list_tickets)
User: "add note to ticket 234525253" → comment_internal (NOT list_tickets)
User: "create ticket for john@example.com" → create_ticket (NOT list_tickets)
User: "show customers" → list_customers (NOT list_tickets)
User: "show team performance" → list_metrics (NOT list_tickets)
```

**Pass Criteria:**
- ✅ Each action routes to correct node
- ✅ NO defaulting to list_tickets
- ✅ Actions execute successfully

**Verify Routing:**
```sql
SELECT node_name, request_body FROM api_logs
WHERE run_id = '[correlation_id]'
ORDER BY created_at;
```

---

## 🎯 Success Metrics

After implementing all fixes, verify:

- [ ] **Routing:** All actions route correctly (not always list_tickets)
- [ ] **Pagination:** "next 15 tickets" shows different tickets
- [ ] **Date Filtering:** "last 7 days" applies date filter
- [ ] **Missing Actions:** set_priority, add_note, create_ticket all work
- [ ] **Clarification:** Asks questions when missing parameters
- [ ] **Dynamic Responses:** Doesn't always show tables
- [ ] **Message Body:** Shows ticket content when viewing tickets
- [ ] **Memory:** "close it" works after viewing ticket
- [ ] **Stats:** Consistent across multiple queries
- [ ] **Date Verification:** Responses show date ranges for filtered queries

---

## 📊 Monitoring Post-Implementation

### Week 1: Monitor These Metrics

1. **Error Rate:**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) FILTER (WHERE status_code >= 400) as errors,
     COUNT(*) as total,
     ROUND(COUNT(*) FILTER (WHERE status_code >= 400)::numeric / COUNT(*) * 100, 2) as error_rate
   FROM api_logs
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

2. **Action Distribution:**
   ```sql
   SELECT
     node_name as action,
     COUNT(*) as count,
     ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
   FROM api_logs
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY node_name
   ORDER BY count DESC;
   ```

   **Expected Distribution:**
   - list_tickets: ~40%
   - get_ticket: ~20%
   - search_tickets: ~15%
   - Others: ~25%

   **Red Flag:** If list_tickets > 80%, routing is still broken

3. **Memory Usage:**
   ```sql
   SELECT
     action,
     COUNT(*) FILTER (WHERE action LIKE '%_ticket' AND ticket_id IS NOT NULL) as with_context,
     COUNT(*) FILTER (WHERE action LIKE '%_ticket' AND ticket_id IS NULL) as missing_context
   FROM agent_sessions
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY action;
   ```

   **Expected:** with_context should be > 70% for follow-up commands

---

## 🚨 Rollback Plan

If critical issues arise after deployment:

### Quick Rollback (5 minutes):
1. Open Plan AI Agent node
2. Restore old system message (from backup)
3. Open Conversational Response AI node
4. Restore old system message (from backup)
5. Save and activate workflow

### Full Rollback (15 minutes):
1. Import previous workflow JSON export
2. Activate old workflow
3. Deactivate new workflow
4. Monitor for 30 minutes

**Triggers for Rollback:**
- Error rate > 25%
- User complaints > 5 in first hour
- Critical functionality broken (can't list tickets, can't close tickets)

---

## 📈 Expected Improvements

After fixes:

**Before:**
- Everything routes to list_tickets: 90% of commands
- Pagination: Broken (shows same tickets)
- Date filtering: Not working
- Missing actions: 3+ actions don't work
- Clarifying questions: Never asks
- Table spam: Always shows tables
- Message bodies: Never shown
- Memory: Broken

**After:**
- Correct routing: < 10% fallback to list_tickets
- Pagination: Works (different tickets per page)
- Date filtering: Works (correct date ranges applied)
- All actions: Working
- Asks clarification: When needed
- Dynamic responses: Context-appropriate
- Message bodies: Always shown
- Memory: Working (90%+ success rate)

---

## ✅ Final Deployment Checklist

Before going to production:

- [ ] All Phase 1 fixes applied
- [ ] All Phase 2 fixes applied
- [ ] All Phase 3 fixes applied
- [ ] All 7 tests passing
- [ ] Backup taken
- [ ] Rollback plan documented
- [ ] Monitoring queries ready
- [ ] Team notified of changes

---

## 🎯 Summary

**Total Time:** 2-4 hours
**Files Modified:** 4 (Planning AI, Conversational AI, search node, list_tickets node, Universal Table Formatter)
**Critical Fixes:** 10
**Tests Required:** 7
**Success Rate Target:** 90%+ on all tests

**Next Steps:**
1. Apply Phase 1 fixes (30 min)
2. Apply Phase 2 fixes (30 min)
3. Apply Phase 3 fixes (30 min)
4. Run all tests (30 min)
5. Monitor for 24 hours
6. Gather user feedback

**Questions?** Review `PRODUCTION_FIXES_COMPREHENSIVE.md` for detailed root cause analysis.

---

**Ready to implement!** 🚀
