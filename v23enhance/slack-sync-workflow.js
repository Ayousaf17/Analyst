// ============================================================================
// N8N WORKFLOW: Sync Slack User IDs to Gorgias Users Table
// ============================================================================
// Purpose: Automatically populate slack_user_id field in gorgias_users table
// Trigger: Manual (run once initially, then weekly via schedule)
// Duration: ~30 seconds
// ============================================================================

/*
WORKFLOW STRUCTURE:

┌─────────────────────────┐
│ 1. Schedule Trigger     │  (Weekly Sunday 2am)
│    OR Manual Trigger    │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ 2. Slack: Get Users     │  (Fetch all workspace members)
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ 3. Format Slack Data    │  (Extract email, user_id, display_name)
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ 4. Fetch Gorgias Users  │  (Get all from Supabase)
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ 5. Match & Update       │  (Match by email, update Slack IDs)
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ 6. Supabase: Bulk Update│  (Update slack_user_id field)
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│ 7. Send Slack Notify    │  (Report sync results)
└─────────────────────────┘
*/

// ════════════════════════════════════════════════════════════════════════
// NODE 1: Schedule Trigger (optional - for automatic weekly sync)
// ════════════════════════════════════════════════════════════════════════

/*
Trigger Type: Schedule
Cron Expression: 0 2 * * 0  (Every Sunday at 2am)

Purpose: Keep Slack IDs in sync as team members are added/removed
*/

// ════════════════════════════════════════════════════════════════════════
// NODE 2: Slack - Get Users List
// ════════════════════════════════════════════════════════════════════════

/*
n8n Node: Slack (users.list API)
Configuration:
- Resource: User
- Operation: Get All
- Return All: Yes
- Additional Fields:
  - Include Locale: No (we don't need it)

This returns all Slack workspace members with their:
- user_id (e.g., "U12345ABC")
- email (from profile.email)
- display_name (from profile.display_name)
- real_name (from profile.real_name)
*/

// ════════════════════════════════════════════════════════════════════════
// NODE 3: Format Slack Data (Code node)
// ════════════════════════════════════════════════════════════════════════

const slackUsers = $input.all();

console.log('═══════════════════════════════════════');
console.log('👥 Slack User Sync - Processing');
console.log('═══════════════════════════════════════');
console.log(`Total Slack users fetched: ${slackUsers.length}`);

const formattedUsers = [];

for (const item of slackUsers) {
  const user = item.json;
  
  // Skip bots, deleted users, and Slackbot
  if (user.is_bot || user.deleted || user.id === 'USLACKBOT') {
    console.log(`⏭️  Skipping: ${user.name} (bot or deleted)`);
    continue;
  }
  
  // Extract relevant data
  const slackData = {
    slack_user_id: user.id,                           // "U12345ABC"
    slack_display_name: user.profile?.display_name || user.profile?.real_name || user.name,
    slack_real_name: user.profile?.real_name,
    email: user.profile?.email?.toLowerCase().trim(), // Normalize email
    slack_username: user.name,                        // @mention name
    is_admin: user.is_admin || false,
    is_owner: user.is_owner || false
  };
  
  // Only include users with emails
  if (slackData.email && slackData.email.length > 0) {
    formattedUsers.push(slackData);
    console.log(`✅ Formatted: ${slackData.slack_real_name} (${slackData.email})`);
  } else {
    console.log(`⚠️  No email: ${slackData.slack_display_name} - skipping`);
  }
}

console.log('───────────────────────────────────────');
console.log(`📊 Total users with emails: ${formattedUsers.length}`);
console.log('═══════════════════════════════════════');

return formattedUsers.map(user => ({ json: user }));

// ════════════════════════════════════════════════════════════════════════
// NODE 4: Supabase - Fetch Gorgias Users
// ════════════════════════════════════════════════════════════════════════

/*
n8n Node: Supabase (Get All)
Configuration:
- Table: gorgias_users
- Return All: Yes
- Filters: is_bot = false (don't update bot accounts)

Returns all Gorgias users that need Slack ID mapping
*/

// ════════════════════════════════════════════════════════════════════════
// NODE 5: Match & Update (Code node)
// ════════════════════════════════════════════════════════════════════════

const slackUsersData = $('Format Slack Data').all();
const gorgiasUsersData = $input.all();

console.log('═══════════════════════════════════════');
console.log('🔗 Matching Slack ↔ Gorgias Users');
console.log('═══════════════════════════════════════');

// Create email → Slack data map
const slackByEmail = {};
for (const item of slackUsersData) {
  const user = item.json;
  slackByEmail[user.email] = user;
}

console.log(`Slack users indexed: ${Object.keys(slackByEmail).length}`);
console.log(`Gorgias users to match: ${gorgiasUsersData.length}`);
console.log('───────────────────────────────────────');

const updates = [];
const matched = [];
const unmatched = [];

// Match by email
for (const item of gorgiasUsersData) {
  const gorgiasUser = item.json;
  const email = gorgiasUser.email.toLowerCase().trim();
  
  if (slackByEmail[email]) {
    const slackUser = slackByEmail[email];
    
    updates.push({
      gorgias_user_id: gorgiasUser.id,
      email: email,
      slack_user_id: slackUser.slack_user_id,
      slack_display_name: slackUser.slack_display_name,
      slack_real_name: slackUser.slack_real_name
    });
    
    matched.push({
      name: gorgiasUser.full_name,
      email: email,
      slack_id: slackUser.slack_user_id
    });
    
    console.log(`✅ MATCH: ${gorgiasUser.full_name} → ${slackUser.slack_user_id}`);
    
  } else {
    unmatched.push({
      name: gorgiasUser.full_name,
      email: email,
      reason: 'No Slack account with this email'
    });
    
    console.log(`❌ NO MATCH: ${gorgiasUser.full_name} (${email})`);
  }
}

