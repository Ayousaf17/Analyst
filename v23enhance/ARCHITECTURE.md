# Gorgias Terminal - Architecture Guide for Claude Code

## System Overview

```
Slack @mention → OpenAI Function Calling → n8n Router → Gorgias API → AI Response
                                              ↓
                                        Supabase Logs
```

**Tech Stack**:
- n8n: Workflow orchestration (visual + code nodes)
- OpenAI GPT-4.1-mini: Intent detection + conversational responses
- OpenRouter Claude Sonnet 4.5: Deep analytics only
- Gorgias API: Ticket management
- Supabase: PostgreSQL for logging
- Slack: User interface

---

## File Structure

```
gorgias-terminal/
├── workflow.json                 # Main n8n workflow export
├── ARCHITECTURE.md              # This file
├── CLAUDE_START_HERE.md         # Quick start for Claude Code
├── NODE_MAP.json                # Physical locations of all nodes
├── nodes/
│   ├── parse-slack.js           # Extract from workflow.json → "Parse Slack" node
│   ├── build-openai-request.js  # Extract from → "Build OpenAI Request" node
│   ├── handle-plan-response.js  # Extract from → "Handle Plan Response" node
│   ├── client-side-filter.js    # Extract from → "Filter Results" node
│   ├── calculate-metrics.js     # Extract from → "Calculate Standard Metrics" node
│   └── universal-formatter.js   # Extract from → "Universal Table Formatter" node
├── database/
│   ├── schema.sql               # Supabase table definitions
│   └── queries.sql              # Common queries for debugging
└── docs/
    ├── NODE_REFERENCE.md        # Detailed node documentation
    ├── DEBUGGING.md             # Common issues and fixes
    └── EXTENSION_GUIDE.md       # How to add new features
```

---

## Core Flow (State Machine)

```
User Input (Slack)
    ↓
Parse Slack (clean formatting, generate correlation_id)
    ↓
Build OpenAI Request (define 20+ functions)
    ↓
OpenAI Function Calling (intent → structured action)
    ↓
Handle Plan Response (parse function call)
    ↓
Format Session → Insert Session (DB tracking)
    ↓
Expand Plan → Split Steps (iterator)
    ↓
Normalize Step → Route by Action (21-way switch)
    ↓
[Gorgias API Calls] (list, search, get, create, update, etc.)
    ↓
Format Log → Insert api_logs (observability)
    ↓
Fetch Loop Results → Collect Results → Deduplicate
    ↓
Summarize Results for AI
    ↓
Calculate Standard Metrics (100+ metrics in pure JS)
    ↓
Get Action Emoji → Universal Table Formatter
    ↓
Conversational Response AI (GPT-4.1-mini with memory)
    ↓
Final Slack Reply
```

**Key Insight**: Data transforms through 3 AI touchpoints:
1. **OpenAI Function Call** (natural language → structured action)
2. **Pure n8n Logic** (execution + processing, 0 tokens)
3. **OpenAI Conversational** (structured data → natural language)

---

## Critical Nodes (Modify with Caution)

### 1. Parse Slack
**File**: `nodes/parse-slack.js`  
**ID**: `856221f1-944b-484e-ad42-8429ef857570`  
**Purpose**: Clean Slack formatting and generate correlation_id  
**Inputs**: Raw Slack event JSON  
**Outputs**: `{user_text, user_id, channel, thread_ts, correlation_id}`

**Critical Logic**:
```javascript
// Remove @mentions, mailto:, URL formatting
const cleaned = (text || '')
  .replace(/<@[^>]+>\s*/g, '')               // Remove @mentions
  .replace(/<mailto:([^|]+)\|[^>]+>/g, '$1') // Clean mailto links
  .replace(/<https?:\/\/([^|>]+)\|[^>]+>/g, '$1') // Clean URL links
  .replace(/<([^|>]+)>/g, '$1')              // Clean remaining angle brackets
  .trim();

// Generate correlation_id
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const random = Math.random().toString(36).substr(2, 6);
const correlation_id = `corr_${timestamp}_${user_id}_${random}`;
```

