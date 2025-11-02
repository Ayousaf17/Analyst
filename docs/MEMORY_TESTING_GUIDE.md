# Memory Feature Testing Guide

**Date:** November 2, 2025
**Feature:** Thread Memory for Gorgias AI Agent
**Purpose:** Comprehensive testing checklist

---

## 🎯 Testing Overview

This guide covers testing for:
1. ✅ Basic pronoun resolution
2. ✅ Multi-step workflows
3. ✅ Context persistence
4. ✅ Memory expiration
5. ✅ Thread isolation
6. ✅ Explicit overrides
7. ✅ Edge cases

**Time Required:** 30-40 minutes for complete testing

---

## 📋 Pre-Testing Checklist

Before starting tests, verify:

- [ ] Supabase table `thread_memory` exists
- [ ] All workflow nodes connected correctly
- [ ] Planning AI system message updated
- [ ] Conversational AI system message updated
- [ ] Workflow is active

**Quick DB Check:**
```sql
SELECT COUNT(*) FROM thread_memory;
```
Should execute without error (count may be 0)

---

## ✅ TEST SUITE 1: Basic Pronoun Resolution

### Test 1.1: "close it" after viewing ticket

**Objective:** Verify memory stores ticket ID and resolves "it"

**Steps:**
1. Send: `@Gorgias Terminal get ticket 234525253`
2. Wait for response
3. Send: `@Gorgias Terminal close it`

**Expected Results:**
- [ ] Step 1: Shows ticket #234525253 details
- [ ] Step 3: Closes ticket #234525253 (not shows list)
- [ ] Response mentions "closed ticket #234525253" or "closed it"

**Verify in Database:**
```sql
SELECT thread_ts, current_ticket_id, last_action
FROM thread_memory
ORDER BY updated_at DESC LIMIT 1;
```

Expected:
```
current_ticket_id: "234525253"
last_action: "close_ticket"
```

---

### Test 1.2: "assign it" after viewing ticket

**Steps:**
1. Send: `@Gorgias Terminal get ticket 234525253`
2. Send: `@Gorgias Terminal assign it to spencer@example.com`

**Expected Results:**
- [ ] Step 2: Assigns ticket #234525253 to Spencer
- [ ] No error about missing ticket ID

---

### Test 1.3: "reply to it" with message

**Steps:**
1. Send: `@Gorgias Terminal get ticket 234525253`
2. Send: `@Gorgias Terminal reply to it with we're working on your issue`

**Expected Results:**
- [ ] Step 2: Sends reply to ticket #234525253
- [ ] Reply contains: "we're working on your issue"

---

## ✅ TEST SUITE 2: Customer Context

### Test 2.1: "show their tickets" after customer email

**Steps:**
1. Send: `@Gorgias Terminal list tickets for john@example.com`
2. Send: `@Gorgias Terminal show their details`

**Expected Results:**
- [ ] Step 1: Shows tickets for john@example.com
- [ ] Step 2: Shows customer details for john@example.com

**Verify in Database:**
```sql
SELECT current_customer_email, last_action
FROM thread_memory
ORDER BY updated_at DESC LIMIT 1;
```

Expected:
```
current_customer_email: "john@example.com"
```

---

### Test 2.2: Customer from list

**Steps:**
1. Send: `@Gorgias Terminal list customers`
2. Note first customer email from response
3. Send: `@Gorgias Terminal show tickets for them`

**Expected Results:**
- [ ] Step 3: Shows tickets for first customer
- [ ] Uses customer from context

---

## ✅ TEST SUITE 3: Multi-Step Workflows

### Test 3.1: Three-step ticket workflow

**Steps:**
1. Send: `@Gorgias Terminal get ticket 234525253`
2. Send: `@Gorgias Terminal assign it to spencer@example.com`
3. Send: `@Gorgias Terminal reply with I've assigned this to our team lead`

**Expected Results:**
- [ ] All three commands work on ticket #234525253
- [ ] No need to repeat ticket ID
- [ ] Memory persists across all 3 commands

