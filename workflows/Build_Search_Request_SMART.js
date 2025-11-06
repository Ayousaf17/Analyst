// UPDATED: Build Search Request with Filters
// This version intelligently chooses the right endpoint based on query type

const input = $json;

// Determine if this is a text search or filter-only search
const hasTextQuery = input.query && input.query.trim() !== '';
const hasFilters = (input.status && input.status !== '') ||
                   (input.priority && input.priority !== '') ||
                   (input.assignee_email && input.assignee_email !== '') ||
                   (input.customer_email && input.customer_email !== '') ||
                   (input.tags && input.tags !== '');

console.log('🔍 Query Analysis:', {
  hasTextQuery,
  hasFilters,
  query: input.query,
  status: input.status,
  assignee_email: input.assignee_email
});

// APPROACH 1: Text search (use /api/tickets/search)
if (hasTextQuery && !hasFilters) {
  console.log('📤 Using TEXT SEARCH endpoint');
  return [{
    json: {
      _endpoint: 'search',
      _method: 'POST',
      search: input.query,
      filters: ""
    }
  }];
}

// APPROACH 2: Filter-only search (use /api/tickets list endpoint)
if (hasFilters && !hasTextQuery) {
  console.log('📤 Using LIST endpoint with filters');

  const queryParams = {};

  if (input.status && input.status !== '' && input.status !== 'all') {
    queryParams.status = input.status;
  }

  if (input.priority && input.priority !== '') {
    queryParams.priority = input.priority;
  }

  if (input.assignee_email && input.assignee_email !== '') {
    queryParams.assignee_email = input.assignee_email;
  }

  if (input.limit) {
    queryParams.limit = input.limit;
  } else {
    queryParams.limit = 50;
  }

  console.log('📋 Query Params:', queryParams);

  return [{
    json: {
      _endpoint: 'list',
      _method: 'GET',
      _queryParams: queryParams
    }
  }];
}

// APPROACH 3: Both text AND filters (use /api/tickets/search for text, ignore complex filters)
if (hasTextQuery && hasFilters) {
  console.log('⚠️ Mixed search: Using text search only (filters not supported by search endpoint)');
  return [{
    json: {
      _endpoint: 'search',
      _method: 'POST',
      search: input.query,
      filters: ""
    }
  }];
}

// FALLBACK: No query, no filters
console.log('📤 Default: Empty search');
return [{
  json: {
    _endpoint: 'search',
    _method: 'POST',
    search: "",
    filters: ""
  }
}];
