-- ============================================================================
-- USER RESOLUTION TESTING & VALIDATION QUERIES
-- ============================================================================
-- Purpose: Test and validate user resolution system after setup
-- Run these after: 1) Migration, 2) Slack ID sync
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- TEST 1: Verify All Users Imported
-- ────────────────────────────────────────────────────────────────────────

SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN is_bot = false THEN 1 END) as human_users,
  COUNT(CASE WHEN is_bot = true THEN 1 END) as bot_users,
  COUNT(CASE WHEN slack_user_id IS NOT NULL THEN 1 END) as users_with_slack_id,
  COUNT(CASE WHEN slack_user_id IS NULL AND is_bot = false THEN 1 END) as missing_slack_id
FROM gorgias_users;

/*
Expected Output:
total_users | human_users | bot_users | users_with_slack_id | missing_slack_id
------------+-------------+-----------+---------------------+------------------
         14 |          13 |         1 |                   ? |                ?

After Slack sync:
- users_with_slack_id should be 13 (all human users)
- missing_slack_id should be 0
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEST 2: Domain Distribution Check
-- ────────────────────────────────────────────────────────────────────────

SELECT 
  email_domain,
  COUNT(*) as user_count,
  STRING_AGG(full_name, ', ' ORDER BY full_name) as users
FROM gorgias_users
WHERE is_bot = false
GROUP BY email_domain
ORDER BY user_count DESC;

/*
Expected Output:
email_domain           | user_count | users
-----------------------+------------+----------------------------------------
ironsidecomputers.com  |          5 | Domenic Apice, Mackenzie Zerkel, ...
ironside.gg            |          3 | Collin Bailey, Gabe Apice, Robert Apice
gmail.com              |          3 | Ayub, Tine Abraham, Zach Ruland
digitlhaus.com         |          2 | DH Zachary Kellogg, RAM
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEST 3: Name Resolution - First Names
-- ────────────────────────────────────────────────────────────────────────

-- Test: collin
SELECT * FROM find_user_by_name('collin');
-- Expected: Collin Bailey (collin@ironside.gg)

-- Test: gabe
SELECT * FROM find_user_by_name('gabe');
-- Expected: Gabe Apice (gabriel@ironside.gg)

-- Test: spencer
SELECT * FROM find_user_by_name('spencer');
-- Expected: Spencer James (spencer@ironsidecomputers.com)

-- Test: domenic
SELECT * FROM find_user_by_name('domenic');
-- Expected: Domenic Apice (domenic@ironsidecomputers.com)

-- Test: mackenzie
SELECT * FROM find_user_by_name('mackenzie');
-- Expected: Mackenzie Zerkel (mackenzie@ironsidecomputers.com)

-- ────────────────────────────────────────────────────────────────────────
-- TEST 4: Name Resolution - Nicknames
-- ────────────────────────────────────────────────────────────────────────

-- Test: bailey (last name as nickname)
SELECT * FROM find_user_by_name('bailey');
-- Expected: Collin Bailey (collin@ironside.gg)

-- Test: gabriel (full name for Gabe)
SELECT * FROM find_user_by_name('gabriel');
-- Expected: Gabe Apice (gabriel@ironside.gg)

-- Test: dom (nickname for Domenic)
SELECT * FROM find_user_by_name('dom');
-- Expected: Domenic Apice (domenic@ironsidecomputers.com)

-- Test: kenzie (nickname for Mackenzie)
SELECT * FROM find_user_by_name('kenzie');
-- Expected: Mackenzie Zerkel (mackenzie@ironsidecomputers.com)

-- Test: rob (nickname for Robert)
SELECT * FROM find_user_by_name('rob');
-- Expected: Robert Apice (robert@ironside.gg) - prefers Account Owner

-- Test: zach (ambiguous - two Zachs!)
SELECT * FROM find_user_by_name('zach');
-- Expected: Should return BOTH Zachary Kellogg and Zach Ruland

-- ────────────────────────────────────────────────────────────────────────
-- TEST 5: Slack ID Resolution (After Sync)
-- ────────────────────────────────────────────────────────────────────────

-- Test: Find user by Slack ID
SELECT 
  full_name,
  email,
  slack_display_name,
  role
FROM gorgias_users
WHERE slack_user_id = 'U12345ABC';  -- Replace with actual Slack ID
-- Expected: Should return the matching user

-- Test: All users with Slack IDs
SELECT 
  full_name,
  email,
  slack_user_id,
  slack_display_name,
  CASE 
    WHEN last_synced_at IS NULL THEN 'Never synced'
    WHEN last_synced_at < NOW() - INTERVAL '7 days' THEN 'Stale (>7 days)'
    ELSE 'Recent'
  END as sync_status
FROM gorgias_users
WHERE is_bot = false
ORDER BY full_name;

/*
Expected Output (after Slack sync):
full_name          | email                  | slack_user_id | sync_status
-------------------+------------------------+---------------+-------------
Ayub               | ay17yousaf@...         | U12345ABC     | Recent
Collin Bailey      | collin@ironside.gg     | U23456BCD     | Recent
...
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEST 6: Ambiguous Name Resolution
-- ────────────────────────────────────────────────────────────────────────

-- Test: robert (conflict - two Roberts!)
SELECT 
  full_name,
  email,
  role,
  CASE 
    WHEN role = 'account_owner' THEN 1
    WHEN role = 'admin' THEN 2
    ELSE 3
  END as priority_order
FROM gorgias_users
WHERE LOWER(first_name) = 'robert'
ORDER BY priority_order;

/*
Expected Output:
full_name     | email                         | role           | priority
--------------+-------------------------------+----------------+----------
Robert Apice  | robert@ironside.gg            | account_owner  |        1  ← Preferred
Robert        | robert@ironsidecomputers.com  | admin          |        2

Resolution Strategy: When ambiguous, prefer account_owner > admin > other roles
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEST 7: Case-Insensitive Matching
-- ────────────────────────────────────────────────────────────────────────

-- All these should return Collin Bailey
SELECT * FROM find_user_by_name('COLLIN');
SELECT * FROM find_user_by_name('Collin');
SELECT * FROM find_user_by_name('collin');
SELECT * FROM find_user_by_name('CoLLiN');

-- ────────────────────────────────────────────────────────────────────────
-- TEST 8: Fuzzy Matching (Typo Tolerance)
-- ────────────────────────────────────────────────────────────────────────

-- Enable pg_trgm extension first (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Test: collin with typo
SELECT 
  full_name,
  email,
  similarity(first_name, 'colin') as similarity_score
FROM gorgias_users
WHERE similarity(first_name, 'colin') > 0.5
ORDER BY similarity_score DESC;

/*
Expected Output:
full_name     | email              | similarity_score
--------------+--------------------+------------------
Collin Bailey | collin@ironside.gg |             0.83  ← Close match!

Note: similarity() returns 0.0 to 1.0 (1.0 = exact match)
Threshold of 0.5 means "somewhat similar"
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEST 9: Full Audit of User Resolution Capabilities
-- ────────────────────────────────────────────────────────────────────────

WITH user_variations AS (
  SELECT 
    id,
    full_name,
    email,
    email_domain,
    first_name,
    last_name,
    nickname,
    slack_user_id,
    role,
    -- Count searchable variations per user
    CASE WHEN first_name IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN last_name IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN nickname IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN slack_user_id IS NOT NULL THEN 1 ELSE 0 END as searchable_fields
  FROM gorgias_users
  WHERE is_bot = false
)
SELECT 
  full_name,
  email,
  CONCAT(
    first_name,
    CASE WHEN last_name IS NOT NULL THEN ', ' || last_name ELSE '' END,
    CASE WHEN nickname IS NOT NULL THEN ', ' || nickname ELSE '' END
  ) as searchable_as,
  CASE 
    WHEN slack_user_id IS NOT NULL THEN '✅ Slack ID'
    ELSE '❌ No Slack ID'
  END as slack_status,
  searchable_fields,
  CASE 
    WHEN searchable_fields >= 3 THEN '✅ Excellent'
    WHEN searchable_fields = 2 THEN '⚠️  Good'
    ELSE '❌ Limited'
  END as searchability
FROM user_variations
ORDER BY searchable_fields DESC, full_name;

/*
Expected Output:
full_name          | searchable_as         | slack_status   | fields | searchability
-------------------+-----------------------+----------------+--------+---------------
Collin Bailey      | Collin, Bailey, Bailey| ✅ Slack ID    |      4 | ✅ Excellent
Gabe Apice         | Gabe, Apice, Gabriel  | ✅ Slack ID    |      4 | ✅ Excellent
Domenic Apice      | Domenic, Apice, Dom   | ✅ Slack ID    |      4 | ✅ Excellent
...
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEST 10: Simulate Real Workflow Queries
-- ────────────────────────────────────────────────────────────────────────

-- Scenario 1: "show me collin's urgent tickets"
-- Step 1: Extract name "collin"
-- Step 2: Lookup
SELECT email FROM gorgias_users WHERE LOWER(first_name) = 'collin';
-- Result: collin@ironside.gg ✅

-- Scenario 2: "@collin's tickets" (Slack mention)
-- Step 1: Extract Slack ID from <@U23456BCD>
-- Step 2: Lookup
SELECT email FROM gorgias_users WHERE slack_user_id = 'U23456BCD';
-- Result: collin@ironside.gg ✅

-- Scenario 3: "assign to bailey"
-- Step 1: Extract name "bailey"
-- Step 2: Lookup (nickname/last name)
SELECT email FROM gorgias_users WHERE LOWER(nickname) = 'bailey' OR LOWER(last_name) = 'bailey';
-- Result: collin@ironside.gg ✅

-- Scenario 4: "gabe's billing issues"
-- Step 1: Extract name "gabe"
-- Step 2: Lookup
SELECT email FROM gorgias_users WHERE LOWER(first_name) = 'gabe';
-- Result: gabriel@ironside.gg ✅ (note email uses "gabriel")

-- Scenario 5: "spencer and domenic's tickets"
-- Step 1: Extract names "spencer", "domenic"
-- Step 2: Lookup both
SELECT email FROM gorgias_users WHERE LOWER(first_name) IN ('spencer', 'domenic');
-- Result: spencer@ironsidecomputers.com, domenic@ironsidecomputers.com ✅

-- ────────────────────────────────────────────────────────────────────────
-- TEST 11: Performance Testing
-- ────────────────────────────────────────────────────────────────────────

-- Test index efficiency
EXPLAIN ANALYZE
SELECT * FROM gorgias_users WHERE LOWER(first_name) = 'collin';
-- Should use idx_gorgias_users_first_name (Index Scan)
-- Expected execution time: <1ms

EXPLAIN ANALYZE
SELECT * FROM gorgias_users WHERE slack_user_id = 'U12345ABC';
-- Should use idx_gorgias_users_slack_id (Index Scan)
-- Expected execution time: <1ms

-- ────────────────────────────────────────────────────────────────────────
-- TEST 12: Data Quality Checks
-- ────────────────────────────────────────────────────────────────────────

-- Check for missing critical data
SELECT 
  'Missing first_name' as issue,
  COUNT(*) as count,
  STRING_AGG(email, ', ') as affected_users
FROM gorgias_users
WHERE first_name IS NULL AND is_bot = false
UNION ALL
SELECT 
  'Missing email_domain' as issue,
  COUNT(*) as count,
  STRING_AGG(email, ', ')
FROM gorgias_users
WHERE email_domain IS NULL
UNION ALL
SELECT 
  'Duplicate emails' as issue,
  COUNT(*) as count,
  email
FROM gorgias_users
GROUP BY email
HAVING COUNT(*) > 1;

-- Expected: All counts should be 0 (no issues)

-- ════════════════════════════════════════════════════════════════════════
-- INTEGRATION TEST CHECKLIST
-- ════════════════════════════════════════════════════════════════════════

/*
✅ Checklist for Production Readiness:

DATABASE SETUP:
[ ] gorgias_users table created
[ ] All 14 users inserted
[ ] Indexes created and working
[ ] find_user_by_name() function works
[ ] Triggers for updated_at working

SLACK INTEGRATION:
[ ] Slack sync workflow created
[ ] Initial sync completed successfully
[ ] All active users have slack_user_id populated
[ ] Test @mention resolution works

N8N WORKFLOW INTEGRATION:
[ ] 3 user resolution nodes added after Parse Slack
[ ] Nodes connected properly
[ ] Test with real Slack messages
[ ] Verify user_text_enhanced contains emails

ACCURACY TESTING:
[ ] Test 10+ name variations (collin, bailey, gabe, etc.)
[ ] Test Slack @mentions
[ ] Test ambiguous cases (robert, zach)
[ ] Test with typos using fuzzy matching
[ ] Test case-insensitive matching

PERFORMANCE TESTING:
[ ] Lookup queries execute in <100ms
[ ] No full table scans (check EXPLAIN ANALYZE)
[ ] n8n workflow adds <150ms total latency

MONITORING:
[ ] Track user resolution success rate in logs
[ ] Alert on failed resolutions
[ ] Monitor stale Slack IDs (>30 days since sync)

MAINTENANCE:
[ ] Schedule weekly Slack sync job
[ ] Document how to add new users manually
[ ] Create runbook for common issues
*/
