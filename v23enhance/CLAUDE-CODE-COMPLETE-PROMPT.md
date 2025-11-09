# 🎯 CLAUDE CODE: Complete v23 Gorgias Terminal

**Repository:** https://github.com/Ayousaf17/Analyst/tree/claude/http-workflows-review-011CUp6vvKCFPQySNbXLc7pf

**Current Status:** v23 at 95% completion  
**Time to Complete:** 5 hours (3 tasks)  
**Goal:** Production-ready system by end of week

---

## 📊 CURRENT STATE

### What's Working (100%)
- ✅ Main execution path with 20 Gorgias actions
- ✅ AI-based intent detection via OpenAI GPT-4o-mini
- ✅ Performance metrics collection (path-aware, 14 fields)
- ✅ Dynamic time period extraction from natural language
- ✅ Token optimization (70-92% reduction)
- ✅ Full observability (correlation IDs, Supabase logging)
- ✅ 44 documentation files (703 KB)

### What Needs Fixing (3 Tasks)

**Task 1: Analytics Endpoint (30 min)** 🔴 BLOCKING
- Status: Returns 400 Bad Request
- Impact: Analytics path stuck at 90%
- Fix: Change POST to GET, add query params

**Task 2: HTTP Request Implementation (2-3 hrs)** ⚠️ HIGH PRIORITY
- Status: Using AI Agent (95% reliable)
- Impact: Occasional JSON parsing errors
- Fix: Replace with HTTP Request + Structured Outputs (100% reliable)

**Task 3: Environment Variables (1-2 hrs)** 🟡 IMPORTANT
- Status: 20+ nodes have hardcoded values
- Impact: Can't deploy to staging/production
- Fix: Extract to environment variables

---

## 🎯 TASK 1: FIX ANALYTICS ENDPOINT

### The Problem
Node "Fetch Tickets for Analytics" returns 400 Bad Request because it's using wrong endpoint and method.

### Location
- **File:** `Fixed_Analytics_Workflow.json`
- **Node Name:** "Fetch Tickets for Analytics"

### Current Configuration (WRONG)
```javascript
{
  "method": "POST",
  "url": "{{ $env.GORGIAS_BASE_URL }}/api/tickets/search",
  "body": {
    "status": "closed",
    "created_datetime": {
      "from": "{{ $json.cutoff_timestamp }}"
    }
  }
}
```

### Correct Configuration
```javascript
{
  "method": "GET",
  "url": "{{ $env.GORGIAS_BASE_URL }}/api/tickets",
  "qs": {
    "status": "closed",
    "created_datetime[from]": "{{ $json.cutoff_timestamp }}",
    "limit": 100,
    "order_by": "created_datetime:desc"
  }
  // Note: No body! GET requests use query string parameters (qs)
}
```

### Why This Fix Works
- `/api/tickets/search` is for TEXT search (searching ticket content/messages)
- `/api/tickets` is for FILTERING (by status, dates, assignee, etc.)
- POST with body → GET with query string parameters
- GET requests don't have bodies - they use `qs` (query string)

### Testing
```bash
# In Slack, run:
@bot analyze insights from last 30 days

# Expected result:
✅ Returns analysis without 400 error
✅ Preprocessing node reduces tokens by ~70%
✅ Claude Sonnet 4.5 generates insights
✅ Universal Table Formatter displays results

# Verify in Supabase:
SELECT * FROM performance_metrics 
WHERE path = 'analytics' 
ORDER BY created_at DESC 
LIMIT 1;

# Should show successful analytics execution
```

### Success Criteria
- ✅ No 400 errors in logs
- ✅ Analytics path returns formatted insights
- ✅ Performance metrics show "analytics" path
- ✅ Preprocessing reduces token payload

---

## 🎯 TASK 2: IMPLEMENT HTTP REQUEST

### The Problem
Currently using AI Agent node for OpenAI intent detection. This is 95% reliable but occasionally fails with:
```
Error: Model output doesn't fit required format
```

### The Solution
Replace AI Agent with HTTP Request node using OpenAI Structured Outputs with `strict: true` parameter. This guarantees 100% valid JSON.

### Reference Documentation
**File:** `IMPLEMENTATION_PLAN_HTTP_FIX.md` (48 checkpoints)

This is your primary guide. Follow it step-by-step.

