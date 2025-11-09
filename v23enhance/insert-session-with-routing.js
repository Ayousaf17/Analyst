// ============================================================================
// NODE: Insert Session (UPDATED FOR AGENTIC ROUTER)
// ============================================================================
// Purpose: Log session start with routing metadata
// Position: After each path's initial processing
// Changes: Added routing_strategy, routing_confidence, routing_reasoning
// ============================================================================

// This code should be added to EACH path's "Insert Session" node
// (v23 path, Agent path, Analytics path, Hybrid path)

const sessionData = $json;  // From Format Session or equivalent
const parseSlackData = $('Parse Slack').first().json;
const routerData = $('Meta-Agent Router').first().json;

// Build session record
const sessionRecord = {
  user_id: sessionData.user_id || parseSlackData.user_id,
  channel: sessionData.channel_id || parseSlackData.channel,
  raw_text: sessionData.command || parseSlackData.user_text,
  action: sessionData.intent || sessionData.action || 'unknown',
  origin: sessionData.agent_mode || 'agentic-router',
  thread_ts: sessionData.thread_ts || parseSlackData.thread_ts,
  correlation_id: sessionData.correlation_id || parseSlackData.correlation_id,
  
  // NEW: Routing metadata
  extra: {
    routing_strategy: routerData.routing_strategy,
    routing_confidence: routerData.routing_confidence,
    routing_reasoning: routerData.routing_reasoning,
    detected_entities: routerData.detected_entities,
    routing_time_ms: routerData.routing_time_ms
  }
};

console.log('📝 Logging session with routing metadata');
console.log('  Strategy used:', routerData.routing_strategy);
console.log('  Confidence:', (routerData.routing_confidence * 100).toFixed(1) + '%');

return [{
  json: sessionRecord
}];
