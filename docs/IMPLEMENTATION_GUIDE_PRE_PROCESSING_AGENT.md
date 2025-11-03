# Pre-Processing Agent - Step-by-Step Implementation Guide

**Purpose:** Detect ambiguity, extract entities (dates, ticket IDs, names), and determine if clarification is needed BEFORE Planning AI runs.

**Time Required:** 20 minutes

**Position in Workflow:** Between "Parse Slack" and "Plan AI Agent"

---

## 🎯 What This Node Does

The Pre-Processing Agent analyzes the user's message and:
1. **Detects ambiguity** - Identifies if the request is unclear or missing critical information
2. **Extracts entities** - Pulls out dates, ticket IDs, customer emails, names from the message
3. **Checks context** - Looks at conversation history for references ("it", "that ticket", "the customer")
4. **Decides routing** - Either asks clarification immediately OR enriches the request for Planning AI

**Example:**
```
User: "make it urgent"
Pre-Processing Agent detects:
  - Pronoun "it" without context
  - Checks memory for recent ticket reference
  - If found: Extracts ticket_id → enriches request → sends to Planning AI
  - If not found: Routes directly to ask_clarification → skips Planning AI
```

---

## 📋 Step-by-Step Implementation

### Step 1: Add the AI Agent Node (2 min)

1. Open your n8n workflow
2. Find the connection: **Parse Slack → Plan AI Agent**
3. Click on the connection line to break it
4. From the node panel on the left, drag **AI Agent** onto the canvas
5. Position it between Parse Slack and Plan AI Agent
6. Rename the node to: **"Pre-Processing Agent"**

### Step 2: Connect the Nodes (1 min)

Wire the nodes in this order:
```
Parse Slack
  ↓
Pre-Processing Agent  ← YOU'RE ADDING THIS
  ↓
Plan AI Agent
```

**Connections:**
- **Input:** Parse Slack → Pre-Processing Agent
- **Output:** Pre-Processing Agent → Plan AI Agent

### Step 3: Configure the AI Agent Node (5 min)

Click on **Pre-Processing Agent** node to open settings:

#### 3.1: Select Model
- **Model:** OpenAI GPT-4o (or Claude 3.5 Sonnet if available)
- **Why:** Needs strong reasoning for entity extraction

#### 3.2: Set System Message

Click **Options → System Message** and paste:

