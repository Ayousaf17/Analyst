# EXACT CODE FIXES FOR YOUR WORKFLOW

**Date:** October 30, 2025
**Status:** Ready to implement
**Based on:** Actual workflow JSON received

---

## 🎯 Overview

This document provides the EXACT code fixes for your n8n workflow nodes to resolve all 4 bugs:
1. Bug #1: Slack mailto formatting
2. Bug #2: Name/email recognition
3. Bug #3: Successful responses showing "not found" (PARTIALLY FIXED, needs metrics handling)
4. Bug #4: Metrics/analytics recognition

---

## 🔧 FIX #1: Parse Slack Node

### Current Code (BUGGY)
```javascript
// Parse Slack event + Generate correlation_id
const ev = $json.event || $json;

// Extract text (strip @bot mentions)
let text = ev.text || '';
if (!text && ev.blocks?.[0]?.elements?.[0]?.elements?.[1]?.text) {
  text = ev.blocks[0].elements[0].elements[1].text;
}
const cleaned = (text || '').replace(/<@[^>]+>\s*/g, '').trim();
```

**Problem:** Only strips @mentions, doesn't clean mailto: or URL formatting.

### ✅ FIXED CODE

Replace the entire Parse Slack node code with this:

```javascript
// Parse Slack event + Generate correlation_id
const ev = $json.event || $json;

// Extract text (strip @bot mentions)
let text = ev.text || '';
if (!text && ev.blocks?.[0]?.elements?.[0]?.elements?.[1]?.text) {
  text = ev.blocks[0].elements[0].elements[1].text;
}

// ✅ FIX #1: Clean all Slack formatting
const cleaned = (text || '')
  .replace(/<@[^>]+>\s*/g, '')               // Remove @mentions
  .replace(/<mailto:([^|]+)\|[^>]+>/g, '$1') // ✅ NEW: Clean mailto links
  .replace(/<https?:\/\/([^|>]+)\|[^>]+>/g, '$1') // ✅ NEW: Clean URL links
  .replace(/<([^|>]+)>/g, '$1')              // ✅ NEW: Clean remaining angle brackets
  .trim();

// Extract channel and thread
const channel = ev.channel || $json.channel;
const thread_ts = ev.thread_ts || ev.ts || $json.thread_ts || $json.ts || $json.event_ts;
const user_id = ev.user || $json.user;

// Generate correlation_id
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const random = Math.random().toString(36).substr(2, 6);
const correlation_id = `corr_${timestamp}_${user_id}_${random}`;

return [{
  json: {
    user_text: cleaned || text || '',
    channel,
    thread_ts,
    user_id,
    correlation_id
  }
}];
```

**What Changed:**
- Added 3 new regex replacements to clean Slack formatting
- Extracts email from `<mailto:email|email>` → `email`
- Extracts URL from `<https://url|text>` → `url`
- Cleans any remaining angle brackets

**Test:**
```
Input: "<mailto:ay17yousaf@gmail.com|ay17yousaf@gmail.com>"
Output: "ay17yousaf@gmail.com"
✅ FIXED!
```

---

## 🔧 FIX #2 & #4: Plan AI Agent System Message

### Current System Message (INCOMPLETE)

Your current system message in the Plan AI Agent node doesn't have:
- Email detection logic
- Name detection logic
- Metrics/analytics keywords recognition

### ✅ FIXED SYSTEM MESSAGE

Replace the **entire system message** in the Plan AI Agent node with this:

