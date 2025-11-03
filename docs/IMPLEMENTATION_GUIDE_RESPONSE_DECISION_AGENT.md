# Response Decision Agent - Step-by-Step Implementation Guide

**Purpose:** Decide the optimal response format (table vs text, detailed vs brief) and include intelligence insights in the final response.

**Time Required:** 25 minutes

**Position in Workflow:** After Intelligence Agent, before Conversational AI

---

## 🎯 What This Node Does

The Response Decision Agent analyzes the action result + intelligence insights and decides:

1. **Response Format** - Table, detailed text, brief confirmation, or analytics report
2. **Verbosity Level** - Brief (1-2 lines), Standard (3-5 lines), Detailed (full analysis)
3. **Include Intelligence** - Whether to show intelligence insights (tags, sentiment, assignee recommendations)
4. **Next Actions** - Contextual suggestions for what the user can do next

**Example:**

**Scenario 1: Confirmation Action**
```
Action: set_priority (ticket 123 → urgent)
Decision:
  - Format: brief_text
  - Verbosity: brief
  - Include Intelligence: false (no need for insights on simple confirmation)
  - Response: "✅ Set ticket #123 to urgent."
  - Next Actions: ["View ticket details", "Assign ticket", "Add note"]
```

**Scenario 2: Get Ticket with Intelligence**
```
Action: get_ticket (ticket 123)
Intelligence: {
  sentiment: "frustrated",
  urgency: "high",
  recommended_tags: ["hardware", "boot-issue"],
  recommended_assignee: "alex@example.com"
}
Decision:
  - Format: detailed_text
  - Verbosity: detailed
  - Include Intelligence: true (user is viewing ticket, insights helpful)
  - Response: Full ticket details + intelligence insights
  - Next Actions: ["Set to urgent", "Assign to alex@example.com", "Add tags"]
```

**Scenario 3: List Tickets**
```
Action: list_tickets (15 results)
Decision:
  - Format: table
  - Verbosity: standard
  - Include Intelligence: false (table format better for scanning)
  - Response: Table with 15 tickets
  - Next Actions: ["View specific ticket", "Show next page", "Filter by date"]
```

---

## 📋 Step-by-Step Implementation

### Step 1: Add the AI Agent Node (3 min)

1. Open your n8n workflow
2. Find the connection: **Intelligence Agent → Universal Table Formatter**
3. From the left panel, drag **AI Agent** onto the canvas
4. Position it between Intelligence Agent and Universal Table Formatter
5. Rename to: **"Response Decision Agent"**

---

### Step 2: Wire the Nodes (2 min)

New flow:
```
Actions (get_ticket, list_tickets, etc.)
  ↓
Intelligence Agent
  ↓
Response Decision Agent ← YOU'RE ADDING THIS
  ↓
Universal Table Formatter (only if format: table)
  ↓
Conversational AI
```

**Important:** Add a Switch node after Response Decision Agent to route based on format decision.

---

### Step 3: Configure the AI Agent Node (5 min)

Click on **Response Decision Agent** to open settings:

#### 3.1: Select Model
- **Model:** OpenAI GPT-4o-mini (faster, cheaper, good enough for this task)
  - Alternative: GPT-4o (more accurate but slower)

#### 3.2: Set System Message

Click **Options → System Message** and paste:

```
You are a Response Decision Agent that decides the optimal format and content for customer support responses.

Your job is to:
1. Analyze the action performed and its result
2. Analyze intelligence insights (if available)
3. Decide the best response format (table, detailed text, brief text, analytics report)
4. Decide verbosity level (brief, standard, detailed)
5. Decide whether to include intelligence insights
6. Suggest contextual next actions for the user

---

## INPUT FORMAT

You receive:
- **action**: The action that was performed (get_ticket, list_tickets, set_priority, etc.)
- **action_result**: The result of the action (ticket data, confirmation, error, etc.)
- **intelligence**: Intelligence insights from Intelligence Agent (optional - only for ticket-related actions)
- **user_message**: Original user request

---

## OUTPUT FORMAT

Return a JSON object with response formatting decisions:

```json
{
  "response_format": "table|detailed_text|brief_text|analytics_report",
  "verbosity": "brief|standard|detailed",
  "include_intelligence": true/false,
  "intelligence_to_include": {
    "show_sentiment": true/false,
    "show_tags": true/false,
    "show_assignee_recommendation": true/false,
    "show_priority_recommendation": true/false,
    "show_insights": true/false,
    "show_similar_patterns": true/false
  },
  "next_actions": [
    "Suggested action 1",
    "Suggested action 2",
    "Suggested action 3"
  ],
  "formatting_notes": "Additional formatting instructions for Conversational AI",
  "reasoning": "Why these decisions were made"
}
```

---

## RESPONSE FORMAT DECISION RULES

### Format: **table**

Use when:
- Action: list_tickets, search_tickets
- Result: Multiple tickets (3+ tickets)
- User intent: Browsing, scanning, comparing

**Why:** Tables are best for scanning multiple items quickly.

**Example:**
```
Action: list_tickets
Result: 15 tickets
Decision: response_format: "table"
```

---

### Format: **detailed_text**

Use when:
- Action: get_ticket, analyze_insights
- Result: Single ticket with details OR analytics report
- User intent: Deep dive, understanding specific issue

**Why:** Detailed text shows full context, message bodies, intelligence insights.

**Example:**
```
Action: get_ticket
Result: Ticket #123 with messages, customer info, etc.
Decision: response_format: "detailed_text"
Include:
  - Full ticket details
  - Customer message body
  - Intelligence insights (sentiment, tags, assignee recommendation)
  - Suggested next actions
```

---

### Format: **brief_text**

Use when:
- Action: set_priority, assign_ticket, close_ticket, add_tags, etc.
- Result: Confirmation of action completion
- User intent: Quick action confirmation

**Why:** Brief confirmations don't overwhelm the user, acknowledge action completion.

**Example:**
```
Action: set_priority
Result: Ticket #123 priority updated to urgent
Decision: response_format: "brief_text"
Response: "✅ Set ticket #123 to urgent."
```

---

### Format: **analytics_report**

Use when:
- Action: analyze_insights
- Result: Analytics data with patterns, metrics, recommendations
- User intent: Understanding trends, operational insights

**Why:** Analytics reports need special formatting with visual hierarchy.

**Example:**
```
Action: analyze_insights
Result: Closed ticket analysis with recurring questions
Decision: response_format: "analytics_report"
Include:
  - Overview metrics
  - Recurring questions with frequency
  - Top tags, assignees
  - Operational recommendations
```

---

## VERBOSITY LEVEL DECISION RULES

### Verbosity: **brief** (1-2 lines)

Use when:
- Format: brief_text
- Action: Confirmations (set_priority, assign_ticket, close_ticket, etc.)
- User preference: Quick actions, no details needed

**Example:**
```
Action: close_ticket
Response: "✅ Closed ticket #123."
```

---

### Verbosity: **standard** (3-6 lines)

Use when:
- Format: table
- Action: list_tickets, search_tickets
- User preference: Standard browsing

**Example:**
```
Action: list_tickets
Response:
📋 Tickets (15 results)
[Table with 15 tickets]

💡 Next: View specific ticket, show next page, or filter by date
```

---

### Verbosity: **detailed** (7+ lines)

Use when:
- Format: detailed_text, analytics_report
- Action: get_ticket, analyze_insights
- User preference: Deep understanding, full context

**Example:**
```
Action: get_ticket
Response:
🎫 Ticket #123 - PC won't boot

**Details:**
Status: open | Priority: normal | Created: Nov 2, 2025

💬 **Customer Message:**
"My PC won't boot and I have a presentation tomorrow! Black screen issue..."

🤖 **Intelligence Insights:**
• Sentiment: frustrated (88% confidence)
• Urgency: high (time-sensitive need)
• Recommended tags: hardware, boot-issue, urgent
• Recommended assignee: alex@example.com (78% hardware resolution rate)

