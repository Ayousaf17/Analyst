-- ============================================================================
-- GORGIAS USERS REFERENCE TABLE - COMPLETE MIGRATION
-- ============================================================================
-- Purpose: Map user names, nicknames, and Slack IDs to Gorgias emails
-- Created: 2025-11-07
-- Total Users: 14 (13 human users + 1 bot)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- STEP 1: Create Table
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gorgias_users (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Gorgias Data
  gorgias_user_id INTEGER UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,  -- 'admin', 'lead', 'agent', 'bot', 'account_owner', 'basic'
  
  -- Slack Data (to be populated)
  slack_user_id VARCHAR(50) UNIQUE,
  slack_display_name VARCHAR(255),
  
  -- Name Variations (for fuzzy matching)
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  nickname VARCHAR(100),  -- Common alternative names
  
  -- Email Domain (for validation)
  email_domain VARCHAR(100) GENERATED ALWAYS AS (
    SUBSTRING(email FROM POSITION('@' IN email) + 1)
  ) STORED,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_bot BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  
  -- Notes
  notes TEXT
);

-- ────────────────────────────────────────────────────────────────────────
-- STEP 2: Create Indexes for Fast Lookups
-- ────────────────────────────────────────────────────────────────────────

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_gorgias_users_email 
  ON gorgias_users(email);

CREATE INDEX IF NOT EXISTS idx_gorgias_users_slack_id 
  ON gorgias_users(slack_user_id);

