# Implementation Plan: HTTP Request Replacement
## Phase 1 - Critical Fix for Gorgias Slack Terminal

**Date Created:** November 5, 2025
**Estimated Time:** 2-3 hours
**Status:** 🔵 Ready to Start
**Approach:** Option 2 - HTTP Request with OpenAI Structured Outputs

---

## 🎯 Goal

Replace unreliable AI Agent (95% success rate) with HTTP Request to OpenAI API (100% guaranteed valid JSON).

**Success Criteria:**
- ✅ Zero "Model output doesn't fit required format" errors
- ✅ All 16 Gorgias actions work correctly
- ✅ Workflow executes end-to-end successfully
- ✅ Old nodes removed and workflow cleaned up

---

## 📋 Implementation Checklist

### Step 0: Preparation (10 minutes)
- [ ] Create backup of current workflow JSON
- [ ] Export current workflow from n8n
- [ ] Save to: `archive/workflow_before_http_fix_[timestamp].json`
- [ ] Document current node IDs for rollback
- [ ] Take screenshots of current setup

**Files to backup:**
- Current workflow JSON (full export)
- "Plan AI Agent" node configuration
- "Handle Plan Response" node code

---

### Step 1: Create New HTTP Request Node (30 minutes)

#### 1.1: Set Up OpenAI Credential
- [ ] Go to n8n → Credentials → Add Credential
- [ ] Select "HTTP Header Auth"
- [ ] Name: "OpenAI Header Auth"
- [ ] Header Name: `Authorization`
- [ ] Header Value: `Bearer YOUR_OPENAI_API_KEY`
- [ ] Test credential
- [ ] Save credential

**Checkpoint:** ✅ Credential created and tested

#### 1.2: Create HTTP Request Node
- [ ] Click **+** after "Parse Slack" node
- [ ] Search for "HTTP Request"
- [ ] Add "HTTP Request" node
- [ ] Name it: "OpenAI Structured Output"
- [ ] Position at: [-5184, 48] (same position as old AI Agent)

**Checkpoint:** ✅ Node created

#### 1.3: Configure HTTP Request Node
- [ ] Method: POST
- [ ] URL: `https://api.openai.com/v1/chat/completions`
- [ ] Authentication: "Predefined Credential Type" → "Header Auth"
- [ ] Select credential: "OpenAI Header Auth"
- [ ] Content-Type header: `application/json`
- [ ] Copy JSON body from: `workflows/OpenAI_Structured_Output_Node.json`
- [ ] Verify `strict: true` is set in response_format
- [ ] Set Response Format: JSON

**Checkpoint:** ✅ Node configured with all parameters

#### 1.4: Verify JSON Body Contains All Actions
- [ ] Verify enum contains all 18 actions:
  - ask_clarification
  - analyze_insights
  - list_metrics
  - get_customer
  - find_user
  - list_customers
  - get_ticket
  - list_tickets
  - search_tickets
  - create_ticket
  - close_ticket
  - set_status
  - assign_ticket
  - set_priority
  - add_tags
  - remove_tags
  - reply_public
  - comment_internal

**Checkpoint:** ✅ All actions present in schema

---

### Step 2: Update "Handle Plan Response" Node (20 minutes)

#### 2.1: Backup Current Code
- [ ] Open "Handle Plan Response" node
- [ ] Copy entire current code
- [ ] Save to: `archive/handle_plan_response_OLD.js`

**Checkpoint:** ✅ Old code backed up

#### 2.2: Replace with Simplified Code
- [ ] Open "Handle Plan Response" node
- [ ] Delete all current code
- [ ] Copy new code from: `workflows/Handle_Plan_Response_Simplified.js`
- [ ] Paste into node
- [ ] Save node

**Checkpoint:** ✅ New code installed

#### 2.3: Verify Code References
- [ ] Code references: `$('Parse Slack').first().json.user_text` ✓
- [ ] Code references: `$('Parse Slack').first().json.channel` ✓
- [ ] Code references: `$('Parse Slack').first().json.thread_ts` ✓
- [ ] Code returns: `{json: {plan: [...], user_text, channel, thread_ts}}` ✓

**Checkpoint:** ✅ Code structure verified

---

