# 🚀 IMPLEMENTATION GUIDE - v23 Enhancements

**Date:** November 9, 2025  
**Goal:** Transform v23 into self-improving, intelligent system  
**Timeline:** 7 weeks (phased)

---

## 📦 WHAT YOU'RE IMPLEMENTING

**Phase 1: Reference Tables** (Week 1)
- Gorgias tags sync
- Gorgias macros sync
- Bot suggests existing tags/macros

**Phase 2: Training Loop** (Week 2-3)
- Confidence scoring
- User feedback mechanism
- Automated prompt improvements
- A/B testing

---

## 📋 FILES PROVIDED

### **Workflow JSON Files** (Import to n8n):
1. `0005_HTTP_Gorgias_Sync_Tags.json` - Tags sync (daily 2am)
2. `0006_HTTP_Gorgias_Sync_Macros.json` - Macros sync (daily 2:15am)
3. `0007_HTTP_Slack_Feedback_Handler.json` - Feedback buttons handler

### **Database Schema**:
4. `DATABASE_SCHEMAS_COMPLETE.sql` - All table definitions

### **Documentation**:
5. `V23-ENHANCEMENT-ROADMAP-COMPLETE.md` - Full vision (40 pages)
6. `CLAUDE-CODE-ENHANCEMENT-PROMPT.md` - Detailed instructions

---

## 🎯 PHASE 1: REFERENCE TABLES (WEEK 1)

### **Step 1: Create Database Tables** (30 minutes)

**1.1 Open Supabase SQL Editor**
- Go to your Supabase project
- Click "SQL Editor" in left sidebar
- Click "New query"

**1.2 Run Schema File**
```sql
-- Copy entire contents of DATABASE_SCHEMAS_COMPLETE.sql
-- Paste into SQL Editor
-- Click "Run" button
```

**Expected result:**
```
✅ Created table: gorgias_tags
✅ Created table: gorgias_macros
✅ Created table: sync_logs
✅ Created table: ai_confidence_scores
✅ Created table: prompt_versions
✅ Created table: prompt_training_log
✅ Created 4 views
```

**1.3 Verify Tables**
```sql
-- Run this query
SELECT tablename FROM pg_tables 
WHERE tablename IN (
  'gorgias_tags',
  'gorgias_macros',
  'sync_logs',
  'ai_confidence_scores',
  'prompt_versions',
  'prompt_training_log'
);
```

Should return 6 rows.

---

### **Step 2: Import Users Sync Workflow** (15 minutes)

**2.1 Open n8n**
- Navigate to your n8n instance
- Click "Workflows" in top menu
- Click "+ Add workflow" button

**2.2 Import JSON**
- Click "⋯" menu (top right)
- Click "Import from File"
- Select `0004_HTTP_Gorgias_Users_Slack_Sync.json`
- Click "Import"

**2.3 Configure Credentials**

**Node: "Fetch Gorgias Users"**
- Type: HTTP Basic Auth
- Click on node
- Click "Credentials" dropdown
- Select your Gorgias credential

**Node: "Fetch Slack Users"**
- Type: Slack API
- Select your Slack credential
- Ensure Slack app has `users:read` permission

**Node: "Upsert to Supabase"**
- Type: Supabase API
- Select your Supabase credential

**Node: "Log Sync Results"**
- Type: Supabase API
- Same credential as above

**Node: "Notify Slack"**
- Type: Slack API
- Same credential as above
- Update channel ID if needed

**2.4 Test Workflow**
- Click "Test workflow"
- Click "Execute workflow"
- Watch nodes execute
- Check Supabase: `SELECT * FROM gorgias_users;`
- Should see users with Slack IDs matched

**2.5 Verify Matching**
```sql
-- Check matched users
SELECT 
  gorgias_name,
  gorgias_email,
  slack_display_name,
  slack_user_id IS NOT NULL as has_slack_match
FROM gorgias_users
ORDER BY gorgias_name;

-- Count matched vs unmatched
SELECT 
  COUNT(*) FILTER (WHERE slack_user_id IS NOT NULL) as matched,
  COUNT(*) FILTER (WHERE slack_user_id IS NULL) as unmatched
FROM gorgias_users;
```

