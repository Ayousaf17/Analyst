# UAT Testing Checklist - Gorgias AI Agent v23

> Comprehensive User Acceptance Testing plan for production deployment

**Estimated Timeline:** 9-12 days total
**Recommended Team Size:** 3-5 customer support agents

---

## 📋 Testing Overview

### Objectives
1. Verify all 16 actions execute correctly with accurate responses
2. Confirm Supabase logging and correlation tracking works
3. Validate rate limit optimizations under load
4. Test error scenarios and edge cases
5. Gather real-world feedback from support team

### Success Criteria
- ✅ 95%+ accuracy on responses
- ✅ <5% error rate
- ✅ <3s average response time
- ✅ Zero parser failures
- ✅ Positive user feedback

---

## Phase 1: Basic Action Validation (2-3 days)

**Objective:** Verify all 16 actions execute correctly with accurate responses

### Test Cases

#### 1. Single Ticket Retrieval
**Command:**
```
@Gorgias Terminal get ticket 226392965
```

**Expected Result:**
- Full ticket details formatted beautifully
- Shows: ID, subject, customer, status, assignee, tags, messages

**Verification:**
- [ ] Ticket ID matches
- [ ] Customer email correct
- [ ] Status accurate
- [ ] Assignee shown
- [ ] Tags displayed
- [ ] Formatting is clean and readable

---

#### 2. List Tickets (Small Set ≤10)
**Command:**
```
@Gorgias Terminal show me open tickets
```

**Expected Result:**
- Numbered list with ticket details
- Shows: ID, subject, customer, status

**Verification:**
- [ ] All tickets shown (full list)
- [ ] Proper numbering
- [ ] Formatting consistent
- [ ] Status filter applied correctly

---

#### 3. List Tickets (Large Set >10)
**Command:**
```
@Gorgias Terminal show me all tickets
```

**Expected Result:**
- First 10 tickets shown with details
- Message: "Showing 10 of X tickets"
- AI suggests refining query

**Verification:**
- [ ] Smart sampling works (10 shown)
- [ ] Total count accurate
- [ ] AI mentions more available
- [ ] No rate limit errors

---

#### 4. Search Tickets
**Command:**
```
@Gorgias Terminal search tickets about billing
```

**Expected Result:**
- Tickets matching "billing" keyword
- Relevant results only

**Verification:**
- [ ] Query parameter passed correctly
- [ ] Results are relevant
- [ ] No unrelated tickets
- [ ] Search works across subject/body

---

#### 5. Close Ticket
**Command:**
```
@Gorgias Terminal close ticket 12345
```

**Expected Result:**
- Confirmation message
- "Ticket #12345 has been closed"

**Verification:**
- [ ] Ticket status changed to "closed" in Gorgias
- [ ] Confirmation message accurate
- [ ] No errors

**⚠️ Note:** Use a test ticket, not production

---

#### 6. Assign Ticket
**Command:**
```
@Gorgias Terminal assign ticket 12345 to sarah@ironside.com
```

**Expected Result:**
- Assignment confirmation
- "Ticket #12345 assigned to Sarah"

**Verification:**
- [ ] Assignee updated in Gorgias
- [ ] Correct user assigned
- [ ] Confirmation message accurate

---

#### 7. Set Priority
**Command:**
```
@Gorgias Terminal set ticket 12345 to urgent
```

**Expected Result:**
- Priority change confirmation
- "Ticket #12345 priority set to urgent"

**Verification:**
- [ ] Priority updated in Gorgias
- [ ] Correct priority value (urgent)
- [ ] Confirmation message accurate

---

#### 8. Add Tags
**Command:**
```
@Gorgias Terminal tag ticket 12345 with refund
```

**Expected Result:**
- Tag added confirmation
- "Tag 'refund' added to ticket #12345"

**Verification:**
- [ ] Tag appears in Gorgias
- [ ] Correct tag name
- [ ] Existing tags preserved

---

#### 9. Remove Tags
**Command:**
```
@Gorgias Terminal remove tag refund from ticket 12345
```

**Expected Result:**
- Tag removal confirmation
- "Tag 'refund' removed from ticket #12345"

**Verification:**
- [ ] Tag removed from Gorgias
- [ ] Other tags preserved
- [ ] Confirmation message accurate

---

#### 10. List Customers
**Command:**
```
@Gorgias Terminal show me customers
```

**Expected Result:**
- Customer list with names and emails
- Recent customers shown

**Verification:**
- [ ] Customer data accurate
- [ ] Email addresses correct
- [ ] Names shown
- [ ] Formatting clean

---

#### 11. Get Customer
**Command:**
```
@Gorgias Terminal get customer customer@email.com
```

**Expected Result:**
- Customer details
- Associated tickets
- Contact information

