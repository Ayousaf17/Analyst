// Calculate Performance Metrics
// Tracks execution time, API calls, and token usage
// Position: Before Final Slack Reply

// Get start time from Parse Slack node
let startTime = Date.now();
try {
  startTime = $('Parse Slack').first().json.start_timestamp;
} catch (e) {
  console.log('⚠️ Could not retrieve start_timestamp, using current time');
}

const endTime = Date.now();
const executionTimeMs = endTime - startTime;
const executionTimeSeconds = (executionTimeMs / 1000).toFixed(2);

// Get plan from Format Session node
let plan = [];
try {
  plan = $('Format Session').first().json.plan || [];
} catch (e) {
  console.log('⚠️ Could not retrieve plan from Format Session');
}

// Get results
const results = $json.results || [];

// Get correlation ID
let correlationId = 'unknown';
try {
  correlationId = $('Parse Slack').first().json.correlation_id;
} catch (e) {
  console.log('⚠️ Could not retrieve correlation_id');
}

// Count API calls (from Fetch Loop Results if available)
let apiCallsCount = 0;
try {
  const fetchLoopResults = $('Fetch Loop Results').all();
  apiCallsCount = fetchLoopResults.length;
} catch (e) {
  // If Fetch Loop Results not found, estimate from plan length
  apiCallsCount = plan.length;
}

// Estimate token count (rough approximation: ~4 chars per token)
const resultString = JSON.stringify(results);
const estimatedTokens = Math.ceil(resultString.length / 4);

// Primary action
const primaryAction = plan[0]?.action || 'unknown';

// Build metrics object
const metrics = {
  correlation_id: correlationId,
  execution_time_ms: executionTimeMs,
  execution_time_seconds: parseFloat(executionTimeSeconds),
  api_calls_count: apiCallsCount,
  actions_executed: plan.length,
  primary_action: primaryAction,
  result_count: Array.isArray(results) ? results.length : 0,
  token_count_estimate: estimatedTokens,
  timestamp: new Date().toISOString()
};

// Log to console
console.log('📊 Performance Metrics:', {
  execution_time: `${executionTimeSeconds}s`,
  api_calls: apiCallsCount,
  actions: plan.length,
  results: metrics.result_count,
  tokens_est: estimatedTokens
});

// Return original data plus metrics
return [{
  json: {
    ...$json,
    performance_metrics: metrics
  }
}];
