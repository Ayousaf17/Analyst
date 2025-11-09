-- ============================================================================
-- V23 ENHANCEMENT - COMPLETE DATABASE SETUP
-- ============================================================================
-- Purpose: One-time setup for all database tables and static data
-- Date: November 9, 2025
--
-- INCLUDES:
--   - All 7 tables (tags, macros, users, sync_logs, confidence, prompts, training)
--   - Static user data (14 users with Slack IDs)
--   - Indexes and views for performance
--   - Helper functions for user resolution
--
-- TIME: ~5 minutes to execute
-- ============================================================================

-- ============================================================================
-- PHASE 1: REFERENCE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: gorgias_users (STATIC - No sync workflow needed)
-- Purpose: Map Gorgias users to Slack IDs for @mentions and assignment
-- Populated: Once with static data below
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON gorgias_users(LOWER(email));

-- ----------------------------------------------------------------------------
-- Table 2: gorgias_tags
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON gorgias_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON gorgias_tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_active ON gorgias_tags(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tags_usage ON gorgias_tags(usage_count DESC);

-- ----------------------------------------------------------------------------
-- Table 3: gorgias_macros
-- Purpose: Store all Gorgias macros for AI recommendations
-- Sync: Daily at 2:15 AM via workflow 0006
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gorgias_macros (
  id BIGSERIAL PRIMARY KEY,
  macro_id INTEGER UNIQUE NOT NULL,
  macro_name TEXT NOT NULL,
  macro_description TEXT,
  macro_content TEXT,
  category TEXT DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  avg_resolution_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_macros_name ON gorgias_macros(macro_name);
CREATE INDEX IF NOT EXISTS idx_macros_category ON gorgias_macros(category);
CREATE INDEX IF NOT EXISTS idx_macros_active ON gorgias_macros(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_macros_usage ON gorgias_macros(usage_count DESC);

-- Full text search
CREATE INDEX IF NOT EXISTS idx_macros_content_search ON gorgias_macros
  USING gin(to_tsvector('english', macro_name || ' ' || COALESCE(macro_description, '') || ' ' || COALESCE(macro_content, '')));

-- ----------------------------------------------------------------------------
-- Table 4: sync_logs
-- Purpose: Track all sync operations (tags, macros)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_added INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  sync_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_workflow ON sync_logs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_sync_timestamp ON sync_logs(sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_logs(status);

-- ============================================================================
-- PHASE 2: TRAINING LOOP TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 5: ai_confidence_scores
-- Purpose: Track AI confidence for every command + user feedback
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_confidence_scores (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  user_message TEXT,
  detected_action TEXT,
  detected_params JSONB,
  confidence_score DECIMAL(3,2),
  alternative_actions JSONB,
  reasoning TEXT,

  -- User feedback
  user_feedback TEXT,
  feedback_user_id TEXT,
  feedback_at TIMESTAMPTZ,

  -- Correction data
  actual_action TEXT,
  actual_params JSONB,
  correction_notes TEXT,

  -- Prompt version tracking
  prompt_version INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_confidence_correlation ON ai_confidence_scores(correlation_id);
CREATE INDEX IF NOT EXISTS idx_confidence_score ON ai_confidence_scores(confidence_score);
CREATE INDEX IF NOT EXISTS idx_confidence_feedback ON ai_confidence_scores(user_feedback);
CREATE INDEX IF NOT EXISTS idx_confidence_action ON ai_confidence_scores(detected_action);
CREATE INDEX IF NOT EXISTS idx_confidence_created ON ai_confidence_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confidence_prompt_version ON ai_confidence_scores(prompt_version);
CREATE INDEX IF NOT EXISTS idx_confidence_low ON ai_confidence_scores(confidence_score) WHERE confidence_score < 0.7;
CREATE INDEX IF NOT EXISTS idx_confidence_incorrect ON ai_confidence_scores(user_feedback) WHERE user_feedback = 'incorrect';

-- ----------------------------------------------------------------------------
-- Table 6: prompt_versions
-- Purpose: Store different prompt versions for A/B testing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_versions (
  id BIGSERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  changes_description TEXT,

  -- Activation & testing
  is_active BOOLEAN DEFAULT false,
  traffic_percentage INTEGER DEFAULT 0,

  -- Performance metrics
  accuracy_rate DECIMAL(5,2),
  avg_confidence DECIMAL(3,2),
  total_executions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,

  -- Lifecycle
  test_started_at TIMESTAMPTZ,
  test_ended_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'training_loop',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prompt_version ON prompt_versions(version DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_accuracy ON prompt_versions(accuracy_rate DESC);

-- ----------------------------------------------------------------------------
-- Table 7: prompt_training_log
-- Purpose: Log weekly training loop analysis results
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_training_log (
  id BIGSERIAL PRIMARY KEY,
  analysis_date DATE NOT NULL,
  analysis_period TEXT,

  -- Metrics
  total_commands INTEGER,
  low_confidence_count INTEGER,
  incorrect_action_count INTEGER,
  incorrect_params_count INTEGER,
  avg_confidence DECIMAL(3,2),
  accuracy_rate DECIMAL(5,2),

  -- Analysis results
  top_confusion_patterns JSONB,
  suggested_prompt_changes TEXT,

  -- New prompt created
  new_prompt_version INTEGER REFERENCES prompt_versions(version),

  -- Post-deployment metrics
  improvement_score DECIMAL(3,2),
  deployed BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_date ON prompt_training_log(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_version ON prompt_training_log(new_prompt_version);

-- ============================================================================
-- POPULATE STATIC USER DATA
-- ============================================================================

INSERT INTO gorgias_users (
  gorgias_user_id,
  email,
  full_name,
  first_name,
  last_name,
  role,
  slack_user_id,
  slack_display_name,
  is_active,
  is_bot
) VALUES
  -- Account Owner
  (412219254, 'robert@ironside.gg', 'Robert Apice', 'Robert', 'Apice', 'account_owner', 'U8NQJMH0D', 'Bobby', true, false),

  -- Admin Users (Active Team)
  (843460870, 'ay17yousaf@gmail.com', 'Ayub', 'Ayub', NULL, 'admin', 'U09BSMA8U75', 'Ayub', true, false),
  (427601949, 'collin@ironside.gg', 'Collin Bailey', 'Collin', 'Bailey', 'admin', 'U8NC9D5AM', 'Collin', true, false),
  (453011007, 'domenic@ironsidecomputers.com', 'Domenic Apice', 'Domenic', 'Apice', 'admin', 'U8N13TMEC', 'Domenic', true, false),
  (425921651, 'mackenzie@ironsidecomputers.com', 'Mackenzie Zerkel', 'Mackenzie', 'Zerkel', 'admin', 'U067B04SKRP', 'Mackenzie', true, false),
  (425949203, 'spencer@ironsidecomputers.com', 'Spencer James', 'Spencer', 'James', 'admin', 'U068AHB0Z8X', 'Spencer', true, false),

  -- Lead Users (Active Team)
  (449790477, 'gabriel@ironside.gg', 'Gabe Apice', 'Gabe', 'Apice', 'lead', 'U8NT9KABC', 'Gabe', true, false),

  -- Contractors (Inactive - not shown in bot suggestions)
  (740849636, 'tineabraham973@gmail.com', 'Tine Abraham', 'Tine', 'Abraham', 'contractor', NULL, NULL, false, false),
  (489866237, 'zachary.kellogg@digtlhaus.com', 'DH Zachary Kellogg', 'Zachary', 'Kellogg', 'contractor', NULL, NULL, false, false),
  (846656805, 'zruland94@gmail.com', 'Zach Ruland', 'Zach', 'Ruland', 'contractor', 'U8QGQ61DL', 'Zach', false, false),

  -- Bots (excluded from active assignment)
  (731893763, 'bot@658d6f54fbff9b7c6f2d0321', 'AI Agent Bot', 'AI', 'Agent', 'bot', NULL, 'Bot', false, true),
  (412219256, 'nxy04g6jp875zqm2@email.gorgias.com', 'Gorgias Bot', 'Gorgias', 'Bot', 'bot', NULL, 'GorgiasBot', false, true),
  (427669523, 'bot@6564a1f49e21176a65d5c7aa', 'Gorgias Convert Bot', 'Convert', 'Bot', 'bot', NULL, 'ConvertBot', false, true),
  (814104645, 'bot@64477b74ef4b17779400138d', 'Gorgias Help Center Bot', 'HelpCenter', 'Bot', 'bot', NULL, 'HelpBot', false, true),
  (423569566, 'bot@6489dab5477d0a11fc74aa2f', 'Gorgias Helpdesk Bot', 'Helpdesk', 'Bot', 'bot', NULL, 'HelpdeskBot', false, true),
  (853571914, 'bot@68c9cf425472a3175a148eb7', 'Gorgias Helpdesk-Bot', 'Helpdesk', 'Bot', 'bot', NULL, 'Helpdesk2', false, true)

ON CONFLICT (gorgias_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  slack_user_id = EXCLUDED.slack_user_id,
  slack_display_name = EXCLUDED.slack_display_name,
  is_active = EXCLUDED.is_active,
  is_bot = EXCLUDED.is_bot,
  updated_at = NOW();

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- Daily confidence stats
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

-- Action accuracy view
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

-- Confusion patterns view
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

-- Prompt version comparison view
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

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Find user by name (flexible matching)
CREATE OR REPLACE FUNCTION find_user_by_name(search_name TEXT)
RETURNS TABLE (
  gorgias_user_id INTEGER,
  full_name TEXT,
  email TEXT,
  slack_user_id TEXT,
  slack_display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gu.gorgias_user_id,
    gu.full_name,
    gu.email,
    gu.slack_user_id,
    gu.slack_display_name
  FROM gorgias_users gu
  WHERE
    gu.is_active = true
    AND gu.is_bot = false
    AND (
      LOWER(gu.first_name) = LOWER(search_name)
      OR LOWER(gu.last_name) = LOWER(search_name)
      OR LOWER(gu.slack_display_name) = LOWER(search_name)
      OR LOWER(gu.full_name) LIKE '%' || LOWER(search_name) || '%'
    )
  ORDER BY
    CASE WHEN LOWER(gu.first_name) = LOWER(search_name) THEN 1
         WHEN LOWER(gu.slack_display_name) = LOWER(search_name) THEN 2
         WHEN LOWER(gu.last_name) = LOWER(search_name) THEN 3
         ELSE 4
    END
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Insert default prompt version
INSERT INTO prompt_versions (version, system_prompt, is_active, traffic_percentage, created_by)
VALUES (
  1,
  'You are a Gorgias ticket management assistant. (This will be updated with your actual prompt)',
  true,
  100,
  'initial_setup'
) ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON daily_confidence_stats TO anon;
GRANT SELECT ON action_accuracy TO anon;
GRANT SELECT ON confusion_patterns TO anon;
GRANT SELECT ON prompt_version_comparison TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables created
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN (
  'gorgias_users',
  'gorgias_tags',
  'gorgias_macros',
  'sync_logs',
  'ai_confidence_scores',
  'prompt_versions',
  'prompt_training_log'
)
ORDER BY tablename;

-- Verify users populated
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE slack_user_id IS NOT NULL) as with_slack_id,
  COUNT(*) FILTER (WHERE is_bot = false) as human_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users
FROM gorgias_users;

-- Show all users with Slack mapping status
SELECT
  full_name,
  email,
  role,
  slack_display_name,
  CASE
    WHEN slack_user_id IS NOT NULL THEN '✅ Mapped'
    ELSE '⚠️  No Slack ID'
  END as slack_status
FROM gorgias_users
WHERE is_bot = false
ORDER BY full_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ V23 ENHANCEMENT DATABASE SETUP COMPLETE                  ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Created Tables:                                             ║';
  RAISE NOTICE '║    • gorgias_users (18 users with Slack IDs)                 ║';
  RAISE NOTICE '║    • gorgias_tags (ready for sync)                           ║';
  RAISE NOTICE '║    • gorgias_macros (ready for sync)                         ║';
  RAISE NOTICE '║    • sync_logs (tracking)                                    ║';
  RAISE NOTICE '║    • ai_confidence_scores (training loop)                    ║';
  RAISE NOTICE '║    • prompt_versions (A/B testing)                           ║';
  RAISE NOTICE '║    • prompt_training_log (analysis)                          ║';
  RAISE NOTICE '║                                                              ║';
  RAISE NOTICE '║  Next Steps:                                                 ║';
  RAISE NOTICE '║    1. Import Tags Sync workflow (0005)                       ║';
  RAISE NOTICE '║    2. Import Macros Sync workflow (0006)                     ║';
  RAISE NOTICE '║    3. Update main workflow (see code snippets)               ║';
  RAISE NOTICE '║    4. Import Feedback Handler (0007)                         ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
END $$;

-- ============================================================================
-- END OF SETUP
-- ============================================================================
