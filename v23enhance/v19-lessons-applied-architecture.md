# v19 Lessons Learned: Single-Shot AI + n8n Orchestration

## 🎓 The Core Lesson

**v19 FAILED because**: AI tried to do multi-step orchestration
**v23 WORKS because**: n8n does orchestration, AI just parses parameters
**v19 IMPROVED should**: Use AI for understanding, n8n for ALL execution

## ⚡ The New Architecture: "Single-Shot AI + Deterministic Orchestration"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER INPUT (Natural Language)                      │
│                   "assign spencer's urgent ticket to collin"                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: AI Agent (ONE SHOT ONLY!)                        │
│                                                                             │
│  Role: Parse natural language → Extract structured intent                  │
│  Constraint: NO API calls, NO multi-step, NO orchestration                 │
│  Output: Pure intent object                                                │
│                                                                             │
│  Prompt: "Extract the user's intent as structured JSON. Do NOT execute     │
│           anything. Do NOT make API calls. Just parse and return intent."  │
│                                                                             │
│  Input: "assign spencer's urgent ticket to collin"                         │
│  ↓                                                                          │
│  Output:                                                                    │
│  {                                                                          │
│    "primary_action": "assign_ticket",                                      │
│    "ticket_filters": {                                                     │
│      "owner_reference": "spencer",                                         │
│      "priority": "urgent",                                                 │
│      "status": "open"                                                      │
│    },                                                                       │
│    "target_assignee": "collin",                                            │
│    "confidence": 0.95                                                      │
│  }                                                                          │
│                                                                             │
│  ✅ AI's job is DONE. It never sees API results.                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 2: n8n Routing (Deterministic)                     │
│                                                                             │
│  Role: Route to appropriate workflow based on primary_action              │
│                                                                             │
│  Switch on: json.primary_action                                            │
│    case "assign_ticket"   → Assign Ticket Workflow                        │
│    case "close_ticket"    → Close Ticket Workflow                         │
│    case "search_tickets"  → Search Tickets Workflow                       │
│    case "add_note"        → Add Note Workflow                             │
│    default                → Error Handler                                  │
│                                                                             │
│  ✅ No AI involved. Pure n8n logic.                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│              STEP 3: Action-Specific Workflow (n8n Orchestration)          │
│                         Example: Assign Ticket Workflow                    │
│                                                                             │
│  Node 1: Resolve User References                                          │
│    Input: "spencer", "collin"                                              │
│    Process: Query gorgias_users table                                      │
│    Output: spencer@ironsidecomputers.com, collin@ironside.gg             │
│                                                                             │
│  Node 2: Query Tickets                                                     │
│    Input: owner_reference, filters                                         │
│    Process: Gorgias API GET /tickets with filters                          │
│    Output: Array of matching tickets                                       │
│                                                                             │
│  Node 3: Ticket Selection Logic                                           │
│    If 0 tickets:    → Error: "No tickets found for Spencer with priority urgent" │
│    If 1 ticket:     → Continue with that ticket                           │
│    If 2-5 tickets:  → Ask user to clarify (show list)                     │
│    If 6+ tickets:   → Error: "Too many matches, please be more specific"  │
│                                                                             │
│  Node 4: Build v23-Style Function Call                                    │
│    {                                                                       │
│      "function": "assign_ticket",                                          │
│      "parameters": {                                                       │
│        "ticket_id": 5678,                                                  │
│        "assignee_email": "collin@ironside.gg"                             │
│      }                                                                     │
│    }                                                                        │
│                                                                             │
│  Node 5: Validate Parameters                                              │
│    Same validation as v23                                                  │
│                                                                             │
│  Node 6-10: Execute via v23 Nodes                                         │
│    Your existing v23 execution logic!                                      │
│    - Log execution                                                         │
│    - Call Gorgias API                                                      │
│    - Handle response                                                       │
│    - Log result                                                            │
│    - Format Slack response                                                │
│                                                                             │
│  ✅ All orchestration is n8n. Deterministic. Observable.                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SLACK RESPONSE                                     │
│                 "✅ Assigned ticket #5678 to @collin"                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Principles (Learned from v19)

### ✅ DO:
1. **AI does ONE call only** - Parse intent, return structured JSON, done
2. **n8n does ALL orchestration** - Every API call, every decision, every loop
3. **Deterministic paths** - Each action type has a predefined workflow
4. **Log every step** - Same observability as v23
5. **Validate everything** - Before execution, just like v23

### ❌ DON'T:
1. **Let AI see API results** - It will try to reason about them
2. **Let AI make decisions mid-execution** - It gets inconsistent
3. **Let AI do loops** - "Let me check... now let me try..." = chaos
4. **Let AI orchestrate multi-step** - That's n8n's job
5. **Skip validation** - Always validate before execution

## 💻 Implementation: Single-Shot AI Node

