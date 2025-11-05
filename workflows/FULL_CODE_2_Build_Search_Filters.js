// ============================================================================
// FILE 2: NEW CODE NODE - "Build Search Request with Filters"
// ============================================================================
// Add this as a NEW Code node between Route by Action and search HTTP Request

const input = $json;

// Build filters object based on available criteria
const filters = {};

// Add status filter (open, closed, pending)
if (input.status && input.status !== '') {
  filters.status = input.status;
}

// Add priority filter (low, normal, high, urgent)
if (input.priority && input.priority !== '') {
  filters.priority = input.priority;
}

// Add customer email filter
if (input.customer_email && input.customer_email !== '') {
  filters.customer = { email: input.customer_email };
}

// Add assignee email filter
if (input.assignee_email && input.assignee_email !== '') {
  filters.assignee_user = { email: input.assignee_email };
}

// Add tags filter
if (input.tags && input.tags !== '') {
  // Handle both string and array of tags
  const tagArray = Array.isArray(input.tags) ? input.tags : [input.tags];
  filters.tags = tagArray.map(tag => ({ name: tag }));
}

console.log('🔍 Search Filters:', JSON.stringify(filters, null, 2));

// Build the final search request
const searchRequest = {
  search: input.query || "",
  filters: Object.keys(filters).length > 0 ? filters : ""
};

console.log('📤 Search Request:', JSON.stringify(searchRequest, null, 2));

return [{
  json: searchRequest
}];
