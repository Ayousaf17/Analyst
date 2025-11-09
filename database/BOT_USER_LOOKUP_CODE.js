// ============================================================================
// USER LOOKUP CODE - Add to "Build OpenAI Request" Node
// ============================================================================
// Purpose: Fetch users from Supabase and add to system prompt
// Location: Beginning of "Build OpenAI Request" node in main workflow
// Prerequisites: gorgias_users table populated in Supabase
// ============================================================================

// ============================================================================
// STEP 1: FETCH USERS FROM SUPABASE
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY'
);

console.log('👥 Fetching available users from Supabase...');

// Fetch all active users with their aliases
const { data: availableUsers, error: usersError } = await supabase
  .from('gorgias_users')
  .select('gorgias_user_id, gorgias_name, gorgias_email, first_name, last_name, aliases, role')
  .eq('is_active', true)
  .order('gorgias_name');

if (usersError) {
  console.error('❌ Error fetching users:', usersError);
} else {
  console.log(`✅ Loaded ${availableUsers?.length || 0} active users`);
}

// ============================================================================
// STEP 2: ADD USERS TO SYSTEM PROMPT
// ============================================================================

// Find where you're building the systemPrompt variable, then add this:

if (availableUsers && availableUsers.length > 0) {
  // Build user list for prompt
  const usersList = availableUsers
    .map(u => {
      const aliases = u.aliases && u.aliases.length > 0
        ? ` (also: ${u.aliases.join(', ')})`
        : '';
      return `  - ${u.gorgias_name} (${u.gorgias_email})${aliases} [ID: ${u.gorgias_user_id}]`;
    })
    .join('\n');

  systemPrompt += `

👥 AVAILABLE TEAM MEMBERS:
${usersList}

When user says "assign to [name]" or "assign [ticket] to [name]":
1. Search the list above (case-insensitive, match name or alias)
2. Use the gorgias_user_id in your action params
3. If name is ambiguous, ask for clarification

Examples:
User: "assign ticket 5678 to spencer"
→ Match "spencer" → Spencer Smith (ID: 12345)
→ Action: assign_ticket
→ Params: { "ticket_id": 5678, "assignee_id": 12345 }

User: "assign this to spence"
→ Match alias "spence" → Spencer Smith (ID: 12345)
→ Action: assign_ticket
→ Params: { "ticket_id": <from_context>, "assignee_id": 12345 }

User: "who can I assign tickets to?"
→ Action: list_users (informational)
→ List all available team members from above

User: "assign to john smith"
→ No match found
→ Response: "I couldn't find 'john smith'. Available team members: Spencer, Collin, Sarah, Alex"
`;
}

// ============================================================================
// STEP 3: HELPER FUNCTION FOR USER RESOLUTION (Optional)
// ============================================================================

// If you want to resolve user names in your workflow logic (before OpenAI),
// add this function:

async function resolveUserByName(searchTerm) {
  if (!searchTerm) return null;

  console.log(`🔍 Resolving user: "${searchTerm}"`);

  // Call the Supabase function we created
  const { data, error } = await supabase
    .rpc('find_user_by_name', { search_term: searchTerm });

  if (error) {
    console.error('❌ Error resolving user:', error);
    return null;
  }

  if (data && data.length > 0) {
    const user = data[0]; // Take best match
    console.log(`✅ Resolved "${searchTerm}" → ${user.gorgias_name} (ID: ${user.gorgias_user_id})`);
    return user;
  }

  console.log(`❌ No match found for "${searchTerm}"`);
  return null;
}

// Usage example:
// const user = await resolveUserByName('spencer');
// if (user) {
//   console.log('Gorgias User ID:', user.gorgias_user_id);
// }

// ============================================================================
// COMPLETE EXAMPLE: Build OpenAI Request with User Context
// ============================================================================

// Here's how your complete "Build OpenAI Request" node should look:

