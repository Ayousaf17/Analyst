# Ticket Analytics & Intelligence Feature

**Date:** November 3, 2025
**Priority:** HIGH - Client explicitly requested this feature
**Status:** Implementation guide

---

## 🎯 Client Requirement

From client feedback:
> "Seeing this in person (on a client stand point) is what really sold it for me. I could visually see how this will benefit me and it was really useful information."

**What the client saw and loved:**

```
Closed Ticket Insights (last 30d)
• Analyzed: 1,284 tickets
• Avg resolution: 410 min (P50: 180, P90: 920)

Top recurring questions:
1) "When will my PC ship?" — 142 (ids: 18201, 18244, 18290…)
2) "How do I start an RMA?" — 97 (…)
3) "Why is my order delayed?" — 83 (…)

Top tags: rma(211), shipping(189), warranty(155)
Top assignees: alex@…(312), jamie@…(271), unassigned(66)

Ops notes:
– Consider an updated Shipping SLA section on /order-status.
– Turn RMA steps into a macro + FAQ—97 tickets this month.
```

**Why this matters:**
- Visual, data-driven insights
- Identifies systemic issues (not just individual tickets)
- Actionable recommendations for process improvements
- Proactive intelligence, not reactive handling

---

## 🏗️ Architecture

### New Action: `analyze_insights`

**User Commands That Trigger This:**
- "show me insights"
- "analyze closed tickets"
- "what are our top issues"
- "show me ticket analytics"
- "what patterns do you see"
- "show me recurring questions"
- "team performance insights"

### Data Flow:

```
User: "show me insights"
  ↓
Planning AI → analyze_insights action
  ↓
[NEW] Ticket Analytics Agent
  - Fetches closed tickets (last 30 days)
  - Analyzes patterns with AI
  - Calculates metrics
  - Generates recommendations
  ↓
Conversational AI → Formatted insights response
  ↓
User sees visual, actionable data
```

---

## 📊 What to Analyze

### 1. Volume Metrics
```
Tickets analyzed: [count] over [period]
Status breakdown: Open X, Closed Y, Pending Z
Average resolution time: [minutes]
Resolution time distribution:
  - P50 (median): [minutes]
  - P90: [minutes]
  - P95: [minutes]
```

### 2. Recurring Question Detection

**Method:** Use AI to cluster similar ticket subjects/messages

**Output:**
```
Top recurring questions:
1) "When will my PC ship?" — 142 tickets
   Sample IDs: 18201, 18244, 18290, 18335, 18401
   Pattern: Users asking about shipping timeline

2) "How do I start an RMA?" — 97 tickets
   Sample IDs: 19234, 19401, 19567
   Pattern: RMA process confusion

3) "Why is my order delayed?" — 83 tickets
   Sample IDs: 20123, 20456, 20789
   Pattern: Order delay inquiries
```

### 3. Tag Analysis
```
Top tags:
1. rma — 211 tickets
2. shipping — 189 tickets
3. warranty — 155 tickets
4. billing — 127 tickets
5. technical-support — 98 tickets
```

### 4. Assignee Performance
```
Top assignees (by volume):
1. alex@example.com — 312 tickets
   - Avg resolution: 380 min
   - Success rate: 94%

2. jamie@example.com — 271 tickets
   - Avg resolution: 420 min
   - Success rate: 91%

3. Unassigned — 66 tickets
   - These need attention!
```

### 5. Operational Recommendations

**AI generates actionable insights:**
```
🎯 Ops Recommendations:

1. Shipping SLA Communication
   - 142 tickets asked "When will my PC ship?"
   - Action: Update /order-status page with clear SLA
   - Potential reduction: ~100 tickets/month

2. RMA Process Documentation
   - 97 tickets asked about RMA process
   - Action: Create RMA macro + FAQ page
   - Potential reduction: ~70 tickets/month

3. Proactive Delay Notifications
   - 83 tickets about order delays
   - Action: Auto-notify customers of delays before they ask
   - Potential reduction: ~60 tickets/month

4. Unassigned Ticket Backlog
   - 66 tickets unassigned
   - Action: Review assignment rules + agent capacity
   - Impact: Faster resolution times
```