**Why This Matters**: All downstream nodes depend on clean text. Breaking this breaks everything.

**Safe to Modify**: 
- ✅ Add new formatting patterns
- ✅ Improve regex performance
- ❌ Don't change output structure (breaks downstream)
- ❌ Don't change correlation_id format (breaks tracking)

---

### 2. Build OpenAI Request
**File**: `nodes/build-openai-request.js`  
**ID**: `37e74536-b86c-41df-a263-c8d705671f23`  
**Purpose**: Define all available functions for OpenAI  
**Inputs**: User text from Parse Slack  
**Outputs**: OpenAI API request with 20+ function definitions

**Critical Structure**:
```javascript
const requestBody = {
  model: $vars.OPENAI_MODEL,
  messages: [
    {
      role: "user",
      content: userText
    }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "search_tickets",
        description: "Search for tickets using text search and/or filters...",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Text to search..." },
            status: { type: "string", enum: ["open", "closed", "pending"] },
            priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
            customer_email: { type: "string" },
            assignee_email: { type: "string" },
            tags: { type: "string" },
            limit: { type: "number", default: 30 }
          }
        }
      }
    },
    // ... 19+ more functions
  ],
  tool_choice: "auto",
  temperature: parseFloat($vars.OPENAI_TEMPERATURE_PLAN),
  max_tokens: parseInt($vars.OPENAI_MAX_TOKENS)
};
```

**Available Functions**:
1. `ask_clarification` - Ask user for missing info
2. `list_tickets` - List tickets with filters
3. `search_tickets` - Search with text and filters
4. `get_ticket` - Get specific ticket by ID
5. `create_ticket` - Create new ticket
6. `close_ticket` - Close a ticket
7. `assign_ticket` - Assign to agent
8. `set_priority` - Change priority
9. `set_status` - Change status
10. `add_tags` - Add tags
11. `remove_tags` - Remove tags
12. `reply_public` - Public reply to customer
13. `comment_internal` - Internal note
14. `find_user` - Find user by email
15. `list_customers` - List customers
16. `get_customer` - Get specific customer
17. `analyze_insights` - Deep analytics with Claude Sonnet

**Adding New Actions**:
1. Add function definition here
2. Add case to "Route by Action" switch (in n8n UI)
3. Create HTTP Request node for Gorgias API
4. Connect to "Format Log" node
5. Test in #test_gorgias

**Safe to Modify**:
- ✅ Add new functions
- ✅ Improve descriptions for better intent detection
- ✅ Add/modify parameters
- ⚠️ Changing existing function names breaks routing

---

### 3. Handle Plan Response
**File**: `nodes/handle-plan-response.js`  
**ID**: `37fc7cd6-03a7-41a9-9bde-5c4301536520`  
**Purpose**: Parse OpenAI function call into executable plan  
**Inputs**: OpenAI API response  
**Outputs**: `{plan: [{step: 1, action: "...", ...params}]}`

**Critical Logic**:
```javascript
const httpResponse = $json;
const message = httpResponse.choices[0].message;

let plan = [];

if (message.tool_calls && message.tool_calls.length > 0) {
  const toolCall = message.tool_calls[0];
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);
  
  // Convert to plan format
  plan = [{
    step: 1,
    action: functionName,
    ...functionArgs  // Spread all arguments into the plan
  }];
  
} else if (message.content && message.content.trim() !== '') {
  // OpenAI asked clarifying question
  plan = [{
    step: 1,
    action: 'ask_clarification',
    question: message.content
  }];
  
} else {
  // Fallback
  plan = [{
    step: 1,
    action: 'list_tickets',
    status: 'open',
    limit: 50
  }];
}
```

**Safe to Modify**:
- ✅ Add error handling
- ✅ Support multi-step plans (currently single-step)
- ✅ Improve fallback logic
- ❌ Don't change output format (Router expects this structure)

---

### 4. Route by Action
**Type**: Visual n8n Switch node (not code)  
**ID**: `a03da006-4c4f-4075-b78a-7bb611d84590`  
**Purpose**: Direct each action to correct Gorgias API endpoint