-- Name matching indexes (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_gorgias_users_first_name 
  ON gorgias_users(LOWER(first_name));

CREATE INDEX IF NOT EXISTS idx_gorgias_users_last_name 
  ON gorgias_users(LOWER(last_name));

CREATE INDEX IF NOT EXISTS idx_gorgias_users_nickname 
  ON gorgias_users(LOWER(nickname));

-- Full-text search for flexible name matching
CREATE INDEX IF NOT EXISTS idx_gorgias_users_full_name_fts 
  ON gorgias_users USING gin(to_tsvector('english', full_name));

-- Active users only (common filter)
CREATE INDEX IF NOT EXISTS idx_gorgias_users_active 
  ON gorgias_users(is_active) WHERE is_active = true;

-- ────────────────────────────────────────────────────────────────────────
-- STEP 3: Insert All Users (From Screenshots)
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO gorgias_users (
  gorgias_user_id,
  full_name,
  email,
  role,
  first_name,
  last_name,
  nickname,
  is_active,
  is_bot,
  notes
) VALUES
  -- ══════════════════════════════════════════════════════════════════════
  -- ADMIN USERS
  -- ══════════════════════════════════════════════════════════════════════
  (
    1,
    'Ayub',
    'ay17yousaf@gmail.com',
    'admin',
    'Ayub',
    NULL,
    NULL,
    true,
    false,
    'Owner/Founder'
  ),
  (
    3,
    'Collin Bailey',
    'collin@ironside.gg',
    'admin',
    'Collin',
    'Bailey',
    'Bailey',  -- Can be referenced as "bailey"
    true,
    false,
    'Admin - Uses @ironside.gg domain'
  ),
  (
    4,
    'Domenic Apice',
    'domenic@ironsidecomputers.com',
    'admin',
    'Domenic',
    'Apice',
    'Dom',  -- Common nickname
    true,
    false,
    'Admin - Uses @ironsidecomputers.com domain'
  ),
  (
    6,
    'Mackenzie Zerkel',
    'mackenzie@ironsidecomputers.com',
    'admin',
    'Mackenzie',
    'Zerkel',
    'Kenzie',  -- Common nickname
    true,
    false,
    'Admin'
  ),
  (
    7,
    'RAM',
    'ram@digitlhaus.com',
    'admin',
    'RAM',
    NULL,
    NULL,
    true,
    false,
    'Admin - Digitlhaus (external agency?)'
  ),
  (
    8,
    'Robert',
    'robert@ironsidecomputers.com',
    'admin',
    'Robert',
    NULL,
    'Rob',  -- Common nickname
    true,
    false,
    'Admin - Different from Robert Apice'
  ),
  (
    11,
    'Spencer James',
    'spencer@ironsidecomputers.com',
    'admin',
    'Spencer',
    'James',
    NULL,
    true,
    false,
    'Admin'
  ),
  (
    12,
    'Tine Abraham',
    'tineabraham973@gmail.com',
    'admin',
    'Tine',
    'Abraham',
    NULL,
    true,
    false,
    'Admin'
  ),
  (
    13,
    'DH Zachary Kellogg',
    'zachary.kellogg@digitlhaus.com',
    'admin',
    'Zachary',
    'Kellogg',
    'Zach',  -- Common nickname
    true,
    false,
    'Admin - Digitlhaus (DH prefix indicates agency)'
  ),
  
  -- ══════════════════════════════════════════════════════════════════════
  -- LEAD USERS
  -- ══════════════════════════════════════════════════════════════════════
  (
    5,
    'Gabe Apice',
    'gabriel@ironside.gg',
    'lead',
    'Gabe',
    'Apice',
    'Gabriel',  -- Full name as nickname
    true,
    false,
    'Lead - Note: Email uses "gabriel" but goes by "Gabe"'
  ),
  (
    9,
    'RMA Department',
    'rma.ironside@gmail.com',
    'lead',
    'RMA',
    'Department',
    'RMA',
    true,
    false,
    'Shared account for RMA team'
  ),
  
  -- ══════════════════════════════════════════════════════════════════════
  -- ACCOUNT OWNER
  -- ══════════════════════════════════════════════════════════════════════
  (
    10,
    'Robert Apice',
    'robert@ironside.gg',
    'account_owner',
    'Robert',
    'Apice',
    'Rob',  -- Common nickname
    true,
    false,
    'Account Owner - Founder/CEO? Uses @ironside.gg domain'
  ),
  
  -- ══════════════════════════════════════════════════════════════════════
  -- BASIC USERS
  -- ══════════════════════════════════════════════════════════════════════
  (
    14,
    'Zach Ruland',
    'zruland94@gmail.com',
    'basic',
    'Zach',
    'Ruland',
    'Zachary',  -- Full name as nickname
    true,
    false,
    'Basic user'
  ),
  
  -- ══════════════════════════════════════════════════════════════════════
  -- BOT USERS
  -- ══════════════════════════════════════════════════════════════════════
  (
    2,
    'AI Agent Bot',
    'bot@658d6f54fbff9b7c6f2d0321',
    'bot',
    'AI',
    'Agent',
    'Bot',
    true,
    true,
    'Automated bot account - Do not assign tickets to this user'
  )

ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  nickname = EXCLUDED.nickname,
  is_active = EXCLUDED.is_active,
  is_bot = EXCLUDED.is_bot,
  updated_at = NOW();

-- ────────────────────────────────────────────────────────────────────────
-- STEP 4: Create Update Trigger (Auto-update updated_at)
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_gorgias_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gorgias_users_updated_at
  BEFORE UPDATE ON gorgias_users
  FOR EACH ROW
  EXECUTE FUNCTION update_gorgias_users_updated_at();

-- ────────────────────────────────────────────────────────────────────────
-- STEP 5: Helper Functions
-- ────────────────────────────────────────────────────────────────────────

-- Function: Find user by any name variation (flexible matching)
CREATE OR REPLACE FUNCTION find_user_by_name(search_name TEXT)
RETURNS TABLE (
  id INTEGER,
  full_name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gu.id,
    gu.full_name,
    gu.email,
    gu.role
  FROM gorgias_users gu
  WHERE 
    gu.is_active = true
    AND gu.is_bot = false
    AND (
      LOWER(gu.first_name) = LOWER(search_name)
      OR LOWER(gu.last_name) = LOWER(search_name)
      OR LOWER(gu.nickname) = LOWER(search_name)
      OR LOWER(gu.full_name) LIKE '%' || LOWER(search_name) || '%'
    )
  ORDER BY 
    -- Prefer exact first name match
    CASE WHEN LOWER(gu.first_name) = LOWER(search_name) THEN 1
         WHEN LOWER(gu.nickname) = LOWER(search_name) THEN 2
         WHEN LOWER(gu.last_name) = LOWER(search_name) THEN 3
         ELSE 4
    END
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────
-- STEP 6: Validation Queries (Run after migration)
-- ────────────────────────────────────────────────────────────────────────

-- Verify all users inserted
SELECT COUNT(*) as total_users FROM gorgias_users;
-- Expected: 14

-- Check domain distribution
SELECT 
  email_domain,
  COUNT(*) as user_count
FROM gorgias_users
WHERE is_bot = false
GROUP BY email_domain
ORDER BY user_count DESC;
-- Expected:
-- ironsidecomputers.com: 5
-- ironside.gg: 3
-- gmail.com: 3
-- digitlhaus.com: 2

-- Check role distribution
SELECT 
  role,
  COUNT(*) as count
FROM gorgias_users
GROUP BY role
ORDER BY count DESC;
-- Expected:
-- admin: 9
-- lead: 2
-- account_owner: 1
-- basic: 1
-- bot: 1

-- Test name resolution function
SELECT * FROM find_user_by_name('collin');
-- Expected: Collin Bailey

SELECT * FROM find_user_by_name('bailey');
-- Expected: Collin Bailey (via nickname)

SELECT * FROM find_user_by_name('gabe');
-- Expected: Gabe Apice

SELECT * FROM find_user_by_name('gabriel');
-- Expected: Gabe Apice (via nickname)

SELECT * FROM find_user_by_name('spencer');
-- Expected: Spencer James

-- ────────────────────────────────────────────────────────────────────────
-- STEP 7: Critical Notes & Edge Cases
-- ────────────────────────────────────────────────────────────────────────

/*
IMPORTANT OBSERVATIONS FROM YOUR DATA:

1. DOMAIN VARIATIONS:
   - @ironside.gg (gaming/esports brand?)
   - @ironsidecomputers.com (main company domain)
   - @digitlhaus.com (external agency - RAM, Zachary)
   - @gmail.com (personal emails for some users)

2. NAME CONFLICTS:
   - TWO "Robert" users:
     * Robert (robert@ironsidecomputers.com) - Admin
     * Robert Apice (robert@ironside.gg) - Account Owner
   - Solution: Use full name or email to disambiguate

3. TWO "Zach" users:
   - Zachary Kellogg (zachary.kellogg@digitlhaus.com)
   - Zach Ruland (zruland94@gmail.com)
   - Solution: Use last name or full email

4. SPECIAL ACCOUNTS:
   - "AI Agent Bot" - Automated, should be excluded from assignment
   - "RMA Department" - Shared account, not a person

5. NICKNAME MAPPINGS:
   - "Gabe" → gabriel@ironside.gg (email uses full name)
   - "Bailey" → Collin Bailey (can reference by last name)
   - "Dom" → Domenic Apice
   - "Kenzie" → Mackenzie Zerkel

6. EXTERNAL USERS:
   - RAM and Zachary Kellogg use @digitlhaus.com
   - Might be agency/contractor accounts

RECOMMENDATIONS:
- When "robert" is mentioned, prefer Account Owner (Robert Apice)
- When "zach" is mentioned, check context for disambiguation
- Exclude bot account from assignee suggestions
- RMA Department can be assigned tickets (shared queue)
*/

-- ────────────────────────────────────────────────────────────────────────
-- STEP 8: Quick Reference - Name Resolution Cheat Sheet
-- ────────────────────────────────────────────────────────────────────────

/*
QUICK LOOKUP TABLE (for human reference):

First Name    | Full Name           | Email                             | Notes
--------------+---------------------+-----------------------------------+------------------
ayub          | Ayub                | ay17yousaf@gmail.com              | Owner
collin        | Collin Bailey       | collin@ironside.gg                | 
bailey        | Collin Bailey       | collin@ironside.gg                | Via last name
domenic       | Domenic Apice       | domenic@ironsidecomputers.com     |
dom           | Domenic Apice       | domenic@ironsidecomputers.com     | Nickname
gabe          | Gabe Apice          | gabriel@ironside.gg               | Email = gabriel!
gabriel       | Gabe Apice          | gabriel@ironside.gg               | Full name
mackenzie     | Mackenzie Zerkel    | mackenzie@ironsidecomputers.com   |
kenzie        | Mackenzie Zerkel    | mackenzie@ironsidecomputers.com   | Nickname
ram           | RAM                 | ram@digitlhaus.com                | All caps
robert        | Robert Apice        | robert@ironside.gg                | Account owner
rob           | Robert Apice        | robert@ironside.gg                | Nickname
robert        | Robert              | robert@ironsidecomputers.com      | Different Robert!
spencer       | Spencer James       | spencer@ironsidecomputers.com     |
tine          | Tine Abraham        | tineabraham973@gmail.com          |
zachary       | DH Zachary Kellogg  | zachary.kellogg@digitlhaus.com    | External
zach          | DH Zachary Kellogg  | zachary.kellogg@digitlhaus.com    | Nickname
zach          | Zach Ruland         | zruland94@gmail.com               | Conflict!
rma           | RMA Department      | rma.ironside@gmail.com            | Shared account

CONFLICT RESOLUTION:
- "robert" without context → Prefer Robert Apice (Account Owner)
- "zach" without context → Prefer Zachary Kellogg (more senior role)
*/

-- ════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ════════════════════════════════════════════════════════════════════════

COMMIT;
