# ROOT CAUSE ANALYSIS: Gorgias AI Agent Workflow Failures

**Date:** October 30, 2025
**Status:** 🔴 CRITICAL - Multiple systemic failures identified
**Priority:** IMMEDIATE FIX REQUIRED

---

## 🎯 Executive Summary

The Gorgias AI Agent workflow is experiencing **fundamental routing and data structure failures** at multiple critical points. The user's key insight: **"user name is being referred to as query and not name in the switch input payload"** reveals a systemic data structure mismatch between what the Plan AI outputs and what the downstream nodes expect.

**Impact:**
- Plan AI outputs wrong plans (not recognizing names, emails, metrics)
- Successful API calls show "not found" responses
- Workflow routing fundamentally broken
- Data structure mismatch preventing correct execution

---

## 📊 WHAT SHOULD HAPPEN vs WHAT IS HAPPENING

### ✅ INTENDED FLOW (What Should Happen)

```
User: "search tickets about ayub"
  ↓
Parse Slack: { user_text: "search tickets about ayub" }
  ↓
Plan AI: { plan: [{ step: 1, action: "find_user", name: "ayub" }] }
  ↓
Switch: Routes to find_user node (based on action field)
  ↓
find_user HTTP: GET /api/customers?query={{ $json.name }}
                 (uses $json.name = "ayub")
  ↓
Gorgias API: Returns customer data
  ↓
Conversational AI: Formats customer + tickets response
  ↓
User sees: "Found 1 customer: Ayub Yousaf. Here are their tickets..."
```

### 🔴 ACTUAL FLOW (What IS Happening)

```
User: "search tickets about ayub"
  ↓
Parse Slack: { user_text: "search tickets about ayub" }
  ↓
Plan AI: { plan: [{ step: 1, action: "search_tickets", query: "ayub" }] }
         ❌ WRONG: Used search_tickets instead of find_user
         ❌ WRONG: Used parameter name "query" instead of "name"
  ↓
Switch: Routes to search_tickets node (follows bad action)
        ❌ WRONG ROUTE: Should have gone to find_user
  ↓
search_tickets HTTP: GET /api/search?q={{ $json.query }}
                     (performs text search, not customer lookup)
  ↓
Gorgias API: Returns generic search results (not customer-specific)
  ↓
Conversational AI: Receives data but uses wrong data path
                   ❌ Looks for response_data instead of summary
  ↓
User sees: "I didn't find any tickets" (even if data exists)
```

---

## 🐛 ROOT CAUSES

### **ROOT CAUSE #1: Plan AI Intent Recognition Failure** 🔴

**Problem:** Plan AI Agent doesn't understand user intent properly

**Symptoms:**
- Names → treated as generic search query
- Emails → treated as generic search query
- Metrics questions → treated as ticket list requests

**Examples:**
| User Input | Plan AI Output (WRONG) | Should Be |
|------------|------------------------|-----------|
| "search tickets about ayub" | `search_tickets(query="ayub")` | `find_user(name="ayub")` |
| "search tickets about email@example.com" | `search_tickets(query="email")` | `list_tickets(customer_email="email")` |
| "which users are performing at their highest" | `list_tickets(status="open")` | `list_metrics(group_by="assignee")` |

**Impact:** Plan AI creates wrong action plans, entire workflow follows wrong path

**Fix Location:** Plan AI Agent System Message (needs name/email/metrics detection)

---

### **ROOT CAUSE #2: Data Structure Mismatch (Field Names)** 🔴

**Problem:** Plan AI outputs parameter names that don't match what action nodes expect

**Your Key Insight:** "user name is being referred to as query and not name in the switch input payload"

**The Mismatch:**

**Plan AI outputs:**
```json
{
  "plan": [{
    "step": 1,
    "action": "find_user",
    "query": "ayub"  ← WRONG FIELD NAME
  }]
}
```

**find_user HTTP node expects:**
```javascript
GET /api/customers?query={{ $json.name }}  // ← Expects $json.name
```

**Result:** `$json.name` = undefined → API call fails

**Why This Happens:**
1. Plan AI System Message not specifying correct parameter names per action
2. No schema enforcement for Plan AI output (fields are arbitrary)
3. Switch node passes data through but can't transform field names

**Impact:** Even when Plan AI chooses correct action, wrong field names break execution

**Fix Required:**
- Plan AI System Message must specify exact parameter names per action
- OR: Add data transformation node after Switch to map field names
- OR: Use OpenAI Structured Outputs with strict schema (enforces field names)

---

### **ROOT CAUSE #3: Conversational AI Data Path Error** 🔴

