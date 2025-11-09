# 🎯 PROMPT FOR CLAUDE CODE: Complete v23 & Understand AI Routing Architecture

**Project:** Gorgias Terminal - Slack-based AI Agent for Ticket Management  
**Current State:** v23 at 95% completion, 5 hours from production-ready  
**Goal:** Finish v23, understand the AI routing architecture, avoid over-engineering

---

## 📋 CONTEXT FOR CLAUDE CODE

### **What This System Is**

A Slack bot that allows users to manage Gorgias support tickets through natural language commands. Users type commands in Slack like "find spencer's urgent tickets" and the system:

1. Interprets intent using OpenAI (AI-based routing)
2. Extracts parameters (assignee, priority, etc.)
3. Executes API calls to Gorgias
4. Returns formatted results to Slack

**Key Architecture:** AI for intelligence + deterministic code for execution = 100% reliability

---

### **Current System Status (v23)**

```
✅ WORKING (100%):
- Main execution path with 20 Gorgias actions
- Natural language intent detection via OpenAI
- Performance metrics collection (path-aware)
- Dynamic time period extraction ("last 7 days")
- Full observability with correlation IDs
- Token optimization (70-92% reduction)

🔴 BLOCKED (90% complete):
- Analytics path needs endpoint fix (30 min)

⚠️ NEEDS UPGRADE (95% reliable → 100%):
- AI Agent node → HTTP Request implementation (2-3 hrs)

🔄 NOT STARTED:
- Environment variable extraction (1-2 hrs)
- Centralized error handlers (optional, later phase)
```

**Total Time to "Complete":** ~5 hours

---

### **The Architectural Confusion (CRITICAL TO UNDERSTAND)**

The developer is concerned they're building "too much hardcoded logic" and losing AI-based routing. This is a **misunderstanding** of the architecture.

**REALITY:** The system DOES use AI for routing. Here's how:

```javascript
// USER TYPES IN SLACK:
"find spencer's urgent tickets from last week"

// STEP 1: AI INTERPRETS (This IS AI routing!)
const intent = await openai.chat({
  model: "gpt-4o-mini",
  messages: [
    {role: "system", content: SYSTEM_PROMPT},
    {role: "user", content: userMessage}
  ],
  response_format: {type: "json_object"}
});

// AI RETURNS (AI made ALL these decisions):
{
  "action": "search_tickets",  // AI chose this action
  "params": {
    "assignee_email": "spencer@ironsidecomputers.com",  // AI resolved "spencer"
    "priority": "high",  // AI mapped "urgent" → "high"
    "created_after": "2024-10-31T00:00:00Z"  // AI parsed "last week"
  }
}

// STEP 2: CODE EXECUTES RELIABLY (Not hardcoding - this is deterministic execution!)
switch(intent.action) {
  case "search_tickets":
    await fetch("/api/tickets", {
      method: "GET",
      params: intent.params
    });
    break;
  case "assign_ticket":
    await fetch("/api/tickets/{id}", {
      method: "PATCH",
      params: intent.params
    });
    break;
  // ... 18 more actions
}
```

**KEY INSIGHT:** The switch statement looks "hardcoded" but it's NOT hardcoding the intent detection - the AI already decided which case to hit! The switch is just reliable execution.

---

## 🎯 YOUR MISSION (CLAUDE CODE)

### **Primary Goal: Complete v23 (5 hours of work)**

You need to guide the developer through 3 completion tasks:

---

### **TASK 1: Fix Analytics Endpoint (30 minutes)**

**Problem:** The "Fetch Tickets for Analytics" node returns 400 Bad Request

**Root Cause:** Using wrong HTTP method and endpoint

**Location:** 
- File: `Fixed_Analytics_Workflow.json`
- Node: "Fetch Tickets for Analytics"

**Current (WRONG):**
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

