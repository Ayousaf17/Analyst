# FIX: Hardcoded Analytics Issue - "Who is working on the most tickets?"

## Status
🔴 **CRITICAL BUG** - analyze_insights is too broad and returns 30-day report for simple questions
⏰ **Discovered:** 2025-11-09
✅ **Fix Time:** 15-20 minutes

---

## 🐛 The Problem

### Symptom
**User Input:** `@Gorgias Terminal who is working on the most tickets?`

**Expected:** Simple list showing current assignee workload
```
📊 Current Workload:
• Spencer James: 15 open tickets
• Zach Ruland: 12 open tickets
• Mackenzie Zerkel: 8 open tickets
• Unassigned: 96 tickets ⚠️
```

**Actual:** 2000+ line JSON report with 30-day analysis, recurring questions, performance alerts, recommendations, etc.

---

## 🔍 Root Cause Analysis

### The Issue

**analyze_insights description is too broad:**
```javascript
"description": "Analyze closed tickets from the last 30 days to identify recurring issues, customer pain points, tag patterns, assignee performance, and operational improvement opportunities..."
```

When user asks "who is working on the most tickets?", OpenAI sees:
- ✅ Keywords: "who", "working", "most tickets"
- ✅ Matches: "assignee performance"
- ❌ Calls: `analyze_insights` (full 30-day deep analysis)

**Should match:** A simpler function like `list_tickets` with grouping by assignee

### Missing Function

There's no function for "show me current ticket distribution by assignee" without doing a full analytics run. The closest option is `search_tickets` with `assignee_email`, but that requires knowing the email address upfront.

---

## ✅ THE FIX

### Solution Overview

1. **Add a new function:** `get_team_workload` for simple current workload queries
2. **Update analyze_insights description:** Make it more specific (only for deep analytics)
3. **Update list_tickets description:** Clarify it can answer "how many" questions

### Step 1: Update Build OpenAI Request Node

Find the "Build OpenAI Request" Code node and add this new function to the `tools` array (after `analyze_insights`):

```javascript
{
  type: "function",
  function: {
    name: "get_team_workload",
    description: "Show current ticket distribution across team members. Use when user asks 'who is working on most tickets', 'team workload', 'ticket distribution by agent', or 'which agents have the most open tickets'. Returns simple count of open tickets per assignee.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "Filter by ticket status. Default is 'open' for current workload.",
          default: "open"
        }
      }
    }
  }
}
```

### Step 2: Update analyze_insights Description

Find the `analyze_insights` function in the same node and update its description to be MORE SPECIFIC:

**OLD (Too Broad):**
```javascript
"description": "Analyze closed tickets from the last 30 days to identify recurring issues, customer pain points, tag patterns, assignee performance, and operational improvement opportunities. Use when user asks for insights, trends, common problems, patterns, recommendations to reduce ticket volume, or wants to understand what customers are asking about most frequently."
```

**NEW (More Specific):**
```javascript
"description": "Run comprehensive 30-day analytics report including: recurring customer questions, tag patterns, resolution times, spam analysis, and strategic recommendations. ONLY use for: 'analyze tickets', 'show insights', 'what are customers asking about', 'recurring issues', 'recommendations to reduce tickets'. DO NOT use for simple workload questions - use get_team_workload instead."
```

### Step 3: Update list_tickets Description

Find `list_tickets` function and clarify it can answer count questions:

**OLD:**
```javascript
"description": "List tickets with optional filters like status or priority. Use when user wants to see multiple tickets or filter tickets."
```

**NEW:**
```javascript
"description": "List tickets with optional filters like status or priority. Use when user asks 'how many tickets', 'show me open tickets', 'list all tickets', or wants to see multiple tickets. Returns ticket list with count."
```

### Step 4: Add get_team_workload Action

Now you need to handle the new `get_team_workload` action in your workflow:

**Option A: Route to list_tickets (Simplest)**

1. Open the "Route by Action" Switch node
2. Add a new route for `get_team_workload`
3. Connect it to the same path as `list_tickets`
4. In the "Normalize Step" node, add logic to set `status: "open"` for get_team_workload

**Option B: Create Custom Code Node (Better)**

Add a new Code node called "Get Team Workload" that:
1. Calls Gorgias API to get all open tickets
2. Groups by assignee_user.email
3. Counts tickets per assignee
4. Returns formatted summary

Code for the node:
```javascript
// Get Team Workload Node
const baseUrl = $vars.GORGIAS_BASE_URL || 'https://ironsidecomputers.gorgias.com';
const status = $json.status || 'open';
const correlationId = $json.correlation_id || '';

// This will be handled by the list_tickets HTTP node
// Just pass through with the right parameters
return [{
  json: {
    action: 'list_tickets',
    status: status,
    limit: 1000,  // Get all tickets to count properly
    group_by: 'assignee',  // Signal that we want grouping
    correlation_id: correlationId,
    original_action: 'get_team_workload'  // Track original intent
  }
}];
```

