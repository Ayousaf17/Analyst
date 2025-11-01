# Fix Plan AI Metrics Detection Issue

**Date:** November 1, 2025
**Status:** 🟡 HIGH PRIORITY - Metrics queries routing to wrong action
**Issue:** "who are my best agents" outputs `list_tickets` instead of `list_metrics`

---

## 🐛 THE PROBLEM

**User Command:** "who are my best agents"

**Expected Output:**
```json
{
  "plan": [{
    "step": 1,
    "action": "list_metrics",
    "limit": 100
  }]
}
```

**Actual Output:**
```json
{
  "plan": [{
    "step": 1,
    "action": "list_tickets",
    "status": "open",
    "limit": 50
  }]
}
```

**Impact:**
- Users asking for performance metrics get generic ticket lists
- No analytics or rankings provided
- Conversational AI doesn't calculate statistics
- Core "CEO dashboard" functionality broken

---

## 🔍 ROOT CAUSE ANALYSIS

### Possible Causes:

1. **System Message Not Strong Enough**
   - Metrics keywords ("who are my best agents") not emphasized enough
   - Detection order might not be clear
   - Examples might not match user's actual phrasing

2. **Structured Output Parser Constraints**
   - Schema might be too flexible
   - No explicit instruction about when to use list_metrics
   - AI might default to more "common" actions like list_tickets

3. **Competing Intent Signals**
   - "agents" could be interpreted as "list agents" (people) instead of "analyze performance"
   - "my" could trigger list instead of metrics
   - "best" not strong enough indicator

4. **GPT Model Behavior**
   - gpt-4o-mini might not pick up on subtle analytics intent
   - Might need more explicit directive in CRITICAL section
   - Could need few-shot examples in the user message

---

## 💡 SOLUTION: Strengthen Metrics Detection

### Fix #1: Add CRITICAL Directive at Top of System Message

**Add this at the VERY TOP of the Plan AI system message (before everything else):**

```
CRITICAL: You MUST output valid JSON matching the exact schema. Never deviate from the format.

═══════════════════════════════════════════════════════════════════
🚨 CRITICAL: METRICS DETECTION FIRST 🚨
═══════════════════════════════════════════════════════════════════

BEFORE checking for anything else, check if this is a METRICS/ANALYTICS query:

**Metrics Trigger Words (ANY of these = list_metrics):**
- "best", "worst", "top", "bottom", "highest", "lowest"
- "most", "least", "fastest", "slowest"
- "performance", "performing", "performer"
- "who", "which", "how many"
- "compare", "comparison", "rank", "ranking"
- "stats", "statistics", "metrics", "analytics"
- "breakdown", "distribution", "summary"

**Metrics Trigger Patterns:**
- "who are" + performance word → list_metrics
- "which" + people + performance → list_metrics
- "show me" + comparison word → list_metrics
- "how many" + anything → list_metrics

**Examples (ALL route to list_metrics):**
- "who are my best agents" ✅ list_metrics
- "show me top performers" ✅ list_metrics
- "which team members are crushing it" ✅ list_metrics
- "how many tickets today" ✅ list_metrics
- "what's our performance like" ✅ list_metrics
- "compare agent stats" ✅ list_metrics

IF METRICS DETECTED: STOP. Output list_metrics. Do NOT continue to check other intents!

═══════════════════════════════════════════════════════════════════
```

### Fix #2: Update JSON Schema Description

In the **Structured Output Parser**, update the `action` field description:

```json
{
  "action": {
    "type": "string",
    "enum": [
      "list_tickets",
      "search_tickets",
      "get_ticket",
      "create_ticket",
      "assign_ticket",
      "close_ticket",
      "set_priority",
      "set_status",
      "add_tags",
      "remove_tags",
      "reply_public",
      "comment_internal",
      "list_customers",
      "get_customer",
      "find_user",
      "list_metrics"
    ],
    "description": "The action to perform. Use 'list_metrics' for ANY query about performance, rankings, statistics, or comparisons (e.g., 'who are my best agents', 'show top performers'). Use 'list_tickets' only for listing specific tickets."
  }
}
```

### Fix #3: Add Few-Shot Examples in System Message

**Replace the "OUTPUT FORMAT" section with this enhanced version:**

```
═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

Always return valid JSON matching this structure:
{
  "plan": [{
    "step": 1,
    "action": "action_name",
    "parameter_name": "value"
  }]
}

CRITICAL EXAMPLES - METRICS vs LIST:

❌ WRONG:
User: "who are my best agents"
Output: {"plan": [{"step": 1, "action": "list_tickets"}]}  ← NO! This is metrics!

✅ CORRECT:
User: "who are my best agents"
Output: {"plan": [{"step": 1, "action": "list_metrics"}]}  ← YES!

❌ WRONG:
User: "show me top performers"
Output: {"plan": [{"step": 1, "action": "list_tickets", "status": "open"}]}  ← NO!

✅ CORRECT:
User: "show me top performers"
Output: {"plan": [{"step": 1, "action": "list_metrics"}]}  ← YES!

✅ CORRECT (list_tickets usage):
User: "show me open tickets"
Output: {"plan": [{"step": 1, "action": "list_tickets", "status": "open"}]}
```