```javascript
// Node: "Parse Intent (Single Shot)"
// This is the ONLY AI call in the entire workflow

const userMessage = $input.item.json.text;

const systemPrompt = `You are an intent parser for a ticket management system.

Your ONLY job is to parse the user's natural language into structured JSON.

DO NOT:
- Execute any actions
- Make API calls
- Reason about what should happen next
- Provide explanations or thoughts
- Make multiple attempts

DO:
- Extract the primary action
- Identify all entities (users, tickets, filters)
- Assess confidence
- Return pure JSON

Available actions:
- assign_ticket: Reassign a ticket to someone
- close_ticket: Close/resolve a ticket
- search_tickets: Find tickets matching criteria
- add_note: Add a note/comment to a ticket
- update_priority: Change ticket priority
- reopen_ticket: Reopen a closed ticket

Return format:
{
  "primary_action": "action_name",
  "ticket_filters": {
    "owner_reference": "string (user mention or name)",
    "ticket_id": "number (if explicitly mentioned)",
    "priority": "urgent|high|normal|low",
    "status": "open|closed|pending",
    "keyword": "string (text to search for)"
  },
  "target_user": "string (for assign/notify actions)",
  "note_content": "string (for add_note action)",
  "confidence": 0.0-1.0
}

Only include fields that are relevant to the action.`;

const response = await $http.request({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${$env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.1,  // Low temperature for consistent parsing
    response_format: { type: "json_object" }  // Force JSON output
  }
});

const intent = JSON.parse(response.choices[0].message.content);

// Add metadata
intent.original_message = userMessage;
intent.parsed_at = new Date().toISOString();

// Log the parse
await $supabase.from('intent_parses').insert({
  user_message: userMessage,
  parsed_intent: intent,
  confidence: intent.confidence,
  model: 'gpt-4'
});

return [{
  json: intent
}];

// ✅ AI's job is DONE
// ✅ It never sees what happens next
// ✅ It never gets a chance to orchestrate
```

## 🔀 Implementation: Deterministic Routing

```javascript
// Node: "Route to Action Workflow"

const intent = $input.item.json;

// Confidence check
if (intent.confidence < 0.7) {
  // Route to clarification handler
  return [{
    json: {
      route: 'clarification_needed',
      intent: intent,
      message: `I'm not sure I understood. Did you want to ${intent.primary_action}?`
    }
  }];
}

// Route based on action
switch (intent.primary_action) {
  case 'assign_ticket':
    return [{
      json: {
        route: 'assign_ticket_workflow',
        intent: intent
      }
    }];
  
  case 'close_ticket':
    return [{
      json: {
        route: 'close_ticket_workflow',
        intent: intent
      }
    }];
  
  case 'search_tickets':
    return [{
      json: {
        route: 'search_tickets_workflow',
        intent: intent
      }
    }];
  
  case 'add_note':
    return [{
      json: {
        route: 'add_note_workflow',
        intent: intent
      }
    }];
  
  default:
    return [{
      json: {
        route: 'unknown_action',
        intent: intent,
        error: `Unknown action: ${intent.primary_action}`
      }
    }];
}

// ✅ Pure JavaScript routing
// ✅ No AI involved
// ✅ Deterministic
```

## 🔧 Implementation: Assign Ticket Workflow (Example)

```javascript
// This is a SEPARATE n8n workflow for "assign_ticket" action
// It's completely deterministic and follows v23 patterns

// Node 1: Resolve Owner Reference
const ownerRef = $input.item.json.intent.ticket_filters.owner_reference;

const { data: ownerUser } = await $supabase
  .from('gorgias_users')
  .select('email, slack_user_id, full_name')
  .or(`slack_display_name.ilike.%${ownerRef}%,full_name.ilike.%${ownerRef}%`)
  .limit(1);

if (!ownerUser || ownerUser.length === 0) {
  throw new Error(`Could not find user: ${ownerRef}`);
}

// Node 2: Resolve Target Assignee
const targetRef = $input.item.json.intent.target_user;

const { data: targetUser } = await $supabase
  .from('gorgias_users')
  .select('email, slack_user_id, full_name')
  .or(`slack_display_name.ilike.%${targetRef}%,full_name.ilike.%${targetRef}%`)
  .limit(1);

if (!targetUser || targetUser.length === 0) {
  throw new Error(`Could not find user: ${targetRef}`);
}

// Node 3: Query Gorgias for Tickets
const filters = $input.item.json.intent.ticket_filters;

const queryParams = {
  limit: 10,
  assignee_user: { email: ownerUser[0].email }
};

if (filters.priority === 'urgent') {
  queryParams.priority = 'high';
}

if (filters.status) {
  queryParams.status = filters.status;
}

const gorgiasResponse = await $http.request({
  method: 'GET',
  url: 'https://ironsidecomputers.gorgias.com/api/tickets',
  qs: queryParams,
  headers: {
    'Authorization': `Bearer ${$env.GORGIAS_API_KEY}`
  }
});