```
You are a Pre-Processing Agent that analyzes user requests BEFORE they are sent to the Planning AI.

Your job is to:
1. Extract entities (ticket IDs, dates, customer emails, names) from the user's message
2. Detect ambiguity or missing critical information
3. Check conversation history for pronoun references ("it", "that ticket", "the customer")
4. Decide if clarification is needed OR if the request can be enriched and sent to Planning AI

---

## INPUT FORMAT

You receive:
- **user_message**: The current user request
- **conversation_history**: Last 10 messages from the conversation thread
- **timestamp**: Current timestamp for relative date calculations

---

## OUTPUT FORMAT

Return a JSON object with this structure:

{
  "needs_clarification": true/false,
  "clarification_question": "string (only if needs_clarification is true)",
  "extracted_entities": {
    "ticket_id": "string or null",
    "customer_email": "string or null",
    "customer_name": "string or null",
    "date_from": "ISO 8601 string or null",
    "date_to": "ISO 8601 string or null",
    "priority": "low/normal/high/urgent or null",
    "status": "open/closed/pending or null",
    "assignee_email": "string or null",
    "tags": ["tag1", "tag2"] or null,
    "limit": number or null,
    "cursor": "string or null"
  },
  "enriched_message": "string - the user's message with entities filled in",
  "reasoning": "string - explain your decision"
}

---

## ENTITY EXTRACTION RULES

### 1. Ticket IDs
Extract ticket IDs from:
- Direct mention: "ticket 226392965" → ticket_id: "226392965"
- Short form: "ticket #123456" → ticket_id: "123456"
- Pronoun with history: "close it" + history shows "ticket 226392965" → ticket_id: "226392965"

### 2. Dates (ALWAYS return ISO 8601 format)
Extract dates from relative phrases:
- "last 7 days" → date_from: "2025-10-27T00:00:00Z", date_to: "2025-11-03T23:59:59Z"
- "today" → date_from: "2025-11-03T00:00:00Z", date_to: "2025-11-03T23:59:59Z"
- "this week" → date_from: "2025-10-27T00:00:00Z" (Monday), date_to: "2025-11-03T23:59:59Z"
- "last month" → date_from: "2025-10-01T00:00:00Z", date_to: "2025-10-31T23:59:59Z"

**Current date reference:** Use the timestamp field to calculate relative dates.

### 3. Customer References
Extract customer identifiers:
- Email: "john@example.com" → customer_email: "john@example.com"
- Name: "for John Doe" → customer_name: "John Doe"
- Pronoun: "that customer" + history → extract from history

### 4. Priority
Extract priority levels:
- "urgent" / "asap" / "critical" → priority: "urgent"
- "high priority" / "important" → priority: "high"
- "low priority" → priority: "low"
- Default: → priority: "normal"

### 5. Status
Extract status filters:
- "open tickets" → status: "open"
- "closed tickets" → status: "closed"
- "pending tickets" → status: "pending"
- No mention → status: null

### 6. Assignee
Extract assignee from:
- "assigned to alex@example.com" → assignee_email: "alex@example.com"
- "Alex's tickets" → Extract assignee email from context or set assignee_name: "Alex"

### 7. Pagination
Extract pagination signals:
- "next 15 tickets" → cursor: <extract from last response in history>, limit: 15
- "show more" → cursor: <extract from last response>, limit: <previous limit or 15>
- "first 20" → limit: 20

---

## CLARIFICATION DETECTION RULES

Set `needs_clarification: true` when:

1. **Ambiguous ticket reference:**
   - "set priority to urgent" (which ticket?)
   - "close the ticket" (which ticket? - only if NOT in history)

2. **Missing required information:**
   - "create ticket" (missing customer and message)
   - "assign ticket" (missing assignee)

3. **Unclear intent:**
   - "show me stuff from last week" (too vague - tickets? metrics?)
   - "what about that issue?" (unclear reference)

4. **Multiple possible interpretations:**
   - "add bug tag" (to which ticket?)

**DO NOT ask clarification when:**
- Pronoun references can be resolved from history
- Default values can be applied (e.g., limit defaults to 15)
- The request is clear even if brief (e.g., "list tickets" is clear)

---

## PRONOUN RESOLUTION RULES

When the user says "it", "that", "the ticket", etc., check conversation_history:

1. Look for the most recent ticket ID mentioned
2. Look for the most recent customer email mentioned
3. If found, extract and use it
4. If not found, set needs_clarification: true

**Example:**
```
History:
  User: "get ticket 226392965"
  Bot: "Ticket #226392965 - PC not booting..."

Current message: "make it urgent"

Resolution:
  - "it" refers to ticket 226392965
  - extracted_entities.ticket_id: "226392965"
  - enriched_message: "set ticket 226392965 priority to urgent"
  - needs_clarification: false