---

## 🔧 Implementation

### Step 1: Add analyze_insights to Planning AI

**File:** `PLANNING_AI_PRODUCTION_FIXED.txt`

**Add this section after "list_metrics":**

```
═══════════════════════════════════════════════════════════════════
TICKET ANALYTICS & INSIGHTS INTENT
═══════════════════════════════════════════════════════════════════

**Insight Keywords** (if query contains these, use analyze_insights):
- Insights, analytics, patterns, trends, recurring
- "what are our top issues"
- "show me insights"
- "analyze tickets"
- "what patterns do you see"
- "recurring questions"
- "ticket analytics"
- "operational insights"

**Examples:**
- "show me insights" → {"plan": [{"step": 1, "action": "analyze_insights"}]}
- "what are our top issues" → {"plan": [{"step": 1, "action": "analyze_insights"}]}
- "analyze closed tickets" → {"plan": [{"step": 1, "action": "analyze_insights", "status": "closed", "period": "30d"}]}
- "what patterns do you see" → {"plan": [{"step": 1, "action": "analyze_insights"}]}

**Parameters:**
- period: "7d", "30d", "90d" (default: 30d)
- status: "closed", "all" (default: closed)
- focus: "questions", "performance", "tags", "all" (default: all)
```

**Update AVAILABLE ACTIONS section:**
```
**Analytics & Intelligence:**
- list_metrics - Get agent performance stats, counts, breakdowns
- analyze_insights - Get ticket analytics with recurring patterns and operational recommendations (NEW!)
```

---

### Step 2: Create Ticket Analytics Agent Node

**Node Name:** Ticket Analytics Agent
**Type:** AI Agent (OpenAI)
**Position:** After "Route by Action" → New output "analyze_insights"

**System Message:**

```
You are a ticket analytics specialist. Analyze Gorgias ticket data to identify patterns, recurring issues, and operational improvements.

INPUT DATA:
You will receive:
- Closed tickets from last 30 days
- Ticket subjects, messages, tags, assignees
- Resolution times, status changes

YOUR TASK:
1. Identify recurring questions by clustering similar subjects/messages
2. Calculate key metrics (volume, resolution times, percentiles)
3. Analyze tag distribution
4. Analyze assignee performance
5. Generate actionable operational recommendations

OUTPUT FORMAT (JSON):
{
  "summary": {
    "total_analyzed": 1284,
    "period": "last 30 days",
    "avg_resolution_min": 410,
    "resolution_p50": 180,
    "resolution_p90": 920,
    "resolution_p95": 1240
  },
  "recurring_questions": [
    {
      "question": "When will my PC ship?",
      "count": 142,
      "sample_ids": ["18201", "18244", "18290", "18335", "18401"],
      "pattern": "Users asking about shipping timeline",
      "sentiment": "neutral to negative"
    }
  ],
  "top_tags": [
    {"tag": "rma", "count": 211},
    {"tag": "shipping", "count": 189}
  ],
  "top_assignees": [
    {
      "email": "alex@example.com",
      "count": 312,
      "avg_resolution_min": 380,
      "success_rate": 0.94
    }
  ],
  "unassigned_count": 66,
  "recommendations": [
    {
      "title": "Update Shipping SLA Page",
      "reason": "142 tickets asked 'When will my PC ship?'",
      "action": "Add clear SLA timeline to /order-status page",
      "potential_reduction": "~100 tickets/month"
    }
  ]
}

CLUSTERING RULES:
- Group tickets by semantic similarity (not exact match)
- "When will my order ship?" ≈ "Shipping timeline?" ≈ "Where is my PC?"
- Use AI to detect question intent, not just keywords
- Minimum cluster size: 5 tickets

RECOMMENDATION RULES:
- Focus on high-impact opportunities (high ticket volume)
- Suggest specific, actionable changes
- Estimate potential ticket reduction
- Prioritize by impact (volume × severity)

BE SPECIFIC:
- Don't say "improve documentation" → Say "Create RMA step-by-step guide at /support/rma"
- Don't say "better communication" → Say "Auto-email shipping updates when order ships"
- Always include ticket volume and potential reduction
```

