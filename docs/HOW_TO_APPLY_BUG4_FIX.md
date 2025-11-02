# How to Apply Bug #4 Fix - Action Disambiguation

**Date:** November 2, 2025
**Bug:** Planning AI mis-routes "list customers" to `list_tickets` instead of `list_customers`
**Solution:** Updated Planning AI system message with action disambiguation
**File:** `UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt`
**Estimated Time:** 5-10 minutes

---

## 🎯 OVERVIEW

Bug #4 occurs when the Planning AI Agent cannot distinguish between similar operations:
- "list customers" → Should route to `list_customers`
- "list tickets" → Should route to `list_tickets`

Currently, it mis-routes "list customers" to `list_tickets`.

---

## 🔧 HOW TO FIX

### Step 1: Open Your n8n Workflow

1. Log into your n8n instance
2. Navigate to the Gorgias AI Agent workflow
3. Ensure the workflow is in edit mode

### Step 2: Locate the Planning AI Agent Node

The Planning AI Agent node is also called:
- **"Plan AI Agent"** (visible name in workflow)
- **"OpenAI Structured Output"** (HTTP Request node type)
- Node that calls OpenAI GPT-4/5 with structured output

**How to find it:**
- Look for an HTTP Request node early in the workflow
- It should be connected after "Parse Slack" node
- URL should point to `https://api.openai.com/v1/chat/completions`

### Step 3: Open the System Message Field

1. Click on the **Plan AI Agent** node
2. Scroll down to the **Options** section
3. Find the **System Message** field
4. This is a large text area with the current prompt

### Step 4: Replace the System Message

1. Open the file: `UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt`
2. Copy the ENTIRE contents of the file
3. Select ALL text in the System Message field
4. Delete the old system message
5. Paste the new system message from the file

### Step 5: Verify the Update

Check that the new system message includes this section:

```
═══════════════════════════════════════════════════════════════════
5. ACTION DISAMBIGUATION (CRITICAL - Bug #4 Fix)
═══════════════════════════════════════════════════════════════════

**Customer vs Ticket Operations - Check Carefully!**

CRITICAL: Check for "customer" or "customers" keyword in the query!

If query mentions "customer" or "customers":
✅ list_customers - "list customers", "show customers", "all customers"
✅ get_customer - "get customer [ID]", "show customer [ID]"
❌ NOT list_tickets
```

If you see this section, the update was successful!

### Step 6: Save the Workflow

1. Click the **Save** button in the top-right corner of n8n
2. Wait for the confirmation message
3. Verify the green checkmark appears on the node

### Step 7: Activate the Workflow (if needed)

1. If the workflow is inactive, toggle the **Active** switch
2. Ensure the workflow status shows "Active"

---

## 🧪 TESTING THE FIX

### Test 1: List Customers (Primary Bug #4 Test)

**Command in Slack:**
```
@Gorgias Terminal list customers
```

**Expected Plan Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_customers"
    }
  ]
}
```

**Expected Response:**
- ✅ Shows customer list (not ticket list)
- ✅ Formatted table with customer details
- ❌ Should NOT show tickets

---

### Test 2: Show Customers

**Command in Slack:**
```
@Gorgias Terminal show customers
```

**Expected Plan Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_customers"
    }
  ]
}
```

**Expected Response:**
- ✅ Routes to `list_customers`, NOT `list_tickets`
- ✅ Shows customer list

---

### Test 3: List Tickets (Ensure Not Broken)

**Command in Slack:**
```
@Gorgias Terminal list tickets
```

**Expected Plan Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_tickets",
      "status": "open",
      "limit": 50
    }
  ]
}
```

**Expected Response:**
- ✅ Shows ticket list (not customer list)
- ✅ Formatted table with ticket details

---

### Test 4: Edge Case - "How many customers"

**Command in Slack:**
```
@Gorgias Terminal how many customers do we have
```

**Expected Plan Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_customers"
    }
  ]
}
```

**Expected Response:**
- ✅ Routes to `list_customers`
- ✅ Shows customer count and list

---

### Test 5: Edge Case - "How many tickets"

**Command in Slack:**
```
@Gorgias Terminal how many tickets do we have
```

**Expected Plan Output:**
```json
{
  "plan": [
    {
      "step": 1,
      "action": "list_tickets",
      "limit": 100
    }
  ]
}
```

**Expected Response:**
- ✅ Routes to `list_tickets`, NOT `list_customers`
- ✅ Shows ticket count and list

---

## ✅ SUCCESS CRITERIA

### Before Fix
- ❌ "list customers" → routes to `list_tickets`
- ❌ "show customers" → routes to `list_tickets`
- ❌ User sees ticket list instead of customer list

