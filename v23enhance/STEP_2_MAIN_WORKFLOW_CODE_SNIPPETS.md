# STEP 2: Main Workflow Code Updates

## Overview
This document contains all code snippets to update your main v23 workflow.
**Target Workflow:** `Gorgias_Intelligent_v23`
**Time Required:** 2 hours
**Nodes to Modify:** 3 nodes

---

## PART A: Add Reference Data Fetching

### Target Node: "Build OpenAI Request"
**Location:** Find the "Build OpenAI Request" node in your workflow
**Action:** Add this code at the VERY BEGINNING of the node (before any other code)

```javascript
// ============================================
// FETCH REFERENCE DATA FROM SUPABASE
// ============================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
  process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY_HERE'
);

console.log('📚 Loading reference data from Supabase...');

// ────────────────────────────────────────────
// Fetch Available Tags
// ────────────────────────────────────────────
const { data: availableTags, error: tagsError } = await supabase
  .from('gorgias_tags')
  .select('tag_name, category')
  .eq('is_active', true)
  .order('usage_count', { ascending: false })
  .limit(50);

if (tagsError) {
  console.error('❌ Failed to fetch tags:', tagsError);
} else {
  console.log(`✅ Loaded ${availableTags?.length || 0} tags`);
}

// ────────────────────────────────────────────
// Fetch Available Macros
// ────────────────────────────────────────────
const { data: availableMacros, error: macrosError } = await supabase
  .from('gorgias_macros')
  .select('macro_name, macro_description, category')
  .eq('is_active', true)
  .order('usage_count', { ascending: false })
  .limit(20);

if (macrosError) {
  console.error('❌ Failed to fetch macros:', macrosError);
} else {
  console.log(`✅ Loaded ${availableMacros?.length || 0} macros`);
}

// ────────────────────────────────────────────
// Fetch User Mappings
// ────────────────────────────────────────────
const { data: availableUsers, error: usersError } = await supabase
  .from('gorgias_users')
  .select('gorgias_user_id, full_name, first_name, last_name, email, slack_user_id, slack_display_name')
  .eq('is_active', true)
  .eq('is_bot', false)
  .order('full_name');

if (usersError) {
  console.error('❌ Failed to fetch users:', usersError);
} else {
  console.log(`✅ Loaded ${availableUsers?.length || 0} users`);
}

console.log('═══════════════════════════════════════');
console.log('📚 Reference Data Loaded Successfully');
console.log('═══════════════════════════════════════');
```

---

## PART B: Enhance System Prompt with Reference Data

### Target Node: "Build OpenAI Request" (same node as above)
**Location:** Find where `systemPrompt` is being built
**Action:** Add this code AFTER the systemPrompt is initially created

```javascript
// ============================================
// ENHANCE SYSTEM PROMPT WITH REFERENCE DATA
// ============================================

// ────────────────────────────────────────────
// Add Available Tags
// ────────────────────────────────────────────
if (availableTags && availableTags.length > 0) {
  const tagsList = availableTags
    .slice(0, 30)  // Top 30 most used tags
    .map(t => `  - ${t.tag_name} (${t.category})`)
    .join('\n');

  systemPrompt += `

═══════════════════════════════════════════════════════════════
📌 AVAILABLE TAGS - USE THESE EXACT NAMES
═══════════════════════════════════════════════════════════════

${tagsList}

**Tag Rules:**
1. ONLY use tag names from the list above
2. Do NOT create new tag names
3. Match existing tags exactly (case-sensitive)
4. If multiple tags apply, return array: ["tag1", "tag2"]
5. Categories help with context (billing tags for billing issues, etc.)

**Examples:**
- User: "tag ticket 5678 as billing issue"
  → Action: update_tags
  → Params: { "ticket_id": 5678, "tags": ["billing-issue"] }

- User: "add shipping and urgent tags to ticket 1234"
  → Action: update_tags
  → Params: { "ticket_id": 1234, "tags": ["shipping-delay", "priority-urgent"] }
`;
}

// ────────────────────────────────────────────
// Add Available Macros
// ────────────────────────────────────────────
if (availableMacros && availableMacros.length > 0) {
  const macrosList = availableMacros
    .slice(0, 15)  // Top 15 most used macros
    .map(m => `  - **${m.macro_name}**: ${m.macro_description || 'N/A'} (${m.category})`)
    .join('\n');

  systemPrompt += `

═══════════════════════════════════════════════════════════════
📝 AVAILABLE MACROS - SUGGEST WHEN RELEVANT
═══════════════════════════════════════════════════════════════

${macrosList}

**Macro Usage Rules:**
1. Suggest macros when user asks "how to respond" or "what to say"
2. Recommend macros based on ticket context (refund, shipping, etc.)
3. Use exact macro names from the list above

**Examples:**
- User: "how do I respond to shipping delays?"
  → Response: "I recommend using the 'shipping_delay_apology' macro"

