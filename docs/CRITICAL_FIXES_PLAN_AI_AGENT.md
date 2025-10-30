# CRITICAL FIXES: Plan AI Agent "Sous Chef" Issues

**Date:** October 30, 2025
**Priority:** CRITICAL - Blocking production usage
**Status:** 🔴 NEEDS IMMEDIATE FIX

---

## 🎯 Executive Summary

The Plan AI Agent ("Sous Chef") is the critical component where user intent gets translated into action plans. Four critical bugs are preventing accurate plan generation:

1. **Bug #1**: Slack mailto formatting breaks plan generation
2. **Bug #2**: Names/emails not recognized - should trigger customer lookup first
3. **Bug #3**: Successful API calls returning "not found" responses
4. **Bug #4**: Metrics/analytics queries misinterpreted as simple list requests

All four bugs occur at critical points in the pipeline and break the user experience.

---

## 🐛 BUG #1: Slack mailto Formatting Breaks Plan Generation

### Severity: CRITICAL 🔴
### Impact: Empty plan output, workflow fails completely

### Problem Description

When users mention an email in Slack, it gets automatically formatted as:
```
<mailto:ay17yousaf@gmail.com|ay17yousaf@gmail.com>
```

This corrupted format is passed to the Plan AI Agent, which:
1. Gets confused by the invalid syntax
2. Outputs empty plan: `{"output": {}}`
3. Workflow fails at search HTTP node with 400 error

### Example Flow

**User Input (Slack):**
```
@Gorgias Terminal search tickets about ay17yousaf@gmail.com
```

**What Parse Slack Outputs:**
```json
{
  "user_text": "<mailto:ay17yousaf@gmail.com|ay17yousaf@gmail.com>",
  "channel": "C09BXTD0WR0",
  "thread_ts": "1761846876.255379",
  "user_id": "U09BSMA8U75"
}
```

**What Plan AI Receives:**
```
Convert this user request: "<mailto:ay17yousaf@gmail.com|ay17yousaf@gmail.com>"
```

**What Plan AI Outputs:**
```json
{
  "output": {}
}
```
❌ Empty plan!

**What Search HTTP Receives:**
```json
{
  "query": "<mailto:ay17yousaf@gmail.com|ay17yousaf@gmail.com>",
  "limit": 50
}
```

**Gorgias API Error:**
```json
{
  "error": {
    "msg": "Failed to perform search.",
    "data": {
      "type": ["Not a valid choice."],
      "q": ["No such field."]
    }
  }
}
```

### Root Cause

The **Parse Slack** node does not strip Slack's automatic link formatting before passing to Plan AI.

### Fix Location

**Node:** Parse Slack (Code node)
**File Reference:** n8n workflow - "Parse Slack" node

### ✅ FIX #1: Add Slack Formatting Cleanup

Add this code to the **Parse Slack** node:

```javascript
// Get the Slack event data
const items = $input.all();
const results = [];

for (const item of items) {
  const event = item.json.event || {};
  const text = event.text || '';

  // Extract user mention and clean text
  let userText = text
    .replace(/<@[A-Z0-9]+>/g, '') // Remove @mentions
    .replace(/<mailto:([^|]+)\|[^>]+>/g, '$1') // ✅ NEW: Clean mailto links
    .replace(/<https?:\/\/([^|>]+)\|[^>]+>/g, '$1') // ✅ NEW: Clean URL links
    .replace(/<([^|>]+)>/g, '$1') // ✅ NEW: Clean any remaining angle brackets
    .trim();

  // Generate correlation ID
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const userId = event.user || 'UNKNOWN';
  const randomId = Math.random().toString(36).substring(2, 8);
  const correlationId = `corr_${timestamp}_${userId}_${randomId}`;

  results.push({
    json: {
      user_text: userText,
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      user_id: event.user,
      correlation_id: correlationId
    }
  });
}

return results;
```

### Key Changes

1. **`replace(/<mailto:([^|]+)\|[^>]+>/g, '$1')`** - Extracts email from `<mailto:email|email>`
2. **`replace(/<https?:\/\/([^|]+)\|[^>]+>/g, '$1')`** - Cleans URL links
3. **`replace(/<([^|>]+)>/g, '$1')`** - Fallback for any other angle bracket formatting

