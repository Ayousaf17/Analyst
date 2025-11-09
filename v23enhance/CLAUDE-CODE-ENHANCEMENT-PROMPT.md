# 🎯 CLAUDE CODE: v23 ENHANCEMENT IMPLEMENTATION

**Project:** Gorgias Terminal Enhancement - Self-Improving, Proactive System  
**Current State:** v23 Production (49 nodes, working perfectly)  
**Goal:** Add training loop, reference tables, webhooks, dashboard, testing  
**Timeline:** 7 weeks (phased approach)  
**Repository:** https://github.com/Ayousaf17/Analyst/tree/claude/http-workflows-review-011CUp6vvKCFPQySNbXLc7pf

---

## 📋 CONTEXT FOR CLAUDE CODE

### **What Exists Now (v23 Production):**

**Current System:**
- ✅ 49-node n8n workflow
- ✅ 14 Gorgias actions (list, get, create, assign, etc.)
- ✅ AI intent detection (OpenAI Structured Output - 100% reliable)
- ✅ Analytics path (Claude Sonnet 4.5, 90% token reduction)
- ✅ Full observability (3 Supabase tables)
- ✅ Error handling + Slack formatting
- ✅ Performance metrics tracking
- ✅ Environment variables configured

**Workflow File:** `Gorgias_Intelligent_v23__2_.json` (153 KB, 2,411 lines)

---

### **What We're Building (Enhancement Vision):**

Transform from **reactive system** → **self-improving, proactive system**

**Five Major Enhancements:**

1. **Reference Tables** (Week 1)
   - Gorgias tags table
   - Gorgias macros table  
   - Sync workflows

2. **Training Loop System** (Week 2-3)
   - Confidence scoring
   - User feedback mechanism
   - Automated prompt improvements
   - A/B testing

3. **Proactive Webhooks** (Week 4)
   - New ticket alerts in Slack
   - AI triage suggestions
   - Resolution tracking

4. **Analytics Dashboard** (Week 5-6)
   - Performance overview
   - Usage analytics
   - Training insights
   - Error tracking

5. **Testing Framework** (Week 7)
   - Automated test suite
   - Supabase log analysis
   - Refinement process

---

## 🎯 PHASE 1: REFERENCE TABLES (START HERE)

### **Goal:** Make bot aware of existing Gorgias structures

---

### **TASK 1.1: Create Gorgias Tags Table**

**Purpose:** Bot suggests existing tags instead of creating new ones

**Step 1: Create Supabase Table**

```sql
-- In Supabase SQL Editor
CREATE TABLE gorgias_tags (
  id BIGSERIAL PRIMARY KEY,
  tag_id INTEGER UNIQUE,
  tag_name TEXT NOT NULL,
  tag_description TEXT,
  category TEXT,  -- billing, technical, shipping, etc.
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_tags_name ON gorgias_tags(tag_name);
CREATE INDEX idx_tags_category ON gorgias_tags(category);
```

**Step 2: Create Sync Workflow**

**New n8n Workflow:** `0005_HTTP_Gorgias_Sync_Tags.json`

**Nodes:**
```
1. Schedule Trigger
   - Cron: 0 2 * * * (daily at 2am)
   
2. Fetch Tags from Gorgias (HTTP Request)
   - Method: GET
   - URL: {{ $env.GORGIAS_BASE_URL }}/api/tags
   - Authentication: HTTP Basic Auth
   - Pagination: Handle if > 100 tags
   
3. Parse Tag Data (Code Node)
   - Extract: tag_id, tag_name, category
   - Infer category from name (if not provided)
   - Count usage (optional: query tickets with tag)
   
4. Upsert to Supabase (Supabase Node)
   - Operation: Upsert (insert or update)
   - Match on: tag_id
   - Update: tag_name, category, usage_count, updated_at
   
5. Log Sync Results (Code Node + Supabase)
   - Count: tags synced, new, updated
   - Insert to sync_logs table
   
6. Send Summary to Slack (Optional)
   - Channel: #gorgias-logs
   - Message: "✅ Synced 45 tags (3 new, 2 updated)"
```

