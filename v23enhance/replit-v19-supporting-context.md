# Supporting Technical Context for v19 Analysis

## Quick Reference: Copy This With the Main Prompt

This document provides technical specifications and context that Replit can reference while analyzing v19.

## System Architecture Overview

```
┌─────────────┐
│             │
│   Slack     │ ← Users type commands here
│             │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│             │
│    n8n      │ ← Workflow orchestration
│  Workflow   │    (visual workflow builder)
│             │
└──────┬──────┘
       │
       ├─────────────────┐
       ↓                 ↓
┌─────────────┐   ┌─────────────┐
│             │   │             │
│  OpenAI     │   │  Supabase   │
│    API      │   │   (Logs)    │
│             │   │             │
└──────┬──────┘   └─────────────┘
       │
       ↓
┌─────────────┐
│             │
│  Gorgias    │ ← Ticket management
│    API      │
│             │
└─────────────┘
```

## Database Schema (Supabase)

### gorgias_users table
```sql
CREATE TABLE gorgias_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  slack_user_id TEXT UNIQUE,  -- e.g., "U8NC9D5AM"
  slack_display_name TEXT,    -- e.g., "Collin"
  role TEXT,                  -- "agent", "admin", etc.
  is_bot BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data (13 users total, 100% coverage)
INSERT INTO gorgias_users VALUES
  ('collin@ironside.gg', 'Collin Bailey', 'U8NC9D5AM', 'Collin', 'agent'),
  ('spencer@ironsidecomputers.com', 'Spencer James', 'U068AHB0Z8X', 'Spencer', 'agent'),
  ('mackenzie@ironsidecomputers.com', 'Mackenzie Zerkel', 'U067B04SKRP', 'Mackenzie', 'agent'),
  -- ... 10 more users
```

### execution_logs table (v23 uses this heavily)
```sql
CREATE TABLE execution_logs (
  id BIGSERIAL PRIMARY KEY,
  workflow_execution_id TEXT,
  node_name TEXT,
  function_name TEXT,
  parameters JSONB,
  result JSONB,
  success BOOLEAN,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- v23 logs EVERY step here for observability
```

### mention_resolution_logs table
```sql
CREATE TABLE mention_resolution_logs (
  id BIGSERIAL PRIMARY KEY,
  slack_user_id TEXT,
  resolved_email TEXT,
  resolution_method TEXT,  -- 'direct_id', 'display_name', 'fuzzy_match'
  resolution_time_ms INTEGER,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## OpenAI Function Schema Examples (v23 style)

### Function: search_tickets
```json
{
  "type": "function",
  "function": {
    "name": "search_tickets",
    "description": "Search for tickets in Gorgias based on filters",
    "parameters": {
      "type": "object",
      "properties": {
        "assignee_email": {
          "type": "string",
          "description": "Email of the ticket assignee"
        },
        "priority": {
          "type": "string",
          "enum": ["low", "normal", "high", "urgent"],
          "description": "Ticket priority level"
        },
        "status": {
          "type": "string",
          "enum": ["open", "pending", "closed"],
          "description": "Ticket status"
        },
        "limit": {
          "type": "integer",
          "description": "Maximum number of tickets to return",
          "default": 10
        }
      },
      "required": ["assignee_email"]
    }
  }
}
```

### Function: assign_ticket
```json
{
  "type": "function",
  "function": {
    "name": "assign_ticket",
    "description": "Reassign a ticket to a different agent",
    "parameters": {
      "type": "object",
      "properties": {
        "ticket_id": {
          "type": "integer",
          "description": "The ID of the ticket to reassign"
        },
        "assignee_email": {
          "type": "string",
          "description": "Email address of the new assignee"
        }
      },
      "required": ["ticket_id", "assignee_email"]
    }
  }
}
```

### Function: close_ticket
```json
{
  "type": "function",
  "function": {
    "name": "close_ticket",
    "description": "Close or resolve a ticket",
    "parameters": {
      "type": "object",
      "properties": {
        "ticket_id": {
          "type": "integer",
          "description": "The ID of the ticket to close"
        },
        "close_reason": {
          "type": "string",
          "description": "Reason for closing the ticket"
        }
      },
      "required": ["ticket_id"]
    }
  }
}
```

## Gorgias API Examples

### GET /tickets (Search)
```bash
GET https://ironsidecomputers.gorgias.com/api/tickets
  ?assignee_user[email]=spencer@ironsidecomputers.com
  &priority=high
  &status=open
  &limit=10

Response:
{
  "data": [
    {
      "id": 5678,
      "subject": "RAM upgrade question",
      "assignee_user": {
        "email": "spencer@ironsidecomputers.com",
        "name": "Spencer James"
      },
      "priority": "high",
      "status": "open",
      "created_datetime": "2024-01-10T15:30:00Z",
      "updated_datetime": "2024-01-12T09:15:00Z"
    }
  ],
  "meta": {
    "total_count": 1
  }
}
```

### PATCH /tickets/{id} (Assign)
```bash
PATCH https://ironsidecomputers.gorgias.com/api/tickets/5678

Body:
{
  "assignee_user": {
    "email": "collin@ironside.gg"
  }
}

Response:
{
  "id": 5678,
  "assignee_user": {
    "email": "collin@ironside.gg",
    "name": "Collin Bailey"
  },
  "updated_datetime": "2024-01-12T10:30:00Z"
}
```

## n8n Workflow Patterns

### Typical n8n Node Structure
```
Node 1: Slack Trigger
  ↓
Node 2: Parse User Input (Code/AI)
  ↓
