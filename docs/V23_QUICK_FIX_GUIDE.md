# v23 Quick Fix Guide - Get Your AI Agent Working

**Date:** October 31, 2025
**Status:** 🎯 READY TO IMPLEMENT
**Goal:** Fix 4 critical bugs in v23 without redesigning anything

---

## 🎯 What We're Fixing

Your v23 architecture is solid. We just need to fix 4 specific bugs:

1. ✅ **Bug #1:** Slack email formatting breaks plans
2. ✅ **Bug #2:** Names/emails not recognized properly
3. ✅ **Bug #3:** Data path issue (summary vs response_data)
4. ✅ **Bug #4:** Metrics queries treated as ticket lists

**Time Required:** 20 minutes
**Complexity:** Copy-paste code fixes
**Risk:** Low (backup first!)

---

## 📋 Pre-Implementation Checklist

- [ ] Export your current n8n workflow as backup
- [ ] Open n8n workflow editor
- [ ] Have Slack open for testing
- [ ] Ready to test after each fix

---

## 🔧 FIX #1: Parse Slack Node - Clean Email Formatting

**Problem:** Emails like `<mailto:email@domain.com|email@domain.com>` break the plan generation.

**Solution:** Add regex to clean Slack formatting.

### Steps:
1. Open **Parse Slack** node
2. Find the code section with `const cleaned = ...`
3. **Replace the entire line** with:

```javascript
// ✅ FIX #1: Clean all Slack formatting
const cleaned = (text || '')
  .replace(/<@[^>]+>\s*/g, '')               // Remove @mentions
  .replace(/<mailto:([^|]+)\|[^>]+>/g, '$1') // ✅ Clean mailto links
  .replace(/<https?:\/\/([^|>]+)\|[^>]+>/g, '$1') // ✅ Clean URL links
  .replace(/<([^|>]+)>/g, '$1')              // ✅ Clean remaining angle brackets
  .trim();
```

4. Click **Save**

### Test:
```
@Gorgias Terminal search tickets about ay17yousaf@gmail.com
```

**Expected:** Clean email in plan, no empty `{}` output

---

## 🔧 FIX #2: Plan AI Agent - Add Intent Detection

**Problem:** Names and emails treated as generic keywords instead of person identifiers.

**Solution:** Update system message with intent detection priority.

### Steps:
1. Open **Plan AI Agent** node (or **OpenAI Structured Output** node)
2. Find **System Message** field
3. **Replace entire system message** with the content from: `EXACT_CODE_FIXES_FOR_WORKFLOW.md` section "FIX #2 & #4"
   - (Lines 108-333 from that document)

### Key Changes:
- ✅ Metrics/analytics detection FIRST
- ✅ Email detection (route to `list_tickets` with `customer_email`)
- ✅ Name detection (route to `find_user` with `name`)
- ✅ Clear priority order for intent matching

### Test:
```
@Gorgias Terminal search tickets about ayub
```

**Expected:** Plan uses `find_user(name="ayub")` not `search_tickets(query="ayub")`

---

## 🔧 FIX #3: Conversational AI - Add Metrics Handling

**Problem:** AI doesn't know how to handle metrics queries - shows ticket lists instead of performance reports.

**Solution:** Add metrics handling instructions to system message.

### Steps:
1. Open **Conversational Response AI** node
2. Find **System Message** field (the 161-line formatting guide)
3. **Add this section at the TOP** (before existing content):

```
═══════════════════════════════════════════════════════════════════
METRICS/ANALYTICS HANDLING
═══════════════════════════════════════════════════════════════════

**When action is list_metrics:**

If the user asked a metrics/analytics question, you need to:
1. Analyze the ticket data yourself
2. Calculate statistics (counts, percentages, averages)
3. Group by the requested dimension (assignee, status, priority)
4. Rank results if comparison was requested
5. Present as a PERFORMANCE REPORT, not a ticket list

**Example User Question:** "which users are performing at their highest"

**What You Receive:**
- Action: list_metrics
- Results: Array of all tickets (up to 100)

**What You Must Do:**
1. Group tickets by assignee (assignee_user.name)
2. Count tickets per assignee
3. Calculate metrics:
   - Total tickets closed
   - Percentage of total workload
   - Current open tickets per agent
4. Rank by performance (most tickets closed = highest performer)
5. Present as performance report with rankings

**Output Format for Metrics:**
```
📊 Agent Performance Report (Last 30 Days)

Based on [X] tickets analyzed:

Top Performers:
1. 🥇 [Agent Name] - [X] tickets closed (X%)
   • Average response: [X] hours
   • Currently handling: [X] open tickets

2. 🥈 [Agent Name] - [X] tickets closed (X%)
   • Average response: [X] hours
   • Currently handling: [X] open tickets

3. 🥉 [Agent Name] - [X] tickets closed (X%)
   • Average response: [X] hours
   • Currently handling: [X] open tickets

