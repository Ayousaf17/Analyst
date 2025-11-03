# Complete Workflow Architecture - Full Node Diagram

**Version:** 2.0 with Intelligence Nodes
**Date:** November 3, 2025
**Status:** Ready for implementation

---

## 🏗️ Complete Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SLACK WEBHOOK                                │
│                    (Receives Slack messages)                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PARSE SLACK                                  │
│              (Extract text, thread_ts, user info)                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  [NEW] PRE-PROCESSING AGENT                          │
│   • Extract entities (ticket IDs, dates, customer emails)            │
│   • Detect ambiguity (missing info, unclear intent)                  │
│   • Resolve pronouns ("it" → ticket ID from history)                 │
│   • Check if clarification needed                                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│          [NEW] ROUTE BASED ON CLARIFICATION (Switch)                 │
│                                                                       │
│   needs_clarification === true?                                      │
└─────────────┬───────────────────────────────────────┬───────────────┘
              │ YES                                   │ NO
              │                                       │
              ▼                                       ▼
    ┌──────────────────┐                  ┌──────────────────────────┐
    │ ASK CLARIFICATION│                  │   PLAN AI AGENT          │
    │                  │                  │ (Updated with enriched   │
    │ Skip Planning AI │                  │  entities from Pre-      │
    │ Go directly to   │                  │  Processing)             │
    │ Conversational   │                  │                          │
    │ AI with question │                  │ Returns: plan with       │
    └────────┬─────────┘                  │ actions to execute       │
             │                            └────────┬─────────────────┘
             │                                     │
             │                                     ▼
             │                         ┌────────────────────────────┐
             │                         │ STRUCTURED OUTPUT PARSER   │
             │                         │ (MUST include              │
             │                         │  ask_clarification &       │
             │                         │  analyze_insights)         │
             │                         └────────┬───────────────────┘
             │                                  │
             │                                  ▼
             │                         ┌────────────────────────────┐
             │                         │ HANDLE PLAN RESPONSE       │
             │                         │ (Check if plan valid)      │
             │                         └────────┬───────────────────┘
             │                                  │
             │                                  ▼
             │                         ┌────────────────────────────┐
             │                         │ SWITCH (Route by action)   │
             │                         │                            │
             │                         │ Routes to different nodes  │
             │                         │ based on action type       │
             │                         └─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬──┘
             │                           │ │ │ │ │ │ │ │ │ │ │ │ │
             │         ┌─────────────────┘ │ │ │ │ │ │ │ │ │ │ │ └─────────┐
             │         │                   │ │ │ │ │ │ │ │ │ │ │           │
             │         ▼                   ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼           ▼
             │   ┌──────────┐         [13 other action nodes]      ┌──────────────┐
             │   │get_ticket│                                      │analyze       │
             │   │(HTTP)    │                                      │_insights     │
             │   └────┬─────┘                                      │              │
             │        │                                            └──────┬───────┘
             │        ▼                                                   │
             │   ┌──────────────────────────────────────────┐            │
             │   │ [NEW] INTELLIGENCE AGENT                 │            │
             │   │                                          │            │
             │   │ • Spam detection                         │            ▼
             │   │ • Tag recommendations                    │      ┌──────────────┐
             │   │ • Assignee suggestions                   │      │ ANALYTICS    │
             │   │ • Sentiment analysis                     │      │ PROCESSING   │
             │   │ • Priority recommendations               │      │              │
             │   │ • Similar ticket patterns                │      │ (Process     │
             │   │                                          │      │  insights    │
             │   │ Only runs for: get_ticket,               │      │  data)       │
             │   │   list_tickets, search_tickets           │      └──────┬───────┘
             │   └─────────────────┬────────────────────────┘             │
             │                     │                                      │
             │                     ▼                                      │
             │   ┌──────────────────────────────────────────┐            │
             │   │ [NEW] RESPONSE DECISION AGENT            │            │
             │   │                                          │            │
             │   │ Decides:                                 │            │
             │   │ • Format (table vs text vs analytics)    │            │
             │   │ • Verbosity (brief vs detailed)          │            │
             │   │ • Include intelligence insights?         │            │
             │   │ • Next action suggestions                │            │
             │   └─────────────────┬────────────────────────┘            │
             │                     │                                      │
             │                     ▼                                      │
             │          ┌─────────────────────┐                          │
             │          │ FORMAT ROUTER       │                          │
             │          │ (Switch)            │                          │
             │          │                     │                          │
             │          │ response_format?    │                          │
             │          └──┬───────┬──────────┘                          │
             │             │       │                                     │
             │  table?     │       │  text/analytics?                    │
             │             │       │                                     │
             │             ▼       ▼                                     │
             │    ┌─────────────┐ │                                     │
             │    │ UNIVERSAL   │ │                                     │
             │    │ TABLE       │ │                                     │
             │    │ FORMATTER   │ │                                     │
             │    │             │ │                                     │
             │    │ (Only for   │ │                                     │
             │    │  tables)    │ │                                     │
             │    └──────┬──────┘ │                                     │
             │           │        │                                     │
             │           └────┬───┘                                     │
             │                │                                         │
             └────────────────┼─────────────────────────────────────────┘
                              │
                              ▼
                   ┌──────────────────────────────────┐
                   │ CONVERSATIONAL AI                │
                   │ (Updated with formatting         │
                   │  decisions from Response         │
                   │  Decision Agent)                 │
                   │                                  │
                   │ Formats response based on:       │
                   │ • response_format                │
                   │ • verbosity                      │
                   │ • intelligence_to_include        │
                   │ • next_actions                   │
                   │ • formatting_notes               │
                   └────────────┬─────────────────────┘
                                │
                                ▼
                   ┌──────────────────────────────────┐
                   │ SIMPLE MEMORY                    │
                   │ (Store last 10 messages)         │
                   │                                  │
                   │ Session key:                     │
                   │ {{ thread_ts }}                  │
                   └────────────┬─────────────────────┘
                                │
                                ▼
                   ┌──────────────────────────────────┐
                   │ SLACK RESPONSE                   │
                   │ (Send formatted response back    │
                   │  to Slack thread)                │
                   └──────────────────────────────────┘
