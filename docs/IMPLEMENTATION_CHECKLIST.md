# Implementation Checklist - n8n Workflow Integration

## Overview

This checklist guides you through implementing all Priority 1 and Priority 2 components into your production n8n workflow.

**Estimated Time:** 4-6 hours
**Difficulty:** Moderate
**Risk Level:** Low (all changes are additions, no deletions)

---

## Pre-Implementation

### Backup Current Workflow ✅

**Before making ANY changes:**

1. Open your workflow in n8n: `Gorgias Intelligent v23`
2. Click **Settings** (gear icon) → **Download**
3. Save as: `Gorgias_Intelligent_v23_BACKUP_[DATE].json`
4. Store in safe location

**Why:** If anything goes wrong, you can restore from this backup.

---

## Phase 1: Environment Variables Setup

**Estimated Time:** 20-30 minutes
**Impact:** Critical - Required for all other features

### Step 1.1: Configure n8n.cloud Environment Variables

**For n8n.cloud users ($60 subscription plan):**

This is the recommended and easiest method. All variables are managed through the web UI and apply globally to all workflows.

#### Access Environment Variables Page

1. Go to **n8n Homepage**
2. Click **Settings** (⚙️ gear icon in the top navigation)
3. Click **Environment Variables** in the left sidebar
4. You should see any existing variables (like SUPABASE_URL)

---

#### Add Variables One-by-One

For each variable below, follow these steps:

1. Click **"Add Variable"** button
2. **Variable Name:** Copy the exact name (case-sensitive!)
3. **Value:** Copy the exact value
4. Click **"Save"**

---

#### Variable #1: OPENAI_API_URL

**What it does:** Base URL for OpenAI API calls

- **Variable Name:** `OPENAI_API_URL`
- **Value:** `https://api.openai.com/v1/chat/completions`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #2: OPENAI_MODEL

**What it does:** Specifies which OpenAI model to use

- **Variable Name:** `OPENAI_MODEL`
- **Value:** `gpt-4o-mini-2024-07-18`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #3: OPENAI_MAX_TOKENS

**What it does:** Maximum tokens (words) OpenAI can use in responses

- **Variable Name:** `OPENAI_MAX_TOKENS`
- **Value:** `8000`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #4: OPENAI_TEMPERATURE_PLAN

**What it does:** Controls creativity for planning phase (lower = more focused)

- **Variable Name:** `OPENAI_TEMPERATURE_PLAN`
- **Value:** `0.3`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #5: OPENAI_TEMPERATURE_CONVERSATION

**What it does:** Controls creativity for conversational responses (higher = more creative)

- **Variable Name:** `OPENAI_TEMPERATURE_CONVERSATION`
- **Value:** `0.7`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #6: GORGIAS_BASE_URL

**What it does:** Base URL for your Gorgias API

- **Variable Name:** `GORGIAS_BASE_URL`
- **Value:** `https://ironside.gorgias.com`
  - ⚠️ **Replace "ironside"** with your Gorgias subdomain!

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #7: GORGIAS_API_VERSION

**What it does:** Gorgias API version to use

- **Variable Name:** `GORGIAS_API_VERSION`
- **Value:** `v1`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #8: SUPABASE_URL

**What it does:** Your Supabase project URL

- **Variable Name:** `SUPABASE_URL`
- **Value:** `https://your-project-id.supabase.co`
  - ✅ **You already have this!** Skip if it exists.

- [ ] Already exists or added ✅

---

#### Variable #9: SUPABASE_API_VERSION

**What it does:** Supabase API version to use

- **Variable Name:** `SUPABASE_API_VERSION`
- **Value:** `v1`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #10: SLACK_ERROR_CHANNEL

**What it does:** Slack channel for error notifications

