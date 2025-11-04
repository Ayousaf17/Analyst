// ============================================
// Handle Plan Response - FIXED VERSION
// ============================================
// Extracts action from planAiOutput.output.plan array
// With smart fallback when plan is empty
// ============================================

const planAiOutput = $json;

console.log('═══════════════════════════════════════');
console.log('🔍 Handle Plan Response - FIXED');
console.log('═══════════════════════════════════════');
console.log('📥 RAW Input:', JSON.stringify(planAiOutput, null, 2));

// Get user context
const userText = $('Parse Slack').first().json.user_text;
const channel = $('Parse Slack').first().json.channel;
const threadTs = $('Parse Slack').first().json.thread_ts;

console.log('👤 User Context:');
console.log('  User Text:', userText);

// ============================================
// EXTRACT PLAN FROM OUTPUT
// ============================================

let plan = [];

// The schema outputs: { "output": { "plan": [...] } }
if (planAiOutput?.output?.plan && Array.isArray(planAiOutput.output.plan)) {
  plan = planAiOutput.output.plan;
  console.log('✅ Extracted plan array:', plan.length, 'steps');
} else if (planAiOutput.output && typeof planAiOutput.output === 'object' && Object.keys(planAiOutput.output).length === 0) {
  console.log('⚠️  Empty output.plan - will use fallback inference');
  plan = [];
} else {
  console.log('❌ Could not find plan array in output');
  plan = [];
}

// ============================================
// FALLBACK: INFER ACTION FROM USER TEXT
// ============================================

if (plan.length === 0) {
  console.log('🔄 Plan array empty - using text pattern inference');

  const lowerText = userText.toLowerCase();
  let inferredStep = { step: 1 };

  // Pattern matching (in priority order)
  if (/get\s+ticket\s+(\d+)/.test(lowerText)) {
    const match = lowerText.match(/get\s+ticket\s+(\d+)/);
    inferredStep.action = 'get_ticket';
    inferredStep.ticket_id = match[1];

  } else if (/(show|list|display)\s+(open|closed)?\s*tickets?/.test(lowerText)) {
    inferredStep.action = 'list_tickets';
    inferredStep.limit = 50;

    // Extract status
    if (lowerText.includes('open')) {
      inferredStep.status = 'open';
    } else if (lowerText.includes('closed')) {
      inferredStep.status = 'closed';
    } else {
      inferredStep.status = 'open'; // Default to open
    }

  } else if (/(analyze|analysis|insights?|show me insights)/.test(lowerText)) {
    inferredStep.action = 'analyze_insights';
    inferredStep.period = '30d';
    inferredStep.focus = 'all';

    // Extract time period
    if (lowerText.match(/last\s+(\d+)\s+days?/)) {
      const match = lowerText.match(/last\s+(\d+)\s+days?/);
      const days = parseInt(match[1]);
      if (days <= 7) {
        inferredStep.period = '7d';
      } else if (days <= 30) {
        inferredStep.period = '30d';
      } else {
        inferredStep.period = '90d';
      }
    }

  } else if (/(search|find)\s+tickets?/.test(lowerText)) {
    inferredStep.action = 'search_tickets';
    inferredStep.limit = 10;

    // Extract search query (everything after "about" or "for")
    const queryMatch = lowerText.match(/(?:about|for|regarding)\s+(.+)$/);
    inferredStep.query = queryMatch ? queryMatch[1] : userText;

  } else if (/(show|list)\s+customers?/.test(lowerText)) {
    inferredStep.action = 'list_customers';
    inferredStep.limit = 50;

  } else if (/(metrics|performance|stats|team performance)/.test(lowerText)) {
    inferredStep.action = 'list_metrics';

  } else {
    // Default fallback
    inferredStep.action = 'list_tickets';
    inferredStep.status = 'open';
    inferredStep.limit = 50;
  }

  plan = [inferredStep];
  console.log('✅ Inferred plan:', JSON.stringify(inferredStep, null, 2));
}

// ============================================
// OUTPUT FOR DOWNSTREAM NODES
// ============================================

// Format Session node expects: { plan: [...] }
const output = {
  plan: plan,
  user_text: userText,
  channel: channel,
  thread_ts: threadTs,
  debug: {
    plan_source: plan.length > 0 && plan[0].action ? 'AI' : 'fallback',
    original_output_empty: planAiOutput?.output && Object.keys(planAiOutput.output).length === 0
  }
};

console.log('───────────────────────────────────────');
console.log('📤 Final Output:');
console.log('  Plan steps:', plan.length);
if (plan.length > 0) {
  console.log('  First action:', plan[0].action);
  console.log('  Parameters:', JSON.stringify(plan[0], null, 2));
}
console.log('═══════════════════════════════════════');

return output;