### High-Level Changes

#### Current Architecture
```
Slack Trigger
    ↓
Parse Slack
    ↓
AI Agent (LangChain)  ← 95% reliable
    ↓
Normalize Parameters
    ↓
Switch Router
    ↓
20 HTTP Nodes
```

#### Target Architecture
```
Slack Trigger
    ↓
Parse Slack
    ↓
HTTP Request (OpenAI)  ← 100% reliable
    ↓
Parse Response
    ↓
Switch Router
    ↓
20 HTTP Nodes
```

### Key Implementation Details

#### 1. Replace AI Agent with HTTP Request Node

**HTTP Request Configuration:**
```javascript
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "openAiApi",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": []
  },
  "jsonBody": JSON.stringify({
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "{{ $json.system_prompt }}"
      },
      {
        "role": "user",
        "content": "{{ $json.user_message }}"
      }
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "gorgias_action",
        "strict": true,  // ← THIS IS THE KEY!
        "schema": {
          "type": "object",
          "properties": {
            "action": {
              "type": "string",
              "enum": [
                "list_tickets",
                "get_ticket",
                "search_tickets",
                "create_ticket",
                "assign_ticket",
                "close_ticket",
                "add_note",
                "update_ticket",
                "set_priority",
                "add_tags",
                "remove_tags",
                "list_customers",
                "get_customer",
                "create_customer",
                "update_customer",
                "list_satisfaction_surveys",
                "get_user",
                "list_users",
                "list_integrations",
                "get_integration",
                "analyze_insights"
              ]
            },
            "params": {
              "type": "object",
              "properties": {},
              "additionalProperties": true
            }
          },
          "required": ["action", "params"],
          "additionalProperties": false
        }
      }
    }
  }, null, 2)
}
```

#### 2. Add Parse Response Node

After HTTP Request, add node to extract the structured JSON:

```javascript
// Node: "Parse OpenAI Response"
const response = $input.item.json;

// OpenAI returns nested structure
const messageContent = response.choices[0].message.content;

// Parse the JSON string
const parsed = JSON.parse(messageContent);

return [{
  json: {
    action: parsed.action,
    params: parsed.params,
    // Pass through other context
    correlation_id: $input.item.json.correlation_id,
    slack_user_id: $input.item.json.slack_user_id,
    thread_ts: $input.item.json.thread_ts
  }
}];
```

#### 3. Update System Prompt

Ensure system prompt is passed to HTTP Request node with all available actions and schemas.

**Current system prompt location:** Check the AI Agent node configuration

**System prompt should include:**
- List of all 20 available actions
- Parameter schemas for each action
- User reference mapping (13 Gorgias users)
- Examples of natural language → structured output

### Testing Strategy

**Test each action incrementally:**

1. **Basic actions (5 actions):**
   ```
   - list_tickets
   - get_ticket
   - search_tickets
   - assign_ticket
   - close_ticket
   ```

2. **Intermediate actions (8 actions):**
   ```
   - create_ticket
   - add_note
   - update_ticket
   - set_priority
   - add_tags
   - remove_tags
   - list_customers
   - get_customer
   ```

3. **Advanced actions (7 actions):**
   ```
   - create_customer
   - update_customer
   - list_satisfaction_surveys
   - get_user
   - list_users
   - list_integrations
   - get_integration
   ```

4. **Analytics (1 action):**
   ```
   - analyze_insights
   ```

**Test commands in Slack:**
```
# Basic
"show me open tickets"
"get ticket 5678"
"search for tickets about refund"
"assign ticket 5678 to collin"
"close ticket 5678"

# Parameters
"show me spencer's urgent tickets"
"tickets from last 7 days"
"closed tickets from this month"
```

### Success Criteria
- ✅ All 20 actions work without errors
- ✅ Zero "Model output doesn't fit required format" errors
- ✅ Response time similar or better than AI Agent
- ✅ Structured output always valid JSON
- ✅ Natural language understanding maintained

---

## 🎯 TASK 3: EXTRACT ENVIRONMENT VARIABLES

### The Problem
20+ nodes have hardcoded values:
- API URLs
- API keys
- Slack tokens
- Supabase credentials

This prevents multi-environment deployment (dev/staging/production).

### The Solution
Extract all hardcoded values to n8n environment variables.

### Step 1: Create Environment Variable Template

