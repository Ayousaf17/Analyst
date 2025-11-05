// FIXED: Format Clarification Response
// Updated to handle flattened data structure with correct field names

const action = $json.action;
const question = $json.question || $json.clarification_question || 'Could you provide more details?';
const channel = $json.slack_channel || $json.channel;
const threadTs = $json.slack_thread_ts || $json.thread_ts;
const correlationId = $json.correlation_id;

console.log('📥 Format Clarification Response - Input:', JSON.stringify($json, null, 2));
console.log('❓ Question to ask:', question);
console.log('📍 Channel:', channel);
console.log('🧵 Thread:', threadTs);

// Validate we have required fields
if (!channel) {
  throw new Error('Missing slack_channel or channel field');
}

if (!question) {
  throw new Error('Missing question field - check Handle Plan Response output');
}

return [{
  json: {
    text: `❓ ${question}`,
    channel: channel,
    thread_ts: threadTs,
    correlation_id: correlationId
  }
}];