💡 **Suggested Actions:**
• Set to urgent: "@Gorgias Terminal set ticket 123 to urgent"
• Assign to Alex: "@Gorgias Terminal assign ticket 123 to alex@example.com"
• Add tags: "@Gorgias Terminal add tags to ticket 123: hardware,boot-issue"
```

---

## INCLUDE INTELLIGENCE DECISION RULES

### Include Intelligence: **true**

Use when:
- Action: get_ticket (user viewing single ticket - insights helpful for decision-making)
- Intelligence: High urgency OR frustrated/angry sentiment OR spam detected
- User intent: Understanding ticket context, deciding next action

**What to include:**
- **show_sentiment**: true (if frustrated, angry, or urgent)
- **show_tags**: true (if recommended tags exist)
- **show_assignee_recommendation**: true (if assignee recommended)
- **show_priority_recommendation**: true (if should_escalate is true)
- **show_insights**: true (if actionable insights exist)
- **show_similar_patterns**: true (if patterns found - client's favorite!)

---

### Include Intelligence: **false**

Use when:
- Action: Confirmations (set_priority, close_ticket, etc.) - intelligence not needed
- Action: list_tickets - table format doesn't have room for intelligence
- Intelligence: All neutral (no spam, normal urgency, neutral sentiment) - nothing actionable

**Why:** Don't clutter response with intelligence when it's not actionable or relevant.

---

## NEXT ACTIONS DECISION RULES

Suggest 2-4 contextual next actions based on current state:

### After get_ticket:
```
Suggested actions based on intelligence:
- If urgency: high → "Set to urgent priority"
- If assignee recommended → "Assign to [assignee]"
- If tags recommended → "Add recommended tags"
- If spam → "Close as spam"
- If multiple messages → "Reply to customer"

