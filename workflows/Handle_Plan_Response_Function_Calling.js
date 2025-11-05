const httpResponse = $json;

console.log('═══════════════════════════════════════');
console.log('🔍 Handle Plan Response (Function Calling)');
console.log('═══════════════════════════════════════');

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;
const correlationId = $('Parse Slack').first().json.correlation_id || '';
const userId = $('Parse Slack').first().json.user_id || '';

let plan = [];

// Extract function call from OpenAI response
try {
  const message = httpResponse.choices[0].message;

  // Check if OpenAI called a function
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    console.log('✅ Function called:', functionName);
    console.log('✅ Arguments:', JSON.stringify(functionArgs, null, 2));

    // Convert to plan format
    plan = [{
      step: 1,
      action: functionName,
      ...functionArgs  // Spread all arguments into the plan
    }];

  } else {
    console.log('⚠️ No function call detected');

    // Check if OpenAI responded with text (asking clarification)
    if (message.content && message.content.trim() !== '') {
      console.log('✅ OpenAI asked clarifying question:', message.content);

      // Treat this as ask_clarification
      plan = [{
        step: 1,
        action: 'ask_clarification',
        question: message.content
      }];
    } else {
      console.error('❌ No function call and no text content');

      // Fallback
      plan = [{
        step: 1,
        action: 'list_tickets',
        status: 'open',
        limit: 50
      }];
    }
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
    thread_ts: threadTs,
    correlation_id: correlationId,
    user_id: userId
  }
}];
