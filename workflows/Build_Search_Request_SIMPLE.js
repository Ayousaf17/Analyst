// SIMPLIFIED: Build Search Request - Text Search Only
// All filtering done client-side after fetch

const input = $json;

const hasTextQuery = input.query && input.query.trim() !== '';

console.log('🔍 Search Query:', input.query || '(none - fetch recent tickets)');

// Simple API request - ONLY text search
const apiRequestBody = {
  search: input.query || "",
  filters: ""
};

// Store ALL filter criteria for client-side filtering
const clientSideFilters = {};

if (input.status && input.status !== '' && input.status !== 'all') {
  clientSideFilters.status = input.status;
}

if (input.priority && input.priority !== '') {
  clientSideFilters.priority = input.priority;
}

if (input.assignee_email && input.assignee_email !== '') {
  clientSideFilters.assignee_email = input.assignee_email;
}

if (input.customer_email && input.customer_email !== '') {
  clientSideFilters.customer_email = input.customer_email;
}

if (input.tags && input.tags !== '') {
  clientSideFilters.tags = input.tags;
}

if (input.date_from || input.date_to) {
  clientSideFilters.date_from = input.date_from;
  clientSideFilters.date_to = input.date_to;
}

// Store client-side filters
apiRequestBody._client_side_filters = clientSideFilters;

console.log('📤 API Request (text search only):', {
  search: apiRequestBody.search
});
console.log('🔧 Client-side filters:', clientSideFilters);

return [{
  json: apiRequestBody
}];