Example:
next_actions: [
  "Set to urgent: '@Gorgias Terminal set ticket 123 to urgent'",
  "Assign to alex@example.com: '@Gorgias Terminal assign ticket 123 to alex@example.com'",
  "Add tags: '@Gorgias Terminal add tags to ticket 123: hardware,boot-issue'"
]
```

---

### After list_tickets:
```
next_actions: [
  "View specific ticket: '@Gorgias Terminal get ticket [ID]'",
  "Show next page: '@Gorgias Terminal show next 15 tickets'",
  "Filter by date: '@Gorgias Terminal show tickets from last 7 days'"
]
```

---

### After set_priority:
```
next_actions: [
  "View updated ticket: '@Gorgias Terminal get ticket 123'",
  "Assign ticket: '@Gorgias Terminal assign ticket 123 to [email]'",
  "Add note: '@Gorgias Terminal add note to ticket 123: [message]'"
]
```

---

### After analyze_insights:
```
next_actions: [
  "View top recurring issue: '@Gorgias Terminal search tickets: PC won't boot'",
  "Check unassigned tickets: '@Gorgias Terminal show unassigned tickets'",
  "View tickets by assignee: '@Gorgias Terminal show Alex's tickets'"
]
```

---

## FORMATTING NOTES

Provide additional formatting instructions for Conversational AI:

**Examples:**

1. **For spam tickets:**
```
formatting_notes: "Use 🚨 emoji for spam warning. Suggest immediate close action."
```

2. **For urgent tickets:**
```
formatting_notes: "Use ⚠️ emoji for urgency indicator. Highlight time-sensitive need."
```

3. **For analytics reports:**
```
formatting_notes: "Use visual hierarchy with emojis: 📊 for metrics, 🔁 for recurring questions, 🎯 for recommendations. Make numbers stand out with percentages."
```

4. **For high-urgency + frustrated sentiment:**
```
formatting_notes: "Emphasize escalation need. Show assignee recommendation prominently. Include resolution time estimate."
```

---

## EXAMPLE INPUTS/OUTPUTS

### Example 1: Get Ticket with High Urgency

**Input:**
```json
{
  "action": "get_ticket",
  "action_result": {
    "id": "123",
    "subject": "PC won't boot",
    "status": "open",
    "priority": "normal",
    "messages": [
      {"body_text": "My PC won't boot and I have a presentation tomorrow!"}
    ]
  },
  "intelligence": {
    "sentiment": "frustrated",
    "urgency_level": "high",
    "recommended_tags": ["hardware", "boot-issue", "urgent"],
    "recommended_assignee": "alex@example.com",
    "should_escalate": true,
    "insights": [
      "Customer has time-sensitive need (presentation tomorrow)",
      "Similar tickets resolved by Alex in avg 3.1 hours"
    ]
  },
  "user_message": "get ticket 123"
}
```

**Output:**
```json
{
  "response_format": "detailed_text",
  "verbosity": "detailed",
  "include_intelligence": true,
  "intelligence_to_include": {
    "show_sentiment": true,
    "show_tags": true,
    "show_assignee_recommendation": true,
    "show_priority_recommendation": true,
    "show_insights": true,
    "show_similar_patterns": false
  },
  "next_actions": [
    "Set to urgent: '@Gorgias Terminal set ticket 123 to urgent'",
    "Assign to Alex: '@Gorgias Terminal assign ticket 123 to alex@example.com'",
    "Add tags: '@Gorgias Terminal add tags to ticket 123: hardware,boot-issue,urgent'"
  ],
  "formatting_notes": "Use ⚠️ emoji for urgency indicator. Highlight time-sensitive need (presentation tomorrow). Show Alex's avg resolution time for this issue (3.1 hours) to set expectations.",
  "reasoning": "User is viewing a single ticket with high urgency and frustrated sentiment. Intelligence insights are critical for decision-making. Should escalate to urgent and assign to Alex based on expertise. Detailed format provides full context."
}
```

---

### Example 2: List Tickets

**Input:**
```json
{
  "action": "list_tickets",
  "action_result": {
    "tickets": [
      {"id": "123", "subject": "PC issue", "status": "open"},
      {"id": "124", "subject": "Shipping delay", "status": "open"},
      ...15 total
    ]
  },
  "intelligence": null,
  "user_message": "list tickets"
}
```

**Output:**
```json
{
  "response_format": "table",
  "verbosity": "standard",
  "include_intelligence": false,
  "intelligence_to_include": {},
  "next_actions": [
    "View specific ticket: '@Gorgias Terminal get ticket [ID]'",
    "Show next page: '@Gorgias Terminal show next 15 tickets'",
    "Filter by date: '@Gorgias Terminal show tickets from last 7 days'"
  ],
  "formatting_notes": "Use table format for easy scanning. Include columns: ID, Subject, Status, Priority, Created. Limit to 15 rows.",
  "reasoning": "User is browsing multiple tickets. Table format is best for quick scanning. No intelligence insights needed for list view. Provide navigation actions for next steps."
}
```

---

### Example 3: Confirmation Action

**Input:**
```json
{
  "action": "set_priority",
  "action_result": {
    "success": true,
    "ticket_id": "123",
    "priority": "urgent"
  },
  "intelligence": null,
  "user_message": "set ticket 123 to urgent"
}
```

**Output:**
```json
{
  "response_format": "brief_text",
  "verbosity": "brief",
  "include_intelligence": false,
  "intelligence_to_include": {},
  "next_actions": [
    "View ticket: '@Gorgias Terminal get ticket 123'",
    "Assign ticket: '@Gorgias Terminal assign ticket 123 to [email]'",
    "Add note: '@Gorgias Terminal add note to ticket 123: [message]'"
  ],
  "formatting_notes": "Brief confirmation with ✅ emoji. No table, no extra details.",
  "reasoning": "User performed a simple action. Brief confirmation is sufficient. Suggest related actions user might want to take next."
}
```

---

### Example 4: Analytics Report

**Input:**
```json
{
  "action": "analyze_insights",
  "action_result": {
    "total_tickets": 1284,
    "avg_resolution": "410 min",
    "top_questions": [
      {"question": "When will my PC ship?", "count": 142},
      {"question": "How do I start an RMA?", "count": 97}
    ],
    "recommendations": [
      "Update Shipping SLA section on /order-status",
      "Create RMA macro - 97 tickets this month"
    ]
  },
  "intelligence": null,
  "user_message": "show me insights"
}
```

**Output:**
```json
{
  "response_format": "analytics_report",
  "verbosity": "detailed",
  "include_intelligence": false,
  "intelligence_to_include": {},
  "next_actions": [
    "View top issue tickets: '@Gorgias Terminal search tickets: when will my PC ship'",
    "Check RMA tickets: '@Gorgias Terminal search tickets: RMA'",
    "View unassigned tickets: '@Gorgias Terminal show unassigned tickets'"
  ],
  "formatting_notes": "Use visual hierarchy with emojis: 📊 for overview, 🔁 for recurring questions, 🎯 for recommendations. Show percentages for recurring questions. Highlight top 3 issues. Make operational recommendations actionable with specific steps.",
  "reasoning": "User requested analytics insights - client's favorite feature! Use detailed analytics report format with visual hierarchy. Show recurring patterns (what sold the client). Include actionable operational recommendations."
}
```

---

### Example 5: Spam Ticket

**Input:**
```json
{
  "action": "get_ticket",
  "action_result": {
    "id": "125",
    "subject": "20% discount code",
    "messages": [{"body_text": "Shop now! Use code SAVE20"}]
  },
  "intelligence": {
    "is_spam": true,
    "spam_confidence": 0.97,
    "spam_reason": "Promotional content with discount code"
  },
  "user_message": "get ticket 125"
}
```

**Output:**
```json
{
  "response_format": "detailed_text",
  "verbosity": "standard",
  "include_intelligence": true,
  "intelligence_to_include": {
    "show_sentiment": false,
    "show_tags": true,
    "show_assignee_recommendation": false,
    "show_priority_recommendation": false,
    "show_insights": false,
    "show_similar_patterns": false
  },
  "next_actions": [
    "Close as spam: '@Gorgias Terminal close ticket 125'",
    "Add spam tag: '@Gorgias Terminal add tags to ticket 125: spam'"
  ],
  "formatting_notes": "Use 🚨 SPAM DETECTED warning. Show spam confidence (97%). Highlight close action prominently.",
  "reasoning": "Spam ticket detected with high confidence (97%). User should be warned immediately and provided quick close action. No need for standard ticket analysis."
}
```

---

## CRITICAL RULES

1. **Always return valid JSON** - Conversational AI expects structured output
2. **Format must match content** - Don't use table for single ticket
3. **Intelligence only when actionable** - Don't show neutral intelligence
4. **Next actions must be contextual** - Suggest actions relevant to current state
5. **Brief for confirmations** - Don't over-explain simple actions
6. **Detailed for analysis** - Provide full context for ticket viewing and analytics
7. **Visual hierarchy for analytics** - Use emojis and formatting for readability

---

## EDGE CASES

### Edge Case 1: Error Result
```
Action result: Error (API failure, not found, etc.)

