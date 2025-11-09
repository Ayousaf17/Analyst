# Extension Guide - Adding Features to Gorgias Terminal

## Overview

This guide shows you how to safely add new features to the Gorgias Terminal workflow.

**Before you start**: Read `ARCHITECTURE.md` and `CLAUDE_START_HERE.md` for context.

---

## Table of Contents

1. [Adding a New Gorgias Action](#adding-a-new-gorgias-action)
2. [Adding Client-Side Filters](#adding-client-side-filters)
3. [Adding New Metrics](#adding-new-metrics)
4. [Adding Response Formatting](#adding-response-formatting)
5. [Adding Error Handling](#adding-error-handling)
6. [Adding Workflow Automations](#adding-workflow-automations)

---

## Adding a New Gorgias Action

**Use case**: You want to add support for a new Gorgias operation (e.g., snooze ticket, add attachment, bulk close).

### Step 1: Define the OpenAI Function

**File**: `nodes/build-openai-request.js`

Add to the `tools` array:

```javascript
{
  type: "function",
  function: {
    name: "snooze_ticket",
    description: "Snooze a ticket until a specific date/time. Use when user wants to defer, postpone, or snooze a ticket. Examples: 'snooze ticket 123 until tomorrow', 'postpone ticket 456 for 2 hours'",
    parameters: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "The ticket ID to snooze"
        },
        snooze_until: {
          type: "string",
          description: "ISO datetime string (e.g., '2025-11-07T14:00:00Z')"
        },
        reason: {
          type: "string",
          description: "Optional reason for snoozing (e.g., 'waiting for customer response')"
        }
      },
      required: ["ticket_id", "snooze_until"]
    }
  }
}
```

**Tips for good descriptions**:
- ✅ Include examples of user phrases
- ✅ Use synonyms (snooze, postpone, defer)
- ✅ Describe when to use this function
- ❌ Don't be too technical

### Step 2: Add Router Case

**Location**: n8n UI → "Route by Action" switch node

1. Open n8n workflow
2. Click on "Route by Action" switch node
3. Add new case:
   - `value2`: `snooze_ticket`
   - `outputKey`: `snooze_ticket`
4. Save node

### Step 3: Create HTTP Request Node

**Location**: n8n UI → Add new HTTP Request node

**Configuration**:
```
Name: snooze_ticket
Method: PUT
URL: {{ $vars.GORGIAS_BASE_URL }}/api/tickets/{{ $json.ticket_id }}
Authentication: HTTP Basic Auth (Gorgias credentials)
Headers:
  - Accept: application/json
  - Content-Type: application/json
Body (JSON):
{
  "snooze_until": "{{ $json.snooze_until }}",
  "meta": {
    "snooze_reason": "{{ $json.reason }}"
  }
}
Options:
  - Full Response: true
  - Response Format: json
```

### Step 4: Connect the Flow

**Connections**:
```
Route by Action → snooze_ticket → Format Log → Insert api_logs
                                      ↓
                              (on error) Error Handler
```

### Step 5: Test

In `#test_gorgias` channel:

```
@Gorgias Terminal snooze ticket 123 until tomorrow 2pm
@Gorgias Terminal postpone ticket 456 for 3 hours
@Gorgias Terminal defer ticket 789 until next monday
```

**Verify**:
1. OpenAI calls `snooze_ticket` function
2. Router directs to `snooze_ticket` node
3. API call succeeds
4. Log appears in `api_logs` table
5. User gets confirmation in Slack

### Step 6: Update Documentation

**Files to update**:
- `NODE_MAP.json` - Add node metadata
- `ARCHITECTURE.md` - Add to function list
- This file - Add to examples

---

## Adding Client-Side Filters

**Use case**: Gorgias API doesn't support filtering by a specific field, so you need to filter client-side.

### Example: Filter by Customer Name

**File**: `nodes/client-side-filter.js`

Add new filter block:

```javascript
// FILTER 7: Customer Name (partial match)
if (filters.customer_name) {
  const beforeCount = tickets.length;
  const searchValue = filters.customer_name.toLowerCase();
  
  tickets = tickets.filter(ticket => {
    if (!ticket.customer) return false;
    
    const name = ticket.customer.name?.toLowerCase() || '';
    const firstname = ticket.customer.firstname?.toLowerCase() || '';
    const lastname = ticket.customer.lastname?.toLowerCase() || '';
    
    return name.includes(searchValue) ||
           firstname.includes(searchValue) ||
           lastname.includes(searchValue);
  });
  
  console.log(`✅ Customer name filter (${filters.customer_name}): ${beforeCount} → ${tickets.length}`);
}
```

**Then update** `nodes/build-openai-request.js` to support the new parameter:

```javascript
// In search_tickets function definition
parameters: {
  type: "object",
  properties: {
    // ... existing properties
    customer_name: {
      type: "string",
      description: "Filter by customer name (partial match, case-insensitive)"
    }
  }
}
```

**Test**:
```
@Gorgias Terminal search tickets from customers named John
@Gorgias Terminal find tickets where customer is Smith
```

---

## Adding New Metrics

**Use case**: You want to calculate a new metric in `Calculate Standard Metrics` node.

### Example: SLA Breach Count

**File**: `nodes/calculate-metrics.js`

Find the appropriate section and add your metric:

```javascript
operational_efficiency: {
  flow: { /* ... existing metrics ... */ },
  backlog: { /* ... existing metrics ... */ },
  resolution: { /* ... existing metrics ... */ },
  
  // NEW: SLA Metrics
  sla_metrics: {
    // Tickets open > 48 hours
    breach_count: tickets.filter(t => {
      const age = getDaysSince(t.created_datetime);
      return age > 2 && t.status === 'open';
    }).length,
    
    // Tickets at risk (24-48 hours)
    at_risk_count: tickets.filter(t => {
      const age = getDaysSince(t.created_datetime);
      return age >= 1 && age <= 2 && t.status === 'open';
    }).length,
    
    // Compliance rate
    compliance_rate: tickets.filter(t => t.status === 'closed').length > 0
      ? (tickets.filter(t => {
          const resolutionHours = getHoursSince(t.created_datetime) - getHoursSince(t.closed_datetime);
          return resolutionHours <= 48;
        }).length / tickets.filter(t => t.status === 'closed').length)
      : 0
  }
}
```

**Make sure to**:
- Use existing helper functions (`getDaysSince`, `getHoursSince`, etc.)
- Handle edge cases (empty arrays, null values)
- Keep calculations fast (O(n) or better)

**Test**:
```javascript
// In n8n, test with sample data
const testTickets = [
  { id: 1, status: 'open', created_datetime: '2025-11-01T10:00:00Z' },
  { id: 2, status: 'closed', created_datetime: '2025-11-04T10:00:00Z', closed_datetime: '2025-11-05T12:00:00Z' }
];

const metrics = calculateStandardMetrics(testTickets);
console.log('SLA Metrics:', metrics.operational_efficiency.sla_metrics);
```

---

## Adding Response Formatting

**Use case**: You want to customize how certain data is displayed in Slack.

### Example: Format SLA Breach Warnings

**File**: `nodes/universal-formatter.js`

Add new formatter function:

```javascript
function formatSlaWarnings(metrics, emoji) {
  const sla = metrics.operational_efficiency.sla_metrics;
  
  if (sla.breach_count === 0 && sla.at_risk_count === 0) {
    return `${emoji} ✅ All tickets within SLA!`;
  }
  
  let output = `${emoji} ⚠️ SLA Status\n\n`;
  
  if (sla.breach_count > 0) {
    output += `🔴 ${sla.breach_count} ticket(s) breached SLA (>48h)\n`;
  }
  
  if (sla.at_risk_count > 0) {
    output += `🟡 ${sla.at_risk_count} ticket(s) at risk (24-48h)\n`;
  }
  
  output += `\n📊 Compliance Rate: ${(sla.compliance_rate * 100).toFixed(1)}%\n`;
  output += `\n💡 Quick Actions:\n`;
  output += `• View breached: "@Gorgias Terminal show tickets over 48 hours old"\n`;
  output += `• View at risk: "@Gorgias Terminal show tickets 24-48 hours old"`;
  
  return output;
}
```

Then call it from main formatter:

```javascript
// In universal-formatter.js main logic
if (action === 'sla_status') {
  formattedOutput = formatSlaWarnings(metrics, emoji);
}
```

---

## Adding Error Handling

**Use case**: You want to add specific error handling for a new error type.

### Example: Handle Gorgias Rate Limit

**File**: `nodes/error-handler.js`

Add detection logic:

```javascript
// Determine error type
let errorType = error.error_type || 'UnknownError';

// NEW: Detect rate limit
if (error.http_status === 429 || 
    error.error_message?.includes('rate limit') ||
    error.error_message?.includes('too many requests')) {
  errorType = 'RateLimitError';
}
```

**File**: `nodes/format-error.js`

Add user-friendly message:

```javascript
const errorTypeMessages = {
  'HTTPError': '🌐 Network error while communicating with the API',
  'RateLimitError': '⏱️ Rate limit exceeded. Please try again in a few moments',
  // ... other error types
};
```

**Add retry logic** (if applicable):

**File**: Create new node `nodes/retry-handler.js`

```javascript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function retryWithBackoff(fn, retries = MAX_RETRIES) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.status_code === 429) {
      console.log(`⏱️ Rate limited, retrying in ${RETRY_DELAY_MS}ms (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return retryWithBackoff(fn, retries - 1);
    }
    throw error;
  }
}
```

---

## Adding Workflow Automations

**Use case**: You want to add automated actions (e.g., auto-close old tickets, daily digest).

### Example: Daily Digest Workflow

**Create new n8n workflow**: `daily-digest.json`

```json
{
  "name": "Daily Digest - Gorgias Terminal",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 9 * * 1-5" }]
        }
      }
    },
    {
      "name": "Fetch Yesterday's Sessions",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "table": "agent_sessions",
        "filters": {
          "conditions": [
            {
              "keyName": "created_at",
              "condition": "gte",
              "keyValue": "={{ $now.minus(1, 'day').toISO() }}"
            }
          ]
        }
      }
    },
    {
      "name": "Calculate Daily Stats",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "/* Calculate stats */\nconst sessions = $input.all();\n\nconst stats = {\n  total_commands: sessions.length,\n  unique_users: new Set(sessions.map(s => s.json.user_id)).size,\n  by_action: {},\n  errors: 0\n};\n\nsessions.forEach(s => {\n  const action = s.json.action;\n  stats.by_action[action] = (stats.by_action[action] || 0) + 1;\n});\n\nreturn [{ json: stats }];"
      }
    },
    {
      "name": "Format Digest Message",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const stats = $json;\n\nconst message = `📊 *Daily Digest - ${new Date().toDateString()}*\n\n📈 Usage:\n• Total commands: ${stats.total_commands}\n• Active users: ${stats.unique_users}\n\n🔝 Top Actions:\n${Object.entries(stats.by_action)\n  .sort((a, b) => b[1] - a[1])\n  .slice(0, 5)\n  .map(([action, count]) => `• ${action}: ${count}`)\n  .join('\\n')}\n`;\n\nreturn [{ json: { text: message } }];"
      }
    },
    {
      "name": "Post to Slack",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channelId": "C09BXTD0WR0",
        "text": "={{ $json.text }}"
      }
    }
  ]
}
```

**Activate**:
1. Import workflow to n8n
2. Connect to Slack
3. Set schedule (9am weekdays)
4. Activate workflow

---

## Adding Proactive Notifications

**Use case**: You want to notify Slack when new tickets arrive in Gorgias.

### Create Gorgias Webhook Handler

**Create new workflow**: `webhook-notifications.json`

**Step 1: Gorgias Webhook Setup**

1. Go to Gorgias → Settings → API → Webhooks
2. Create webhook:
   - URL: `https://your-n8n.com/webhook/gorgias-ticket-created`
   - Events: `ticket.created`
   - Secret: Generate and save

