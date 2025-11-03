# Master Implementation Checklist - Production Fixes

**Date:** November 3, 2025
**Status:** Ready to implement
**Total Time:** 1-2 hours
**Priority:** Fix routing issues first, then enhancements

---

## 🚨 CRITICAL: Start Here

**Before implementing ANY other fixes, you MUST fix the SOP schema first.**

Without this fix, nothing else will work because all actions will fail validation and fall back to list_tickets.

---

## ✅ Implementation Order

### 🔴 PHASE 0: CRITICAL BLOCKER (5 minutes) - DO THIS FIRST!

- [ ] **Fix Structured Output Parser Schema**
  - **Why First:** Blocks all other fixes from working
  - **File:** `docs/FIXED_SOP_SCHEMA_V2.json`
  - **Location:** n8n → Structured Output Parser node → JSON Schema field
  - **Action:** Replace entire schema with FIXED_SOP_SCHEMA_V2.json content
  - **Test:** `"set priority to urgent"` → should ask clarification (not show table)
  - **Guide:** `docs/CRITICAL_FIX_SOP_SCHEMA.md`

**⚠️ STOP: Test the SOP schema fix before continuing. If this doesn't work, nothing else will.**

Test Commands:
```
✅ "set priority to urgent" → asks "Which ticket?"
✅ "get ticket 226392965" → "make it urgent" → uses memory
✅ All commands stop defaulting to list_tickets
```

---

### 🟡 PHASE 1: Core Fixes (30 minutes)

#### Fix 1.1: Update Planning AI System Message (5 min)
- [ ] Open n8n workflow
- [ ] Find "Plan AI Agent" node
- [ ] Options → System Message
- [ ] Replace with: `docs/PLANNING_AI_PRODUCTION_FIXED.txt`
- [ ] Save node

**What this fixes:**
- ✅ Better routing logic (12-step priority detection)
- ✅ Date extraction ("last 7 days" → ISO dates)
- ✅ Pagination cursor extraction ("next 15 tickets")
- ✅ Analytics insights detection ("show me insights")
- ✅ Memory reference extraction ("make it urgent")

**Test After:**
```
"show tickets from last 7 days" → should extract date_from and date_to
"show next 15 tickets" → should extract cursor from previous response
```

---

#### Fix 1.2: Update Conversational AI System Message (5 min)
- [ ] Find "Conversational Response AI" node
- [ ] Options → System Message
- [ ] Replace with: `docs/CONVERSATIONAL_AI_PRODUCTION_FIXED.txt`
- [ ] Save node

**What this fixes:**
- ✅ Dynamic responses (no table spam for confirmations)
- ✅ Shows ticket message bodies (not just subjects)
- ✅ Date verification in responses ("✅ All tickets from Oct 27 - Nov 3")
- ✅ Pagination guidance ("Showing page 2 of results")
- ✅ Analytics insights formatting

**Test After:**
```
"set ticket 226392965 to urgent" → brief confirmation, NO table
"get ticket 226392965" → shows customer message body
```

---

#### Fix 1.3: Add Date Filtering to search_tickets (5 min)
- [ ] Open "search" HTTP Request node
- [ ] Find Body → JSON Body
- [ ] Update to include filters
- [ ] Save node

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

**Test After:**
```
"show tickets from last 7 days" → API call includes date filters
Response shows correct date range
```

**Verify API Call:**
Check n8n execution logs → search node → see `date_from` and `date_to` in request body

---

#### Fix 1.4: Add Pagination to list_tickets (5 min)
- [ ] Open "list_tickets" HTTP Request node
- [ ] Find Query Parameters section
- [ ] Add new parameter
- [ ] Save node

**Add Parameter:**
- Name: `cursor`
- Value: `{{ $json.cursor }}`

**Test After:**
```
"list tickets" → [Shows first 15]
"show next 15 tickets" → [Shows different 15]
```

**Verify:**
Check that second command shows different ticket IDs than first command

---

#### Fix 1.5: Verify Memory sessionKey (2 min)
- [ ] Open "Simple Memory1" node
- [ ] Check "Session Key" field
- [ ] Should be: `{{ $('Parse Slack').first().json.thread_ts }}`
- [ ] If different, update it
- [ ] Save node

**Test After:**
```
"get ticket 226392965"
"close it" → should close 226392965 (uses memory)
```

---

### 🟢 PHASE 2: Response Formatting (30 minutes) - OPTIONAL

#### Fix 2.1: Update Universal Table Formatter - List Tickets (10 min)
- [ ] Open "Universal Table Formatter" Code node
- [ ] Find `formatListTickets` function (around line 50)
- [ ] Update headers and rows