**Cases** (21 total):
```
ask_clarification → Format Clarification Response
list_tickets → list_tickets HTTP node
search_tickets → Build Search Request → Search Text → Filter Results
get_ticket → get_ticket HTTP node
create_ticket → create_ticket HTTP node
assign_ticket → assign_ticket HTTP node
set_priority → set_priority HTTP node
set_status → set_status HTTP node
update_tags → update_tags HTTP node
reply_public → reply_public HTTP node
comment_internal → comment_internal HTTP node
find_user → find_user HTTP node
list_customers → list_customers HTTP node
get_customer → get_customer HTTP node
add_tags → update_tags HTTP node
remove_tags → update_tags HTTP node
close_ticket → set_status HTTP node
add_note → comment_internal HTTP node
analyze_insights → Fetch Tickets for Analytics
```

**Adding New Action**:
1. Open n8n Switch node in UI
2. Add new case: `value2: "new_action"`
3. Set `outputKey: "new_action"`
4. Connect to new HTTP node

---

### 5. Client-Side Filtering
**File**: `nodes/client-side-filter.js`  
**ID**: `27459d00-cc21-4aaa-aa9a-5cb15ca0b6ed`  
**Purpose**: Apply complex filters Gorgias API doesn't support  
**Why**: Gorgias search API has limited filter capabilities

**Critical Logic**:
```javascript
// Access Merge node inputs
const buildRequest = $input.first().json;
const searchResponse = $input.last().json;

// Extract the client-side filters object
const filters = buildRequest._client_side_filters || {};

// Extract tickets from API response
let tickets = searchResponse.body?.data || searchResponse.data || searchResponse;

console.log(`📊 Initial ticket count: ${tickets.length}`);

// FILTER 1: Status
if (filters.status) {
  tickets = tickets.filter(ticket =>
    ticket.status?.toLowerCase() === filters.status.toLowerCase()
  );
}

// FILTER 2: Priority
if (filters.priority) {
  tickets = tickets.filter(ticket =>
    ticket.priority?.toLowerCase() === filters.priority.toLowerCase()
  );
}

// FILTER 3: Assignee Email (supports partial matching)
if (filters.assignee_email) {
  const searchValue = filters.assignee_email.toLowerCase();
  tickets = tickets.filter(ticket => {
    if (!ticket.assignee_user) return false;
    const email = ticket.assignee_user.email?.toLowerCase() || '';
    
    // Exact match if contains @, otherwise partial
    return searchValue.includes('@') 
      ? email === searchValue 
      : email.includes(searchValue);
  });
}

// FILTER 4: Customer Email
if (filters.customer_email) {
  const searchValue = filters.customer_email.toLowerCase();
  tickets = tickets.filter(ticket => {
    if (!ticket.customer) return false;
    const email = ticket.customer.email?.toLowerCase() || '';
    
    return searchValue.includes('@') 
      ? email === searchValue 
      : email.includes(searchValue);
  });
}

// FILTER 5: Tags
if (filters.tags) {
  const searchTag = filters.tags.toLowerCase();
  tickets = tickets.filter(ticket => {
    if (!ticket.tags || !Array.isArray(ticket.tags)) return false;
    return ticket.tags.some(tag =>
      tag.name?.toLowerCase().includes(searchTag)
    );
  });
}

// FILTER 6: Date Range
if (filters.date_from || filters.date_to) {
  tickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.created_datetime);
    
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from);
      if (ticketDate < fromDate) return false;
    }
    
    if (filters.date_to) {
      const toDate = new Date(filters.date_to);
      toDate.setDate(toDate.getDate() + 1); // Include entire end date
      if (ticketDate >= toDate) return false;
    }
    
    return true;
  });
}

console.log(`📊 Final ticket count after all filters: ${tickets.length}`);
```

**Why This Matters**: Gorgias API search endpoint only supports basic text search. All complex filtering happens here.

**Safe to Modify**:
- ✅ Add new filter types
- ✅ Improve filter logic (case-insensitive, partial matching)
- ✅ Optimize performance
- ❌ Don't remove existing filters (breaks search functionality)

---