Then, add a Code node AFTER the list_tickets HTTP call called "Summarize Team Workload":

```javascript
// Summarize Team Workload
const responseData = $json.response_data || $json.body?.data || [];

if (!Array.isArray(responseData)) {
  return [{
    json: {
      success: false,
      error: 'Invalid response format',
      correlation_id: $json.correlation_id
    }
  }];
}

// Group tickets by assignee
const workload = {};
let unassigned = 0;

responseData.forEach(ticket => {
  const assignee = ticket.assignee_user?.email || 'unassigned';
  const name = ticket.assignee_user?.name || 'Unassigned';

  if (assignee === 'unassigned') {
    unassigned++;
  } else {
    if (!workload[assignee]) {
      workload[assignee] = {
        email: assignee,
        name: name,
        count: 0,
        tickets: []
      };
    }
    workload[assignee].count++;
    workload[assignee].tickets.push({
      id: ticket.id,
      subject: ticket.subject,
      priority: ticket.priority,
      created: ticket.created_datetime
    });
  }
});

// Convert to array and sort by count
const workloadArray = Object.values(workload).sort((a, b) => b.count - a.count);

// Format summary
const summary = {
  total_tickets: responseData.length,
  unassigned_count: unassigned,
  assigned_count: responseData.length - unassigned,
  assignees: workloadArray,
  top_3: workloadArray.slice(0, 3).map(a => ({
    name: a.name,
    email: a.email,
    count: a.count
  }))
};

return [{
  json: {
    success: true,
    action: 'get_team_workload',
    summary: summary,
    correlation_id: $json.correlation_id
  }
}];
```

### Step 5: Update Conversational Response AI Prompt

Add handling for team workload response in the Conversational AI prompt.

Find the Conversational Response AI node and update the prompt to include:

```javascript
User Question: {{ $('Parse Slack').first().json.user_text }}
Action: {{ $json.results[0]?.action || $json.action || 'unknown' }}

{% if $json.action === 'get_team_workload' or $json.results[0]?.action === 'get_team_workload' %}
Team Workload Summary:
Total Tickets: {{ $json.summary.total_tickets || $json.results[0]?.summary?.total_tickets }}
Assigned: {{ $json.summary.assigned_count || $json.results[0]?.summary?.assigned_count }}
Unassigned: {{ $json.summary.unassigned_count || $json.results[0]?.summary?.unassigned_count }}

Top Assignees:
{{ JSON.stringify($json.summary.top_3 || $json.results[0]?.summary?.top_3, null, 2) }}

Full Breakdown:
{{ JSON.stringify($json.summary.assignees || $json.results[0]?.summary?.assignees, null, 2) }}

{% else %}
[... existing prompt logic for other actions ...]
{% endif %}
```

---

## 🎯 SIMPLIFIED QUICK FIX (10 Minutes)

If the above is too complex, here's a simpler fix that just improves the function descriptions:

### 1. Update Build OpenAI Request

**Only change the descriptions - no new nodes needed:**

```javascript
const requestBody = {
  model: "gpt-4o-mini-2024-07-18",
  messages: [
    {
      role: "system",
      content: `You are a Gorgias ticket assistant. When user asks simple questions like "how many open tickets" or "who is working on most tickets", use the SIMPLEST function (list_tickets or search_tickets), NOT analyze_insights.

ONLY use analyze_insights for: "analyze tickets", "show insights", "what are customers asking about", "recurring issues", "give me recommendations".

For "who is working on most tickets" → use search_tickets with no filters, then I'll count by assignee.
For "how many open tickets" → use list_tickets with status=open.`
    },
    {
      role: "user",
      content: userText
    }
  ],
  tools: [
    // ... existing tools ...
    {
      type: "function",
      function: {
        name: "list_tickets",
        description: "List tickets with optional filters. Use for: 'how many tickets', 'show open tickets', 'list tickets'. Can answer count questions without deep analysis.",
        // ... rest of list_tickets ...
      }
    },
    {
      type: "function",
      function: {
        name: "search_tickets",
        description: "Search and filter tickets. Use for: 'who is working on most tickets', 'show tickets by assignee', 'which agent has tickets'. Returns ticket list that can be grouped/counted.",
        // ... rest of search_tickets ...
      }
    },
    {
      type: "function",
      function: {
        name: "analyze_insights",
        description: "DEEP 30-day analytics ONLY. Use ONLY when user explicitly asks for: 'analyze tickets', 'show insights', 'recurring issues', 'what are customers asking about', 'recommendations'. DO NOT use for simple count or workload questions.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["7d", "30d", "90d"],
              description: "Time period to analyze (7 days, 30 days, or 90 days). Default is 30 days.",
              default: "30d"
            },
            focus: {
              type: "string",
              enum: ["recurring_questions", "tag_analysis", "assignee_performance", "all"],
              description: "What to focus the analysis on. Default is comprehensive analysis.",
              default: "all"
            }
          }
        }
      }
    }
  ],
  tool_choice: "auto",
  temperature: 0.1,
  max_tokens: 8000
};
```