### Step 3: Update Node Connections (10 minutes)

#### 3.1: Document Current Connections
- [ ] Screenshot current connection flow
- [ ] Note: Parse Slack → Plan AI Agent → Handle Plan Response

#### 3.2: Delete Old Connections
- [ ] Delete connection: Parse Slack → Plan AI Agent
- [ ] Delete connection: Plan AI Agent → Handle Plan Response

**Checkpoint:** ✅ Old connections removed

#### 3.3: Create New Connections
- [ ] Connect: Parse Slack → OpenAI Structured Output (new node)
- [ ] Connect: OpenAI Structured Output → Handle Plan Response
- [ ] Verify: Handle Plan Response → Format Session (unchanged)

**Checkpoint:** ✅ New connections established

#### 3.4: Verify Full Flow
- [ ] Slack Trigger → Parse Slack → OpenAI Structured Output → Handle Plan Response → Format Session → Insert Session → ...

**Checkpoint:** ✅ Complete flow verified visually

---

### Step 4: Initial Testing (30 minutes)

#### 4.1: Test Node Execution
- [ ] Open "OpenAI Structured Output" node
- [ ] Click "Execute Node"
- [ ] Verify output contains: `choices[0].message.content`
- [ ] Verify content is JSON string with `plan` array

**Checkpoint:** ✅ HTTP Request returns valid response

#### 4.2: Test Plan Parsing
- [ ] Execute "Handle Plan Response" node
- [ ] Verify output contains: `{plan: [...], user_text, channel, thread_ts}`
- [ ] Verify plan array has valid structure

**Checkpoint:** ✅ Plan parsing works

#### 4.3: Test Simple Queries (using pinned data)

**Test Case 1: List Tickets**
- [ ] Input: "show open tickets"
- [ ] Expected plan: `[{step: 1, action: "list_tickets", status: "open", limit: 50}]`
- [ ] Execute workflow
- [ ] Verify plan generated correctly

**Test Case 2: Get Ticket**
- [ ] Input: "get ticket 226392965"
- [ ] Expected plan: `[{step: 1, action: "get_ticket", ticket_id: "226392965"}]`
- [ ] Execute workflow
- [ ] Verify plan generated correctly

**Test Case 3: Search**
- [ ] Input: "search tickets about billing"
- [ ] Expected plan: `[{step: 1, action: "search_tickets", query: "billing"}]`
- [ ] Execute workflow
- [ ] Verify plan generated correctly

**Checkpoint:** ✅ All 3 test cases pass

---

### Step 5: Full Integration Testing (40 minutes)

#### 5.1: Test All 16 Core Actions

| # | Action | Test Query | Expected Plan | Status |
|---|--------|------------|---------------|--------|
| 1 | list_tickets | "show open tickets" | action: list_tickets, status: open | [ ] |
| 2 | get_ticket | "get ticket 226392965" | action: get_ticket, ticket_id: "226392965" | [ ] |
| 3 | search_tickets | "search billing" | action: search_tickets, query: "billing" | [ ] |
| 4 | create_ticket | "create ticket for test@example.com" | action: create_ticket, customer_email: "test@example.com" | [ ] |
| 5 | close_ticket | "close ticket 123" | action: set_status, ticket_id: "123", status: "closed" | [ ] |
| 6 | set_status | "set ticket 123 to open" | action: set_status, ticket_id: "123", status: "open" | [ ] |
| 7 | assign_ticket | "assign ticket 123 to alex@example.com" | action: assign_ticket, ticket_id: "123", assignee_email: "alex@example.com" | [ ] |
| 8 | set_priority | "set ticket 123 to urgent" | action: set_priority, ticket_id: "123", priority: "urgent" | [ ] |
| 9 | add_tags | "add tag billing to ticket 123" | action: add_tags, ticket_id: "123", tags: "billing" | [ ] |
| 10 | remove_tags | "remove tag spam from ticket 123" | action: remove_tags, ticket_id: "123", tags: "spam" | [ ] |
| 11 | reply_public | "reply to ticket 123 with thanks" | action: reply_public, ticket_id: "123", message: "thanks" | [ ] |
| 12 | comment_internal | "add note to ticket 123 customer called" | action: comment_internal, ticket_id: "123", message: "customer called" | [ ] |
| 13 | list_customers | "list customers" | action: list_customers | [ ] |
| 14 | get_customer | "get customer 456" | action: get_customer, customer_id: "456" | [ ] |
| 15 | find_user | "find user alex@example.com" | action: find_user, email: "alex@example.com" | [ ] |
| 16 | analyze_insights | "show me insights" | action: analyze_insights | [ ] |

