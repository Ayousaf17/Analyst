// ============================================================================
// NODE: Resolve User Reference
// ============================================================================
// Purpose: Map user names/mentions to Gorgias emails using Supabase lookup
// Position: After "Parse Slack", before "Build OpenAI Request"
// Execution time: ~50-100ms (single Supabase query)
// ============================================================================

const parseSlackData = $json;
const userText = parseSlackData.user_text;

console.log('═══════════════════════════════════════');
console.log('👤 Resolve User Reference - Starting');
console.log('═══════════════════════════════════════');
console.log('User text:', userText);

// ============================================================================
// STEP 1: Extract Potential User References from Query
// ============================================================================

// Pattern matching for user references
const userPatterns = [
  /\b([a-z]+)'s?\s/gi,              // "collin's", "gabe's"
  /\b(assigned to|assign to)\s+([a-z]+)\b/gi,  // "assign to collin"
  /\b(by|from)\s+([a-z]+)\b/gi,     // "tickets by gabe"
  /\b@([a-z]+)\b/gi,                // "@collin"
  /\b([a-z]+)\s+(tickets|stuff|queue|work)\b/gi  // "collin tickets"
];

const potentialUsers = new Set();

// Extract all potential user references
for (const pattern of userPatterns) {
  const matches = userText.matchAll(pattern);
  for (const match of matches) {
    // Get the captured group (the name)
    const name = (match[1] || match[2] || '').toLowerCase().trim();
    
    // Filter out common words that aren't names
    const excludeWords = ['open', 'closed', 'urgent', 'high', 'low', 'normal', 
                          'all', 'my', 'the', 'a', 'an', 'show', 'get', 'list'];
    
    if (name && name.length > 2 && !excludeWords.includes(name)) {
      potentialUsers.add(name);
    }
  }
}

console.log('📝 Potential user references found:', Array.from(potentialUsers));

// ============================================================================
// STEP 2: Query Supabase for User Matches
// ============================================================================

let resolvedUsers = [];

if (potentialUsers.size > 0) {
  console.log('🔍 Querying Supabase for user matches...');
  
  // Build OR conditions for flexible matching
  const names = Array.from(potentialUsers);
  
  // Query Supabase (will be executed by n8n Supabase node)
  // This is preparation for the query
  const queryConditions = names.map(name => ({
    first_name_match: name,
    last_name_match: name,
    nickname_match: name,
    full_name_contains: name
  }));
  
  console.log('📤 Query conditions:', queryConditions);
  
  // Note: The actual Supabase query will be done in next node
  // We pass the potential names for lookup
  
} else {
  console.log('ℹ️ No user references found in query');
}

// ============================================================================
// STEP 3: Return Data for Supabase Lookup
// ============================================================================

return [{
  json: {
    ...parseSlackData,
    
    // User resolution metadata
    potential_users: Array.from(potentialUsers),
    has_user_references: potentialUsers.size > 0,
    needs_user_lookup: potentialUsers.size > 0,
    
    // For next node
    user_lookup_query: potentialUsers.size > 0 ? {
      names: Array.from(potentialUsers)
    } : null
  }
}];