console.log('═══════════════════════════════════════');
console.log('📊 Matching Results:');
console.log(`  ✅ Matched: ${matched.length}`);
console.log(`  ❌ Unmatched: ${unmatched.length}`);
console.log(`  📝 Updates to perform: ${updates.length}`);
console.log('═══════════════════════════════════════');

// Return updates for next node
return [{
  json: {
    updates: updates,
    matched: matched,
    unmatched: unmatched,
    stats: {
      total_gorgias_users: gorgiasUsersData.length,
      total_slack_users: slackUsersData.length,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      match_rate: `${Math.round(matched.length / gorgiasUsersData.length * 100)}%`
    }
  }
}];

// ════════════════════════════════════════════════════════════════════════
// NODE 6: Supabase - Bulk Update (Code node with Supabase client)
// ════════════════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const matchData = $json;
const updates = matchData.updates;

console.log('═══════════════════════════════════════');
console.log('💾 Updating Slack User IDs in Database');
console.log('═══════════════════════════════════════');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const results = {
  successful: [],
  failed: []
};

// Update each user (Supabase doesn't have native bulk update, so we loop)
for (const update of updates) {
  try {
    const { data, error } = await supabase
      .from('gorgias_users')
      .update({
        slack_user_id: update.slack_user_id,
        slack_display_name: update.slack_display_name,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', update.gorgias_user_id);
    
    if (error) throw error;
    
    results.successful.push({
      email: update.email,
      slack_id: update.slack_user_id
    });
    
    console.log(`✅ Updated: ${update.email} → ${update.slack_user_id}`);
    
  } catch (error) {
    results.failed.push({
      email: update.email,
      error: error.message
    });
    
    console.error(`❌ Failed: ${update.email} - ${error.message}`);
  }
}

console.log('═══════════════════════════════════════');
console.log('📊 Update Results:');
console.log(`  ✅ Successful: ${results.successful.length}`);
console.log(`  ❌ Failed: ${results.failed.length}`);
console.log('═══════════════════════════════════════');

return [{
  json: {
    ...matchData,
    update_results: results,
    sync_completed_at: new Date().toISOString()
  }
}];

// ════════════════════════════════════════════════════════════════════════
// NODE 7: Slack - Send Notification (Slack node)
// ════════════════════════════════════════════════════════════════════════

/*
n8n Node: Slack (Post Message)
Configuration:
- Channel: #dev-notifications (or wherever you want)
- Message: Dynamic based on results

Message Template:
*/

const syncData = $json;
const stats = syncData.stats;
const unmatched = syncData.unmatched;

let message = `🔄 *Slack User ID Sync Complete*

📊 *Results:*
• Total Gorgias Users: ${stats.total_gorgias_users}
• Total Slack Users: ${stats.total_slack_users}
• ✅ Successfully Matched: ${stats.matched_count}
• ❌ Unmatched: ${stats.unmatched_count}
• Match Rate: ${stats.match_rate}

⏰ Completed: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}
`;

// Add unmatched users if any
if (unmatched && unmatched.length > 0) {
  message += `\n⚠️ *Unmatched Users:*\n`;
  for (const user of unmatched) {
    message += `• ${user.name} (${user.email})\n`;
  }
  message += `\n_These users don't have Slack accounts with matching emails._`;
}

return [{
  json: {
    channel: '#dev-notifications',
    text: message
  }
}];

// ════════════════════════════════════════════════════════════════════════
// ALTERNATIVE: Manual Slack ID Entry (SQL statements)
// ════════════════════════════════════════════════════════════════════════

/*
If you already know some Slack user IDs, you can update them manually:

-- Update Slack user IDs manually (replace with actual IDs)
UPDATE gorgias_users 
SET slack_user_id = 'U12345ABC', 
    slack_display_name = 'ayub',
    last_synced_at = NOW()
WHERE email = 'ay17yousaf@gmail.com';

UPDATE gorgias_users 
SET slack_user_id = 'U23456BCD',
    slack_display_name = 'collin',
    last_synced_at = NOW()
WHERE email = 'collin@ironside.gg';

-- ... repeat for each user
*/

// ════════════════════════════════════════════════════════════════════════
// USAGE IN WORKFLOWS
// ════════════════════════════════════════════════════════════════════════

/*
Once Slack IDs are populated, you can use them in Gorgias Terminal:

Example 1: Resolve @mentions in Slack
User: "@collin can you handle this ticket?"
     ↓
Parse Slack extracts: mentioned_users = ["U23456BCD"]
     ↓
Lookup in gorgias_users by slack_user_id
     ↓
Found: collin@ironside.gg
     ↓
Build OpenAI Request with: "collin@ironside.gg can you handle this ticket?"

Example 2: Tag users in responses
System finds ticket assigned to: collin@ironside.gg
     ↓
Lookup slack_user_id from gorgias_users
     ↓
Found: U23456BCD
     ↓
Slack reply: "Ticket assigned to <@U23456BCD>"
     ↓
Slack renders as: "Ticket assigned to @collin" (clickable mention)

Example 3: User presence detection
User: "is spencer available?"
     ↓
Lookup spencer's slack_user_id
     ↓
Call Slack API: users.getPresence
     ↓
Reply: "Spencer is currently active ✅"
*/