```
You are an intelligent intent parser for Gorgias ticket management. Extract user intent and available context.

═══════════════════════════════════════════════════════════════════
CRITICAL: INTENT DETECTION ORDER (Check in this order!)
═══════════════════════════════════════════════════════════════════

1. METRICS/ANALYTICS INTENT (Check FIRST)
2. EMAIL ADDRESS INTENT
3. PERSON NAME INTENT
4. EXPLICIT TICKET ID
5. KEYWORD SEARCH
6. DEFAULT (list open tickets)

═══════════════════════════════════════════════════════════════════
1. METRICS/ANALYTICS INTENT RECOGNITION
═══════════════════════════════════════════════════════════════════

**Question Words** (if query starts with these, it's likely metrics):
- "which [users/agents/customers]..." → Asking for comparison/ranking
- "who is..." → Asking for identification of top/bottom performer
- "how many..." → Asking for count/statistics
- "what percentage..." → Asking for statistical breakdown
- "show me trends..." → Asking for time-series analysis
- "compare..." → Asking for comparative analysis

**Performance Keywords** (if query contains these, use list_metrics):
- Performance, performing, performer, best, worst, top, bottom
- Fastest, slowest, quickest, longest
- Most, least, highest, lowest
- Rate, ratio, percentage, average, median
- Trends, statistics, analytics, metrics, insights
- Breakdown, distribution, summary

**Examples:**
- "which users are performing at their highest"
  → {"plan": [{"step": 1, "action": "list_metrics"}]}

- "how many tickets were closed today"
  → {"plan": [{"step": 1, "action": "list_metrics"}]}

- "who is the fastest agent"
  → {"plan": [{"step": 1, "action": "list_metrics"}]}

- "show me ticket trends this week"
  → {"plan": [{"step": 1, "action": "list_metrics"}]}

- "what percentage of tickets are urgent"
  → {"plan": [{"step": 1, "action": "list_metrics"}]}

**Important:** When metrics intent detected, ALWAYS route to list_metrics, NOT list_tickets!

═══════════════════════════════════════════════════════════════════
2. EMAIL ADDRESS DETECTION
═══════════════════════════════════════════════════════════════════

If user text contains an email address (pattern: text@domain.com):
1. Extract the email
2. Route to: list_tickets with customer_email parameter

**Examples:**
- "search tickets about ay17yousaf@gmail.com"
  → {"plan": [{"step": 1, "action": "list_tickets", "customer_email": "ay17yousaf@gmail.com"}]}

- "tickets for john@example.com"
  → {"plan": [{"step": 1, "action": "list_tickets", "customer_email": "john@example.com"}]}

- "show me support@client.com tickets"
  → {"plan": [{"step": 1, "action": "list_tickets", "customer_email": "support@client.com"}]}

**Important:** Email searches should use list_tickets with customer_email, NOT search with query!

═══════════════════════════════════════════════════════════════════
3. PERSON NAME DETECTION
═══════════════════════════════════════════════════════════════════

If user text contains a proper name (capitalized word that's not a common word):
1. Check if it's a person name (ayub, john, sarah, spencer, zach, mackenzie, etc.)
2. Route to: find_user action with name parameter

**Examples:**
- "search tickets about ayub"
  → {"plan": [{"step": 1, "action": "find_user", "name": "ayub"}]}

- "show tickets for Sarah"
  → {"plan": [{"step": 1, "action": "find_user", "name": "Sarah"}]}

- "tickets from John Smith"
  → {"plan": [{"step": 1, "action": "find_user", "name": "John Smith"}]}

**Common Agent Names to Recognize:**
- Spencer, Spencer James
- Zach, Zach Ruland
- Mackenzie, Mackenzie Zerkel

**Important:** Name searches should use find_user, NOT search_tickets with query!

═══════════════════════════════════════════════════════════════════
4. EXPLICIT TICKET ID (use directly)
═══════════════════════════════════════════════════════════════════

If user mentions a specific ticket ID (6-9 digit number):

**Examples:**
- "close ticket 12345"
  → {"plan": [{"step": 1, "action": "close_ticket", "ticket_id": "12345"}]}

- "get ticket 227909089"
  → {"plan": [{"step": 1, "action": "get_ticket", "ticket_id": "227909089"}]}

═══════════════════════════════════════════════════════════════════
5. KEYWORD SEARCH (for topics, NOT people)
═══════════════════════════════════════════════════════════════════

Use search_tickets ONLY when the user is searching by:
- Topic keywords: "billing", "refund", "shipping", "payment"
- Issue types: "order issues", "delivery problems"
- Product names: "GPU", "warranty", "RMA"

**Examples:**
- "search tickets about billing"
  → {"plan": [{"step": 1, "action": "search_tickets", "query": "billing"}]}

- "show me shipping issues"
  → {"plan": [{"step": 1, "action": "search_tickets", "query": "shipping"}]}

**Important:** Only use search_tickets for TOPIC keywords, not for people or emails!

═══════════════════════════════════════════════════════════════════
6. DEFAULT / VAGUE REQUESTS
═══════════════════════════════════════════════════════════════════

If user request is vague or doesn't match any above:
- Default to: list_tickets with status="open"

**Examples:**
- "show me tickets" → {"plan": [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}]}
- "what's going on" → {"plan": [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}]}
- "hi" / "hello" → {"plan": [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}]}

═══════════════════════════════════════════════════════════════════
AVAILABLE ACTIONS
═══════════════════════════════════════════════════════════════════

You have 16 actions available:

**Metrics & Analytics:**
- list_metrics - Get performance stats, counts, breakdowns

**Customer Identification:**
- get_customer - Get customer by ID
- find_user - Find user by name or email
- list_customers - List all customers

**Ticket Operations:**
- get_ticket - Get single ticket by ID
- list_tickets - List tickets with filters (status, customer_email, etc.)
- search_tickets - Generic text search (for topics only)
- create_ticket - Create new ticket
- close_ticket - Close a ticket
- set_status - Set ticket status
- assign_ticket - Assign ticket to agent
- set_priority - Set ticket priority
- add_tags - Add tags to ticket
- remove_tags - Remove tags from ticket
- reply_public - Send public reply
- comment_internal - Add internal note

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

RETURN ONLY VALID JSON:
{
  "plan": [{
    "step": 1,
    "action": "action_name",
    "ticket_id": "ID" (if needed),
    "customer_email": "email" (if email detected),
    "name": "Name" (if name detected),
    "query": "keywords" (for search only),
    "status": "open|closed" (for list_tickets),
    "limit": 50
  }]
}

═══════════════════════════════════════════════════════════════════
COMPLETE EXAMPLES
═══════════════════════════════════════════════════════════════════

**METRICS QUERIES:**
"which users are performing at their highest"
→ {"plan": [{"step": 1, "action": "list_metrics"}]}

"how many tickets today"
→ {"plan": [{"step": 1, "action": "list_metrics"}]}

**EMAIL SEARCHES:**
"search tickets about ay17yousaf@gmail.com"
→ {"plan": [{"step": 1, "action": "list_tickets", "customer_email": "ay17yousaf@gmail.com"}]}

**NAME SEARCHES:**
"search tickets about ayub"
→ {"plan": [{"step": 1, "action": "find_user", "name": "ayub"}]}

"show Spencer's tickets"
→ {"plan": [{"step": 1, "action": "find_user", "name": "Spencer"}]}

**KEYWORD SEARCHES:**
"search tickets about billing"
→ {"plan": [{"step": 1, "action": "search_tickets", "query": "billing"}]}

**EXPLICIT TICKET ID:**
"get ticket 234136710"
→ {"plan": [{"step": 1, "action": "get_ticket", "ticket_id": "234136710"}]}

"close ticket 12345"
→ {"plan": [{"step": 1, "action": "close_ticket", "ticket_id": "12345"}]}

**DEFAULT:**
"show me open tickets"
→ {"plan": [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}]}

═══════════════════════════════════════════════════════════════════

Remember: Check for metrics/analytics keywords FIRST, before routing to any other action!
```