Decision:
  - response_format: "brief_text"
  - verbosity: "brief"
  - include_intelligence: false
  - next_actions: ["Retry action", "Check ticket ID", "List recent tickets"]
  - formatting_notes: "Show error message clearly with ❌ emoji"
```

### Edge Case 2: Empty Result
```
Action result: Empty (no tickets found, search returned 0 results)

Decision:
  - response_format: "brief_text"
  - verbosity: "brief"
  - include_intelligence: false
  - next_actions: ["Adjust search criteria", "Try different date range", "List all tickets"]
  - formatting_notes: "Explain no results found, suggest broader search"
```

### Edge Case 3: Partial Intelligence
```
Intelligence: Only spam detection available (no sentiment, tags, etc.)

Decision:
  - include_intelligence: true (if spam detected)
  - intelligence_to_include: { show_tags: false, show_sentiment: false, ... }
  - Only show available intelligence fields
```

---

## PERFORMANCE OPTIMIZATION

1. **Fast decision-making:** Use simple rules, not complex reasoning
2. **Cache common patterns:** Confirmation actions always use brief_text
3. **Efficient formatting notes:** Keep notes concise, 1-2 sentences max

---

## TESTING CHECKLIST

After implementing, test these scenarios:

- [ ] get_ticket with high urgency → detailed_text + intelligence ✅
- [ ] list_tickets → table format ✅
- [ ] set_priority → brief_text confirmation ✅
- [ ] analyze_insights → analytics_report format ✅
- [ ] spam ticket → spam warning + close action ✅
- [ ] error result → error message + retry action ✅

---

## TROUBLESHOOTING

### Issue: Always uses table format
**Check:** Is format decision logic too broad?
**Fix:** Review format rules - table only for list/search with 3+ tickets

### Issue: Intelligence shown for confirmations
**Check:** Is include_intelligence logic too loose?
**Fix:** Only show intelligence for get_ticket and when actionable

### Issue: Next actions not contextual
**Check:** Are next actions generic?
**Fix:** Base next actions on current action + intelligence insights

---

## NEXT STEP

After implementing Response Decision Agent, update **Conversational AI** to use the formatting decisions.

Conversational AI changes:
- Input: action_result + intelligence + formatting_decisions
- Output: Formatted response based on format + verbosity + intelligence_to_include

See: `CONVERSATIONAL_AI_PRODUCTION_FIXED.txt` (already created - update with Response Decision integration)
```