### Expected Result After Fix

**User Input:**
```
@Gorgias Terminal search tickets about ay17yousaf@gmail.com
```

**Parse Slack Output:**
```json
{
  "user_text": "search tickets about ay17yousaf@gmail.com",
  "channel": "C09BXTD0WR0",
  "thread_ts": "1761846876.255379",
  "user_id": "U09BSMA8U75"
}
```
✅ Clean email, no formatting!

**Plan AI Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "search_tickets",
      "customer_email": "ay17yousaf@gmail.com"
    }
  ]
}
```
✅ Valid plan with clean email!

---

## 🐛 BUG #2: Names/Emails Not Recognized - Should Trigger Customer Lookup

### Severity: HIGH 🟡
### Impact: Poor user experience, inefficient workflows

### Problem Description

When users search for tickets by name or email, the Plan AI treats it as a generic text query instead of recognizing it as a person identifier.

**Example 1:**
```
User: "search tickets about ayub"
Current: search_tickets(query="ayub")
Expected: find_user(name="ayub") → get_customer → list_tickets(customer_id=X)
```

**Example 2:**
```
User: "search tickets about ay17yousaf@gmail.com"
Current: search_tickets(query="ay17yousaf@gmail.com")
Expected: get_customer(email="ay17yousaf@gmail.com") → list_tickets(customer_id=X)
```

### Why This Matters

1. **More accurate results** - Searching by customer ID is more precise than text search
2. **Better UX** - Users expect "search for ayub" to mean "find Ayub's tickets"
3. **Matches mental model** - When you say a person's name, you mean that person

### Root Cause

The **Plan AI Agent** (OpenAI Structured Output node) system prompt does not have instructions for:
1. Detecting when user input contains a name
2. Detecting when user input contains an email
3. Routing to customer lookup actions first

### Fix Location

**Node:** OpenAI Structured Output (HTTP Request node)
**Field:** System Message

### ✅ FIX #2A: Add Name/Email Detection to Plan AI Prompt

Replace the current System Message in the **OpenAI Structured Output** node with this enhanced version:

```
You are a Gorgias ticket management assistant. Convert user requests into structured action plans.

## CRITICAL: Name and Email Recognition

**BEFORE** creating any search_tickets plan, check if the user is searching by person:

### Email Detection
If user text contains an email address (pattern: text@domain.com):
1. Extract the email
2. Create plan: get_customer(customer_email="email@domain.com")
3. Follow with: list_tickets(customer_id=<from step 1>)

Examples:
- "search tickets about john@example.com" → get_customer(customer_email="john@example.com")
- "tickets for jane.doe@company.com" → get_customer(customer_email="jane.doe@company.com")
- "show me tickets from support@client.com" → get_customer(customer_email="support@client.com")

