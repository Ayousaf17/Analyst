// ============================================================================
// ENHANCED USER RESOLUTION - WITH SLACK MENTION SUPPORT
// ============================================================================
// Purpose: Resolve user references including @mentions from Slack
// Works with: v23, Pattern 3, Pattern 4
// New feature: Handles Slack user ID mentions (e.g., <@U12345ABC>)
// ============================================================================

/**
 * NODE 1: Enhanced Resolve User Reference
 * Position: Immediately after Parse Slack
 * NEW: Detects Slack @mentions in addition to name references
 */

const parseSlackData = $json;
const userText = parseSlackData.user_text;
const slackMentions = parseSlackData.mentioned_users || []; // From Slack event

console.log('═══════════════════════════════════════');
console.log('👤 Enhanced User Resolution - Starting');
console.log('═══════════════════════════════════════');
console.log('User text:', userText);
console.log('Slack mentions:', slackMentions);

// ════════════════════════════════════════════════════════════════════════
// STEP 1: Extract Slack User ID Mentions
// ════════════════════════════════════════════════════════════════════════

// Slack mentions come in format: <@U12345ABC>
const slackMentionPattern = /<@([A-Z0-9]+)>/g;
const mentionedSlackIds = [];

let match;
while ((match = slackMentionPattern.exec(userText)) !== null) {
  mentionedSlackIds.push(match[1]); // Extract user ID
}

// Also check if mentions were provided in event data
if (slackMentions && slackMentions.length > 0) {
  mentionedSlackIds.push(...slackMentions);
}

// Remove duplicates
const uniqueSlackIds = [...new Set(mentionedSlackIds)];

console.log('📱 Slack user IDs found:', uniqueSlackIds);

// ════════════════════════════════════════════════════════════════════════
// STEP 2: Extract Name References (existing logic)
// ════════════════════════════════════════════════════════════════════════

const userPatterns = [
  /\b([a-z]+)'s?\s/gi,
  /\b(assigned to|assign to)\s+([a-z]+)\b/gi,
  /\b(by|from)\s+([a-z]+)\b/gi,
  /\b([a-z]+)\s+(tickets|stuff|queue|work)\b/gi
];

const potentialNames = new Set();

for (const pattern of userPatterns) {
  const matches = userText.matchAll(pattern);
  for (const match of matches) {
    const name = (match[1] || match[2] || '').toLowerCase().trim();
    const excludeWords = ['open', 'closed', 'urgent', 'high', 'low', 'normal', 
                          'all', 'my', 'the', 'a', 'an', 'show', 'get', 'list'];
    
    if (name && name.length > 2 && !excludeWords.includes(name)) {
      potentialNames.add(name);
    }
  }
}

console.log('📝 Potential name references:', Array.from(potentialNames));

// ════════════════════════════════════════════════════════════════════════
// STEP 3: Return Data for Dual Lookup (Slack ID + Names)
// ════════════════════════════════════════════════════════════════════════

return [{
  json: {
    ...parseSlackData,
    
    // User resolution metadata
    slack_user_ids: uniqueSlackIds,
    potential_names: Array.from(potentialNames),
    has_slack_mentions: uniqueSlackIds.length > 0,
    has_name_references: potentialNames.size > 0,
    needs_user_lookup: uniqueSlackIds.length > 0 || potentialNames.size > 0,
    
    // For next node
    user_lookup_query: {
      slack_ids: uniqueSlackIds,
      names: Array.from(potentialNames)
    }
  }
}];

// ════════════════════════════════════════════════════════════════════════
// NODE 2: Enhanced Supabase Lookup
// ════════════════════════════════════════════════════════════════════════

/*
n8n Supabase Node Configuration:

Operation: Get All
Table: gorgias_users

Filters (OR condition):
1. Slack ID lookup:
   - Field: slack_user_id
   - Operator: in
   - Value: ={{ $json.slack_user_ids }}

2. Name lookup (same as before):
   - Field: first_name
   - Operator: ilike
   - Value: ={{ $json.potential_names[0] }}
   
   [... other name fields ...]

This query handles BOTH Slack mentions AND name references in one lookup!
*/

// ════════════════════════════════════════════════════════════════════════
// NODE 3: Enhanced Format User Lookup Results
// ════════════════════════════════════════════════════════════════════════

const parseSlackData2 = $('Parse Slack').first().json;
const userLookupData = $('Enhanced Resolve User Reference').first().json;
const supabaseResults = $input.all();

console.log('═══════════════════════════════════════');
console.log('📋 Enhanced Format User Lookup Results');
console.log('═══════════════════════════════════════');

// ════════════════════════════════════════════════════════════════════════
// STEP 1: Build Comprehensive User Maps
// ════════════════════════════════════════════════════════════════════════

const userMapByName = {};        // "collin" → user data
const userMapBySlackId = {};     // "U12345ABC" → user data
const resolvedUsers = [];

