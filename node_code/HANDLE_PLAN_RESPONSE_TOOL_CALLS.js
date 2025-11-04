// ============================================
// Handle Plan Response - TOOL CALLS PARSER
// ============================================
// This version extracts action from OpenAI tool_calls format
// when Structured Output Parser returns empty output
// ============================================

const planAiOutput = $json;

console.log('═══════════════════════════════════════');
console.log('🔍 DEBUG: Handle Plan Response (Tool Calls Parser)');
console.log('═══════════════════════════════════════');
console.log('📥 RAW Input:', JSON.stringify(planAiOutput, null, 2));

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

let action = 'unknown';
let parameters = {};
let reasoning = '';

// Try to extract from multiple possible formats
if (planAiOutput?.action) {
  // Format 1: Direct action
  action = planAiOutput.action;
  parameters = planAiOutput.parameters || {};
  reasoning = planAiOutput.reasoning || '';
  console.log('✅ Extracted from: planAiOutput.action');

} else if (planAiOutput?.output?.action) {
  // Format 2: Nested in output
  action = planAiOutput.output.action;
  parameters = planAiOutput.output.parameters || {};
  reasoning = planAiOutput.output.reasoning || '';
  console.log('✅ Extracted from: planAiOutput.output.action');

} else if (planAiOutput?.tool_calls && Array.isArray(planAiOutput.tool_calls) && planAiOutput.tool_calls.length > 0) {
  // Format 3: Tool calls format (from OpenAI function calling)
  console.log('🔧 Tool calls detected, extracting...');
  const toolCall = planAiOutput.tool_calls[0];

  if (toolCall.function) {
    action = toolCall.function.name;

    // Parse arguments (might be string or object)
    if (typeof toolCall.function.arguments === 'string') {
      try {
        parameters = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.log('❌ Failed to parse tool call arguments:', e.message);
        parameters = {};
      }
    } else {
      parameters = toolCall.function.arguments || {};
    }

    console.log('✅ Extracted from tool_calls');
    console.log('  Function name:', action);
    console.log('  Arguments:', JSON.stringify(parameters, null, 2));
  }

} else if (planAiOutput?.output && typeof planAiOutput.output === 'object' && Object.keys(planAiOutput.output).length === 0) {
  // Format 4: Empty output (parser failed)
  console.log('⚠️  Empty output detected - trying to infer from user text');

  // Fallback: Infer action from user text
  const lowerText = userText.toLowerCase();

  if (/get\s+ticket\s+(\d+)/.test(lowerText)) {
    action = 'get_ticket';
    const match = lowerText.match(/get\s+ticket\s+(\d+)/);
    parameters = { ticket_id: match[1] };
    reasoning = 'Inferred from user text pattern';

  } else if (/(show|list|display)\s+(open|closed|all)?\s*tickets?/.test(lowerText)) {
    action = 'list_tickets';
    parameters = {};

    // Extract status if mentioned
    if (lowerText.includes('open')) {
      parameters.status = 'open';
    } else if (lowerText.includes('closed')) {
      parameters.status = 'closed';
    }

    // Extract time range if mentioned
    if (lowerText.match(/from\s+(today|yesterday|last\s+\d+\s+days?)/)) {
      const timeMatch = lowerText.match(/from\s+(today|yesterday|last\s+(\d+)\s+days?)/);
      if (timeMatch[1] === 'today') {
        parameters.since = '1 day ago';
      } else if (timeMatch[1] === 'yesterday') {
        parameters.since = '2 days ago';
      } else if (timeMatch[2]) {
        parameters.since = `${timeMatch[2]} days ago`;
      }
    }

    parameters.limit = 10;
    reasoning = 'Inferred from user text pattern';

  } else if (/(analyze|analysis|insights?|metrics?|stats?)/.test(lowerText)) {
    action = 'analyze_tickets';
    parameters = {};

    // Extract time range
    if (lowerText.match(/last\s+(\d+)\s+days?/)) {
      const match = lowerText.match(/last\s+(\d+)\s+days?/);
      parameters.since = `${match[1]} days ago`;
    } else {
      parameters.since = '30 days ago';
    }

    parameters.limit = 100;
    reasoning = 'Inferred from user text pattern';

  } else if (/(search|find)\s+tickets?/.test(lowerText)) {
    action = 'search_tickets';
    // Extract search query (everything after "about" or "for")
    const queryMatch = lowerText.match(/(?:about|for)\s+(.+)$/);
    parameters = {
      query: queryMatch ? queryMatch[1] : userText,
      limit: 10
    };
    reasoning = 'Inferred from user text pattern';

  } else {
    action = 'conversational';
    parameters = {};
    reasoning = 'Could not determine specific action, treating as conversational';
  }

  console.log('🔄 Fallback inference used');
}

console.log('───────────────────────────────────────');
console.log('📤 Final Extracted Values:');
console.log('  Action:', action);
console.log('  Parameters:', JSON.stringify(parameters, null, 2));
console.log('  Reasoning:', reasoning);

// Action-specific validation and defaults
switch(action) {
  case 'get_ticket':
    if (!parameters.ticket_id) {
      // Try to extract from user text
      const match = userText.match(/\d{9,}/);
      if (match) {
        parameters.ticket_id = match[0];
        console.log('  ℹ️  Extracted ticket_id from user text:', parameters.ticket_id);
      } else {
        action = 'error';
        parameters.error_message = 'Missing ticket_id for get_ticket action';
      }
    }
    break;

  case 'list_tickets':
    parameters.limit = parameters.limit || 10;
    console.log('  ℹ️  Set default limit:', parameters.limit);
    break;

  case 'search_tickets':
    if (!parameters.query) {
      parameters.query = userText;
      console.log('  ℹ️  Using full user text as query');
    }
    parameters.limit = parameters.limit || 10;
    break;

  case 'analyze_tickets':
    parameters.since = parameters.since || '30 days ago';
    parameters.limit = parameters.limit || 100;
    console.log('  ℹ️  Set defaults - since:', parameters.since, 'limit:', parameters.limit);
    break;
}

// Build final output
const output = {
  action: action,
  parameters: parameters,
  reasoning: reasoning,
  user_text: userText,
  channel: channel,
  thread_ts: threadTs,
  debug: {
    raw_input_keys: Object.keys(planAiOutput),
    has_output_key: !!planAiOutput.output,
    output_is_empty: planAiOutput.output && typeof planAiOutput.output === 'object' && Object.keys(planAiOutput.output).length === 0,
    has_tool_calls: !!planAiOutput.tool_calls,
    extraction_method: reasoning.includes('Inferred') ? 'fallback_inference' : 'direct_extraction'
  }
};

console.log('═══════════════════════════════════════');
console.log('📦 Final Output:', JSON.stringify(output, null, 2));
console.log('═══════════════════════════════════════');

return output;
