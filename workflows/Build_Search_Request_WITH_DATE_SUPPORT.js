// COMPLETE: Build Search Request with Date Range Support

const input = $json;

// Check what filters are present
const hasTextQuery = input.query && input.query.trim() !== '';
const hasStatusFilter = input.status && input.status !== '' && input.status !== 'all';
const hasPriorityFilter = input.priority && input.priority !== '';
const hasAssigneeFilter = input.assignee_email && input.assignee_email !== '';
const hasCustomerFilter = input.customer_email && input.customer_email !== '';
const hasTagsFilter = input.tags && input.tags !== '';
const hasDateFilter = input.date_from || input.date_to;

console.log('🔍 Search Criteria:', {
  hasTextQuery,
  hasStatusFilter,
  hasPriorityFilter,
  hasAssigneeFilter,
  hasDateFilter,
  query: input.query,
  status: input.status,
  assignee_email: input.assignee_email,
  date_from: input.date_from,
  date_to: input.date_to
});

// Build filters object for API
const filters = {};

// Add status filter (API supported)
if (hasStatusFilter) {
  filters.status = input.status;
}

// Add priority filter (API supported)
if (hasPriorityFilter) {
  filters.priority = input.priority;
}

// Add date range filter (API supported)
if (hasDateFilter) {
  filters.created_datetime = {};

  if (input.date_from) {
    // Ensure ISO 8601 format with time
    const fromDate = input.date_from.includes('T')
      ? input.date_from
      : `${input.date_from}T00:00:00Z`;
    filters.created_datetime.from = fromDate;
  }

  if (input.date_to) {
    // Ensure ISO 8601 format with time (end of day)
    const toDate = input.date_to.includes('T')
      ? input.date_to
      : `${input.date_to}T23:59:59Z`;
    filters.created_datetime.to = toDate;
  } else if (input.date_from) {
    // If only date_from specified, default to today
    filters.created_datetime.to = new Date().toISOString();
  }
}

// Add tags filter (API supported - needs testing)
if (hasTagsFilter) {
  filters.tags = { name: input.tags };
}

// Build the API request
const requestBody = {
  search: input.query || "",
  filters: Object.keys(filters).length > 0 ? filters : "",
  limit: input.limit || 50,
  order_by: "-created_datetime"
};

// Store client-side filters (not supported by API)
requestBody._client_side_assignee_filter = hasAssigneeFilter ? input.assignee_email : null;
requestBody._client_side_customer_filter = hasCustomerFilter ? input.customer_email : null;

console.log('📤 API Request:', JSON.stringify(requestBody, null, 2));
console.log('🔧 Client-side filters:', {
  assignee: requestBody._client_side_assignee_filter,
  customer: requestBody._client_side_customer_filter
});

return [{
  json: requestBody
}];