**Verify in Database:**
```sql
SELECT recent_history
FROM thread_memory
ORDER BY updated_at DESC LIMIT 1;
```

Expected: Array with 3 entries (get_ticket, assign_ticket, reply_public)

---

### Test 3.2: Investigation workflow

**Steps:**
1. Send: `@Gorgias Terminal search tickets about billing`
2. Note first ticket ID from results
3. Send: `@Gorgias Terminal get that ticket`
4. Send: `@Gorgias Terminal show me the customer's other tickets`
5. Send: `@Gorgias Terminal close the original one`

**Expected Results:**
- [ ] Step 3: Gets ticket from search results
- [ ] Step 4: Shows customer's other tickets
- [ ] Step 5: Closes the ticket from step 3
- [ ] Natural conversation flow

---

## ✅ TEST SUITE 4: Explicit Overrides

### Test 4.1: Explicit ID overrides memory

**Steps:**
1. Send: `@Gorgias Terminal get ticket 111111`
2. Send: `@Gorgias Terminal close ticket 222222`

**Expected Results:**
- [ ] Step 1: Shows ticket #111111
- [ ] Step 2: Closes ticket #222222 (NOT 111111!)
- [ ] Memory updates to ticket #222222

**Verify:**
```sql
SELECT current_ticket_id
FROM thread_memory
ORDER BY updated_at DESC LIMIT 1;
```

Expected: `current_ticket_id: "222222"`

---

### Test 4.2: Explicit email overrides memory

**Steps:**
1. Send: `@Gorgias Terminal list tickets for alice@example.com`
2. Send: `@Gorgias Terminal show tickets for bob@example.com`

**Expected Results:**
- [ ] Step 2: Shows Bob's tickets (NOT Alice's)
- [ ] Memory updates to bob@example.com

---

## ✅ TEST SUITE 5: Memory Expiration

### Test 5.1: Memory expires after 1 hour

**Setup:** This requires waiting or manually adjusting timestamps

**Option A: Wait 1 hour**
1. Send: `@Gorgias Terminal get ticket 234525253`
2. Wait 1 hour and 5 minutes
3. Send: `@Gorgias Terminal close it`

