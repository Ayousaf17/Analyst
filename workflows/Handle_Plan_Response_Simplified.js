// ============================================
// Handle Plan Response - SIMPLIFIED (HTTP Request Version)
// ============================================
// This version simply extracts the plan from OpenAI HTTP response
// Much simpler than AI Agent version because HTTP Request guarantees valid JSON
// ============================================

const httpResponse = $json;

console.log('═══════════════════════════════════════');
console.log('🔍 Handle Plan Response (HTTP Version)');
console.log('═══════════════════════════════════════');

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

let plan = [];

// Extract plan from OpenAI HTTP response
// OpenAI returns: { choices: [{ message: { content: "{\"plan\": [...]}" } }] }

try {
  // Parse the JSON string from content
  const content = httpResponse.choices[0].message.content;
  const parsed = JSON.parse(content);

  if (parsed.plan && Array.isArray(parsed.plan)) {
    plan = parsed.plan;
    console.log('✅ Successfully extracted plan with', plan.length, 'steps');
  } else {
    console.error('❌ No plan array found in response');
    plan = [{
      step: 1,
      action: 'list_tickets',
      status: 'open',
      limit: 50
    }];
  }
} catch (e) {
  console.error('❌ Failed to parse OpenAI response:', e.message);
  console.error('Raw response:', JSON.stringify(httpResponse, null, 2));

  // Fallback plan
  plan = [{
    step: 1,
    action: 'list_tickets',
    status: 'open',
    limit: 50
  }];
}

console.log('📤 Final plan:', JSON.stringify(plan, null, 2));
console.log('═══════════════════════════════════════');

// Return plan in expected format
return [{
  json: {
    plan: plan,
    user_text: userText,
    channel: channel,
    thread_ts: threadTs
  }
}];
