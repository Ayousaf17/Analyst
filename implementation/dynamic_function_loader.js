// ============================================================================
// DYNAMIC FUNCTION LOADER NODE
// ============================================================================
// Purpose: Replaces hardcoded "Build OpenAI Request" node
// Input: User text from Parse Slack
// Output: OpenAI request with dynamically loaded function definitions
// Position: Replace "Build OpenAI Request" node in workflow
// ============================================================================

const userText = $json.user_text;

console.log('═══════════════════════════════════════');
console.log('🔧 Dynamic Function Loader');
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 1: Load API Schema from Supabase (with caching)
// ═══════════════════════════════════════

let schema;

// Check if schema is cached in workflow static data
const cacheKey = 'gorgias_schema_v1';
const cacheExpiry = 5 * 60 * 1000; // 5 minutes

// Note: n8n doesn't have built-in workflow-level caching, so we fetch every time
// For production, implement Redis caching or use n8n's workflow variables
try {
  console.log('📥 Fetching schema from Supabase...');

  const response = await fetch(
    `${$vars.SUPABASE_URL}/rest/v1/api_schemas?service_name=eq.gorgias&version=eq.v1&select=schema_data`,
    {
      headers: {
        'apikey': $vars.SUPABASE_KEY,
        'Authorization': `Bearer ${$vars.SUPABASE_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.length === 0) {
    throw new Error('No schema found for gorgias v1');
  }

  schema = data[0].schema_data;
  console.log('✅ Schema loaded:', schema.endpoints.length, 'endpoints');

} catch (error) {
  console.error('❌ Schema fetch failed:', error.message);

  // FALLBACK: Load from local file (for development/testing)
  console.log('⚠️ Using fallback local schema');

  // In production, this would be a hard error
  // For now, we'll return a minimal working schema
  throw new Error('Schema unavailable - cannot proceed');
}

// ═══════════════════════════════════════
// STEP 2: Convert Schema to OpenAI Function Definitions
// ═══════════════════════════════════════

const functions = schema.endpoints.map(endpoint => {
  console.log(`  📋 Loading function: ${endpoint.id}`);

  const parameters = buildParameterSchema(endpoint.parameters);
  const required = extractRequiredParams(endpoint.parameters);

  return {
    type: "function",
    function: {
      name: endpoint.id,
      description: endpoint.description,
      parameters: {
        type: "object",
        properties: parameters,
        required: required
      }
    }
  };
});

console.log('✅ Generated', functions.length, 'function definitions');

// ═══════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════

/**
 * Build OpenAI parameter schema from endpoint definition
 * Handles query params, path params, and body params
 */
function buildParameterSchema(params) {
  const schema = {};

  if (!params) return schema;

  // Process query parameters (for GET requests)
  if (params.query && Array.isArray(params.query)) {
    params.query.forEach(param => {
      schema[param.name] = {
        type: param.type,
        description: param.description || '',
        ...(param.enum && { enum: param.enum }),
        ...(param.default && { default: param.default })
      };
    });
  }

  // Process path parameters (e.g., {ticket_id} in URL)
  if (params.path && Array.isArray(params.path)) {
    params.path.forEach(param => {
      schema[param.name] = {
        type: param.type,
        description: param.description || ''
      };
    });
  }

  // Process body parameters (for POST/PUT requests)
  if (params.body && typeof params.body === 'object') {
    Object.entries(params.body).forEach(([key, value]) => {
      schema[key] = {
        type: value.type,
        description: value.description || '',
        ...(value.enum && { enum: value.enum }),
        ...(value.default && { default: value.default })
      };
    });
  }

  return schema;
}

/**
 * Extract list of required parameters
 */
function extractRequiredParams(params) {
  const required = [];

  if (!params) return required;

  ['query', 'path', 'body'].forEach(location => {
    if (params[location]) {
      if (Array.isArray(params[location])) {
        // Query/Path params (array format)
        params[location].forEach(param => {
          if (param.required) {
            required.push(param.name);
          }
        });
      } else {
        // Body params (object format)
        Object.entries(params[location]).forEach(([key, value]) => {
          if (value.required) {
            required.push(key);
          }
        });
      }
    }
  });

  return required;
}

// ═══════════════════════════════════════
// STEP 3: Build OpenAI Request
// ═══════════════════════════════════════

const openaiRequest = {
  model: $vars.OPENAI_MODEL || "gpt-4-turbo",
  messages: [
    {
      role: "system",
      content: `You are a Gorgias support ticket assistant. Help users manage support tickets using the available functions.

Important guidelines:
- Use the most specific function for the user's request
- Always extract relevant parameters from user input (status, priority, ticket IDs, etc.)
- If you need clarification, ask before calling a function
- For analytics requests, use analyze_insights function`
    },
    {
      role: "user",
      content: userText
    }
  ],
  tools: functions,
  tool_choice: "auto",
  temperature: parseFloat($vars.OPENAI_TEMPERATURE_PLAN || 0.3),
  max_tokens: parseInt($vars.OPENAI_MAX_TOKENS || 1000)
};

console.log('───────────────────────────────────────');
console.log('📤 OpenAI Request Built:');
console.log('  Model:', openaiRequest.model);
console.log('  Functions:', functions.length);
console.log('  User text:', userText);
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 4: Return OpenAI Request
// ═══════════════════════════════════════

return [{
  json: openaiRequest
}];