### Name Detection
If user text contains a proper name (capitalized word that's not a common word):
1. Check if it's a person name (ayub, john, sarah, etc.)
2. Create plan: find_user(name="Name") or search_tickets(query="Name")
3. If find_user exists as action, prefer it over search_tickets

Examples:
- "search tickets about ayub" → find_user(name="ayub") OR search_tickets(query="ayub")
- "show tickets for Sarah" → find_user(name="Sarah")
- "tickets from John Smith" → find_user(name="John Smith")

### Generic Search (NOT a person)
Only use generic search_tickets(query="X") when the user is clearly NOT searching by person:
- Keywords: "billing", "refund", "shipping", "payment"
- Phrases: "order issues", "delivery problems"
- Ticket IDs: "ticket 12345"

## Available Actions

You have 16 actions available (in priority order):

### Customer Identification (USE FIRST for person searches)
1. **get_customer** - Get customer by email
   - Parameters: customer_email (required)
   - Use when: Email address detected
   - Example: get_customer(customer_email="user@example.com")

2. **find_user** - Find user by name (if this action exists)
   - Parameters: name (required)
   - Use when: Person name detected
   - Example: find_user(name="Sarah")

3. **list_customers** - List all customers
   - Parameters: limit (optional, default 50)
   - Use when: "show all customers", "list customers"

### Ticket Operations
4. **get_ticket** - Get single ticket by ID
   - Parameters: ticket_id (required)
   - Use when: "get ticket 12345", "show ticket 12345"

5. **list_tickets** - List tickets with filters
   - Parameters: status, priority, assignee_email, customer_email, limit
   - Use when: "show open tickets", "list tickets"
   - Example: list_tickets(status="open", limit=50)

6. **search_tickets** - Generic text search (LAST RESORT for person searches)
   - Parameters: query (required)
   - Use when: Keyword search, NOT person search
   - Example: search_tickets(query="billing issue")

7. **create_ticket** - Create new ticket
   - Parameters: customer_email, subject, message
   - Use when: "create ticket", "new ticket"

8. **close_ticket** - Close a ticket
   - Parameters: ticket_id (required)
   - Use when: "close ticket 12345"

9. **reopen_ticket** - Reopen closed ticket
   - Parameters: ticket_id (required)
   - Use when: "reopen ticket 12345"

10. **assign_ticket** - Assign ticket to agent
    - Parameters: ticket_id, assignee_email
    - Use when: "assign ticket 12345 to agent@email.com"

11. **set_priority** - Set ticket priority
    - Parameters: ticket_id, priority (low/normal/high/urgent)
    - Use when: "set ticket 12345 to urgent"

12. **add_tags** - Add tags to ticket
    - Parameters: ticket_id, tags (comma-separated)
    - Use when: "tag ticket 12345 with refund,urgent"

13. **add_note** - Add internal note
    - Parameters: ticket_id, message
    - Use when: "add note to ticket 12345"

14. **send_reply** - Send public reply
    - Parameters: ticket_id, message
    - Use when: "reply to ticket 12345"

15. **list_metrics** - Get ticket statistics
    - Parameters: status, date_from, date_to
    - Use when: "how many tickets?", "ticket stats"

16. **help** - Show help information
    - Parameters: none
    - Use when: "help", "what can you do?"

## Multi-Step Planning

You can create multi-step plans when the user's request requires multiple actions:

Example 1: Get customer, then their tickets
```json
{
  "plan": [
    {
      "step": 1,
      "action": "get_customer",
      "customer_email": "john@example.com"
    },
    {
      "step": 2,
      "action": "list_tickets",
      "customer_email": "john@example.com"
    }
  ]
}
```

Example 2: Get ticket, then close it
```json
{
  "plan": [
    {
      "step": 1,
      "action": "get_ticket",
      "ticket_id": "12345"
    },
    {
      "step": 2,
      "action": "close_ticket",
      "ticket_id": "12345"
    }
  ]
}
```

## Default Behavior

If the user request is vague or doesn't match any action clearly:
- Default to: list_tickets(status="open", limit=50)
- This shows the most relevant information

## Examples

### Email Searches (CORRECT)
- "search tickets about john@example.com" → get_customer(customer_email="john@example.com")
- "tickets for jane.doe@company.com" → get_customer(customer_email="jane.doe@company.com")
- "show me support@client.com tickets" → get_customer(customer_email="support@client.com")

### Name Searches (CORRECT)
- "search tickets about ayub" → find_user(name="ayub") OR search_tickets(query="ayub")
- "show Sarah's tickets" → find_user(name="Sarah")
- "tickets from John Smith" → find_user(name="John Smith")

### Keyword Searches (CORRECT - Generic)
- "search tickets about billing" → search_tickets(query="billing")
- "find refund tickets" → search_tickets(query="refund")
- "tickets about shipping issues" → search_tickets(query="shipping issues")

### Ticket Operations
- "get ticket 234136710" → get_ticket(ticket_id="234136710")
- "show me open tickets" → list_tickets(status="open")
- "close ticket 12345" → close_ticket(ticket_id="12345")

### Multi-Step
- "get ticket 12345 and close it" → [get_ticket, close_ticket]
- "find john@example.com and show their tickets" → [get_customer, list_tickets]

## Response Format

Always return valid JSON with this structure:
```json
{
  "plan": [
    {
      "step": 1,
      "action": "action_name",
      "parameter1": "value1",
      "parameter2": "value2"
    }
  ]
}
```

Remember: When in doubt about a person search, prefer customer lookup over generic search!
```

### ✅ FIX #2B: Add find_user Action (If Not Exists)

If your workflow doesn't have a `find_user` action, add it:

**New HTTP Request Node: "find_user"**
- **Method:** GET
- **URL:** `https://ironsidecomputers.gorgias.com/api/customers?query={{ $json.name }}&limit=10`
- **Authentication:** HTTP Basic Auth (Gorgias credentials)
- **Response Format:** JSON

**Connect to Switch Node:**
Add new output to Switch node:
- **Output:** `find_user`
- **Condition:** `{{ $json.action === 'find_user' }}`
- **Route to:** find_user HTTP node

### Expected Result After Fix

**User Input:**
```
@Gorgias Terminal search tickets about ayub
```

**Plan AI Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "find_user",
      "name": "ayub"
    }
  ]
}
```
✅ Recognizes "ayub" as a name, searches for customer first!

**User Input:**
```
@Gorgias Terminal search tickets about ay17yousaf@gmail.com
```

**Plan AI Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "get_customer",
      "customer_email": "ay17yousaf@gmail.com"
    }
  ]
}
```
✅ Recognizes email, uses get_customer!