**Code for Parse Tag Data:**
```javascript
// Node: "Parse Tag Data"
const tags = $input.all();
const parsed = [];

for (const tag of tags) {
  const tagData = tag.json;
  
  // Infer category from tag name
  let category = 'other';
  const name = tagData.name.toLowerCase();
  
  if (name.includes('billing') || name.includes('payment')) {
    category = 'billing';
  } else if (name.includes('ship') || name.includes('delivery')) {
    category = 'shipping';
  } else if (name.includes('tech') || name.includes('bug')) {
    category = 'technical';
  } else if (name.includes('refund') || name.includes('return')) {
    category = 'refund';
  }
  
  parsed.push({
    json: {
      tag_id: tagData.id,
      tag_name: tagData.name,
      tag_description: tagData.description || null,
      category: category,
      usage_count: tagData.ticket_count || 0,
      updated_at: new Date().toISOString()
    }
  });
}

return parsed;
```

**Step 3: Update Main Workflow to Use Tags**

**Modify "Build OpenAI Request" Node:**
```javascript
// Add at the beginning of the node
const availableTags = await $supabase
  .from('gorgias_tags')
  .select('tag_name, category')
  .eq('is_active', true)
  .order('usage_count', { ascending: false });

// Add to system prompt
const tagsList = availableTags.data
  .map(t => `- ${t.tag_name} (${t.category})`)
  .join('\n');

systemPrompt += `

AVAILABLE TAGS (use these exact names):
${tagsList}

When adding tags:
- Use existing tag names from the list above
- Do NOT create new tag names
- If multiple tags apply, return array
- Category helps: billing tags for billing issues, etc.

Example:
User: "tag this ticket as billing issue"
Action: update_tags
Params: { "tags": ["billing-issue"] }  // Use existing tag name
`;
```

**Testing:**
```
Before: User says "tag as billing" → Bot might create "billing" (new tag)
After: User says "tag as billing" → Bot uses "billing-issue" (existing tag)
```

---

### **TASK 1.2: Create Gorgias Macros Table**

**Purpose:** Bot suggests team's proven response templates

**Step 1: Create Supabase Table**

```sql
CREATE TABLE gorgias_macros (
  id BIGSERIAL PRIMARY KEY,
  macro_id INTEGER UNIQUE,
  macro_name TEXT NOT NULL,
  macro_description TEXT,
  macro_content TEXT,  -- The actual response text
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  avg_resolution_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_macros_name ON gorgias_macros(macro_name);
CREATE INDEX idx_macros_category ON gorgias_macros(category);
```

**Step 2: Create Sync Workflow**

**New n8n Workflow:** `0006_HTTP_Gorgias_Sync_Macros.json`

**Similar structure to tags sync:**
```
1. Schedule Trigger (daily 2am)
2. Fetch Macros (GET /api/macros)
3. Parse Macro Data
4. Upsert to Supabase
5. Log Results
```

**Code for Parse Macro Data:**
```javascript
// Node: "Parse Macro Data"
const macros = $input.all();
const parsed = [];

for (const macro of macros) {
  const macroData = macro.json;
  
  // Infer category
  let category = 'general';
  const name = macroData.name.toLowerCase();
  
  if (name.includes('refund')) category = 'refund';
  else if (name.includes('ship')) category = 'shipping';
  else if (name.includes('technical')) category = 'technical';
  else if (name.includes('billing')) category = 'billing';
  
  parsed.push({
    json: {
      macro_id: macroData.id,
      macro_name: macroData.name,
      macro_description: macroData.subject || '',
      macro_content: macroData.body_text || macroData.body_html || '',
      category: category,
      usage_count: macroData.usage_count || 0,
      updated_at: new Date().toISOString()
    }
  });
}

return parsed;
```

**Step 3: Add "suggest_macro" Action**

**Update "Build OpenAI Request" to include macro suggestions:**
```javascript
const availableMacros = await $supabase
  .from('gorgias_macros')
  .select('macro_name, macro_description, category')
  .eq('is_active', true)
  .order('usage_count', { ascending: false })
  .limit(20);  // Top 20 most used

const macrosList = availableMacros.data
  .map(m => `- ${m.macro_name}: ${m.macro_description}`)
  .join('\n');

systemPrompt += `

AVAILABLE MACROS (suggest when relevant):
${macrosList}