**Problem:** Conversational AI looks at wrong data path for results

**Current Code (WRONG):**
```javascript
{% if $json.results[0]?.response_data %}  ← Looks for response_data
```

**Should Be:**
```javascript
{% if $json.results[0]?.summary %}  ← Should look for summary
```

**Impact:** Even when API calls succeed (200 OK), Conversational AI can't find the data and says "not found"

**Fix Location:** Conversational Response AI User Prompt

---

### **ROOT CAUSE #4: Slack mailto Formatting Not Cleaned** 🔴

**Problem:** Parse Slack doesn't strip Slack's automatic link formatting

**Input:** `<mailto:ay17yousaf@gmail.com|ay17yousaf@gmail.com>`
**Output:** Same corrupted format (not cleaned)
**Result:** Plan AI gets confused by invalid syntax → outputs empty plan `{}`

**Impact:** Complete workflow failure for any email mentions

**Fix Location:** Parse Slack Code Node

---

### **ROOT CAUSE #5: Metrics Queries Not Recognized** 🔴

**Problem:** Questions asking for performance/analytics treated as ticket list requests

**Example:**
```
User: "which users are performing at their highest"

Plan AI outputs: list_tickets(status="open")  ❌ WRONG

Should output: list_metrics(group_by="assignee")  ✅ CORRECT
```

**Impact:** Users can't get analytics, see useless ticket lists instead

**Fix Location:** Plan AI Agent System Message (add metrics keyword detection)

---

## 🎯 PRIORITIZED FIX PLAN

### **Phase 1: Fix Data Structure Mismatches (CRITICAL)** 🔴

**These are blocking ALL functionality:**

#### Fix 1.1: Plan AI Output Schema
- **Problem:** Plan AI outputs arbitrary field names
- **Solution:** Update Plan AI System Message to specify exact parameter names per action
- **Example:** "For find_user action, use parameter name 'name', not 'query'"
- **Priority:** CRITICAL (blocks all actions)
- **Estimated Time:** 30 minutes

#### Fix 1.2: Conversational AI Data Path
- **Problem:** Looks for `response_data` instead of `summary`
- **Solution:** Update Conversational AI User Prompt to correct data paths
- **Priority:** CRITICAL (users see errors even when data exists)
- **Estimated Time:** 15 minutes

#### Fix 1.3: Slack mailto Cleaning
- **Problem:** Email formatting not stripped
- **Solution:** Add regex to Parse Slack to clean `<mailto:...>` format
- **Priority:** CRITICAL (emails break workflow completely)
- **Estimated Time:** 10 minutes

---

### **Phase 2: Fix Intent Recognition (HIGH PRIORITY)** 🟡

**These make the system "dumb" but some paths still work:**

#### Fix 2.1: Name/Email Recognition
- **Problem:** Names and emails treated as generic search queries
- **Solution:** Add name/email detection logic to Plan AI System Message
- **Priority:** HIGH (core UX issue)
- **Estimated Time:** 45 minutes

#### Fix 2.2: Metrics Keywords Recognition
- **Problem:** Analytics questions treated as ticket list requests
- **Solution:** Add metrics keyword detection to Plan AI System Message
- **Priority:** HIGH (blocks analytics use case)
- **Estimated Time:** 30 minutes

---

### **Phase 3: Test & Validate** ✅

#### Test Each Fix Separately
1. Test Slack mailto cleaning
2. Test Plan AI field names
3. Test Conversational AI data paths
4. Test name recognition
5. Test email recognition
6. Test metrics recognition

#### Integration Testing
- Run full UAT Phase 1 test cases
- Verify Supabase logs show correct data flow
- Monitor OpenAI token usage

---

## 🔧 HOW TO PROCEED (Recommended Approach)

### **Option A: Sequential Fixes (Safest)** ⭐ RECOMMENDED

**Advantages:**
- Test each fix before moving to next
- Easier to identify if a fix breaks something
- More confidence in each change

**Process:**
1. **Fix 1.3** (Parse Slack) → Test with email input
2. **Fix 1.2** (Conversational AI data path) → Test with get_ticket
3. **Fix 1.1** (Plan AI field names) → Test with all actions
4. **Fix 2.1** (Name/Email recognition) → Test with name/email inputs
5. **Fix 2.2** (Metrics recognition) → Test with metrics questions

**Timeline:** 2-3 hours total (with testing)

---

### **Option B: Parallel Fixes (Faster, Riskier)**

**Advantages:**
- All fixes done at once
- Faster to production

**Risks:**
- If something breaks, harder to identify which fix caused it
- May need to rollback multiple changes