**Verification:**
- [ ] Email matches
- [ ] Name correct
- [ ] Tickets listed
- [ ] All data accurate

---

#### 12. List Metrics
**Command:**
```
@Gorgias Terminal how many tickets today?
```

**Expected Result:**
- Statistics and breakdown
- Open/closed counts
- Insights and trends

**Verification:**
- [ ] Numbers accurate
- [ ] Calculations correct
- [ ] Insights provided
- [ ] Formatting clear

---

#### 13. Create Ticket
**Command:**
```
@Gorgias Terminal create ticket for customer@email.com about order issue with subject "Order #12345 problem"
```

**Expected Result:**
- New ticket created
- Confirmation with ticket ID

**Verification:**
- [ ] Ticket exists in Gorgias
- [ ] Customer correct
- [ ] Subject matches
- [ ] Body content included

**⚠️ Note:** Use test data only

---

#### 14. Add Internal Note
**Command:**
```
@Gorgias Terminal add note to ticket 12345: Customer called about delivery
```

**Expected Result:**
- Note added confirmation
- "Internal note added to ticket #12345"

**Verification:**
- [ ] Internal note appears in Gorgias
- [ ] Note content matches
- [ ] Note is internal (not visible to customer)

---

#### 15. Send Public Reply
**Command:**
```
@Gorgias Terminal reply to ticket 12345: Thank you for contacting us. We'll look into this.
```

**Expected Result:**
- Reply sent confirmation
- "Public reply sent to ticket #12345"

**Verification:**
- [ ] Public message sent to customer
- [ ] Message content matches
- [ ] Message visible in ticket thread

**⚠️ Note:** Use test ticket only

---

#### 16. Vague Request (Default Behavior)
**Command:**
```
@Gorgias Terminal what are the tags?
```

**Expected Result:**
- Falls back to list_tickets (open)
- Shows open tickets as default action

**Verification:**
- [ ] No errors
- [ ] Default action executes
- [ ] Open tickets shown
- [ ] Graceful handling

---

#### 17. Multi-Step Plan
**Command:**
```
@Gorgias Terminal get ticket 12345 and close it
```

**Expected Result:**
- Two-step execution
- Shows ticket details first
- Then closes ticket
- Final summary of both actions

**Verification:**
- [ ] Both actions executed
- [ ] Execution in sequence
- [ ] Both confirmations shown
- [ ] Ticket closed in Gorgias

---

### Phase 1 Summary

**Total Tests:** 17 test cases
**Time Estimate:** 2-3 days
**Pass Criteria:** 16/17 (94%+) must pass

**Sign-off:**
- [ ] All 16 actions tested
- [ ] Test results documented
- [ ] Issues logged (if any)
- [ ] Ready for Phase 2

---

## Phase 2: Observability & Logging (1-2 days)

**Objective:** Verify Supabase logging and correlation tracking works

### Test Cases