**Expected Results:**
- [ ] Step 3: Shows open tickets (memory expired, doesn't know "it")

---

**Option B: Manual expiration (faster)**

1. Send: `@Gorgias Terminal get ticket 234525253`
2. Manually update expiration in Supabase:
   ```sql
   UPDATE thread_memory
   SET expires_at = NOW() - INTERVAL '5 minutes'
   WHERE thread_ts = '[your thread_ts]';
   ```
3. Run cleanup:
   ```sql
   SELECT cleanup_expired_thread_memory();
   ```
4. Send: `@Gorgias Terminal close it`

**Expected Results:**
- [ ] Step 4: Shows open tickets (memory deleted)

---

### Test 5.2: Memory refresh extends expiration

**Steps:**
1. Send: `@Gorgias Terminal get ticket 234525253`
2. Note expiration time:
   ```sql
   SELECT expires_at FROM thread_memory ORDER BY updated_at DESC LIMIT 1;
   ```
3. Wait 30 minutes
4. Send: `@Gorgias Terminal reply to it with test`
5. Check expiration again

**Expected Results:**
- [ ] Expiration time in step 5 is ~1 hour after step 4 (not step 1)
- [ ] Each interaction refreshes the 1-hour timer

---

## ✅ TEST SUITE 6: Thread Isolation

### Test 6.1: Different threads don't interfere

**Setup:** Need access to create multiple Slack threads

**Steps:**

**Thread 1:**
1. Start new thread, send: `@Gorgias Terminal get ticket 111111`

**Thread 2:**
2. Start different thread, send: `@Gorgias Terminal get ticket 222222`

**Back to Thread 1:**
3. Send: `@Gorgias Terminal close it`

**Expected Results:**
- [ ] Step 3: Closes ticket #111111 (NOT 222222!)
- [ ] Threads are isolated

**Verify in Database:**
```sql
SELECT thread_ts, current_ticket_id
FROM thread_memory
ORDER BY updated_at DESC LIMIT 2;
```

Expected: 2 different `thread_ts` values with different ticket IDs

---

### Test 6.2: Same user, different threads

**Steps:**

**Thread A:**
1. Send: `@Gorgias Terminal get ticket 111111`

**Thread B:**
2. Send: `@Gorgias Terminal get ticket 222222`

**Thread A:**
3. Send: `@Gorgias Terminal reply to it with test`

**Expected Results:**
- [ ] Step 3: Replies to ticket #111111 (Thread A's ticket)
- [ ] No cross-contamination even with same user

---

## ✅ TEST SUITE 7: Edge Cases

### Test 7.1: Empty memory state

**Steps:**
1. Start brand new thread (never used before)
2. Send: `@Gorgias Terminal close it`

**Expected Results:**
- [ ] Shows open tickets (no ticket to close)
- [ ] OR shows message: "Which ticket would you like to close?"
- [ ] Graceful fallback

---

### Test 7.2: Ambiguous pronoun

**Steps:**
1. Send: `@Gorgias Terminal list open tickets`
2. Send: `@Gorgias Terminal close it`

**Expected Results:**
- [ ] Asks for clarification OR shows list again
- [ ] Doesn't randomly pick a ticket

**Note:** This is an edge case - "list" doesn't set `current_ticket_id`

---

### Test 7.3: Multiple entities in one command

**Steps:**
1. Send: `@Gorgias Terminal get ticket 111111 and show customer john@example.com`

**Expected Results:**
- [ ] Stores both ticket_id AND customer_email in memory
- [ ] Subsequent "it" refers to ticket
- [ ] Subsequent "their" refers to customer

**Verify:**
```sql
SELECT current_ticket_id, current_customer_email
FROM thread_memory
ORDER BY updated_at DESC LIMIT 1;
```

Expected: Both fields populated

---

### Test 7.4: Invalid pronoun context

**Steps:**
1. Send: `@Gorgias Terminal list metrics`
2. Send: `@Gorgias Terminal close it`

**Expected Results:**
- [ ] Shows open tickets or asks for clarification
- [ ] Doesn't try to "close" metrics

---

## ✅ TEST SUITE 8: Conversational AI Memory Awareness

### Test 8.1: Acknowledges previous action

**Steps:**
1. Send: `@Gorgias Terminal get ticket 234525253`
2. Send: `@Gorgias Terminal close it`

**Expected in Response:**
- [ ] Response says something like: "I've closed ticket #234525253 (the one you just viewed)"
- [ ] OR "Following up on the ticket you requested..."
- [ ] Acknowledges the context

---

### Test 8.2: Avoids redundant suggestions

**Steps:**
1. Send: `@Gorgias Terminal get ticket 234525253`

**Expected in Response:**
- [ ] Suggestions include: "Close it", "Reply to it", "Assign it"
- [ ] Suggestions DO NOT include: "View ticket details" (already did that!)

---

### Test 8.3: Progressive workflow suggestions

**Steps:**
1. Send: `@Gorgias Terminal list customers`
2. Check response suggestions

**Expected:**
- [ ] Suggests: "View specific customer"
- [ ] Suggests: "Show tickets for a customer"
- [ ] Contextually relevant next steps

---

## 📊 Testing Results Template

### Summary

**Date Tested:** _______________
**Tester:** _______________
**Environment:** Production / Staging / Dev

**Results:**

| Test Suite | Passed | Failed | Notes |
|------------|--------|--------|-------|
| Suite 1: Pronoun Resolution | ___ / 3 | ___ | |
| Suite 2: Customer Context | ___ / 2 | ___ | |
| Suite 3: Multi-Step Workflows | ___ / 2 | ___ | |
| Suite 4: Explicit Overrides | ___ / 2 | ___ | |
| Suite 5: Memory Expiration | ___ / 2 | ___ | |
| Suite 6: Thread Isolation | ___ / 2 | ___ | |
| Suite 7: Edge Cases | ___ / 4 | ___ | |
| Suite 8: Conversational AI | ___ / 3 | ___ | |
| **TOTAL** | **___ / 20** | **___** | |

**Pass Rate:** ____%

---

### Issues Found

| Test | Issue Description | Severity | Status |
|------|-------------------|----------|--------|
| | | | |

---

### Recommendations

Based on testing:
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major fixes
- [ ] Requires redesign

---

## 🔧 Debugging Failed Tests

### If pronoun resolution fails:

1. **Check memory is being saved:**
   ```sql
   SELECT * FROM thread_memory ORDER BY updated_at DESC LIMIT 5;
   ```

2. **Check Planning AI receives context:**
   - Look at workflow logs
   - Check Format Memory output
   - Verify system message has memory template variables

3. **Check Planning AI system message:**
   - Should have "THREAD MEMORY CONTEXT" section at top
   - Should have context resolution examples

---

### If threads interfere:

1. **Check thread_ts is unique:**
   ```sql
   SELECT thread_ts, COUNT(*)
   FROM thread_memory
   GROUP BY thread_ts
   HAVING COUNT(*) > 1;
   ```
   Should return empty (no duplicates)

2. **Check Fetch Memory filter:**
   - Should filter by `thread_ts = {{ $('Parse Slack').first().json.thread_ts }}`
   - Should NOT filter by user_id only

---

### If memory doesn't expire:

1. **Check expires_at timestamp:**
   ```sql
   SELECT thread_ts, created_at, updated_at, expires_at
   FROM thread_memory
   ORDER BY updated_at DESC LIMIT 5;
   ```
   - `expires_at` should be ~1 hour after `updated_at`

2. **Run manual cleanup:**
   ```sql
   SELECT cleanup_expired_thread_memory();
   ```
   - Should return count of deleted rows

3. **Check trigger:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'thread_memory_update_timestamp';
   ```
   - Should exist

---

## ✅ Final Acceptance Criteria

Before marking memory feature as **production-ready**:

- [ ] All 20 tests pass (100% or 95%+)
- [ ] No cross-thread contamination
- [ ] Memory expiration works correctly
- [ ] Explicit IDs override memory
- [ ] Pronoun resolution works in 90%+ of cases
- [ ] Database table has proper indexes
- [ ] Auto-cleanup function works
- [ ] Token usage increase is acceptable (<50%)
- [ ] Performance is acceptable (<500ms overhead)
- [ ] User feedback is positive

---

**Testing Completed:** ☐ Yes ☐ No
**Production Ready:** ☐ Yes ☐ No
**Sign-off:** _______________

---

## 📈 Performance Benchmarks

Track these metrics during testing:

| Metric | Before Memory | After Memory | Change |
|--------|---------------|--------------|--------|
| Avg Response Time | ___ms | ___ms | ___% |
| Token Usage | ___tokens | ___tokens | ___% |
| Cost per Request | $___  | $___  | ___% |
| Database Queries | ___/req | ___/req | ___% |

**Acceptable Ranges:**
- Response time: +10-20%
- Token usage: +30-50%
- Cost: +30-50%
- DB queries: +2 per request (1 SELECT, 1 UPSERT)

---

## 🎓 What Good Looks Like

### Example: Successful Pronoun Resolution

**User:**
```
@Gorgias Terminal get ticket 234525253
```

**Response:**
```
🎫 Ticket #234525253

Subject: Billing Issue
Status: Open
Priority: Normal
Customer: john@example.com

💡 What would you like to do?
• Close it: "@Gorgias Terminal close it"
• Reply: "@Gorgias Terminal reply to it with [message]"
• Assign: "@Gorgias Terminal assign it to [agent]"
```

**User:**
```
close it
```

**Response:**
```
✅ I've closed ticket #234525253 (the one you just viewed).

What would you like to do next?
• View customer's other tickets: "@Gorgias Terminal show john@example.com tickets"
• Get another ticket: "@Gorgias Terminal get ticket [ID]"
```

✅ **Perfect!** Context used correctly, natural flow.

---

**Total Testing Time:** 30-40 minutes
**Recommended Frequency:** After every deployment, monthly regression
**Documentation:** Keep this checklist updated with new edge cases