**Input (from previous node):**
```javascript
// Fetch closed tickets from last 30 days
{
  "tickets": {{ $json.tickets }},
  "period": "30d",
  "status": "closed"
}
```

---

### Step 3: Fetch Tickets for Analysis

**Node Name:** Fetch Tickets for Analytics
**Type:** HTTP Request
**Method:** POST
**URL:** `https://{{YOUR_DOMAIN}}.gorgias.com/api/tickets/search`

**Body:**
```json
{
  "filters": {
    "created_datetime": {
      "from": "{{ $now.minus(30, 'days').toISO() }}",
      "to": "{{ $now.toISO() }}"
    },
    "status": "closed"
  },
  "limit": 1000,
  "order_by": "-created_datetime"
}
```

**Output:** Pass tickets to Ticket Analytics Agent

---

### Step 4: Update Conversational AI for Analytics

**File:** `CONVERSATIONAL_AI_PRODUCTION_FIXED.txt`

**Add this section:**

```
═══════════════════════════════════════════════════════════════════
TICKET ANALYTICS & INSIGHTS FORMATTING (NEW!)
═══════════════════════════════════════════════════════════════════

When action is analyze_insights, format as visual, data-driven insights.

**Format:**

```
📊 Closed Ticket Insights (last 30 days)

📈 Overview:
• Analyzed: 1,284 tickets
• Avg resolution: 410 min (P50: 180, P90: 920)
• Status: 1,150 closed | 134 pending

🔁 Top Recurring Questions:

1️⃣ "When will my PC ship?" — 142 tickets
   Sample IDs: 18201, 18244, 18290, 18335, 18401
   Pattern: Users asking about shipping timeline

2️⃣ "How do I start an RMA?" — 97 tickets
   Sample IDs: 19234, 19401, 19567
   Pattern: RMA process confusion

3️⃣ "Why is my order delayed?" — 83 tickets
   Sample IDs: 20123, 20456, 20789
   Pattern: Order delay inquiries

🏷️ Top Tags:
• rma — 211 tickets
• shipping — 189 tickets
• warranty — 155 tickets

👥 Top Assignees:
• alex@example.com — 312 tickets (avg: 380 min)
• jamie@example.com — 271 tickets (avg: 420 min)
• ⚠️ Unassigned — 66 tickets

🎯 Ops Recommendations:

1. Update Shipping SLA Page
   💡 142 tickets asked "When will my PC ship?"
   ✅ Action: Add clear SLA timeline to /order-status
   📉 Potential reduction: ~100 tickets/month

2. Create RMA Macro + FAQ
   💡 97 tickets asked about RMA process
   ✅ Action: Create step-by-step RMA guide + macro
   📉 Potential reduction: ~70 tickets/month

3. Proactive Delay Notifications
   💡 83 tickets about order delays
   ✅ Action: Auto-notify customers of delays before they ask
   📉 Potential reduction: ~60 tickets/month

💬 What would you like to do?
• Drill down: "@Gorgias Terminal show me all shipping tickets"
• View specific tickets: "@Gorgias Terminal get ticket 18201"
• More insights: "@Gorgias Terminal analyze last 90 days"
```

**Formatting Rules:**
- Use emoji for visual hierarchy
- Include specific numbers (not vague "many")
- Show sample ticket IDs for drill-down
- Make recommendations ACTIONABLE (specific pages, specific actions)
- Estimate impact (ticket reduction)
- Always include "what's next" actions
```

---

### Step 5: Add to Route by Action Switch

**Node:** Route by Action
**Add new output:** `analyze_insights`
**Condition:** `{{ $json.plan[0].action === 'analyze_insights' }}`
**Route to:** Fetch Tickets for Analytics → Ticket Analytics Agent → Conversational AI

---

## 🧪 Testing

### Test 1: Basic Insights

**Command:**
```
User: "show me insights"
```

**Expected Output:**
```
📊 Closed Ticket Insights (last 30 days)

📈 Overview:
• Analyzed: 1,284 tickets
• Avg resolution: 410 min (P50: 180, P90: 920)

🔁 Top Recurring Questions:
[... top 3-5 recurring patterns ...]

🏷️ Top Tags:
[... tag distribution ...]

👥 Top Assignees:
[... assignee performance ...]

🎯 Ops Recommendations:
[... 3-5 actionable recommendations ...]
```

