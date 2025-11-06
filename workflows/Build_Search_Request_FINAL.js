// FINAL FIX: Build Search Request - Routes to Correct Endpoint
// Handles both text search AND filtering by using the right endpoint

const input = $json;

// Check what type of search this is
const hasTextQuery = input.query && input.query.trim() !== '';
const hasStatusFilter = input.status && input.status !== '' && input.status !== 'all';
const hasPriorityFilter = input.priority && input.priority !== '';
const hasAssigneeFilter = input.assignee_email && input.assignee_email !== '';
const hasCustomerFilter = input.customer_email && input.customer_email !== '';
const hasTagsFilter = input.tags && input.tags !== '';

const hasAnyFilter = hasStatusFilter || hasPriorityFilter || hasAssigneeFilter || hasCustomerFilter || hasTagsFilter;

console.log('🔍 Search Type:', {
  hasTextQuery,
  hasAnyFilter,
  query: input.query,
  status: input.status,
  priority: input.priority,
  assignee_email: input.assignee_email
});

// CASE 1: Text search ONLY (no filters)
// Use /api/tickets/search endpoint
if (hasTextQuery && !hasAnyFilter) {
  console.log('📤 Using /api/tickets/search (POST) for text search');
  return [{
    json: {
      _use_search_endpoint: true,
      search: input.query,
      filters: ""
    }
  }];
}

// CASE 2: Filters ONLY (no text search)
// Use /api/tickets endpoint with query parameters
if (!hasTextQuery && hasAnyFilter) {
  console.log('📤 Using /api/tickets (GET) for filtering');

  const queryParams = {};

  if (hasStatusFilter) {
    queryParams.status = input.status;
  }

  if (hasPriorityFilter) {
    queryParams.priority = input.priority;
  }

  if (hasAssigneeFilter) {
    queryParams.assignee_email = input.assignee_email;
  }

  queryParams.limit = input.limit || 50;
  queryParams.order_by = 'created_datetime:desc';

  console.log('📋 Query Parameters:', queryParams);

  return [{
    json: {
      _use_search_endpoint: false,
      ...queryParams
    }
  }];
}

// CASE 3: Both text AND filters
// Unfortunately, we can't do both. Prioritize filtering, ignore text.
if (hasTextQuery && hasAnyFilter) {
  console.log('⚠️ Both text and filters provided. Using filters only (text search ignored).');

  const queryParams = {};

  if (hasStatusFilter) {
    queryParams.status = input.status;
  }

  if (hasPriorityFilter) {
    queryParams.priority = input.priority;
  }

  if (hasAssigneeFilter) {
    queryParams.assignee_email = input.assignee_email;
  }

  queryParams.limit = input.limit || 50;
  queryParams.order_by = 'created_datetime:desc';

  return [{
    json: {
      _use_search_endpoint: false,
      ...queryParams
    }
  }];
}

// CASE 4: Neither text nor filters (fallback to list all)
console.log('📤 No search criteria, listing all tickets');
return [{
  json: {
    _use_search_endpoint: false,
    limit: 50,
    order_by: 'created_datetime:desc'
  }
}];
