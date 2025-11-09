// ============================================================================
// NODE: Format User Lookup Results
// ============================================================================
// Purpose: Process Supabase user lookup results and create name→email map
// Position: After "Lookup Users in Supabase"
// ============================================================================

const parseSlackData = $('Parse Slack').first().json;
const userLookupData = $('Resolve User Reference').first().json;
const supabaseResults = $input.all();  // All matched users from Supabase

console.log('═══════════════════════════════════════');
console.log('📋 Format User Lookup Results');
console.log('═══════════════════════════════════════');

// ============================================================================
// STEP 1: Build Name→Email Mapping
// ============================================================================

const userMap = {};
const resolvedUsers = [];

for (const result of supabaseResults) {
  const user = result.json;
  
  // Create multiple mappings for flexibility
  const mappings = [];
  
  // Map first name (lowercase)
  if (user.first_name) {
    const firstName = user.first_name.toLowerCase();
    mappings.push({
      key: firstName,
      email: user.email,
      full_name: user.full_name,
      gorgias_id: user.gorgias_user_id
    });
  }
  
  // Map last name (lowercase)
  if (user.last_name) {
    const lastName = user.last_name.toLowerCase();
    mappings.push({
      key: lastName,
      email: user.email,
      full_name: user.full_name,
      gorgias_id: user.gorgias_user_id
    });
  }
  
  // Map nickname (lowercase)
  if (user.nickname) {
    const nickname = user.nickname.toLowerCase();
    mappings.push({
      key: nickname,
      email: user.email,
      full_name: user.full_name,
      gorgias_id: user.gorgias_user_id
    });
  }
  
  // Store all mappings
  for (const mapping of mappings) {
    userMap[mapping.key] = mapping;
    console.log(`✅ Mapped: "${mapping.key}" → ${mapping.email}`);
  }
  
  resolvedUsers.push({
    name: user.full_name,
    email: user.email,
    first_name: user.first_name,
    gorgias_id: user.gorgias_user_id,
    role: user.role
  });
}

console.log('───────────────────────────────────────');
console.log('📊 Resolution Summary:');
console.log('  Total mappings created:', Object.keys(userMap).length);
console.log('  Unique users resolved:', resolvedUsers.length);
console.log('═══════════════════════════════════════');

// ============================================================================
// STEP 2: Enhance User Text with Resolved Emails
// ============================================================================

let enhancedText = parseSlackData.user_text;
const replacements = [];

// Replace name references with full emails in the text
for (const [name, mapping] of Object.entries(userMap)) {
  // Find patterns like "collin's tickets" or "assign to collin"
  const patterns = [
    new RegExp(`\\b${name}'s?\\b`, 'gi'),
    new RegExp(`\\b(assign(?:ed)? to|by|from)\\s+${name}\\b`, 'gi')
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(enhancedText)) {
      // For possessives: "collin's" → "collin@ironside.gg's"
      enhancedText = enhancedText.replace(
        new RegExp(`\\b${name}'s`, 'gi'),
        `${mapping.email}'s`
      );
      
      // For assignments: "assign to collin" → "assign to collin@ironside.gg"
      enhancedText = enhancedText.replace(
        new RegExp(`(assign(?:ed)? to|by|from)\\s+${name}\\b`, 'gi'),
        `$1 ${mapping.email}`
      );
      
      replacements.push({
        original: name,
        resolved: mapping.email,
        full_name: mapping.full_name
      });
      
      console.log(`🔄 Replaced "${name}" with "${mapping.email}" in text`);
    }
  }
}

// ============================================================================
// STEP 3: Return Enhanced Data
// ============================================================================

return [{
  json: {
    ...parseSlackData,
    
    // Enhanced text with emails
    user_text_enhanced: enhancedText,
    
    // Resolution results
    user_map: userMap,
    resolved_users: resolvedUsers,
    replacements: replacements,
    
    // Metadata
    user_resolution_success: resolvedUsers.length > 0,
    users_found: resolvedUsers.length,
    names_not_found: userLookupData.potential_users?.filter(
      name => !userMap[name.toLowerCase()]
    ) || []
  }
}];