### 6. Calculate Standard Metrics
**File**: `nodes/calculate-metrics.js`  
**ID**: `3b25ce38-0911-4961-932c-05b605694cd1`  
**Purpose**: Pre-calculate 100+ metrics in pure JavaScript (0 tokens!)  
**Inputs**: Ticket array  
**Outputs**: Comprehensive metrics object

**Key Sections**:
```javascript
function calculateStandardMetrics(tickets) {
  return {
    meta: {
      calculated_at: new Date().toISOString(),
      ticket_count: tickets.length,
      date_range: { oldest, newest, span_days }
    },
    
    team_performance: {
      volume: { total_agents, tickets_per_agent_avg, workload_stddev },
      by_agent: [{ name, total_assigned, close_rate, avg_resolution_hours }],
      rankings: { by_volume, by_close_rate, by_speed },
      benchmarks: { top_performer, avg_close_rate, median_resolution_hours }
    },
    
    operational_efficiency: {
      flow: { new_today, closed_today, velocity, burn_rate, days_to_clear_backlog },
      backlog: { total_open, age_distribution, oldest_ticket_age_days },
      resolution: { avg_resolution_hours, p50, p75, p90, p95 },
      priority_distribution: { urgent, high, normal, low },
      status_distribution: { open, closed, pending, spam }
    },
    
    customer_experience: {
      customer_metrics: { total_customers, repeat_customers, high_volume_customers },
      top_customers: [{ email, total_tickets, status, last_contact_days_ago }]
    },
    
    quality_patterns: {
      time_patterns: { busiest_hour, slowest_hour, busiest_day, slowest_day },
      channels: { by_channel, by_channel_performance },
      tags: { most_common: [{ tag, count }] }
    }
  };
}
```

**Calculated Metrics** (100+ total):
- **Team Performance**: Volume per agent, close rates, resolution times, rankings
- **Operational Efficiency**: Flow rates, backlog age, resolution percentiles
- **Customer Experience**: Repeat customers, high-volume customers, engagement
- **Quality Patterns**: Time distribution, channel performance, tag usage

**Why This Matters**: Calculating metrics in JS vs. AI saves ~$0.05-0.10 per query and reduces latency by 2-3 seconds.

**Safe to Modify**:
- ✅ Add new metrics
- ✅ Optimize calculations
- ✅ Add new categories
- ⚠️ Maintain backward compatibility (don't remove existing metrics)

---

### 7. Universal Table Formatter
**File**: `nodes/universal-formatter.js`  
**ID**: `d8ac080f-2a36-4cac-abe1-2ccf80a0dc17`  
**Purpose**: Pre-format tables to reduce AI token usage  
**Inputs**: Ticket summaries + action type + emoji  
**Outputs**: Formatted Slack message

**Critical Logic**:
```javascript
function formatListTickets(summaries, emoji) {
  if (summaries.length === 0) {
    return `${emoji} No tickets found matching your criteria.`;
  }

  const displayLimit = Math.min(10, summaries.length);
  const tickets = summaries.slice(0, displayLimit);
  
  let output = `${emoji} Found ${summaries.length} ticket(s)`;
  if (summaries.length > displayLimit) {
    output += ` (showing first ${displayLimit})`;
  }
  output += `:\n\n`;
  
  tickets.forEach((ticket, index) => {
    const messageBody = ticket.first_message?.body_text 
                     || ticket.excerpt 
                     || 'No message available';
    const preview = messageBody.length > 150
      ? messageBody.substring(0, 150) + '...'
      : messageBody;
    
    output += `${index + 1}. 🎫 #${ticket.id} - ${ticket.subject || 'No Subject'}\n`;
    output += `   📊 ${ticket.status || 'unknown'} | ${ticket.priority || 'normal'} priority`;
    
    if (ticket.customer_name || ticket.customer_email) {
      output += ` | ${ticket.customer_name || ticket.customer_email}`;
    }
    
    output += `\n`;
    
    if (ticket.assignee) {
      output += `   👤 Assigned to: ${ticket.assignee}\n`;
    }
    
    output += `   💬 "${preview}"\n`;
    
    if (ticket.tags && ticket.tags.length > 0) {
      output += `   🏷️  ${ticket.tags.slice(0, 3).join(', ')}\n`;
    }
    
    output += `\n`;
  });
  
  if (summaries.length > displayLimit) {
    output += `... and ${summaries.length - displayLimit} more ticket(s)\n\n`;
  }
  
  output += `💡 Quick Actions:\n`;
  output += `• View details: "@Gorgias Terminal get ticket [ID]"\n`;
  output += `• Search: "@Gorgias Terminal search tickets about [topic]"`;
  
  return output;
}

