# 🎯 v23 ENHANCEMENT ROADMAP - Complete Vision

**Date:** November 9, 2025  
**Current State:** v23 Production Ready (49 nodes)  
**Vision:** Self-improving, reference-aware, proactive system

---

## 📊 ENHANCEMENT OVERVIEW

### **What You're Building:**

```
Current v23: Reactive system (user asks → bot responds)
    ↓
Enhanced v23: Intelligent, proactive, self-improving system
    ↓
Features:
- 🧠 Training loop (learns from mistakes)
- 📚 Reference tables (tags, macros, users)
- 🔔 Proactive webhooks (new ticket alerts)
- 📊 Analytics dashboard (metrics, usage, training)
- ✅ Comprehensive testing framework
```

---

## 🎯 PHASE 1: REFERENCE TABLES (Foundation)

**Goal:** Make bot aware of existing Gorgias/Slack data structures

### **1.1: Gorgias Users Reference Table**

**Purpose:** Map Gorgias agents to Slack users (already exists, but verify)

**Current Table:** `gorgias_users`
```sql
-- Verify structure
SELECT * FROM gorgias_users LIMIT 5;

-- Expected columns:
- id
- email (Gorgias email)
- full_name
- slack_user_id (Slack ID)
- slack_display_name
- role (agent, admin, etc.)
- is_bot
- last_synced_at
```

**Enhancement:** Add sync workflow
```
Workflow: 0004_HTTP_Gorgias_Sync_Users.json
Trigger: Schedule (daily at 2am)
Process:
  1. Fetch all Gorgias users (GET /api/users)
  2. Fetch all Slack users (Slack API)
  3. Match by email
  4. Upsert to gorgias_users table
  5. Log sync results
```

**Benefit:** Always up-to-date user mappings

---

### **1.2: Gorgias Tags Reference Table**

**Purpose:** Reference pre-built tags for suggestions and validation

**Create Table:** `gorgias_tags`
```sql
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

**Sync Workflow:** `0005_HTTP_Gorgias_Sync_Tags.json`
```
Trigger: Schedule (daily at 2am)
Process:
  1. Fetch all tags (GET /api/tags)
  2. Parse tag names and categories
  3. Upsert to gorgias_tags table
  4. Update usage counts (query tickets)
  5. Log sync results
```

**Usage in Main Workflow:**
```javascript
// Add to "Build OpenAI Request" node
const availableTags = await fetchFromSupabase('gorgias_tags');