**Step 2: n8n Webhook Workflow**

```json
{
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "gorgias-ticket-created",
        "responseMode": "responseNode",
        "authentication": "headerAuth"
      }
    },
    {
      "name": "Verify Webhook",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Verify Gorgias webhook signature\nconst crypto = require('crypto');\n\nconst signature = $('Webhook Trigger').item.json.headers['x-gorgias-signature'];\nconst secret = $vars.GORGIAS_WEBHOOK_SECRET;\nconst payload = JSON.stringify($('Webhook Trigger').item.json.body);\n\nconst hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');\n\nif (hash !== signature) {\n  throw new Error('Invalid webhook signature');\n}\n\nreturn $input.all();"
      }
    },
    {
      "name": "Extract Ticket Data",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const event = $json.body;\nconst ticket = event.ticket;\n\nreturn [{\n  json: {\n    ticket_id: ticket.id,\n    subject: ticket.subject,\n    customer_email: ticket.customer.email,\n    customer_name: ticket.customer.name,\n    priority: ticket.priority,\n    status: ticket.status,\n    created: ticket.created_datetime,\n    excerpt: ticket.excerpt\n  }\n}];"
      }
    },
    {
      "name": "Generate AI Summary",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "parameters": {
        "promptType": "define",
        "text": "Summarize this ticket in 1-2 sentences:\n\nSubject: {{ $json.subject }}\nCustomer: {{ $json.customer_name }}\nMessage: {{ $json.excerpt }}"
      }
    },
    {
      "name": "Format Slack Message",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const ticket = $('Extract Ticket Data').item.json;\nconst summary = $json.output;\n\nconst message = `🎫 *New Ticket #${ticket.ticket_id}*\n\n*Subject:* ${ticket.subject}\n*From:* ${ticket.customer_name} (${ticket.customer_email})\n*Priority:* ${ticket.priority}\n\n${summary}\n\n💡 Quick Actions:\n• View: \"@Gorgias Terminal get ticket ${ticket.ticket_id}\"\n• Assign: \"@Gorgias Terminal assign ticket ${ticket.ticket_id} to [agent]\"`;\n\nreturn [{ json: { text: message } }];"
      }
    },
    {
      "name": "Post to Slack",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channelId": "C09BXTD0WR0",
        "text": "={{ $json.text }}"
      }
    },
    {
      "name": "Log to Database",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "table": "agent_sessions",
        "fields": {
          "user_id": "SYSTEM",
          "channel": "C09BXTD0WR0",
          "raw_text": "New ticket notification",
          "action": "ticket_created_webhook",
          "origin": "gorgias-webhook"
        }
      }
    }
  ]
}
```

---

## Testing Your Extensions

### 1. Unit Testing

Test individual nodes in isolation:

```javascript
// Test new filter logic
const testTickets = [
  { id: 1, customer: { name: 'John Smith' } },
  { id: 2, customer: { name: 'Jane Doe' } }
];

