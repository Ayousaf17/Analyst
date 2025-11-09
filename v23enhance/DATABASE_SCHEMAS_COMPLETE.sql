-- ============================================================================
-- GORGIAS TERMINAL ENHANCEMENT - DATABASE SCHEMAS
-- ============================================================================
-- Date: November 9, 2025
-- Purpose: Create all tables for Phase 1 & 2 enhancements
-- Tables: 6 new tables + 1 existing update
-- ============================================================================

-- ============================================================================
-- PHASE 1: REFERENCE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: gorgias_users
-- Purpose: Store Gorgias users matched with Slack users for @mentions
-- Sync: Daily at 1:45 AM via workflow 0004
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gorgias_users (
  id BIGSERIAL PRIMARY KEY,
  gorgias_user_id INTEGER UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  
  -- Slack mapping
  slack_user_id TEXT,
  slack_display_name TEXT,
  slack_real_name TEXT,
  slack_avatar_url TEXT,
  
  -- User attributes
  role TEXT DEFAULT 'agent',  -- owner, admin, agent
  is_active BOOLEAN DEFAULT true,
  is_bot BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_gorgias_id ON gorgias_users(gorgias_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON gorgias_users(email);
CREATE INDEX IF NOT EXISTS idx_users_slack_id ON gorgias_users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON gorgias_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role ON gorgias_users(role);

-- Unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON gorgias_users(LOWER(email));

-- Comments
COMMENT ON TABLE gorgias_users IS 'Stores Gorgias users matched with Slack users for @mentions and assignment';
COMMENT ON COLUMN gorgias_users.gorgias_user_id IS 'Gorgias user ID (unique identifier)';
COMMENT ON COLUMN gorgias_users.slack_user_id IS 'Matched Slack user ID for @mentions';
COMMENT ON COLUMN gorgias_users.role IS 'User role: owner, admin, agent';

-- ----------------------------------------------------------------------------
-- Table: gorgias_tags
-- Purpose: Store all Gorgias tags with categories for AI suggestions
-- Sync: Daily at 2:00 AM via workflow 0005
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gorgias_tags (
  id BIGSERIAL PRIMARY KEY,
  tag_id INTEGER UNIQUE NOT NULL,
  tag_name TEXT NOT NULL,
  tag_description TEXT,
  category TEXT DEFAULT 'other',  -- billing, technical, shipping, etc.
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON gorgias_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON gorgias_tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_active ON gorgias_tags(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tags_usage ON gorgias_tags(usage_count DESC);

-- Comments
COMMENT ON TABLE gorgias_tags IS 'Stores Gorgias tags synced daily for AI suggestions';
COMMENT ON COLUMN gorgias_tags.tag_id IS 'Gorgias tag ID (unique identifier)';
COMMENT ON COLUMN gorgias_tags.category IS 'Auto-categorized: billing, shipping, technical, refund, order, support, priority, spam, other';
COMMENT ON COLUMN gorgias_tags.usage_count IS 'Number of tickets using this tag (updated during sync)';

-- ----------------------------------------------------------------------------
-- Table: gorgias_macros
-- Purpose: Store all Gorgias macros for AI recommendations
-- Sync: Daily at 2:15 AM via workflow 0006
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gorgias_macros (
  id BIGSERIAL PRIMARY KEY,
  macro_id INTEGER UNIQUE NOT NULL,
  macro_name TEXT NOT NULL,
  macro_description TEXT,
  macro_content TEXT,  -- The actual response text (max 5000 chars)
  category TEXT DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  avg_resolution_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_macros_name ON gorgias_macros(macro_name);
CREATE INDEX IF NOT EXISTS idx_macros_category ON gorgias_macros(category);
CREATE INDEX IF NOT EXISTS idx_macros_active ON gorgias_macros(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_macros_usage ON gorgias_macros(usage_count DESC);

-- Full text search on macro content
CREATE INDEX IF NOT EXISTS idx_macros_content_search ON gorgias_macros 
  USING gin(to_tsvector('english', macro_name || ' ' || COALESCE(macro_description, '') || ' ' || COALESCE(macro_content, '')));

-- Comments
COMMENT ON TABLE gorgias_macros IS 'Stores Gorgias macros synced daily for AI recommendations';
COMMENT ON COLUMN gorgias_macros.macro_id IS 'Gorgias macro ID (unique identifier)';
COMMENT ON COLUMN gorgias_macros.category IS 'Auto-categorized: refund, shipping, technical, billing, order, returns, warranty, apology, gratitude, general';
COMMENT ON COLUMN gorgias_macros.macro_content IS 'Full macro response text (truncated to 5000 chars)';

-- ----------------------------------------------------------------------------
-- Table: sync_logs
-- Purpose: Track all sync operations (tags, macros, users)
-- Usage: Monitor sync health and troubleshoot issues
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_added INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',  -- success, failed, partial
  error_message TEXT,
  sync_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_workflow ON sync_logs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_sync_timestamp ON sync_logs(sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_logs(status);

-- Comments
COMMENT ON TABLE sync_logs IS 'Tracks all sync operations for monitoring and troubleshooting';
COMMENT ON COLUMN sync_logs.workflow_name IS 'Name of sync workflow: gorgias_tags_sync, gorgias_macros_sync, gorgias_users_sync';

-- ============================================================================
-- PHASE 2: TRAINING LOOP SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: ai_confidence_scores
-- Purpose: Track AI confidence for every command + user feedback
-- Usage: Training loop analysis, accuracy measurement, prompt improvement
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_confidence_scores (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  user_message TEXT,
  detected_action TEXT,
  detected_params JSONB,
  confidence_score DECIMAL(3,2),  -- 0.00 to 1.00
  alternative_actions JSONB,  -- [{action, score}, ...]
  reasoning TEXT,  -- AI's explanation of why it chose this action
  
  -- User feedback
  user_feedback TEXT,  -- correct, incorrect, partial
  feedback_user_id TEXT,
  feedback_at TIMESTAMPTZ,
  
  -- Correction data (if user says it was wrong)
  actual_action TEXT,  -- What it should have been
  actual_params JSONB,  -- Correct parameters
  correction_notes TEXT,  -- User's notes
  
  -- Prompt version tracking (for A/B testing)
  prompt_version INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analysis queries
CREATE INDEX IF NOT EXISTS idx_confidence_correlation ON ai_confidence_scores(correlation_id);
CREATE INDEX IF NOT EXISTS idx_confidence_score ON ai_confidence_scores(confidence_score);
CREATE INDEX IF NOT EXISTS idx_confidence_feedback ON ai_confidence_scores(user_feedback);
CREATE INDEX IF NOT EXISTS idx_confidence_action ON ai_confidence_scores(detected_action);
CREATE INDEX IF NOT EXISTS idx_confidence_created ON ai_confidence_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confidence_prompt_version ON ai_confidence_scores(prompt_version);

-- Low confidence tracking
CREATE INDEX IF NOT EXISTS idx_confidence_low ON ai_confidence_scores(confidence_score) 
  WHERE confidence_score < 0.7;

-- Incorrect feedback tracking
CREATE INDEX IF NOT EXISTS idx_confidence_incorrect ON ai_confidence_scores(user_feedback) 
  WHERE user_feedback = 'incorrect';

-- Comments
COMMENT ON TABLE ai_confidence_scores IS 'Tracks AI confidence and user feedback for training loop';
COMMENT ON COLUMN ai_confidence_scores.confidence_score IS 'AI confidence: 0.00 (uncertain) to 1.00 (very confident)';
COMMENT ON COLUMN ai_confidence_scores.alternative_actions IS 'Other possible interpretations with scores';
COMMENT ON COLUMN ai_confidence_scores.user_feedback IS 'User feedback: correct, incorrect, partial';
COMMENT ON COLUMN ai_confidence_scores.prompt_version IS 'Which prompt version was used (for A/B testing)';

-- ----------------------------------------------------------------------------
-- Table: prompt_versions
-- Purpose: Store different prompt versions for A/B testing
-- Usage: Prompt evolution tracking, A/B test management
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_versions (
  id BIGSERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  changes_description TEXT,  -- What changed from previous version
  
  -- Activation & testing
  is_active BOOLEAN DEFAULT false,
  traffic_percentage INTEGER DEFAULT 0,  -- 0-100 for A/B testing
  
  -- Performance metrics
  accuracy_rate DECIMAL(5,2),  -- Measured after deployment
  avg_confidence DECIMAL(3,2),
  total_executions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  
  -- Lifecycle
  test_started_at TIMESTAMPTZ,
  test_ended_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,  -- When it went to 100% traffic
  created_by TEXT DEFAULT 'training_loop',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prompt_version ON prompt_versions(version DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_accuracy ON prompt_versions(accuracy_rate DESC);

-- Comments
COMMENT ON TABLE prompt_versions IS 'Stores all prompt versions for A/B testing and evolution tracking';
COMMENT ON COLUMN prompt_versions.traffic_percentage IS 'Percentage of traffic routed to this version (for A/B testing)';
COMMENT ON COLUMN prompt_versions.accuracy_rate IS 'Percentage of correct interpretations (based on user feedback)';

-- ----------------------------------------------------------------------------
-- Table: prompt_training_log
-- Purpose: Log weekly training loop analysis results
-- Usage: Track prompt improvements over time, measure effectiveness
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_training_log (
  id BIGSERIAL PRIMARY KEY,
  analysis_date DATE NOT NULL,
  analysis_period TEXT,  -- e.g., "2025-11-02 to 2025-11-09"
  
  -- Metrics from last week
  total_commands INTEGER,
  low_confidence_count INTEGER,  -- Confidence < 0.7
  incorrect_action_count INTEGER,  -- User said wrong action
  incorrect_params_count INTEGER,  -- User said wrong params
  avg_confidence DECIMAL(3,2),
  accuracy_rate DECIMAL(5,2),
  
  -- Analysis results
  top_confusion_patterns JSONB,  -- Common mistakes
  suggested_prompt_changes TEXT,  -- AI-generated suggestions
  
  -- New prompt created
  new_prompt_version INTEGER REFERENCES prompt_versions(version),
  
  -- Post-deployment metrics
  improvement_score DECIMAL(3,2),  -- Before/after accuracy improvement
  deployed BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_date ON prompt_training_log(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_version ON prompt_training_log(new_prompt_version);

-- Comments
COMMENT ON TABLE prompt_training_log IS 'Weekly training loop analysis results and improvements';
COMMENT ON COLUMN prompt_training_log.top_confusion_patterns IS 'JSON array of common misinterpretations';
COMMENT ON COLUMN prompt_training_log.improvement_score IS 'Accuracy improvement after deploying new prompt';

-- ============================================================================
-- UPDATE EXISTING TABLE: agent_sessions
-- Add prompt_version tracking
-- ============================================================================

-- Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_sessions' 
        AND column_name = 'prompt_version'
    ) THEN
        ALTER TABLE agent_sessions ADD COLUMN prompt_version INTEGER;
        CREATE INDEX idx_sessions_prompt_version ON agent_sessions(prompt_version);
        COMMENT ON COLUMN agent_sessions.prompt_version IS 'Which prompt version was used for this command';
    END IF;
END $$;

-- ============================================================================
-- USEFUL VIEWS FOR ANALYTICS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: daily_confidence_stats
-- Purpose: Daily confidence and accuracy metrics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW daily_confidence_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_commands,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE confidence_score < 0.7) as low_confidence_count,
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct_feedback,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect_feedback,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE user_feedback = 'correct') / 
    NULLIF(COUNT(*) FILTER (WHERE user_feedback IS NOT NULL), 0),
    2
  ) as accuracy_rate
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW daily_confidence_stats IS 'Daily confidence and accuracy metrics for dashboards';

-- ----------------------------------------------------------------------------
-- View: action_accuracy
-- Purpose: Accuracy by action type
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW action_accuracy AS
SELECT 
  detected_action,
  COUNT(*) as total,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE user_feedback = 'correct') as correct_count,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE user_feedback = 'correct') / 
    NULLIF(COUNT(*) FILTER (WHERE user_feedback IS NOT NULL), 0),
    2
  ) as accuracy_rate
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY detected_action
ORDER BY total DESC;

COMMENT ON VIEW action_accuracy IS 'Accuracy metrics by action type';

-- ----------------------------------------------------------------------------
-- View: confusion_patterns
-- Purpose: Identify common misinterpretations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW confusion_patterns AS
SELECT 
  LEFT(user_message, 50) as message_pattern,
  detected_action,
  COUNT(*) as occurrences,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE user_feedback = 'incorrect') as incorrect_count,
  STRING_AGG(DISTINCT actual_action, ', ') as should_have_been
FROM ai_confidence_scores
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (confidence_score < 0.7 OR user_feedback = 'incorrect')
GROUP BY LEFT(user_message, 50), detected_action
HAVING COUNT(*) > 1
ORDER BY incorrect_count DESC, occurrences DESC
LIMIT 20;

COMMENT ON VIEW confusion_patterns IS 'Top 20 confusion patterns from last week';

-- ----------------------------------------------------------------------------
-- View: prompt_version_comparison
-- Purpose: Compare A/B test results
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW prompt_version_comparison AS
SELECT 
  pv.version,
  pv.traffic_percentage,
  pv.is_active,
  COUNT(acs.id) as executions,
  AVG(acs.confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE acs.user_feedback = 'correct') as correct,
  COUNT(*) FILTER (WHERE acs.user_feedback = 'incorrect') as incorrect,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE acs.user_feedback = 'correct') / 
    NULLIF(COUNT(*) FILTER (WHERE acs.user_feedback IS NOT NULL), 0),
    2
  ) as accuracy_rate,
  pv.test_started_at,
  pv.test_ended_at
FROM prompt_versions pv
LEFT JOIN ai_confidence_scores acs ON acs.prompt_version = pv.version
WHERE pv.test_started_at IS NOT NULL
GROUP BY pv.version, pv.traffic_percentage, pv.is_active, pv.test_started_at, pv.test_ended_at
ORDER BY pv.version DESC;

COMMENT ON VIEW prompt_version_comparison IS 'Compare performance of different prompt versions';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert default prompt version (current v23 prompt)
INSERT INTO prompt_versions (version, system_prompt, is_active, traffic_percentage, created_by) 
VALUES (
  1,
  'You are a Gorgias ticket management assistant. [... your current prompt ...]',
  true,
  100,
  'initial_setup'
) ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- PERMISSIONS (Adjust based on your setup)
-- ============================================================================

-- Grant read/write to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant read-only to anon role for views
GRANT SELECT ON daily_confidence_stats TO anon;
GRANT SELECT ON action_accuracy TO anon;
GRANT SELECT ON confusion_patterns TO anon;
GRANT SELECT ON prompt_version_comparison TO anon;

-- ============================================================================
-- MAINTENANCE & MONITORING
-- ============================================================================

-- Function to calculate tag usage (run during sync)
CREATE OR REPLACE FUNCTION update_tag_usage_counts()
RETURNS void AS $$
BEGIN
  -- Update usage counts based on actual ticket data
  -- This is a placeholder - implement based on your tickets table structure
  UPDATE gorgias_tags gt
  SET usage_count = (
    SELECT COUNT(*)
    FROM tickets t
    WHERE t.tags @> ARRAY[gt.tag_name]::TEXT[]
  );
END;
$$ LANGUAGE plpgsql;

-- Function to archive old confidence scores (keep last 90 days)
CREATE OR REPLACE FUNCTION archive_old_confidence_scores()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_confidence_scores
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND user_feedback IS NULL;  -- Keep all feedback data
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename IN (
  'gorgias_tags',
  'gorgias_macros',
  'sync_logs',
  'ai_confidence_scores',
  'prompt_versions',
  'prompt_training_log'
)
ORDER BY tablename;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN (
  'gorgias_tags',
  'gorgias_macros',
  'sync_logs',
  'ai_confidence_scores',
  'prompt_versions',
  'prompt_training_log'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Deploy workflow 0005 (tags sync)
-- 3. Deploy workflow 0006 (macros sync)
-- 4. Deploy workflow 0007 (feedback handler)
-- 5. Update main workflow to log confidence scores
-- ============================================================================
