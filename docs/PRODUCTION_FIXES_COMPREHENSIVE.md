# Production Fixes - Comprehensive Analysis & Solutions

**Date:** November 3, 2025
**Status:** Critical - Multiple Production Issues Identified
**Priority:** High - Impacts core functionality

---

## 🚨 Executive Summary

Based on extensive Slack conversation analysis, the workflow has **10 critical issues** preventing it from functioning as an intelligent AI agent:

1. ✅ **Everything routes to list_tickets** (routing failure)
2. ✅ **Pagination doesn't work** (shows same 15 tickets repeatedly)
3. ✅ **No date filtering** (ignores "last 7 days" requests)
4. ✅ **Missing actions** (set_priority, add_note, create_ticket)
5. ✅ **No clarifying questions** (executes blindly)
6. ✅ **Always shows tables** (not dynamic)
7. ✅ **No ticket message body** (truncated subjects only)
8. ✅ **No intelligent recommendations** (tags, assignments, spam detection)
9. ✅ **Memory not working** (no context retention)
10. ✅ **Stats varying randomly** (accuracy issues)

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue #1: Everything Routes to list_tickets

**Evidence from Slack logs:**
```
User: "set ticket priority to urgent" → list_tickets (WRONG!)
User: "add note to ticket" → list_tickets (WRONG!)
User: "create ticket" → list_tickets (WRONG!)
User: "show customers" → list_tickets (WRONG!)
```

**Root Cause:**
1. Planning AI is generating incorrect plans, OR
2. SOP (Structured Output Parser) is still failing validation, OR
3. Handle Plan Response fallback is ALWAYS triggering

**How to Debug:**
```javascript
// In Handle Plan Response node, add logging:
console.log('=== PLAN AI RAW OUTPUT ===');
console.log(JSON.stringify(planAiOutput, null, 2));

console.log('=== SOP VALIDATED OUTPUT ===');
console.log(JSON.stringify(sopOutput, null, 2));

console.log('=== EXTRACTED PLAN ===');
console.log(JSON.stringify(plan, null, 2));
```

**Likely Cause:** SOP schema STILL incorrect, or Handle Plan Response extraction logic not updated.

**Fix:** Apply `FIXED_SOP_SCHEMA.json` and `FIXED_HANDLE_PLAN_RESPONSE_V2.js` if not already done.

---

### Issue #2: Pagination Not Working

**Evidence from Slack logs:**
```
User: "show the next 15 tickets"
User: "list tickets page 2"
User: "list tickets from page 2"
Result: Always shows same 15 tickets
```

**Root Cause:**
1. Planning AI not extracting pagination parameters (cursor, page, offset)
2. Gorgias API uses **cursor-based pagination**, NOT page numbers
3. list_tickets action node doesn't support cursor parameter

**Gorgias Pagination:**
- `/api/tickets?cursor=eyJpZCI6MTIzNDU2fQ==`
- Response includes `meta.next_cursor` for next page
- Must store and pass cursor for subsequent requests

**Fix Required:**
1. Update Planning AI to extract cursor from user text or previous response
2. Update list_tickets action node to accept and use cursor parameter
3. Include next_cursor in response metadata for user to reference

---

### Issue #3: No Date Filtering

**Evidence from Slack logs:**
```
User: "open tickets from last 7 days"
User: "show tickets since 7 days ago"
Result: Shows all tickets, no date filtering
User: "how do I know these are from the last seven days?"
```

**Root Cause:**
1. Planning AI doesn't extract date/time parameters
2. Gorgias `/api/tickets` endpoint doesn't support date filtering
3. Must use `/api/tickets/search` with date range query

**Gorgias Date Filtering:**
```json
POST /api/tickets/search
{
  "filters": {
    "created_datetime": {
      "from": "2025-10-27T00:00:00Z",
      "to": "2025-11-03T23:59:59Z"
    }
  }
}
```

