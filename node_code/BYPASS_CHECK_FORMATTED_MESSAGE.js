// ============================================
// BYPASS NODE: Check Formatted Message
// ============================================
// Place this RIGHT AFTER Universal Table Formatter
// Routes formatted messages directly, bypasses AI for others
// ============================================

const input = $input.first().json;

console.log('═══════════════════════════════════════');
console.log('🔀 Bypass Check: Formatted Message');
console.log('═══════════════════════════════════════');
console.log('Input keys:', Object.keys(input));
console.log('Has formatted_message:', !!input.formatted_message);
console.log('Message length:', input.formatted_message?.length || 0);
console.log('───────────────────────────────────────');

// Check if we have a valid formatted message
const hasFormattedMessage = input.formatted_message
                         && typeof input.formatted_message === 'string'
                         && input.formatted_message.trim().length > 20;

if (hasFormattedMessage) {
  console.log('✅ FORMATTED MESSAGE FOUND');
  console.log('   Bypassing Conversational AI');
  console.log('   Routing directly to Slack');
  console.log('   Preview:', input.formatted_message.substring(0, 100) + '...');

  // Return formatted message as final output
  return [{
    json: {
      output: input.formatted_message,
      source: 'formatted',
      action: input.original_action || 'unknown',
      timestamp: input.timestamp || new Date().toISOString()
    }
  }];

} else {
  console.log('⚠️  NO FORMATTED MESSAGE');
  console.log('   Will use Conversational AI fallback');
  console.log('   Reason:', !input.formatted_message ? 'Missing formatted_message field' : 'Message too short or empty');

  // Return flag to use Conversational AI
  return [{
    json: {
      use_conversational_ai: true,
      original_input: input,
      user_text: input.user_text || '',
      action: input.original_action || 'unknown'
    }
  }];
}

console.log('═══════════════════════════════════════');