const filters = { customer_name: 'john' };
const result = applyFilters(testTickets, filters);

console.assert(result.length === 1, 'Should find John Smith');
console.assert(result[0].id === 1, 'Should be ticket #1');
```

### 2. Integration Testing

Test full workflow in `#test_gorgias`:

```
@Gorgias Terminal [your new command]
```

Check:
- ✅ OpenAI detects correct function
- ✅ Router directs to correct node
- ✅ API call succeeds
- ✅ Data logged to `api_logs`
- ✅ User gets proper response

### 3. Error Testing

Test failure cases:

```
@Gorgias Terminal [command with invalid data]
@Gorgias Terminal [command that will cause 404]
```

Verify:
- ✅ Error handler catches error
- ✅ User-friendly message displayed
- ✅ Error logged properly

### 4. Performance Testing

```sql
-- Check query performance
SELECT 
    node_name,
    AVG(duration_ms) as avg_ms,
    MAX(duration_ms) as max_ms
FROM api_logs
WHERE node_name = 'your_new_node'
    AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY node_name;
```

---

## Best Practices

### 1. Naming Conventions

- **Functions**: `snake_case` (e.g., `snooze_ticket`)
- **Nodes**: Title Case (e.g., "Snooze Ticket")
- **Variables**: `camelCase` (e.g., `ticketId`)
- **Database fields**: `snake_case` (e.g., `correlation_id`)