Create `.env.template` file:

```bash
# Gorgias API Configuration
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com
GORGIAS_API_KEY=your_gorgias_api_key_here
GORGIAS_EMAIL=your_gorgias_email_here

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your_openai_key_here
OPENAI_MODEL=gpt-4o-mini

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your_slack_bot_token_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_WORKSPACE_URL=https://your-workspace.slack.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# OpenRouter Configuration (for Analytics path)
OPENROUTER_API_KEY=your_openrouter_key_here

# Environment
ENVIRONMENT=development  # development, staging, production
DEBUG=false
LOG_LEVEL=info
```

### Step 2: Identify Nodes to Update

**HTTP Request Nodes (Gorgias API - ~16 nodes):**
```
- Fetch Tickets for Analytics
- List Tickets
- Get Ticket
- Search Tickets
- Create Ticket
- Assign Ticket
- Close Ticket
- Add Note
- Update Ticket
- Set Priority
- Add Tags
- Remove Tags
- List Customers
- Get Customer
- Create Customer
- Update Customer
```

**Supabase Nodes (~6 nodes):**
```
- Insert Session
- Update Performance Metrics
- Log API Calls
- Query User Mappings
- Insert Execution Logs
- Query Thread Memory (if exists)
```

**OpenAI/OpenRouter Nodes (~3 nodes):**
```
- HTTP Request (OpenAI intent detection)
- Ticket Analytics Agent (OpenRouter)
- Conversational AI Response (OpenAI)
```

### Step 3: Update Each Node

**Pattern for Gorgias API nodes:**

**BEFORE:**
```javascript
{
  "url": "https://ironsidecomputers.gorgias.com/api/tickets",
  "headers": {
    "Authorization": "Basic base64encodedcredentials"
  }
}
```

**AFTER:**
```javascript
{
  "url": "{{ $env.GORGIAS_BASE_URL }}/api/tickets",
  "headers": {
    "Authorization": "Basic {{ $env.GORGIAS_API_KEY }}"
  }
}
```

**Pattern for Supabase nodes:**

**BEFORE:**
```javascript
const supabaseUrl = "https://abc123.supabase.co";
const supabaseKey = "eyJ...long_key";
```

**AFTER:**
```javascript
const supabaseUrl = $env.SUPABASE_URL;
const supabaseKey = $env.SUPABASE_ANON_KEY;
```

**Pattern for OpenAI nodes:**

**BEFORE:**
```javascript
{
  "headers": {
    "Authorization": "Bearer sk-proj-abc123..."
  }
}
```

**AFTER:**
```javascript
{
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}"
  }
}
```

### Step 4: Configure n8n Environment Variables

In n8n settings, add environment variables:

**Development environment:**
```bash
GORGIAS_BASE_URL=https://ironsidecomputers-dev.gorgias.com
ENVIRONMENT=development
DEBUG=true
```

**Staging environment:**
```bash
GORGIAS_BASE_URL=https://ironsidecomputers-staging.gorgias.com
ENVIRONMENT=staging
DEBUG=false
```

**Production environment:**
```bash
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com
ENVIRONMENT=production
DEBUG=false
```

### Step 5: Testing

**Test in each environment:**

1. **Development:**
   - Set dev environment variables
   - Run test commands
   - Verify connects to dev Gorgias instance

2. **Staging:**
   - Switch to staging environment variables
   - Run same test commands
   - Verify connects to staging Gorgias instance

3. **Production:**
   - Switch to production environment variables
   - Run smoke tests
   - Verify connects to production Gorgias instance

### Success Criteria
- ✅ Zero hardcoded API keys in workflow JSON
- ✅ Zero hardcoded URLs in workflow JSON
- ✅ Can switch environments by changing .env
- ✅ All nodes read from environment variables
- ✅ Workflow works in dev/staging/production

---

## 📋 DETAILED EXECUTION PLAN

### Session 1: Analytics Fix + Start HTTP Request (1-2 hours)

**Hour 1: Fix Analytics Endpoint**
- [ ] Open `Fixed_Analytics_Workflow.json`
- [ ] Locate "Fetch Tickets for Analytics" node
- [ ] Change method: POST → GET
- [ ] Move body parameters to query string (qs)
- [ ] Test: `@bot analyze insights from last 30 days`
- [ ] Verify: No 400 errors in Supabase logs
- [ ] Confirm: Analytics path shows in performance_metrics