**Fix Required:**
1. Add date extraction logic to Planning AI
2. When user mentions "last X days", calculate date range
3. Route to search_tickets with date filter (NOT list_tickets)
4. Display created_datetime in responses so user can verify

---

### Issue #4: Missing Actions

**Evidence from Slack logs:**
```
User: "set ticket priority to urgent" → list_tickets (WRONG!)
User: "add note to ticket" → list_tickets (WRONG!)
User: "create ticket" → list_tickets (WRONG!)
```

**Actions Defined in Planning AI but NOT Implemented:**
- `set_priority` - Set ticket priority
- `comment_internal` - Add internal note
- `create_ticket` - Create new ticket
- `set_status` - Set custom status

**Root Cause:**
These action nodes don't exist in the n8n workflow.

**Fix Required:**
Create action nodes for each:

**set_priority:**
```http
PUT /api/tickets/{{ticket_id}}
{
  "priority": "urgent|high|normal|low"
}
```

**comment_internal:**
```http
POST /api/tickets/{{ticket_id}}/messages
{
  "via": "api",
  "source": {
    "type": "email",
    "from": {"address": "agent@example.com"}
  },
  "body_text": "{{internal_note}}",
  "public": false
}
```

**create_ticket:**
```http
POST /api/tickets
{
  "customer": {"email": "{{customer_email}}"},
  "channel": "api",
  "via": "api",
  "subject": "{{subject}}",
  "messages": [{
    "via": "api",
    "source": {"type": "email"},
    "body_text": "{{message}}"
  }]
}
```

---

### Issue #5: No Clarifying Questions

**Evidence from Slack logs:**
```
User: "set ticket priority to urgent"
Expected: "Which ticket would you like to set to urgent?"
Actual: Shows list_tickets (no clarification)
```

**Root Cause:**
Planning AI immediately defaults to list_tickets when missing parameters, instead of asking questions.

**Fix Required:**
Add a new action: `ask_clarification`

**Planning AI Logic:**
```javascript
// If action requires ticket_id but none provided and none in history:
→ {"plan": [{"step": 1, "action": "ask_clarification", "question": "Which ticket would you like to set to urgent? Please provide the ticket ID."}]}

// If action requires customer_email but none provided:
→ {"plan": [{"step": 1, "action": "ask_clarification", "question": "Which customer? Please provide their email address."}]}
```

**Workflow Implementation:**
```javascript
// In Handle Plan Response, check for ask_clarification:
if (action === 'ask_clarification') {
  return {
    json: {
      action: 'ask_clarification',
      question: step.question,
      response_text: step.question
    }
  };
}
```

**Conversational AI:**
Just return the question directly, no tables or formatting.

---

### Issue #6: Always Shows Tables/Stats

**Evidence from Slack logs:**
```
User: "set ticket priority to urgent"
Response: Shows 15-row ticket table + stats (WRONG!)

Expected: "✅ Set ticket #123 to urgent."
```

**Root Cause:**
Conversational AI always formats list_tickets responses with tables, regardless of whether the user wanted a list.

**Fix Required:**
Make Conversational AI **context-aware** and **dynamic**:

**Decision Logic:**
```javascript
// If action was ask_clarification:
→ Return question only (no tables)

// If action was set_priority, close_ticket, assign_ticket, reply_public:
→ Return confirmation only (no tables)
→ "✅ Set ticket #123 to urgent."

// If action was get_ticket:
→ Show ticket details with message body

// If action was list_tickets AND user explicitly requested list:
→ Show table

// If action was list_tickets BUT user wanted something else:
→ Show brief summary + clarification
```

---

### Issue #7: No Ticket Message Body

**Evidence from Slack logs:**
```
Ticket display shows:
- ID
- Subject (truncated)
- Status, Priority, Created
BUT NOT: Message body/content
```

**Root Cause:**
Conversational AI doesn't include `messages[0].body_text` from API response.

**Fix Required:**
Update Conversational AI to include message body when displaying ticket details:

