// ============================================
// CONVERSATIONAL RESPONSE AI - FIXED BYPASS
// ============================================
// Only runs if no formatted message was provided
// Otherwise passes through the formatted output
// ============================================

const input = $input.first().json;

console.log('═══════════════════════════════════════');
console.log('💬 Conversational Response AI');
console.log('═══════════════════════════════════════');
console.log('Input keys:', Object.keys(input));
console.log('Has output:', !!input.output);
console.log('Source:', input.source);
console.log('Use conversational AI:', input.use_conversational_ai);
console.log('───────────────────────────────────────');

// BYPASS CHECK: If source is "formatted", pass through unchanged
if (input.source === 'formatted' && input.output) {
  console.log('✅ BYPASS TRIGGERED: Source is formatted');
  console.log('   Passing through formatted output unchanged');
  console.log('   Output length:', input.output.length);
  console.log('═══════════════════════════════════════');

  // Pass through the formatted output unchanged
  return [{
    json: {
      output: input.output
    }
  }];
}

// BYPASS CHECK 2: If we have output and NOT explicitly requesting AI
if (input.output && input.use_conversational_ai !== true) {
  console.log('✅ BYPASS TRIGGERED: Has output, no AI request');
  console.log('   Passing through output unchanged');
  console.log('═══════════════════════════════════════');

  return [{
    json: {
      output: input.output
    }
  }];
}

console.log('🤖 Running Conversational AI');
console.log('   Reason:', input.use_conversational_ai ? 'Explicitly requested' : 'No formatted output available');
console.log('───────────────────────────────────────');

// ============================================
// CONVERSATIONAL AI LOGIC
// ============================================
// This only runs if there's no formatted message

// Get the user's original text
const userText = input.user_text || input.original_input?.user_text || '';
const action = input.action || input.original_action || 'unknown';

console.log('User text:', userText);
console.log('Action:', action);

// Generate conversational fallback response based on action
let response = '';

switch(action) {
  case 'list_tickets':
    response = `📋 I don't see any tickets matching that criteria right now.

Would you like me to try:
• Searching with different filters: "@Gorgias Terminal show tickets from last 7 days"
• Searching by keyword: "@Gorgias Terminal search tickets about [topic]"
• Checking all tickets: "@Gorgias Terminal list tickets"`;
    break;

  case 'get_ticket':
    response = `🎫 I couldn't find that ticket.

Please check:
• The ticket ID is correct
• You have permission to view this ticket
• Try: "@Gorgias Terminal list tickets" to see available tickets`;
    break;

  case 'search_tickets':
    response = `🔍 No tickets found matching "${userText}".

Try:
• Using different keywords
• Checking tickets from a specific time: "@Gorgias Terminal show tickets from last 30 days"
• Viewing all tickets: "@Gorgias Terminal list tickets"`;
    break;

  case 'analyze_tickets':
  case 'get_insights':
    response = `📊 I don't have enough ticket data to provide analytics right now.

This could mean:
• No tickets in the specified time range
• Try a different time period: "@Gorgias Terminal analyze last 90 days"
• View recent tickets: "@Gorgias Terminal list tickets"`;
    break;

  default:
    response = `👋 I'm not sure how to help with that request.

I can help you:
• View tickets: "@Gorgias Terminal show open tickets"
• Get specific ticket: "@Gorgias Terminal get ticket [ID]"
• Search tickets: "@Gorgias Terminal search tickets about [topic]"
• Analyze trends: "@Gorgias Terminal analyze last 30 days"

What would you like to do?`;
}

console.log('Generated response length:', response.length);
console.log('═══════════════════════════════════════');

return [{
  json: {
    output: response
  }
}];