When user asks "how to respond to shipping delay":
- Suggest: macro "shipping_delay_apology"
- Action: suggest_macro
- Params: { "macro_name": "shipping_delay_apology" }

When user says "apply shipping delay macro to ticket 5678":
- Action: apply_macro
- Params: { "ticket_id": 5678, "macro_name": "shipping_delay_apology" }
`;
```

**Add to actions enum:**
```javascript
enum: [
  "list_tickets",
  "get_ticket",
  // ... existing actions ...
  "suggest_macro",  // NEW
  "apply_macro"     // NEW
]
```

**Step 4: Add HTTP Nodes for Macro Actions**

**New Node:** "suggest_macro"
```javascript
// Type: Code Node (not HTTP - just shows macro details)
const macroName = $json.params.macro_name;

const macro = await $supabase
  .from('gorgias_macros')
  .select('*')
  .eq('macro_name', macroName)
  .single();

if (!macro.data) {
  return [{
    json: {
      success: false,
      error: `Macro "${macroName}" not found`
    }
  }];
}

return [{
  json: {
    success: true,
    macro: macro.data,
    preview: macro.data.macro_content.substring(0, 200) + '...'
  }
}];
```

**New Node:** "apply_macro"
```javascript
// Type: HTTP Request
// Applies macro to ticket via Gorgias API
{
  "method": "POST",
  "url": "{{ $env.GORGIAS_BASE_URL }}/api/tickets/{{ $json.params.ticket_id }}/messages",
  "body": {
    "via": "api",
    "source": {
      "type": "email",
      "from": {
        "name": "Support Team",
        "address": "support@ironsidecomputers.com"
      },
      "to": [
        {
          "name": "{{ $json.customer_name }}",
          "address": "{{ $json.customer_email }}"
        }
      ]
    },
    "body_text": "{{ $json.macro_content }}"
  }
}
```

**Update Switch Router:** Add cases for "suggest_macro" and "apply_macro"

---

### **TASK 1.3: Testing Reference Tables**

**Test Commands:**
```
1. "tag ticket 5678 as billing issue"
   Expected: Uses existing "billing-issue" tag

2. "what macros do we have for shipping delays?"
   Expected: Lists shipping-related macros

3. "apply shipping delay macro to ticket 5678"
   Expected: Applies macro content to ticket

4. "suggest a macro for refund request"
   Expected: Recommends "refund_standard" or similar
```

**Success Criteria:**
- ✅ Tags sync daily (check gorgias_tags table)
- ✅ Macros sync daily (check gorgias_macros table)
- ✅ Bot suggests existing tags (not new ones)
- ✅ Bot recommends relevant macros
- ✅ Macro application works via Gorgias API

---

## 🎯 PHASE 2: TRAINING LOOP SYSTEM

### **Goal:** System learns from mistakes and improves automatically

---

### **TASK 2.1: Confidence Scoring**

**Step 1: Create Confidence Table**

```sql
CREATE TABLE ai_confidence_scores (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  user_message TEXT,
  detected_action TEXT,
  detected_params JSONB,
  confidence_score DECIMAL(3,2),  -- 0.00 to 1.00
  alternative_actions JSONB,  -- [{action, score}, ...]
  user_feedback TEXT,  -- correct, incorrect, partial
  actual_action TEXT,
  actual_params JSONB,
  prompt_version INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  feedback_at TIMESTAMPTZ
);

CREATE INDEX idx_confidence_correlation ON ai_confidence_scores(correlation_id);
CREATE INDEX idx_confidence_score ON ai_confidence_scores(confidence_score);
CREATE INDEX idx_confidence_feedback ON ai_confidence_scores(user_feedback);
```

**Step 2: Update OpenAI Structured Output Schema**

**Modify "Build OpenAI Request":**
```javascript
// Add to JSON schema
const schema = {
  type: "object",
  properties: {
    action: { 
      type: "string", 
      enum: [/* all actions */]
    },
    params: { 
      type: "object",
      additionalProperties: true
    },
    confidence: { 
      type: "number", 
      minimum: 0, 
      maximum: 1,
      description: "Your confidence in this interpretation (0.0-1.0)"
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

**Step 3: Log Confidence Scores**

**New Node:** "Log Confidence Score" (after "Handle Plan Response")
```javascript
const confidence = $json.confidence || 0.9;
const alternatives = $json.alternatives || [];
const reasoning = $json.reasoning || '';