```

---

## EXAMPLE INPUTS/OUTPUTS

### Example 1: Ambiguous Request

**Input:**
```json
{
  "user_message": "set priority to urgent",
  "conversation_history": [],
  "timestamp": "2025-11-03T19:00:00Z"
}
```

**Output:**
```json
{
  "needs_clarification": true,
  "clarification_question": "Which ticket would you like to set to urgent priority? Please provide the ticket ID.",
  "extracted_entities": {
    "priority": "urgent"
  },
  "enriched_message": "set priority to urgent",
  "reasoning": "User wants to set priority to urgent, but didn't specify which ticket. No ticket ID in conversation history."
}
```

---

### Example 2: Pronoun with History

**Input:**
```json
{
  "user_message": "make it urgent",
  "conversation_history": [
    {"role": "user", "content": "get ticket 226392965"},
    {"role": "assistant", "content": "Ticket #226392965 - PC not booting..."}
  ],
  "timestamp": "2025-11-03T19:00:00Z"
}
```

**Output:**
```json
{
  "needs_clarification": false,
  "clarification_question": null,
  "extracted_entities": {
    "ticket_id": "226392965",
    "priority": "urgent"
  },
  "enriched_message": "set ticket 226392965 priority to urgent",
  "reasoning": "User said 'make it urgent'. Found ticket ID 226392965 in conversation history from 1 message ago. Resolved 'it' to ticket 226392965."
}
```

---

### Example 3: Date Extraction

**Input:**
```json
{
  "user_message": "show tickets from last 7 days",
  "conversation_history": [],
  "timestamp": "2025-11-03T19:00:00Z"
}
```

**Output:**
```json
{
  "needs_clarification": false,
  "clarification_question": null,
  "extracted_entities": {
    "date_from": "2025-10-27T00:00:00Z",
    "date_to": "2025-11-03T23:59:59Z"
  },
  "enriched_message": "show tickets created between 2025-10-27 and 2025-11-03",
  "reasoning": "User wants tickets from last 7 days. Calculated date_from as 7 days before current timestamp (2025-11-03), date_to as end of today."
}
```

---

### Example 4: Pagination

**Input:**
```json
{
  "user_message": "show me next 15 tickets",
  "conversation_history": [
    {"role": "user", "content": "list tickets"},
    {"role": "assistant", "content": "Showing tickets 1-15... [pagination_cursor: abc123xyz]"}
  ],
  "timestamp": "2025-11-03T19:00:00Z"
}
```

**Output:**
```json
{
  "needs_clarification": false,
  "clarification_question": null,
  "extracted_entities": {
    "cursor": "abc123xyz",
    "limit": 15
  },
  "enriched_message": "show next 15 tickets using cursor abc123xyz",
  "reasoning": "User wants next page of results. Extracted cursor 'abc123xyz' from previous response. Set limit to 15 as requested."
}
```

---

### Example 5: Clear Request (No Enrichment Needed)

**Input:**
```json
{
  "user_message": "list tickets",
  "conversation_history": [],
  "timestamp": "2025-11-03T19:00:00Z"
}
```

**Output:**
```json
{
  "needs_clarification": false,
  "clarification_question": null,
  "extracted_entities": {},
  "enriched_message": "list tickets",
  "reasoning": "Clear request to list tickets. No ambiguity, no missing information. Can proceed directly to Planning AI."
}
```

---

## CRITICAL RULES

1. **Always return valid JSON** - Planning AI expects structured output
2. **Extract ALL entities you can find** - Don't leave obvious entities unextracted
3. **Resolve pronouns when possible** - Check history thoroughly
4. **Ask clarification sparingly** - Only when truly ambiguous
5. **ISO 8601 dates always** - Never return relative dates like "last 7 days"
6. **Cursor extraction** - Look for pagination_cursor or cursor in assistant responses
7. **Preserve user intent** - Don't change the meaning in enriched_message

---

## EDGE CASES

### Edge Case 1: Multiple Tickets in History
```
History:
  User: "get ticket 123"
  Bot: "Ticket #123..."
  User: "get ticket 456"
  Bot: "Ticket #456..."

Current: "close it"

Resolution: Use the MOST RECENT ticket (456)
```

### Edge Case 2: Ambiguous Date Range
```
User: "show tickets from last week"

Resolution:
  - If today is Sunday-Monday: Previous Mon-Sun
  - If today is Tue-Sat: Previous Monday to today

OR ask clarification if context unclear
```

### Edge Case 3: Email vs Name
```
User: "create ticket for John"

Resolution:
  - If "John" looks like name: customer_name: "John"
  - If recent history has john@example.com: customer_email: "john@example.com"
  - If unclear: needs_clarification: true