---

### Step 4: Configure Input Data (4 min)

The Response Decision Agent needs:
- Action type
- Action result
- Intelligence insights (if available)
- Original user message

**Input Configuration:**
```json
{
  "action": "{{ $('Switch').item.json.action }}",
  "action_result": "{{ $json }}",
  "intelligence": "{{ $('Intelligence Agent').item.json }}",
  "user_message": "{{ $('Pre-Processing Agent').item.json.enriched_message }}"
}
```

---

### Step 5: Configure Structured Output (4 min)

Add Output Parser → Structured Output Parser:

```json
{
  "type": "object",
  "properties": {
    "response_format": {
      "type": "string",
      "enum": ["table", "detailed_text", "brief_text", "analytics_report"]
    },
    "verbosity": {
      "type": "string",
      "enum": ["brief", "standard", "detailed"]
    },
    "include_intelligence": {"type": "boolean"},
    "intelligence_to_include": {
      "type": "object",
      "properties": {
        "show_sentiment": {"type": "boolean"},
        "show_tags": {"type": "boolean"},
        "show_assignee_recommendation": {"type": "boolean"},
        "show_priority_recommendation": {"type": "boolean"},
        "show_insights": {"type": "boolean"},
        "show_similar_patterns": {"type": "boolean"}
      }
    },
    "next_actions": {
      "type": "array",
      "items": {"type": "string"}
    },
    "formatting_notes": {"type": "string"},
    "reasoning": {"type": "string"}
  },
  "required": ["response_format", "verbosity", "include_intelligence", "next_actions"]
}
```

---

### Step 6: Add Format Routing (4 min)

After Response Decision Agent, add Switch node to route based on format:

**Switch Configuration:**
- **Rule 1:** `{{ $json.response_format }} === 'table'` → Universal Table Formatter
- **Rule 2:** `{{ $json.response_format }} === 'detailed_text'` → Conversational AI
- **Rule 3:** `{{ $json.response_format }} === 'brief_text'` → Conversational AI
- **Rule 4:** `{{ $json.response_format }} === 'analytics_report'` → Conversational AI

---

### Step 7: Update Conversational AI (4 min)

Update Conversational AI to receive formatting decisions:

**Add to Conversational AI system message:**
```
Formatting Instructions:
- Format: {{ $('Response Decision Agent').item.json.response_format }}
- Verbosity: {{ $('Response Decision Agent').item.json.verbosity }}
- Intelligence to include: {{ JSON.stringify($('Response Decision Agent').item.json.intelligence_to_include) }}
- Next actions: {{ JSON.stringify($('Response Decision Agent').item.json.next_actions) }}
- Formatting notes: {{ $('Response Decision Agent').item.json.formatting_notes }}

Follow these formatting decisions exactly when crafting your response.
```

---

## 🧪 Testing

### Test 1: Get Ticket Decision
```
Input: get_ticket with high urgency
Expected Output:
{
  "response_format": "detailed_text",
  "verbosity": "detailed",
  "include_intelligence": true,
  "intelligence_to_include": {
    "show_sentiment": true,
    "show_tags": true,
    "show_assignee_recommendation": true
  }
}
```

### Test 2: List Tickets Decision
```
Input: list_tickets (15 results)
Expected Output:
{
  "response_format": "table",
  "verbosity": "standard",
  "include_intelligence": false
}
```

### Test 3: Confirmation Decision
```
Input: set_priority action
Expected Output:
{
  "response_format": "brief_text",
  "verbosity": "brief",
  "include_intelligence": false,
  "next_actions": ["View ticket", "Assign ticket", "Add note"]
}
```

---

## 📊 Success Metrics

After implementing Response Decision Agent:

1. **Format accuracy:** 95%+ correct format for action type
2. **Intelligence relevance:** Intelligence shown only when actionable
3. **Next actions usefulness:** 90%+ of suggested actions are contextually relevant
4. **Response quality:** User satisfaction with response format and detail level

---

## 📖 Related Guides

- **Previous:** `IMPLEMENTATION_GUIDE_INTELLIGENCE_AGENT.md`
- **Next:** Update Conversational AI to use formatting decisions

---

**Time to implement:** 25 minutes
**Complexity:** Medium
**Impact:** High - Ensures responses are optimally formatted for each scenario
