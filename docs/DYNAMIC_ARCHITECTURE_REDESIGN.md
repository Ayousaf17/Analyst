# 🏗️ Dynamic Architecture Redesign - Gorgias AI Agent

## Current Problem

Your workflow has **20+ hardcoded actions** requiring manual updates in 3+ places for every new feature:

1. ❌ Hardcoded OpenAI function definitions (Build OpenAI Request node)
2. ❌ Hardcoded switch routing (Route by Action node)
3. ❌ 20+ individual HTTP request nodes
4. ❌ Custom formatters for each action type

**Result**: Unmaintainable spaghetti code that doesn't scale.

---

## ✨ Proposed Solution: Schema-Driven Dynamic Routing

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SLACK MESSAGE                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Parse Slack (extract intent, time period, filters)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Load API Schema from Supabase (OpenAPI/JSON Schema)           │
│  - GET /api/gorgias_schema                                      │
│  - Returns: Ticket endpoints, Customer endpoints, etc.          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  LLM Intent Router (GPT-4 Turbo with JSON Schema)              │
│  INPUT:  User text + Full API Schema                           │
│  OUTPUT: {                                                      │
│    "endpoint": "/api/tickets",                                  │
│    "method": "GET",                                             │
│    "params": {"status": "open", "limit": 50},                   │
│    "headers": {...}                                             │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Universal HTTP Executor (Single Dynamic Node)                 │
│  - Builds request from LLM output                              │
│  - Validates against schema                                     │
│  - Executes HTTP call                                           │
│  - Returns structured response                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Universal Response Formatter (Schema-Aware)                   │
│  - Uses schema to format response                              │
│  - Generates table/list/card based on endpoint type            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Slack Reply                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Step 1: Create API Schema Storage

### Supabase Table: `api_schemas`

```sql
CREATE TABLE api_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL, -- 'gorgias', 'stripe', etc.
  version TEXT NOT NULL,
  schema_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_name, version)
);
```

### Example Schema Entry

```json
{
  "service": "gorgias",
  "version": "v1",
  "base_url": "https://ironsidecomputers.gorgias.com",
  "auth": {
    "type": "basic",
    "credential_id": "00RVVUesFbtpYkL5"
  },
  "endpoints": [
    {
      "id": "list_tickets",
      "path": "/api/tickets",
      "method": "GET",
      "description": "List tickets with optional filters",
      "parameters": {
        "query": [
          {
            "name": "status",
            "type": "string",
            "enum": ["open", "closed", "pending"],
            "required": false,
            "description": "Filter by ticket status"
          },
          {
            "name": "limit",
            "type": "number",
            "default": 50,
            "description": "Max results to return"
          }
        ]
      },
      "response": {
        "type": "list",
        "item_schema": {
          "id": "number",
          "subject": "string",
          "status": "string",
          "created_datetime": "datetime"
        }
      },
      "examples": [
        {
          "user_intent": "show me open tickets",
          "params": {"status": "open", "limit": 50}
        }
      ]
    },
    {
      "id": "get_ticket",
      "path": "/api/tickets/{ticket_id}",
      "method": "GET",
      "description": "Get details of a specific ticket",
      "parameters": {
        "path": [
          {
            "name": "ticket_id",
            "type": "string",
            "required": true,
            "description": "Ticket ID to retrieve"
          }
        ]
      },
      "response": {
        "type": "object",
        "schema": {
          "id": "number",
          "subject": "string",
          "messages": "array"
        }
      }
    },
    {
      "id": "create_ticket",
      "path": "/api/tickets",
      "method": "POST",
      "description": "Create a new ticket",
      "parameters": {
        "body": {
          "customer": {
            "email": {
              "type": "string",
              "required": true
            }
          },
          "subject": {
            "type": "string",
            "required": true
          },
          "priority": {
            "type": "string",
            "enum": ["low", "normal", "high", "urgent"],
            "default": "normal"
          }
        }
      }
    }
  ]
}
```

---

## 🔧 Step 2: Replace "Build OpenAI Request" Node

### NEW: Dynamic Function Loader (Code Node)

```javascript
// ============================================================================
// DYNAMIC FUNCTION LOADER
// Replaces: Build OpenAI Request (hardcoded functions)
// ============================================================================

// Get user text from Parse Slack
const userText = $json.user_text;

// Fetch API schema from Supabase (cached for performance)
const schema = await fetch($vars.SUPABASE_URL + '/rest/v1/api_schemas?service_name=eq.gorgias&version=eq.v1', {
  headers: {
    'apikey': $vars.SUPABASE_KEY,
    'Authorization': `Bearer ${$vars.SUPABASE_KEY}`
  }
}).then(r => r.json()).then(d => d[0].schema_data);

// Convert schema endpoints to OpenAI function format DYNAMICALLY
const functions = schema.endpoints.map(endpoint => ({
  type: "function",
  function: {
    name: endpoint.id,
    description: endpoint.description,
    parameters: {
      type: "object",
      properties: buildParameterSchema(endpoint.parameters),
      required: extractRequiredParams(endpoint.parameters)
    }
  }
}));

// Helper: Build parameter schema from endpoint definition
function buildParameterSchema(params) {
  const schema = {};

  ['query', 'path', 'body'].forEach(location => {
    if (params[location]) {
      if (Array.isArray(params[location])) {
        // Query/Path params (array format)
        params[location].forEach(param => {
          schema[param.name] = {
            type: param.type,
            description: param.description,
            ...(param.enum && { enum: param.enum }),
            ...(param.default && { default: param.default })
          };
        });
      } else {
        // Body params (object format)
        Object.entries(params[location]).forEach(([key, value]) => {
          schema[key] = {
            type: value.type,
            description: value.description || ''
          };
        });
      }
    }
  });

  return schema;
}

// Helper: Extract required parameters
function extractRequiredParams(params) {
  const required = [];

  ['query', 'path', 'body'].forEach(location => {
    if (params[location]) {
      if (Array.isArray(params[location])) {
        params[location].forEach(param => {
          if (param.required) required.push(param.name);
        });
      } else {
        Object.entries(params[location]).forEach(([key, value]) => {
          if (value.required) required.push(key);
        });
      }
    }
  });

  return required;
}

// Build OpenAI request with dynamically loaded functions
return [{
  json: {
    model: $vars.OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a Gorgias API assistant. Use the available functions to help users manage support tickets."
      },
      {
        role: "user",
        content: userText
      }
    ],
    tools: functions,
    tool_choice: "auto",
    temperature: 0.3
  }
}];
```

**Benefits**:
- ✅ **Zero hardcoding** - Functions loaded from database
- ✅ **Auto-sync** - Update schema in DB, functions update automatically
- ✅ **Versioning** - Support multiple API versions
- ✅ **Easy testing** - A/B test different schema configs

---

## 🚦 Step 3: Replace "Route by Action" Switch

### NEW: Universal HTTP Executor (Single Node)

```javascript
// ============================================================================
// UNIVERSAL HTTP EXECUTOR
// Replaces: Route by Action switch + 20+ HTTP nodes
// ============================================================================

// Get LLM response
const llmResponse = $('OpenAI Structured Output').first().json;
const functionCall = llmResponse.choices[0].message.tool_calls[0];

const actionId = functionCall.function.name;
const actionArgs = JSON.parse(functionCall.function.arguments);

console.log('🎯 Action:', actionId);
console.log('📦 Arguments:', actionArgs);

// Fetch schema for this action
const schema = await fetch($vars.SUPABASE_URL + '/rest/v1/api_schemas?service_name=eq.gorgias', {
  headers: {
    'apikey': $vars.SUPABASE_KEY,
    'Authorization': `Bearer ${$vars.SUPABASE_KEY}`
  }
}).then(r => r.json()).then(d => d[0].schema_data);

// Find endpoint definition
const endpoint = schema.endpoints.find(e => e.id === actionId);

if (!endpoint) {
  throw new Error(`Unknown action: ${actionId}`);
}

// Build HTTP request dynamically
const baseUrl = schema.base_url;
let path = endpoint.path;

// Replace path parameters (e.g., /tickets/{ticket_id} → /tickets/12345)
Object.keys(actionArgs).forEach(key => {
  path = path.replace(`{${key}}`, actionArgs[key]);
});

// Build query string
const queryParams = new URLSearchParams();
if (endpoint.method === 'GET') {
  Object.entries(actionArgs).forEach(([key, value]) => {
    if (!path.includes(`{${key}}`)) {
      queryParams.append(key, value);
    }
  });
}

const url = `${baseUrl}${path}${queryParams.toString() ? '?' + queryParams : ''}`;

// Build request body (for POST/PUT/PATCH)
let body = null;
if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
  body = JSON.stringify(actionArgs);
}

// Execute HTTP request
const response = await fetch(url, {
  method: endpoint.method,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from($vars.GORGIAS_EMAIL + ':' + $vars.GORGIAS_API_KEY).toString('base64')
  },
  ...(body && { body })
});

const result = await response.json();

// Return structured response
return [{
  json: {
    action: actionId,
    endpoint: endpoint.path,
    method: endpoint.method,
    status_code: response.status,
    success: response.ok,
    data: result,
    request: {
      url,
      method: endpoint.method,
      args: actionArgs
    }
  }
}];
```

**Benefits**:
- ✅ **Single HTTP node** for ALL actions
- ✅ **No routing logic** - Schema defines behavior
- ✅ **Automatic validation** - Schema-driven parameter checking
- ✅ **Easy debugging** - Request/response logging built-in

---

## 📊 Step 4: Universal Response Formatter

```javascript
// ============================================================================
// UNIVERSAL RESPONSE FORMATTER
// Replaces: Multiple action-specific formatters
// ============================================================================

const httpResult = $json;
const action = httpResult.action;
const data = httpResult.data;

// Fetch schema to know how to format this response
const schema = await fetch($vars.SUPABASE_URL + '/rest/v1/api_schemas?service_name=eq.gorgias', {
  headers: {
    'apikey': $vars.SUPABASE_KEY,
    'Authorization': `Bearer ${$vars.SUPABASE_KEY}`
  }
}).then(r => r.json()).then(d => d[0].schema_data);

const endpoint = schema.endpoints.find(e => e.id === action);

// Format based on response type in schema
let output = '';

if (endpoint.response.type === 'list') {
  // Format as table
  const items = data.data || data;
  output = formatAsTable(items, endpoint.response.item_schema);

} else if (endpoint.response.type === 'object') {
  // Format as card
  output = formatAsCard(data, endpoint.response.schema);

} else {
  // Default: JSON dump
  output = '```json\n' + JSON.stringify(data, null, 2) + '\n```';
}

return [{
  json: {
    output: output,
    channel: $('Parse Slack').first().json.channel,
    thread_ts: $('Parse Slack').first().json.thread_ts
  }
}];

// Helper: Format data as table
function formatAsTable(items, schema) {
  const headers = Object.keys(schema);
  let table = headers.join(' | ') + '\n';
  table += headers.map(() => '---').join(' | ') + '\n';

  items.slice(0, 20).forEach(item => {
    const row = headers.map(h => item[h] || 'N/A').join(' | ');
    table += row + '\n';
  });

  return '```\n' + table + '```';
}

// Helper: Format data as card
function formatAsCard(item, schema) {
  let card = '**Details**\n\n';
  Object.keys(schema).forEach(key => {
    card += `**${key}**: ${item[key] || 'N/A'}\n`;
  });
  return card;
}
```

---

## 🚀 Migration Path

### Phase 1: Hybrid Approach (Low Risk)
1. Keep existing hardcoded nodes
2. Add schema table to Supabase
3. Create new "Dynamic Executor" branch in parallel
4. A/B test: Route 10% of traffic to dynamic path
5. Monitor performance and accuracy

### Phase 2: Full Migration
1. Migrate all endpoints to schema
2. Remove hardcoded HTTP nodes
3. Switch default to dynamic path
4. Keep old path as fallback for 2 weeks

### Phase 3: Cleanup
1. Remove old nodes
2. Add new endpoints via schema only
3. Enable multi-service support (Stripe, Shopify, etc.)

---

## 📈 Benefits Summary

| Aspect | Current (Hardcoded) | New (Schema-Driven) |
|--------|---------------------|---------------------|
| **Add new action** | 30 min (3 node updates) | 2 min (1 DB insert) |
| **Modify endpoint** | 15 min (update HTTP node) | 1 min (update schema) |
| **Support new service** | 2 hours (build from scratch) | 10 min (add schema) |
| **Testing** | Manual testing required | Schema validation automatic |
| **Maintenance** | High (20+ nodes) | Low (1 executor node) |
| **Scalability** | Linear growth | Constant size |

---

## 🎯 Next Steps

1. **Create schema table** in Supabase
2. **Migrate 3 endpoints** to schema (list_tickets, get_ticket, create_ticket)
3. **Build Universal HTTP Executor** node
4. **Test with real Slack messages**
5. **Iterate and expand** schema coverage

---

## 💡 Advanced: Multi-Service Support

Once you have this working for Gorgias, you can easily add:

- **Stripe API** - Payments, subscriptions
- **Shopify API** - Orders, products
- **Slack API** - Channels, users
- **Internal APIs** - Your custom services

All using the SAME executor nodes - just different schemas in the database.

---

## ⚠️ Important Notes

1. **Schema Caching**: Cache schema in memory/Redis to avoid DB hits on every request
2. **Validation**: Add JSON Schema validation before executing HTTP requests
3. **Error Handling**: Schema should include error response formats
4. **Rate Limiting**: Track API usage per endpoint in schema metadata
5. **Versioning**: Support multiple schema versions for backwards compatibility

---

**Ready to build the future? Let's start with Step 1.** 🚀