**Process:**
1. Export current workflow (backup)
2. Apply all 5 fixes at once
3. Import and test comprehensively
4. If any failure, rollback and switch to Option A

**Timeline:** 1-2 hours (if no issues)

---

### **Option C: Hybrid Approach (Balanced)** ⚖️

**Advantages:**
- Group related fixes together
- Balance speed and safety

**Process:**
1. **Batch 1 (Critical Data Issues):**
   - Fix 1.3 (Parse Slack)
   - Fix 1.2 (Conversational AI)
   - Fix 1.1 (Plan AI field names)
   - **Test all basic actions**

2. **Batch 2 (Intent Recognition):**
   - Fix 2.1 (Name/Email)
   - Fix 2.2 (Metrics)
   - **Test all intent scenarios**

**Timeline:** 2 hours (with testing between batches)

---

## 🚨 CRITICAL NEXT STEPS

### Immediate Actions (Next 5 Minutes)

1. **Confirm Approach:** Choose Option A, B, or C
2. **Backup Workflow:** Export current n8n workflow JSON
3. **Prepare Test Cases:** Have test commands ready for each fix

### Implementation (Next 2-3 Hours)

4. **Apply Fixes** in chosen order
5. **Test After Each Fix** or batch
6. **Log Results** in Supabase for verification
7. **Document Issues** if any fix fails

### Validation (Final Hour)

8. **Run Full UAT Phase 1** test cases
9. **Verify All Actions Work** with correct parameters
10. **Monitor Token Usage** to ensure optimization still works

---

## 📝 SUCCESS CRITERIA

### Fix 1.1 Success (Plan AI Field Names)
- ✅ find_user action outputs `{ name: "ayub" }` not `{ query: "ayub" }`
- ✅ list_tickets action outputs `{ customer_email: "..." }` not `{ query: "..." }`
- ✅ All 16 actions output correct parameter names

### Fix 1.2 Success (Conversational AI Data Path)
- ✅ get_ticket 234136710 shows ticket details, not "not found"
- ✅ list_tickets shows ticket list correctly
- ✅ No "not found" messages for successful 200 OK responses

### Fix 1.3 Success (Slack mailto)
- ✅ Input `<mailto:email@example.com|email@example.com>` → outputs clean email
- ✅ Plan AI receives clean email, not corrupted format
- ✅ No empty plan `{}` outputs

### Fix 2.1 Success (Name/Email Recognition)
- ✅ "search tickets about ayub" → routes to find_user
- ✅ "search tickets about email@example.com" → routes to list_tickets with customer_email
- ✅ "search tickets about billing" → routes to search_tickets with query

### Fix 2.2 Success (Metrics Recognition)
- ✅ "which users are performing at their highest" → routes to list_metrics
- ✅ Conversational AI calculates stats and shows performance report
- ✅ No ticket lists for analytics questions

---

## 🎯 RECOMMENDED DECISION

**My Recommendation:** **Option A - Sequential Fixes**

**Why:**
1. **Safety First:** You've identified multiple critical issues - test each fix independently
2. **Easier Debug:** If something breaks, you know exactly which fix caused it
3. **Build Confidence:** Each successful fix builds confidence in the approach
4. **Only +1 hour vs Option B:** 2-3 hours vs 1-2 hours, but much safer

**Timeline:**
- Fix 1.3 (Parse Slack): 10 min fix + 5 min test
- Fix 1.2 (Conv AI): 15 min fix + 5 min test
- Fix 1.1 (Plan AI fields): 30 min fix + 10 min test
- Fix 2.1 (Name/Email): 45 min fix + 10 min test
- Fix 2.2 (Metrics): 30 min fix + 10 min test
- **Total: ~2.5 hours**

---

## 📞 READY TO PROCEED?

**What I need from you:**

1. **Confirm approach:** Option A, B, or C?
2. **Access to workflow:**
   - Can you export the current workflow JSON?
   - OR: Can you share screenshots of the nodes?
   - OR: Should I provide the exact code to paste into each node?

3. **Test environment:**
   - Do you have a test Slack channel?
   - Should we test in production or staging?

**Then I will:**
1. Provide exact code for each fix
2. Guide you through implementation step-by-step
3. Provide test commands for verification
4. Help debug if any issues arise

---

**Let's fix this systematically and get your AI agent working correctly! 🚀**

**Status:** ✅ Ready to implement fixes
**Confidence:** HIGH - Root causes identified
**Estimated Fix Time:** 2-3 hours (Option A)
**Priority:** CRITICAL 🔴