**Checkpoint:** ✅ All 16 actions generate correct plans

#### 5.2: Test Edge Cases

**Test Case 4: Missing Parameter (Clarification)**
- [ ] Input: "set priority to urgent" (no ticket ID)
- [ ] Expected: `[{action: "ask_clarification", question: "Which ticket..."}]`
- [ ] Execute workflow
- [ ] Verify clarification generated

**Test Case 5: Invalid Input**
- [ ] Input: "hello"
- [ ] Expected: Fallback to list_tickets or conversational
- [ ] Execute workflow
- [ ] Verify fallback works

**Test Case 6: Complex Query**
- [ ] Input: "show open tickets from last 7 days"
- [ ] Expected: search_tickets with date filters
- [ ] Execute workflow
- [ ] Verify date extraction works

**Checkpoint:** ✅ Edge cases handled correctly

#### 5.3: End-to-End Test (Full Workflow)
- [ ] Execute entire workflow from Slack Trigger
- [ ] Verify: Parse Slack works
- [ ] Verify: OpenAI Structured Output works
- [ ] Verify: Handle Plan Response works
- [ ] Verify: Format Session works
- [ ] Verify: Execute loop works
- [ ] Verify: Final Slack Reply works

**Checkpoint:** ✅ Full workflow executes successfully

---

### Step 6: Remove Old Nodes (15 minutes)

#### 6.1: Document Nodes to Remove
- [ ] "Plan AI Agent" (ID: d85b8fbd-d6d3-4dc6-80a1-77f09652ac5d)
- [ ] "Structured Output Parser" (ID: 891e00b9-7960-46cb-8389-ccb4d287130b)
- [ ] "OpenAI Chat Model1" (ID: 42e8c62b-6e2a-4732-b980-015138f73eda)

#### 6.2: Verify No Dependencies
- [ ] Check no other nodes reference Plan AI Agent
- [ ] Check no other nodes reference Structured Output Parser
- [ ] Check no other nodes reference OpenAI Chat Model1

**Checkpoint:** ✅ Safe to delete

#### 6.3: Delete Nodes
- [ ] Right-click "Plan AI Agent" → Delete → Confirm
- [ ] Right-click "Structured Output Parser" → Delete → Confirm
- [ ] Right-click "OpenAI Chat Model1" → Delete → Confirm
- [ ] Save workflow

**Checkpoint:** ✅ Old nodes removed

#### 6.4: Verify Workflow Still Works
- [ ] Execute workflow end-to-end
- [ ] Verify no errors
- [ ] Verify all connections intact

**Checkpoint:** ✅ Workflow works after cleanup

---

### Step 7: Documentation & Cleanup (15 minutes)

#### 7.1: Update Workflow Documentation
- [ ] Add comment node explaining HTTP Request approach
- [ ] Document OpenAI credential setup
- [ ] Update any inline comments

#### 7.2: Export Final Workflow
- [ ] Export workflow from n8n
- [ ] Save as: `workflows/Gorgias_Intelligent_v23_HTTP_FIXED.json`
- [ ] Commit to git

#### 7.3: Update README
- [ ] Update README.md to mention HTTP Request approach
- [ ] Add note about 100% reliability
- [ ] Update setup instructions if needed

**Checkpoint:** ✅ Documentation updated

---

## ⏱️ Time Estimates

| Step | Task | Estimated Time | Actual Time |
|------|------|----------------|-------------|
| 0 | Preparation | 10 min | ___ |
| 1 | Create HTTP Request Node | 30 min | ___ |
| 2 | Update Handle Plan Response | 20 min | ___ |
| 3 | Update Connections | 10 min | ___ |
| 4 | Initial Testing | 30 min | ___ |
| 5 | Full Integration Testing | 40 min | ___ |
| 6 | Remove Old Nodes | 15 min | ___ |
| 7 | Documentation | 15 min | ___ |
| **TOTAL** | | **2h 50min** | **___** |