**Should Be (CORRECT):**
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
  // Note: No body - GET requests use query string (qs)
}
```

**Why This Matters:**
- `/api/tickets/search` is for TEXT search only (searches ticket content)
- `/api/tickets` is for FILTERING (by status, date, assignee, etc.)
- GET requests use query string parameters, not body

**Testing:**
1. Update the node configuration
2. Test in Slack: "@bot analyze insights from last 30 days"
3. Verify: Check `performance_metrics` table shows "analytics" path
4. Verify: No 400 errors in logs

**Success Criteria:** Analytics path returns results without 400 error

---

### **TASK 2: Implement HTTP Request (2-3 hours)**

**Problem:** Currently using AI Agent node for OpenAI intent detection. This is 95% reliable but occasionally fails with "Model output doesn't fit required format" error.

**Solution:** Replace AI Agent with HTTP Request node using OpenAI Structured Outputs (100% reliable)

**Reference Documentation:** 
- File: `IMPLEMENTATION_PLAN_HTTP_FIX.md` (48 checkpoints)
- This plan is comprehensive and ready to follow

**High-Level Overview:**

**CURRENT (AI Agent Node):**
```
Slack → Parse → AI Agent → Normalize → Switch → Execute
                    ↑
              95% reliable
              (occasional JSON parsing errors)
```

**TARGET (HTTP Request):**
```
Slack → Parse → HTTP Request → Normalize → Switch → Execute
                    ↑
              100% reliable
              (guaranteed valid JSON with strict: true)
```

**Key Changes:**

1. **Replace AI Agent node with HTTP Request node:**
```javascript
// HTTP Request configuration
{
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "headers": {
    "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
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
        "strict": true,  // ← This guarantees valid JSON!
        "schema": {
          "type": "object",
          "properties": {
            "action": {
              "type": "string",
              "enum": ["search_tickets", "assign_ticket", "close_ticket", ...]
            },
            "params": {
              "type": "object",
              "properties": { ... }
            }
          },
          "required": ["action", "params"],
          "additionalProperties": false
        }
      }
    }
  }
}
```

2. **Update Normalize node to parse HTTP response:**
```javascript
// Before: AI Agent returns direct JSON
const action = $input.item.json.action;

// After: HTTP Request returns nested response
const action = $input.item.json.choices[0].message.content;
const parsed = JSON.parse(action);
```

3. **Test all 20 actions:**
```
Basic operations:
- search_tickets
- get_ticket
- assign_ticket
- close_ticket
- add_note

Advanced operations:
- bulk_assign
- add_tags
- set_priority
- create_ticket
- update_ticket
... (15 more)
```

**Follow the 48-checkpoint plan in IMPLEMENTATION_PLAN_HTTP_FIX.md**

**Success Criteria:** 
- All 20 actions work without JSON parsing errors
- 100% reliability (zero "Model output doesn't fit required format")
- Response time similar or better than AI Agent

---

### **TASK 3: Extract Environment Variables (1-2 hours)**

**Problem:** Hardcoded values in 20+ nodes make it impossible to deploy to staging/production environments

**Current Issues:**
```javascript
// Hardcoded in nodes:
const gorgiasUrl = "https://ironsidecomputers.gorgias.com";
const openaiKey = "sk-proj-abc123...";
const slackToken = "xoxb-abc123...";
```

**Solution:** Create environment variables

**Steps:**

1. **Create .env template file:**
```bash
# .env.template

# Gorgias API
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com
GORGIAS_API_KEY=your_api_key_here
GORGIAS_EMAIL=your_email_here

# OpenAI
OPENAI_API_KEY=sk-proj-your_key_here
OPENAI_MODEL=gpt-4o-mini

# Slack
SLACK_BOT_TOKEN=xoxb-your_token_here
SLACK_SIGNING_SECRET=your_secret_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here