---

## 🐛 BUG #3: Successful API Calls Return "Not Found" Responses

### Severity: CRITICAL 🔴
### Impact: Accurate data retrieved but user sees error message

### Problem Description

The workflow successfully fetches ticket data from Gorgias API (200 status), but the Conversational Response AI says "I didn't find any ticket."

**Example:**
```
User: "get ticket 234136710"

Plan AI Output:
{
  "step": 1,
  "action": "get_ticket",
  "ticket_id": "234136710"
}

Gorgias API Response: 200 OK
{
  "id": 234136710,
  "subject": "Conversation with icyemerald05@gmail.com",
  "status": "closed",
  "priority": "normal",
  "customer_email": "icyemerald05@gmail.com",
  "assignee": "Spencer James",
  "message_count": 4
}

Conversational AI Input:
{
  "results": [
    {
      "step": 1,
      "action": "get_ticket",
      "status_code": 200,
      "success": true,
      "summary": {
        "id": 234136710,
        "subject": "Conversation with icyemerald05@gmail.com",
        "status": "closed",
        ...
      }
    }
  ]
}

Conversational AI Output:
"❌ I didn't find any ticket with ID #234136710."
```

### Root Cause

According to `CORRECT_CONVERSATIONAL_AI_PROMPT.md`, this was already fixed on Oct 30, 2025 (commit dadadcb).

**The problem:** The Conversational AI prompt was looking at the wrong data path:
- ❌ OLD: `$json.results[0].response_data` (undefined)
- ✅ NEW: `$json.results[0].summary` (correct)

However, since the user is still experiencing this issue, the fix may not have been applied to the production workflow yet.

### Fix Location

**Node:** Conversational Response AI (AI Agent node)
**Field:** Prompt/User Message

### ✅ FIX #3: Update Conversational AI Prompt to Correct Data Path

Replace the **User Prompt** in the **Conversational Response AI** node:

```javascript
User Question: {{ $('Parse Slack').first().json.user_text }}
Action: {{ $json.results[0]?.action || 'unknown' }}

{% if $json.results[0]?.summary %}
{# For actions that return a summary object #}
{% if $json.results[0].summary.items %}
{# List actions (list_tickets, search_tickets, list_customers) #}
Total Count: {{ $json.results[0].summary.total_count || $json.results[0].summary.items.length }}
Showing: {{ $json.results[0].summary.showing_count || $json.results[0].summary.items.length }} items

Data:
{{ JSON.stringify($json.results[0].summary.items, null, 2) }}

{% if $json.results[0].summary.statistics %}
Statistics:
{{ JSON.stringify($json.results[0].summary.statistics, null, 2) }}
{% endif %}

{% if $json.results[0].summary.pagination_hint %}
Pagination: {{ $json.results[0].summary.pagination_hint }}
{% endif %}

{% else %}
{# Single item actions (get_ticket, get_customer) #}
Data:
{{ JSON.stringify($json.results[0].summary, null, 2) }}
{% endif %}

{% elif $json.results[0]?.response_data %}
{# Fallback: Some nodes might still use response_data #}
Data:
{{ JSON.stringify($json.results[0].response_data, null, 2) }}

{% else %}
No data returned.
{% endif %}

Status: {{ $json.results[0]?.success ? '✅ Success' : '❌ Failed' }}
HTTP Code: {{ $json.results[0]?.status_code }}
Duration: {{ $json.results[0]?.duration_ms }}ms

{% if $json.token_budget %}
Token Budget: {{ $json.token_budget.estimated_tokens || 'N/A' }} tokens used
{% endif %}
```