### Fix #4: Add Validation in Code Node (Safety Net)

**After Plan AI, add a validation Code node that checks for metrics keywords:**

```javascript
// Metrics Detection Safety Net
const plan = $json.plan || [];
const userText = $('Parse Slack').first().json.user_text.toLowerCase();

// Metrics trigger words
const metricsKeywords = [
  'best', 'worst', 'top', 'bottom', 'highest', 'lowest',
  'most', 'least', 'fastest', 'slowest',
  'performance', 'performing', 'performer',
  'compare', 'comparison', 'rank', 'ranking',
  'stats', 'statistics', 'metrics', 'analytics',
  'breakdown', 'distribution'
];

// Check if user text contains metrics keywords
const isMetricsQuery = metricsKeywords.some(keyword =>
  userText.includes(keyword)
);

// Check metrics patterns
const metricsPatterns = [
  /who\s+(are|is)\s+(my|the|our)?\s*(best|top|worst)/i,
  /which\s+(users|agents|team|members|people).+(best|top|worst|most|least|performance)/i,
  /show\s+me\s+(top|best|worst|performance|stats|metrics)/i,
  /how\s+many/i
];

const matchesMetricsPattern = metricsPatterns.some(pattern =>
  pattern.test(userText)
);

// If metrics detected but Plan AI output list_tickets, override
if ((isMetricsQuery || matchesMetricsPattern) && plan[0]?.action === 'list_tickets') {
  console.log('⚠️ METRICS OVERRIDE: Detected metrics intent but Plan AI output list_tickets');
  return [{
    json: {
      ...plan,
      plan: [{
        step: 1,
        action: 'list_metrics',
        limit: 100
      }]
    }
  }];
}

// Pass through if correct
return [{ json: $json }];
```

**Where to add:** Between "Format Session" and "Expand Plan" nodes

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Update Plan AI System Message (15 minutes)

1. Open n8n workflow
2. Click on **OpenAI Structured Output** (or **Plan AI Agent**) node
3. Find the **System Message** field
4. Add the CRITICAL METRICS DETECTION section at the very top
5. Update the OUTPUT FORMAT section with wrong/correct examples
6. Save

### Step 2: Update Structured Output Parser Schema (5 minutes)

1. Click on **Structured Output Parser** node (if using AI Agent approach)
   OR find the JSON schema in OpenAI HTTP Request (if using HTTP approach)
2. Find the `action` field definition
3. Add description emphasizing list_metrics usage
4. Save

### Step 3: Add Metrics Validation Code Node (15 minutes)

1. Create new **Code** node after Format Session
2. Name it "Validate Metrics Intent"
3. Paste the safety net code from Fix #4
4. Connect:
   - Input: from Format Session
   - Output: to Expand Plan
5. Test

### Step 4: Test All Metrics Queries (15 minutes)

Run these in Slack and verify ALL route to `list_metrics`:
```
@Gorgias Terminal who are my best agents
@Gorgias Terminal show me top performers
@Gorgias Terminal which team members are crushing it
@Gorgias Terminal how many tickets today
@Gorgias Terminal what's our performance like
@Gorgias Terminal compare agent stats
@Gorgias Terminal show me ticket breakdown
```

---

## 🧪 TEST CASES

### Should Route to list_metrics:

| User Input | Expected Action | Test Status |
|------------|----------------|-------------|
| "who are my best agents" | list_metrics | ❌ Currently fails |
| "show me top performers" | list_metrics | ❓ Needs testing |
| "which users are performing at their highest" | list_metrics | ❌ Previously failed |
| "how many tickets today" | list_metrics | ❓ Needs testing |
| "what's our performance" | list_metrics | ❓ Needs testing |
| "compare agent stats" | list_metrics | ❓ Needs testing |
| "show me team rankings" | list_metrics | ❓ Needs testing |
| "breakdown by agent" | list_metrics | ❓ Needs testing |

### Should Route to list_tickets (NOT metrics):

| User Input | Expected Action | Why |
|------------|----------------|-----|
| "show me open tickets" | list_tickets(status="open") | No performance/comparison |
| "list all tickets" | list_tickets | Generic listing |
| "what tickets do we have" | list_tickets | No analysis intent |
| "show me urgent stuff" | list_tickets(priority="urgent") | Specific filter, not comparison |

---

## 📊 SUCCESS CRITERIA