**For get_ticket:**
```
🎫 Ticket #234525253

Subject: Billing issue with recent charge
Status: Open | Priority: Normal | Created: Nov 1, 2025

Message:
"I was charged twice for my last order. Can you please refund one of the charges? Order #12345."

Customer: john@example.com
Assigned to: spencer@example.com
```

**For list_tickets with message preview:**
```
┌─────────┬──────────────────────────┬─────────┬──────────────────────┐
│ ID      │ Subject                  │ Status  │ Message Preview      │
├─────────┼──────────────────────────┼─────────┼──────────────────────┤
│ 226... │ Billing issue            │ Open    │ "I was charged tw..." │
└─────────┴──────────────────────────┴─────────┴──────────────────────┘
```

---

### Issue #8: No Intelligent Recommendations

**User Requirements:**
1. Detect spam tickets
2. Recommend tags based on ticket content
3. Suggest assignees based on past patterns
4. Recommend macros based on issue type
5. Show if ticket message is positive/negative sentiment

**Root Cause:**
System is "hard-coded" with no intelligence layer.

**Fix Required: Add Intelligence Agent**

**Architecture:**
```
get_ticket
  ↓
[New] Analyze Ticket Intelligence (AI Agent)
  ↓
Conversational Response AI (includes intelligence insights)
```

**Intelligence Agent Prompt:**
```
Analyze this ticket and provide insights:

Ticket: {{ticket_data}}

Available tags: {{all_available_tags}}
Available macros: {{all_available_macros}}
Team members: {{team_members_with_specialties}}

Return JSON:
{
  "is_spam": boolean,
  "spam_confidence": 0-1,
  "suggested_tags": ["tag1", "tag2"],
  "suggested_assignee": "email@example.com",
  "assignee_reason": "Spencer handles billing issues",
  "suggested_macro": "macro_name",
  "sentiment": "positive|neutral|negative",
  "priority_recommendation": "urgent|high|normal|low",
  "priority_reason": "Customer is angry, mentions refund"
}
```

**Conversational AI Integration:**
```
🎫 Ticket #234525253

Subject: Billing issue with recent charge
Message: "I was charged twice for my last order..."

🤖 AI Insights:
• Priority: Recommend HIGH (customer mentions duplicate charge)
• Suggested assignee: spencer@example.com (handles billing issues)
• Recommended tags: billing, refund, duplicate-charge
• Sentiment: Negative ⚠️
• Apply macro: "billing_duplicate_charge_response"
```

---

### Issue #9: Memory Not Working

**Evidence from Slack logs:**
```
User: "get ticket 226392965"
[Shows ticket]
User: "tell me about this ticket"
Response: Shows list_tickets (no memory of ticket 226392965)
```

**Root Cause:**
sessionKey configuration error: `{{ $json.thread_ts }}` returns undefined.

**Fix:**
```javascript
// Current (BROKEN):
sessionKey: {{ $json.thread_ts }}

// Fixed:
sessionKey: {{ $('Parse Slack').first().json.thread_ts }}
```

**Why it's broken:**
Memory subnodes don't receive `$json` context. Must reference specific node output.

**Testing:**
```
1. "get ticket 234525253"
2. "close it"
Expected: Closes 234525253
Actual: Should work after fix
```

---

### Issue #10: Stats Varying Randomly

**Evidence from Slack logs:**
```
Query 1: "Open: 36 | Closed: 14"
Query 2: "Open: 34 | Closed: 16"  (same command!)
Query 3: "Open: 33 | Closed: 17"  (same command again!)
```

**Root Cause:**
1. Stats calculated from limited dataset (15 tickets shown), not total
2. Different API calls returning different subsets
3. Caching issues

**Fix Required:**
1. Calculate stats from TOTAL tickets, not just displayed subset
2. Use dedicated `/api/stats` endpoint if available
3. Or clearly label: "Stats for displayed tickets (15 of 50 total)"