### Key Changes

1. **Primary path: `$json.results[0].summary`** - Checks summary object first
2. **Handles both list and single results:**
   - If `summary.items` exists → list of tickets/customers
   - If `summary` only → single ticket/customer
3. **Fallback: `$json.results[0].response_data`** - For backwards compatibility
4. **Includes metadata:** Status, HTTP code, duration, token usage

### Expected Result After Fix

**User Input:**
```
@Gorgias Terminal get ticket 234136710
```

**Conversational AI Receives:**
```json
{
  "results": [
    {
      "step": 1,
      "action": "get_ticket",
      "status_code": 200,
      "success": true,
      "summary": {
        "id": 234136710,
        "subject": "Conversation with icyemerald05@gmail.com",
        "status": "closed",
        "priority": "normal",
        "customer_email": "icyemerald05@gmail.com",
        "assignee": "Spencer James"
      }
    }
  ]
}
```

**Conversational AI Output:**
```
🎫 Ticket #234136710

Subject: Conversation with icyemerald05@gmail.com
Status: Closed ✅
Priority: Normal
Customer: icyemerald05@gmail.com
Assignee: Spencer James
Messages: 4

This ticket has been closed. What would you like to do?
• Reopen: "@Gorgias Terminal reopen ticket 234136710"
• View customer: "@Gorgias Terminal get customer icyemerald05@gmail.com"
```
✅ Correct interpretation of successful API response!

---

## 🐛 BUG #4: Metrics/Analytics Queries Misinterpreted as Simple List Requests

### Severity: HIGH 🟡
### Impact: Users can't get performance insights, analytics, or statistical information

### Problem Description

When users ask for **metrics, analytics, or performance data**, the Plan AI Agent misinterprets it as a simple ticket listing request instead of recognizing it as a statistical/analytical query.

**Example 1:**
```
User: "which users are performing at their highest"

Current Plan AI Output:
{
  "plan": [
    {
      "step": 1,
      "action": "list_tickets",
      "status": "",
      "limit": 50
    }
  ]
}

Current Response:
📋 Here are 20 tickets out of 100 total:
#234143209 | Special Invitation from FedEx...
#234140572 | Odbierz -23% na pierwsze zakupy...
[... list of tickets ...]

❌ WRONG! User wanted performance metrics, not a ticket list!
```

**What the user ACTUALLY wanted:**
- Performance metrics by assignee
- Ticket resolution rates
- Response time statistics
- Top performing agents

**Correct Plan Should Be:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_metrics",
      "group_by": "assignee",
      "metric_type": "performance",
      "time_period": "last_30_days"
    }
  ]
}
```

**Correct Response Should Be:**
```
📊 Agent Performance Report (Last 30 Days)

Top Performers:
1. Spencer James
   • Tickets Closed: 87 (29%)
   • Avg Response Time: 2.3 hours
   • Customer Satisfaction: 4.8/5

2. Zach Ruland
   • Tickets Closed: 45 (15%)
   • Avg Response Time: 3.1 hours
   • Customer Satisfaction: 4.6/5

3. Mackenzie Zerkel
   • Tickets Closed: 32 (11%)
   • Avg Response Time: 4.2 hours
   • Customer Satisfaction: 4.5/5

💡 Would you like to:
• See detailed breakdown for an agent
• Compare performance over different time periods
• Export this data to CSV
```

### Root Cause

The **Plan AI Agent** system prompt does not have:
1. Instructions for recognizing metric/analytics queries
2. Patterns for questions that start with "which", "who", "how many", "what percentage"
3. Understanding of performance-related keywords (performing, best, worst, fastest, slowest)
4. Logic to route to `list_metrics` instead of `list_tickets`

### Examples of Misinterpreted Queries

| User Query | Current Action | Correct Action |
|------------|---------------|----------------|
| "which users are performing at their highest" | list_tickets | list_metrics(group_by="assignee") |
| "how many tickets were closed today" | list_tickets | list_metrics(status="closed", date="today") |
| "who is the fastest agent" | list_tickets | list_metrics(metric="avg_response_time", group_by="assignee") |
| "what percentage of tickets are urgent" | list_tickets | list_metrics(group_by="priority") |
| "show me ticket trends this week" | list_tickets | list_metrics(time_period="last_7_days") |
| "which customers have the most tickets" | list_tickets | list_metrics(group_by="customer") |

### Fix Location

**Node:** OpenAI Structured Output (HTTP Request node)
**Field:** System Message

### ✅ FIX #4: Add Metrics/Analytics Intent Recognition to Plan AI Prompt

Add this section to the **OpenAI Structured Output** system message (insert BEFORE the "Available Actions" section):

```
## CRITICAL: Metrics and Analytics Intent Recognition