```

---

## 📊 Node Connection Details

### Phase 1: Input Processing

| From Node | To Node | Data Passed | Purpose |
|-----------|---------|-------------|---------|
| Slack Webhook | Parse Slack | Raw Slack event | Extract message data |
| Parse Slack | Pre-Processing Agent | text, thread_ts, user | Extract entities, detect ambiguity |
| Pre-Processing Agent | Route Based on Clarification | needs_clarification, extracted_entities, enriched_message | Decide if clarification needed |

### Phase 2A: Clarification Path (If Needed)

| From Node | To Node | Data Passed | Purpose |
|-----------|---------|-------------|---------|
| Route (YES) | Conversational AI | clarification_question | Ask user for missing info |
| Conversational AI | Slack Response | formatted_question | Send question to user |

### Phase 2B: Planning Path (If No Clarification Needed)

| From Node | To Node | Data Passed | Purpose |
|-----------|---------|-------------|---------|
| Route (NO) | Plan AI Agent | enriched_message, extracted_entities | Generate action plan |
| Plan AI Agent | Structured Output Parser | AI response with plan | Validate plan schema |
| SOP | Handle Plan Response | validated_plan | Check plan validity |
| Handle Plan Response | Switch (Route by Action) | action, parameters | Route to correct action |

### Phase 3: Action Execution

| From Node | To Node | Data Passed | Purpose |
|-----------|---------|-------------|---------|
| Switch | get_ticket (HTTP) | ticket_id | Fetch ticket data |
| Switch | list_tickets (HTTP) | limit, cursor, status | Fetch ticket list |
| Switch | search_tickets (HTTP) | query, date_from, date_to | Search tickets |
| Switch | set_priority (HTTP) | ticket_id, priority | Update priority |
| Switch | assign_ticket (HTTP) | ticket_id, assignee_email | Assign ticket |
| Switch | close_ticket (HTTP) | ticket_id | Close ticket |
| Switch | add_tags (HTTP) | ticket_id, tags | Add tags |
| Switch | comment_internal (HTTP) | ticket_id, message | Add internal note |
| Switch | reply_public (HTTP) | ticket_id, message | Reply to customer |
| Switch | create_ticket (HTTP) | customer_email, subject, message | Create new ticket |
| Switch | analyze_insights | period, focus | Trigger analytics |

### Phase 4A: Intelligence Analysis (For Ticket Actions Only)

| From Node | To Node | Data Passed | Purpose |
|-----------|---------|-------------|---------|
| get_ticket | Intelligence Agent | ticket_data | Analyze ticket for spam, sentiment, tags |
| list_tickets | Intelligence Agent | tickets[] | Aggregate analysis |
| search_tickets | Intelligence Agent | tickets[] | Aggregate analysis |
| Intelligence Agent | Response Decision Agent | intelligence_insights | Provide AI insights |

### Phase 4B: Response Formatting Decision

| From Node | To Node | Data Passed | Purpose |
|-----------|---------|-------------|---------|
| Response Decision Agent | Format Router (Switch) | response_format, verbosity, intelligence_to_include | Decide response format |

### Phase 5: Response Formatting

| From Node | To Node | Data Passed | Purpose |
|-----------|---------|-------------|---------|
| Format Router (table) | Universal Table Formatter | action_result | Format as table |
| Format Router (text/analytics) | Conversational AI | action_result, intelligence, formatting_decisions | Skip table formatter |
| Universal Table Formatter | Conversational AI | formatted_table | Provide table format |
| Conversational AI | Simple Memory | formatted_response | Store in conversation history |
| Simple Memory | Slack Response | formatted_response | Send to Slack |

---

## 🔄 Data Flow Examples

### Example 1: Ambiguous Request → Clarification

```
User: "set priority to urgent"
  ↓