**Better Approach:**
```
📋 Ticket List - Showing 15 of 50 total

[... ticket table ...]

📊 Overall Stats (all 50 tickets):
• Open: 36 | Closed: 14
• Average response time: 2.5 hours

📊 Displayed Stats (15 tickets shown):
• Open: 10 | Closed: 5
```

---

## 🔧 COMPREHENSIVE FIX PLAN

### Phase 1: Critical Routing Fixes (TODAY)

**1.1 Verify SOP Schema Fix Applied**
- [ ] Check SOP node schema has "output" wrapper
- [ ] Check Handle Plan Response extracts from `output.plan`
- [ ] Add debug logging to confirm plan extraction

**1.2 Fix Memory sessionKey**
- [ ] Change from `{{ $json.thread_ts }}`
- [ ] To: `{{ $('Parse Slack').first().json.thread_ts }}`
- [ ] Test with "close it" after viewing ticket

**1.3 Add Missing Action Nodes**
- [ ] Create `set_priority` action node
- [ ] Create `comment_internal` action node
- [ ] Create `create_ticket` action node
- [ ] Test each action

---

### Phase 2: Pagination & Date Filtering (TODAY)

**2.1 Add Pagination Support**
- [ ] Update Planning AI to extract cursor from user text
- [ ] Store next_cursor in workflow context
- [ ] Add cursor parameter to list_tickets action
- [ ] Test: "show next 15 tickets" works correctly

**2.2 Add Date Filtering**
- [ ] Add date extraction to Planning AI
- [ ] Convert "last 7 days" to ISO date range
- [ ] Use search_tickets with date filters (not list_tickets)
- [ ] Display created_datetime in responses
- [ ] Test: "tickets from last 7 days" works

---

### Phase 3: Intelligence Layer (TOMORROW)

**3.1 Create Ticket Intelligence Agent**
- [ ] Create new AI agent node after get_ticket
- [ ] Fetch available tags, macros, team members from Gorgias
- [ ] Create intelligence prompt (spam detection, tag suggestions, assignee recommendations)
- [ ] Return structured intelligence data

**3.2 Integrate Intelligence into Responses**
- [ ] Update Conversational AI to include AI insights
- [ ] Show suggested tags, assignees, macros
- [ ] Display spam confidence, sentiment
- [ ] Test with real tickets

---

### Phase 4: Dynamic Responses (TOMORROW)

**4.1 Add ask_clarification Action**
- [ ] Update Planning AI with clarification logic
- [ ] Handle ask_clarification in Handle Plan Response
- [ ] Update Conversational AI to show question only (no tables)
- [ ] Test: "set priority urgent" asks which ticket

**4.2 Make Responses Context-Aware**
- [ ] Add decision logic to Conversational AI
- [ ] Don't show tables for confirmation actions
- [ ] Include message body for get_ticket
- [ ] Show message preview column in list_tickets
- [ ] Test various scenarios

---

### Phase 5: Stats & Polish (TOMORROW)

**5.1 Fix Stats Calculation**
- [ ] Calculate from total dataset, not displayed subset
- [ ] Clearly label stats scope
- [ ] Use dedicated stats endpoint if available
- [ ] Test consistency across multiple queries

**5.2 Comprehensive Testing**
- [ ] Test all 20 memory scenarios
- [ ] Test all actions
- [ ] Test pagination flows
- [ ] Test date filtering
- [ ] Test intelligence recommendations
- [ ] Test clarifying questions

---

## 📋 UPDATED PLANNING AI SYSTEM MESSAGE

See separate file: `PLANNING_AI_PRODUCTION_FIXED.txt`