for (const result of supabaseResults) {
  const user = result.json;
  
  // Map by Slack ID
  if (user.slack_user_id) {
    userMapBySlackId[user.slack_user_id] = {
      email: user.email,
      full_name: user.full_name,
      gorgias_id: user.gorgias_user_id,
      role: user.role,
      slack_user_id: user.slack_user_id,
      slack_display_name: user.slack_display_name
    };
    console.log(`✅ Mapped Slack ID: ${user.slack_user_id} → ${user.email}`);
  }
  
  // Map by name variations
  const names = [
    user.first_name?.toLowerCase(),
    user.last_name?.toLowerCase(),
    user.nickname?.toLowerCase()
  ].filter(Boolean);
  
  for (const name of names) {
    userMapByName[name] = {
      email: user.email,
      full_name: user.full_name,
      gorgias_id: user.gorgias_user_id,
      role: user.role,
      slack_user_id: user.slack_user_id
    };
    console.log(`✅ Mapped name: "${name}" → ${user.email}`);
  }
  
  resolvedUsers.push({
    name: user.full_name,
    email: user.email,
    slack_id: user.slack_user_id,
    resolution_method: user.slack_user_id ? 'slack_mention' : 'name_match'
  });
}

// ════════════════════════════════════════════════════════════════════════
// STEP 2: Replace References in Text
// ════════════════════════════════════════════════════════════════════════

let enhancedText = parseSlackData2.user_text;
const replacements = [];

// Replace Slack mentions: <@U12345ABC> → email
for (const slackId of userLookupData.slack_user_ids || []) {
  if (userMapBySlackId[slackId]) {
    const user = userMapBySlackId[slackId];
    
    // Replace <@U12345ABC> with actual email
    enhancedText = enhancedText.replace(
      new RegExp(`<@${slackId}>`, 'g'),
      user.email
    );
    
    replacements.push({
      original: `<@${slackId}>`,
      resolved: user.email,
      full_name: user.full_name,
      method: 'slack_mention'
    });
    
    console.log(`🔄 Replaced Slack mention: <@${slackId}> → ${user.email}`);
  }
}

// Replace name references: "collin's" → "collin@ironside.gg's"
for (const [name, userData] of Object.entries(userMapByName)) {
  // Possessive form
  enhancedText = enhancedText.replace(
    new RegExp(`\\b${name}'s`, 'gi'),
    `${userData.email}'s`
  );
  
  // Assignment phrases
  enhancedText = enhancedText.replace(
    new RegExp(`(assign(?:ed)? to|by|from)\\s+${name}\\b`, 'gi'),
    `$1 ${userData.email}`
  );
  
  if (enhancedText !== parseSlackData2.user_text) {
    replacements.push({
      original: name,
      resolved: userData.email,
      full_name: userData.full_name,
      method: 'name_match'
    });
    
    console.log(`🔄 Replaced name: "${name}" → ${userData.email}`);
  }
}

// ════════════════════════════════════════════════════════════════════════
// STEP 3: Return Enhanced Data
// ════════════════════════════════════════════════════════════════════════

console.log('───────────────────────────────────────');
console.log('📊 Resolution Summary:');
console.log('  Slack mentions resolved:', Object.keys(userMapBySlackId).length);
console.log('  Name references resolved:', Object.keys(userMapByName).length);
console.log('  Total replacements:', replacements.length);
console.log('═══════════════════════════════════════');

return [{
  json: {
    ...parseSlackData2,
    
    // Enhanced text with all references resolved
    user_text_enhanced: enhancedText,
    
    // Comprehensive user maps
    user_map_by_name: userMapByName,
    user_map_by_slack_id: userMapBySlackId,
    resolved_users: resolvedUsers,
    replacements: replacements,
    
    // Resolution metadata
    user_resolution_success: resolvedUsers.length > 0,
    users_found: resolvedUsers.length,
    slack_mentions_resolved: Object.keys(userMapBySlackId).length,
    name_references_resolved: Object.keys(userMapByName).length,
    
    // Unresolved references (for error handling)
    unresolved_slack_ids: (userLookupData.slack_user_ids || []).filter(
      id => !userMapBySlackId[id]
    ),
    unresolved_names: (userLookupData.potential_names || []).filter(
      name => !userMapByName[name.toLowerCase()]
    )
  }
}];

// ════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ════════════════════════════════════════════════════════════════════════

/*
EXAMPLE 1: Slack @mention
─────────────────────────
Input: "assign ticket 12345 to <@U12345ABC>"
     ↓
Resolve User Reference:
  slack_user_ids: ["U12345ABC"]
     ↓
Lookup Users in Supabase:
  Found: Collin Bailey (collin@ironside.gg)
     ↓
Format Results:
  Enhanced: "assign ticket 12345 to collin@ironside.gg"
     ↓
Build OpenAI Request receives exact email ✅

──────────────────────────────────────────────────────────────────────────

EXAMPLE 2: Mixed references
─────────────────────────
Input: "show <@U12345ABC>'s urgent tickets and spencer's closed ones"
     ↓
Resolve User Reference:
  slack_user_ids: ["U12345ABC"]
  potential_names: ["spencer"]
     ↓
Lookup Users in Supabase:
  Found: Collin Bailey (U12345ABC)
  Found: Spencer James (spencer)
     ↓
Format Results:
  Enhanced: "show collin@ironside.gg's urgent tickets and spencer@ironsidecomputers.com's closed ones"
     ↓
Both users resolved perfectly ✅

──────────────────────────────────────────────────────────────────────────

EXAMPLE 3: Name fallback when no Slack ID
─────────────────────────
Input: "bailey's stuff"
     ↓
Resolve User Reference:
  potential_names: ["bailey"]
     ↓
Lookup Users in Supabase:
  Found: Collin Bailey (via nickname)
     ↓
Format Results:
  Enhanced: "collin@ironside.gg's stuff"
     ↓
Name resolution works even without Slack mention ✅
*/
