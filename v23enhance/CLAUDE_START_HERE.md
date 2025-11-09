# Start Here, Claude Code!

## What This Project Does

Natural language Slack interface for Gorgias ticket management using AI function calling.

**In One Sentence**: Users type commands in Slack (@Gorgias Terminal), OpenAI detects intent, n8n executes Gorgias API calls, and responds conversationally—all with full observability logging.

---

## Architecture in 10 Seconds

```
User → Slack → OpenAI (intent) → n8n (execute) → Gorgias API → OpenAI (format) → Slack
                                       ↓
                                  Supabase (logs)
```

**Tech Stack**:
- **n8n**: Workflow orchestration
- **OpenAI GPT-4.1-mini**: Intent detection + conversational responses
- **OpenRouter Claude Sonnet 4.5**: Deep analytics (only for `analyze_insights`)
- **Gorgias API**: Ticket management system
- **Supabase**: PostgreSQL for logging and observability
- **Slack**: User interface

---

## Your First 5 Minutes

### 1. Read This First
- **`ARCHITECTURE.md`** - Comprehensive reference (read sections as needed)
- **`workflow.json`** - The actual n8n workflow
- **`NODE_MAP.json`** - Where everything lives physically

### 2. Understand the Core Flow

```
Slack @mention 
    ↓ (webhook)
Parse Slack (clean text, generate correlation_id)
    ↓
Build OpenAI Request (20+ function definitions)
    ↓
OpenAI Function Calling (intent → structured action)
    ↓
Handle Plan Response (parse function call)
    ↓
Router (21-way switch to correct action)
    ↓
Gorgias API Call (list, search, get, create, update, etc.)
    ↓
Log Everything (api_logs table)
    ↓
Process Results (deduplicate, summarize, calculate metrics)
    ↓
Format Response (tables, emoji)
    ↓
Conversational AI (GPT-4 with thread memory)
    ↓
Final Slack Reply
```

### 3. Key Insight: 3 AI Touchpoints

1. **OpenAI Function Call** - Converts natural language → structured action
2. **Pure n8n Logic** - Executes, filters, calculates (0 tokens!)
3. **OpenAI Conversational** - Converts structured data → natural language

**Why?** Token optimization. JavaScript handles heavy lifting, AI handles intelligence.

---

## Critical Files (Don't Break These)

| File | Why Critical | Can I Modify? |
|------|--------------|---------------|
| `nodes/parse-slack.js` | Everything depends on clean input | ⚠️ Add formatting rules only |
| `nodes/build-openai-request.js` | Defines all 20+ actions | ✅ Add functions, improve descriptions |
| `nodes/handle-plan-response.js` | Parses OpenAI function calls | ⚠️ Don't change output format |
| `nodes/calculate-metrics.js` | 100+ metrics, performance-critical | ✅ Add metrics, optimize calculations |
| **Route by Action** (Switch node) | Routes to correct API endpoint | ⚠️ Modify in n8n UI, not code |

---

## Safe Files (Modify Freely)

| File | What It Does | Safe Changes |
|------|--------------|--------------|
| `nodes/universal-formatter.js` | Pre-formats tables for Slack | ✅ Change formatting, add emoji |
| `nodes/get-action-emoji.js` | Maps actions to emoji | ✅ Add new emoji mappings |
| `nodes/format-error.js` | User-friendly error messages | ✅ Improve error messages |
| `nodes/client-side-filter.js` | Applies complex filters | ✅ Add new filters, optimize logic |

---

## How to Add a New Gorgias Action

**Example: Add "snooze_ticket" action**

### Step 1: Define Function
**File**: `nodes/build-openai-request.js`

Add to `tools` array:
```javascript
{
  type: "function",
  function: {
    name: "snooze_ticket",
    description: "Snooze a ticket until a specific date/time",
    parameters: {
      type: "object",
      properties: {
        ticket_id: { type: "string", description: "The ticket ID" },
        snooze_until: { type: "string", description: "ISO datetime (e.g., 2025-11-10T14:00:00Z)" }
      },
      required: ["ticket_id", "snooze_until"]
    }
  }
}
```