await $supabase.from('ai_confidence_scores').insert({
  correlation_id: $('Parse Slack').first().json.correlation_id,
  user_message: $('Parse Slack').first().json.text,
  detected_action: $json.action,
  detected_params: $json.params,
  confidence_score: confidence,
  alternative_actions: alternatives,
  actual_action: $json.action,
  actual_params: $json.params,
  prompt_version: 1  // Current prompt version
});

// Pass through
return [{
  json: {
    ...$json,
    confidence_logged: true
  }
}];
```

---

### **TASK 2.2: User Feedback Mechanism**

**Step 1: Add Feedback Buttons to Slack Reply**

**Modify "Final Slack Reply" Node:**
```javascript
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
        text: `_Confidence: ${Math.round(confidence * 100)}% | ID: \`${correlationId}\`_`
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

**Step 2: Create Feedback Handler Workflow**

**New Workflow:** `0007_HTTP_Slack_Feedback_Handler.json`

**Nodes:**
```
1. Slack Trigger (Interactive)
   - Event: block_actions
   - Action IDs: feedback_correct, feedback_wrong
   
2. Parse Feedback (Code)
   - Extract: correlation_id, feedback_type, user_id
   
3. Update Confidence Score (Supabase)
   - Update ai_confidence_scores
   - Set user_feedback = 'correct' or 'incorrect'
   - Set feedback_at = NOW()
   
4. If Wrong: Ask for Correction
   - Send modal: "What should the action have been?"
   - Options: All 14+ actions
   - Capture correction
   
5. Log Correction (If Wrong)
   - Update actual_action, actual_params
   
6. Thank User (Slack)
   - "Thanks for the feedback! This helps me improve."
```

**Code for "If Wrong: Ask for Correction":**
```javascript
if (feedbackType === 'feedback_wrong') {
  await slack.views.open({
    trigger_id: triggerId,
    view: {
      type: "modal",
      title: { type: "plain_text", text: "Correct the Action" },
      submit: { type: "plain_text", text: "Submit" },
      blocks: [
        {
          type: "section",
          text: { 
            type: "mrkdwn", 
            text: `I detected: *${detectedAction}*\n\nWhat should it have been?` 
          }
        },
        {
          type: "input",
          block_id: "correct_action",
          element: {
            type: "static_select",
            action_id: "action_select",
            options: [
              { text: { type: "plain_text", text: "list_tickets" }, value: "list_tickets" },
              { text: { type: "plain_text", text: "get_ticket" }, value: "get_ticket" },
              // ... all actions
            ]
          },
          label: { type: "plain_text", text: "Correct Action" }
        }
      ]
    }
  });
}
```

---

### **TASK 2.3: Automated Training Analysis**

**Step 1: Create Training Log Table**

```sql
CREATE TABLE prompt_training_log (
  id BIGSERIAL PRIMARY KEY,
  analysis_date DATE NOT NULL,
  low_confidence_count INTEGER,
  incorrect_action_count INTEGER,
  incorrect_params_count INTEGER,
  top_confusion_patterns JSONB,
  suggested_prompt_changes TEXT,
  prompt_version INTEGER,
  applied_at TIMESTAMPTZ,
  improvement_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Step 2: Create Weekly Training Workflow**

**New Workflow:** `0008_HTTP_Training_Loop_Analysis.json`

**Trigger:** Schedule (Sunday 3am weekly)

**Process:**
```
1. Fetch Last Week's Scores
   - Query ai_confidence_scores
   - Filter: created_at > NOW() - 7 days
   
2. Calculate Metrics
   - Avg confidence: AVG(confidence_score)
   - Low confidence count: COUNT WHERE confidence < 0.7
   - Incorrect count: COUNT WHERE user_feedback = 'incorrect'
   
3. Identify Confusion Patterns
   - GROUP BY user_message patterns
   - Find common misinterpretations
   - Detect action confusion (wrong action chosen)
   
4. Generate Prompt Improvements (Claude)
   - Send patterns to Claude via OpenRouter
   - Ask for prompt suggestions
   - Get specific examples to add
   