### Minimal Success:
- ✅ "who are my best agents" outputs `list_metrics`
- ✅ "show me top performers" outputs `list_metrics`
- ✅ "how many tickets" outputs `list_metrics`

### Full Success:
- ✅ ALL metrics queries route to `list_metrics`
- ✅ Generic listing queries still route to `list_tickets`
- ✅ No false positives (listing queries incorrectly detected as metrics)
- ✅ Conversational AI receives metrics action and calculates statistics
- ✅ Users see performance reports with rankings

---

## 🔍 WHY THIS WILL WORK

### Issue: GPT Models Need Strong Directives

GPT models (especially gpt-4o-mini) benefit from:
1. **Explicit "CRITICAL" markers** - Signals importance
2. **Examples showing WRONG vs CORRECT** - Provides clear contrast
3. **Pattern matching before free-form understanding** - Reduces ambiguity
4. **Safety nets** - Validates output programmatically

### The Fix Addresses All Angles:

1. **System Message:** Adds CRITICAL section with explicit trigger words
2. **Schema Description:** Emphasizes list_metrics in enum description
3. **Examples:** Shows WRONG vs CORRECT outputs for clarity
4. **Safety Net:** Code-based validation catches misrouted queries

### Similar Fixes That Worked:

From v23 development:
- Adding "CRITICAL: You MUST output valid JSON" reduced SOP errors
- Explicit examples in system messages improved routing accuracy
- Validation nodes caught edge cases

---

## 🚨 IF THIS STILL DOESN'T WORK

### Diagnostic Steps:

1. **Check Plan AI Output in n8n:**
   - After running "who are my best agents"
   - Click on Format Session node
   - Check `$json.plan[0].action`
   - Is it `list_tickets` or `list_metrics`?

2. **Check Validation Node:**
   - Did it detect metrics intent?
   - Did it override the action?
   - Check console logs

3. **Try Different Model:**
   - Current: gpt-4o-mini-2024-07-18
   - Try: gpt-4o-2024-11-20 (more powerful, better at following instructions)

4. **Simplify System Message:**
   - If too complex, AI might get confused
   - Try ONLY metrics section, remove everything else temporarily
   - Test if that works

5. **Use Explicit Rules Instead of AI:**
   - If AI consistently fails, use Code node with keyword matching
   - Bypass AI intent detection for metrics queries
   - Example: If user text contains "best", "top", "performance" → force list_metrics

---

## 💬 ALTERNATIVE APPROACH: Rule-Based Metrics Detection

If AI-based detection continues to fail, implement pure code-based detection:

```javascript
// Rule-Based Metrics Router (replaces AI for metrics)
const userText = $('Parse Slack').first().json.user_text.toLowerCase();

// Metrics patterns
const metricsPatterns = [
  { pattern: /who\s+(are|is)\s+(my|the|our)?\s*(best|top|worst|highest|lowest)/i, name: "who are best/worst" },
  { pattern: /which\s+(users|agents|team|members|people).+(best|top|worst|most|least)/i, name: "which people best/worst" },
  { pattern: /show\s+me\s+(top|best|worst|performance|stats|metrics|rankings?)/i, name: "show me performance" },
  { pattern: /how\s+many/i, name: "how many" },
  { pattern: /(compare|comparison).+(agent|user|team|performance)/i, name: "compare performance" },
  { pattern: /(performance|stats|statistics|metrics|analytics)/i, name: "contains performance words" }
];

for (const { pattern, name } of metricsPatterns) {
  if (pattern.test(userText)) {
    console.log(`✅ Metrics detected via pattern: ${name}`);
    return [{
      json: {
        plan: [{
          step: 1,
          action: 'list_metrics',
          limit: 100
        }]
      }
    }];
  }
}

// Not metrics - pass to AI for normal routing
return $input.all();
```

**Place:** Before Plan AI node (as a pre-filter)

---

## 📝 IMPLEMENTATION CHECKLIST

- [ ] Add CRITICAL section to top of Plan AI system message
- [ ] Add WRONG vs CORRECT examples to OUTPUT FORMAT section
- [ ] Update Structured Output Parser action description
- [ ] Add "Validate Metrics Intent" Code node
- [ ] Test: "who are my best agents" → verify `list_metrics`
- [ ] Test: "show me top performers" → verify `list_metrics`
- [ ] Test: "show me open tickets" → verify still `list_tickets`
- [ ] If still failing: implement rule-based metrics router

---

**Status:** ✅ Ready to implement
**Confidence:** HIGH - Multiple layers of fixes
**Priority:** HIGH 🟡
**Estimated Fix Time:** 30-45 minutes
**Fallback:** Rule-based detection (15 minutes)

**Next Action:** Apply Fix #1 (CRITICAL section) and test immediately