**Key Changes:**
1. Added system message explaining when to use each function
2. Updated list_tickets description to mention count questions
3. Updated search_tickets to mention workload queries
4. Updated analyze_insights to say "DEEP analytics ONLY"

### 2. Then Update Conversational Response AI

Make sure it can handle `list_tickets` or `search_tickets` results and count by assignee:

```javascript
User Question: {{ $('Parse Slack').first().json.user_text }}

{% if "who is working" in $('Parse Slack').first().json.user_text or "most tickets" in $('Parse Slack').first().json.user_text %}
{# User asked about workload - summarize by assignee #}

The data shows the current ticket distribution. I'll count the tickets by assignee and show you who's working on the most.

Ticket Data:
{{ JSON.stringify($json.results[0]?.summary?.items || $json.results[0]?.response_data, null, 2) }}

Please count how many tickets each assignee has and present it in this format:
"📊 Current Workload:
• [Name]: X open tickets
• [Name]: X open tickets
..."

If there are unassigned tickets, highlight that as a concern.

{% else %}
[... existing logic for other questions ...]
{% endif %}
```

---

## 📊 Expected Results After Fix

### Test 1: Simple Workload Question
**Input:** `@Gorgias Terminal who is working on the most tickets?`

**Output:**
```
📊 Current Workload:

👥 Team Distribution:
1. 🚫 Unassigned: 96 tickets (96%) ⚠️
2. Spencer James: 2 tickets
3. Zach Ruland: 1 ticket
4. Mackenzie Zerkel: 1 ticket

⚠️ **Alert:** 96% of tickets are unassigned! This needs immediate attention.

💡 Would you like me to:
• Show the oldest unassigned tickets
• Analyze why tickets aren't being assigned
• Get a full team performance report
```

### Test 2: Deep Analytics (Should Still Work)
**Input:** `@Gorgias Terminal analyze tickets from the last 30 days`

**Output:** (Full analytics report as before)

### Test 3: Simple Count Question
**Input:** `@Gorgias Terminal how many open tickets are there?`

**Output:**
```
📋 You have 13 open tickets.

Would you like me to:
• Show you the list of open tickets
• Filter by priority or assignee
• See the oldest open tickets
```

---

## 🚨 Why This Happened

The original `analyze_insights` function was designed to be a powerful "catch-all" for any analytics question. But AI function calling works by keyword matching in the description, so:

- "who is working on most tickets" matched "assignee performance" → called analyze_insights
- "what are customers asking about" matched "customer pain points" → called analyze_insights
- "how are we doing" matched "operational improvement" → called analyze_insights

**The fix:** Make function descriptions more specific and mutually exclusive. Each function should have a clear, narrow use case.

---

## 📝 Checklist

- [ ] Open "Build OpenAI Request" node
- [ ] Add system message explaining function usage (or update descriptions)
- [ ] Update analyze_insights description to say "DEEP analytics ONLY"
- [ ] Update list_tickets description to mention count questions
- [ ] Update search_tickets description to mention workload queries
- [ ] Save workflow
- [ ] Test: `@Gorgias Terminal how many open tickets?`
- [ ] Verify: Should call list_tickets, not analyze_insights
- [ ] Test: `@Gorgias Terminal who is working on most tickets?`
- [ ] Verify: Should call search_tickets or list_tickets, not analyze_insights
- [ ] Test: `@Gorgias Terminal analyze tickets from last 30 days`
- [ ] Verify: Should call analyze_insights (this should still work)

---

## 🎯 Success Criteria

✅ **Simple questions** (count, workload) call simple functions (list_tickets, search_tickets)
✅ **Complex questions** (analyze, insights, recommendations) call analyze_insights
✅ **No more hardcoded responses** - system adapts to user's actual question
✅ **Faster responses** - simple questions don't run expensive 30-day analytics

---

**Priority:** 🔴 HIGH
**Impact:** Users getting 2000-line JSON dumps for simple questions
**Fix Time:** 10-20 minutes
**Difficulty:** Medium - need to update function descriptions and optionally add new function

**Status:** Ready to implement