### Step 2: Add Router Case
**Location**: n8n UI → "Route by Action" switch node

- Add new case:
  - `value2`: `snooze_ticket`
  - `outputKey`: `snooze_ticket`
- Save node

### Step 3: Create HTTP Node
**Location**: n8n UI → Add new HTTP Request node

```javascript
Method: PUT
URL: {{ $vars.GORGIAS_BASE_URL }}/api/tickets/{{ $json.ticket_id }}
Headers:
  - Accept: application/json
  - Content-Type: application/json
Body:
{
  "snooze_until": "{{ $json.snooze_until }}"
}
```

### Step 4: Connect Flow
```
Route by Action → snooze_ticket → Format Log → Insert api_logs
                                     ↓
                              (on error) Error Handler
```

### Step 5: Test
```
@Gorgias Terminal snooze ticket 123 until tomorrow 2pm
```

OpenAI should call: `snooze_ticket(ticket_id="123", snooze_until="2025-11-07T14:00:00Z")`

---

## How to Debug

### Scenario: User reports "command not working"

**Step 1: Get correlation_id**
- Check Slack thread
- Or query: `SELECT * FROM agent_sessions WHERE user_id = 'U123' ORDER BY created_at DESC LIMIT 10`

**Step 2: Trace execution**
```sql
SELECT 
  node_name,
  method,
  url,
  status_code,
  error_message,
  created_at
FROM api_logs 
WHERE run_id = 'corr_2025-11-06_U09BSMA8U75_a3f2e1'
ORDER BY created_at;
```

**Step 3: Identify failure point**
- No records? → Parse Slack or OpenAI failed
- `error_message` present? → API call failed
- Wrong `node_name`? → Routing issue

**Step 4: Check request/response**
```sql
SELECT 
  request_body,
  response_body
FROM api_logs 
WHERE run_id = 'corr_...' AND node_name = 'search_tickets';
```

---

## Common Tasks

### Task: Add new filter type to search
**File**: `nodes/client-side-filter.js`

Add new filter block:
```javascript
// FILTER 7: New filter
if (filters.new_field) {
  const searchValue = filters.new_field.toLowerCase();
  tickets = tickets.filter(ticket => {
    // Your filter logic here
    return ticket.new_field?.toLowerCase().includes(searchValue);
  });
}
```

### Task: Improve OpenAI function descriptions
**File**: `nodes/build-openai-request.js`

Update function description for better intent detection:
```javascript
{
  name: "search_tickets",
  description: "Search for tickets using text search and/or filters like status, priority, assignee, customer, or tags. Use when user wants to find specific tickets matching criteria. Examples: 'show urgent tickets', 'find tickets from john@example.com', 'search billing issues'",
  // ...
}
```

### Task: Add new metric calculation
**File**: `nodes/calculate-metrics.js`

Add to appropriate section:
```javascript
operational_efficiency: {
  // ... existing metrics
  
  // New metric
  sla_breach_count: tickets.filter(t => {
    const age = getDaysSince(t.created_datetime);
    return age > 2 && t.status === 'open';
  }).length
}
```

### Task: Change formatting style
**File**: `nodes/universal-formatter.js`