Parse Slack: {text: "set priority to urgent", thread_ts: "123.456"}
  ↓
Pre-Processing Agent:
  - Extracted: {priority: "urgent"}
  - Detected: Missing ticket_id
  - Decision: needs_clarification: true
  - Question: "Which ticket would you like to set to urgent?"
  ↓
Route: needs_clarification === true → ASK CLARIFICATION path
  ↓
Conversational AI: Formats question
  ↓
Slack Response: "Which ticket would you like to set to urgent? Please provide the ticket ID."
```

### Example 2: Pronoun Resolution → Planning AI

```
User: "get ticket 226392965"
User: "make it urgent"
  ↓
Parse Slack: {text: "make it urgent", thread_ts: "123.456"}
  ↓
Pre-Processing Agent:
  - Checks history: Found "ticket 226392965" in previous message
  - Extracted: {ticket_id: "226392965", priority: "urgent"}
  - Enriched: "set ticket 226392965 priority to urgent"
  - Decision: needs_clarification: false
  ↓
Route: needs_clarification === false → PLAN AI AGENT path
  ↓
Plan AI Agent:
  - Input: "set ticket 226392965 priority to urgent"
  - Output: {plan: [{action: "set_priority", ticket_id: "226392965", priority: "urgent"}]}
  ↓
SOP: Validates plan (set_priority in enum) → PASS
  ↓
Handle Plan Response: Plan valid → routes to Switch
  ↓
Switch: action === "set_priority" → routes to set_priority HTTP node
  ↓
set_priority (HTTP): Calls Gorgias API to update priority
  ↓
Response Decision Agent:
  - Action: set_priority (confirmation)
  - Decision: response_format: "brief_text", verbosity: "brief"
  ↓
Format Router: response_format === "brief_text" → skip table formatter
  ↓
Conversational AI: "✅ Set ticket #226392965 to urgent."
  ↓
Slack Response: Sends confirmation
```

### Example 3: Get Ticket with Intelligence

```
User: "get ticket 226392965"
  ↓
Parse Slack: {text: "get ticket 226392965", thread_ts: "123.456"}
  ↓
Pre-Processing Agent:
  - Extracted: {ticket_id: "226392965"}
  - Decision: needs_clarification: false
  ↓
Plan AI Agent: {plan: [{action: "get_ticket", ticket_id: "226392965"}]}
  ↓
SOP: Validates → PASS
  ↓
Switch: action === "get_ticket" → routes to get_ticket HTTP node
  ↓
get_ticket (HTTP): Fetches ticket data from Gorgias API
  ↓
