// Format Error for Slack
// Creates user-friendly error message for Slack notification

const error = $json;

// Get thread and channel info from Parse Slack node
let threadTs = 'unknown';
let channel = 'unknown';

try {
  const parseSlack = $('Parse Slack').first().json;
  threadTs = parseSlack.thread_ts;
  channel = parseSlack.channel;
} catch (e) {
  console.log('⚠️ Could not retrieve Slack context');
}

// Map error types to user-friendly messages
const errorTypeMessages = {
  'HTTPError': '🌐 Network error while communicating with the API',
  'ValidationError': '⚠️ Invalid data provided',
  'AuthenticationError': '🔒 Authentication failed',
  'NotFoundError': '🔍 Resource not found',
  'RateLimitError': '⏱️ Rate limit exceeded, please try again shortly',
  'UnknownError': '❓ An unexpected error occurred'
};

// Get user-friendly error type message
const errorTypeMessage = errorTypeMessages[error.error_type] || errorTypeMessages['UnknownError'];

// Build detailed error message
let errorDetails = `*Action:* ${error.action}\n*Error:* ${error.error_message}`;

// Add HTTP status if available
if (error.http_status) {
  errorDetails += `\n*Status Code:* ${error.http_status}`;
}

// Add node name if available
if (error.node && error.node !== 'unknown') {
  errorDetails += `\n*Failed at:* ${error.node}`;
}

// Format the complete Slack message
const text = `❌ *Error Processing Your Request*

${errorTypeMessage}

${errorDetails}

*When:* ${new Date(error.timestamp).toLocaleString()}

_If this persists, please contact support with this ID:_
\`${error.correlation_id}\``;

// Return formatted message with Slack context
return [{
  json: {
    text: text,
    thread_ts: threadTs,
    channel: channel,
    correlation_id: error.correlation_id,
    error_type: error.error_type
  }
}];