**2.6 Activate Workflow**
- Toggle "Active" switch
- Runs daily at 2:30 AM

**Why This Matters:**
When user says "assign to spencer", bot can now:
1. Look up "spencer" in gorgias_users table
2. Find Spencer's Gorgias user ID
3. Make API call with correct ID

---

### **Step 3: Import Tags Sync Workflow** (15 minutes)

**3.1 Open n8n**
- Navigate to your n8n instance
- Click "Workflows" in top menu
- Click "+ Add workflow" button

**3.2 Import JSON**
- Click "⋯" menu (top right)
- Click "Import from File"
- Select `0005_HTTP_Gorgias_Sync_Tags.json`
- Click "Import"

**3.3 Configure Credentials**

Workflow has these nodes needing credentials:

**Node: "Fetch Tags from Gorgias"**
- Type: HTTP Basic Auth
- Click on node
- Click "Credentials" dropdown
- Select your Gorgias credential (or create new)

**Node: "Upsert to Supabase"**
- Type: Supabase API
- Click on node
- Click "Credentials" dropdown
- Select your Supabase credential (or create new)

**Node: "Log Sync Results"**
- Type: Supabase API
- Same credential as above

**Node: "Notify Slack"**
- Type: Slack API
- Click on node
- Click "Credentials" dropdown
- Select your Slack credential (or create new)
- Update channel ID to your desired channel

**2.4 Update Environment Variables**

If using env vars, verify these exist:
```
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com
```

Or update the URL directly in "Fetch Tags from Gorgias" node.

**2.5 Test Workflow**
- Click "Test workflow" button
- Click "Execute workflow"
- Watch nodes light up green
- Check Supabase: `SELECT * FROM gorgias_tags;`
- Should see tags populated

**2.6 Activate Workflow**
- Toggle "Active" switch (top right)
- Workflow will now run daily at 2:00 AM

---

### **Step 3: Import Macros Sync Workflow** (15 minutes)

**3.1 Import JSON**
- Click "+ Add workflow"
- Import `0006_HTTP_Gorgias_Sync_Macros.json`

**3.2 Configure Credentials**
Same as Step 2.3:
- Gorgias HTTP Basic Auth
- Supabase API
- Slack API

**3.3 Test Workflow**
- Test manually
- Check: `SELECT * FROM gorgias_macros;`
- Should see macros populated

**3.4 Activate**
- Toggle "Active"
- Runs daily at 2:15 AM

---

### **Step 4: Update Main Workflow - Add Tag/Macro References** (2 hours)

**4.1 Open Main Workflow**
- Open `Gorgias_Intelligent_v23`
- Find node "Build OpenAI Request"

**4.2 Add Tags Fetch**

Add this code at the BEGINNING of "Build OpenAI Request" node:

```javascript
// ============================================
// FETCH AVAILABLE TAGS FROM SUPABASE
// ============================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const { data: availableTags } = await supabase
  .from('gorgias_tags')
  .select('tag_name, category')
  .eq('is_active', true)
  .order('usage_count', { ascending: false })
  .limit(50);

console.log(`✅ Loaded ${availableTags?.length || 0} available tags`);
```

**4.3 Add Macros Fetch**

Add after tags fetch:

```javascript
// ============================================
// FETCH AVAILABLE MACROS FROM SUPABASE
// ============================================
const { data: availableMacros } = await supabase
  .from('gorgias_macros')
  .select('macro_name, macro_description, category')
  .eq('is_active', true)
  .order('usage_count', { ascending: false })
  .limit(20);

console.log(`✅ Loaded ${availableMacros?.length || 0} available macros`);
```

**4.4 Update System Prompt**

Find where system prompt is built, add this section:

```javascript
// ============================================
// ADD AVAILABLE TAGS TO SYSTEM PROMPT
// ============================================
if (availableTags && availableTags.length > 0) {
  const tagsList = availableTags
    .map(t => `  - ${t.tag_name} (${t.category})`)
    .join('\n');
  
  systemPrompt += `

📌 AVAILABLE TAGS (use these exact names):
${tagsList}

When adding tags:
- Use existing tag names from the list above
- Do NOT create new tag names
- If multiple tags apply, return array: ["tag1", "tag2"]
- Category helps context: billing tags for billing issues, etc.

Example:
User: "tag this ticket as billing issue"
Action: update_tags
Params: { "ticket_id": 5678, "tags": ["billing-issue"] }
`;
}

// ============================================
// ADD AVAILABLE MACROS TO SYSTEM PROMPT
// ============================================
if (availableMacros && availableMacros.length > 0) {
  const macrosList = availableMacros
    .map(m => `  - ${m.macro_name}: ${m.macro_description || 'N/A'}`)
    .join('\n');
  
  systemPrompt += `

📝 AVAILABLE MACROS (suggest when relevant):
${macrosList}

When to suggest macros:
- User asks "how to respond to [situation]"
- User wants template for common issue
- User says "apply [macro] to ticket"

Examples:
User: "how do I respond to shipping delays?"
→ Suggest macro: "shipping_delay_apology"

User: "apply refund macro to ticket 5678"
→ Action: apply_macro
→ Params: { "ticket_id": 5678, "macro_name": "refund_standard" }
`;
}
```

**4.5 Test Updated Workflow**

Test commands:
```
1. "tag ticket 18401 as billing issue"
   → Should use existing "billing-issue" tag

2. "what macros do we have for shipping?"
   → Should list shipping macros

3. "show me all refund tags"
   → Should show refund-related tags
```

**4.6 Save & Deploy**
- Click "Save" button
- Test in Slack
- Verify tags/macros are being used

---

## 🎯 PHASE 2: TRAINING LOOP (WEEK 2-3)

### **Step 5: Add Confidence Scoring** (3 hours)

**5.1 Update OpenAI Schema**

Find "Build OpenAI Request" node, locate the JSON schema definition.

**BEFORE:**
```javascript
const schema = {
  type: "object",
  properties: {
    action: { type: "string", enum: [...] },
    params: { type: "object" }
  },
  required: ["action", "params"]
};
```

**AFTER:**
```javascript
const schema = {
  type: "object",
  properties: {
    action: { 
      type: "string", 
      enum: [
        "list_tickets", "get_ticket", "search_tickets",
        "create_ticket", "assign_ticket", "close_ticket",
        "set_priority", "set_status", "update_tags",
        "reply_public", "comment_internal",
        "list_customers", "get_customer", "find_user",
        "analyze_insights"
      ]
    },
    params: { 
      type: "object",
      additionalProperties: true
    },
    confidence: { 
      type: "number", 
      minimum: 0, 
      maximum: 1,
      description: "Your confidence in this interpretation (0.0 = uncertain, 1.0 = very confident)"
    },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          confidence: { type: "number" }
        }
      },
      description: "Alternative interpretations if uncertain"
    },
    reasoning: {
      type: "string",
      description: "Brief explanation of why you chose this action"
    }
  },
  required: ["action", "params", "confidence"]
};
```

**5.2 Create "Log Confidence Score" Node**

**Position:** After "Handle Plan Response" node

**Node Type:** Code (JavaScript)

