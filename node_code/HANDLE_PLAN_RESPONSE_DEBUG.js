// ============================================
// Handle Plan Response - DEBUGGING VERSION
// ============================================
// This version adds comprehensive logging to see
// exactly what the Planning AI is outputting
// ============================================

const planAiOutput = $json;

// ==== DEBUG SECTION START ====
console.log('═══════════════════════════════════════');
console.log('🔍 DEBUG: Handle Plan Response');
console.log('═══════════════════════════════════════');
console.log('📥 RAW Input (planAiOutput):');
console.log(JSON.stringify(planAiOutput, null, 2));
console.log('───────────────────────────────────────');

// Check all possible locations for action
console.log('🎯 Action Detection:');
console.log('  planAiOutput.action =', planAiOutput?.action);
console.log('  planAiOutput.output =', JSON.stringify(planAiOutput?.output));
console.log('  planAiOutput.output.action =', planAiOutput?.output?.action);
console.log('  planAiOutput.response =', JSON.stringify(planAiOutput?.response));
console.log('  planAiOutput.response.action =', planAiOutput?.response?.action);
console.log('───────────────────────────────────────');

// Check for tool_calls
if (planAiOutput.tool_calls) {
  console.log('🔧 Tool Calls Detected:');
  console.log(JSON.stringify(planAiOutput.tool_calls, null, 2));
}

// Check all keys in the object
console.log('🔑 All Keys in planAiOutput:');
console.log(Object.keys(planAiOutput));
console.log('═══════════════════════════════════════');
// ==== DEBUG SECTION END ====

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

console.log('👤 User Context:');
console.log('  User Text:', userText);
console.log('  Channel:', channel);
console.log('  Thread:', threadTs);

// Extract action and parameters (try multiple paths)
let action = 'unknown';
let parameters = {};
let reasoning = '';

// Try different extraction paths
if (planAiOutput?.action) {
  action = planAiOutput.action;
  parameters = planAiOutput.parameters || {};
  reasoning = planAiOutput.reasoning || '';
  console.log('✅ Found action at: planAiOutput.action');
} else if (planAiOutput?.output?.action) {
  action = planAiOutput.output.action;
  parameters = planAiOutput.output.parameters || {};
  reasoning = planAiOutput.output.reasoning || '';
  console.log('✅ Found action at: planAiOutput.output.action');
} else if (planAiOutput?.response?.action) {
  action = planAiOutput.response.action;
  parameters = planAiOutput.response.parameters || {};
  reasoning = planAiOutput.response.reasoning || '';
  console.log('✅ Found action at: planAiOutput.response.action');
} else if (planAiOutput?.output && typeof planAiOutput.output === 'object' && Object.keys(planAiOutput.output).length === 0) {
  console.log('⚠️  Empty output object detected!');
  action = 'empty_output_error';
} else {
  console.log('❌ Could not find action in any expected location');
  action = 'unknown';
}

console.log('───────────────────────────────────────');
console.log('📤 Extracted Values:');
console.log('  Action:', action);
console.log('  Parameters:', JSON.stringify(parameters, null, 2));
console.log('  Reasoning:', reasoning);
console.log('═══════════════════════════════════════');

// Build output
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
    output_is_empty: planAiOutput.output && typeof planAiOutput.output === 'object' && Object.keys(planAiOutput.output).length === 0
  }
};

console.log('📦 Final Output:');
console.log(JSON.stringify(output, null, 2));
console.log('═══════════════════════════════════════');

return output;
