// ============================================================================
// NODE: Enrich Context
// ============================================================================
// Purpose: Extract last ticket, user, and action from conversation memory
// Position: After "Parse Slack", before "Build OpenAI Request"
// Execution time: ~50ms
// ============================================================================

const parseSlackData = $json;
const userText = parseSlackData.user_text;
const threadTs = parseSlackData.thread_ts;

console.log('═══════════════════════════════════════');
console.log('🔍 Enrich Context - Starting');
console.log('═══════════════════════════════════════');
console.log('User text:', userText);
console.log('Thread:', threadTs);

// ============================================================================
// STEP 1: Get Conversation Memory (from Simple Memory node)
// ============================================================================

let memory = [];
try {
  // Access the memory node output from previous conversations
  // This leverages your existing Simple Memory1 node with 10-message window
  const memoryNode = $('Simple Memory1');
  if (memoryNode && memoryNode.all) {
    memory = memoryNode.all().map(item => item.json);
  }
  
  console.log('✅ Retrieved', memory.length, 'messages from memory');
} catch (e) {
  console.log('⚠️ Could not access memory:', e.message);
  memory = [];
}

// ============================================================================
// STEP 2: Extract Last Ticket Mentioned
// ============================================================================

let lastTicketMentioned = null;

// Regex patterns for ticket IDs
const ticketPatterns = [
  /ticket\s+#?(\d{5,})/i,      // "ticket 12345" or "ticket #12345"
  /\b#(\d{5,})\b/i,             // "#12345"
  /\bticket_id[:\s]+(\d{5,})/i, // "ticket_id: 12345"
  /\b(\d{8,})\b/                // Any 8+ digit number (Gorgias ticket IDs are long)
];

// Search through memory (most recent first)
for (let i = memory.length - 1; i >= 0; i--) {
  const message = memory[i];
  const text = message.text || message.content || '';
  
  for (const pattern of ticketPatterns) {
    const match = text.match(pattern);
    if (match) {
      lastTicketMentioned = match[1];
      console.log(`✅ Found last ticket: ${lastTicketMentioned} (from ${i} messages ago)`);
      break;
    }
  }
  
  if (lastTicketMentioned) break;
}

if (!lastTicketMentioned) {
  console.log('ℹ️ No ticket found in memory');
}

// ============================================================================
// STEP 3: Extract Last User/Assignee Mentioned
// ============================================================================

let lastUserMentioned = null;

// Known team member mappings (customize for your team)
const teamMembers = {
  'spencer': 'spencer@ironsidecomputers.com',
  'alex': 'alex@ironsidecomputers.com',
  'jamie': 'jamie@ironsidecomputers.com',
  'taylor': 'taylor@ironsidecomputers.com',
  'jordan': 'jordan@ironsidecomputers.com'
};

// Email pattern
const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;

// Search through memory
for (let i = memory.length - 1; i >= 0; i--) {
  const message = memory[i];
  const text = (message.text || message.content || '').toLowerCase();
  
  // Check for email addresses
  const emailMatch = text.match(emailPattern);
  if (emailMatch) {
    lastUserMentioned = emailMatch[0];
    console.log(`✅ Found last user: ${lastUserMentioned} (from ${i} messages ago)`);
    break;
  }
  
  // Check for team member first names
  for (const [firstName, email] of Object.entries(teamMembers)) {
    if (text.includes(firstName)) {
      lastUserMentioned = email;
      console.log(`✅ Found last user: ${firstName} → ${lastUserMentioned}`);
      break;
    }
  }
  
  if (lastUserMentioned) break;
}

if (!lastUserMentioned) {
  console.log('ℹ️ No user found in memory');
}

// ============================================================================
// STEP 4: Extract Last Action Performed
// ============================================================================

let lastAction = null;

// Action patterns
const actionPatterns = {
  'viewed': /viewed|showed|displayed|got ticket/i,
  'closed': /closed|resolved/i,
  'assigned': /assigned to/i,
  'searched': /searched|found/i,
  'listed': /listed|showed.*tickets/i
};

// Search through memory
for (let i = memory.length - 1; i >= 0; i--) {
  const message = memory[i];
  const text = message.text || message.content || '';
  
  for (const [action, pattern] of Object.entries(actionPatterns)) {
    if (pattern.test(text)) {
      lastAction = action;
      console.log(`✅ Found last action: ${lastAction} (from ${i} messages ago)`);
      break;
    }
  }
  
  if (lastAction) break;
}

if (!lastAction) {
  console.log('ℹ️ No action found in memory');
}

// ============================================================================
// STEP 5: Build Context String
// ============================================================================

const contextParts = [];

if (lastTicketMentioned) {
  contextParts.push(`Last ticket: #${lastTicketMentioned}`);
}

if (lastUserMentioned) {
  contextParts.push(`Last user: ${lastUserMentioned}`);
}

if (lastAction) {
  contextParts.push(`Last action: ${lastAction}`);
}

const contextString = contextParts.length > 0
  ? `[Context: ${contextParts.join(' | ')}]\n\n`
  : '';

console.log('───────────────────────────────────────');
console.log('📦 Context Summary:');
console.log('  Last ticket:', lastTicketMentioned || 'none');
console.log('  Last user:', lastUserMentioned || 'none');
console.log('  Last action:', lastAction || 'none');
console.log('═══════════════════════════════════════');

// ============================================================================
// STEP 6: Return Enriched Data
// ============================================================================

return [{
  json: {
    ...parseSlackData,
    
    // Original data
    original_text: userText,
    
    // Enriched data
    user_text_with_context: `${contextString}User: ${userText}`,
    context_string: contextString,
    
    // Extracted entities
    last_ticket: lastTicketMentioned,
    last_user: lastUserMentioned,
    last_action: lastAction,
    
    // Metadata
    has_context: contextParts.length > 0,
    context_count: contextParts.length
  }
}];
