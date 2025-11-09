# STEP 3: Workflow Import & Configuration Guide

## Overview
Import and configure 3 sync workflows for tags, macros, and feedback handling.
**Time Required:** 1 hour
**Prerequisites:** Database setup complete (Step 1)

---

## WORKFLOW 1: Tags Sync (0005)

### Import Steps

1. **Open n8n**
   - Navigate to your n8n instance
   - Click "Workflows" in top navigation
   - Click "+ Add workflow" button

2. **Import JSON**
   - Click "⋯" (three dots menu) in top right
   - Select "Import from File"
   - Choose `0005_HTTP_Gorgias_Sync_Tags.json`
   - Click "Import"

3. **Configure Credentials**

#### Node: "Fetch Tags from Gorgias"
- **Credential Type:** HTTP Basic Auth
- **URL:** `https://ironsidecomputers.gorgias.com/api/tags`
- **Authentication:**
  - Username: Your Gorgias email
  - Password: Your Gorgias API key
- **Method:** GET

#### Node: "Upsert to Supabase"
- **Credential Type:** Supabase API
- **Supabase URL:** `https://your-project.supabase.co`
- **Service Key:** Your Supabase service role key
- **Table:** `gorgias_tags`
- **Operation:** Upsert

#### Node: "Log Sync Results"
- **Credential Type:** Supabase API (same as above)
- **Table:** `sync_logs`
- **Operation:** Insert

#### Node: "Notify Slack" (Optional)
- **Credential Type:** Slack API
- **Channel ID:** Your monitoring channel
- **Message:** Sync completion notification

4. **Test Workflow**
   ```
   1. Click "Test workflow" button
   2. Click "Execute workflow"
   3. Watch nodes turn green
   4. Check execution log for errors
   ```

5. **Verify Data**
   ```sql
   -- Check tags were synced
   SELECT COUNT(*) as tag_count FROM gorgias_tags;
   -- Should have 20+ tags

   -- View top tags by category
   SELECT category, COUNT(*) as count
   FROM gorgias_tags
   WHERE is_active = true
   GROUP BY category
   ORDER BY count DESC;
   ```

6. **Activate Workflow**
   - Toggle "Active" switch (top right)
   - Workflow will run daily at 2:00 AM

### Expected Results
- ✅ 20-50 tags populated
- ✅ Tags auto-categorized (billing, shipping, technical, etc.)
- ✅ Usage counts updated
- ✅ Sync log entry created
- ✅ Slack notification sent (if configured)

---

## WORKFLOW 2: Macros Sync (0006)

### Import Steps

1. **Import JSON**
   - Click "+ Add workflow"
   - Import `0006_HTTP_Gorgias_Sync_Macros.json`

2. **Configure Credentials**

#### Node: "Fetch Macros from Gorgias"
- **URL:** `https://ironsidecomputers.gorgias.com/api/macros`
- **Credential:** Same Gorgias HTTP Basic Auth as tags workflow

#### Node: "Parse Macro Content"
- **No credentials needed**
- Extracts macro name, description, and content

#### Node: "Categorize Macros"
- **Auto-categorization logic:**
  - Keywords like "refund" → category: refund
  - Keywords like "shipping" → category: shipping
  - Keywords like "apology" → category: apology
  - Default → category: general

#### Node: "Upsert to Supabase"
- **Table:** `gorgias_macros`
- **Credential:** Supabase API (same as tags)

#### Node: "Log Sync Results"
- **Table:** `sync_logs`

#### Node: "Notify Slack"
- **Optional:** Slack notification

3. **Test Workflow**
   ```
   1. Execute manually
   2. Check for errors
   3. Verify data populated
   ```

4. **Verify Data**
   ```sql
   -- Check macros were synced
   SELECT COUNT(*) as macro_count FROM gorgias_macros;
   -- Should have 10+ macros

   -- View macros by category
   SELECT category, COUNT(*) as count,
          STRING_AGG(macro_name, ', ') as macros
   FROM gorgias_macros
   WHERE is_active = true
   GROUP BY category;

   -- Sample macro content
   SELECT macro_name,
          LEFT(macro_description, 50) as description,
          LEFT(macro_content, 100) as preview
   FROM gorgias_macros
   LIMIT 5;
   ```

5. **Activate Workflow**
   - Toggle "Active"
   - Runs daily at 2:15 AM

### Expected Results
- ✅ 10-30 macros populated
- ✅ Macros have content, description, and category
- ✅ Sync log entry created
- ✅ Slack notification sent

---

## WORKFLOW 3: Feedback Handler (0007)

### Purpose
This workflow handles button clicks on Slack messages (✅ Correct / ❌ Wrong feedback).

### Import Steps

1. **Import JSON**
   - Import `0007_HTTP_Slack_Feedback_Handler.json`

2. **Configure Slack App Settings**

   **IMPORTANT:** Your Slack app needs interactivity enabled.

   #### In Slack API Dashboard (api.slack.com/apps):

   a. **Enable Interactivity:**
   - Go to "Interactivity & Shortcuts"
   - Turn ON "Interactivity"
   - **Request URL:** `https://your-n8n-instance.com/webhook/slack-feedback`
     (Get this URL from the webhook trigger node in n8n)

   b. **Add Scopes (if not already added):**
   - Go to "OAuth & Permissions"
   - Add scopes:
     - `chat:write` (send messages)
     - `im:write` (send DMs)
     - `users:read` (get user info)

   c. **Reinstall App:**
   - After changing settings, reinstall the app to your workspace

3. **Configure Workflow Nodes**

#### Node: "Webhook - Slack Interaction"
- **Webhook URL:** Copy this URL
- **HTTP Method:** POST
- **Response Mode:** Respond to Last Node
- **Authentication:** None (Slack signs requests)