Intelligence Agent:
  - Analyzes ticket: "PC won't boot - urgent!"
  - Detects: sentiment: "frustrated", urgency: "high"
  - Recommends: tags: ["hardware", "boot-issue"], assignee: "alex@example.com"
  ↓
Response Decision Agent:
  - Action: get_ticket (viewing single ticket)
  - Intelligence: High urgency + frustrated sentiment
  - Decision: response_format: "detailed_text", include_intelligence: true
  ↓
Format Router: response_format === "detailed_text" → skip table formatter
  ↓
Conversational AI:
  - Receives: ticket_data + intelligence_insights + formatting_decisions
  - Formats: Detailed ticket view with intelligence insights
  - Output:
    ```
    🎫 Ticket #226392965 - PC won't boot

    **Details:**
    Status: open | Priority: normal | Created: Nov 2, 2025

    💬 **Customer Message:**
    "My PC won't boot and I have a presentation tomorrow!"

    🤖 **Intelligence Insights:**
    • Sentiment: frustrated (88% confidence)
    • Urgency: high (time-sensitive need)
    • Recommended tags: hardware, boot-issue, urgent
    • Recommended assignee: alex@example.com

    💡 **Suggested Actions:**
    • Set to urgent
    • Assign to alex@example.com
    ```
  ↓
Slack Response: Sends formatted response
```

### Example 4: List Tickets → Table Format

```
User: "list tickets"
  ↓
Plan AI Agent: {plan: [{action: "list_tickets", limit: 15}]}
  ↓
Switch: action === "list_tickets"
  ↓
list_tickets (HTTP): Fetches 15 tickets
  ↓
Intelligence Agent: Aggregate analysis (optional - can skip for list view)
  ↓
Response Decision Agent:
  - Action: list_tickets (multiple tickets)
  - Decision: response_format: "table", verbosity: "standard", include_intelligence: false
  ↓
Format Router: response_format === "table" → routes to Universal Table Formatter
  ↓
Universal Table Formatter: Creates ASCII table with 15 rows
  ↓
Conversational AI: Wraps table with context
  ↓
Slack Response: Sends table
```

### Example 5: Analytics Insights

```
User: "show me insights"
  ↓
Pre-Processing Agent: {enriched_message: "show me insights"}
  ↓
Plan AI Agent: {plan: [{action: "analyze_insights", period: "30d"}]}
  ↓
SOP: Validates (analyze_insights in enum) → PASS
  ↓
Switch: action === "analyze_insights"
  ↓
Analytics Processing: Fetches closed tickets, analyzes patterns
  ↓
Response Decision Agent:
  - Action: analyze_insights
  - Decision: response_format: "analytics_report", verbosity: "detailed"
  ↓
Format Router: response_format === "analytics_report" → skip table formatter
  ↓
Conversational AI:
  - Formats analytics report with visual hierarchy
  - Output:
    ```
    📊 Closed Ticket Insights (last 30 days)

    📈 Overview:
    • Analyzed: 1,284 tickets
    • Avg resolution: 410 min

    🔁 Top Recurring Questions:
    1️⃣ "When will my PC ship?" — 142 tickets (11.1%)

    🎯 Operational Recommendations:
    1. Update Shipping SLA section on /order-status
    ```
  ↓
