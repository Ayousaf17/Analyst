# 🎯 AI Agent Routing: The Core Problem

**Date:** November 7, 2025  
**Issue:** LLM is routing "who is working on the most tickets?" to wrong function

---

## 🔍 THE ACTUAL PROBLEM

### **What You Want**
```
User: "who is working on the most tickets?"
    ↓
AI Agent: Understands intent = "current workload by assignee"
    ↓
Routes to: get_current_workload (or similar simple function)
    ↓
Returns: Simple list of assignees + ticket counts
```

### **What's Happening**
```
User: "who is working on the most tickets?"
    ↓
AI Agent: Sees keywords "working" + "tickets" + "assignee"
    ↓
Matches: analyze_insights (description mentions "assignee performance")
    ↓
Returns: 2000-line analytics report (30 days of analysis)
```

---

## 🤔 WHY THIS HAPPENS

### **Root Cause: Function Description Overlap**

**Your analyze_insights function says:**
> "Analyze closed tickets from the last 30 days to identify recurring issues, customer pain points, tag patterns, **assignee performance**, and operational improvement opportunities..."

**LLM logic:**
```
User query: "who is working on the most tickets?"
              ↑ keyword: "working"
              
analyze_insights description: "...assignee performance..."
                                 ↑ matches!

LLM: "Aha! User wants assignee performance = analyze_insights"
```