# Environment
ENVIRONMENT=development  # development, staging, production
```

2. **Update nodes to use environment variables:**

**Before:**
```javascript
const url = "https://ironsidecomputers.gorgias.com/api/tickets";
```

**After:**
```javascript
const url = `{{ $env.GORGIAS_BASE_URL }}/api/tickets`;
```

3. **Nodes to update (~20-25 nodes):**
```
HTTP Request nodes (all Gorgias API calls):
- Fetch Tickets for Analytics
- Search Tickets
- Get Ticket
- Assign Ticket
- Close Ticket
- Add Note
- Update Ticket
- (13+ more HTTP nodes)

OpenAI nodes:
- HTTP Request (after Task 2 implementation)
- Any other AI calls

Supabase nodes:
- Insert Session
- Update Metrics
- Log API Calls
- Query User Mappings
```

4. **Create environment-specific configs:**
```javascript
// development.env
GORGIAS_BASE_URL=https://ironsidecomputers-dev.gorgias.com

// staging.env
GORGIAS_BASE_URL=https://ironsidecomputers-staging.gorgias.com

// production.env
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com
```

**Testing:**
1. Set environment variables in n8n
2. Test one workflow end-to-end
3. Verify all nodes use env vars (no hardcoded values)
4. Switch to staging config and verify it connects to staging

**Success Criteria:**
- Zero hardcoded API keys/URLs in workflow
- Can switch environments by changing .env file
- All 20+ actions work with environment variables

---

## 🚫 CRITICAL: WHAT NOT TO DO

### **DO NOT "Add More AI"**

The developer is concerned about hardcoding, but their architecture is CORRECT. Do NOT:

❌ **Remove the switch statement**
```javascript
// DON'T do this - this is v19's mistake (70% reliable):
while (!done) {
  const nextAction = await ai.decideNextAction();
  await execute(nextAction);
}
```

❌ **Let AI orchestrate multi-step execution**
```javascript
// DON'T do this - unreliable:
const plan = await ai.generateAndExecutePlan(message);
```

❌ **Replace deterministic routing with AI decisions**
```javascript
// DON'T do this - introduces unreliability:
const endpoint = await ai.determineEndpoint(action);
```

### **The Current Architecture Is CORRECT**

**KEEP THIS PATTERN:**
```javascript
// ✅ AI decides intent
const intent = await openai.interpret(message);

// ✅ Code executes reliably
switch(intent.action) {
  case "search_tickets": await gorgias.search(...);
  case "assign_ticket": await gorgias.assign(...);
}
```

**Why This Works:**
- AI provides flexibility (handles any phrasing)
- Code provides reliability (100% correct execution)
- Separation of concerns (intelligence vs execution)
- Industry best practice (GitHub Copilot, Stripe, Notion all use this)

---

## 📊 UNDERSTANDING THE ARCHITECTURE

### **The AI Routing Pattern (What They Already Have)**

**Flow:**
```
User Message
    ↓
┌─────────────────────────────────────────┐
│  AI LAYER (OpenAI)                      │
│  - Interprets natural language          │
│  - Decides which action                 │
│  - Extracts parameters                  │
│  - Handles synonyms/variations          │
│  → OUTPUT: {action: "X", params: {...}} │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  VALIDATION LAYER (JavaScript)          │
│  - Validates action exists              │
│  - Checks required parameters           │
│  - Security checks                      │
│  → OUTPUT: Validated intent             │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  EXECUTION LAYER (Switch + HTTP)        │
│  - Maps action → API endpoint           │
│  - Executes HTTP request                │
│  - Handles errors gracefully            │
│  → OUTPUT: API response                 │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  RESPONSE LAYER (Format + Reply)        │
│  - Formats results                      │
│  - Sends to Slack                       │
│  → OUTPUT: User-friendly message        │
└─────────────────────────────────────────┘
```

**Key Points to Emphasize:**

1. **AI IS doing the routing** - The OpenAI layer decides which action to use
2. **Switch is NOT hardcoding** - It's just reliable execution after AI decides
3. **This is the correct pattern** - Learned from v19's 70% reliability failure
4. **Industry standard** - This is how production AI systems work

---

### **What "Hardcoded" vs "AI-Based" Actually Means**

**HARDCODED (They DON'T have this):**
```javascript
// Keyword matching - rigid, can't handle variations
if (message.includes("search")) {
  action = "search_tickets";
} else if (message.includes("find")) {
  action = "search_tickets";
}

