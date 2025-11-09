-- ============================================================================
-- STATIC GORGIAS USERS TABLE - SIMPLIFIED SETUP
-- ============================================================================
-- Purpose: Create a static user mapping table for "assign to [name]" commands
-- Usage: Manually populate with your team members once
-- Bot will query this table to resolve user names to Gorgias IDs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create gorgias_users table (simplified version)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gorgias_users (
  id BIGSERIAL PRIMARY KEY,

  -- Gorgias information (REQUIRED)
  gorgias_user_id INTEGER UNIQUE NOT NULL,
  gorgias_email TEXT UNIQUE NOT NULL,
  gorgias_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,

  -- Slack information (OPTIONAL - for @mentions)
  slack_user_id TEXT,
  slack_display_name TEXT,

  -- Common nicknames/aliases (helps bot match variations)
  aliases TEXT[], -- e.g., ['spencer', 'spence', 'spencer smith']

  -- Status
  is_active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'agent', -- owner, admin, agent

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_gorgias_id ON gorgias_users(gorgias_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON gorgias_users(LOWER(gorgias_email));
CREATE INDEX IF NOT EXISTS idx_users_name ON gorgias_users(LOWER(gorgias_name));
CREATE INDEX IF NOT EXISTS idx_users_active ON gorgias_users(is_active) WHERE is_active = true;

-- GIN index for searching aliases array
CREATE INDEX IF NOT EXISTS idx_users_aliases ON gorgias_users USING GIN(aliases);

-- Add comments
COMMENT ON TABLE gorgias_users IS 'Static user mapping for resolving names to Gorgias user IDs';
COMMENT ON COLUMN gorgias_users.gorgias_user_id IS 'Gorgias user ID - get from Gorgias API or dashboard';
COMMENT ON COLUMN gorgias_users.aliases IS 'Common nicknames: ["spencer", "spence"] helps bot match variations';

-- ============================================================================
-- INSERT YOUR TEAM MEMBERS HERE
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Get Gorgias user IDs from: https://[your-domain].gorgias.com/settings/users
-- 2. Or use Gorgias API: GET https://[your-domain].gorgias.com/api/users
-- 3. Replace the example data below with your actual team

-- EXAMPLE ENTRIES (DELETE THESE AND ADD YOUR TEAM):

INSERT INTO gorgias_users (
  gorgias_user_id,
  gorgias_email,
  gorgias_name,
  first_name,
  last_name,
  aliases,
  role,
  is_active
) VALUES
  -- Spencer Smith (example)
  (
    12345, -- Gorgias user ID
    'spencer@ironsidecomputers.com',
    'Spencer Smith',
    'Spencer',
    'Smith',
    ARRAY['spencer', 'spence', 'spencer smith']::TEXT[], -- nicknames
    'agent',
    true
  ),

  -- Collin Johnson (example)
  (
    12346,
    'collin@ironsidecomputers.com',
    'Collin Johnson',
    'Collin',
    'Johnson',
    ARRAY['collin', 'col', 'collin johnson']::TEXT[],
    'agent',
    true
  ),

  -- Sarah Williams (example)
  (
    12347,
    'sarah@ironsidecomputers.com',
    'Sarah Williams',
    'Sarah',
    'Williams',
    ARRAY['sarah', 'sarah williams']::TEXT[],
    'admin',
    true
  ),

  -- Alex Chen (example)
  (
    12348,
    'alex@ironsidecomputers.com',
    'Alex Chen',
    'Alex',
    'Chen',
    ARRAY['alex', 'alex chen']::TEXT[],
    'agent',
    true
  )

-- Add more team members following the same pattern
ON CONFLICT (gorgias_user_id) DO UPDATE SET
  gorgias_email = EXCLUDED.gorgias_email,
  gorgias_name = EXCLUDED.gorgias_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  aliases = EXCLUDED.aliases,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- HOW TO GET GORGIAS USER IDS
-- ============================================================================

-- METHOD 1: From Gorgias API
-- curl -X GET "https://ironsidecomputers.gorgias.com/api/users" \
--   -H "Authorization: Basic YOUR_BASE64_CREDENTIALS" \
--   | jq '.[] | {id, email, name: .firstname + " " + .lastname}'

-- METHOD 2: From Gorgias Dashboard
-- 1. Go to: https://[your-domain].gorgias.com/settings/users
-- 2. Click on each user
-- 3. Look at the URL: /settings/users/[USER_ID]
-- 4. That number is the gorgias_user_id

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all active users
SELECT
  gorgias_user_id,
  gorgias_name,
  gorgias_email,
  aliases,
  role
FROM gorgias_users
WHERE is_active = true
ORDER BY gorgias_name;

-- Test user lookup by name (case-insensitive)
SELECT
  gorgias_user_id,
  gorgias_name,
  gorgias_email
FROM gorgias_users
WHERE LOWER(gorgias_name) LIKE LOWER('%spencer%')
  AND is_active = true;

-- Test user lookup by alias
SELECT
  gorgias_user_id,
  gorgias_name,
  gorgias_email
FROM gorgias_users
WHERE 'spencer' = ANY(aliases)
  AND is_active = true;

-- ============================================================================
-- HELPER FUNCTION: Search user by name or alias
-- ============================================================================

CREATE OR REPLACE FUNCTION find_user_by_name(search_term TEXT)
RETURNS TABLE(
  gorgias_user_id INTEGER,
  gorgias_name TEXT,
  gorgias_email TEXT,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gu.gorgias_user_id,
    gu.gorgias_name,
    gu.gorgias_email,
    CASE
      WHEN LOWER(gu.gorgias_name) = LOWER(search_term) THEN 'exact_name'
      WHEN LOWER(gu.first_name) = LOWER(search_term) THEN 'first_name'
      WHEN LOWER(gu.last_name) = LOWER(search_term) THEN 'last_name'
      WHEN LOWER(search_term) = ANY(SELECT LOWER(unnest(gu.aliases))) THEN 'alias'
      WHEN LOWER(gu.gorgias_name) LIKE LOWER('%' || search_term || '%') THEN 'partial_name'
      ELSE 'fuzzy'
    END as match_type
  FROM gorgias_users gu
  WHERE gu.is_active = true
    AND (
      LOWER(gu.gorgias_name) LIKE LOWER('%' || search_term || '%')
      OR LOWER(gu.first_name) = LOWER(search_term)
      OR LOWER(gu.last_name) = LOWER(search_term)
      OR LOWER(search_term) = ANY(SELECT LOWER(unnest(gu.aliases)))
    )
  ORDER BY
    CASE
      WHEN LOWER(gu.gorgias_name) = LOWER(search_term) THEN 1
      WHEN LOWER(gu.first_name) = LOWER(search_term) THEN 2
      WHEN LOWER(search_term) = ANY(SELECT LOWER(unnest(gu.aliases))) THEN 3
      ELSE 4
    END
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Test the helper function
-- SELECT * FROM find_user_by_name('spencer');
-- SELECT * FROM find_user_by_name('spence');
-- SELECT * FROM find_user_by_name('smith');

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Add a new user
-- INSERT INTO gorgias_users (gorgias_user_id, gorgias_email, gorgias_name, first_name, last_name, aliases)
-- VALUES (12349, 'john@ironsidecomputers.com', 'John Doe', 'John', 'Doe', ARRAY['john', 'johndoe']);

-- Update user aliases
-- UPDATE gorgias_users
-- SET aliases = ARRAY['spencer', 'spence', 'spencer smith', 's.smith']
-- WHERE gorgias_user_id = 12345;

-- Deactivate a user (don't delete, just mark inactive)
-- UPDATE gorgias_users SET is_active = false WHERE gorgias_user_id = 12345;

-- Reactivate a user
-- UPDATE gorgias_users SET is_active = true WHERE gorgias_user_id = 12345;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to service role (for n8n/API access)
GRANT SELECT ON gorgias_users TO service_role;
GRANT SELECT ON gorgias_users TO anon;

-- ============================================================================
-- DONE!
-- ============================================================================

-- Next step: Update your main workflow to query this table
-- See: BOT_USER_LOOKUP_CODE.js for the code to add to your workflow