const tickets = gorgiasResponse.data || [];

// Node 4: Ticket Selection Logic
if (tickets.length === 0) {
  return [{
    json: {
      success: false,
      message: `No ${filters.priority || ''} tickets found for ${ownerUser[0].full_name}`
    }
  }];
}

if (tickets.length === 1) {
  // Perfect! Exactly one ticket
  const ticket = tickets[0];
  
  // Node 5: Build v23 Function Call
  const functionCall = {
    function: 'assign_ticket',
    parameters: {
      ticket_id: ticket.id,
      assignee_email: targetUser[0].email
    }
  };
  
  // Node 6: Validate (v23 style)
  if (!Number.isInteger(functionCall.parameters.ticket_id)) {
    throw new Error('Invalid ticket_id');
  }
  
  // Node 7: Execute via v23 nodes
  // ... (use your existing v23 execution nodes)
  
  return [{
    json: {
      success: true,
      function_call: functionCall,
      ticket: ticket,
      assignee: targetUser[0]
    }
  }];
}

if (tickets.length <= 5) {
  // Ambiguous - ask user to clarify
  const ticketList = tickets.map(t => 
    `#${t.id}: ${t.subject} (${t.status})`
  ).join('\n');
  
  return [{
    json: {
      success: false,
      needs_clarification: true,
      message: `Found ${tickets.length} tickets for ${ownerUser[0].full_name}:\n${ticketList}\n\nWhich one?`,
      tickets: tickets
    }
  }];
}

// Too many tickets
return [{
  json: {
    success: false,
    message: `Found ${tickets.length} tickets. Please be more specific (add filters like "urgent", "open", or a ticket number)`
  }
}];

// ✅ All orchestration in n8n
// ✅ Deterministic logic
// ✅ Clear error handling
// ✅ Observable at every step
```

## 📊 Comparison: v19 vs v19 Improved

### v19 (Original - Failed):
```
User: "assign spencer's urgent ticket to collin"
↓
AI Agent:
  "Let me search for Spencer's tickets..."
  [AI makes API call]
  "I found 3 tickets. Let me filter for urgent..."
  [AI analyzes results]
  "Now I'll assign ticket #5678 to Collin..."
  [AI makes another API call]
  "Done! ... or wait, did it work? Let me check..."
  [AI gets confused about state]
  
❌ AI orchestrating = unreliable
❌ Multi-step reasoning = inconsistent
❌ State management = messy
```

### v19 Improved (Single-Shot + n8n):
```
User: "assign spencer's urgent ticket to collin"
↓
AI Agent (one call only):
  {
    "primary_action": "assign_ticket",
    "ticket_filters": {
      "owner_reference": "spencer",
      "priority": "urgent"
    },
    "target_user": "collin"
  }
↓
n8n Workflow:
  Node 1: Resolve "spencer" → spencer@ironsidecomputers.com
  Node 2: Query tickets (owner=spencer, priority=high)
  Node 3: Found 1 ticket → #5678
  Node 4: Resolve "collin" → collin@ironside.gg
  Node 5: Build function call
  Node 6: Execute via v23
  
✅ AI only parses = reliable
✅ n8n orchestrates = deterministic
✅ Full logging = observable
```

## 🎯 The Key Insight Applied

**v19's lesson**: Don't let AI orchestrate
**Application**: AI parses once, n8n handles everything else
**Result**: Natural language input + v23 reliability

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure
1. Create single-shot AI parsing node
2. Create routing node (switch on action type)
3. Build one workflow (e.g., assign_ticket)
4. Test end-to-end

### Phase 2: Additional Actions
5. Build close_ticket workflow
6. Build search_tickets workflow
7. Build add_note workflow
8. Add error handlers for each

### Phase 3: Enhancement
9. Add clarification handling (when ambiguous)
10. Add confidence thresholds
11. Add user confirmation for destructive actions
12. Optimize based on logs

## 💡 Why This Works

1. **AI never sees execution results** → Can't get confused
2. **AI never makes decisions mid-flow** → Consistent behavior
3. **AI never loops** → No "let me try again..." spirals
4. **n8n does what it's good at** → Orchestration, API calls, logic
5. **AI does what it's good at** → Understanding natural language

## 🎓 Lessons Codified

| Lesson | Application |
|--------|-------------|
| AI can't orchestrate | AI parses once, never again |
| AI can't track state | n8n manages all state |
| AI can't do reliable loops | No loops in AI, only n8n |
| n8n needs structure | AI outputs structured intent |
| v23's reliability works | Reuse v23 execution nodes |

## 🎊 The Best of Both Worlds

You get:
- ✅ Natural language input (like v19 wanted)
- ✅ Reliable execution (like v23 has)
- ✅ Full observability (like v23 has)
- ✅ No AI orchestration (v19's lesson learned)

This is **exactly** how to apply the v19 lesson! 🎯