// Can't handle: "show me", "get me", "pull", "retrieve"
```

**AI-BASED (They DO have this):**
```javascript
// AI interprets flexibly
const intent = await openai.interpret(message);
// Handles: "search", "find", "show me", "get", "pull", "retrieve"
// Handles: "spencer's urgent tickets"
// Handles: "tickets from last week"
// Handles: infinite variations!
```

**DETERMINISTIC EXECUTION (They DO have this - THIS IS GOOD):**
```javascript
// After AI decides, execute reliably
switch(intent.action) {
  case "search_tickets": 
    await fetch("/api/tickets", {method: "GET"});
    break;
}

// This ensures 100% reliability
```

---

## 🎓 EDUCATIONAL CONTEXT

### **The v19 vs v23 Lesson**

Help the developer understand why their architecture is correct:

**v19 (Failed at 70% for multi-step):**
```
AI Agent orchestrates everything:
- Decides next action
- Executes action
- Decides next action again
- Executes again
- ... (probabilistic loop)

Problem: AI might skip steps, wrong order, or hallucinate
```

**v23 (Current - 100% for multi-step):**
```
AI decides upfront plan:
- Returns: [{step: 1, action: "X"}, {step: 2, action: "Y"}]

Code executes deterministically:
- Loop through steps
- Execute each one
- Guarantee completion

Result: 100% reliability
```

**Lesson:** AI for planning, code for execution

---

### **Why The Switch Statement Is Essential**

**The switch maps actions to API endpoints:**

```javascript
switch(action) {
  case "search_tickets":
    endpoint = "/api/tickets";
    method = "GET";
    break;
    
  case "get_ticket":
    endpoint = "/api/tickets/{id}";
    method = "GET";
    break;
    
  case "assign_ticket":
    endpoint = "/api/tickets/{id}";
    method = "PATCH";
    break;
}
```

**This is NOT hardcoding intent - this is API specification!**

Think of it like:
- AI decides: "User wants to search"
- Switch ensures: "Search means GET /api/tickets"

**The alternative (letting AI decide endpoints) would be:**
```javascript
const endpoint = await ai.determineEndpoint(action);
// AI might return: "/api/search" (doesn't exist!)
// AI might return: "/api/tickets/delete" (wrong!)
// AI might hallucinate endpoints