5. Create New Prompt Version
   - Insert to prompt_versions table
   - Set traffic_percentage = 10 (A/B test)
   
6. Log to Training Log
   - Insert analysis results
   
7. Send Report to Slack
   - Channel: #gorgias-training
   - Include: metrics, patterns, suggestions
```

**Code for "Identify Confusion Patterns":**
```sql
-- Query in Supabase node
SELECT 
  LEFT(user_message, 50) as message_pattern,
  detected_action,
  COUNT(*) as occurrences,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect_count
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (confidence_score < 0.7 OR user_feedback = 'incorrect')
GROUP BY LEFT(user_message, 50), detected_action
HAVING COUNT(*) > 1
ORDER BY incorrect_count DESC, occurrences DESC
LIMIT 10;
```

**Code for "Generate Prompt Improvements":**
```javascript
// Node: Call Claude for Analysis
const confusionPatterns = $json.patterns;
const currentPrompt = $json.current_prompt;

const claudeResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [{
      role: 'user',
      content: `Analyze these AI interpretation errors and suggest specific prompt improvements:

CONFUSION PATTERNS:
${JSON.stringify(confusionPatterns, null, 2)}

CURRENT SYSTEM PROMPT:
${currentPrompt}

Provide:
1. Specific prompt additions (exact phrases to add)
2. Examples to clarify confused actions
3. Parameter extraction improvements

Format: Actionable, specific changes only.`
    }]
  })
});

const suggestions = claudeResponse.choices[0].message.content;

return [{
  json: {
    suggested_changes: suggestions,
    confusion_patterns: confusionPatterns
  }
}];
```

---

### **TASK 2.4: Prompt Versioning & A/B Testing**

**Step 1: Create Prompt Versions Table**

```sql
CREATE TABLE prompt_versions (
  id BIGSERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  changes_description TEXT,
  is_active BOOLEAN DEFAULT false,
  traffic_percentage INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),
  avg_confidence DECIMAL(3,2),
  test_started_at TIMESTAMPTZ,
  test_ended_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'training_loop',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_active ON prompt_versions(is_active);
```

**Step 2: Update "Build OpenAI Request" for A/B Testing**

```javascript
// Fetch active prompts
const activePrompts = await $supabase
  .from('prompt_versions')
  .select('*')
  .eq('is_active', true)
  .order('traffic_percentage', { ascending: false });

// A/B test routing
const random = Math.random() * 100;
let selectedPrompt = activePrompts[0];
let cumulative = 0;

for (const prompt of activePrompts.data) {
  cumulative += prompt.traffic_percentage;
  if (random <= cumulative) {
    selectedPrompt = prompt;
    break;
  }
}

// Use selected prompt
const systemPrompt = selectedPrompt.system_prompt;
const promptVersion = selectedPrompt.version;

// Track which version was used
return [{
  json: {
    system_prompt: systemPrompt,
    prompt_version: promptVersion,
    // ... rest of data
  }
}];
```

**Step 3: Track A/B Test Results**

**Modify "Log Confidence Score":**
```javascript
// Add prompt_version to log
await $supabase.from('ai_confidence_scores').insert({
  // ... existing fields
  prompt_version: $('Build OpenAI Request').first().json.prompt_version
});
```

**Weekly A/B Analysis:**
```sql
-- Compare prompt versions
SELECT 
  prompt_version,
  COUNT(*) as executions,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE user_feedback = 'correct') / 
    NULLIF(COUNT(*) FILTER (WHERE user_feedback IS NOT NULL), 0),
    2
  ) as accuracy_rate
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '7 days'
  AND prompt_version IS NOT NULL