**Hour 2: Begin HTTP Request Implementation**
- [ ] Review `IMPLEMENTATION_PLAN_HTTP_FIX.md`
- [ ] Create new HTTP Request node
- [ ] Configure OpenAI API endpoint
- [ ] Add Structured Outputs with strict: true
- [ ] Test with 1-2 simple actions

### Session 2: Complete HTTP Request (2-3 hours)

**Hours 1-2: Build & Wire**
- [ ] Complete HTTP Request node configuration
- [ ] Add Parse Response node
- [ ] Connect to existing Switch Router
- [ ] Ensure system prompt includes all actions

**Hour 3: Test All Actions**
- [ ] Test basic actions (5 endpoints)
- [ ] Test intermediate actions (8 endpoints)
- [ ] Test advanced actions (7 endpoints)
- [ ] Verify zero JSON parsing errors
- [ ] Check response times

### Session 3: Environment Variables (1-2 hours)

**Hour 1: Extract Variables**
- [ ] Create .env.template file
- [ ] Identify all hardcoded values
- [ ] Update Gorgias API nodes (~16 nodes)
- [ ] Update Supabase nodes (~6 nodes)
- [ ] Update OpenAI nodes (~3 nodes)

**Hour 2: Test Multi-Environment**
- [ ] Configure development environment
- [ ] Test all endpoints in dev
- [ ] Configure staging environment
- [ ] Test smoke tests in staging
- [ ] Document environment setup

---

## 🔧 TECHNICAL CONTEXT

### Current Architecture (v23)

```
┌─────────────────────────────────────────┐
│ USER LAYER                               │
│ - Slack messages                         │
│ - Natural language commands              │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ PARSING LAYER                            │
│ - Parse Slack message                    │
│ - Extract time periods                   │
│ - Resolve user mentions                  │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ AI INTENT LAYER (Task 2 targets this)   │
│ - AI Agent (currently) → 95% reliable   │
│ - HTTP Request (target) → 100% reliable │
│ - Returns: {action, params}             │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ ROUTING LAYER                            │
│ - Switch on action                       │
│ - Route to correct HTTP node             │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ EXECUTION LAYER (Task 3 targets this)   │
│ - 20 HTTP nodes for Gorgias             │
│ - Hardcoded URLs (current)               │
│ - Environment vars (target)              │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ ANALYTICS PATH (Task 1 targets this)    │
│ - Fetch tickets (blocked at 400)        │
│ - Preprocess data (70% token reduction) │
│ - AI analysis (Claude Sonnet 4.5)       │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ OBSERVABILITY LAYER                      │
│ - Performance metrics                    │
│ - API logging                            │
│ - Correlation IDs                        │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ RESPONSE LAYER                           │
│ - Format results                         │
│ - Send to Slack                          │
└─────────────────────────────────────────┘
```

### Key Design Principles

**1. AI for Intelligence, Code for Execution**
```
✅ AI decides: Which action to use
✅ AI extracts: Parameters from natural language
✅ Code routes: Action to correct endpoint
✅ Code executes: HTTP request reliably
```

**This is the CORRECT pattern** - don't change it!

**2. Separation of Concerns**
- AI Layer: Interprets user intent
- Validation Layer: Checks action is valid
- Execution Layer: Makes API calls
- Response Layer: Formats results

**3. Observability First**
- Every action logged with correlation_id
- Performance metrics track both paths
- Can debug any execution via Supabase

### Database Schema Reference

