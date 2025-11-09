// ============================================================================
// UNIVERSAL HTTP EXECUTOR NODE
// ============================================================================
// Purpose: Replaces "Route by Action" switch + all 20+ HTTP Request nodes
// Input: OpenAI function call response
// Output: HTTP response from Gorgias API
// Position: After "Handle Plan Response", replaces entire routing section
// ============================================================================

console.log('═══════════════════════════════════════');
console.log('🚀 Universal HTTP Executor');
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 1: Extract Function Call from LLM Response
// ═══════════════════════════════════════

const llmResponse = $('OpenAI Structured Output').first().json;

let functionCall;
try {
  functionCall = llmResponse.choices[0].message.tool_calls[0];
} catch (e) {
  throw new Error('No function call found in LLM response');
}

const actionId = functionCall.function.name;
const actionArgs = JSON.parse(functionCall.function.arguments);

console.log('🎯 Action ID:', actionId);
console.log('📦 Arguments:', JSON.stringify(actionArgs, null, 2));

// ═══════════════════════════════════════
// STEP 2: Load Schema from Supabase
// ═══════════════════════════════════════

let schema;
try {
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
    throw new Error(`Schema fetch failed: ${response.status}`);
  }

  const data = await response.json();
  schema = data[0].schema_data;

  console.log('✅ Schema loaded');
} catch (error) {
  console.error('❌ Failed to load schema:', error.message);
  throw error;
}

// ═══════════════════════════════════════
// STEP 3: Find Endpoint Definition
// ═══════════════════════════════════════

const endpoint = schema.endpoints.find(e => e.id === actionId);

if (!endpoint) {
  throw new Error(`Unknown action: ${actionId}. Available actions: ${schema.endpoints.map(e => e.id).join(', ')}`);
}

console.log('📍 Endpoint found:', endpoint.method, endpoint.path);

// ═══════════════════════════════════════
// STEP 4: Build HTTP Request
// ═══════════════════════════════════════

const baseUrl = schema.base_url;
let path = endpoint.path;
const method = endpoint.method;

// Replace path parameters (e.g., /tickets/{ticket_id} → /tickets/12345)
Object.keys(actionArgs).forEach(key => {
  const placeholder = `{${key}}`;
  if (path.includes(placeholder)) {
    path = path.replace(placeholder, actionArgs[key]);
    console.log(`  ✅ Path param: ${key} = ${actionArgs[key]}`);
  }
});

// Build query string for GET requests
const queryParams = new URLSearchParams();
let queryParamNames = [];

if (method === 'GET' && endpoint.parameters?.query) {
  endpoint.parameters.query.forEach(param => {
    const value = actionArgs[param.name];
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(param.name, value);
      queryParamNames.push(param.name);
      console.log(`  ✅ Query param: ${param.name} = ${value}`);
    }
  });
}

const queryString = queryParams.toString();
const url = `${baseUrl}${path}${queryString ? '?' + queryString : ''}`;

// Build request body for POST/PUT/PATCH
let body = null;
let bodyParams = {};

if (['POST', 'PUT', 'PATCH'].includes(method)) {
  // For body params, exclude path and query params
  const excludeKeys = [
    ...(endpoint.parameters?.path?.map(p => p.name) || []),
    ...queryParamNames
  ];

  Object.keys(actionArgs).forEach(key => {
    if (!excludeKeys.includes(key)) {
      bodyParams[key] = actionArgs[key];
    }
  });

  // Special handling based on endpoint
  if (actionId === 'create_ticket') {
    // Gorgias create_ticket requires specific structure
    body = JSON.stringify({
      customer: {
        email: bodyParams.customer_email || bodyParams.email
      },
      messages: [{
        sender: {
          email: bodyParams.customer_email || bodyParams.email
        },
        body_text: bodyParams.message,
        channel: 'api',
        via: 'api'
      }],
      subject: bodyParams.subject,
      priority: bodyParams.priority || 'normal',
      status: 'open',
      channel: 'api',
      via: 'api'
    });
  } else if (actionId === 'assign_ticket') {
    // assign_ticket expects assignee_user object
    body = JSON.stringify({
      assignee_user: {
        email: bodyParams.assignee_email
      }
    });
  } else if (actionId === 'close_ticket' || actionId === 'set_status') {
    // Status update
    body = JSON.stringify({
      status: bodyParams.status || 'closed'
    });
  } else if (actionId === 'set_priority') {
    // Priority update
    body = JSON.stringify({
      priority: bodyParams.priority
    });
  } else if (actionId === 'search_tickets') {
    // Search endpoint
    body = JSON.stringify({
      search: bodyParams.search || bodyParams.query || '',
      filters: bodyParams.filters || ''
    });
  } else {
    // Default: pass through all body params
    body = JSON.stringify(bodyParams);
  }

  console.log('  📦 Request body:', body);
}