- User: "apply refund macro to ticket 5678"
  → Action: apply_macro
  → Params: { "ticket_id": 5678, "macro_name": "refund_standard" }
`;
}

// ────────────────────────────────────────────
// Add User Mappings for Assignment
// ────────────────────────────────────────────
if (availableUsers && availableUsers.length > 0) {
  const usersList = availableUsers
    .map(u => {
      const displayName = u.slack_display_name || u.first_name || u.full_name;
      return `  - ${displayName} → ${u.email} (ID: ${u.gorgias_user_id})`;
    })
    .join('\n');

  systemPrompt += `

═══════════════════════════════════════════════════════════════
👥 AVAILABLE USERS - FOR TICKET ASSIGNMENT
═══════════════════════════════════════════════════════════════

${usersList}

**User Resolution Rules:**
1. Match user names case-insensitively
2. Support partial matches (e.g., "spencer" → Spencer James)
3. Support nicknames (e.g., "bobby" → Robert Apice, "mike" → Michael Kostecki)
4. Use the gorgias_user_id from the mapping above

**Common Nicknames:**
- "bobby" or "rob" → Robert Apice (ID: 10)
- "dom" → Domenic Apice (ID: 4)
- "gabe" → Gabe Apice (ID: 5)
- "didi" → Alexandra Apice (ID: 18)
- "mike" → Michael Kostecki (ID: 17)
- "bailey" → Collin Bailey (ID: 3)

**Examples:**
- User: "assign ticket 5678 to spencer"
  → Look up "spencer" in user list → Spencer James (ID: 11)
  → Action: assign_ticket
  → Params: { "ticket_id": 5678, "user_id": 11 }

- User: "assign this to bobby"
  → Look up "bobby" → Robert Apice (ID: 10)
  → Action: assign_ticket
  → Params: { "ticket_id": <from_context>, "user_id": 10 }
`;
}

console.log('✅ System prompt enhanced with reference data');
```

---

## PART C: Add Confidence Scoring to OpenAI Schema

### Target Node: "Build OpenAI Request" (same node as above)
**Location:** Find where the OpenAI JSON schema is defined
**Action:** Update the schema to include confidence, alternatives, and reasoning

**BEFORE:**
```javascript
const schema = {
  type: "object",
  properties: {
    action: { type: "string", enum: [...actions...] },
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
      ],
      description: "The action to perform based on user's request"
    },
    params: {
      type: "object",
      additionalProperties: true,
      description: "Parameters for the action"
    },
    // ⭐ NEW: Confidence score (required)
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Your confidence in this interpretation (0.0 = very uncertain, 0.5 = moderate, 1.0 = very confident). Consider factors like ambiguity, context clarity, and parameter completeness."
    },
    // ⭐ NEW: Alternative interpretations
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          confidence: { type: "number" }
        }
      },
      description: "Alternative interpretations if uncertain (e.g., could be 'get_ticket' OR 'search_tickets')"
    },
    // ⭐ NEW: Reasoning
    reasoning: {
      type: "string",
      maxLength: 200,
      description: "Brief explanation (1-2 sentences) of why you chose this action and confidence level"
    }
  },
  required: ["action", "params", "confidence"]  // ⭐ confidence is now required
};
```

---

## PART D: Create "Log Confidence Score" Node

### Create New Node
**Node Type:** Code (JavaScript)
**Node Name:** "Log Confidence Score"
**Position:** After "Handle Plan Response" node

**Complete Code:**

```javascript
// ============================================
// LOG CONFIDENCE SCORE TO SUPABASE
// ============================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
  process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY_HERE'
);

// Get data from previous nodes
const openAiResponse = $json;
const parseSlackData = $('Parse Slack').first().json;

// Extract confidence data (with defaults)
const confidence = openAiResponse.confidence || 0.9;
const alternatives = openAiResponse.alternatives || [];
const reasoning = openAiResponse.reasoning || 'No reasoning provided';
const action = openAiResponse.action;
const params = openAiResponse.params;

console.log('═══════════════════════════════════════');
console.log('📊 Logging Confidence Score');
console.log(`   User: ${parseSlackData.user_text?.substring(0, 50)}...`);
console.log(`   Action: ${action}`);
console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
console.log(`   Alternatives: ${alternatives.length}`);
console.log(`   Reasoning: ${reasoning?.substring(0, 60)}...`);
console.log('═══════════════════════════════════════');

// Insert to ai_confidence_scores table
const { data, error } = await supabase
  .from('ai_confidence_scores')
  .insert({
    correlation_id: parseSlackData.correlation_id,
    user_message: parseSlackData.user_text,
    detected_action: action,
    detected_params: params,
    confidence_score: confidence,
    alternative_actions: alternatives,
    reasoning: reasoning,
    actual_action: action,  // Will be updated by feedback if wrong
    actual_params: params,
    prompt_version: 1  // Current version (update when testing new prompts)
  })
  .select();

if (error) {
  console.error('❌ Failed to log confidence:', error);
  console.error('   Error details:', JSON.stringify(error, null, 2));
} else {
  console.log('✅ Confidence score logged successfully');
  console.log(`   Record ID: ${data?.[0]?.id}`);
}

// Pass through all data + confidence info
return [{
  json: {
    ...openAiResponse,
    confidence: confidence,
    confidence_logged: !error,
    confidence_record_id: data?.[0]?.id
  }
}];
```