**Replace:**
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

**With:**
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

**What this fixes:**
- Shows created date (for date verification)
- Shows message preview (provides context)
- Removes customer and assignee columns (saves space)

---

#### Fix 2.2: Update Universal Table Formatter - Get Ticket (10 min)
- [ ] Find `formatGetTicket` function (around line 150)
- [ ] Add message body section

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
- Shows full customer message (not just subject)
- Provides quick action templates
- Improves context for decision-making

---

### 🔵 PHASE 3: Analytics Intelligence (1 hour) - OPTIONAL

This is the feature that "sold" the client. But the routing is already fixed by Phase 0, so you can implement this later.

#### Step 3.1: Create Ticket Analytics Agent Node (15 min)
- [ ] Add new "AI Agent" node
- [ ] Name: "Ticket Analytics Agent"
- [ ] Model: GPT-4 or Claude
- [ ] System message: Use template from `TICKET_ANALYTICS_INTELLIGENCE.md`
- [ ] Wire after "Fetch Tickets for Analytics" node

#### Step 3.2: Create Fetch Tickets for Analytics Node (10 min)
- [ ] Add new "HTTP Request" node
- [ ] Name: "Fetch Tickets for Analytics"
- [ ] Method: GET
- [ ] URL: `{{ $env.GORGIAS_API_URL }}/tickets`
- [ ] Query Parameters:
  - `status`: `closed`
  - `limit`: `1000`
  - `created_datetime[from]`: Calculate based on `period` parameter
- [ ] Wire from Switch node's `analyze_insights` output

#### Step 3.3: Wire Analytics Nodes (10 min)
- [ ] Update Switch node to include `analyze_insights` route
- [ ] Connect: Switch → Fetch Tickets for Analytics → Ticket Analytics Agent → Universal Table Formatter → Conversational AI

#### Step 3.4: Test Analytics (15 min)
```
"show me insights"
Expected: Full analytics report with recurring questions
```

**Detailed Guide:** `docs/TICKET_ANALYTICS_INTELLIGENCE.md`

---

## 🧪 Complete Test Suite

### Critical Tests (Must Pass)

#### Test 1: Clarifying Questions ✅
```
Command: "set priority to urgent"
Expected: "Which ticket would you like to set to urgent? Please provide the ticket ID."
Pass Criteria:
  ✅ Response is ONLY the question
  ✅ NO table shown
  ✅ NO suggestions
```

#### Test 2: Memory with Pronouns ✅
```
Command: "get ticket 226392965"
Command: "make it priority urgent"
Expected: "✅ Set ticket #226392965 to urgent."
Pass Criteria:
  ✅ Uses ticket ID 226392965 from memory
  ✅ No table shown
  ✅ Brief confirmation only
```

#### Test 3: Date Filtering ✅
```
Command: "show tickets from last 7 days"
Expected: Tickets filtered by date with verification message
Pass Criteria:
  ✅ API request includes date_from and date_to
  ✅ Response shows date range
  ✅ Created column shows dates
```

#### Test 4: Pagination ✅
```
Command: "list tickets"
Command: "show next 15 tickets"
Expected: Second command shows different tickets
Pass Criteria:
  ✅ Different ticket IDs in second response
  ✅ Cursor parameter in API call
  ✅ Page context in response
```

#### Test 5: Dynamic Responses ✅
```
Command: "set ticket 226392965 to urgent"
Expected: "✅ Set ticket #226392965 to urgent."
Pass Criteria:
  ✅ Brief confirmation only
  ✅ NO table shown
  ✅ 2-3 next action suggestions
```

#### Test 6: Message Body Display ✅
```
Command: "get ticket 226392965"
Expected: Shows customer message body
Pass Criteria:
  ✅ Full message content shown
  ✅ Not just subject line
  ✅ Quick actions included
```

#### Test 7: All Actions Route Correctly ✅
```
Command: "set ticket 226392965 priority to urgent"
Expected: Routes to set_priority (NOT list_tickets)

Command: "add note to ticket 226392965: test"
Expected: Routes to comment_internal (NOT list_tickets)

Command: "create ticket for john@example.com"
Expected: Routes to create_ticket (NOT list_tickets)
```

### Optional Tests (If Implemented)

#### Test 8: Analytics Insights ✅
```
Command: "show me insights"
Expected: Full analytics report with recurring questions and recommendations
```

---

## 📊 Success Metrics

### Check After 24 Hours

**Routing Distribution:**
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

**Target Distribution:**
- list_tickets: 30-40% (down from 90%)
- get_ticket: 15-20%
- search_tickets: 10-15%
- set_priority: 5-10%
- ask_clarification: 5-10%
- Others: 20-25%