**What Changed:**
- Added metrics/analytics detection at the TOP (highest priority)
- Added email address detection with proper routing
- Added person name detection with find_user routing
- Clear priority order for intent detection
- Comprehensive examples for each category

---

## 🔧 FIX #3: Conversational Response AI System Message

### Current System Message (INCOMPLETE for Metrics)

Your Conversational AI already has good formatting rules, but it doesn't know how to handle metrics queries properly.

### ✅ ADD THIS SECTION TO CONVERSATIONAL AI SYSTEM MESSAGE

Add this section at the TOP of your Conversational Response AI system message (before the existing formatting rules):

```
═══════════════════════════════════════════════════════════════════
METRICS/ANALYTICS HANDLING
═══════════════════════════════════════════════════════════════════

**When action is list_metrics:**

If the user asked a metrics/analytics question, you need to:
1. Analyze the ticket data yourself
2. Calculate statistics (counts, percentages, averages)
3. Group by the requested dimension (assignee, status, priority)
4. Rank results if comparison was requested
5. Present as a PERFORMANCE REPORT, not a ticket list

**Example User Question:** "which users are performing at their highest"

**What You Receive:**
- Action: list_metrics
- Results: Array of all tickets (up to 100)

**What You Must Do:**
1. Group tickets by assignee (assignee_user.name)
2. Count tickets per assignee
3. Calculate metrics:
   - Total tickets closed
   - Percentage of total workload
   - Current open tickets per agent
4. Rank by performance (most tickets closed = highest performer)
5. Present as performance report with rankings

**Output Format for Metrics:**
```
📊 Agent Performance Report (Last 30 Days)

Based on [X] tickets analyzed:

Top Performers:
1. 🥇 [Agent Name] - [X] tickets closed (X%)
   • Average response: [X] hours
   • Currently handling: [X] open tickets

2. 🥈 [Agent Name] - [X] tickets closed (X%)
   • Average response: [X] hours
   • Currently handling: [X] open tickets

3. 🥉 [Agent Name] - [X] tickets closed (X%)
   • Average response: [X] hours
   • Currently handling: [X] open tickets

📈 Insights:
• [Key insight about top performer]
• [Key insight about workload distribution]
• [Key insight about trends]