/*
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get data from previous nodes
const parseSlackData = $('Parse Slack').first().json;
const userMessage = parseSlackData.user_text;

// Fetch available users
const { data: availableUsers } = await supabase
  .from('gorgias_users')
  .select('gorgias_user_id, gorgias_name, gorgias_email, first_name, aliases')
  .eq('is_active', true)
  .order('gorgias_name');

console.log(`✅ Loaded ${availableUsers?.length || 0} users`);

// Build system prompt
let systemPrompt = `You are Gorgias Terminal, an AI assistant for Ironside Computers support team.

You help manage Gorgias tickets via Slack using natural language commands.

AVAILABLE ACTIONS:
- list_tickets - List tickets with filters
- get_ticket - Get ticket details by ID
- search_tickets - Search tickets by keyword
- assign_ticket - Assign ticket to team member
- close_ticket - Close a ticket
- set_priority - Update priority (low, normal, high, urgent)
- set_status - Update status (open, closed, etc)
- add_tags - Add tags to ticket
- reply_public - Send public reply to customer
- comment_internal - Add internal note
... (your other actions)
`;

// Add user context
if (availableUsers && availableUsers.length > 0) {
  const usersList = availableUsers
    .map(u => {
      const aliases = u.aliases?.length > 0 ? ` (${u.aliases.join(', ')})` : '';
      return `  - ${u.gorgias_name}${aliases} [ID: ${u.gorgias_user_id}]`;
    })
    .join('\n');

  systemPrompt += `

👥 TEAM MEMBERS:
${usersList}

When assigning tickets, match the name (or alias) to get the gorgias_user_id.
Example: "assign to spencer" → use gorgias_user_id from Spencer's entry above.
`;
}

// Define OpenAI schema
const schema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: [
        "list_tickets", "get_ticket", "search_tickets",
        "assign_ticket", "close_ticket", "set_priority",
        "set_status", "add_tags", "reply_public",
        "comment_internal", "list_users"
      ]
    },
    params: {
      type: "object",
      additionalProperties: true
    }
  },
  required: ["action", "params"]
};

// Build OpenAI request
const openaiRequest = {
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "gorgias_action",
      strict: true,
      schema: schema
    }
  },
  temperature: 0.3,
  max_tokens: 500
};

return [{
  json: {
    ...openaiRequest,
    correlation_id: parseSlackData.correlation_id,
    user_message: userMessage
  }
}];
*/

// ============================================================================
// ALTERNATIVE: Pre-resolve User Names Before OpenAI
// ============================================================================

// If you want to resolve user names BEFORE sending to OpenAI,
// create a new node called "Resolve User References" before "Build OpenAI Request":

/*
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get user message
const parseSlackData = $('Parse Slack').first().json;
const userMessage = parseSlackData.user_text.toLowerCase();

// Check if message contains user assignment
const assignPattern = /assign.*(?:to|for)\s+([a-z]+(?:\s+[a-z]+)?)/i;
const match = userMessage.match(assignPattern);

let resolvedUserId = null;
let resolvedUserName = null;

if (match) {
  const nameToResolve = match[1].trim();
  console.log(`🔍 Detected assignment to: "${nameToResolve}"`);

  // Look up user
  const { data } = await supabase.rpc('find_user_by_name', {
    search_term: nameToResolve
  });

  if (data && data.length > 0) {
    resolvedUserId = data[0].gorgias_user_id;
    resolvedUserName = data[0].gorgias_name;
    console.log(`✅ Resolved to: ${resolvedUserName} (ID: ${resolvedUserId})`);
  } else {
    console.log(`❌ Could not resolve user: "${nameToResolve}"`);
  }
}

return [{
  json: {
    ...parseSlackData,
    resolved_user_id: resolvedUserId,
    resolved_user_name: resolvedUserName,
    original_message: parseSlackData.user_text
  }
}];
*/

// ============================================================================
// TESTING
// ============================================================================

// Test commands to try:
// - "assign ticket 18401 to spencer"
// - "assign ticket 18401 to spence" (alias)
// - "assign this to collin"
// - "who can I assign tickets to?"
// - "assign ticket 18401 to john" (should fail gracefully)

// Verification query in Supabase:
/*
SELECT * FROM find_user_by_name('spencer');
SELECT * FROM find_user_by_name('spence');
SELECT * FROM find_user_by_name('smith');
*/

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/*
Problem: User not found
Solution: Check aliases array, ensure user is active

Problem: Multiple matches
Solution: Use more specific name or add unique aliases

Problem: Bot not using correct ID
Solution: Check that systemPrompt includes user list properly

Problem: Supabase connection fails
Solution: Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in n8n
*/