#### Node: "Parse Interaction Payload"
- **No credentials needed**
- Extracts:
  - `correlation_id` (from button value)
  - `user_id` (who clicked)
  - `action_id` (feedback_correct or feedback_wrong)

#### Node: "Update Confidence Score"
- **Credential:** Supabase API
- **Table:** `ai_confidence_scores`
- **Operation:** Update
- **Updates:**
  - `user_feedback` = 'correct' or 'incorrect'
  - `feedback_user_id` = Slack user ID
  - `feedback_at` = NOW()

#### Node: "If Wrong - Open Modal"
- **Condition:** If `action_id` = 'feedback_wrong'
- **Opens Slack modal** asking:
  - "What should the action have been?"
  - Dropdown with all available actions

#### Node: "Save Correction"
- **Credential:** Supabase API
- **Updates:**
  - `actual_action` = user's correction
  - `correction_notes` = optional notes

#### Node: "Send Confirmation"
- **Credential:** Slack API
- **Message:** "Thanks for the feedback! 🎯"

4. **Test Workflow**

   **Manual Test:**
   ```
   1. Send a command in Slack (e.g., "show me open tickets")
   2. Bot responds with feedback buttons
   3. Click ✅ Correct
      → Should see "Thanks for the feedback!"
      → Check Supabase: user_feedback = 'correct'

   4. Send another command
   5. Click ❌ Wrong
      → Modal appears with action dropdown
      → Select correct action
      → Submit
      → Check Supabase: actual_action updated
   ```

   **Verify in Database:**
   ```sql
   -- Check feedback was recorded
   SELECT
     user_message,
     detected_action,
     user_feedback,
     actual_action,
     feedback_at
   FROM ai_confidence_scores
   WHERE user_feedback IS NOT NULL
   ORDER BY feedback_at DESC
   LIMIT 5;
   ```

5. **Activate Workflow**
   - Toggle "Active"
   - Now always listening for button clicks

### Expected Results
- ✅ Clicking ✅ Correct records positive feedback
- ✅ Clicking ❌ Wrong opens correction modal
- ✅ Corrections saved to database
- ✅ Confirmation message sent
- ✅ Data ready for training analysis

---

## Workflow Schedule Summary

| Workflow | Time | Frequency | Purpose |
|----------|------|-----------|---------|
| **0005 - Tags Sync** | 2:00 AM | Daily | Sync Gorgias tags |
| **0006 - Macros Sync** | 2:15 AM | Daily | Sync Gorgias macros |
| **0007 - Feedback Handler** | Always On | Real-time | Handle button clicks |

---

## Troubleshooting

### Issue: Tags/Macros not syncing

**Check:**
```sql
-- Any sync logs?
SELECT * FROM sync_logs ORDER BY sync_timestamp DESC LIMIT 5;

-- What's the error?
SELECT workflow_name, status, error_message
FROM sync_logs
WHERE status = 'failed'
ORDER BY sync_timestamp DESC;
```

**Common Fixes:**
- ✅ Verify Gorgias API credentials
- ✅ Check Gorgias API URL is correct
- ✅ Ensure Supabase credentials have write permissions
- ✅ Check n8n execution logs for details

### Issue: Feedback buttons not working

**Check:**
- ✅ Is workflow 0007 active?
- ✅ Is Slack app's Request URL set correctly?
- ✅ Does Slack app have `chat:write` scope?
- ✅ Check webhook URL is accessible from internet

**Test Webhook:**
```bash
# Get webhook URL from n8n
# Test with curl:
curl -X POST https://your-n8n-instance.com/webhook/slack-feedback \
  -H "Content-Type: application/json" \
  -d '{"type":"block_actions","user":{"id":"U123"}}'
```

### Issue: Modal not opening

**Check:**
- ✅ Slack app has `im:write` permission
- ✅ Workflow has "Open Modal" node configured
- ✅ Modal payload is valid JSON

---

## Verification Checklist

After importing all workflows:

```sql
-- ✅ Check all workflows active
-- (Manually check n8n dashboard)

-- ✅ Verify tags synced
SELECT COUNT(*) as tags FROM gorgias_tags;
-- Should be > 20

-- ✅ Verify macros synced
SELECT COUNT(*) as macros FROM gorgias_macros;
-- Should be > 10

-- ✅ Check sync logs
SELECT workflow_name, status, records_processed, sync_timestamp
FROM sync_logs
ORDER BY sync_timestamp DESC
LIMIT 5;

-- ✅ Test feedback recording
-- (Click buttons in Slack, then check:)
SELECT COUNT(*) as feedback_count
FROM ai_confidence_scores
WHERE user_feedback IS NOT NULL;
```

---

## Next Steps

After all workflows are active:

1. ✅ **Wait for first sync** (or manually execute)
2. ✅ **Verify data populated** (tags, macros)
3. ✅ **Test feedback buttons** (click in Slack)
4. ✅ **Monitor sync logs** (check daily for errors)
5. ✅ **Move to Step 4** (Verification & Testing)

---

## Quick Reference

### Workflow Files
- `0005_HTTP_Gorgias_Sync_Tags.json` - Tags sync
- `0006_HTTP_Gorgias_Sync_Macros.json` - Macros sync
- `0007_HTTP_Slack_Feedback_Handler.json` - Feedback handler

### Credentials Needed
1. **Gorgias HTTP Basic Auth** (username + API key)
2. **Supabase API** (URL + service key)
3. **Slack API** (OAuth token with scopes)

### Tables Used
- `gorgias_tags` - Stores tags
- `gorgias_macros` - Stores macros
- `sync_logs` - Tracks sync operations
- `ai_confidence_scores` - Stores feedback

---

**Time to Complete:** ~1 hour
**Next Step:** Verification & Testing (Step 4)