#### 1. Supabase agent_sessions Table
**Query:**
```sql
SELECT * FROM agent_sessions
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- Recent sessions appear
- All fields populated

**Verification:**
- [ ] `user_id` populated
- [ ] `channel` correct
- [ ] `raw_text` matches command
- [ ] `action` correct
- [ ] `correlation_id` unique
- [ ] `created_at` accurate

---

#### 2. Supabase api_logs Table
**Query:**
```sql
SELECT * FROM api_logs
WHERE run_id = 'corr_2025-10-30_USER123_abc456'
ORDER BY created_at ASC;
```

**Expected Result:**
- All API calls for one execution
- Chronological order

**Verification:**
- [ ] All steps logged
- [ ] `run_id` matches correlation_id
- [ ] `status_code` captured
- [ ] `request_body` stored
- [ ] `response_body` stored
- [ ] `created_at` sequential

---

#### 3. Correlation Tracking
**Test Steps:**
1. Execute command: `@Gorgias Terminal get ticket 12345 and add tag urgent`
2. Note correlation_id from agent_sessions
3. Query api_logs with that correlation_id

**Expected Result:**
- 2 API calls (get_ticket, add_tags)
- Both linked by correlation_id
- Sequential timestamps

**Verification:**
- [ ] 2 logs found
- [ ] Both have same run_id
- [ ] Correct action names
- [ ] Correct order
- [ ] Request/response bodies captured

---

#### 4. Error Logging
**Test Steps:**
1. Execute command: `@Gorgias Terminal get ticket 999999999` (invalid ID)
2. Check api_logs for error

**Expected Result:**
- Error logged to api_logs
- error_message field populated

**Verification:**
- [ ] Error logged
- [ ] `status_code` = 404
- [ ] `error_message` descriptive
- [ ] correlation_id present
- [ ] Workflow didn't crash

---

### Phase 2 Summary

**Total Tests:** 4 test cases
**Time Estimate:** 1-2 days
**Pass Criteria:** 4/4 (100%) must pass

**Sign-off:**
- [ ] All logging tests passed
- [ ] Correlation tracking verified
- [ ] Error logging confirmed
- [ ] Ready for Phase 3

---

## Phase 3: Rate Limit & Performance (1-2 days)

**Objective:** Stress test with high-volume queries

### Test Cases

#### 1. Large Result Sets
**Commands:**
```
@Gorgias Terminal search tickets about shipping
@Gorgias Terminal show me all closed tickets
```

**Expected Result:**
- Returns 50+ tickets
- No rate limit errors
- Response time <3s
- Smart sampling shows 10 of 50

**Verification:**
- [ ] No "rate limit exceeded" errors
- [ ] Response under 3 seconds
- [ ] Smart sampling working
- [ ] Total count accurate
- [ ] AI mentions "showing 10 of X"

---

#### 2. Rapid Sequential Commands
**Test Steps:**
1. Send 5 commands in 10 seconds:
   - `@Gorgias Terminal show open tickets`
   - `@Gorgias Terminal get ticket 12345`
   - `@Gorgias Terminal search tickets about refund`
   - `@Gorgias Terminal show customers`
   - `@Gorgias Terminal how many tickets today?`

**Expected Result:**
- All 5 execute successfully
- No rate limit errors
- Responses accurate

**Verification:**
- [ ] All 5 commands executed
- [ ] No errors
- [ ] All responses accurate
- [ ] No delays or throttling

---

#### 3. Complex Conversational Responses
**Command:**
```
@Gorgias Terminal show me all tickets from last week
```

**Expected Result:**
- Large result set (50+ tickets)
- Token count <2,500
- Beautiful formatting maintained
- AI suggests "want to see more?"

**Verification:**
- [ ] Token count optimized (check logs)
- [ ] Formatting maintained
- [ ] AI provides insights
- [ ] No rate limit errors

---

#### 4. Token Limit Validation
**Check:**
- Open n8n workflow
- Navigate to "Conversational Response AI" node
- Check OpenAI Chat Model settings

**Expected:**
- max_tokens ≤16,384

**Verification:**
- [ ] max_tokens is 8,000-16,000
- [ ] No "max_tokens too large" errors
- [ ] Configuration correct

---

### Phase 3 Summary

**Total Tests:** 4 test cases
**Time Estimate:** 1-2 days
**Pass Criteria:** 4/4 (100%) must pass

**Sign-off:**
- [ ] No rate limit errors
- [ ] Performance under load verified
- [ ] Token optimization confirmed
- [ ] Ready for Phase 4

---

## Phase 4: Edge Cases & Error Handling (1-2 days)

**Objective:** Test error scenarios and edge cases

### Test Cases

#### 1. Invalid Ticket ID
**Command:**
```
@Gorgias Terminal get ticket 999999999
```

**Expected Result:**
- Graceful error message
- "Ticket #999999999 not found"

**Verification:**
- [ ] No workflow crash
- [ ] Error message clear
- [ ] User informed politely
- [ ] Error logged to Supabase

---

#### 2. Empty Search Results
**Command:**
```
@Gorgias Terminal search tickets about xyz123abc
```

**Expected Result:**
- "No results found" message
- Suggestion to refine query

**Verification:**
- [ ] AI communicates clearly
- [ ] No errors
- [ ] Helpful suggestion provided

---

#### 3. Malformed Commands
**Commands:**
```
@Gorgias Terminal asdfghjkl
@Gorgias Terminal !!!???
@Gorgias Terminal
```

**Expected Result:**
- Falls back to list_tickets (default)
- No errors

**Verification:**
- [ ] No errors
- [ ] Default action executes
- [ ] Open tickets shown
- [ ] Graceful handling

---

#### 4. Missing Required Fields
**Commands:**
```
@Gorgias Terminal close ticket
@Gorgias Terminal assign ticket
@Gorgias Terminal get customer
```

**Expected Result:**
- AI asks for ticket ID or defaults gracefully
- Or falls back to default action

**Verification:**
- [ ] No crashes
- [ ] AI handles gracefully
- [ ] User informed of issue

---

#### 5. Gorgias API Down (Simulated)
**Test Steps:**
1. Temporarily disable Gorgias API credential in n8n
2. Execute command: `@Gorgias Terminal show open tickets`
3. Re-enable credential

**Expected Result:**
- Error logged to Supabase
- User informed: "Unable to connect to Gorgias"
- Workflow doesn't crash

**Verification:**
- [ ] Error logged
- [ ] User informed
- [ ] Workflow recovers
- [ ] No permanent damage

**⚠️ Note:** Test in non-production hours

---

#### 6. OpenAI API Timeout (Simulated)
**Test Steps:**
1. Temporarily disable OpenAI credential
2. Execute command
3. Re-enable credential

**Expected Result:**
- Workflow handles gracefully
- Error message to user
- "AI is temporarily unavailable"

**Verification:**
- [ ] Workflow doesn't crash
- [ ] Error message clear
- [ ] User informed

**⚠️ Note:** Test in non-production hours

---

### Phase 4 Summary

**Total Tests:** 6 test cases
**Time Estimate:** 1-2 days
**Pass Criteria:** 6/6 (100%) must pass

**Sign-off:**
- [ ] All edge cases handled
- [ ] Error messages clear
- [ ] No crashes
- [ ] Ready for Phase 5

---

## Phase 5: User Acceptance (3-5 days)

**Objective:** Real-world usage by Ironside team

### Participants
- 3-5 customer support agents
- 1 technical lead (observer)

### Activities

#### Day 1: Training
- [ ] Demo all 16 actions
- [ ] Show Slack commands
- [ ] Explain expected responses
- [ ] Q&A session

#### Day 2-4: Daily Usage
- [ ] Agents use tool for daily ticket management
- [ ] Log all issues encountered
- [ ] Collect feedback on accuracy
- [ ] Note any confusion or unclear responses

#### Day 5: Feedback & Review
- [ ] Gather final feedback
- [ ] Identify top feature requests
- [ ] Discuss pain points
- [ ] Plan improvements

### Metrics to Track

| Metric | Target | Actual |
|--------|--------|--------|
| Commands per day | 20+ | _____ |
| Error rate | <5% | _____ |
| Avg response time | <3s | _____ |
| User satisfaction | 4/5+ | _____ |
| Feature requests | _____ | _____ |

### Feedback Form

**Agent Name:** ___________________
**Date:** ___________________

**Questions:**

1. How easy was it to use the Slack commands? (1-5)
   - [ ] 1 (Very difficult)
   - [ ] 2
   - [ ] 3
   - [ ] 4
   - [ ] 5 (Very easy)

2. Were the responses accurate? (1-5)
   - [ ] 1 (Rarely)
   - [ ] 2
   - [ ] 3
   - [ ] 4
   - [ ] 5 (Always)

3. Were the responses formatted clearly? (1-5)
   - [ ] 1 (Very unclear)
   - [ ] 2
   - [ ] 3
   - [ ] 4
   - [ ] 5 (Very clear)

4. Did you encounter any errors?
   - [ ] No
   - [ ] Yes (describe): _______________________

5. What features would you like added?
   - _______________________________________

6. Any other feedback?
   - _______________________________________

---

### Phase 5 Summary

**Total Time:** 3-5 days
**Pass Criteria:**
- [ ] 95%+ accuracy on responses
- [ ] <5% error rate
- [ ] Positive user feedback (4/5+)
- [ ] Team adopts tool for daily use

**Sign-off:**
- [ ] Training completed
- [ ] Daily usage completed
- [ ] Feedback collected
- [ ] Issues documented
- [ ] Ready for production

---

## Final UAT Sign-Off

### Overall Results

| Phase | Status | Pass Rate | Issues Found |
|-------|--------|-----------|--------------|
| Phase 1: Basic Actions | _____ | _____ | _____ |
| Phase 2: Observability | _____ | _____ | _____ |
| Phase 3: Performance | _____ | _____ | _____ |
| Phase 4: Edge Cases | _____ | _____ | _____ |
| Phase 5: User Acceptance | _____ | _____ | _____ |

### Critical Issues Found
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Recommendations
- [ ] Approved for production
- [ ] Approved with minor fixes
- [ ] Requires major fixes before production
- [ ] Not approved

### Sign-Off

**QA Lead:** _____________________ Date: _____
**Technical Lead:** _____________________ Date: _____
**Product Owner:** _____________________ Date: _____

---

## Post-UAT Action Items

### Immediate (Week 1)
- [ ] Fix all critical issues
- [ ] Deploy to production
- [ ] Set up monitoring dashboard
- [ ] Create user documentation

### Short-term (Week 2-4)
- [ ] Address minor issues
- [ ] Implement top feature requests
- [ ] Optimize based on usage data
- [ ] Schedule team training

### Long-term (Month 2+)
- [ ] Plan enhancement phase
- [ ] Evaluate cost optimization
- [ ] Consider feature expansion

---

**Document Version:** 1.0
**Last Updated:** October 30, 2025
**Status:** Ready for UAT

**Need help?** See [TECHNICAL_HANDOFF_V23.md](TECHNICAL_HANDOFF_V23.md) for detailed context.
