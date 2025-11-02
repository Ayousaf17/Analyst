# Workflow Tightening - Action Plan

**Date:** November 2, 2025
**Status:** Ready to implement
**Time Required:** 10-15 minutes total

---

## 🎯 Problems Identified

Based on your Slack output, here are the issues:

| Issue | Command | Current Behavior | Expected Behavior | Priority |
|-------|---------|------------------|-------------------|----------|
| Bug #4 | "list customers" | Shows tickets | Shows customers | CRITICAL |
| Bug #4 | "show customers" | Shows tickets | Shows customers | CRITICAL |
| Metrics misinterpretation | "how many customers" | Shows agent stats | Shows customer count | HIGH |

---

## ✅ Solution Checklist

### Fix #1: Update Planning AI System Message (5 minutes)

**Problem:** Planning AI routes "list customers" to `list_tickets` instead of `list_customers`

**Solution:**
- [ ] Open n8n workflow
- [ ] Find "Plan AI Agent" node (HTTP Request to OpenAI)
- [ ] Open System Message field
- [ ] Copy contents from `docs/UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt`
- [ ] Replace old system message with new one
- [ ] Verify section "5. ACTION DISAMBIGUATION" exists
- [ ] Save workflow

**Guide:** See `QUICK_FIX_GUIDE_BUG4.md`

**Test After Fix:**
```
@Gorgias Terminal list customers
```
Should show customer list, NOT tickets ✅

---

### Fix #2: Update Conversational AI System Message (3 minutes)

**Problem:** Conversational AI interprets "how many customers" as ticket metrics

**Solution:**
- [ ] Open n8n workflow
- [ ] Find "Conversational Response AI" node
- [ ] Open System Message field
- [ ] Add section from `CONVERSATIONAL_AI_FIX_CUSTOMER_METRICS.md` at the TOP
- [ ] Keep existing content below it
- [ ] Save workflow

**Guide:** See `CONVERSATIONAL_AI_FIX_CUSTOMER_METRICS.md`

**Test After Fix:**
```
@Gorgias Terminal how many customers do we have
```
Should say "You have X customers", NOT show agent performance stats ✅

---

## 🧪 Complete Testing Checklist

After applying both fixes, test ALL these commands:

### Customer Commands
- [ ] `@Gorgias Terminal list customers` → Shows customer list
- [ ] `@Gorgias Terminal show customers` → Shows customer list
- [ ] `@Gorgias Terminal show all customers` → Shows customer list
- [ ] `@Gorgias Terminal how many customers do we have` → Shows customer count

### Ticket Commands
- [ ] `@Gorgias Terminal list tickets` → Shows ticket list
- [ ] `@Gorgias Terminal show tickets` → Shows ticket list
- [ ] `@Gorgias Terminal show all tickets` → Shows ticket list
- [ ] `@Gorgias Terminal how many tickets do we have` → Shows ticket count/stats

### Metrics Commands
- [ ] `@Gorgias Terminal which users are performing at their highest` → Shows agent performance
- [ ] `@Gorgias Terminal show me team performance` → Shows team metrics

### Other Commands (Ensure Not Broken)
- [ ] `@Gorgias Terminal get ticket 234525253` → Shows ticket details
- [ ] `@Gorgias Terminal search tickets about billing` → Shows search results

---

## 📊 Expected Results

### Before Fixes
```
Command: "list customers"
Output: 📋 Ticket List - Found 50 (showing 15) ❌
```

### After Fixes
```
Command: "list customers"
Output: 👥 Customer List - Found X customers ✅
```

---

## 🚨 If Something Breaks

### Issue: "I updated the system message but it's not working"

**Checklist:**
1. Did you save the workflow? (Green checkmark on node)
2. Is the workflow active? (Toggle in top-right)
3. Did you copy the ENTIRE system message? (Should start with "You are an intelligent intent parser...")
4. Try reloading the n8n page
5. Try a different command variation: "show all customers"

### Issue: "Now nothing works at all"

**Rollback Steps:**
1. Open the Planning AI node
2. Delete the system message
3. Use the old system message from `EXACT_CODE_FIXES_FOR_WORKFLOW.md` instead
4. Save and test

### Issue: "Customers work but now tickets are broken"

**Likely cause:** You have a typo in the system message

**Fix:**
1. Re-copy the ENTIRE contents from `UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt`
2. Make sure no extra characters were added
3. Verify the examples section shows both customer AND ticket examples

---

## 📈 Success Metrics

After applying all fixes, you should see:

✅ "list customers" routes to `list_customers` action
✅ "show customers" routes to `list_customers` action
✅ "list tickets" still routes to `list_tickets` action (not broken)
✅ "how many customers" shows customer count, not agent stats
✅ "how many tickets" shows ticket stats correctly
✅ All other commands still work as before

---

## 🎯 Root Cause Analysis

### Why This Happened

1. **Planning AI Issue:** The system message didn't have explicit disambiguation between customer vs ticket operations
2. **Conversational AI Issue:** Didn't check what the user originally asked for before generating response
3. **Similar Keywords:** Words like "list", "show", "how many" apply to both customers and tickets, confusing the AI without explicit rules

### The Fixes

1. **Planning AI:** Added priority-ordered intent detection with explicit "customer" vs "ticket" keyword checking
2. **Conversational AI:** Added instruction to check original user question before responding

---

## ⏱️ Timeline

- **Fix #1 (Planning AI):** 5 minutes
- **Fix #2 (Conversational AI):** 3 minutes
- **Testing:** 5-7 minutes
- **Total:** 13-15 minutes

---

## 📁 Related Files

- `UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt` - New Planning AI system message
- `QUICK_FIX_GUIDE_BUG4.md` - Step-by-step guide for Fix #1
- `CONVERSATIONAL_AI_FIX_CUSTOMER_METRICS.md` - Step-by-step guide for Fix #2
- `HOW_TO_APPLY_BUG4_FIX.md` - Detailed implementation guide
- `BUG_FIXES_V23_TABLE_FORMATTING.md` - Complete bug documentation

---

## 🚀 Next Steps After Tightening

Once all fixes are applied and tested:

1. ✅ Mark v23 as production-ready
2. ✅ Update workflow documentation
3. ✅ Run comprehensive UAT testing with real users
4. ✅ Monitor Supabase logs for correct action routing
5. ✅ Consider adding more customer-specific actions (if needed)

---

**Status:** ✅ Ready to implement
**Priority:** CRITICAL - Blocking correct customer operations
**Confidence:** HIGH - Clear, targeted fixes
**Impact:** Immediate improvement in customer/ticket disambiguation
