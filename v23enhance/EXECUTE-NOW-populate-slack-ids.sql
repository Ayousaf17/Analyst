-- ============================================================================
-- FINAL PRODUCTION-READY: SLACK ID POPULATION
-- ============================================================================
-- Status: READY TO EXECUTE
-- Coverage: 11/13 users confirmed (85%) + 1 pending Mackenzie ID
-- Last Updated: 2025-01-12
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- SAFETY CHECK: View current state before making changes
-- ────────────────────────────────────────────────────────────────────────

SELECT 
  full_name,
  email,
  slack_user_id,
  slack_display_name,
  CASE 
    WHEN slack_user_id IS NULL THEN '❌ Missing'
    ELSE '✅ Has ID'
  END as status
FROM gorgias_users
WHERE is_bot = false
ORDER BY full_name;

-- ────────────────────────────────────────────────────────────────────────
-- EXECUTE: Populate all confirmed Slack IDs
-- ────────────────────────────────────────────────────────────────────────

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- CORE TEAM (9 users - Original batch)
-- ═══════════════════════════════════════════════════════════════════════

UPDATE gorgias_users SET slack_user_id = 'U8N13TMEC', slack_display_name = 'Domenic', last_synced_at = NOW()
WHERE email = 'domenic@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U8NC9D5AM', slack_display_name = 'Collin', last_synced_at = NOW()
WHERE email = 'collin@ironside.gg';

UPDATE gorgias_users SET slack_user_id = 'U8NT9KABC', slack_display_name = 'Gabe', last_synced_at = NOW()
WHERE email = 'gabriel@ironside.gg';

UPDATE gorgias_users SET slack_user_id = 'U8NQJMH0D', slack_display_name = 'Bobby', last_synced_at = NOW()
WHERE email = 'robert@ironside.gg';

UPDATE gorgias_users SET slack_user_id = 'U8QGQ61DL', slack_display_name = 'Zach', last_synced_at = NOW()
WHERE email = 'zruland94@gmail.com';

UPDATE gorgias_users SET slack_user_id = 'U8N6W777B', slack_display_name = 'Didi', last_synced_at = NOW()
WHERE email = 'alexandra@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U8NM51LLA', slack_display_name = 'Shawn', last_synced_at = NOW()
WHERE email = 'shawn@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U01246F9STX', slack_display_name = 'Riley', last_synced_at = NOW()
WHERE email = 'riley@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U01HCGDJVA5', slack_display_name = 'Mike', last_synced_at = NOW()
WHERE email = 'michael@ironsidecomputers.com';

-- ═══════════════════════════════════════════════════════════════════════
-- NEWLY DISCOVERED (2 users confirmed + 1 pending)
-- ═══════════════════════════════════════════════════════════════════════

UPDATE gorgias_users SET slack_user_id = 'U068AHB0Z8X', slack_display_name = 'Spencer', last_synced_at = NOW()
WHERE email = 'spencer@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U09BSMA8U75', slack_display_name = 'Ayub Yousaf', last_synced_at = NOW()
WHERE email = 'ay17yousaf@gmail.com';

-- 🎉 MACKENZIE ZERKEL - CONFIRMED!
UPDATE gorgias_users SET slack_user_id = 'U067B04SKRP', slack_display_name = 'Mackenzie', last_synced_at = NOW()
WHERE email = 'mackenzie@ironsidecomputers.com';

-- 🎉 TINE ABRAHAM - CONFIRMED!
UPDATE gorgias_users SET slack_user_id = 'U08DCHSCS1X', slack_display_name = 'Tine', last_synced_at = NOW()
WHERE email = 'tineabraham@gmail.com';

COMMIT;

-- ────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Confirm all updates applied successfully
-- ────────────────────────────────────────────────────────────────────────

SELECT 
  '✅ POPULATED' as section,
  full_name,
  email,
  slack_user_id,
  slack_display_name,
  last_synced_at
FROM gorgias_users
WHERE slack_user_id IS NOT NULL 
  AND is_bot = false
ORDER BY full_name;

SELECT 
  '❌ STILL MISSING' as section,
  full_name,
  email,
  'Needs Slack ID' as note
FROM gorgias_users
WHERE slack_user_id IS NULL 
  AND is_bot = false
ORDER BY full_name;

-- ────────────────────────────────────────────────────────────────────────
-- SUMMARY REPORT
-- ────────────────────────────────────────────────────────────────────────

SELECT 
  'Summary' as report,
  COUNT(*) FILTER (WHERE slack_user_id IS NOT NULL) as mapped_count,
  COUNT(*) FILTER (WHERE slack_user_id IS NULL) as unmapped_count,
  COUNT(*) as total_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE slack_user_id IS NOT NULL) / COUNT(*), 1) || '%' as coverage
FROM gorgias_users
WHERE is_bot = false;

-- Expected Results:
-- mapped_count: 13
-- unmapped_count: 0
-- coverage: 100.0% 🎉🎉🎉

-- ════════════════════════════════════════════════════════════════════════
-- ✅ CONFIRMED MAPPINGS - 100% COVERAGE! 🎉🎉🎉
-- ════════════════════════════════════════════════════════════════════════
/*
ALL 13 GORGIAS USERS MAPPED TO SLACK! 🏆

1.  Domenic Apice      → U8N13TMEC
2.  Collin Bailey      → U8NC9D5AM
3.  Gabriel Apice      → U8NT9KABC
4.  Robert Apice       → U8NQJMH0D
5.  Zach Ruland        → U8QGQ61DL
6.  Alexandra Apice    → U8N6W777B
7.  Shawn Holmes       → U8NM51LLA
8.  Riley Holland      → U01246F9STX
9.  Michael Kostecki   → U01HCGDJVA5
10. Spencer James ✨   → U068AHB0Z8X
11. Ayub Yousaf ✨     → U09BSMA8U75
12. Mackenzie Zerkel ✨ → U067B04SKRP
13. Tine Abraham ✨    → U08DCHSCS1X
*/

-- ════════════════════════════════════════════════════════════════════════
-- 🎯 NEXT STEPS - 100% COVERAGE ACHIEVED!
-- ════════════════════════════════════════════════════════════════════════
/*
1. ✅ RUN THIS SCRIPT NOW - Populates ALL 13 users!
2. ✅ Test @mention resolution in Slack
3. ✅ Verify n8n workflow can resolve ALL mentions
4. ✅ Set up weekly sync to catch new team members
5. 🎊 CELEBRATE - You have 100% coverage! 🎊

Every single Gorgias user can now be @mentioned in Slack!
No fallbacks needed - full precision resolution for everyone!
*/