GROUP BY prompt_version
ORDER BY prompt_version DESC;
```

---

## 🎯 TESTING & VALIDATION

### **After Each Phase:**

**Phase 1 Testing:**
```
1. Sync workflows run successfully
2. Tags table populated
3. Macros table populated
4. Bot suggests existing tags
5. Bot recommends macros
```

**Phase 2 Testing:**
```
1. Confidence scores logged
2. Feedback buttons appear
3. Feedback captured correctly
4. Training analysis runs weekly
5. A/B test routes traffic correctly
```

**Success Metrics:**
```
Week 1: Reference tables syncing daily
Week 2: Confidence scores tracking
Week 3: First training analysis complete
Week 4: Prompt v2 deployed with 10% traffic
Week 5: A/B test results show improvement
```

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Reference Tables**
- [ ] Create gorgias_tags table
- [ ] Create tags sync workflow (0005)
- [ ] Update main workflow to use tags
- [ ] Create gorgias_macros table
- [ ] Create macros sync workflow (0006)
- [ ] Add suggest_macro/apply_macro actions
- [ ] Test tag suggestions
- [ ] Test macro recommendations

### **Phase 2: Training Loop**
- [ ] Create ai_confidence_scores table
- [ ] Update OpenAI schema with confidence
- [ ] Add "Log Confidence Score" node
- [ ] Add feedback buttons to Slack reply
- [ ] Create feedback handler workflow (0007)
- [ ] Create prompt_training_log table
- [ ] Create training analysis workflow (0008)
- [ ] Create prompt_versions table
- [ ] Add A/B testing to "Build OpenAI Request"
- [ ] Test end-to-end training cycle

---

## 🎯 CRITICAL NOTES

### **What NOT to Change**

From current v23:
- ❌ Don't modify existing 49 nodes (they work!)
- ❌ Don't change core execution flow
- ❌ Don't touch error handling
- ❌ Don't alter performance metrics

**We're ADDING to v23, not rebuilding it!**

---

### **Where to Add New Nodes**

**Reference Table Usage:**
- Modify: "Build OpenAI Request" (add available tags/macros)
- Add: "suggest_macro" node (after Route by Action)
- Add: "apply_macro" node (after Route by Action)

**Confidence Scoring:**
- Add: "Log Confidence Score" (after Handle Plan Response)
- Modify: "Final Slack Reply" (add feedback buttons)

**A/B Testing:**
- Modify: "Build OpenAI Request" (prompt version selection)

---

## 🚀 GETTING STARTED

### **Start with Phase 1, Task 1.1:**

```
1. Open Supabase SQL Editor
2. Create gorgias_tags table (SQL above)
3. Create new n8n workflow: 0005_HTTP_Gorgias_Sync_Tags.json
4. Add nodes: Schedule → Fetch → Parse → Upsert → Log
5. Test: Run manually, verify tags in table
6. Update main workflow "Build OpenAI Request" to reference tags
7. Test: "tag ticket as billing" → uses existing tag
```

---

## 📚 REFERENCE DOCUMENTATION

**Current System:**
- Workflow: Gorgias_Intelligent_v23__2_.json
- Analysis: V23-PRODUCTION-WORKFLOW-ANALYSIS.md
- Roadmap: V23-ENHANCEMENT-ROADMAP-COMPLETE.md

**Supabase Tables (Existing):**
- gorgias_users (already exists)
- agent_sessions
- api_logs
- performance_metrics

**Supabase Tables (New):**
- gorgias_tags
- gorgias_macros
- ai_confidence_scores
- prompt_training_log
- prompt_versions

---

## ✅ SUCCESS CRITERIA

**Phase 1 Complete When:**
- ✅ Tags sync daily
- ✅ Macros sync daily
- ✅ Bot uses existing tags (not creating new)
- ✅ Bot suggests relevant macros
- ✅ 95%+ tag accuracy

**Phase 2 Complete When:**
- ✅ Confidence logged for every command
- ✅ Users can provide feedback
- ✅ Training runs weekly
- ✅ Prompt improvements generated
- ✅ A/B tests working
- ✅ Accuracy improves by 2%+

---

## 🎯 FINAL NOTES

**This is a phased enhancement:**
1. Start with reference tables (Week 1)
2. Add training loop (Week 2-3)
3. Then webhooks, dashboard, testing (Weeks 4-7)

**Don't try to do everything at once!**

**Each phase builds on the previous one.**

**Test thoroughly before moving to next phase.**

---

**Ready to start with Phase 1, Task 1.1 (Gorgias Tags Table)?** 🚀

**Repository:** https://github.com/Ayousaf17/Analyst/tree/claude/http-workflows-review-011CUp6vvKCFPQySNbXLc7pf