Node 3: Function Router (Switch)
  ↓
Node 4: Execute Function (HTTP Request)
  ↓
Node 5: Log to Supabase
  ↓
Node 6: Format Response (Code)
  ↓
Node 7: Send to Slack
```

### n8n Code Node Example (JavaScript)
```javascript
// This runs inside n8n
const userMessage = $input.item.json.text;

// Can make HTTP requests
const response = await $http.request({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${$env.OPENAI_API_KEY}`
  },
  body: {
    model: 'gpt-4',
    messages: [
      { role: 'user', content: userMessage }
    ]
  }
});

// Can query Supabase
const { data } = await $supabase
  .from('gorgias_users')
  .select('email')
  .eq('slack_user_id', 'U8NC9D5AM');

// Must return array of objects
return [{
  json: {
    result: response.data,
    email: data[0].email
  }
}];
```

## Common User Commands & Expected Behavior

### Simple Commands (v23 handles these well)
```
Input: "close ticket 5678"
Expected:
  1. Parse: function=close_ticket, ticket_id=5678
  2. Execute: PATCH /tickets/5678 with status=closed
  3. Response: "✅ Closed ticket #5678"

Input: "assign ticket 5678 to collin"
Expected:
  1. Parse: function=assign_ticket, ticket_id=5678, assignee=collin
  2. Resolve: "collin" → "collin@ironside.gg"
  3. Execute: PATCH /tickets/5678 with assignee
  4. Response: "✅ Assigned ticket #5678 to @collin"
```

### Complex Commands (want to support, unclear if v19 handled)
```
Input: "assign spencer's urgent ticket to collin"
Expected:
  1. Parse: Need to find Spencer's urgent ticket
  2. Resolve: "spencer" → "spencer@ironsidecomputers.com"
  3. Query: GET /tickets?assignee=spencer&priority=high
  4. If 1 result: Use that ticket_id
  5. If 0 results: Error "No urgent tickets for Spencer"
  6. If 2+ results: Ask for clarification
  7. Resolve: "collin" → "collin@ironside.gg"
  8. Execute: PATCH /tickets/{id} with new assignee
  9. Response: "✅ Assigned ticket #5678 to @collin"

Input: "show me mackenzie's stuff from this week"
Expected:
  1. Parse: Search for Mackenzie's tickets from past 7 days
  2. Resolve: "mackenzie" → "mackenzie@ironsidecomputers.com"
  3. Query: GET /tickets?assignee=mackenzie&created_after=2024-01-05
  4. Format results as list
  5. Response: "Mackenzie has 3 tickets this week: [list]"
```

## Error Handling Patterns (v23 style)

```javascript
// Every function call is wrapped in try/catch
try {
  // Log start
  await logToSupabase({
    node: 'assign_ticket',
    status: 'started',
    parameters: { ticket_id, assignee_email }
  });

  // Execute
  const result = await gorgiasAPI.assignTicket(ticket_id, assignee_email);

  // Log success
  await logToSupabase({
    node: 'assign_ticket',
    status: 'success',
    result: result
  });

  return result;

} catch (error) {
  // Log error
  await logToSupabase({
    node: 'assign_ticket',
    status: 'error',
    error: error.message
  });

  // Return user-friendly error
  return {
    success: false,
    message: `Failed to assign ticket: ${error.message}`
  };
}
```

## Performance Metrics (v23)

```
Average execution time: 200-500ms per command
Success rate: ~95% (based on logs)
User resolution accuracy: 100% (with Slack ID mapping)
Error rate: ~5% (mostly user input issues, not system failures)

Common errors:
- "Ticket not found" (40% of errors)
- "User not found" (30% of errors)  
- "Multiple tickets match, be more specific" (20% of errors)
- API failures (10% of errors)
```

## Key Constraints

1. **Slack Rate Limits**: 1 message per second per channel
2. **OpenAI Rate Limits**: 10,000 tokens per minute
3. **Gorgias Rate Limits**: 600 requests per minute
4. **n8n Execution Timeout**: 2 minutes per workflow
5. **Context Window**: 128k tokens for GPT-4

## v23's Strengths (To Preserve)

1. **Observability**: Every step logged to Supabase
2. **Reliability**: Consistent behavior, ~95% success rate
3. **Debugging**: Can trace any execution via logs
4. **User Resolution**: 100% accurate with Slack ID mapping
5. **Error Handling**: Graceful failures with user-friendly messages

## v23's Weaknesses (To Improve)

1. **Rigidity**: Can't handle vague references ("that ticket", "his stuff")
2. **User Experience**: Requires more structured commands
3. **Natural Language**: Limited flexibility in phrasing
4. **Context**: Can't remember previous messages in thread
5. **Ambiguity**: Doesn't handle "find and assign" in one command

## What v19 Was Supposed to Improve

Based on it being called "Simple AI Agent":
- More natural language understanding
- Less rigid command structure  
- Better handling of ambiguous references
- More conversational interaction

## Critical Unknown: Why Did v19 Fail?

This is what Replit needs to help analyze:
- Was it architectural?
- Was it implementation?
- Was it prompts?
- Was it error handling?
- Was it something about function calling?
- Was it the "circular calls" issue?

---

## How to Use This Document

1. Copy the main prompt (replit-v19-analysis-prompt.md)
2. Include this supporting context as reference
3. Ask Replit to analyze based on:
   - The system architecture
   - The available tools and APIs
   - The success patterns in v23
   - The unknown failure modes in v19

The goal: Understand v19's architecture and failures deeply enough to design an improved hybrid system.
