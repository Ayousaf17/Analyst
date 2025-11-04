// ============================================
// Expand Plan - FIXED VERSION
// ============================================
// Handles both formats:
// 1. Plan array format: { plan: [{step: 1, action: "..."}] }
// 2. Flat format: { action: "list_tickets", ... }
// ============================================

const sessionData = $('Format Session').first().json;
const parseSlackData = $('Parse Slack').first().json;

console.log('═══════════════════════════════════════');
console.log('📤 Expand Plan - Input Analysis');
console.log('═══════════════════════════════════════');
console.log('Session Data:', JSON.stringify(sessionData, null, 2));

let plan = [];

// ============================================
// FORMAT 1: Plan array format
// ============================================
if (sessionData.plan && Array.isArray(sessionData.plan) && sessionData.plan.length > 0) {
  plan = sessionData.plan;
  console.log('✅ Format 1: Found plan array with', plan.length, 'steps');
}

// ============================================
// FORMAT 2: Flat format (action directly on object)
// ============================================
else if (sessionData.action) {
  console.log('✅ Format 2: Found flat action format:', sessionData.action);

  // Convert flat format to plan array format
  plan = [{
    step: 1,
    action: sessionData.action,
    // Include any additional parameters that might be in sessionData
    ...(sessionData.status && { status: sessionData.status }),
    ...(sessionData.ticket_id && { ticket_id: sessionData.ticket_id }),
    ...(sessionData.query && { query: sessionData.query }),
    ...(sessionData.limit && { limit: sessionData.limit }),
    ...(sessionData.since && { since: sessionData.since }),
    ...(sessionData.until && { until: sessionData.until }),
    ...(sessionData.customer_email && { customer_email: sessionData.customer_email }),
    ...(sessionData.assignee && { assignee: sessionData.assignee })
  }];

  console.log('🔄 Converted to plan format:', JSON.stringify(plan, null, 2));
}

// ============================================
// FALLBACK: Create default plan
// ============================================
else {
  console.log('⚠️  No plan or action found - creating fallback');

  // Infer from user text as last resort
  const userText = sessionData.raw_text || parseSlackData.user_text || '';
  const lowerText = userText.toLowerCase();

  let action = 'conversational';
  let params = {};

  if (/get\s+ticket\s+(\d+)/.test(lowerText)) {
    const match = lowerText.match(/get\s+ticket\s+(\d+)/);
    action = 'get_ticket';
    params = { ticket_id: match[1] };
  } else if (/(show|list|display).*tickets?/.test(lowerText)) {
    action = 'list_tickets';
    params = { status: lowerText.includes('open') ? 'open' : null, limit: 50 };
  } else if (/(analyze|insights?)/.test(lowerText)) {
    action = 'analyze_insights';
    params = { period: '30d' };
  } else if (/(search|find).*tickets?/.test(lowerText)) {
    action = 'search_tickets';
    const queryMatch = lowerText.match(/(?:about|for)\s+(.+)$/);
    params = { query: queryMatch ? queryMatch[1] : userText, limit: 10 };
  }

  plan = [{
    step: 1,
    action: action,
    ...params
  }];

  console.log('🔄 Created fallback plan:', JSON.stringify(plan, null, 2));
}

// ============================================
// OUTPUT: Create items for execution
// ============================================

console.log('───────────────────────────────────────');
console.log('📦 Creating', plan.length, 'execution items');

const items = plan.map((step, index) => {
  const item = {
    step: step.step || (index + 1),
    action: step.action,
    correlation_id: sessionData.correlation_id || parseSlackData.correlation_id,
    slack_channel: sessionData.channel || parseSlackData.channel,
    slack_thread_ts: sessionData.thread_ts || parseSlackData.thread_ts,
    user_id: sessionData.user_id || parseSlackData.user_id,
    user_text: sessionData.raw_text || parseSlackData.user_text,
    session_id: sessionData.session_id
  };

  // Copy all action parameters
  Object.keys(step).forEach(key => {
    if (!['step', 'action'].includes(key)) {
      item[key] = step[key];
    }
  });

  console.log(`  Step ${item.step}: ${item.action}`);

  return { json: item };
});

console.log('═══════════════════════════════════════');
console.log('✅ Returning', items.length, 'items');
console.log('═══════════════════════════════════════');

return items;