**BEFORE** defaulting to list_tickets, check if the user is asking for ANALYTICS/METRICS:

### Question Word Detection
If user query starts with these patterns, it's likely a metrics query:
- "which [users/agents/customers]..." → Asking for comparison/ranking
- "who is..." → Asking for identification of top/bottom performer
- "how many..." → Asking for count/statistics
- "what percentage..." → Asking for statistical breakdown
- "show me trends..." → Asking for time-series analysis
- "compare..." → Asking for comparative analysis

### Performance Keywords
If query contains these words, use list_metrics:
- Performance, performing, performer, best, worst, top, bottom
- Fastest, slowest, quickest, longest
- Most, least, highest, lowest
- Rate, ratio, percentage, average, median
- Trends, statistics, analytics, metrics, insights
- Breakdown, distribution, summary

### Metrics Action Routing

When metrics intent detected, use this structure:

```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_metrics",
      "group_by": "assignee|customer|status|priority|tag",
      "metric_type": "performance|volume|time|satisfaction",
      "time_period": "today|yesterday|last_7_days|last_30_days|this_month",
      "status": "open|closed|all" (optional)
    }
  ]
}
```

### Examples of Metrics Routing

**Performance Questions:**
- "which users are performing at their highest"
  → list_metrics(group_by="assignee", metric_type="performance")

- "who is the fastest agent"
  → list_metrics(group_by="assignee", metric_type="time", sort="asc")

- "show me top performing agents this month"
  → list_metrics(group_by="assignee", metric_type="performance", time_period="this_month")

**Volume Questions:**
- "how many tickets were closed today"
  → list_metrics(status="closed", time_period="today", metric_type="volume")

- "which customer has the most tickets"
  → list_metrics(group_by="customer", metric_type="volume", sort="desc")

- "show me ticket volume by priority"
  → list_metrics(group_by="priority", metric_type="volume")

**Statistical Questions:**
- "what percentage of tickets are urgent"
  → list_metrics(group_by="priority", metric_type="distribution")

- "show me ticket trends this week"
  → list_metrics(time_period="last_7_days", metric_type="trends")

- "breakdown tickets by status"
  → list_metrics(group_by="status", metric_type="distribution")

**Time-Based Questions:**
- "average response time by agent"
  → list_metrics(group_by="assignee", metric_type="time")

- "which agent closes tickets fastest"
  → list_metrics(group_by="assignee", metric_type="time", sort="asc")

### When NOT to Use Metrics

Use list_tickets (not list_metrics) when user wants:
- Actual ticket details/content: "show me the tickets"
- Specific ticket list: "open tickets assigned to me"
- Recent tickets: "latest tickets" (without asking for stats)
- Search results: "tickets about billing" (content search, not stats)