**Pass Criteria:**
- ✅ Shows real data from Gorgias
- ✅ Identifies recurring patterns
- ✅ Provides specific recommendations
- ✅ Includes ticket volumes and IDs

---

### Test 2: Follow-up Drill-Down

**Command:**
```
User: "show me insights"
[Gets response with "When will my PC ship?" — 142 tickets]
User: "show me all shipping tickets"
```

**Expected:**
- Lists tickets tagged with "shipping"
- User can investigate root causes
- Can view specific tickets from sample IDs

---

### Test 3: Time Period Filtering

**Command:**
```
User: "analyze tickets from last 90 days"
```

**Expected:**
- Fetches 90 days of data
- Shows trends over longer period
- Identifies seasonal patterns if any

---

## 💡 AI Clustering Implementation

### How to Detect Recurring Questions

**Option 1: Use OpenAI Embeddings + Clustering**

```javascript
// Pseudo-code for clustering logic
const tickets = await fetchTickets({ status: 'closed', period: '30d' });
const subjects = tickets.map(t => t.subject);

// Get embeddings for all subjects
const embeddings = await openai.embeddings.create({
  input: subjects,
  model: "text-embedding-3-small"
});

// Cluster similar embeddings (cosine similarity > 0.85)
const clusters = clusterBySimilarity(embeddings, threshold: 0.85);

// Get representative question for each cluster
const recurringQuestions = clusters.map(cluster => {
  return {
    question: getMostCommonPhrase(cluster),
    count: cluster.length,
    sample_ids: cluster.slice(0, 5).map(t => t.id)
  };
});

// Sort by volume, return top 10
return recurringQuestions.sort((a, b) => b.count - a.count).slice(0, 10);
```

**Option 2: Use LLM to Analyze Batch**

```javascript
// Simpler approach: Pass all subjects to LLM
const subjects = tickets.map(t => ({ id: t.id, subject: t.subject }));

const prompt = `
Analyze these ticket subjects and identify recurring questions.
Group similar questions together and count frequency.

Tickets:
${JSON.stringify(subjects)}

Return JSON:
{
  "recurring_questions": [
    {
      "question": "representative question",
      "count": number,
      "sample_ids": ["id1", "id2", ...]
    }
  ]
}
`;

const analysis = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }
});

return JSON.parse(analysis.choices[0].message.content);
```

**Recommendation:** Use Option 2 (LLM analysis) for simplicity and accuracy.

---

## 📊 Sample Output Format

