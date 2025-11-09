# STEP 4: Verification & Testing

## Overview
Comprehensive testing and verification queries to ensure everything works correctly.
**Time Required:** 1 hour
**Prerequisites:** All previous steps completed

---

## TABLE OF CONTENTS
1. [Database Verification](#database-verification)
2. [Sync Verification](#sync-verification)
3. [End-to-End Testing](#end-to-end-testing)
4. [Performance Checks](#performance-checks)
5. [Troubleshooting](#troubleshooting)

---

## Database Verification

### 1. Verify All Tables Exist

```sql
-- Check all 7 tables were created
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
```

**Expected Output:**
```
tablename                | size
-------------------------+-------
ai_confidence_scores     | 8192 bytes
gorgias_macros          | 8192 bytes
gorgias_tags            | 8192 bytes
gorgias_users           | 8192 bytes
prompt_training_log     | 8192 bytes
prompt_versions         | 8192 bytes
sync_logs               | 8192 bytes
```

### 2. Verify Users Table

```sql
-- Check user count and Slack mapping
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE slack_user_id IS NOT NULL) as with_slack_id,
  COUNT(*) FILTER (WHERE is_bot = false) as human_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users
FROM gorgias_users;
```

**Expected Output:**
```
total_users | with_slack_id | human_users | active_users
------------+---------------+-------------+--------------
18          | 10            | 17          | 18
```

### 3. Show All Users with Mapping Status

```sql
-- Detailed user list
SELECT
  full_name,
  email,
  role,
  slack_display_name,
  CASE
    WHEN is_bot THEN '🤖 Bot'
    WHEN slack_user_id IS NOT NULL THEN '✅ Mapped'
    ELSE '⚠️  No Slack ID'
  END as status
FROM gorgias_users
ORDER BY
  CASE WHEN is_bot THEN 2 ELSE 1 END,
  full_name;
```

**Expected Output:** 18 users with appropriate status icons

### 4. Test User Lookup Function

```sql
-- Test finding users by name
SELECT * FROM find_user_by_name('spencer');
-- Should return: Spencer James

SELECT * FROM find_user_by_name('bobby');
-- Should return: Robert Apice (via slack_display_name)

SELECT * FROM find_user_by_name('collin');
-- Should return: Collin Bailey

SELECT * FROM find_user_by_name('mike');
-- Should return: Michael Kostecki (via slack_display_name)

SELECT * FROM find_user_by_name('gabe');
-- Should return: Gabe Apice
```

---

## Sync Verification

### 1. Check Tags Synced

```sql
-- Count tags
SELECT COUNT(*) as tag_count FROM gorgias_tags;
-- Should be > 20

-- Tags by category
SELECT
  category,
  COUNT(*) as count
FROM gorgias_tags
WHERE is_active = true
GROUP BY category
ORDER BY count DESC;
```

**Expected Output:**
```
category    | count
------------+-------
billing     | 8
shipping    | 5
technical   | 4
order       | 3
other       | 10
```

### 2. Check Macros Synced

```sql
-- Count macros
SELECT COUNT(*) as macro_count FROM gorgias_macros;
-- Should be > 10

-- Macros by category
SELECT
  category,
  COUNT(*) as count,
  STRING_AGG(macro_name, ', ') as examples
FROM gorgias_macros
WHERE is_active = true
GROUP BY category;
```

### 3. View Sample Tags

```sql
-- Top 20 most used tags
SELECT
  tag_name,
  category,
  usage_count
FROM gorgias_tags
WHERE is_active = true
ORDER BY usage_count DESC
LIMIT 20;
```

### 4. View Sample Macros

```sql
-- Sample macros with preview
SELECT
  macro_name,
  category,
  LEFT(macro_description, 60) as description,
  LEFT(macro_content, 100) as content_preview
FROM gorgias_macros
WHERE is_active = true
ORDER BY usage_count DESC
LIMIT 10;
```

### 5. Check Sync Logs

```sql
-- Recent sync operations
SELECT
  workflow_name,
  status,
  records_processed,
  records_added,
  records_updated,
  sync_timestamp
FROM sync_logs
ORDER BY sync_timestamp DESC
LIMIT 10;
```

**Expected Output:** At least 2 entries (tags sync + macros sync)

---

## End-to-End Testing

### Test 1: User Assignment Resolution

**Slack Command:**
```
assign ticket 18401 to spencer
```

**Expected Behavior:**
1. Bot queries `gorgias_users` table
2. Finds "spencer" → Spencer James (gorgias_user_id: 11)
3. Calls Gorgias API to assign ticket
4. Responds: "✅ Assigned ticket #18401 to Spencer James"
5. Confidence score logged
6. Feedback buttons appear

**Verify:**
```sql
-- Check confidence was logged
SELECT
  user_message,
  detected_action,
  detected_params,
  confidence_score,
  created_at
FROM ai_confidence_scores
WHERE user_message LIKE '%assign%spencer%'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Test 2: Tag Usage (Existing Tags)

**Slack Command:**
```
tag ticket 18401 as billing issue
```

**Expected Behavior:**
1. Bot queries `gorgias_tags` table
2. Finds "billing-issue" (or similar) in available tags
3. Uses EXISTING tag (doesn't create new)
4. Responds: "✅ Added tag 'billing-issue' to ticket #18401"
5. Confidence score logged

**Verify:**
```sql
-- Check the AI used an existing tag
SELECT
  user_message,
  detected_action,
  detected_params->>'tags' as tags_used,
  confidence_score
FROM ai_confidence_scores
WHERE user_message LIKE '%tag%billing%'
ORDER BY created_at DESC
LIMIT 1;

-- Verify tag exists in our table
SELECT tag_name, category
FROM gorgias_tags
WHERE tag_name ILIKE '%billing%';
```

---

### Test 3: Macro Suggestion

**Slack Command:**
```
what macros do we have for shipping delays?
```

**Expected Behavior:**
1. Bot queries `gorgias_macros` table
2. Filters macros with category='shipping' or containing 'shipping'
3. Lists relevant macros
4. Responds: "📝 Here are shipping-related macros: [list]"

**Verify:**
```sql
-- Check shipping macros exist
SELECT
  macro_name,
  macro_description,
  category
FROM gorgias_macros
WHERE category = 'shipping'
   OR macro_name ILIKE '%shipping%'
   OR macro_description ILIKE '%shipping%';
```

---

### Test 4: Confidence Logging

**Slack Command:**
```
show me urgent tickets
```

**Expected Behavior:**
1. Bot interprets command (action: search_tickets or list_tickets)
2. Returns confidence score (e.g., 0.95)
3. Provides reasoning
4. Logs to database

**Verify:**
```sql
-- Check confidence was logged
SELECT
  user_message,
  detected_action,
  confidence_score,
  reasoning,
  alternative_actions,
  created_at
FROM ai_confidence_scores
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Fields:**
- `confidence_score`: Between 0.0 and 1.0
- `reasoning`: Not null, explains the choice
- `alternative_actions`: May be null or contain alternatives

---

### Test 5: Feedback Buttons - Correct

**Slack Command:**
```
get ticket 18401
```

**Steps:**
1. Bot responds with ticket info
2. Feedback buttons appear: ✅ Correct / ❌ Wrong
3. Click ✅ Correct

**Expected Behavior:**
- Confirmation message: "Thanks for the feedback! 🎯"
- Database updated

**Verify:**
```sql
-- Check feedback was recorded
SELECT
  user_message,
  detected_action,
  user_feedback,
  feedback_at
FROM ai_confidence_scores
WHERE user_feedback = 'correct'
ORDER BY feedback_at DESC
LIMIT 1;
```

**Expected:**
- `user_feedback` = 'correct'
- `feedback_at` is recent timestamp

---

### Test 6: Feedback Buttons - Wrong (with Correction)

**Slack Command:**
```
find spencer's tickets
```

**Steps:**
1. Bot responds (maybe interpreted incorrectly)
2. Click ❌ Wrong
3. Modal appears with dropdown
4. Select correct action (e.g., "list_tickets")
5. Submit

**Expected Behavior:**
- Modal opens with action dropdown
- After submission: "Thanks for the correction! This helps me learn 🧠"
- Database updated with correction

**Verify:**
```sql
-- Check correction was recorded
SELECT
  user_message,
  detected_action,
  actual_action,
  user_feedback,
  correction_notes,
  feedback_at
FROM ai_confidence_scores
WHERE user_feedback = 'incorrect'
ORDER BY feedback_at DESC
LIMIT 1;
```

**Expected:**
- `user_feedback` = 'incorrect'
- `detected_action` = what AI chose
- `actual_action` = what user said it should be
- Both fields different

---

## Performance Checks

### 1. Query Performance

```sql
-- Test tag lookup speed
EXPLAIN ANALYZE
SELECT tag_name, category
FROM gorgias_tags
WHERE is_active = true
ORDER BY usage_count DESC
LIMIT 50;
-- Should be < 10ms

-- Test user lookup speed
EXPLAIN ANALYZE
SELECT * FROM find_user_by_name('spencer');
-- Should be < 5ms
```

### 2. Index Usage

```sql
-- Verify indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'gorgias_users',
  'gorgias_tags',
  'gorgias_macros',
  'ai_confidence_scores'
)
ORDER BY tablename, indexname;
```

**Expected:** Multiple indexes per table

### 3. Table Sizes

```sql
-- Monitor table growth
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE tablename IN (
  'gorgias_users',
  'gorgias_tags',
  'gorgias_macros',
  'ai_confidence_scores'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Data Quality Checks

### 1. Completeness Checks

```sql
-- Users with missing data
SELECT
  full_name,
  email,
  CASE
    WHEN gorgias_user_id IS NULL THEN 'Missing Gorgias ID'
    WHEN email IS NULL THEN 'Missing Email'
    WHEN full_name IS NULL THEN 'Missing Name'
    ELSE 'OK'
  END as issue
FROM gorgias_users
WHERE gorgias_user_id IS NULL
   OR email IS NULL
   OR full_name IS NULL;

-- Tags with missing data
SELECT
  tag_name,
  CASE
    WHEN category IS NULL OR category = '' THEN 'Missing Category'
    WHEN tag_id IS NULL THEN 'Missing Tag ID'
    ELSE 'OK'
  END as issue
FROM gorgias_tags
WHERE category IS NULL
   OR category = ''
   OR tag_id IS NULL;
```

### 2. Duplicate Detection

```sql
-- Duplicate emails
SELECT email, COUNT(*) as count
FROM gorgias_users
GROUP BY email
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Duplicate tag names
SELECT tag_name, COUNT(*) as count
FROM gorgias_tags
GROUP BY tag_name
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

## Analytics Views Verification

### 1. Daily Confidence Stats

```sql
-- Check view works
SELECT * FROM daily_confidence_stats
LIMIT 7;
```

**Expected:** Last 7 days of confidence metrics

### 2. Action Accuracy

```sql
-- Check view works
SELECT * FROM action_accuracy
WHERE total > 0
ORDER BY total DESC
LIMIT 10;
```

**Expected:** Top 10 actions with accuracy metrics

### 3. Confusion Patterns

```sql
-- Check view works
SELECT * FROM confusion_patterns
LIMIT 10;
```

**Expected:** Common confusion patterns (if any data exists)

### 4. Prompt Version Comparison

```sql
-- Check view works
SELECT * FROM prompt_version_comparison;
```

**Expected:** At least 1 row (prompt version 1)

---

## Troubleshooting

### Issue: No users with Slack IDs

**Check:**
```sql
SELECT COUNT(*) FROM gorgias_users WHERE slack_user_id IS NOT NULL;
```

**If 0:**
- Re-run STEP_1_DATABASE_COMPLETE_SETUP.sql
- Check INSERT statements executed successfully

---

### Issue: No tags/macros

**Check:**
```sql
SELECT COUNT(*) FROM gorgias_tags;
SELECT COUNT(*) FROM gorgias_macros;
```

**If 0:**
- Check sync workflows (0005, 0006) are active
- Manually execute workflows
- Check sync_logs for errors:
  ```sql
  SELECT * FROM sync_logs WHERE status = 'failed';
  ```

---

### Issue: No confidence scores

**Check:**
```sql
SELECT COUNT(*) FROM ai_confidence_scores;
```

**If 0:**
- Send test command in Slack
- Check "Log Confidence Score" node is connected
- Verify Supabase credentials in node

---

### Issue: Feedback not recording

**Check:**
```sql
SELECT COUNT(*) FROM ai_confidence_scores WHERE user_feedback IS NOT NULL;
```

**If 0:**
- Is workflow 0007 active?
- Did you click a feedback button?
- Check workflow execution logs

---

## Success Criteria

Before moving forward, verify:

### Phase 1: Reference Tables ✅
- [ ] `gorgias_users` has 18 users
- [ ] At least 10 users have Slack IDs
- [ ] `gorgias_tags` has 20+ tags
- [ ] `gorgias_macros` has 10+ macros
- [ ] Tags are categorized
- [ ] Macros have content
- [ ] `find_user_by_name()` function works
- [ ] Sync workflows active and logging

### Phase 2: Training Loop ✅
- [ ] Confidence scores logging for every command
- [ ] Feedback buttons appear on all responses
- [ ] Clicking ✅ Correct updates database
- [ ] Clicking ❌ Wrong opens modal
- [ ] Corrections are saved
- [ ] Views return data (when data exists)

### Integration ✅
- [ ] Bot uses existing tags (not creating new)
- [ ] Bot resolves user names correctly
- [ ] Bot suggests macros when relevant
- [ ] All queries run in < 100ms
- [ ] No duplicate data

---

## Final Verification Script

Run this comprehensive check:

```sql
-- ════════════════════════════════════════════════════════════════════════
-- V23 ENHANCEMENT - FINAL VERIFICATION
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  user_count INTEGER;
  tag_count INTEGER;
  macro_count INTEGER;
  confidence_count INTEGER;
  feedback_count INTEGER;
  sync_count INTEGER;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO user_count FROM gorgias_users;
  SELECT COUNT(*) INTO tag_count FROM gorgias_tags;
  SELECT COUNT(*) INTO macro_count FROM gorgias_macros;
  SELECT COUNT(*) INTO confidence_count FROM ai_confidence_scores;
  SELECT COUNT(*) INTO feedback_count FROM ai_confidence_scores WHERE user_feedback IS NOT NULL;
  SELECT COUNT(*) INTO sync_count FROM sync_logs;

  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  V23 ENHANCEMENT - VERIFICATION RESULTS                    ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Users:         % (Expected: 18)                   ║', LPAD(user_count::TEXT, 4);
  RAISE NOTICE '║  Tags:          % (Expected: 20+)                  ║', LPAD(tag_count::TEXT, 4);
  RAISE NOTICE '║  Macros:        % (Expected: 10+)                  ║', LPAD(macro_count::TEXT, 4);
  RAISE NOTICE '║  Confidence:    % (Growing with usage)             ║', LPAD(confidence_count::TEXT, 4);
  RAISE NOTICE '║  Feedback:      % (After testing)                  ║', LPAD(feedback_count::TEXT, 4);
  RAISE NOTICE '║  Sync Logs:     % (After sync runs)                ║', LPAD(sync_count::TEXT, 4);
  RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';

  IF user_count >= 18 AND tag_count >= 20 AND macro_count >= 10 THEN
    RAISE NOTICE '║  STATUS: ✅ READY FOR PRODUCTION                           ║';
  ELSIF user_count >= 18 AND tag_count >= 10 THEN
    RAISE NOTICE '║  STATUS: ⚠️  PARTIAL - Run sync workflows                  ║';
  ELSE
    RAISE NOTICE '║  STATUS: ❌ INCOMPLETE - Check setup steps                 ║';
  END IF;

  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
END $$;
```

---

## Next Steps

After all tests pass:

1. ✅ **Monitor Performance** - Check queries stay fast
2. ✅ **Collect Feedback** - Encourage team to use feedback buttons
3. ✅ **Review Analytics** - Check confidence trends weekly
4. ✅ **Plan Phase 3** - Training loop analysis (optional)

---

**Congratulations! Your v23 enhancement is complete! 🎉**