Use list_metrics when user wants:
- Counts, percentages, averages, totals
- Comparisons between agents/customers/periods
- Performance rankings
- Statistical breakdowns
- Trends over time
```

### ✅ FIX #4B: Ensure list_metrics Action Exists

If your workflow doesn't have a `list_metrics` action that supports these parameters, you have two options:

**Option A: Create Advanced Metrics Node (Recommended)**

Create a new Code node called **"Calculate Metrics"** that:
1. Fetches all tickets from Gorgias API
2. Performs grouping/aggregation based on parameters
3. Calculates statistics (counts, averages, percentages)
4. Returns formatted summary

**Option B: Use Multi-Step Plan (Workaround)**

If building a metrics node is too complex right now, the Plan AI can create a multi-step plan:

```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_tickets",
      "assignee_email": "",
      "limit": 100,
      "note": "Fetch all tickets for analysis"
    }
  ]
}
```

Then update the **Conversational Response AI** system message to include:

```
When you receive a full list of tickets AND the user asked a metrics/analytics question:
- Perform the statistical analysis yourself
- Group tickets by the requested dimension (assignee, priority, etc.)
- Calculate counts, percentages, averages
- Rank results if comparison was requested
- Present as a formatted report, not a ticket list
```

This way, the Conversational AI becomes responsible for the analysis when list_metrics doesn't exist.

### Expected Result After Fix

**User Input:**
```
@Gorgias Terminal which users are performing at their highest
```

**Plan AI Output (with new metrics routing):**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_metrics",
      "group_by": "assignee",
      "metric_type": "performance",
      "time_period": "last_30_days"
    }
  ]
}
```

