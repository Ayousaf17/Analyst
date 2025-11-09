# 🎯 QUICK START PROMPT FOR CLAUDE CODE

**Copy this to start a new Claude Code session:**

---

Hi Claude Code! I need help completing my Gorgias Terminal project (v23). I'm 95% done and need ~5 hours of work to reach 100% production-ready.

## 📊 CURRENT STATE

**Working (100%):**
- Main execution path with 20 Gorgias actions
- AI-based intent detection via OpenAI (natural language → structured JSON)
- Performance metrics & full observability
- Dynamic time period extraction
- Token optimization (70-92% reduction)

**Blocked (90%):**
- Analytics path needs endpoint fix (30 min)

**Needs Upgrade (95% → 100%):**
- AI Agent → HTTP Request implementation (2-3 hrs for 100% reliability)

**Not Started:**
- Environment variable extraction (1-2 hrs)

## 🎯 THREE TASKS TO COMPLETE

### **Task 1: Fix Analytics Endpoint (30 min)**

**File:** `Fixed_Analytics_Workflow.json`  
**Node:** "Fetch Tickets for Analytics"

**Problem:** Returns 400 Bad Request

**Fix:**
```javascript
// CHANGE FROM:
{
  "method": "POST",
  "url": "{{ $env.GORGIAS_BASE_URL }}/api/tickets/search",
  "body": {...}
}

// TO:
{
  "method": "GET",
  "url": "{{ $env.GORGIAS_BASE_URL }}/api/tickets",
  "qs": {
    "status": "closed",
    "created_datetime[from]": "{{ $json.cutoff_timestamp }}",
    "limit": 100,
    "order_by": "created_datetime:desc"
  }
}
```

**Why:** `/api/tickets/search` is text search; `/api/tickets` is filtering. GET uses query string, not body.

---

### **Task 2: Implement HTTP Request (2-3 hrs)**

**Problem:** AI Agent node is 95% reliable (occasional "Model output doesn't fit required format" errors)

**Solution:** Replace with HTTP Request using OpenAI Structured Outputs (100% reliable)

**Reference:** Follow `IMPLEMENTATION_PLAN_HTTP_FIX.md` (48 checkpoints)

**Key Change:**
```javascript
// HTTP Request to OpenAI
{
  "url": "https://api.openai.com/v1/chat/completions",
  "body": {
    "model": "gpt-4o-mini",
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "strict": true,  // ← Guarantees valid JSON!
        "schema": {
          "type": "object",
          "properties": {
            "action": {"type": "string", "enum": ["search_tickets", ...]},
            "params": {"type": "object"}
          },
          "required": ["action", "params"]
        }
      }
    }
  }
}
```

**Test:** All 20 actions should work without JSON parsing errors

---

### **Task 3: Extract Environment Variables (1-2 hrs)**

**Problem:** Hardcoded values in 20+ nodes prevent multi-environment deployment

**Solution:** 

1. Create `.env.template`:
```bash
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com
GORGIAS_API_KEY=your_key
OPENAI_API_KEY=sk-proj-your_key
SLACK_BOT_TOKEN=xoxb-your_token
SUPABASE_URL=https://your-project.supabase.co
```

2. Update nodes from hardcoded to:
```javascript
const url = `{{ $env.GORGIAS_BASE_URL }}/api/tickets`;
```

3. Update ~20-25 nodes (all HTTP Request nodes + Supabase nodes)

---

## 🚨 CRITICAL: MY CONCERN

I'm worried I'm building "too much hardcoded logic" and losing AI-based routing. 

**Please help me understand:**
- Is my system actually using AI for intent routing?
- Or am I just building a big switch statement?

**My architecture:**
```javascript
// Step 1: OpenAI interprets
const intent = await openai.interpret(userMessage);
// Returns: {action: "search_tickets", params: {...}}

// Step 2: Switch executes
switch(intent.action) {
  case "search_tickets": await gorgias.search(...);
  case "assign_ticket": await gorgias.assign(...);
}
```

**Question:** Is this AI-based routing? Or should I do something more "AI-driven"?

---

## 📚 CONTEXT DOCUMENTS

I have comprehensive documentation:

**Architecture:**
- `V19_FAILURE_ANALYSIS_COMPREHENSIVE.md` - Why v19 was limited (70% multi-step reliability)
- `ai-routing-vs-hardcoded-logic-analysis.md` - Explains AI routing pattern
- `hybrid-architecture-complete-blueprint.md` - What "hybrid" would add

**Implementation:**
- `IMPLEMENTATION_PLAN_HTTP_FIX.md` - 48 checkpoints for HTTP Request
- `COMPLETE_PROJECT_SUMMARY_CONTEXT.md` - Full project status

**Key Lessons:**
- v19: AI Agent orchestrated execution → 70% reliable
- v23: AI plans, code executes → 100% reliable
- Pattern: AI for intelligence + code for execution = correct architecture

---

## 🎯 WHAT I NEED FROM YOU

1. **Reassurance:** Is my AI routing architecture correct? (I think it is but want confirmation)

2. **Task 1 Guidance:** Help me fix the analytics endpoint (30 min)

3. **Task 2 Guidance:** Walk me through HTTP Request implementation (2-3 hrs)

4. **Task 3 Guidance:** Help extract environment variables (1-2 hrs)

5. **Architectural Clarity:** Explain why switch statement is good, not "hardcoding"

---

## ✅ SUCCESS CRITERIA

After 5 hours of work:
- ✅ Analytics path 100% working
- ✅ Intent detection 100% reliable (no JSON errors)
- ✅ Can deploy to multiple environments
- ✅ Understanding of why architecture is correct

---

## 🚫 WHAT NOT TO DO

Please DON'T suggest:
- ❌ Removing the switch statement (it's deterministic execution, not hardcoding)
- ❌ Letting AI orchestrate multi-step execution (v19 lesson: 70% reliable)
- ❌ Rebuilding the system to be "more AI"

I want to **finish v23** (5 hours), not rebuild it as a "hybrid" (3 weeks).

---

## 🚀 LET'S START

Can you help me with Task 1 first (fix analytics endpoint)? Then we'll move to Tasks 2 and 3.

Also, please confirm: Is my AI routing architecture correct? The switch statement is confusing me.

**Ready when you are!** 🎯