Modify format functions:
```javascript
function formatListTickets(summaries, emoji) {
  // Change display limit
  const displayLimit = Math.min(15, summaries.length); // was 10
  
  // Customize output format
  output += `${index + 1}. 🎫 #${ticket.id} - ${ticket.subject}\n`;
  // ... your changes
}
```

---

## Questions to Ask When Stuck

### "Which node is failing?"
→ Check `api_logs` by `correlation_id`

### "What data format is expected?"
→ Check node's input in n8n UI or workflow.json

### "Why isn't OpenAI calling the right function?"
→ Check function descriptions in `Build OpenAI Request`

### "Why are results wrong?"
→ Check client-side filtering logic in `nodes/client-side-filter.js`

### "Why is it slow?"
→ Check Gorgias API response times in `api_logs.duration_ms`

### "How do I trace a specific user command?"
→ Get `correlation_id` from Slack thread, query `api_logs`

### "What actions are available?"
→ Check `nodes/build-openai-request.js` for all 20+ functions

---

## Performance Budget

| Operation | Target | Token Usage | Cost |
|-----------|--------|-------------|------|
| Simple query | <5s | 500-1000 | $0.001 |
| Search with filters | <8s | 700-1200 | $0.002 |
| Get single ticket | <4s | 400-800 | $0.001 |
| Analytics | <30s | 5000-15000 | $0.10 |

**Token Optimization Strategy**:
- OpenAI: Intent detection + natural language responses
- JavaScript: Filtering, calculations, formatting
- Result: 90% cost reduction vs. sending everything to AI

---

## What You Can Help With

### ✅ I Can Do Safely
- Add new Gorgias actions (follow pattern above)
- Improve error messages
- Add new filters to search
- Add new metrics calculations
- Optimize JavaScript performance
- Improve formatting and styling
- Add new emoji mappings

### ⚠️ Ask Me First
- Modify OpenAI function definitions (can break routing)
- Change database schema (requires migration)
- Modify core node output formats (breaks downstream)
- Change Router switch cases (can break flows)

### ❌ I Won't Do
- Remove existing functions or actions
- Change correlation_id generation
- Modify authentication handling
- Break backward compatibility

---

## Current Gaps (What Needs Building)

### 1. Proactive Ticket Notifications
**Status**: Not implemented  
**Need**: Gorgias webhook → n8n → Slack notification  
**File**: New workflow `webhook-notifications.json`

### 2. Visual Analytics Dashboard
**Status**: Data exists, UI missing  
**Need**: Connect Supabase to Retool/Metabase  
**Metrics**: Commands per day, response times, adoption

### 3. Training Materials
**Status**: Not created  
**Need**: Video walkthrough + command cheat sheet  
**File**: `docs/USER_GUIDE.md`

---

## Quick Reference: All Available Actions

1. `ask_clarification` - Ask user for missing info
2. `list_tickets` - List tickets with filters
3. `search_tickets` - Search with text + filters
4. `get_ticket` - Get specific ticket by ID
5. `create_ticket` - Create new ticket
6. `close_ticket` - Close a ticket
7. `assign_ticket` - Assign to agent
8. `set_priority` - Change priority
9. `set_status` - Change status
10. `add_tags` - Add tags
11. `remove_tags` - Remove tags
12. `update_tags` - Modify tags
13. `reply_public` - Public reply to customer
14. `comment_internal` - Internal note
15. `add_note` - Internal note (alias)
16. `find_user` - Find user by email
17. `list_customers` - List customers
18. `get_customer` - Get specific customer
19. `list_metrics` - Team performance metrics
20. `analyze_insights` - Deep analytics with Claude Sonnet

---

## Database Schema (Quick Reference)

```sql
-- agent_sessions: One per user command
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    action TEXT NOT NULL,
    thread_ts TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- api_logs: One per API call (multiple per session)
CREATE TABLE api_logs (
    id UUID PRIMARY KEY,
    run_id TEXT NOT NULL,  -- correlation_id
    node_name TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status_code INTEGER,
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    actor_user TEXT,
    ticket_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Next Steps

1. ✅ Read `ARCHITECTURE.md` for comprehensive reference
2. ✅ Review `workflow.json` to see actual implementation
3. ✅ Check `NODE_MAP.json` for physical locations
4. ✅ Look at `nodes/*.js` files for code details
5. ✅ Read `docs/DEBUGGING.md` for troubleshooting guide

---

## Remember

- **Always check correlation_id** when debugging
- **JavaScript first, AI second** for performance
- **Test in #test_gorgias** before production
- **Update NODE_MAP.json** when adding nodes
- **Maintain backward compatibility** in metrics

---

**You're ready! Start with a simple task like adding a new filter or improving error messages, then work your way up to adding new actions.** 🚀
