# Static Users Table - Quick Start Guide

**Alternative to workflow 0004** - Simpler approach for Phase 1

Instead of auto-syncing users daily, this creates a static table you populate once with your team members.

---

## 🎯 What This Does

When users say:
- "assign ticket 18401 to spencer"
- "assign this to spence"
- "who handles billing issues? assign to sarah"

The bot will:
1. Query the `gorgias_users` table
2. Match "spencer" or "spence" to Spencer Smith
3. Use Spencer's Gorgias user ID (12345) in the API call
4. Successfully assign the ticket

---

## ⚡ Quick Setup (10 minutes)

### Step 1: Get Your Team's Gorgias User IDs

**Option A: From Gorgias Dashboard**
```
1. Go to: https://ironsidecomputers.gorgias.com/settings/users
2. Click on each team member
3. Look at URL: /settings/users/[USER_ID]
4. Note down: Name, Email, User ID
```

**Option B: From Gorgias API**
```bash
curl -X GET "https://ironsidecomputers.gorgias.com/api/users" \
  -H "Authorization: Basic YOUR_BASE64_CREDENTIALS" \
  | jq '.[] | {id, email, firstname, lastname}'
```

**Expected Output:**
```json
{
  "id": 12345,
  "email": "spencer@ironsidecomputers.com",
  "firstname": "Spencer",
  "lastname": "Smith"
}
```

---

### Step 2: Create & Populate Table in Supabase

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Click "SQL Editor" in sidebar
   - Click "New query"

2. **Copy & Modify SQL**
   - Open: `database/STATIC_USERS_TABLE_SETUP.sql`
   - Replace the example users with your actual team
   - Make sure to update:
     - `gorgias_user_id` (from Step 1)
     - `gorgias_email`
     - `gorgias_name`
     - `aliases` (nicknames people use)

3. **Execute SQL**
   - Paste the modified SQL
   - Click "Run"
   - Should see: "Success. No rows returned"

4. **Verify**
```sql
SELECT gorgias_user_id, gorgias_name, aliases
FROM gorgias_users
WHERE is_active = true;
```

Should return your team members.

---

### Step 3: Update Your Main Workflow

**Find Node:** "Build OpenAI Request"

**Add at Beginning:**

```javascript
// ============================================
// FETCH AVAILABLE USERS
// ============================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data: availableUsers } = await supabase
  .from('gorgias_users')
  .select('gorgias_user_id, gorgias_name, gorgias_email, aliases')
  .eq('is_active', true)
  .order('gorgias_name');

console.log(`✅ Loaded ${availableUsers?.length || 0} users`);
```

**Find Where System Prompt is Built, Add:**

```javascript
// ============================================
// ADD TEAM MEMBERS TO SYSTEM PROMPT
// ============================================
if (availableUsers && availableUsers.length > 0) {
  const usersList = availableUsers
    .map(u => {
      const aliases = u.aliases?.length > 0
        ? ` (also: ${u.aliases.join(', ')})`
        : '';
      return `  - ${u.gorgias_name}${aliases} [ID: ${u.gorgias_user_id}]`;
    })
    .join('\n');

  systemPrompt += `

👥 TEAM MEMBERS:
${usersList}

When user says "assign to [name]":
- Match name or alias (case-insensitive)
- Use the [ID: xxxxx] in your params as "assignee_id"

Example:
User: "assign ticket 5678 to spencer"
→ Match "spencer" → ID: 12345
→ Action: assign_ticket
→ Params: { "ticket_id": 5678, "assignee_id": 12345 }
`;
}
```

**Save Workflow**

---

### Step 4: Test

**In Slack:**
```
@Gorgias Terminal assign ticket 18401 to spencer
@Gorgias Terminal assign ticket 18401 to spence
@Gorgias Terminal who can I assign tickets to?
```

**Expected:**
- Bot matches "spencer" → Spencer Smith (ID: 12345)
- Uses correct gorgias_user_id in API call
- Ticket successfully assigned

**Debug:**
```sql
-- Check what users are in the table
SELECT * FROM gorgias_users WHERE is_active = true;

-- Test user lookup function
SELECT * FROM find_user_by_name('spencer');
SELECT * FROM find_user_by_name('spence');
```

---

## 📝 Example: Your Team Setup

Replace the example data in `STATIC_USERS_TABLE_SETUP.sql` with your actual team:

```sql
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
  -- Get these IDs from Gorgias dashboard or API
  (12345, 'spencer@ironsidecomputers.com', 'Spencer Smith', 'Spencer', 'Smith',
   ARRAY['spencer', 'spence', 'spencer smith', 's.smith']::TEXT[], 'agent', true),

  (12346, 'collin@ironsidecomputers.com', 'Collin Johnson', 'Collin', 'Johnson',
   ARRAY['collin', 'col', 'collin johnson']::TEXT[], 'agent', true),

  (12347, 'sarah@ironsidecomputers.com', 'Sarah Williams', 'Sarah', 'Williams',
   ARRAY['sarah', 'sarah williams']::TEXT[], 'admin', true),

  (12348, 'alex@ironsidecomputers.com', 'Alex Chen', 'Alex', 'Chen',
   ARRAY['alex', 'alex chen']::TEXT[], 'agent', true)

  -- Add more team members...
;
```

**Important:** Make sure the `aliases` array includes all common ways people refer to that person:
- Full name: "spencer smith"
- First name: "spencer"
- Nicknames: "spence"
- Last name: "smith"

---

## 🔄 Maintenance

**Add a New Team Member:**
```sql
INSERT INTO gorgias_users (gorgias_user_id, gorgias_email, gorgias_name, first_name, last_name, aliases)
VALUES (12349, 'john@ironsidecomputers.com', 'John Doe', 'John', 'Doe',
        ARRAY['john', 'john doe', 'johndoe']::TEXT[]);
```

**Update Aliases:**
```sql
UPDATE gorgias_users
SET aliases = ARRAY['spencer', 'spence', 'spencer smith', 's.smith', 'spenny']
WHERE gorgias_user_id = 12345;
```

**Deactivate User (don't delete):**
```sql
UPDATE gorgias_users
SET is_active = false
WHERE gorgias_user_id = 12345;
```

**Reactivate User:**
```sql
UPDATE gorgias_users
SET is_active = true
WHERE gorgias_user_id = 12345;
```

---

## ✅ Success Criteria

**Before:**
```
User: "assign ticket 18401 to spencer"
Bot: ❌ Error - User not found or invalid ID
```

**After:**
```
User: "assign ticket 18401 to spencer"
Bot: ✅ Assigned ticket #18401 to Spencer Smith
```

---

## 🆚 Static vs Auto-Sync Workflow

| Feature | Static Table (This Guide) | Auto-Sync Workflow (0004) |
|---------|---------------------------|---------------------------|
| Setup Time | 10 minutes | 30 minutes |
| Maintenance | Manual updates | Automatic daily |
| Complexity | Simple | Requires workflow |
| Best For | Small teams (5-20) | Large teams (20+) |
| Team Changes | Update SQL manually | Syncs automatically |

**Recommendation:**
- **Use Static** if: Team rarely changes, small team, want simple setup
- **Use Auto-Sync** if: Large team, frequent changes, want full automation

---

## 🐛 Troubleshooting

**Problem:** Bot says "user not found"
```sql
-- Check if user exists and is active
SELECT * FROM gorgias_users WHERE LOWER(gorgias_name) LIKE '%spencer%';

-- If missing, add them
INSERT INTO gorgias_users (gorgias_user_id, gorgias_email, gorgias_name, first_name, aliases)
VALUES (12345, 'spencer@example.com', 'Spencer Smith', 'Spencer', ARRAY['spencer', 'spence']);
```

**Problem:** Multiple users matched
```sql
-- Check for duplicates
SELECT gorgias_name, COUNT(*) FROM gorgias_users GROUP BY gorgias_name HAVING COUNT(*) > 1;

-- Fix by making aliases more specific
```

**Problem:** Supabase connection error
```
Verify in n8n:
- SUPABASE_URL is correct
- SUPABASE_SERVICE_KEY is correct (not anon key)
- Table has proper permissions
```

---

## 📚 Files Reference

- `database/STATIC_USERS_TABLE_SETUP.sql` - Complete SQL setup
- `database/BOT_USER_LOOKUP_CODE.js` - n8n workflow code
- This file - Quick start guide

---

## 🚀 Next Steps

After users table is working:

1. **Add Tags Table** (Optional)
   - Similar approach for `gorgias_tags`
   - Bot uses existing tags instead of creating new ones

2. **Add Macros Table** (Optional)
   - Similar approach for `gorgias_macros`
   - Bot suggests team's macros

3. **Add Confidence Tracking** (Phase 2)
   - Track AI confidence for every command
   - Add feedback buttons

---

**Ready?** Open `STATIC_USERS_TABLE_SETUP.sql` and follow the instructions! 🎯
