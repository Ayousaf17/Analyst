// SIMPLE FIX: Build Search Request with Filters
// Use /api/tickets endpoint which supports query parameters for filtering

const input = $json;

// Build query parameters for /api/tickets endpoint
const queryParams = {};

// Add status filter
if (input.status && input.status !== '' && input.status !== 'all') {
  queryParams.status = input.status;
}

// Add priority filter
if (input.priority && input.priority !== '') {
  queryParams.priority = input.priority;
}

// Add assignee email filter
if (input.assignee_email && input.assignee_email !== '') {
  queryParams.assignee_email = input.assignee_email;
}

// Add limit
queryParams.limit = input.limit || 50;

// Add order_by
queryParams.order_by = 'created_datetime:desc';

console.log('🔍 Query Parameters:', JSON.stringify(queryParams, null, 2));

return [{
  json: queryParams
}];