**Code:**
```javascript
// ============================================
// LOG CONFIDENCE SCORE TO SUPABASE
// ============================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Use service key for inserts
);

const confidence = $json.confidence || 0.9;
const alternatives = $json.alternatives || [];
const reasoning = $json.reasoning || '';
const parseSlackData = $('Parse Slack').first().json;

console.log('═══════════════════════════════════════');
console.log('📊 Logging Confidence Score');
console.log(`   Action: ${$json.action}`);
console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
console.log(`   Alternatives: ${alternatives.length}`);
console.log('═══════════════════════════════════════');

// Insert to ai_confidence_scores table
const { data, error } = await supabase
  .from('ai_confidence_scores')
  .insert({
    correlation_id: parseSlackData.correlation_id,
    user_message: parseSlackData.user_text,
    detected_action: $json.action,
    detected_params: $json.params,
    confidence_score: confidence,
    alternative_actions: alternatives,
    reasoning: reasoning,
    actual_action: $json.action,  // Will be updated if corrected
    actual_params: $json.params,
    prompt_version: 1  // Current version
  });

if (error) {
  console.error('❌ Failed to log confidence:', error);
} else {
  console.log('✅ Confidence score logged');
}

// Pass through all data
return [{
  json: {
    ...$json,
    confidence: confidence,
    confidence_logged: true
  }
}];
```

**5.3 Wire Up Node**
- Connect: "Handle Plan Response" → "Log Confidence Score"
- Connect: "Log Confidence Score" → "Format Session"

**5.4 Test**
- Run a command: "show me open tickets"
- Check Supabase: `SELECT * FROM ai_confidence_scores ORDER BY created_at DESC LIMIT 1;`
- Should see new row with confidence score

---

### **Step 6: Add Feedback Buttons** (2 hours)

**6.1 Update "Final Slack Reply" Node**

Find the node that sends final Slack message.

**Current code** (simplified):
```javascript
await slack.chat.postMessage({
  channel: channel,
  thread_ts: thread_ts,
  text: conversationalResponse
});
```

**Updated code with feedback buttons:**
```javascript
const correlationId = $('Parse Slack').first().json.correlation_id;
const confidence = $('Log Confidence Score').first().json.confidence || 0.9;
const emoji = $('Get Action Emoji').first()?.json?.emoji || '💼';

const blocks = [
  {
    type: "section",
    text: { 
      type: "mrkdwn", 
      text: `${emoji} ${conversationalResponse}` 
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Correct" },
        style: "primary",
        action_id: "feedback_correct",
        value: correlationId
      },
      {
        type: "button",
        text: { type: "plain_text", text: "❌ Wrong" },
        style: "danger",
        action_id: "feedback_wrong",
        value: correlationId
      }
    ]
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `_Confidence: ${Math.round(confidence * 100)}% | ID: \`${correlationId.substring(0, 20)}...\`_`
      }
    ]
  }
];

await slack.chat.postMessage({
  channel: channel,
  thread_ts: thread_ts,
  blocks: blocks
});
```

**6.2 Import Feedback Handler Workflow**
- Import `0007_HTTP_Slack_Feedback_Handler.json`
- Configure Slack credentials
- Configure Supabase credentials
- Test by clicking a feedback button

**6.3 Activate Feedback Handler**
- Toggle "Active"
- Now captures all feedback

---

### **Step 7: Test End-to-End** (1 hour)

**7.1 Full Flow Test**

```
1. Send command: "show me urgent tickets"
   → Bot responds with result
   → Feedback buttons appear
   → Confidence shown (e.g., 92%)

2. Click "✅ Correct"
   → Thank you message appears
   → Check Supabase: user_feedback = 'correct'

3. Send command: "get collin's stuff"
   → Bot responds (maybe wrong)
   → Click "❌ Wrong"
   → Modal appears asking for correct action
   → Select "list_tickets"
   → Submit
   → Check Supabase: user_feedback = 'incorrect', actual_action = 'list_tickets'
```

**7.2 Verify Data**

```sql
-- Check confidence scores logged
SELECT 
  user_message,
  detected_action,
  confidence_score,
  user_feedback,
  created_at
FROM ai_confidence_scores
ORDER BY created_at DESC
LIMIT 10;

-- Check feedback distribution
SELECT 
  user_feedback,
  COUNT(*) as count