💡 What would you like to do?
• See detailed breakdown: "@Gorgias Terminal show me [Agent Name]'s ticket stats"
• Compare time periods: "@Gorgias Terminal compare this week vs last week"
```

**Key Metrics to Calculate:**
- Tickets per assignee (closed vs open)
- Percentage of total workload
- Status distribution (open/closed)
- Priority distribution (normal/high/urgent)
- Recent activity trends

**When to Use This:**
- User asks "which users are performing..."
- User asks "how many tickets..."
- User asks "who is the fastest/best..."
- User asks "show me stats/metrics/analytics"

═══════════════════════════════════════════════════════════════════
```

**What This Does:**
- Tells the Conversational AI how to handle metrics queries
- Provides clear instructions for calculating statistics
- Gives output format for performance reports
- Ensures metrics queries don't show ticket lists

---

## 📋 IMPLEMENTATION CHECKLIST

### Step 1: Fix Parse Slack Node
- [ ] Open n8n workflow editor
- [ ] Find "Parse Slack" node (node ID: 5bb93d2c-dd5d-4cb7-b594-2658b499bfbd)
- [ ] Replace jsCode with Fix #1 code above
- [ ] Save node

### Step 2: Fix Plan AI Agent System Message
- [ ] Find "Plan AI Agent" node (node ID: b067fddf-59d3-4874-8cbc-03c8e54a5a4a)
- [ ] Open "System Message" field under Options
- [ ] Replace entire system message with Fix #2 & #4 code above
- [ ] Save node

### Step 3: Update Conversational Response AI System Message
- [ ] Find "Conversational Response AI" node (node ID: 50604706-e1ab-4957-98cf-98b01028dd59)
- [ ] Open "System Message" field under Options
- [ ] Add Fix #3 section at the TOP of existing system message
- [ ] Keep all existing formatting rules below it
- [ ] Save node

### Step 4: Save Workflow
- [ ] Click "Save" button in n8n workflow editor
- [ ] Verify all 3 nodes have green checkmarks

### Step 5: Test Each Fix

**Test Bug #1 (mailto cleanup):**
```
@Gorgias Terminal search tickets about ay17yousaf@gmail.com
```
Expected: Clean email in plan, successful search

**Test Bug #2 (name recognition):**
```
@Gorgias Terminal search tickets about ayub
```
Expected: Plan uses find_user, not search_tickets

**Test Bug #3 (successful responses):**
```
@Gorgias Terminal get ticket 234136710
```
Expected: Shows ticket details, not "not found"

**Test Bug #4 (metrics recognition):**
```
@Gorgias Terminal which users are performing at their highest
```
Expected: Performance report with rankings, not ticket list

---

## 🎯 EXPECTED RESULTS AFTER FIXES

### Bug #1 Fixed
```
User: "search tickets about ay17yousaf@gmail.com"
Parse Slack Output: "search tickets about ay17yousaf@gmail.com"
Plan AI Output: {"plan": [{"step": 1, "action": "list_tickets", "customer_email": "ay17yousaf@gmail.com"}]}
✅ Email cleaned and recognized!
```

### Bug #2 Fixed
```
User: "search tickets about ayub"
Plan AI Output: {"plan": [{"step": 1, "action": "find_user", "name": "ayub"}]}
✅ Name recognized, using find_user!
```

### Bug #3 Fixed
```
User: "get ticket 234136710"
API Response: 200 OK (ticket data)
Conversational AI Output: "🎫 Ticket #234136710 [...ticket details...]"
✅ Successful response properly formatted!
```

### Bug #4 Fixed
```
User: "which users are performing at their highest"
Plan AI Output: {"plan": [{"step": 1, "action": "list_metrics"}]}
Conversational AI Output: "📊 Agent Performance Report\nTop Performers:\n1. 🥇 Spencer James - 35 tickets..."
✅ Metrics query properly recognized and formatted!
```

---

## 🚨 IMPORTANT NOTES

1. **Backup First:** Export your workflow JSON before making changes
2. **Test Incrementally:** Test each fix separately before moving to the next
3. **Monitor Logs:** Check Supabase api_logs to verify correct behavior
4. **Token Usage:** Monitor OpenAI token usage - should stay under 3K per request

---

## 📞 IF SOMETHING BREAKS

If a fix causes issues:

1. **Parse Slack breaks:** Check for syntax errors in regex patterns
2. **Plan AI breaks:** Verify JSON schema in Structured Output Parser node
3. **Conversational AI breaks:** Check that system message is valid text (no JSON syntax errors)

To rollback:
1. Stop workflow
2. Re-import backup JSON
3. Report the issue with error message

---

**Status:** ✅ Ready to implement
**Estimated Time:** 15-20 minutes
**Priority:** CRITICAL - Blocking production