### Wire Up the Node
1. **Disconnect:** "Handle Plan Response" → "Format Session"
2. **Connect:** "Handle Plan Response" → "Log Confidence Score"
3. **Connect:** "Log Confidence Score" → "Format Session"

---

## PART E: Add Feedback Buttons to Slack Response

### Target Node: "Final Slack Reply" or wherever you send the final Slack message
**Location:** Find the node that sends `slack.chat.postMessage`
**Action:** Replace the simple text message with blocks + feedback buttons

**BEFORE:**
```javascript
await slack.chat.postMessage({
  channel: channel,
  thread_ts: thread_ts,
  text: conversationalResponse
});
```

**AFTER:**
```javascript
// Get data from previous nodes
const correlationId = $('Parse Slack').first().json.correlation_id;
const confidenceNode = $('Log Confidence Score').first()?.json;
const confidence = confidenceNode?.confidence || 0.9;
const emoji = $('Get Action Emoji').first()?.json?.emoji || '💼';

// Build message blocks with feedback buttons
const blocks = [
  // Main response text
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${emoji} ${conversationalResponse}`
    }
  },

  // Feedback buttons
  {
    type: "actions",
    block_id: "feedback_buttons",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Correct", emoji: true },
        style: "primary",
        action_id: "feedback_correct",
        value: correlationId
      },
      {
        type: "button",
        text: { type: "plain_text", text: "❌ Wrong", emoji: true },
        style: "danger",
        action_id: "feedback_wrong",
        value: correlationId
      }
    ]
  },

  // Metadata footer
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

// Send message with blocks
await slack.chat.postMessage({
  channel: channel,
  thread_ts: thread_ts,
  blocks: blocks,
  text: conversationalResponse  // Fallback text for notifications
});

console.log('✅ Slack message sent with feedback buttons');
```

---

## Testing Checklist

After making all code changes, test with these commands:

### Test 1: Tag Resolution
**Command:** `tag ticket 18401 as billing issue`
**Expected:**
- Bot uses existing "billing-issue" tag (not creating new)
- Confidence score logged in Supabase
- Feedback buttons appear

**Verify:**
```sql
SELECT * FROM ai_confidence_scores ORDER BY created_at DESC LIMIT 1;
-- Should have confidence_score between 0-1
```

### Test 2: User Assignment
**Command:** `assign ticket 18401 to spencer`
**Expected:**
- Bot looks up "spencer" in gorgias_users table
- Resolves to Spencer James (user_id: 11)
- Makes assignment with correct Gorgias user ID

### Test 3: Macro Suggestion
**Command:** `what macros do we have for shipping delays?`
**Expected:**
- Bot lists shipping-related macros from database
- Response includes macro names and descriptions

### Test 4: Confidence Logging
**Command:** `show me urgent tickets`
**Expected:**
- Confidence score between 0.0-1.0 logged
- Reasoning field populated
- Alternatives shown if uncertain

### Test 5: Feedback Buttons
**Command:** Any command
**Expected:**
- Response has ✅ Correct / ❌ Wrong buttons
- Confidence % shown in footer
- Correlation ID visible

---

## Troubleshooting

### Issue: "Cannot find module '@supabase/supabase-js'"
**Solution:** Install Supabase package in n8n:
```bash
npm install @supabase/supabase-js
```

### Issue: Tags/macros not loading
**Check:**
```sql
-- Are tags populated?
SELECT COUNT(*) FROM gorgias_tags;

-- Are macros populated?
SELECT COUNT(*) FROM gorgias_macros;
```

**Solution:** Run the Tags/Macros sync workflows first (Steps 3-4)

### Issue: Confidence not logging
**Check:**
- Supabase credentials correct?
- "Log Confidence Score" node connected?
- Check n8n execution logs for errors

### Issue: User resolution not working
**Check:**
```sql
-- Are users populated?
SELECT full_name, email, gorgias_user_id FROM gorgias_users WHERE is_bot = false;

-- Test name lookup
SELECT * FROM find_user_by_name('spencer');
```

---

## Environment Variables (Optional)

If using environment variables instead of hardcoded values:

```bash
# Add to your n8n environment
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
```

Then use in code:
```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

---

## Summary

**Nodes Modified:**
1. ✅ "Build OpenAI Request" - Added reference data fetching + system prompt enhancements + confidence schema
2. ✅ "Log Confidence Score" - NEW node to track confidence
3. ✅ "Final Slack Reply" - Added feedback buttons

**Time to Complete:** ~2 hours

**Next Step:** Import the Feedback Handler workflow (Step 3)