FROM ai_confidence_scores
WHERE user_feedback IS NOT NULL
GROUP BY user_feedback;
```

---

## ✅ PHASE 1 & 2 COMPLETE!

**What You Now Have:**

✅ **Reference Tables**
- Tags syncing daily
- Macros syncing daily
- Bot uses existing tags/macros

✅ **Training Loop Foundation**
- Confidence tracked for every command
- User feedback mechanism working
- Data collecting for training analysis

**What's Next:**

**Week 3-4:** Automated training analysis workflow (analyzes patterns weekly)
**Week 5-6:** Analytics dashboard (visualize metrics)
**Week 7:** Testing framework

---

## 🚨 TROUBLESHOOTING

### **Problem: Tags/Macros not syncing**

**Check:**
```sql
-- Any sync logs?
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 5;

-- Any tags in table?
SELECT COUNT(*) FROM gorgias_tags;
```

**Solution:**
- Verify Gorgias credentials in workflow
- Check Gorgias API returns data
- Check workflow execution logs in n8n

---

### **Problem: Confidence not logging**

**Check:**
```sql
-- Any confidence scores?
SELECT COUNT(*) FROM ai_confidence_scores;
```

**Solution:**
- Verify "Log Confidence Score" node is connected
- Check Supabase credentials
- Check node execution in n8n debugger

---

### **Problem: Feedback buttons not working**

**Check:**
- Is workflow 0007 active?
- Are Slack credentials correct?
- Check workflow execution logs

**Solution:**
- Test workflow manually with dummy payload
- Verify Slack app has `actions` permission
- Check Slack app event subscriptions

---

## 📊 MONITORING

### **Daily Health Checks**

```sql
-- Tags sync status (should update daily)
SELECT workflow_name, sync_timestamp, records_processed
FROM sync_logs
WHERE workflow_name = 'gorgias_tags_sync'
ORDER BY sync_timestamp DESC
LIMIT 1;

-- Confidence scores today
SELECT COUNT(*) 
FROM ai_confidence_scores
WHERE created_at > CURRENT_DATE;

-- Feedback ratio
SELECT 
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect,
  COUNT(*) FILTER (WHERE user_feedback IS NULL) as no_feedback
FROM ai_confidence_scores
WHERE created_at > CURRENT_DATE;
```

---

## 🎯 NEXT STEPS

After Phase 1 & 2 working:

**Week 3:**
- Build automated training analysis (workflow 0008)
- Weekly pattern detection
- Prompt improvement suggestions

**Week 4:**
- Implement A/B testing
- Deploy prompt improvements
- Measure impact

**Week 5-6:**
- Build analytics dashboard
- Visualize metrics
- Share with team

**Week 7:**
- Create testing framework
- Automated test suite
- Pre-deployment validation

---

## 📚 FILES REFERENCE

1. **0005_HTTP_Gorgias_Sync_Tags.json** - Tags sync workflow
2. **0006_HTTP_Gorgias_Sync_Macros.json** - Macros sync workflow
3. **0007_HTTP_Slack_Feedback_Handler.json** - Feedback handler
4. **DATABASE_SCHEMAS_COMPLETE.sql** - All table definitions
5. **V23-ENHANCEMENT-ROADMAP-COMPLETE.md** - Complete vision
6. **CLAUDE-CODE-ENHANCEMENT-PROMPT.md** - Phase 1 & 2 details

---

## ✅ SUCCESS CRITERIA

**Phase 1 Success:**
- ✅ Tags table has 20+ tags
- ✅ Macros table has 10+ macros
- ✅ Bot suggests existing tags (not creating new)
- ✅ Bot recommends macros when asked
- ✅ Syncs running daily automatically

**Phase 2 Success:**
- ✅ Confidence logged for every command
- ✅ Feedback buttons appear on all responses
- ✅ Users can click correct/wrong
- ✅ Corrections captured with details
- ✅ Data ready for training analysis

---

**Questions? Issues? Check the roadmap document for complete details!**

**Ready to transform your bot into a self-improving system!** 🚀