**The problem:** `analyze_insights` is doing TWO jobs:
1. Deep analytics (trends, patterns, recommendations)
2. Current workload (who's working on what right now)

---

## 💡 THE SOLUTION SPECTRUM

You have 3 architectural approaches:

### **Approach 1: More Specific Functions** 📊
Add granular functions for common queries

**Pros:**
- ✅ Precise control
- ✅ Fast execution
- ✅ Predictable results

**Cons:**
- ❌ More functions to maintain
- ❌ Can't handle unexpected queries
- ❌ Feels like hard-coding

---

### **Approach 2: Better Function Descriptions** 🎯
Improve AI routing with clearer descriptions

**Pros:**
- ✅ Keep flexible AI routing
- ✅ Fewer functions
- ✅ Can handle variations

**Cons:**
- ❌ Still probabilistic (95% not 100%)
- ❌ Requires careful prompt engineering
- ❌ May need iteration

---

### **Approach 3: Hybrid - Pre-filter Intent** 🔀
Use AI for intent classification, then deterministic routing

**Pros:**
- ✅ Best of both worlds
- ✅ AI handles natural language
- ✅ Deterministic execution
- ✅ Can validate before expensive operations

**Cons:**
- ❌ More complex architecture
- ❌ Two-stage processing

---

## 🎯 RECOMMENDED SOLUTION: Approach 3 (Hybrid)

### **Architecture**

```
User: "who is working on the most tickets?"
    ↓
┌─────────────────────────────────────────────┐
│ STAGE 1: Intent Classification (AI)         │
│                                             │
│ OpenAI analyzes query and returns:          │
│ {                                            │
│   "intent_category": "workload_query",      │
│   "time_scope": "current",                  │
│   "group_by": "assignee",                   │
│   "needs_analytics": false                  │
│ }                                            │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ STAGE 2: Intent Router (Deterministic)      │
│                                             │
│ IF intent_category == "workload_query":     │
│   IF time_scope == "current":               │
│     → Call list_tickets + group by assignee │
│   ELSE IF time_scope == "historical":       │
│     → Call analyze_insights                 │
│                                             │
│ IF intent_category == "trend_analysis":     │
│   → Call analyze_insights                   │
│                                             │
│ IF intent_category == "specific_ticket":    │
│   → Call get_ticket                         │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ STAGE 3: Execute Function (Deterministic)   │
│                                             │
│ list_tickets(status=open)                   │
│   → Group by assignee                       │
│   → Count tickets per person                │
│   → Return simple summary                   │
└─────────────────────────────────────────────┘
    ↓
Result: Simple workload list ✅
```

---

## 🛠️ IMPLEMENTATION

### **Step 1: Define Intent Categories**

```javascript
const INTENT_CATEGORIES = {
  // Quick queries (simple API calls)
  "workload_query": {
    description: "User wants current ticket distribution/workload",
    examples: [
      "who is working on the most tickets?",
      "show me ticket distribution",
      "who has the most open tickets?",
      "current workload by agent"
    ],
    time_scope: "current",
    needs_analytics: false
  },

  // Specific operations
  "ticket_operation": {
    description: "User wants to act on specific ticket(s)",
    examples: [
      "close ticket 5678",
      "assign ticket 5678 to collin",
      "get ticket 5678"
    ],
    time_scope: "n/a",
    needs_analytics: false
  },

  // Historical analysis
  "trend_analysis": {
    description: "User wants deep insights/trends over time",
    examples: [
      "what are the top issues this month?",
      "show me trends in customer complaints",
      "analyze assignee performance over last 30 days",
      "what patterns do you see in closed tickets?"
    ],
    time_scope: "historical",
    needs_analytics: true
  },

  // Search/filter
  "search_query": {
    description: "User wants to find tickets matching criteria",
    examples: [
      "show me spencer's tickets",
      "find urgent tickets",
      "tickets from this week"
    ],
    time_scope: "current",
    needs_analytics: false
  }
};
```

---

### **Step 2: Intent Classification Prompt**

```javascript
const intentClassificationPrompt = `
You are an intent classifier for a Gorgias ticket management system.

Analyze the user's query and classify it into ONE of these categories:

CATEGORIES:
1. workload_query - User wants current ticket distribution/counts by assignee
   - Keywords: "who has", "current workload", "distribution", "working on most"
   - Time scope: RIGHT NOW (current open tickets)
   - Output type: Simple counts/summary

2. trend_analysis - User wants deep insights, patterns, trends over TIME
   - Keywords: "analyze", "trends", "patterns", "over last X days", "insights"
   - Time scope: HISTORICAL (past 7-30 days)
   - Output type: Detailed analysis

3. ticket_operation - User wants to act on specific ticket(s)
   - Keywords: "close", "assign", "update", "get", "ticket #"
   - Action required: Yes

4. search_query - User wants to find/list tickets by criteria
   - Keywords: "show me", "find", "search", "list"
   - Filtering required: Yes

CRITICAL DISTINCTIONS:
- "who is working on most tickets?" = workload_query (current state)
- "analyze assignee performance" = trend_analysis (historical)
- "show me spencer's tickets" = search_query (filter + list)

Return ONLY valid JSON:
{
  "intent_category": "workload_query",
  "confidence": 0.95,
  "time_scope": "current",
  "needs_analytics": false,
  "reasoning": "User asks about current workload distribution"
}

User query: "{{user_query}}"
`;
```

---

### **Step 3: Deterministic Router**

```javascript
// Node: "Route by Intent Category"

const intent = $json.intent_classification;
const userQuery = $json.user_query;

// WORKLOAD QUERY → Simple current state
if (intent.intent_category === "workload_query") {
  return [{
    json: {
      route: "simple_workload",
      action: "list_tickets",
      params: {
        status: "open",
        limit: 1000
      },
      post_process: "group_by_assignee"
    }
  }];
}

// TREND ANALYSIS → Deep analytics
if (intent.intent_category === "trend_analysis") {
  return [{
    json: {
      route: "analytics",
      action: "analyze_insights",
      params: {
        time_period: extractTimePeriod(userQuery) || "30d"
      },
      post_process: "full_report"
    }
  }];
}

// TICKET OPERATION → Direct action
if (intent.intent_category === "ticket_operation") {
  // Extract ticket ID, action type, etc.
  return [{
    json: {
      route: "ticket_action",
      action: extractAction(userQuery),
      params: extractParams(userQuery)
    }
  }];
}

// SEARCH QUERY → Filter and list
if (intent.intent_category === "search_query") {
  return [{
    json: {
      route: "search",
      action: "search_tickets",
      params: extractSearchParams(userQuery)
    }
  }];
}
```

---

### **Step 4: Post-Processing for Simple Queries**

```javascript
// Node: "Process Simple Workload"
// (Only runs for workload_query intent)

const tickets = $json.tickets;

// Group by assignee
const workload = {};
tickets.forEach(ticket => {
  const assignee = ticket.assignee_user?.email || "Unassigned";
  workload[assignee] = (workload[assignee] || 0) + 1;
});

// Sort by count
const sorted = Object.entries(workload)
  .sort(([,a], [,b]) => b - a)
  .map(([email, count]) => ({
    assignee: email,
    open_tickets: count
  }));

return [{
  json: {
    workload_summary: sorted,
    total_tickets: tickets.length,
    formatted_response: formatWorkloadList(sorted)
  }
}];

function formatWorkloadList(data) {
  return `📊 Current Workload:\n` +
    data.map(d => `• ${d.assignee}: ${d.open_tickets} open tickets`).join('\n');
}
```

---

## 🎯 WHY THIS SOLVES YOUR PROBLEM

### **Before (Current Issue)**
```
User: "who is working on most tickets?"
    ↓
AI Agent: Matches to analyze_insights (wrong!)
    ↓
Result: 2000-line report ❌
```

### **After (Hybrid Approach)**
```
User: "who is working on most tickets?"
    ↓
Intent Classifier: "workload_query" (current state)
    ↓
Deterministic Router: list_tickets + group_by
    ↓
Result: Simple list ✅
```

---

## 📊 COMPARISON: Hard-Code vs AI vs Hybrid

| Aspect | Hard-Code Logic | Pure AI Agent | Hybrid |
|--------|-----------------|---------------|--------|
| **Flexibility** | ❌ Low | ✅ High | ✅ High |
| **Accuracy** | ✅ 100% | ⚠️ 95% | ✅ 98% |
| **Maintenance** | ⚠️ Hard | ✅ Easy | ⚠️ Medium |
| **Speed** | ✅ Fast | ⚠️ Slow | ⚠️ Medium |
| **Natural Language** | ❌ Poor | ✅ Good | ✅ Good |
| **Predictability** | ✅ Perfect | ❌ Variable | ✅ Good |
| **Can handle edge cases** | ❌ No | ✅ Yes | ✅ Yes |

**Verdict:** Hybrid gives you AI flexibility with deterministic control

---

## 🚧 YOUR CONCERN: "Too Much Hard-Coding"

### **The Misconception**

You're worried about:
> "Are we building more hard-coded logic based on defined Slack user intent?"

**The Truth:**
- ✅ Intent classification = AI (flexible, natural language)
- ✅ Routing logic = Deterministic (predictable, testable)
- ✅ Parameter extraction = AI (flexible)
- ✅ Execution = Deterministic (reliable)

**You're NOT hard-coding user intent!**

You're **teaching the AI to classify intent**, then **routing reliably**.

---

## 🎓 THE KEY INSIGHT

### **Hard-Coding the WRONG Thing**

❌ **BAD Hard-Coding:**
```javascript
if (message.includes("who is working")) {
  return list_tickets_by_assignee();
}
if (message.includes("analyze performance")) {
  return analyze_insights();
}
```
This breaks with variations: "who's got the most tickets?", "workload distribution", etc.

---

### **Hard-Coding the RIGHT Thing**

✅ **GOOD Hard-Coding:**
```javascript
// Let AI classify intent
const intent = await classifyIntent(message);

// Then route deterministically
if (intent.category === "workload_query") {
  return simple_workload_summary();
}
if (intent.category === "trend_analysis") {
  return deep_analytics();
}
```
This works with ANY phrasing because AI handles natural language.

---

## 🎯 RECOMMENDED IMPLEMENTATION

### **Phase 1: Add Intent Classification (2 hours)**

1. Create intent classification prompt
2. Add Intent Classifier node (OpenAI HTTP Request)
3. Define 4-5 intent categories
4. Test with various phrasings

### **Phase 2: Build Deterministic Router (1 hour)**

1. Create Intent Router node (JavaScript)
2. Map intents to actions
3. Add validation logic
4. Handle edge cases

### **Phase 3: Add Simple Post-Processing (1 hour)**

1. Create post-processor for workload queries
2. Add formatters for common outputs
3. Test end-to-end

**Total Time: 4 hours**

---

## 🎊 THE BOTTOM LINE

### **Your Fear:**
> "We're hard-coding too much, losing AI flexibility"

### **The Reality:**
> "You're building a SMART router that uses AI where it excels (understanding natural language) and deterministic logic where YOU excel (reliable execution)"

### **The Result:**
```
User asks: "who is working on the most tickets?"
AI thinks: "This is a workload query about current state"
System routes: To simple list (not analytics)
User gets: Exactly what they wanted ✅
```

---

## 💡 NEXT STEPS

**Option 1: Quick Fix (30 min)**
- Clarify analyze_insights description
- Remove "assignee performance" mention
- Add note: "For HISTORICAL trend analysis only"

**Option 2: Better Fix (2 hours)**
- Add get_current_workload function
- Specific description: "Get current open ticket count by assignee"
- Keep analyze_insights for deep analysis

**Option 3: Best Fix (4 hours) ⭐**
- Implement intent classification layer
- Deterministic routing
- Maintain AI flexibility with predictable results

**Recommendation:** Option 3 - It solves the root cause!

---

**Want me to write the intent classification implementation?**