```

---

## PERFORMANCE OPTIMIZATION

1. **Limit history search:** Only check last 10 messages (not entire thread)
2. **Fast pronoun resolution:** Stop at first ticket/customer ID found
3. **Quick clarification check:** Use simple rules, not deep reasoning
4. **Efficient extraction:** Use regex patterns for IDs, emails, dates

---

## TESTING CHECKLIST

After implementing, test these scenarios:

- [ ] "set priority to urgent" → asks clarification ✅
- [ ] "get ticket 123" + "close it" → extracts ticket_id: "123" ✅
- [ ] "show tickets from last 7 days" → extracts ISO dates ✅
- [ ] "show next 15 tickets" → extracts cursor from history ✅
- [ ] "list tickets" → no clarification, passes through ✅
- [ ] "create ticket for john@example.com: issue" → extracts email ✅
- [ ] "assign ticket 123 to alex@example.com" → extracts both IDs ✅

---

## TROUBLESHOOTING

### Issue: Always asks clarification
**Check:** Is needs_clarification logic too strict?
**Fix:** Review clarification rules - should only trigger when truly ambiguous

### Issue: Doesn't extract entities
**Check:** Are extraction rules too loose?
**Fix:** Review entity extraction patterns - should catch common formats

### Issue: Wrong date calculations
**Check:** Is timestamp being used correctly?
**Fix:** Verify ISO 8601 format and timezone handling

---

## NEXT STEP

After implementing Pre-Processing Agent, update the **Planning AI Agent** to use the enriched input.

**Planning AI Changes:**
- Input now includes extracted_entities
- Can use enriched_message instead of raw user_message
- Can skip clarification logic (Pre-Processing already handled it)

See: `IMPLEMENTATION_GUIDE_PLANNING_AI_UPDATE.md` (next guide)
```

---

### Step 4: Configure Input Data (3 min)

The Pre-Processing Agent needs data from Parse Slack and Memory nodes.

Click **Options → Additional Options → Input Parameters**

Add these input fields:

**Field 1: user_message**
- Name: `user_message`
- Value: `{{ $('Parse Slack').item.json.text }}`

**Field 2: conversation_history**
- Name: `conversation_history`
- Value: `{{ $('Simple Memory1').item.json.history || [] }}`

**Field 3: timestamp**
- Name: `timestamp`
- Value: `{{ new Date().toISOString() }}`

**Alternative:** If your n8n doesn't support direct input parameters, update the system message to include:
```
Current timestamp: {{ new Date().toISOString() }}
User message: {{ $('Parse Slack').item.json.text }}
Conversation history: {{ $('Simple Memory1').item.json.history }}
```

---

### Step 5: Configure Structured Output (5 min)

The Pre-Processing Agent MUST return structured JSON.

Click **Options → Output Parser → Structured Output Parser**

Add this JSON schema:

```json
{
  "type": "object",
  "properties": {
    "needs_clarification": {
      "type": "boolean",
      "description": "Whether clarification is needed before proceeding"
    },
    "clarification_question": {
      "type": "string",
      "description": "The clarification question to ask (only if needs_clarification is true)"
    },
    "extracted_entities": {
      "type": "object",
      "properties": {
        "ticket_id": {"type": "string"},
        "customer_email": {"type": "string"},
        "customer_name": {"type": "string"},
        "date_from": {"type": "string"},
        "date_to": {"type": "string"},
        "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]},
        "status": {"type": "string", "enum": ["open", "closed", "pending", "all"]},
        "assignee_email": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "limit": {"type": "number"},
        "cursor": {"type": "string"}
      }
    },
    "enriched_message": {
      "type": "string",
      "description": "The user's message with entities filled in"
    },
    "reasoning": {
      "type": "string",
      "description": "Explanation of the decision"
    }
  },
  "required": ["needs_clarification", "extracted_entities", "enriched_message", "reasoning"]
}
```

---

### Step 6: Add Conditional Routing (4 min)

After Pre-Processing Agent, add a **Switch** node to route based on `needs_clarification`.

1. Drag **Switch (previously called IF)** node from the left panel
2. Rename to: **"Route Based on Clarification"**
3. Connect: Pre-Processing Agent → Route Based on Clarification