### 2. Error Messages

```javascript
// ❌ Bad: Technical jargon
throw new Error('NullPointerException in ticket handler');

// ✅ Good: User-friendly
throw new Error('Unable to find ticket. Please check the ticket ID and try again.');
```

### 3. Logging

```javascript
// Always log what you're doing
console.log(`✅ Applied filter: ${filterName} (${beforeCount} → ${afterCount} results)`);

// Log errors with context
console.error(`❌ Failed to fetch ticket ${ticketId}:`, error.message);
```

### 4. Documentation

Update these files when adding features:
- `NODE_MAP.json` - Add node metadata
- `ARCHITECTURE.md` - Update relevant sections
- `DEBUGGING.md` - Add troubleshooting tips
- This file - Add examples

### 5. Backward Compatibility

```javascript
// ✅ Good: Support both old and new parameter names
const ticketId = $json.ticket_id || $json.ticketId || $json.id;

// ❌ Bad: Breaking change
const ticketId = $json.new_ticket_identifier;
```

---

## Common Pitfalls

### 1. Not Validating Input

```javascript
// ❌ Bad: Assumes ticket_id exists
const ticket = await getTicket($json.ticket_id);

// ✅ Good: Validate first
if (!$json.ticket_id) {
  return {
    action: 'ask_clarification',
    question: 'Which ticket ID would you like to view?'
  };
}
const ticket = await getTicket($json.ticket_id);
```

### 2. Not Handling Null/Undefined

```javascript
// ❌ Bad: Will crash if customer is null
const email = ticket.customer.email.toLowerCase();

// ✅ Good: Defensive programming
const email = ticket.customer?.email?.toLowerCase() || '';
```

### 3. Not Considering Performance

```javascript
// ❌ Bad: O(n²) complexity
tickets.forEach(t1 => {
  tickets.forEach(t2 => {
    if (t1.customer_id === t2.customer_id) {
      // ...
    }
  });
});

// ✅ Good: O(n) with lookup table
const byCustomer = {};
tickets.forEach(t => {
  if (!byCustomer[t.customer_id]) {
    byCustomer[t.customer_id] = [];
  }
  byCustomer[t.customer_id].push(t);
});
```

### 4. Not Testing Error Cases

Always test:
- Empty input
- Invalid input
- Missing required fields
- API failures
- Rate limiting
- Timeout scenarios

---

## Getting Help

If you get stuck:

1. **Check existing patterns** in similar nodes
2. **Review ARCHITECTURE.md** for context
3. **Test in isolation** before integration
4. **Check logs** in `api_logs` table
5. **Ask Claude Code** with specific error details

---

## End of Extension Guide