function formatGetTicket(summaries, emoji) {
  const ticket = summaries[0];
  const messageBody = ticket.first_message?.body_text 
                   || ticket.excerpt 
                   || 'No message content available';
  
  let output = `${emoji} Ticket #${ticket.id} - ${ticket.subject || 'No Subject'}\n\n`;
  output += `📋 Details:\n`;
  output += `• Status: ${ticket.status || 'Unknown'}\n`;
  output += `• Priority: ${ticket.priority || 'Unknown'}\n`;
  output += `• Customer: ${ticket.customer_name || ticket.customer_email || 'Unknown'}\n`;
  output += `• Assignee: ${ticket.assignee || 'Unassigned'}\n`;
  output += `• Created: ${ticket.created || 'Unknown'}\n`;
  output += `• Last updated: ${ticket.updated || 'Unknown'}\n`;
  output += `• Messages: ${ticket.message_count || 'Unknown'}\n`;
  output += `• Tags: ${ticket.tags?.length > 0 ? ticket.tags.join(', ') : 'None'}\n\n`;
  output += `💬 Customer Message:\n"${messageBody}"\n\n`;
  output += `💡 Quick Actions:\n`;
  output += `• Assign: "@Gorgias Terminal assign ticket ${ticket.id} to [email]"\n`;
  output += `• Add note: "@Gorgias Terminal add note to ticket ${ticket.id}: [message]"\n`;
  output += `• Update priority: "@Gorgias Terminal set ticket ${ticket.id} priority to urgent"`;
  
  return output;
}
```

**Why This Matters**: Pre-formatting saves ~200-400 tokens per response (~$0.0002-0.0004 per query).

**Safe to Modify**:
- ✅ Change formatting style
- ✅ Add new action formatters
- ✅ Adjust display limits
- ✅ Add emoji/styling

---

## Database Schema

```sql
-- agent_sessions: One record per user command
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    action TEXT NOT NULL,
    origin TEXT DEFAULT 'ai-agent-with-fallback',
    thread_ts TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON agent_sessions(user_id);
CREATE INDEX idx_sessions_thread ON agent_sessions(thread_ts);
CREATE INDEX idx_sessions_created ON agent_sessions(created_at DESC);

-- api_logs: One record per API call (N per session)
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT,
    node_name TEXT NOT NULL,
    duration_ms INTEGER,
    run_id TEXT NOT NULL,  -- correlation_id from agent_sessions
    direction TEXT CHECK (direction IN ('request', 'response')),
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status_code INTEGER,
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    actor_user TEXT,
    channel TEXT,
    thread_ts TEXT,
    ticket_id TEXT,
    tags TEXT[],
    extra JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_run_id ON api_logs(run_id);