**performance_metrics table:**
```sql
CREATE TABLE performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  path TEXT,  -- 'main' or 'analytics'
  execution_time_ms INTEGER,
  api_calls_count INTEGER,
  actions_count INTEGER,
  results_count INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**api_logs table:**
```sql
CREATE TABLE api_logs (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT,
  action TEXT,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**agent_sessions table:**
```sql
CREATE TABLE agent_sessions (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT,
  user_id TEXT,
  original_text TEXT,
  enriched_text TEXT,
  action TEXT,
  params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚫 CRITICAL: WHAT NOT TO CHANGE

### DO NOT Touch These (They Work!)

**1. The Switch Statement**
- ✅ This is deterministic execution
- ✅ AI already decided which case to hit
- ❌ Don't try to "make it more AI-driven"

**2. The 20 HTTP Nodes**
- ✅ These are v19 HARD FREEZE standards
- ✅ Correct endpoints, methods, headers
- ❌ Don't modify unless specifically needed for Task 3

**3. The Preprocessing Node**
- ✅ 70% token reduction working
- ✅ Analytics path depends on this
- ❌ Don't change truncation logic

**4. Performance Metrics Collection**
- ✅ Path-aware, 14 fields tracked
- ✅ Observability is complete
- ❌ Don't add more metrics without reason

### DO NOT Add These (Not in Scope!)

- ❌ Thread memory (hybrid feature - later)
- ❌ Vague reference handling (hybrid feature - later)
- ❌ Error handler nodes (optional - later)
- ❌ Schema-driven architecture (completely different direction)
- ❌ New features (ship first, features later)
- ❌ Refactoring (finish first, optimize later)

---

## 📚 REFERENCE FILES

All files available in repository:
https://github.com/Ayousaf17/Analyst/tree/claude/http-workflows-review-011CUp6vvKCFPQySNbXLc7pf

**Implementation Guides:**
- `IMPLEMENTATION_PLAN_HTTP_FIX.md` - 48 checkpoints for Task 2
- `COMPLETE_PROJECT_SUMMARY_CONTEXT.md` - Full system status

**Architecture Documentation:**
- `V19_FAILURE_ANALYSIS_COMPREHENSIVE.md` - Why v19 had limitations
- `ai-routing-vs-hardcoded-logic-analysis.md` - Architecture explanation
- `v23-reality-check-synthesis.md` - Current v23 assessment

**Action Plans:**
- `FINAL-ACTION-PLAN-V23-COMPLETION.md` - This week's focus
- `CLAUDE-CODE-QUICK-START.md` - Quick reference

---

## ✅ SUCCESS CHECKLIST

### Task 1: Analytics Endpoint ✅
- [ ] Endpoint changed from POST to GET
- [ ] Query string parameters configured
- [ ] Test command returns results
- [ ] No 400 errors in logs
- [ ] Performance metrics show "analytics" path

### Task 2: HTTP Request ✅
- [ ] HTTP Request node created
- [ ] Structured Outputs configured (strict: true)
- [ ] Parse Response node added
- [ ] All 20 actions tested
- [ ] Zero JSON parsing errors
- [ ] Response times acceptable

### Task 3: Environment Variables ✅
- [ ] .env.template created
- [ ] All Gorgias nodes updated (~16)
- [ ] All Supabase nodes updated (~6)
- [ ] All OpenAI nodes updated (~3)
- [ ] Can switch between dev/staging/prod
- [ ] No hardcoded values remain

### Overall System ✅
- [ ] Main path 100% functional
- [ ] Analytics path 100% functional
- [ ] Intent detection 100% reliable
- [ ] Multi-environment deployment ready
- [ ] All observability working
- [ ] Documentation updated
- [ ] Ready for production

---

## 🎯 GETTING STARTED

### First Command to Claude Code:

```
I need to complete v23 Gorgias Terminal. I'm 95% done with 3 tasks remaining (5 hours total).

Context: All files are in this repository:
https://github.com/Ayousaf17/Analyst/tree/claude/http-workflows-review-011CUp6vvKCFPQySNbXLc7pf

TASK 1: Fix analytics endpoint (30 min)
- File: Fixed_Analytics_Workflow.json
- Node: "Fetch Tickets for Analytics"
- Change: POST /api/tickets/search → GET /api/tickets with query params

TASK 2: Implement HTTP Request (2-3 hrs)
- Reference: IMPLEMENTATION_PLAN_HTTP_FIX.md (48 checkpoints)
- Replace AI Agent with HTTP Request + Structured Outputs
- Goal: 95% → 100% reliability

TASK 3: Extract environment variables (1-2 hrs)
- Update ~25 nodes to use {{ $env.VAR_NAME }}
- Create .env.template
- Enable multi-environment deployment

Let's start with Task 1. Can you help me update the "Fetch Tickets for Analytics" node configuration?
```

---

**Ready to start! Open Claude Code and paste the command above.** 🚀

**Total Time:** 5 hours to completion  
**Timeline:** Complete by Friday  
**Status:** ✅ Clear path, ✅ All resources ready