---

## ✅ Success Criteria

### Must Have (Blocking)
- [ ] Zero "Model output doesn't fit required format" errors
- [ ] All 16 core actions generate correct plans
- [ ] Full workflow executes end-to-end
- [ ] Old AI Agent nodes removed
- [ ] Workflow exported and backed up

### Should Have (Important)
- [ ] Edge cases handled (clarification, fallbacks)
- [ ] Documentation updated
- [ ] Changes committed to git
- [ ] Screenshots of new setup

### Nice to Have (Optional)
- [ ] Performance comparison (old vs new)
- [ ] Token usage analysis
- [ ] Updated technical diagrams

---

## 🚨 Rollback Plan

If something goes wrong:

### Quick Rollback (5 minutes)
1. Stop all executions
2. Import backup workflow: `archive/workflow_before_http_fix_[timestamp].json`
3. Re-activate workflow
4. Test with one query
5. Investigate issue

### Partial Rollback
1. Keep HTTP Request node
2. Re-add Handle Plan Response old code
3. Debug issue
4. Fix and retry

### What NOT to Do
- ❌ Don't delete backup files
- ❌ Don't edit production workflow without testing
- ❌ Don't skip checkpoints
- ❌ Don't deviate from plan without documenting

---

## 📊 Testing Matrix

### Query Types to Test
- [ ] Simple list queries ("show tickets")
- [ ] Specific ID queries ("get ticket 123")
- [ ] Search queries ("search for billing")
- [ ] Action queries ("close ticket 123")
- [ ] Multi-parameter queries ("assign ticket 123 to alex@example.com")
- [ ] Missing parameter queries ("close it" with no context)
- [ ] Invalid queries ("hello", "what's the weather")
- [ ] Date-based queries ("tickets from last 7 days")

### Expected Behaviors
- [ ] Valid queries → Correct plan generated
- [ ] Missing params → ask_clarification action
- [ ] Invalid queries → Fallback to list_tickets or conversational
- [ ] All actions → Valid JSON schema
- [ ] Zero parser errors

---

## 🔒 Scope Boundaries

### IN SCOPE (What We're Doing)
✅ Replace AI Agent with HTTP Request
✅ Update Handle Plan Response code
✅ Test all 16 core actions
✅ Remove old nodes
✅ Update documentation

### OUT OF SCOPE (What We're NOT Doing)
❌ Add environment variables (separate task)
❌ Add error handlers (separate task)
❌ Rename workflow files (separate task)
❌ Add workflow settings (separate task)
❌ Modify any Gorgias API nodes
❌ Change Slack integration
❌ Modify Supabase logging
❌ Update Conversational AI prompts
❌ Add new features or actions

**If you want to add something not in scope, we stop and update the plan first.**

---

## 📝 Progress Tracking

### Session 1: ___ (Date)
- Completed steps: ___
- Issues encountered: ___
- Time spent: ___
- Next session plan: ___

### Session 2: ___ (Date)
- Completed steps: ___
- Issues encountered: ___
- Time spent: ___
- Next session plan: ___

---

## 🎯 Current Status

**Last Updated:** November 5, 2025
**Status:** 🔵 Plan Created - Ready to Start
**Next Step:** Step 0 - Preparation (Backup workflow)
**Blocked:** No
**Issues:** None

---

## 📞 When to Ask for Help

Stop and ask if:
- ❓ OpenAI API returns unexpected response structure
- ❓ Handle Plan Response can't parse the response
- ❓ Any step fails after 2 retry attempts
- ❓ Workflow won't execute end-to-end
- ❓ You want to deviate from the plan
- ❓ You're unsure about any step

---

## 🔄 Plan Updates

| Date | Change | Reason | Updated By |
|------|--------|--------|------------|
| Nov 5, 2025 | Initial plan created | Setup implementation plan | Claude |
| | | | |

---

**Ready to start? Begin with Step 0: Preparation (Backup current workflow)**

**Remember: Follow the plan step-by-step. Check off each item. Don't skip checkpoints!**