CREATE INDEX idx_logs_ticket ON api_logs(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_logs_created ON api_logs(created_at DESC);
CREATE INDEX idx_logs_errors ON api_logs(error_message) WHERE error_message IS NOT NULL;
```

---

## Debugging Workflow

### Finding Issues by correlation_id

```sql
-- Get full execution trace
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

-- Get request/response for specific step
SELECT 
  request_body,
  response_body
FROM api_logs 
WHERE run_id = 'corr_...' AND node_name = 'search_tickets';

-- Find all errors in last 24 hours
SELECT 
  run_id,
  node_name,
  error_message,
  actor_user,
  created_at
FROM api_logs 
WHERE error_message IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Find slow queries
SELECT 
  node_name,
  AVG(duration_ms) as avg_ms,
  MAX(duration_ms) as max_ms,
  COUNT(*) as count
FROM api_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY node_name
ORDER BY avg_ms DESC;
```

### Common Issues

| Symptom | Root Cause | Fix Location | SQL Query |
|---------|-----------|--------------|-----------|
| "Not understanding command" | Function definitions unclear | `Build OpenAI Request` node | Check OpenAI logs |
| "Search returns wrong tickets" | Filter logic error | `Client-Side Filter` node | Check request filters |
| "Getting errors" | API call failed | Check specific HTTP node | `SELECT * FROM api_logs WHERE error_message IS NOT NULL` |
| "Slow analytics" | Too many tickets | `Fetch Tickets for Analytics` | Check response_body size |
| "Duplicate tickets" | Deduplication failed | `Deduplicate Results` node | Check ticket IDs in results |

---

## Extension Points

### Adding a New Gorgias Action

**Example: Add "bulk_close_tickets" action**

**Step 1: Define Function** (`Build OpenAI Request` node):
```javascript
{
  type: "function",
  function: {
    name: "bulk_close_tickets",
    description: "Close multiple tickets at once by ticket IDs",
    parameters: {
      type: "object",
      properties: {
        ticket_ids: { 
          type: "string", 
          description: "Comma-separated ticket IDs (e.g., '123,456,789')" 
        }
      },
      required: ["ticket_ids"]
    }
  }
}
```

**Step 2: Add Router Case** (Switch node in n8n UI):
- Open "Route by Action" switch node
- Add new case:
  - Value: `bulk_close_tickets`
  - Output Key: `bulk_close_tickets`
- Connect to new node

**Step 3: Create Processing Node**:
```javascript
// Node: Process Bulk Close
const ticketIds = $json.ticket_ids.split(',').map(id => id.trim());

return ticketIds.map(ticket_id => ({
  json: {
    ticket_id,
    status: 'closed',
    correlation_id: $json.correlation_id,
    slack_channel: $json.slack_channel,
    slack_thread_ts: $json.slack_thread_ts,
    user_id: $json.user_id
  }
}));
```

**Step 4: Loop Through Tickets**:
Connect to existing `set_status` HTTP node with loop

**Step 5: Test**:
```
@Gorgias Terminal close tickets 123, 456, 789
```

---

## Performance Budget

| Operation | Target | Current | Budget | Token Usage | Cost |
|-----------|--------|---------|--------|-------------|------|
| Simple query latency | <5s | 3-5s | ✅ | 500-1000 | $0.001 |
| Search with filters | <8s | 5-8s | ✅ | 700-1200 | $0.002 |
| Get single ticket | <4s | 2-4s | ✅ | 400-800 | $0.001 |
| Analytics (1000 tickets) | <30s | 15-25s | ✅ | 5000-15000 | $0.10 |

**Token Optimization Strategy**:
```
Phase 1: Intent Detection (200-400 tokens)
   ↓
Phase 2: Execution (0 tokens - pure n8n)
   ↓
Phase 3: Processing (0 tokens - JS calculations)
   ↓
Phase 4: Response (300-600 tokens)

Total per query: ~500-1000 tokens (~$0.001-0.005)
```

**Why This Works**:
- OpenAI for intelligence (intent detection, natural language)
- JavaScript for computation (filtering, metrics, formatting)
- Result: 90% cost reduction vs. sending everything to AI

---

## What Claude Code Should Do

### ✅ Safe Operations
- Add new Gorgias actions (following pattern above)
- Improve error messages
- Add new filters to client-side filtering
- Add new metrics to Calculate Standard Metrics
- Optimize JavaScript performance
- Add logging/debugging statements
- Improve regex patterns in Parse Slack
- Update formatting in Universal Table Formatter

### ⚠️ Ask First
- Modify OpenAI function definitions (can break routing)
- Change database schema (requires migration)
- Modify output formats from core nodes (breaks downstream)
- Change Router switch cases (can break existing flows)
- Add new environment variables

### ❌ Don't Do Without Approval
- Remove existing functions or actions
- Change correlation_id generation logic
- Modify Supabase table structures
- Change authentication/credentials handling
- Break backward compatibility

---

## Current Gaps (What Needs Building)

### 1. Proactive Ticket Notifications
**Status**: Not implemented  
**Need**: Gorgias webhook → n8n → Parse → Slack notification  
**Location**: New workflow file `webhook-notifications.json`

**Implementation Plan**:
```
Gorgias Webhook (new ticket created)
    ↓
Webhook Trigger (n8n)
    ↓
Parse Ticket Data
    ↓
Generate AI Summary
    ↓
Format Slack Message
    ↓
Post to #support-tickets channel
    ↓
Log to agent_sessions
```

### 2. Visual Analytics Dashboard
**Status**: Data exists, UI missing  
**Need**: Query Supabase → Generate charts  
**Options**: Supabase Dashboard, Retool, or Metabase

**Key Metrics to Display**:
- Commands per day/week
- Most used actions
- Response times
- Tickets processed (agent vs. manual)
- Error rates
- Team adoption metrics

### 3. Training Materials
**Status**: No formal documentation yet  
**Need**: Video walkthrough + command cheat sheet  
**Location**: `docs/USER_GUIDE.md`

---

## Environment Variables

```bash
# OpenAI Configuration
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TEMPERATURE_PLAN=0.1
OPENAI_MAX_TOKENS=4000

# Gorgias Configuration
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com

# Supabase (set in n8n credentials, not env vars)
# SUPABASE_URL=https://...
# SUPABASE_KEY=...

# Slack (set in n8n credentials)
# SLACK_BOT_TOKEN=xoxb-...
```

---

## Questions to Ask When Stuck

1. **"Which node is failing?"** → Check `api_logs` by `correlation_id`
2. **"What data format is expected?"** → Check node's input in n8n UI
3. **"Why isn't OpenAI calling the right function?"** → Check function descriptions
4. **"Why are results wrong?"** → Check client-side filtering logic
5. **"Why is it slow?"** → Check Gorgias API response times in logs
6. **"How do I trace a specific user command?"** → Get correlation_id from Slack, query `api_logs`

---

## Token Economics (Why We Do Things This Way)

### Bad Approach (Naive):
```
Fetch 50 tickets → Send all to AI → Ask AI to filter/format/analyze
Tokens: ~8000 
Cost: ~$0.04 per query
Latency: 8-12 seconds
```

### Our Approach (Optimized):
```
Fetch 50 tickets → Filter in JS → Format in JS → Calculate metrics in JS → Send summary to AI
Tokens: ~800 
Cost: ~$0.004 per query
Latency: 4-6 seconds

Savings: 90% cost reduction, 40% latency reduction
```

**Rule of Thumb**: If JavaScript can do it, don't use AI tokens.

**When to Use AI**:
- Natural language understanding (intent detection)
- Semantic analysis (clustering similar questions)
- Natural language generation (conversational responses)

**When to Use JavaScript**:
- Filtering and sorting
- Mathematical calculations
- Data transformations
- String formatting
- Metrics aggregation

---

## Success Metrics

### System Health
- ✅ Uptime: 99.5%+
- ✅ Error rate: <2%
- ✅ Avg response time: <5s for simple queries
- ✅ Token usage: <1000 per query

### Business Impact
- ✅ Commands per day: Tracked in `agent_sessions`
- ✅ Tickets processed: Tracked in `api_logs`
- ✅ Team adoption: Tracked by `actor_user`
- ✅ Cost per query: ~$0.001-0.005

### User Satisfaction
- ⏳ Response accuracy: Measure via feedback
- ⏳ User adoption rate: Track active users
- ⏳ Time saved: Compare vs. manual Gorgias usage

---

## End of Architecture Guide

**Next Steps**:
1. Read `CLAUDE_START_HERE.md` for quick orientation
2. Review `NODE_MAP.json` for physical locations
3. Check `workflow.json` for actual implementation
4. Look at individual `nodes/*.js` files for code details
5. Review `docs/` for specialized documentation

For questions or issues, refer to:
- `docs/DEBUGGING.md` - Common problems and solutions
- `docs/NODE_REFERENCE.md` - Detailed node documentation
- `docs/EXTENSION_GUIDE.md` - How to add features