**Red Flag:** If list_tickets > 80%, SOP schema fix didn't work

---

## 🚨 Troubleshooting

### Issue: Commands Still Route to list_tickets After SOP Fix

**Check:**
1. Did you save the SOP node after updating?
2. Did you activate/re-execute the workflow?
3. Is the schema valid JSON?
4. Does `"ask_clarification"` appear in the action enum?

**Test SOP Directly:**
1. Open n8n execution
2. Look at Plan AI Agent output
3. Look at Structured Output Parser output
4. Should be the same (if different, SOP is rejecting)

---

### Issue: Date Filtering Not Working

**Check:**
1. Did you update the search_tickets node body?
2. Does the body include `filters.created_datetime.from` and `to`?
3. Check n8n execution logs → search node → request body

**Fix:**
- Update search node body per Fix 1.3

---

### Issue: Pagination Not Working

**Check:**
1. Did you add the cursor parameter to list_tickets node?
2. Is the parameter value `{{ $json.cursor }}`?
3. Check n8n execution logs → list_tickets node → query parameters

**Fix:**
- Add cursor parameter per Fix 1.4

---

### Issue: Memory Not Working

**Check:**
1. Is sessionKey correct? `{{ $('Parse Slack').first().json.thread_ts }}`
2. Is memory configured for enough history? (default: 10 messages)
3. Check n8n execution logs → Simple Memory1 node → session data

**Fix:**
- Update sessionKey per Fix 1.5

---

## 📋 Final Checklist

Before marking complete:

### Phase 0: Critical (MUST DO)
- [ ] SOP schema updated with all actions
- [ ] Test: "set priority to urgent" asks clarification
- [ ] Test: Memory works with pronouns
- [ ] Routing distribution: list_tickets < 50%

### Phase 1: Core Fixes (SHOULD DO)
- [ ] Planning AI system message updated
- [ ] Conversational AI system message updated
- [ ] Date filtering added to search_tickets
- [ ] Pagination added to list_tickets
- [ ] Memory sessionKey verified
- [ ] All 7 critical tests passing

### Phase 2: Formatting (NICE TO HAVE)
- [ ] List tickets formatter updated
- [ ] Get ticket formatter updated
- [ ] Message bodies shown
- [ ] Date columns shown

### Phase 3: Analytics (OPTIONAL)
- [ ] Analytics agent node created
- [ ] Fetch tickets node created
- [ ] Nodes wired correctly
- [ ] Test: "show me insights" works

---

## 📖 Documentation Reference

### Primary Guides
1. **CRITICAL_FIX_SOP_SCHEMA.md** - SOP schema fix (DO THIS FIRST!)
2. **SOP_SCHEMA_BEFORE_AFTER.md** - Visual comparison
3. **QUICK_START_GUIDE.md** - 30-minute quick start
4. **PRODUCTION_FIXES_IMPLEMENTATION_GUIDE.md** - Detailed steps

### Deep Dive
5. **PRODUCTION_FIXES_COMPREHENSIVE.md** - Root cause analysis
6. **TICKET_ANALYTICS_INTELLIGENCE.md** - Analytics feature
7. **PLANNING_AI_PRODUCTION_FIXED.txt** - Planning AI system message
8. **CONVERSATIONAL_AI_PRODUCTION_FIXED.txt** - Conversational AI system message

### Schema Files
9. **FIXED_SOP_SCHEMA_V2.json** - Corrected SOP schema

---

## 🎯 Summary

**Correct Implementation Order:**
1. 🔴 Fix SOP schema (5 min) - **CRITICAL BLOCKER**
2. 🟡 Update AI system messages (10 min) - **HIGH PRIORITY**
3. 🟡 Add date filtering and pagination (10 min) - **HIGH PRIORITY**
4. 🟢 Update formatters (20 min) - **MEDIUM PRIORITY**
5. 🔵 Implement analytics (1 hour) - **LOW PRIORITY**

**Total Time:**
- Minimum (Critical + Core): 30 minutes
- Recommended (Critical + Core + Formatting): 1 hour
- Complete (All features): 2 hours

**Expected Results:**
- ✅ Commands route correctly (90%+ accuracy)
- ✅ Clarifying questions work
- ✅ Date filtering works
- ✅ Pagination works
- ✅ Memory works
- ✅ No more table spam
- ✅ Message bodies shown
- ✅ (Optional) Analytics intelligence

---

**Ready to implement!** 🚀

Start with Phase 0 (SOP schema fix), test it, then continue with the rest.