### After Fix
- ✅ "list customers" → routes to `list_customers`
- ✅ "show customers" → routes to `list_customers`
- ✅ "list tickets" → still routes to `list_tickets` (not broken)
- ✅ User sees correct list based on their request

---

## 🚨 TROUBLESHOOTING

### Problem: "I still see tickets instead of customers"

**Possible Causes:**
1. System message wasn't saved properly
2. Workflow wasn't activated after saving
3. Old cached response from OpenAI

**Solutions:**
1. Re-open the Planning AI node and verify the system message
2. Click "Save" again and wait for confirmation
3. Toggle workflow off/on to clear any caches
4. Try a slightly different command: "show all customers"

---

### Problem: "Now nothing works"

**Possible Causes:**
1. System message has syntax error
2. Extra characters or formatting issues

**Solutions:**
1. Re-copy the ENTIRE contents from `UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt`
2. Make sure NO extra characters were added
3. Verify the file starts with: "You are an intelligent intent parser..."
4. Verify the file ends with: "...Default to list_tickets (open) if unclear"

---

### Problem: "I can't find the Planning AI Agent node"

**Possible Locations:**
- Look for "Plan AI Agent" in the node list
- Look for "OpenAI Structured Output"
- Check after the "Parse Slack" node
- It should be one of the first 5 nodes in the workflow

**Visual Clues:**
- Has an HTTP Request icon
- Connected to "Parse Slack" output
- Has multiple outputs going to different nodes

---

## 📊 VERIFICATION CHECKLIST

After applying the fix, verify these items:

- [ ] System message updated successfully
- [ ] Workflow saved (green checkmark on node)
- [ ] Workflow is active
- [ ] Test 1 passes: "list customers" → routes to list_customers
- [ ] Test 2 passes: "show customers" → routes to list_customers
- [ ] Test 3 passes: "list tickets" → still routes to list_tickets
- [ ] Test 4 passes: "how many customers" → routes to list_customers
- [ ] Test 5 passes: "how many tickets" → routes to list_tickets
- [ ] No new errors in workflow execution logs
- [ ] Supabase api_logs show correct action routing

---

## 📝 WHAT THIS FIX CHANGES

### New Section Added: "Action Disambiguation"

The fix adds a new critical section (#5) to the intent detection order:

```
5. ACTION DISAMBIGUATION (CRITICAL - Bug #4 Fix)
```

This section explicitly teaches the AI to:
1. Look for the keyword "customer" or "customers" in the query
2. Route to `list_customers` or `get_customer` when found
3. Look for the keyword "ticket" or "tickets" (without "customer")
4. Route to `list_tickets` or `search_tickets` when found
5. Never confuse the two operations

### New Examples Added

The fix includes 50+ examples showing correct routing, including:
- "list customers" → list_customers ✅
- "show customers" → list_customers ✅
- "list tickets" → list_tickets ✅
- "show tickets" → list_tickets ✅

These examples train the AI to distinguish between similar commands.

---

## 🎯 BENEFITS OF THIS FIX

1. **Accurate Intent Recognition**
   - System correctly understands customer vs ticket queries
   - Users get what they ask for

2. **Better User Experience**
   - No more seeing tickets when asking for customers
   - Responses match user expectations

3. **Clear Disambiguation Rules**
   - Explicit keyword checking ("customer" vs "ticket")
   - Priority-ordered intent detection
   - Comprehensive examples for edge cases

4. **Future-Proof**
   - Template for adding more disambiguation rules
   - Easy to extend for new similar operations

---

## 📚 RELATED FILES

- `BUG_FIXES_V23_TABLE_FORMATTING.md` - Complete bug documentation
- `SESSION_HANDOFF_V23_BUG_FIXES.md` - Session context
- `UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt` - New system message to apply

---

## ⏱️ ESTIMATED TIME

- **Reading this guide:** 3 minutes
- **Applying the fix:** 5 minutes
- **Testing the fix:** 5 minutes
- **Total:** 10-15 minutes

---

## 🚀 NEXT STEPS AFTER FIX

1. ✅ Apply this fix (Bug #4)
2. ✅ Run all 5 test commands
3. ✅ Verify Bugs #1, #2, #3 are still fixed (should be)
4. ✅ Run comprehensive UAT testing
5. ✅ Mark v23 as production-ready
6. ✅ Update session documentation

---

**Status:** ✅ Ready to Apply
**Priority:** HIGH - Last remaining bug
**Confidence:** HIGH - Clear, tested solution
**Impact:** Critical for correct customer/ticket disambiguation