📈 Insights:
• [Key insight about top performer]
• [Key insight about workload distribution]
• [Key insight about trends]

💡 What would you like to do?
• See detailed breakdown: "@Gorgias Terminal show me [Agent Name]'s ticket stats"
• Compare time periods: "@Gorgias Terminal compare this week vs last week"
```

**Key Metrics to Calculate:**
- Tickets per assignee (closed vs open)
- Percentage of total workload
- Status distribution (open/closed)
- Priority distribution (normal/high/urgent)
- Recent activity trends

═══════════════════════════════════════════════════════════════════
```

4. Click **Save**

### Test:
```
@Gorgias Terminal which users are performing at their highest
```

**Expected:** Performance report with agent rankings, NOT a ticket list

---

## 🔧 FIX #4: Already Included in Fix #2

**The metrics/analytics intent detection is already included in the Plan AI system message from Fix #2.**

No additional action needed! ✅

---

## ✅ Testing Checklist

After applying all fixes, test these commands:

### Test 1: Email Formatting (Bug #1)
```
@Gorgias Terminal search tickets about ay17yousaf@gmail.com
```
✅ **Expected:** Email cleaned, plan generated successfully

---

### Test 2: Name Recognition (Bug #2)
```
@Gorgias Terminal search tickets about ayub
```
✅ **Expected:** Plan uses `find_user(name="ayub")` or routes to customer lookup

---

### Test 3: Successful API Response (Bug #3)
```
@Gorgias Terminal get ticket 234136710
```
✅ **Expected:** Shows ticket details, NOT "not found"

---

### Test 4: Metrics Recognition (Bug #4)
```
@Gorgias Terminal which users are performing at their highest
```
✅ **Expected:** Performance report with rankings, NOT ticket list

---

### Test 5: Generic Search (Verify no regression)
```
@Gorgias Terminal search tickets about billing
```
✅ **Expected:** Generic keyword search works normally

---

## 🎯 Success Criteria

After all fixes applied:

- ✅ Emails with mailto formatting process correctly
- ✅ Names recognized and route to customer lookup
- ✅ Successful API calls show correct data
- ✅ Metrics queries generate performance reports
- ✅ Generic keyword searches still work
- ✅ Token usage stays under 3K per request
- ✅ No rate limit errors

---

## 📊 What You Should See in Supabase Logs

After fixes, check `api_logs` table for proper data flow:

1. **Parse Slack Output:**
   - `user_text` contains clean email (no `<mailto:...>`)
   - `correlation_id` generated properly

2. **Plan AI Output:**
   - Correct action for intent (find_user for names, list_metrics for analytics)
   - Correct parameter names (name, customer_email, not query)

3. **Conversational AI Input:**
   - `results[0].summary.items[]` contains ticket data
   - `results[0].summary.statistics` contains breakdowns

4. **Final Response:**
   - Formatted according to action type
   - No "not found" for successful API calls
   - Performance reports for metrics queries

---

## 🚨 If Something Breaks

### Parse Slack Issues:
- Check regex syntax (no missing brackets)
- Verify variable names match

### Plan AI Issues:
- Verify system message is valid text
- Check JSON output schema hasn't changed

### Conversational AI Issues:
- Ensure metrics section added at TOP
- Keep existing formatting rules intact

### To Rollback:
1. Stop workflow
2. Re-import backup JSON
3. Report issue with error message

---

## 📚 Reference Documents

All detailed code is in:
- `EXACT_CODE_FIXES_FOR_WORKFLOW.md` - Complete code for all 3 nodes
- `CRITICAL_FIXES_PLAN_AI_AGENT.md` - Detailed bug analysis
- `CORRECT_CONVERSATIONAL_AI_PROMPT.md` - Data path explanation
- `ROOT_CAUSE_ANALYSIS.md` - Root cause investigation

---

## 🎯 What Happens After This

Once these 4 bugs are fixed, v23 will:

1. ✅ Understand user intent correctly (names, emails, metrics)
2. ✅ Generate accurate action plans
3. ✅ Execute API calls properly
4. ✅ Format responses appropriately for each action type
5. ✅ Handle metrics queries with performance analysis
6. ✅ Stay under token limits (no rate limiting)

**Then** we can consider optimizations like the Hybrid Architecture if needed.

But first: **Let's get v23 working as designed!**

---

## 💡 Next Steps

1. **Apply Fix #1** (Parse Slack) → Test email formatting
2. **Apply Fix #2** (Plan AI) → Test name/email/metrics intent
3. **Apply Fix #3** (Conversational AI) → Test metrics handling
4. **Run all 5 test commands** → Verify everything works
5. **Monitor for 24 hours** → Check logs, user feedback
6. **Document results** → Update status in docs

---

**Status:** ✅ READY TO IMPLEMENT
**Estimated Time:** 20 minutes
**Priority:** CRITICAL
**Confidence:** HIGH - All bugs identified with exact fixes

---

**Let's fix v23 and get it working properly! 🚀**