// This is WORSE than the switch!
```

---

## 📋 COMPLETION CHECKLIST

After finishing all 3 tasks, the system should be:

### **Task 1: Analytics Endpoint** ✅
- [ ] Node configuration updated (POST → GET)
- [ ] Test command works: "@bot analyze insights from last 30 days"
- [ ] No 400 errors in logs
- [ ] performance_metrics shows "analytics" path
- [ ] Preprocessing node reduces tokens by 70%

### **Task 2: HTTP Request Implementation** ✅
- [ ] AI Agent replaced with HTTP Request
- [ ] OpenAI Structured Outputs configured (strict: true)
- [ ] All 20 actions tested and working
- [ ] Zero "Model output doesn't fit required format" errors
- [ ] Response time similar or better
- [ ] Parse response node updated for new structure

### **Task 3: Environment Variables** ✅
- [ ] .env.template created
- [ ] All hardcoded values identified
- [ ] 20+ nodes updated to use {{ $env.VAR }}
- [ ] Development environment tested
- [ ] Can switch to staging config
- [ ] Zero hardcoded API keys remaining

### **Overall System** ✅
- [ ] Main path: 100% functional
- [ ] Analytics path: 100% functional
- [ ] Intent detection: 100% reliable
- [ ] Multi-environment: Ready
- [ ] Documentation: Updated
- [ ] Performance metrics: Working
- [ ] Observability: Complete

---

## 🎯 SUCCESS CRITERIA

### **At Completion:**

**Reliability:**
- ✅ Main path: 100% success rate (no JSON parsing errors)
- ✅ Analytics path: 100% functional
- ✅ Intent detection: 100% reliable (HTTP Request with strict mode)

**Deployability:**
- ✅ Can deploy to development, staging, production
- ✅ Environment variables properly extracted
- ✅ No hardcoded secrets or URLs

**Observability:**
- ✅ All executions logged with correlation_id
- ✅ Performance metrics track both paths
- ✅ Can debug any execution via Supabase logs

**Architecture:**
- ✅ AI-based intent routing (flexible)
- ✅ Deterministic execution (reliable)
- ✅ Proper separation of concerns

---

## 💬 GUIDING PRINCIPLES FOR CLAUDE CODE

When helping the developer:

1. **Reinforce the correct architecture**
   - "Your AI routing is working correctly"
   - "The switch statement is deterministic execution, not hardcoding"
   - "This pattern is industry standard"

2. **Focus on completion, not rebuilding**
   - "Let's finish these 3 tasks (5 hours)"
   - "Don't rebuild what's already working"
   - "The architecture is sound"

3. **Explain the separation of concerns**
   - "AI for intelligence (flexible)"
   - "Code for execution (reliable)"
   - "This is why v23 is 100% reliable vs v19's 70%"

4. **Discourage over-engineering**
   - "Adding more AI would reduce reliability"
   - "The hybrid features are only needed if users request them"
   - "Monitor production first, then decide"

5. **Keep them focused**
   - Task 1: 30 minutes (analytics endpoint)
   - Task 2: 2-3 hours (HTTP Request)
   - Task 3: 1-2 hours (environment variables)
   - Total: ~5 hours to completion

---

## 📚 REFERENCE FILES

The developer has comprehensive documentation:

**Implementation Plans:**
- `IMPLEMENTATION_PLAN_HTTP_FIX.md` - 48 checkpoints for Task 2

**Architecture Docs:**
- `V23_FAILURE_ANALYSIS_COMPREHENSIVE.md` - v19 vs v23 lessons
- `v19-analysis-action-plan.md` - Why v19 was limited
- `hybrid-architecture-complete-blueprint.md` - What hybrid would look like
- `ai-routing-vs-hardcoded-logic-analysis.md` - Architecture explanation

**Current State:**
- `COMPLETE_PROJECT_SUMMARY_CONTEXT.md` - Full project status
- Performance metrics working
- 44 documentation files (703 KB)

**Key Database Tables:**
- `performance_metrics` - Path-aware metrics
- `api_logs` - Every API call tracked
- `agent_sessions` - Correlation IDs
- `gorgias_users` - User mappings (13 users, 100% coverage)

---

## 🎊 FINAL SUMMARY

**What This Developer Needs:**

1. **Reassurance** - Their architecture is correct, AI routing is working
2. **Focus** - Just 3 tasks, 5 hours total
3. **Guidance** - Step-by-step through the 3 tasks
4. **Understanding** - Why the switch statement is good, not bad

**What They Don't Need:**

1. ❌ Rebuild from scratch
2. ❌ "Make it more AI"
3. ❌ Hybrid system (unless users request it)
4. ❌ Over-engineering

**Your Job:** Guide them through 5 hours of focused work to get v23 to 100% completion, while reinforcing that their architecture is sound.

---

## 🚀 FIRST STEPS FOR CLAUDE CODE

When the session starts:

1. **Read the context documents** (especially the 4 architecture docs)
2. **Reassure them about AI routing** - "Your system IS AI-based, here's proof..."
3. **Start Task 1** - "Let's fix the analytics endpoint first (30 min)"
4. **Move to Task 2** - "Now let's implement HTTP Request (2-3 hrs)"
5. **Finish Task 3** - "Finally, extract environment variables (1-2 hrs)"

**Keep them focused, confident, and moving forward!** 🎯

Good luck! This is a well-architected system that just needs finishing touches.