systemPrompt += `
Available Tags (use these when adding tags):
${availableTags.map(t => `- ${t.tag_name} (${t.category})`).join('\n')}

When user says "tag as billing issue", use tag: "${billing-issue}"
`;
```

**Benefit:** AI suggests correct existing tags instead of creating new ones

---

### **1.3: Gorgias Macros Reference Table**

**Purpose:** Reference pre-built macros for quick resolution suggestions

**Create Table:** `gorgias_macros`
```sql
CREATE TABLE gorgias_macros (
  id BIGSERIAL PRIMARY KEY,
  macro_id INTEGER UNIQUE,
  macro_name TEXT NOT NULL,
  macro_description TEXT,
  macro_content TEXT,  -- The actual response text
  category TEXT,  -- common_questions, refunds, shipping, etc.
  usage_count INTEGER DEFAULT 0,
  avg_resolution_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_macros_name ON gorgias_macros(macro_name);
CREATE INDEX idx_macros_category ON gorgias_macros(category);
```

**Sync Workflow:** `0006_HTTP_Gorgias_Sync_Macros.json`
```
Trigger: Schedule (daily at 2am)
Process:
  1. Fetch all macros (GET /api/macros)
  2. Parse macro content and categories
  3. Upsert to gorgias_macros table
  4. Update usage counts
  5. Calculate avg resolution time
  6. Log sync results
```

**Usage in Main Workflow:**
```javascript
// Add to "Build OpenAI Request" node
const availableMacros = await fetchFromSupabase('gorgias_macros');

systemPrompt += `
Available Macros (suggest these when relevant):
${availableMacros.map(m => 
  `- ${m.macro_name}: ${m.macro_description}`
).join('\n')}

When user asks "how to respond to shipping delay", suggest macro: "shipping_delay_apology"
`;
```

**New Action:** `suggest_macro`
```javascript
// Add to Route by Action switch
case 'suggest_macro':
  // Fetch macro details
  // Show macro content in Slack
  // Provide "Apply Macro" button
```

**Benefit:** Agents get instant access to team's best responses

---

## 🎯 PHASE 2: TRAINING LOOP SYSTEM (Self-Improvement)

**Goal:** System learns from mistakes and improves prompts automatically

### **2.1: Confidence Scoring Table**

**Create Table:** `ai_confidence_scores`
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
  actual_action TEXT,  -- What was actually executed
  actual_params JSONB,  -- What parameters were used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  feedback_at TIMESTAMPTZ
);

CREATE INDEX idx_confidence_correlation ON ai_confidence_scores(correlation_id);
CREATE INDEX idx_confidence_score ON ai_confidence_scores(confidence_score);
CREATE INDEX idx_confidence_feedback ON ai_confidence_scores(user_feedback);
```

**Update OpenAI Request:** Add confidence to response schema
```javascript
// In "Build OpenAI Request" node
const schema = {
  type: "object",
  properties: {
    action: { type: "string", enum: [...] },
    params: { type: "object" },
    confidence: { 
      type: "number", 
      minimum: 0, 
      maximum: 1,
      description: "Confidence in this interpretation (0.0-1.0)"
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
    }
  },
  required: ["action", "params", "confidence"]
};
```

**Add Node:** "Log Confidence Score"
```javascript
// Position: After "Handle Plan Response"
const confidence = $json.confidence || 0.9;
const alternatives = $json.alternatives || [];

await supabase.from('ai_confidence_scores').insert({
  correlation_id: $('Parse Slack').first().json.correlation_id,
  user_message: $('Parse Slack').first().json.text,
  detected_action: $json.action,
  detected_params: $json.params,
  confidence_score: confidence,
  alternative_actions: alternatives,
  actual_action: $json.action,  // Will be updated if corrected
  actual_params: $json.params
});

return [{
  json: {
    ...$json,
    confidence_logged: true
  }
}];
```

---

### **2.2: User Feedback Mechanism**

**Add to Final Slack Reply:** Reaction buttons for feedback

**Update "Final Slack Reply" Node:**
```javascript
// Add reactions for feedback
const message = await slack.chat.postMessage({
  channel: channel,
  thread_ts: thread_ts,
  text: formattedResponse,
  blocks: [
    {
      type: "section",
      text: { type: "mrkdwn", text: formattedResponse }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Correct" },
          action_id: "feedback_correct",
          value: correlation_id
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ Wrong Action" },
          action_id: "feedback_wrong_action",
          value: correlation_id
        },
        {
          type: "button",
          text: { type: "plain_text", text: "⚠️ Wrong Params" },
          action_id: "feedback_wrong_params",
          value: correlation_id
        }
      ]
    }
  ]
});
```

**New Workflow:** `0007_HTTP_Slack_Feedback_Handler.json`
```
Trigger: Slack Interaction (button clicks)
Process:
  1. Parse feedback type (correct/wrong_action/wrong_params)
  2. Update ai_confidence_scores table
  3. If wrong: Ask user "What should it have been?"
  4. Log correction for training
  5. Thank user for feedback
```

---

### **2.3: Training Loop Analysis**

**Create Table:** `prompt_training_log`
```sql
CREATE TABLE prompt_training_log (
  id BIGSERIAL PRIMARY KEY,
  analysis_date DATE NOT NULL,
  low_confidence_count INTEGER,  -- Confidence < 0.7
  incorrect_action_count INTEGER,  -- User said wrong action
  incorrect_params_count INTEGER,  -- User said wrong params
  top_confusion_patterns JSONB,  -- Common mistakes
  suggested_prompt_changes TEXT,  -- AI-generated suggestions
  prompt_version INTEGER,
  applied_at TIMESTAMPTZ,
  improvement_score DECIMAL(3,2),  -- Before/after accuracy
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Weekly Training Workflow:** `0008_HTTP_Training_Loop_Analysis.json`
```
Trigger: Schedule (weekly, Sunday at 3am)

Process:
  1. Query ai_confidence_scores (last 7 days)
  
  2. Calculate metrics:
     - Average confidence score
     - Count of confidence < 0.7
     - Count of incorrect actions (user feedback)
     - Count of incorrect params
  
  3. Identify patterns:
     - Which user phrases confuse AI?
     - Which actions are misinterpreted?
     - Which parameters are extracted wrong?
  
  4. Generate prompt improvements:
     - Use Claude (via OpenRouter) to analyze patterns
     - Suggest prompt additions/clarifications
     - Generate example phrases
  
  5. A/B Test Setup:
     - Create new prompt version
     - Route 10% of traffic to new prompt
     - Track accuracy for 7 days
  
  6. Log to prompt_training_log table
  
  7. Send report to Slack #gorgias-training channel
```

**Analysis Query:**
```sql
-- Find confusing user phrases
SELECT 
  user_message,
  detected_action,
  confidence_score,
  user_feedback,
  COUNT(*) as occurrences
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (confidence_score < 0.7 OR user_feedback = 'incorrect')
GROUP BY user_message, detected_action, confidence_score, user_feedback
ORDER BY occurrences DESC
LIMIT 20;

-- Find misinterpreted actions
SELECT 
  detected_action,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect_count,
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct_count,
  AVG(confidence_score) as avg_confidence
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY detected_action
HAVING COUNT(*) FILTER (WHERE user_feedback = 'incorrect') > 0
ORDER BY incorrect_count DESC;
```

**Claude Analysis Prompt:**
```
Analyze these AI interpretation errors and suggest prompt improvements:

Confusion Patterns:
${confusionPatterns}

Current System Prompt:
${currentSystemPrompt}

Suggest:
1. Specific prompt additions (example phrases to clarify)
2. Parameter extraction improvements
3. Action disambiguation techniques

Format: Specific, actionable prompt changes
```

---

### **2.4: Prompt Version Management**

**Create Table:** `prompt_versions`
```sql
CREATE TABLE prompt_versions (
  id BIGSERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  changes_description TEXT,
  is_active BOOLEAN DEFAULT false,
  traffic_percentage INTEGER DEFAULT 0,  -- For A/B testing
  accuracy_rate DECIMAL(5,2),  -- Measured after deployment
  avg_confidence DECIMAL(3,2),
  test_started_at TIMESTAMPTZ,
  test_ended_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'training_loop',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_active ON prompt_versions(is_active);
```

**Update "Build OpenAI Request":** A/B testing logic
```javascript
// Fetch active prompt versions
const activePrompts = await supabase
  .from('prompt_versions')
  .select('*')
  .eq('is_active', true)
  .order('traffic_percentage', { ascending: false });

// A/B test: Route traffic based on percentage
const random = Math.random() * 100;
let selectedPrompt = activePrompts[0];  // Default
let cumulative = 0;

for (const prompt of activePrompts) {
  cumulative += prompt.traffic_percentage;
  if (random <= cumulative) {
    selectedPrompt = prompt;
    break;
  }
}

// Use selected prompt
const systemPrompt = selectedPrompt.system_prompt;
const promptVersion = selectedPrompt.version;

// Log which version was used (for tracking)
await supabase
  .from('ai_confidence_scores')
  .update({ prompt_version: promptVersion })
  .eq('correlation_id', correlation_id);
```

---

## 🎯 PHASE 3: PROACTIVE WEBHOOKS (New Ticket Alerts)

**Goal:** Alert team in Slack when new tickets arrive, suggest resolutions

### **3.1: Gorgias Webhook Integration**

**Create Workflow:** `0009_Webhook_Gorgias_NewTicket.json`

**Trigger:** Webhook (Gorgias sends POST when ticket created)
```
URL: https://your-n8n.com/webhook/gorgias-new-ticket
Method: POST
Body: Gorgias ticket data
```

**Process Flow:**
```
1. Webhook Trigger (receive new ticket)
   ↓
2. Parse Ticket Data
   - Extract: ticket_id, subject, customer, priority, channel
   ↓
3. Enrich with Context
   - Check if customer has previous tickets
   - Lookup customer history
   - Check for related macros
   ↓
4. AI Triage Analysis (OpenRouter - Claude)
   - Analyze ticket content
   - Suggest category/tags
   - Recommend macro (if applicable)
   - Estimate urgency (1-10)
   - Suggest assignee based on expertise
   ↓
5. Format Slack Alert
   - Ticket summary
   - AI suggestions
   - Action buttons (Assign, Apply Macro, View)
   ↓
6. Send to Slack Channel (#new-tickets)
   ↓
7. Log to Supabase (new_ticket_alerts table)
```

**Create Table:** `new_ticket_alerts`
```sql
CREATE TABLE new_ticket_alerts (
  id BIGSERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  ticket_subject TEXT,
  customer_email TEXT,
  priority TEXT,
  channel TEXT,
  ai_suggested_category TEXT,
  ai_suggested_tags TEXT[],
  ai_suggested_macro TEXT,
  ai_urgency_score INTEGER,  -- 1-10
  ai_suggested_assignee TEXT,
  assigned_to TEXT,  -- Who actually took it
  assigned_at TIMESTAMPTZ,
  resolution_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_alerts_id ON new_ticket_alerts(ticket_id);
CREATE INDEX idx_ticket_alerts_created ON new_ticket_alerts(created_at);
```

**Slack Message Format:**
```markdown
🎫 *New Ticket Alert*

*#18402* - "When will my PC ship?"
👤 Customer: john@example.com
📊 Priority: High
📱 Channel: Email

🧠 *AI Suggestions:*
• Category: `shipping-inquiry`
• Tags: `shipping`, `order-status`
• Macro: `shipping_timeline_update` (85% confidence)
• Urgency: 7/10
• Assign to: @Sarah (shipping specialist)

*Actions:*
[Assign to Me] [Apply Macro] [View in Gorgias] [Snooze]
```

---

### **3.2: Resolution Process Map**

**Track Resolution Steps:** Monitor how tickets are resolved

**Create Table:** `ticket_resolution_process`
```sql
CREATE TABLE ticket_resolution_process (
  id BIGSERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  alert_id BIGINT REFERENCES new_ticket_alerts(id),
  step_number INTEGER,
  step_action TEXT,  -- assigned, macro_applied, tagged, replied, closed
  step_timestamp TIMESTAMPTZ,
  performed_by TEXT,  -- Slack user
  via_slack BOOLEAN DEFAULT false,  -- True if done via Slack bot
  ai_suggested BOOLEAN DEFAULT false,  -- True if AI suggested this
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resolution_ticket ON ticket_resolution_process(ticket_id);
```

**Track via Slack Buttons:**
```javascript
// When agent clicks "Assign to Me"
await supabase.from('ticket_resolution_process').insert({
  ticket_id: ticket_id,
  alert_id: alert_id,
  step_number: 1,
  step_action: 'assigned',
  step_timestamp: new Date(),
  performed_by: slack_user_id,
  via_slack: true,
  ai_suggested: true  // If AI suggested this assignee
});

// When "Apply Macro" clicked
await supabase.from('ticket_resolution_process').insert({
  ticket_id: ticket_id,
  step_number: 2,
  step_action: 'macro_applied',
  performed_by: slack_user_id,
  via_slack: true,
  ai_suggested: true
});
```

**Analytics Query:**
```sql
-- Measure AI suggestion accuracy
SELECT 
  ai_suggested_macro,
  COUNT(*) as times_suggested,
  COUNT(*) FILTER (WHERE step_action = 'macro_applied') as times_used,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE step_action = 'macro_applied') / COUNT(*),
    2
  ) as acceptance_rate
FROM ticket_resolution_process trp
JOIN new_ticket_alerts nta ON trp.alert_id = nta.id
WHERE ai_suggested = true
GROUP BY ai_suggested_macro
ORDER BY times_suggested DESC;
```

---

## 🎯 PHASE 4: ANALYTICS DASHBOARD (Visibility)

**Goal:** Comprehensive dashboard for metrics, usage, and training insights

### **4.1: Dashboard Platform Choice**

**Options:**

**A. Supabase Dashboard (Recommended - Easiest)**
- Built into Supabase
- SQL-based charts
- No extra hosting
- Limited customization

**B. Metabase (Open Source)**
- More powerful
- Better visualizations
- Requires separate hosting
- Free self-hosted

**C. Custom (React + Recharts)**
- Full customization
- Most work
- Best UX potential

**Recommendation:** Start with Supabase Dashboard, migrate to Metabase if needed

---

### **4.2: Dashboard Views**

#### **View 1: Performance Overview**

**Metrics:**
```sql
-- Today's execution stats
SELECT 
  COUNT(*) as total_executions,
  AVG(execution_time_ms) as avg_time_ms,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(), 2) as success_rate
FROM performance_metrics
WHERE created_at > CURRENT_DATE;

-- By path
SELECT 
  path,
  COUNT(*) as executions,
  AVG(execution_time_ms) as avg_time,
  SUM(total_tokens) as total_tokens,
  SUM(api_calls_count) as total_api_calls
FROM performance_metrics
WHERE created_at > CURRENT_DATE
GROUP BY path;
```

**Charts:**
- Line: Execution time trend (last 7 days)
- Bar: Success rate by day
- Pie: Main path vs Analytics path usage
- Gauge: Current success rate (target: 95%)

---

#### **View 2: Usage Analytics**

**Metrics:**
```sql
-- Most used actions
SELECT 
  action,
  COUNT(*) as usage_count,
  AVG(execution_time_ms) as avg_time,
  COUNT(*) FILTER (WHERE success = true) as successful
FROM agent_sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY usage_count DESC
LIMIT 10;

-- Most active users
SELECT 
  user_id,
  COUNT(*) as command_count,
  COUNT(DISTINCT action) as unique_actions,
  AVG(execution_time_ms) as avg_response_time
FROM agent_sessions
JOIN performance_metrics USING (correlation_id)
WHERE agent_sessions.created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY command_count DESC
LIMIT 10;

-- Peak usage times
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as executions,
  AVG(execution_time_ms) as avg_time
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

**Charts:**
- Bar: Top 10 actions by usage
- Line: Hourly usage pattern
- Table: Top users with command counts
- Heatmap: Day/hour usage distribution

---

#### **View 3: AI Training Insights**

**Metrics:**
```sql
-- Confidence distribution
SELECT 
  CASE 
    WHEN confidence_score >= 0.9 THEN 'High (0.9+)'
    WHEN confidence_score >= 0.7 THEN 'Medium (0.7-0.9)'
    ELSE 'Low (<0.7)'
  END as confidence_bucket,
  COUNT(*) as count,
  AVG(confidence_score) as avg_score,
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY confidence_bucket;

-- Accuracy by action
SELECT 
  detected_action,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE user_feedback = 'correct') / 
    NULLIF(COUNT(*) FILTER (WHERE user_feedback IS NOT NULL), 0),
    2
  ) as accuracy_rate,
  AVG(confidence_score) as avg_confidence
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY detected_action
ORDER BY total DESC;

-- Prompt version performance
SELECT 
  pv.version,
  pv.system_prompt,
  COUNT(*) as executions,
  AVG(acs.confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE acs.user_feedback = 'correct') as correct,
  COUNT(*) FILTER (WHERE acs.user_feedback = 'incorrect') as incorrect
FROM prompt_versions pv
LEFT JOIN ai_confidence_scores acs ON acs.prompt_version = pv.version
WHERE pv.test_started_at IS NOT NULL
GROUP BY pv.version, pv.system_prompt
ORDER BY pv.version DESC;
```

**Charts:**
- Pie: Confidence distribution
- Bar: Accuracy by action
- Line: Confidence trend over time
- Table: Prompt version comparison (A/B tests)
- List: Top confusion patterns (needs improvement)

---

#### **View 4: New Ticket Triage**

**Metrics:**
```sql
-- AI suggestion accuracy
SELECT 
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (
    WHERE ai_suggested_assignee = assigned_to
  ) as correct_assignee_suggestions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE ai_suggested_assignee = assigned_to) / COUNT(),
    2
  ) as assignee_accuracy,
  AVG(resolution_time_minutes) as avg_resolution_time,
  AVG(ai_urgency_score) as avg_urgency_score
FROM new_ticket_alerts
WHERE created_at > NOW() - INTERVAL '7 days';

-- Macro usage
SELECT 
  nta.ai_suggested_macro,
  COUNT(*) as times_suggested,
  COUNT(*) FILTER (
    WHERE trp.step_action = 'macro_applied'
  ) as times_used,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE trp.step_action = 'macro_applied') / COUNT(),
    2
  ) as acceptance_rate
FROM new_ticket_alerts nta
LEFT JOIN ticket_resolution_process trp ON nta.id = trp.alert_id
WHERE nta.created_at > NOW() - INTERVAL '7 days'
  AND nta.ai_suggested_macro IS NOT NULL
GROUP BY nta.ai_suggested_macro
ORDER BY times_suggested DESC;

-- Resolution time by suggestion acceptance
SELECT 
  CASE 
    WHEN assigned_to = ai_suggested_assignee THEN 'AI Suggestion Accepted'
    ELSE 'Manual Assignment'
  END as assignment_type,
  COUNT(*) as count,
  AVG(resolution_time_minutes) as avg_resolution_time,
  MIN(resolution_time_minutes) as min_time,
  MAX(resolution_time_minutes) as max_time
FROM new_ticket_alerts
WHERE resolution_time_minutes IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY assignment_type;
```

**Charts:**
- Gauge: AI assignee accuracy (target: 70%+)
- Bar: Macro acceptance rate
- Line: Avg resolution time (AI suggestions vs manual)
- Table: Top performing macros

---

#### **View 5: Error & Reliability**

**Metrics:**
```sql
-- Error rate by action
SELECT 
  action,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE success = false) as errors,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = false) / COUNT(),
    2
  ) as error_rate,
  MAX(error_message) as last_error
FROM api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action
HAVING COUNT(*) FILTER (WHERE success = false) > 0
ORDER BY error_rate DESC;

-- Most common errors
SELECT 
  error_message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurred
FROM api_logs
WHERE success = false
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;

-- Uptime tracking
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE success = true) as successful,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(),
    2
  ) as uptime_percentage
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;
```

**Charts:**
- Line: Daily uptime % (target: 99%+)
- Bar: Error rate by action
- Table: Recent errors with timestamps
- Alert: If uptime < 95% in last 24 hours

---

### **4.3: Dashboard Implementation**

**Using Supabase Dashboard:**

```sql
-- Create dashboard queries as Supabase saved queries
-- Example: Performance Overview
CREATE OR REPLACE VIEW dashboard_performance_overview AS
SELECT 
  DATE(created_at) as date,
  path,
  COUNT(*) as executions,
  AVG(execution_time_ms) as avg_time_ms,
  COUNT(*) FILTER (WHERE success = true) as successful,
  SUM(total_tokens) as total_tokens
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY date, path
ORDER BY date DESC;

-- Usage analytics
CREATE OR REPLACE VIEW dashboard_usage_analytics AS
SELECT 
  action,
  COUNT(*) as usage_count,
  AVG(execution_time_ms) as avg_time_ms,
  COUNT(DISTINCT user_id) as unique_users
FROM agent_sessions
JOIN performance_metrics USING (correlation_id)
WHERE agent_sessions.created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY usage_count DESC;

-- Training insights
CREATE OR REPLACE VIEW dashboard_training_insights AS
SELECT 
  detected_action,
  COUNT(*) as total,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct_count,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect_count
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY detected_action;
```

---

## 🎯 PHASE 5: COMPREHENSIVE TESTING FRAMEWORK

**Goal:** Test everything before production, use logs to refine

### **5.1: Testing Strategy**

**Test Layers:**
```
1. Unit Tests (Individual Nodes)
   - Parse Slack: Extract correct fields
   - OpenAI Request: Valid JSON
   - Route by Action: Correct routing
   
2. Integration Tests (Node Chains)
   - Slack → Parse → OpenAI → Route → Execute
   - Error handling flows
   - Logging flows
   
3. End-to-End Tests (Full Workflows)
   - User command → Slack response
   - All 14 actions tested
   - Analytics path tested
   
4. Load Tests (Performance)
   - 100 concurrent requests
   - Measure latency
   - Check database load
   
5. Training Tests (AI Accuracy)
   - 50 sample commands
   - Measure confidence
   - Check action correctness
```

---

### **5.2: Test Data Setup**

**Create Test Data:**
```sql
-- Test tickets (in Gorgias dev environment)
INSERT INTO test_tickets (id, subject, status, priority) VALUES
  (99901, 'Test: Shipping delay inquiry', 'open', 'normal'),
  (99902, 'Test: Billing question', 'open', 'high'),
  (99903, 'Test: Technical support', 'pending', 'urgent'),
  (99904, 'Test: Refund request', 'open', 'normal'),
  (99905, 'Test: Order status', 'closed', 'low');

-- Test commands
CREATE TABLE test_commands (
  id SERIAL PRIMARY KEY,
  command TEXT NOT NULL,
  expected_action TEXT,
  expected_params JSONB,
  category TEXT,
  difficulty TEXT  -- easy, medium, hard
);

INSERT INTO test_commands (command, expected_action, expected_params, category, difficulty) VALUES
  ('show me open tickets', 'list_tickets', '{"status": "open"}', 'basic', 'easy'),
  ('get ticket 99901', 'get_ticket', '{"ticket_id": 99901}', 'basic', 'easy'),
  ('assign ticket 99901 to spencer', 'assign_ticket', '{"ticket_id": 99901, "assignee": "spencer@..."}', 'intermediate', 'medium'),
  ('show me spencer''s urgent tickets from last week', 'list_tickets', '{"assignee": "spencer@...", "priority": "urgent", "date_range": "7d"}', 'advanced', 'hard'),
  ('analyze shipping tickets from last month', 'analyze_insights', '{"category": "shipping", "period": "30d"}', 'analytics', 'hard');
```

---

### **5.3: Testing Workflow**

**Create:** `0010_Testing_Execute_Test_Suite.json`

**Process:**
```
1. Fetch Test Commands
   - Query test_commands table
   - Filter by category (if specified)
   
2. For Each Test Command:
   - Execute command via main workflow
   - Capture:
     * Detected action
     * Detected params
     * Confidence score
     * Execution time
     * Success/failure
   
3. Compare Results:
   - Does detected_action match expected_action?
   - Do detected_params match expected_params?
   - Is confidence > 0.7?
   - Did execution succeed?
   
4. Log Test Results:
   - Insert to test_results table
   
5. Calculate Metrics:
   - Accuracy rate (% correct)
   - Avg confidence score
   - Avg execution time
   - Pass/fail by category
   
6. Generate Report:
   - Send to Slack #testing channel
   - Include failed tests with details
   - Suggest improvements
```

**Create Table:** `test_results`
```sql
CREATE TABLE test_results (
  id BIGSERIAL PRIMARY KEY,
  test_run_id TEXT NOT NULL,  -- UUID for batch
  test_command_id INTEGER REFERENCES test_commands(id),
  command_text TEXT,
  expected_action TEXT,
  detected_action TEXT,
  action_match BOOLEAN,
  expected_params JSONB,
  detected_params JSONB,
  params_match BOOLEAN,
  confidence_score DECIMAL(3,2),
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  passed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_results_run ON test_results(test_run_id);
CREATE INDEX idx_test_results_passed ON test_results(passed);
```

---

### **5.4: Automated Testing Schedule**

**Schedule:**
```
Daily (3am): Basic smoke tests (10 simple commands)
Weekly (Sunday 4am): Full test suite (all 50+ commands)
Before Production Deploy: Full suite + load tests
After Prompt Update: A/B test with 10% traffic
```

**Test Report Format:**
```markdown
📊 *Test Run Report*

*Run ID:* `550e8400-e29b-41d4-a716-446655440000`
*Date:* 2025-11-09 03:00:00
*Type:* Full Test Suite

*Results:*
✅ Passed: 48/50 (96%)
❌ Failed: 2/50 (4%)

*By Category:*
• Basic: 20/20 ✅
• Intermediate: 15/15 ✅
• Advanced: 10/12 ⚠️
• Analytics: 3/3 ✅

*Failed Tests:*
1. "show me collin's stuff from yesterday"
   - Expected: list_tickets
   - Got: search_tickets
   - Confidence: 0.65 (LOW)
   - Issue: Date parsing ambiguous

2. "close all open tickets tagged refund"
   - Expected: Multi-step (list → close loop)
   - Got: Single close (wrong)
   - Confidence: 0.72
   - Issue: Bulk operation not understood

*Performance:*
• Avg Execution Time: 2.3s
• Avg Confidence: 0.87
• Success Rate: 96%

*Recommendations:*
1. Add example for "yesterday" date parsing
2. Clarify bulk operations in system prompt
```

---

### **5.5: Supabase Log Analysis for Refinement**

**Before Production, Analyze:**

**Query 1: Find Low Confidence Commands**
```sql
SELECT 
  user_message,
  detected_action,
  confidence_score,
  COUNT(*) as occurrences
FROM ai_confidence_scores
WHERE confidence_score < 0.7
GROUP BY user_message, detected_action, confidence_score
ORDER BY occurrences DESC
LIMIT 20;
```

**Query 2: Find Slow Executions**
```sql
SELECT 
  correlation_id,
  path,
  execution_time_ms,
  api_calls_count,
  actions_count
FROM performance_metrics
WHERE execution_time_ms > 5000  -- > 5 seconds
ORDER BY execution_time_ms DESC
LIMIT 20;
```

**Query 3: Find Common Errors**
```sql
SELECT 
  error_message,
  action,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurred
FROM api_logs
WHERE success = false
GROUP BY error_message, action
ORDER BY occurrences DESC
LIMIT 10;
```

**Use findings to:**
1. Add clarifying examples to system prompt
2. Optimize slow API calls
3. Add error handling for common failures
4. Update test suite with edge cases

---

## 🎯 COMPLETE IMPLEMENTATION TIMELINE

### **Phase 1: Reference Tables (Week 1)**
- Day 1-2: Create tables (users, tags, macros)
- Day 3-4: Build sync workflows
- Day 5: Test and validate

### **Phase 2: Training Loop (Week 2-3)**
- Day 1-3: Confidence scoring + feedback UI
- Day 4-5: Training analysis workflow
- Day 6-7: Prompt versioning + A/B testing
- Day 8-10: Test training loop cycle

### **Phase 3: Proactive Webhooks (Week 4)**
- Day 1-2: Gorgias webhook setup
- Day 3-4: AI triage + Slack alerts
- Day 5: Resolution tracking
- Day 6-7: Test and refine

### **Phase 4: Analytics Dashboard (Week 5-6)**
- Day 1-3: Create dashboard views
- Day 4-7: Build all 5 dashboard sections
- Day 8-10: Polish and add alerts

### **Phase 5: Testing Framework (Week 7)**
- Day 1-2: Create test data and commands
- Day 3-4: Build testing workflow
- Day 5-7: Run full test suite and refine

**Total Timeline: ~7 weeks**

---

## 📊 EXPECTED OUTCOMES

### **After Phase 1 (Reference Tables):**
- ✅ Bot suggests correct existing tags (vs creating new ones)
- ✅ Bot recommends team's proven macros
- ✅ 100% user resolution accuracy

### **After Phase 2 (Training Loop):**
- ✅ System learns from mistakes automatically
- ✅ Prompt improves every week based on data
- ✅ Confidence scores track accuracy
- ✅ A/B testing validates improvements

### **After Phase 3 (Proactive Webhooks):**
- ✅ New tickets alerted to team immediately
- ✅ AI suggests category, tags, macro, assignee
- ✅ Faster resolution time (AI helps prioritize)
- ✅ Track what works (macro acceptance rate)

### **After Phase 4 (Dashboard):**
- ✅ Complete visibility into system performance
- ✅ Usage patterns identified
- ✅ Training insights actionable
- ✅ ROI measurable

### **After Phase 5 (Testing):**
- ✅ Comprehensive test coverage
- ✅ Automated testing before deploys
- ✅ Confidence in production releases
- ✅ Data-driven refinement process

---

## 🎯 SUCCESS METRICS

| Metric | Current (v23) | Target (Enhanced) |
|--------|---------------|-------------------|
| **Action Accuracy** | 95% | 98%+ |
| **Avg Confidence** | 0.85 | 0.90+ |
| **User Satisfaction** | Good | Excellent |
| **Resolution Time** | N/A | 20% faster (with webhooks) |
| **Tag Accuracy** | Unknown | 95%+ (with reference) |
| **Macro Usage** | 0% | 40%+ (with suggestions) |
| **Prompt Improvements** | Manual | Automated (weekly) |
| **Testing Coverage** | Ad-hoc | 96%+ (automated) |

---

## 🎊 THE VISION

### **From This:**
```
User asks → Bot executes → Response
(Reactive, static)
```

### **To This:**
```
New ticket arrives → AI analyzes → Team alerted → Resolution suggested
                ↓
User asks → Bot executes → Response → Feedback captured
                ↓
Weekly analysis → Prompt improved → Accuracy increases
                ↓
Dashboard shows → Team optimizes → ROI proven
                ↓
Tests validate → Deploy confident → Users happy
```

**Result:** Self-improving, proactive, intelligent support system! 🎯

---

**Document Version:** 1.0  
**Created:** November 9, 2025  
**Status:** Ready for implementation planning  
**Next Step:** Create Claude Code handoff prompt

---

**This is the complete roadmap. Ready to create the Claude Code prompt?** 🚀