// ═══════════════════════════════════════
// STEP 5: Build Headers
// ═══════════════════════════════════════

const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

// Add authentication based on schema
if (schema.auth.type === 'basic') {
  // Fetch credentials from n8n
  const email = $vars.GORGIAS_EMAIL;
  const apiKey = $vars.GORGIAS_API_KEY;

  const basicAuth = Buffer.from(`${email}:${apiKey}`).toString('base64');
  headers['Authorization'] = `Basic ${basicAuth}`;

  console.log('🔐 Auth: Basic (from credentials)');
}

// ═══════════════════════════════════════
// STEP 6: Execute HTTP Request
// ═══════════════════════════════════════

console.log('───────────────────────────────────────');
console.log('📤 Executing HTTP Request:');
console.log('  Method:', method);
console.log('  URL:', url);
console.log('  Action:', actionId);
console.log('───────────────────────────────────────');

const startTime = Date.now();

let httpResponse;
try {
  httpResponse = await fetch(url, {
    method: method,
    headers: headers,
    ...(body && { body: body })
  });

  const duration = Date.now() - startTime;

  console.log('✅ HTTP Response:');
  console.log('  Status:', httpResponse.status, httpResponse.statusText);
  console.log('  Duration:', duration, 'ms');

} catch (error) {
  console.error('❌ HTTP Request failed:', error.message);
  throw new Error(`HTTP request failed: ${error.message}`);
}

// ═══════════════════════════════════════
// STEP 7: Parse Response
// ═══════════════════════════════════════

let responseData;
try {
  responseData = await httpResponse.json();
} catch (e) {
  console.warn('⚠️ Failed to parse JSON response, returning text');
  responseData = await httpResponse.text();
}

// Check for HTTP errors
if (!httpResponse.ok) {
  console.error('❌ HTTP Error:', httpResponse.status);
  console.error('Response:', responseData);

  throw new Error(`HTTP ${httpResponse.status}: ${JSON.stringify(responseData)}`);
}

// ═══════════════════════════════════════
// STEP 8: Extract Data Based on Schema
// ═══════════════════════════════════════

let extractedData = responseData;

if (endpoint.response?.path) {
  // Navigate to the data using path (e.g., "body.data" → responseData.body.data)
  const pathParts = endpoint.response.path.split('.');

  pathParts.forEach(part => {
    if (extractedData && extractedData[part] !== undefined) {
      extractedData = extractedData[part];
    }
  });

  console.log('✅ Extracted data using path:', endpoint.response.path);
}

// ═══════════════════════════════════════
// STEP 9: Check for Post-Processing
// ═══════════════════════════════════════

let requiresPostProcessing = false;
let postProcessor = null;

if (endpoint.post_process && schema.post_processors?.[endpoint.post_process]) {
  requiresPostProcessing = true;
  postProcessor = schema.post_processors[endpoint.post_process];

  console.log('🔄 Post-processing required:', endpoint.post_process);
  console.log('  Route to:', postProcessor.route_to);
}

// ═══════════════════════════════════════
// STEP 10: Return Structured Response
// ═══════════════════════════════════════

console.log('═══════════════════════════════════════');
console.log('✅ Execution Complete');
console.log('  Action:', actionId);
console.log('  Status:', httpResponse.status);
console.log('  Data items:', Array.isArray(extractedData) ? extractedData.length : 'single object');
console.log('═══════════════════════════════════════');

return [{
  json: {
    // Core response data
    action: actionId,
    endpoint: endpoint.path,
    method: endpoint.method,
    status_code: httpResponse.status,
    success: httpResponse.ok,
    data: extractedData,

    // Response metadata
    response_type: endpoint.response?.type || 'unknown',
    requires_post_processing: requiresPostProcessing,
    post_processor: postProcessor,

    // Request metadata (for debugging/logging)
    request: {
      url: url,
      method: method,
      args: actionArgs,
      body: body ? JSON.parse(body) : null
    },

    // Slack context (carry forward)
    correlation_id: $('Parse Slack').first().json.correlation_id,
    slack_channel: $('Parse Slack').first().json.channel,
    slack_thread_ts: $('Parse Slack').first().json.thread_ts,
    user_id: $('Parse Slack').first().json.user_id
  }
}];
