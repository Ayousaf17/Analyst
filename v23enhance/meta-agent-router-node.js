// ============================================================================
// NODE: Meta-Agent Router
// ============================================================================
// Purpose: Analyzes user query and decides which execution path to use
// Position: Between "Parse Slack" and routing Switch node
// Execution time: ~100ms
// Cost: ~$0.00005 per request
// ============================================================================

const parseSlackData = $json;
const userText = parseSlackData.user_text;
const correlationId = parseSlackData.correlation_id;

console.log('═══════════════════════════════════════');
console.log('🧠 Meta-Agent Router - Starting Analysis');
console.log('═══════════════════════════════════════');
console.log('User text:', userText);

// ============================================================================
// STEP 1: Define Routing Strategies
// ============================================================================

const ROUTING_STRATEGIES = {
  v23: {
    description: "Use v23's structured function calling path",
    when_to_use: [
      "Query has explicit ticket IDs (e.g., 'get ticket 12345')",
      "Query has explicit email addresses",
      "Simple, direct commands with clear parameters",
      "Single-action requests"
    ],
    examples: [
      "get ticket 234525253",
      "list open tickets",
      "search tickets with status open",
      "close ticket 12345",
      "assign ticket 234525253 to spencer@ironsidecomputers.com"
    ]
  },
  
  agent: {
    description: "Use AI Agent for natural language understanding",
    when_to_use: [
      "Query uses pronouns ('it', 'that ticket', 'this one')",
      "Query uses first names without emails ('spencer's stuff')",
      "Casual phrasing ('show me urgent')",
      "Needs context resolution from conversation history"
    ],
    examples: [
      "spencer's stuff",
      "show me urgent tickets",
      "close it",
      "assign to alex",
      "what did spencer work on"
    ]
  },
  
  analytics: {
    description: "Use Analytics path for insights and pattern analysis",
    when_to_use: [
      "Query asks for 'insights', 'trends', 'patterns', or 'analysis'",
      "Query asks about recurring issues or common questions",
      "Query wants recommendations or operational improvements",
      "Query asks 'why' or 'what are customers asking about'"
    ],
    examples: [
      "analyze insights",
      "show me trends",
      "what are the most common issues",
      "analyze last 30 days",
      "what should we improve"
    ]
  },
  
  hybrid: {
    description: "Use both v23 AND AI Agent paths in parallel, pick best result",
    when_to_use: [
      "Complex multi-step queries",
      "Query has BOTH explicit parameters AND natural language",
      "Query combines filters with context references",
      "Ambiguous queries that could go either way"
    ],
    examples: [
      "show spencer's urgent tickets from last week",
      "find billing issues and assign to alex",
      "close all tickets about refunds",
      "get urgent tickets assigned to jamie with tag ORDER-STATUS"
    ]
  }
};

// ============================================================================
// STEP 2: Build Meta-Agent System Prompt
// ============================================================================

const systemPrompt = `You are a routing agent for a Gorgias ticket management system.

Your job: Analyze the user's query and decide which execution strategy will work best.

Available strategies:
1. "v23" - Structured function calling (best for explicit IDs, emails, simple commands)
2. "agent" - AI Agent with natural language (best for pronouns, first names, casual phrasing)
3. "analytics" - Deep analysis pipeline (best for insights, trends, patterns)
4. "hybrid" - Both v23 + agent in parallel (best for complex multi-filter queries)

Strategy Details:

${Object.entries(ROUTING_STRATEGIES).map(([name, details]) => `
**${name.toUpperCase()}**
${details.description}
When to use:
${details.when_to_use.map(w => `  - ${w}`).join('\n')}
Examples:
${details.examples.map(e => `  - "${e}"`).join('\n')}
`).join('\n')}

Decision Rules:
1. If query has explicit ticket ID (8+ digit number) → likely "v23"
2. If query has pronouns ("it", "that") → likely "agent"
3. If query asks for "insights" or "trends" → definitely "analytics"
4. If query has BOTH explicit params AND natural language → "hybrid"
5. If unsure → default to "hybrid" (safest option)

Output JSON format:
{
  "strategy": "v23|agent|analytics|hybrid",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why you chose this strategy",
  "detected_entities": {
    "has_ticket_id": true|false,
    "has_email": true|false,
    "has_pronoun": true|false,
    "has_first_name": true|false,
    "is_analytics_query": true|false,
    "is_complex": true|false
  }
}`;

// ============================================================================
// STEP 3: Call GPT-4o-mini for Routing Decision
// ============================================================================

const OPENAI_API_KEY = $vars.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY not found in environment variables');
}

const routingRequest = {
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: `Analyze this query and decide the best routing strategy:\n\n"${userText}"`
    }
  ],
  temperature: 0.3,  // Low temperature for consistent routing
  response_format: { type: "json_object" },
  max_tokens: 300
};

console.log('📤 Calling OpenAI for routing decision...');

const startTime = Date.now();

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: JSON.stringify(routingRequest)
});

const responseData = await response.json();
const endTime = Date.now();

console.log(`✅ Routing decision received (${endTime - startTime}ms)`);

// ============================================================================
// STEP 4: Parse Routing Decision
// ============================================================================

let decision;
try {
  decision = JSON.parse(responseData.choices[0].message.content);
  console.log('📋 Routing decision:', JSON.stringify(decision, null, 2));
} catch (e) {
  console.error('❌ Failed to parse routing decision:', e.message);
  console.error('Raw response:', responseData.choices[0].message.content);
  
  // Fallback to hybrid (safest)
  decision = {
    strategy: 'hybrid',
    confidence: 0.5,
    reasoning: 'Parsing failed, using hybrid as fallback',
    detected_entities: {}
  };
}

// ============================================================================
// STEP 5: Validate Strategy
// ============================================================================

const validStrategies = ['v23', 'agent', 'analytics', 'hybrid'];

if (!validStrategies.includes(decision.strategy)) {
  console.warn(`⚠️ Invalid strategy "${decision.strategy}", defaulting to hybrid`);
  decision.strategy = 'hybrid';
  decision.confidence = 0.5;
  decision.reasoning = 'Invalid strategy returned, using hybrid as fallback';
}

// ============================================================================
// STEP 6: Return Routing Decision
// ============================================================================

console.log('───────────────────────────────────────');
console.log('🎯 Final Routing Decision:');
console.log('  Strategy:', decision.strategy.toUpperCase());
console.log('  Confidence:', (decision.confidence * 100).toFixed(1) + '%');
console.log('  Reasoning:', decision.reasoning);
console.log('═══════════════════════════════════════');

return [{
  json: {
    ...parseSlackData,
    
    // Routing decision
    routing_strategy: decision.strategy,
    routing_confidence: decision.confidence,
    routing_reasoning: decision.reasoning,
    detected_entities: decision.detected_entities || {},
    
    // Metadata
    routing_time_ms: endTime - startTime,
    routing_timestamp: new Date().toISOString(),
    
    // For logging
    meta_agent_decision: {
      strategy: decision.strategy,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      entities: decision.detected_entities
    }
  }
}];
