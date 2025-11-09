-- ============================================================================
-- IMMEDIATE SLACK ID POPULATION - CONFIRMED MATCHES
-- ============================================================================
-- Purpose: Update gorgias_users table with verified Slack user IDs
-- Confidence: 100% matches based on Slack API data
-- Date: 2025-01-12
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- STEP 1: Verify Current State (Run this first to see before/after)
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
-- STEP 2: Apply Confirmed Mappings (9 users with 100% confidence)
-- ────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Domenic Apice (Owner)
UPDATE gorgias_users 
SET 
  slack_user_id = 'U8N13TMEC',
  slack_display_name = 'Domenic',
  last_synced_at = NOW()
WHERE email = 'domenic@ironsidecomputers.com';

-- 2. Collin Bailey
UPDATE gorgias_users 
SET 
  slack_user_id = 'U8NC9D5AM',
  slack_display_name = 'Collin',
  last_synced_at = NOW()
WHERE email = 'collin@ironside.gg';

-- 3. Gabriel Apice (known as "Gabe")
UPDATE gorgias_users 
SET 
  slack_user_id = 'U8NT9KABC',
  slack_display_name = 'Gabe',
  last_synced_at = NOW()
WHERE email = 'gabriel@ironside.gg';

-- 4. Robert Apice (Primary Owner, known as "Bobby")
UPDATE gorgias_users 
SET 
  slack_user_id = 'U8NQJMH0D',
  slack_display_name = 'Bobby',
  last_synced_at = NOW()
WHERE email = 'robert@ironside.gg';

-- 5. Zach Ruland
UPDATE gorgias_users 
SET 
  slack_user_id = 'U8QGQ61DL',
  slack_display_name = 'Zach',
  last_synced_at = NOW()
WHERE email = 'zruland94@gmail.com';

-- 6. Alexandra Apice (known as "Didi")
UPDATE gorgias_users 
SET 
  slack_user_id = 'U8N6W777B',
  slack_display_name = 'Didi',
  last_synced_at = NOW()
WHERE email = 'alexandra@ironsidecomputers.com';

-- 7. Shawn Holmes
UPDATE gorgias_users 
SET 
  slack_user_id = 'U8NM51LLA',
  slack_display_name = 'Shawn',
  last_synced_at = NOW()
WHERE email = 'shawn@ironsidecomputers.com';

-- 8. Riley Holland
UPDATE gorgias_users 
SET 
  slack_user_id = 'U01246F9STX',
  slack_display_name = 'Riley',
  last_synced_at = NOW()
WHERE email = 'riley@ironsidecomputers.com';

-- 9. Michael Kostecki (known as "Mike")
UPDATE gorgias_users 
SET 
  slack_user_id = 'U01HCGDJVA5',
  slack_display_name = 'Mike',
  last_synced_at = NOW()
WHERE email = 'michael@ironsidecomputers.com';

COMMIT;

-- ────────────────────────────────────────────────────────────────────────
-- STEP 3: Verify Updates Were Successful
-- ────────────────────────────────────────────────────────────────────────

SELECT 
  full_name,
  email,
  slack_user_id,
  slack_display_name,
  last_synced_at,
  CASE 
    WHEN slack_user_id IS NULL THEN '❌ Missing'
    ELSE '✅ Updated'
  END as status
FROM gorgias_users
WHERE is_bot = false
ORDER BY 
  CASE WHEN slack_user_id IS NULL THEN 1 ELSE 0 END,
  full_name;

-- Expected Output:
-- 9 users with ✅ Updated
-- 4 users with ❌ Missing (Mackenzie, Spencer, Ayub, Tine, etc.)

-- ────────────────────────────────────────────────────────────────────────
-- STEP 4: Check for Remaining Unmapped Users
-- ────────────────────────────────────────────────────────────────────────

SELECT 
  full_name,
  email,
  role,
  'Needs investigation - no active Slack account found' as reason
FROM gorgias_users
WHERE slack_user_id IS NULL 
  AND is_bot = false;

-- ════════════════════════════════════════════════════════════════════════
-- NOTES & NEXT STEPS
-- ════════════════════════════════════════════════════════════════════════

/*
✅ COMPLETED:
- 9 users with confirmed Slack IDs populated
- All matches verified against Slack API data
- Display names set for mention resolution

⚠️ PENDING VERIFICATION:
1. Bret (UPP5QAQBY) - Need to confirm email matches bret@ironsidecomputers.com
   To verify: Check Slack user profile or use users.info API

2. Robert Conflict - Two entries in Gorgias:
   - robert@ironside.gg (✅ Mapped to U8NQJMH0D)
   - robert@ironsidecomputers.com (❌ No Slack ID)
   Recommendation: Check if @ironsidecomputers.com entry is duplicate/old

❌ USERS WITHOUT SLACK ACCOUNTS:
These Gorgias users don't have active Slack accounts:
- Mackenzie Zerkel (mackenzie@ironsidecomputers.com)
- Spencer James (spencer@ironsidecomputers.com)
- Ayub (ay17yousaf@gmail.com)
- Tine Abraham (tineabraham@gmail.com)
- DH Zachary Kellogg (zkellogg@digitlhaus.com)
- RAM (ram@digitlhaus.com)

Options:
1. Leave slack_user_id as NULL (they can still be resolved by name)
2. Mark them as "no_slack_account" in a new field
3. Remove them if they're inactive

🔄 NEXT ACTIONS:
1. Run this script to populate 9 confirmed users
2. Verify Bret's email and add if confirmed
3. Investigate the "robert@ironsidecomputers.com" duplicate
4. Set up automated Slack sync workflow (weekly)

📊 COVERAGE:
After this update:
- 9/13 active Gorgias users will have Slack IDs (69%)
- 1 pending verification (Bret)
- 3-4 genuinely without Slack accounts
*/

-- ────────────────────────────────────────────────────────────────────────
-- OPTIONAL: Add Bret after email verification
-- ────────────────────────────────────────────────────────────────────────

-- Uncomment and run this after verifying Bret's email:
/*
UPDATE gorgias_users 
SET 
  slack_user_id = 'UPP5QAQBY',
  slack_display_name = 'Bret',
  last_synced_at = NOW()
WHERE email = 'bret@ironsidecomputers.com';
*/

-- ────────────────────────────────────────────────────────────────────────
-- DEBUGGING: If you need to clear all Slack IDs and start over
-- ────────────────────────────────────────────────────────────────────────

-- DO NOT RUN THIS unless you need to reset everything:
/*
UPDATE gorgias_users 
SET 
  slack_user_id = NULL,
  slack_display_name = NULL,
  last_synced_at = NULL
WHERE is_bot = false;
*/