**Key Additions:**
1. Date extraction logic
2. Pagination cursor extraction
3. ask_clarification action
4. Improved fallback logic (don't always default to list_tickets)
5. Missing parameter detection

---

## 📋 UPDATED CONVERSATIONAL AI SYSTEM MESSAGE

See separate file: `CONVERSATIONAL_AI_PRODUCTION_FIXED.txt`

**Key Additions:**
1. Dynamic response formatting (not always tables)
2. Ticket message body inclusion
3. AI intelligence insights formatting
4. Clarification question formatting
5. Context-aware suggestions

---

## 🏗️ ARCHITECTURAL RECOMMENDATIONS

### Current Architecture (Simplified):
```
User Input → Planning AI → Actions → Conversational AI → Response
```

**Problems:**
- No intelligence
- No clarification
- Hard-coded logic
- No context awareness

### Recommended Architecture:
```
User Input
  ↓
[New] Pre-Processing Agent
  - Detect ambiguity
  - Extract entities (dates, IDs, names)
  - Check if clarification needed
  ↓
Planning AI (updated)
  - Route to actions OR ask_clarification
  ↓
Actions (execute)
  ↓
[New] Intelligence Agent (for get_ticket, search_tickets)
  - Spam detection
  - Tag recommendations
  - Assignee suggestions
  - Sentiment analysis
  ↓
[New] Response Decision Agent
  - Decide response format (table vs text)
  - Include intelligence insights
  - Add contextual suggestions
  ↓
Conversational AI (updated)
  - Format final response
  - Include message bodies
  - Dynamic formatting
```

**Benefits:**
- ✅ Intelligent recommendations
- ✅ Clarifying questions
- ✅ Context-aware responses
- ✅ Spam detection
- ✅ Smart suggestions

**Implementation Complexity:**
- **Phase 1-2 (Critical Fixes):** 2-4 hours
- **Phase 3 (Intelligence):** 4-6 hours
- **Phase 4-5 (Polish):** 2-4 hours
- **Total:** 8-14 hours

---

## 🎯 ALIGNMENT WITH PROJECT SCOPE

**From Project Proposal:**
> "AI Agent that allows users to interact with Gorgias via Slack using natural language commands"

**Current State:** ❌ Not meeting scope
- Not natural language (requires exact IDs)
- Not intelligent (no recommendations)
- No clarification (assumes context)
- Hard-coded routing

**After Fixes:** ✅ Meets scope
- Natural language with pronoun resolution
- Intelligent recommendations
- Asks clarifying questions
- Dynamic, context-aware responses
- Proper pagination and filtering
- Shows ticket content (not just metadata)

---

## 📊 TESTING CHECKLIST

After applying all fixes:

- [ ] **Routing**: All actions route correctly (not always list_tickets)
- [ ] **Pagination**: "next 15 tickets" shows different tickets
- [ ] **Date Filtering**: "last 7 days" applies date filter
- [ ] **Missing Actions**: set_priority, add_note, create_ticket work
- [ ] **Clarification**: Asks questions when missing parameters
- [ ] **Dynamic Responses**: Doesn't always show tables
- [ ] **Message Body**: Shows ticket content
- [ ] **Intelligence**: Shows tag/assignee recommendations
- [ ] **Memory**: "close it" works after viewing ticket
- [ ] **Stats**: Consistent across multiple queries

---

## 🚀 IMMEDIATE NEXT STEPS

1. **Debug Current Routing Issue**
   - Add logging to Handle Plan Response
   - Check if SOP schema was actually updated
   - Verify plan extraction logic

2. **Apply Critical Fixes**
   - Fix memory sessionKey
   - Create missing action nodes
   - Update Planning AI with date/pagination logic

3. **Test Core Functionality**
   - Test each action independently
   - Verify routing works correctly
   - Confirm memory persists

4. **Add Intelligence Layer**
   - Create Intelligence Agent
   - Integrate with responses
   - Test recommendations

5. **Polish & Deploy**
   - Make responses dynamic
   - Add message bodies
   - Comprehensive testing
   - Production deployment

---

**Estimated Time to Production-Ready:** 8-14 hours of focused work

**Priority Order:**
1. Fix routing (Phases 1-2) - 4-6 hours - CRITICAL
2. Add intelligence (Phase 3) - 4-6 hours - HIGH
3. Polish responses (Phases 4-5) - 2-4 hours - MEDIUM

**End Goal:** Intelligent AI agent that meets project scope and user expectations.