Slack Response: Sends analytics report
```

---

## 🎯 Critical Node Dependencies

### Nodes That Must Exist:

1. **Parse Slack** - Extracts Slack event data
2. **Plan AI Agent** - Plans actions based on user request
3. **Structured Output Parser** - Validates plan schema (MUST include ask_clarification and analyze_insights)
4. **Handle Plan Response** - Validates plan and triggers fallback if needed
5. **Switch (Route by Action)** - Routes to correct action node
6. **Action Nodes** (get_ticket, list_tickets, etc.) - Execute Gorgias API calls
7. **Conversational AI** - Formats final response
8. **Simple Memory** - Stores conversation history
9. **Slack Response** - Sends response back to Slack

### New Nodes (Optional but Recommended):

10. **Pre-Processing Agent** - Extracts entities, detects ambiguity (20 min to implement)
11. **Route Based on Clarification (Switch)** - Routes based on needs_clarification (5 min)
12. **Intelligence Agent** - AI-powered insights (30 min to implement)
13. **Response Decision Agent** - Smart formatting decisions (25 min to implement)
14. **Format Router (Switch)** - Routes based on response_format (5 min)

**Total time to add all new nodes:** ~90 minutes

---

## 📦 Node Implementation Priority

### Priority 0: CRITICAL (Must do first)
- **Structured Output Parser schema update** (5 min)
  - Add ask_clarification and analyze_insights to enum
  - Blocks everything else from working

### Priority 1: HIGH (Core fixes)
- **Plan AI Agent system message update** (5 min)
  - Better routing logic, date extraction, pagination
- **Conversational AI system message update** (5 min)
  - Dynamic formatting, message bodies, date verification
- **search_tickets date filtering** (5 min)
  - Add date_from and date_to filters to API request
- **list_tickets pagination** (5 min)
  - Add cursor parameter

### Priority 2: MEDIUM (Intelligence nodes)
- **Pre-Processing Agent** (20 min)
  - Entity extraction, ambiguity detection, pronoun resolution
- **Intelligence Agent** (30 min)
  - Spam detection, tag recommendations, sentiment analysis
- **Response Decision Agent** (25 min)
  - Format decisions, verbosity, next actions

### Priority 3: LOW (Enhancements)
- **Universal Table Formatter updates** (20 min)
  - Show message bodies, created dates
- **Analytics Processing** (1 hour)
  - Full ticket analytics with recurring patterns

---

## 🧪 Testing Flow

### Test 1: Full Happy Path
```
User: "get ticket 226392965"
Expected Flow:
  Parse Slack → Pre-Processing (no clarification) → Plan AI →
  SOP (validates) → Switch → get_ticket → Intelligence Agent →
  Response Decision (detailed_text + intelligence) → Conversational AI →
  Slack Response

Expected Response:
  Detailed ticket view with intelligence insights (sentiment, tags, assignee recommendation)
```

### Test 2: Clarification Path
```
User: "set priority to urgent"
Expected Flow:
  Parse Slack → Pre-Processing (needs clarification) → Route →
  Conversational AI → Slack Response

Expected Response:
  "Which ticket would you like to set to urgent? Please provide the ticket ID."
```

### Test 3: Pronoun Resolution
```
User: "get ticket 123" → "close it"
Expected Flow:
  Parse Slack → Pre-Processing (resolves "it" to ticket 123) → Plan AI →
  SOP → Switch → close_ticket → Response Decision (brief_text) →
  Conversational AI → Slack Response

Expected Response:
  "✅ Closed ticket #123."
```

### Test 4: Analytics Path
```
User: "show me insights"
Expected Flow:
  Parse Slack → Pre-Processing → Plan AI → SOP → Switch →
  Analytics Processing → Response Decision (analytics_report) →
  Conversational AI → Slack Response

Expected Response:
  Full analytics report with recurring questions and operational recommendations
```

---

## 📖 Related Documentation

- **Pre-Processing Agent:** `IMPLEMENTATION_GUIDE_PRE_PROCESSING_AGENT.md`
- **Intelligence Agent:** `IMPLEMENTATION_GUIDE_INTELLIGENCE_AGENT.md`
- **Response Decision Agent:** `IMPLEMENTATION_GUIDE_RESPONSE_DECISION_AGENT.md`
- **SOP Schema Fix:** `CRITICAL_FIX_SOP_SCHEMA.md`
- **Master Checklist:** `MASTER_IMPLEMENTATION_CHECKLIST.md`

---

## ✅ Implementation Order

1. **Fix SOP schema** (5 min) - CRITICAL
2. **Update Planning AI and Conversational AI** (10 min) - HIGH
3. **Add date filtering and pagination** (10 min) - HIGH
4. **Implement Pre-Processing Agent** (20 min) - MEDIUM
5. **Implement Intelligence Agent** (30 min) - MEDIUM
6. **Implement Response Decision Agent** (25 min) - MEDIUM
7. **Test complete flow** (30 min) - REQUIRED

**Total:** ~2-3 hours for complete implementation with all intelligence nodes

---

This architecture diagram shows the complete flow with all nodes. The new intelligence nodes (Pre-Processing, Intelligence, Response Decision) are clearly marked with [NEW] tags.