**OR** (if list_metrics doesn't exist, use workaround):

```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_tickets",
      "limit": 100,
      "note": "User asked for performance metrics - analyze all tickets"
    }
  ]
}
```

**Conversational AI Output:**
```
📊 Agent Performance Report (Last 30 Days)

Based on 100 tickets analyzed:

Top Performers:
1. 🥇 Spencer James - 35 tickets closed (35%)
   • Average response: 2.3 hours
   • Currently handling: 3 open tickets

2. 🥈 Zach Ruland - 22 tickets closed (22%)
   • Average response: 3.1 hours
   • Currently handling: 2 open tickets

3. 🥉 Mackenzie Zerkel - 18 tickets closed (18%)
   • Average response: 4.2 hours
   • Currently handling: 1 open ticket

📈 Insights:
• Spencer James is your top performer with fastest response times
• 75% of tickets closed within 24 hours
• Peak ticket volume: Weekdays 9AM-11AM

💡 What would you like to do?
• See detailed breakdown: "@Gorgias Terminal show me Spencer's ticket stats"
• Compare time periods: "@Gorgias Terminal compare this week vs last week"
• Export data: "@Gorgias Terminal export performance report"
```
✅ Correct interpretation of analytics query!

---

## 🔧 Implementation Checklist

### Pre-Implementation
- [ ] Backup current workflow (export JSON)
- [ ] Document current node configurations
- [ ] Create test plan for each fix

### Bug #1: Slack Formatting Fix
- [ ] Open n8n workflow editor
- [ ] Locate **Parse Slack** node
- [ ] Replace code with Fix #1 code (includes mailto regex)
- [ ] Test with: `@Gorgias Terminal search ay17yousaf@gmail.com`
- [ ] Verify: Email appears clean in Plan AI input
- [ ] Verify: Plan AI outputs valid plan

### Bug #2: Name/Email Recognition Fix
- [ ] Locate **OpenAI Structured Output** node
- [ ] Open **System Message** field
- [ ] Replace entire system message with Fix #2A prompt
- [ ] If `find_user` action doesn't exist:
  - [ ] Create new HTTP Request node: "find_user"
  - [ ] Configure Gorgias API call for customer search
  - [ ] Add route in Switch node
- [ ] Test with: `@Gorgias Terminal search tickets about ayub`
- [ ] Verify: Plan uses find_user or get_customer, not search_tickets
- [ ] Test with: `@Gorgias Terminal search tickets about john@example.com`
- [ ] Verify: Plan uses get_customer with email parameter

### Bug #3: Conversational AI Data Path Fix
- [ ] Locate **Conversational Response AI** node
- [ ] Open **Prompt** or **User Message** field
- [ ] Replace with Fix #3 prompt (correct data paths)
- [ ] Keep **System Message** unchanged (161-line formatting guide)
- [ ] Test with: `@Gorgias Terminal get ticket 234136710`
- [ ] Verify: Response shows ticket details, not "not found"
- [ ] Test with: `@Gorgias Terminal show me open tickets`
- [ ] Verify: Response lists tickets correctly

### Post-Implementation Testing
- [ ] Run all UAT Phase 1 test cases (16 actions)
- [ ] Verify Supabase logging still works
- [ ] Check token usage (should be 2-3K per request)
- [ ] Monitor for errors in first 50 commands
- [ ] Get user feedback on accuracy

### Documentation Updates
- [ ] Update TECHNICAL_HANDOFF_V23.md with fix references
- [ ] Mark this document as IMPLEMENTED
- [ ] Create CHANGELOG entry with before/after examples
- [ ] Update UAT testing checklist

---

## 🎯 Success Criteria

### Bug #1 Fixed
- ✅ Emails with mailto formatting process correctly
- ✅ No empty plan outputs
- ✅ Search HTTP node receives clean email addresses
- ✅ No 400 errors from Gorgias API

### Bug #2 Fixed
- ✅ User names recognized and route to find_user
- ✅ Email addresses recognized and route to get_customer
- ✅ Generic keywords still use search_tickets
- ✅ More accurate results when searching by person

### Bug #3 Fixed
- ✅ Successful API calls generate success messages
- ✅ Ticket data properly displayed when found
- ✅ No "not found" messages for 200 OK responses
- ✅ All 16 actions respond appropriately

### Overall System Health
- ✅ 95%+ accuracy on user intent recognition
- ✅ <5% error rate in production
- ✅ Response time <3 seconds
- ✅ Token usage 2-3K per request
- ✅ User satisfaction improved

---

## 📊 Testing Matrix

| Test Case | Bug Fixed | Expected Plan | Expected Response |
|-----------|-----------|---------------|-------------------|
| `search tickets about ay17yousaf@gmail.com` | #1, #2 | get_customer(email) | Customer tickets listed |
| `search tickets about ayub` | #2 | find_user(name) | User's tickets listed |
| `get ticket 234136710` | #3 | get_ticket(id) | Ticket details shown |
| `search tickets about billing` | #2 | search_tickets(query) | Keyword search results |
| `show me open tickets` | #3 | list_tickets(status) | Open tickets listed |
| `<mailto:user@email.com\|user@email.com>` | #1 | Cleaned email | Valid plan |

---

## 🚨 Critical Notes for Implementation

### About the "Sous Chef" Metaphor

You're absolutely right - the Plan AI Agent is the **Sous Chef** of this operation. Just like in a kitchen:

1. **Sous Chef (Plan AI):** Takes orders, understands what's needed, organizes the workflow
2. **Line Cooks (HTTP nodes):** Execute specific tasks (get ticket, search, etc.)
3. **Expediter (Conversational AI):** Plates the final dish beautifully for the customer

**If the Sous Chef gets the order wrong, the entire kitchen fails.**

These three bugs are all "order taking" problems:
- **Bug #1:** Can't read the order (formatting issue)
- **Bug #2:** Misunderstands the order (intent recognition issue)
- **Bug #3:** Plates it wrong even when cooked correctly (response formatting issue)

All three must be fixed for the kitchen to run smoothly!

### Why These Fixes Are Critical

1. **Bug #1** breaks workflows completely - empty plans = no execution
2. **Bug #2** makes the system feel "dumb" - it should know when you're talking about a person
3. **Bug #3** makes the system feel broken - "I found it but I'll say I didn't"

### Validation Before Production

After implementing all three fixes:

1. **Run 20+ test commands** covering all scenarios
2. **Check Supabase logs** to verify correct data flow
3. **Monitor OpenAI token usage** (should stay ~2-3K per request)
4. **Get real user feedback** before declaring success

---

## 📝 Related Documents

- `TECHNICAL_HANDOFF_V23.md` - Overall architecture
- `CORRECT_CONVERSATIONAL_AI_PROMPT.md` - Bug #3 background
- `V23_CONNECTION_DIAGRAM.md` - Node flow diagram
- `UAT_TESTING_CHECKLIST.md` - Testing plan

---

## ✅ Status Tracking

- [ ] Fixes documented
- [ ] Code snippets created
- [ ] Implementation checklist created
- [ ] Testing matrix defined
- [ ] Ready for implementation

**Next Steps:**
1. Review this document with team
2. Backup production workflow
3. Implement fixes in order (Bug #1 → #2 → #3)
4. Test each fix before moving to next
5. Run full UAT Phase 1 testing
6. Deploy to production

---

**Document Status:** ✅ COMPLETE - Ready for Implementation
**Confidence Level:** HIGH - All bugs identified with clear fixes
**Estimated Fix Time:** 1-2 hours (implementation + testing)
**Priority:** CRITICAL - Blocking production usage