- **Variable Name:** `SLACK_ERROR_CHANNEL`
- **Value:** `#gorgias-errors`
  - ⚠️ **Change to your actual error channel name** (must start with #)

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #11: SLACK_LOG_CHANNEL

**What it does:** Slack channel for general logs (optional)

- **Variable Name:** `SLACK_LOG_CHANNEL`
- **Value:** `#gorgias-logs`
  - ⚠️ **Change to your actual log channel name** (must start with #)

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #12: EXECUTION_TIMEOUT

**What it does:** Maximum time (seconds) a workflow can run

- **Variable Name:** `EXECUTION_TIMEOUT`
- **Value:** `3600`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #13: RETRY_COUNT

**What it does:** How many times to retry on failure

- **Variable Name:** `RETRY_COUNT`
- **Value:** `3`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### Variable #14: RETRY_DELAY

**What it does:** Wait time (milliseconds) between retries

- **Variable Name:** `RETRY_DELAY`
- **Value:** `1000`

Click "Add Variable" → Paste name and value → Save

- [ ] Added ✅

---

#### ✅ All Variables Added!

**You should now have approximately 14 variables in your list:**

```
OPENAI_API_URL
OPENAI_MODEL
OPENAI_MAX_TOKENS
OPENAI_TEMPERATURE_PLAN
OPENAI_TEMPERATURE_CONVERSATION
GORGIAS_BASE_URL
GORGIAS_API_VERSION
SUPABASE_URL (already existed)
SUPABASE_SERVICE_KEY (already existed)
SUPABASE_API_VERSION
SLACK_ERROR_CHANNEL
SLACK_LOG_CHANNEL
EXECUTION_TIMEOUT
RETRY_COUNT
RETRY_DELAY
```

**No restart needed!** Changes take effect immediately in n8n.cloud.

### Step 1.2: Verify Environment Variables

**Test in n8n:**

1. Create a temporary test workflow
2. Add a **Code** node
3. Paste this code:
```javascript
console.log('OPENAI_API_URL:', $env.OPENAI_API_URL);
console.log('GORGIAS_BASE_URL:', $env.GORGIAS_BASE_URL);
console.log('SUPABASE_URL:', $env.SUPABASE_URL);

return [{
  json: {
    openai: $env.OPENAI_API_URL,
    gorgias: $env.GORGIAS_BASE_URL,
    supabase: $env.SUPABASE_URL
  }
}];
```
4. Execute the node
5. Verify all values are correct (not `undefined`)

**✅ If all values show correctly, proceed to Step 1.3**
**❌ If values are `undefined`, check n8n restart and variable syntax**

### Step 1.3: Update OpenAI Structured Output Node

**Location:** Your main workflow → "OpenAI Structured Output" (HTTP Request node)

**Current configuration:**
```json
{
  "url": "https://api.openai.com/v1/chat/completions"
}
```

**New configuration:**
1. Click on the node
2. Find the **URL** field
3. Click the **=** icon (enable expression mode)
4. Replace with: `={{ $env.OPENAI_API_URL }}`
5. Scroll to **Body** → **Parameters**
6. Find `model` field → Enable expression → Replace with: `={{ $env.OPENAI_MODEL }}`
7. Find `max_tokens` field → Enable expression → Replace with: `={{ parseInt($env.OPENAI_MAX_TOKENS) }}`
8. Find `temperature` field → Enable expression → Replace with: `={{ parseFloat($env.OPENAI_TEMPERATURE_PLAN) }}`
9. Click **Save**

**Test:**
- Execute the node manually
- Verify it still works with environment variables

### Step 1.4: Update Conversational Response AI Node

**Location:** Your main workflow → "Conversational Response AI" (HTTP Request node)

**Follow same process as Step 1.3, but:**
- Use `OPENAI_TEMPERATURE_CONVERSATION` instead of `OPENAI_TEMPERATURE_PLAN`

### Step 1.5: Update All 16 Gorgias API Nodes

**Nodes to update:**
1. list_tickets
2. search_tickets (Search Text)
3. get_ticket (Get Ticket Details)
4. create_ticket
5. assign_ticket (Assign Ticket)
6. close_ticket (Close Ticket)
7. set_priority (Set Priority)
8. set_status (Set Status)
9. add_tags (Add Tags)
10. remove_tags (Remove Tags)
11. reply_public (Reply Public)
12. comment_internal (Add Internal Note)
13. list_customers
14. get_customer
15. find_user
16. list_metrics

**For EACH node:**

1. Open the HTTP Request node
2. Find the **URL** field
3. Current value example: `https://ironside.gorgias.com/api/tickets`
4. Click **=** to enable expression mode
5. Replace `https://ironside.gorgias.com` with `={{ $env.GORGIAS_BASE_URL }}`
6. Keep the rest of the URL: `/api/tickets` or `/api/tickets/{{$json.ticket_id}}`, etc.
7. Final example: `={{ $env.GORGIAS_BASE_URL }}/api/tickets/{{$json.ticket_id}}`
8. Click **Save**

**Quick Find:**
- Use Ctrl+F (Cmd+F on Mac) in the workflow canvas
- Search for: `ironside.gorgias.com`
- Replace each occurrence one by one

**Tracking Progress:**
- [ ] list_tickets
- [ ] search_tickets
- [ ] get_ticket
- [ ] create_ticket
- [ ] assign_ticket
- [ ] close_ticket
- [ ] set_priority
- [ ] set_status
- [ ] add_tags
- [ ] remove_tags
- [ ] reply_public
- [ ] comment_internal
- [ ] list_customers
- [ ] get_customer
- [ ] find_user
- [ ] list_metrics

### Step 1.6: Update Supabase Nodes

**Nodes to update:**
- Insert Session (Supabase node)
- Insert api_logs (Supabase node)

**For native Supabase nodes:**
1. The URL is configured in the **credential**, not the node
2. Open n8n → Credentials → Find your Supabase credential
3. Update **Host** field to use: `={{ $env.SUPABASE_URL }}`
4. If using HTTP Request nodes for Supabase, update URL like Gorgias nodes

### Step 1.7: Test Environment Variable Migration

**Test each action type:**

1. **Test get_ticket:**
```
@Gorgias Terminal get ticket 226392965
```

2. **Test list_tickets:**
```
@Gorgias Terminal show me open tickets
```

3. **Test search_tickets:**
```
@Gorgias Terminal search tickets about billing
```

**Expected:** All should work exactly as before.
**If errors occur:** Check environment variable values and node configurations.

---

## Phase 2: Error Handling Implementation

**Estimated Time:** 2-3 hours
**Impact:** High - Improves reliability and user experience

### Step 2.1: Add Error Handler Node

1. Open your workflow in n8n
2. Scroll to the bottom/center of the canvas (find empty space)
3. Click **+** to add new node
4. Select **Code** node
5. Name it: `Error Handler - Gorgias Terminal`
6. Copy code from: `/home/user/Analyst/workflows/Error_Handler_Node.json`
7. Paste the entire JavaScript code into the node
8. Position at coordinates: X=1000, Y=1000 (bottom center)
9. Click **Save**

### Step 2.2: Add Format Error for Slack Node

1. Click **+** next to Error Handler node
2. Select **Code** node
3. Name it: `Format Error for Slack`
4. Copy code from: `/home/user/Analyst/workflows/Format_Error_For_Slack.js`
5. Paste the code
6. Click **Save**
7. Connect: **Error Handler** → **Format Error for Slack**

### Step 2.3: Add Send Error to Slack Node

1. Click **+** next to Format Error for Slack
2. Select **Slack** node
3. Name it: `Send Error to Slack`
4. Configure:
   - **Resource:** Message
   - **Operation:** Post
   - **Channel:** Click **=** → Enter: `={{ $json.channel }}`
   - **Text:** Click **=** → Enter: `={{ $json.text }}`
   - **Additional Fields** → Add **Thread TS**
   - **Thread TS:** Click **=** → Enter: `={{ $json.thread_ts }}`
5. Select your **Slack credential**
6. Click **Save**
7. Connect: **Format Error for Slack** → **Send Error to Slack**

### Step 2.4: Connect Error Outputs - OpenAI Nodes

**Nodes to connect (2 nodes):**

1. **OpenAI Structured Output**
2. **Conversational Response AI**

**For EACH node:**

1. Click on the node
2. Look for the **error output** (red dot on the right side)
3. If you don't see it, right-click the node → **Add error connection**
4. Drag from the red dot to **Error Handler - Gorgias Terminal**
5. A red line should appear connecting them

### Step 2.5: Connect Error Outputs - Gorgias Nodes

**All 16 Gorgias HTTP Request nodes need error connections:**

1. list_tickets
2. search_tickets
3. get_ticket
4. create_ticket
5. assign_ticket
6. close_ticket
7. set_priority
8. set_status
9. add_tags
10. remove_tags
11. reply_public
12. comment_internal
13. list_customers
14. get_customer
15. find_user
16. list_metrics

**For EACH node:**
- Right-click → Add error connection
- Connect to **Error Handler - Gorgias Terminal**

**Progress Tracking:**
- [ ] list_tickets
- [ ] search_tickets
- [ ] get_ticket
- [ ] create_ticket
- [ ] assign_ticket
- [ ] close_ticket
- [ ] set_priority
- [ ] set_status
- [ ] add_tags
- [ ] remove_tags
- [ ] reply_public
- [ ] comment_internal
- [ ] list_customers
- [ ] get_customer
- [ ] find_user
- [ ] list_metrics

### Step 2.6: Connect Error Outputs - Supabase Nodes

**Nodes to connect:**
- Insert Session
- Insert api_logs

**For EACH node:**
- Right-click → Add error connection
- Connect to **Error Handler - Gorgias Terminal**

### Step 2.7: Connect Error Output - Final Slack Reply

**Node:** Final Slack Reply

- Right-click → Add error connection
- Connect to **Error Handler - Gorgias Terminal**

### Step 2.8: Test Error Handling

**Test 1: Invalid Ticket ID**
```
@Gorgias Terminal get ticket 99999999
```

**Expected:**
- Error Handler captures the 404 error
- User receives formatted error message in Slack thread
- Error message includes correlation ID
- Error is logged in n8n execution logs

**Test 2: Check Execution Logs**
1. Go to n8n → **Executions** tab
2. Find the failed execution
3. Open it
4. Verify Error Handler node executed
5. Check console logs for: `❌ Gorgias Terminal Error:`

**✅ If error message appears in Slack, proceed**
**❌ If not, check node connections and Slack credential**

---

## Phase 3: Workflow Settings Configuration

**Estimated Time:** 15 minutes
**Impact:** Medium - Improves resilience

### Step 3.1: Update Workflow Settings

1. Open your workflow in n8n
2. Click **Settings** (gear icon in top right)
3. Go to **Workflow Settings** tab

**Configure the following:**

**Execution:**
- **Execution Timeout:** `3600` (seconds)
- **Save Manual Executions:** ✅ Enable
- **Save Execution Progress:** ✅ Enable

**Error Handling:**
- **Retry on Fail:** ✅ Enable
- **Retry Count:** `3`
- **Retry Delay:** `1000` (milliseconds)

**General:**
- **Timezone:** `UTC`
- **Caller Policy:** `Workflows from same owner`

4. Click **Save**

### Step 3.2: Verify Settings

1. Click **Settings** again
2. Verify all values are set correctly
3. Download workflow to check JSON (optional)

---

## Phase 4: Priority 2 Features

**Estimated Time:** 1-2 hours
**Impact:** Medium - Better UX

### Step 4.1: Add Get Action Emoji Node

**Position:** Between "Format Session" and "Conversational Response AI"

1. Find the **Format Session** node
2. Find the **Conversational Response AI** node
3. **Disconnect** them temporarily
4. Click **+** between them
5. Select **Code** node
6. Name it: `Get Action Emoji`
7. Copy code from: `/home/user/Analyst/workflows/Get_Action_Emoji.js`
8. Paste the code
9. Click **Save**
10. Connect: **Format Session** → **Get Action Emoji** → **Conversational Response AI**

### Step 4.2: Update Conversational Response AI Prompt

**Find the system prompt in Conversational Response AI node:**

**Add this to the beginning of the system prompt:**

```
IMPORTANT: Prepend your response with this emoji: {{ $('Get Action Emoji').first().json.emoji }}

Example response format:
📋 Here are the open tickets:
...
```

**Save the node.**

### Step 4.3: Test Emoji Indicators

Test each action type to see emojis:

```
@Gorgias Terminal show me open tickets
→ Expected: 📋 Here are the open tickets...

@Gorgias Terminal search tickets about billing
→ Expected: 🔍 Found tickets matching "billing"...

@Gorgias Terminal get ticket 226392965
→ Expected: 🎫 Here are the details for ticket #226392965...
```

### Step 4.4: Add Deduplicate Results Node

**Position:** Between "Collect Results" and "Calculate Standard Metrics"

1. Find the **Collect Results** node
2. Find the **Calculate Standard Metrics** node
3. **Disconnect** them temporarily
4. Click **+** between them
5. Select **Code** node
6. Name it: `Deduplicate Results`
7. Copy code from: `/home/user/Analyst/workflows/Deduplicate_Results.js`
8. Paste the code
9. Click **Save**
10. Connect: **Collect Results** → **Deduplicate Results** → **Calculate Standard Metrics**

### Step 4.5: Update Conversational AI to Mention Duplicates

**In Conversational Response AI system prompt, add:**

```
Data Statistics:
- Total results after deduplication: {{ $('Deduplicate Results').first().json.deduplicated_count }}
- Duplicates removed: {{ $('Deduplicate Results').first().json.duplicates_removed }}

If duplicates were removed (duplicates_removed > 0), mention this naturally in your response.
```

### Step 4.6: Test Deduplication

**Create a multi-step query that might return duplicates:**

```
@Gorgias Terminal search billing then list open tickets
```

**Check n8n execution logs:**
- Find **Deduplicate Results** node output
- Verify `duplicates_removed` count
- Check if Conversational AI mentions it

---

## Phase 5: Performance Metrics (Optional but Recommended)

**Estimated Time:** 1-2 hours
**Impact:** High - Data-driven optimization

### Step 5.1: Create Supabase Table

**In Supabase SQL Editor:**

```sql
CREATE TABLE performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  execution_time_seconds DECIMAL(10,2) NOT NULL,
  api_calls_count INTEGER NOT NULL,
  actions_executed INTEGER NOT NULL,
  primary_action TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  token_count_estimate INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_performance_correlation ON performance_metrics(correlation_id);
CREATE INDEX idx_performance_created_at ON performance_metrics(created_at);
CREATE INDEX idx_performance_primary_action ON performance_metrics(primary_action);
```

**Execute the query.**

### Step 5.2: Update Parse Slack Node

**Find the Parse Slack node in your workflow.**

**Add these lines after the correlation_id generation:**

```javascript
// ... existing code ...

// Generate correlation_id
const correlation_id = `corr_${timestamp}_${user_id}_${random}`;

// ✅ ADD THESE LINES:
const start_timestamp = Date.now();
const start_time_iso = new Date().toISOString();

return [{
  json: {
    // ... existing fields ...
    correlation_id,
    start_timestamp: start_timestamp,      // ✅ ADD
    start_time: start_time_iso,            // ✅ ADD
    perf_metrics: {                        // ✅ ADD
      start: start_timestamp
    }
  }
}];
```

**Click Save.**

### Step 5.3: Add Calculate Performance Metrics Node

**Position:** Between "Conversational Response AI" and "Final Slack Reply"

1. Find the connection: **Conversational Response AI** → **Final Slack Reply**
2. **Disconnect** them
3. Click **+** between them
4. Select **Code** node
5. Name it: `Calculate Performance Metrics`
6. Copy code from: `/home/user/Analyst/workflows/Calculate_Performance_Metrics.js`
7. Paste the code
8. Click **Save**
9. Connect: **Conversational Response AI** → **Calculate Performance Metrics** → **Final Slack Reply**

### Step 5.4: Add Insert Performance Metrics Node

**Position:** After "Calculate Performance Metrics", before "Final Slack Reply"

1. Click **+** after Calculate Performance Metrics
2. Select **Supabase** node (or **HTTP Request** if you prefer)
3. Name it: `Insert Performance Metrics`

**Using Supabase Node:**
- **Operation:** Insert
- **Table:** performance_metrics
- **Fields:**
  - correlation_id: `={{ $json.performance_metrics.correlation_id }}`
  - execution_time_ms: `={{ $json.performance_metrics.execution_time_ms }}`
  - execution_time_seconds: `={{ $json.performance_metrics.execution_time_seconds }}`
  - api_calls_count: `={{ $json.performance_metrics.api_calls_count }}`
  - actions_executed: `={{ $json.performance_metrics.actions_executed }}`
  - primary_action: `={{ $json.performance_metrics.primary_action }}`
  - result_count: `={{ $json.performance_metrics.result_count }}`
  - token_count_estimate: `={{ $json.performance_metrics.token_count_estimate }}`

4. Click **Save**
5. Connect: **Calculate Performance Metrics** → **Insert Performance Metrics** → **Final Slack Reply**

### Step 5.5: Test Performance Metrics

**Execute any command:**
```
@Gorgias Terminal get ticket 226392965
```

**Verify in Supabase:**
```sql
SELECT * FROM performance_metrics
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** New row with execution time, API calls, etc.

---

## Phase 6: Final Testing

**Estimated Time:** 30 minutes
**Impact:** Critical - Ensure everything works

### Test Suite

**Test 1: Simple Query**
```
@Gorgias Terminal show me open tickets
```
✅ Should return tickets with emoji (📋)
✅ Should log performance metrics
✅ No errors in Slack

**Test 2: Search Query**
```
@Gorgias Terminal search tickets about billing
```
✅ Should return search results with emoji (🔍)
✅ Should apply filters correctly
✅ Should deduplicate if needed

**Test 3: Error Handling**
```
@Gorgias Terminal get ticket 99999999
```
✅ Should show user-friendly error in Slack
✅ Error should include correlation ID
✅ Error logged in n8n executions

**Test 4: Multi-Step Query**
```
@Gorgias Terminal search billing then close first ticket
```
✅ Should execute both actions
✅ Should show emojis
✅ Should deduplicate results
✅ Performance metrics captured

**Test 5: Environment Variables**
- Verify all actions work with env vars
- No hardcoded URLs should remain
- Check n8n logs for successful API calls

---

## Rollback Plan

**If something goes wrong:**

1. **Stop the workflow:** Click **Inactive** toggle
2. **Restore from backup:**
   - Go to Workflows → Import
   - Select your backup file
   - Replace current workflow
3. **Reactivate:** Click **Active** toggle
4. **Investigate:** Check n8n execution logs for errors

---

## Success Criteria

### Phase 1: Environment Variables ✅
- [ ] All environment variables configured in n8n
- [ ] OpenAI nodes using $env variables
- [ ] Gorgias nodes (16) using $env variables
- [ ] Supabase nodes using $env variables
- [ ] Test execution successful

### Phase 2: Error Handling ✅
- [ ] Error Handler node added
- [ ] Format Error for Slack node added
- [ ] Send Error to Slack node added
- [ ] All 22+ nodes connected to error handler
- [ ] Error test successful (invalid ticket ID)
- [ ] Error message received in Slack

### Phase 3: Workflow Settings ✅
- [ ] Execution timeout set to 3600
- [ ] Retry on fail enabled (3 retries, 1000ms delay)
- [ ] Save executions and progress enabled
- [ ] Timezone set to UTC

### Phase 4: Priority 2 Features ✅
- [ ] Get Action Emoji node added
- [ ] Conversational AI updated to use emojis
- [ ] Deduplicate Results node added
- [ ] Deduplication tested and working

### Phase 5: Performance Metrics ✅
- [ ] Supabase table created
- [ ] Parse Slack updated with start_timestamp
- [ ] Calculate Performance Metrics node added
- [ ] Insert Performance Metrics node added
- [ ] Metrics test successful (data in Supabase)

---

## Post-Implementation

### Monitoring (First Week)

**Daily:**
- Check Slack for any error messages
- Review n8n execution logs
- Monitor Supabase performance_metrics table

**Weekly:**
- Run analytics queries on performance_metrics
- Review error patterns
- Optimize slow operations if needed

### Documentation

- [ ] Update team documentation with new features
- [ ] Train support team on error messages
- [ ] Document correlation ID lookup process
- [ ] Create runbook for common issues

---

## Estimated Total Time

| Phase | Time |
|-------|------|
| Phase 1: Environment Variables | 45 min |
| Phase 2: Error Handling | 2-3 hrs |
| Phase 3: Workflow Settings | 15 min |
| Phase 4: Priority 2 Features | 1-2 hrs |
| Phase 5: Performance Metrics | 1-2 hrs |
| Phase 6: Testing | 30 min |
| **Total** | **5-8 hours** |

---

## Support

**If you encounter issues:**

1. Check the comprehensive guides:
   - `ENVIRONMENT_VARIABLES_GUIDE.md`
   - `ERROR_HANDLING_GUIDE.md`
   - `WORKFLOW_SETTINGS_GUIDE.md`
   - `PERFORMANCE_METRICS_GUIDE.md`

2. Review n8n execution logs for detailed error messages

3. Test individual nodes in isolation

4. Restore from backup if needed

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Status:** Ready for Implementation

**Good luck with your implementation! 🚀**