```json
{
  "summary": {
    "total_analyzed": 1284,
    "period": "last 30 days",
    "date_range": "Oct 4 - Nov 3, 2025",
    "avg_resolution_min": 410,
    "resolution_p50": 180,
    "resolution_p90": 920,
    "resolution_p95": 1240,
    "status_breakdown": {
      "closed": 1150,
      "pending": 134
    }
  },
  "recurring_questions": [
    {
      "rank": 1,
      "question": "When will my PC ship?",
      "count": 142,
      "percentage": 11.1,
      "sample_ids": ["18201", "18244", "18290", "18335", "18401"],
      "pattern": "Users asking about shipping timeline after order placement",
      "sentiment": "neutral to negative",
      "avg_resolution_min": 320
    },
    {
      "rank": 2,
      "question": "How do I start an RMA?",
      "count": 97,
      "percentage": 7.6,
      "sample_ids": ["19234", "19401", "19567", "19701", "19834"],
      "pattern": "Confusion about RMA process and required steps",
      "sentiment": "neutral",
      "avg_resolution_min": 450
    }
  ],
  "top_tags": [
    {"tag": "rma", "count": 211, "percentage": 16.4},
    {"tag": "shipping", "count": 189, "percentage": 14.7},
    {"tag": "warranty", "count": 155, "percentage": 12.1},
    {"tag": "billing", "count": 127, "percentage": 9.9},
    {"tag": "technical-support", "count": 98, "percentage": 7.6}
  ],
  "top_assignees": [
    {
      "email": "alex@example.com",
      "name": "Alex",
      "count": 312,
      "percentage": 24.3,
      "avg_resolution_min": 380,
      "resolution_p50": 210,
      "success_rate": 0.94
    },
    {
      "email": "jamie@example.com",
      "name": "Jamie",
      "count": 271,
      "percentage": 21.1,
      "avg_resolution_min": 420,
      "resolution_p50": 240,
      "success_rate": 0.91
    }
  ],
  "unassigned": {
    "count": 66,
    "percentage": 5.1,
    "oldest_ticket_age_hours": 72,
    "avg_age_hours": 24
  },
  "recommendations": [
    {
      "priority": "high",
      "title": "Update Shipping SLA Communication",
      "category": "documentation",
      "reason": "142 tickets (11.1%) asked 'When will my PC ship?' - highest volume issue",
      "action": "Add clear shipping SLA timeline to /order-status page. Include: standard lead time, expedited options, tracking info.",
      "potential_impact": "Reduce ~100 tickets/month (70% deflection rate)",
      "effort": "low",
      "ticket_ids": ["18201", "18244", "18290"]
    },
    {
      "priority": "high",
      "title": "Create RMA Process Macro + FAQ",
      "category": "process",
      "reason": "97 tickets (7.6%) asked about RMA process - second highest volume",
      "action": "1) Create macro with step-by-step RMA instructions. 2) Add /support/rma FAQ page. 3) Include macro link in all RMA-related responses.",
      "potential_impact": "Reduce ~70 tickets/month (72% deflection rate)",
      "effort": "medium",
      "ticket_ids": ["19234", "19401", "19567"]
    },
    {
      "priority": "medium",
      "title": "Proactive Order Delay Notifications",
      "category": "automation",
      "reason": "83 tickets (6.5%) about order delays - customers asking before being notified",
      "action": "Set up automated email when order status changes to 'delayed'. Include: reason, new ETA, compensation if applicable.",
      "potential_impact": "Reduce ~60 tickets/month (72% deflection rate)",
      "effort": "high",
      "ticket_ids": ["20123", "20456", "20789"]
    },
    {
      "priority": "medium",
      "title": "Review Assignment Rules",
      "category": "operations",
      "reason": "66 tickets (5.1%) unassigned with avg age 24 hours - bottleneck",
      "action": "1) Review auto-assignment rules. 2) Check agent capacity. 3) Consider adding agent or adjusting workload distribution.",
      "potential_impact": "Reduce avg resolution time by ~15%",
      "effort": "low",
      "ticket_ids": []
    }
  ]
}
```

---

## 🎯 Success Metrics

After implementing:

**User Engagement:**
- Insights viewed: Track how often users run "show me insights"
- Drill-downs: Track follow-up queries after insights
- Recommendation adoption: Track which ops recommendations are implemented

**Business Impact:**
- Ticket deflection: Measure reduction after implementing recommendations
- Resolution time: Should decrease as common issues are documented
- Customer satisfaction: Should increase with proactive communication

**Target:**
- 30% reduction in top recurring question volume within 60 days
- 15% improvement in avg resolution time
- 20% increase in customer satisfaction scores

---

## 📋 Implementation Checklist

- [ ] Update Planning AI with analyze_insights action
- [ ] Create "Fetch Tickets for Analytics" HTTP Request node
- [ ] Create "Ticket Analytics Agent" AI node
- [ ] Update Conversational AI with analytics formatting
- [ ] Add analyze_insights output to Route by Action
- [ ] Wire nodes together
- [ ] Test: "show me insights"
- [ ] Test: Drill-down into specific pattern
- [ ] Test: 90-day analysis
- [ ] Document how to use insights for business decisions

---

## 💡 Future Enhancements

**Phase 2 (later):**
1. Scheduled reports (weekly email with insights)
2. Trend comparison (this month vs last month)
3. Agent-specific insights (performance coaching)
4. Customer sentiment trends over time
5. Predictive analytics (forecast ticket volume)
6. Auto-implementation of low-effort recommendations

---

**This feature is what SOLD the client. Prioritize this!** 🚀