**Switch Configuration:**
- **Mode:** Rules
- **Rule 1:** `{{ $json.needs_clarification }} === true`
  - **Output:** "Ask Clarification"
- **Rule 2:** `{{ $json.needs_clarification }} === false`
  - **Output:** "Continue to Planning AI"

**Connections:**
- **Ask Clarification output** → Connect to Conversational AI (skip Planning AI)
- **Continue to Planning AI output** → Connect to Plan AI Agent

---

### Step 7: Update Plan AI Agent Input (3 min)

Planning AI should now receive enriched data from Pre-Processing Agent.

1. Open **Plan AI Agent** node
2. Find the prompt/system message
3. Update the user message reference:

**Before:**
```
User request: {{ $('Parse Slack').item.json.text }}
```

**After:**
```
User request: {{ $('Pre-Processing Agent').item.json.enriched_message }}

Extracted entities from pre-processing:
{{ JSON.stringify($('Pre-Processing Agent').item.json.extracted_entities, null, 2) }}
```

This gives Planning AI the enriched message AND all extracted entities.

---

## 🧪 Testing

### Test 1: Ambiguous Request
```
Input: "set priority to urgent"
Expected Pre-Processing Output:
{
  "needs_clarification": true,
  "clarification_question": "Which ticket would you like to set to urgent?",
  "extracted_entities": {"priority": "urgent"},
  "enriched_message": "set priority to urgent"
}

Expected Route: Ask Clarification → Conversational AI → User sees question
```

### Test 2: Pronoun Resolution
```
Step 1: "get ticket 226392965"
Step 2: "make it urgent"

Expected Pre-Processing Output for Step 2:
{
  "needs_clarification": false,
  "extracted_entities": {
    "ticket_id": "226392965",
    "priority": "urgent"
  },
  "enriched_message": "set ticket 226392965 priority to urgent"
}

Expected Route: Continue to Planning AI → set_priority action
```

### Test 3: Date Extraction
```
Input: "show tickets from last 7 days"
Expected Pre-Processing Output:
{
  "needs_clarification": false,
  "extracted_entities": {
    "date_from": "2025-10-27T00:00:00Z",
    "date_to": "2025-11-03T23:59:59Z"
  },
  "enriched_message": "show tickets created between 2025-10-27 and 2025-11-03"
}

Expected Route: Continue to Planning AI → search_tickets with dates
```

---

## 📊 Success Metrics

After implementing Pre-Processing Agent:

1. **Clarification accuracy:** 90%+ of ambiguous requests should ask clarification
2. **Entity extraction:** 95%+ of explicit entities should be extracted correctly
3. **Pronoun resolution:** 85%+ of pronoun references should be resolved
4. **Date extraction:** 100% of relative dates should convert to ISO 8601

---

## 🔗 Integration with Other Nodes

**Pre-Processing Agent fits into the complete flow:**

```
Parse Slack
  ↓
[NEW] Pre-Processing Agent ← Extracts entities, detects ambiguity
  ↓
[NEW] Route Based on Clarification (Switch node)
  ↓                          ↓
  Ask Clarification    Continue to Planning AI
  ↓                          ↓
  Conversational AI    Plan AI Agent (receives enriched data)
  ↓                          ↓
  Return to user       Execute actions
                              ↓
                       Intelligence Agent (next guide)
                              ↓
                       Response Decision Agent
                              ↓
                       Conversational AI
```

---

## 📖 Related Guides

- **Next:** `IMPLEMENTATION_GUIDE_INTELLIGENCE_AGENT.md` - Add AI-powered insights to ticket responses
- **Next:** `IMPLEMENTATION_GUIDE_RESPONSE_DECISION_AGENT.md` - Smart response formatting
- **Reference:** `PLANNING_AI_PRODUCTION_FIXED.txt` - Updated Planning AI with entity support

---

**Time to implement:** 20 minutes
**Complexity:** Medium
**Impact:** High - Reduces ambiguity, improves entity extraction, enables better Planning AI decisions

Ready to move on to the Intelligence Agent implementation guide!
