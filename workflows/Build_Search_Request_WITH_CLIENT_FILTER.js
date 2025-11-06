// Solution: Use /api/tickets/search with limited filters, then filter in code

const input = $json;

// Check what type of search this is
const hasTextQuery = input.query && input.query.trim() !== '';
const hasStatusFilter = input.status && input.status !== '' && input.status !== 'all';
const hasPriorityFilter = input.priority && input.priority !== '';
const hasAssigneeFilter = input.assignee_email && input.assignee_email !== '';

console.log('🔍 Search Request:', {
  hasTextQuery,
  hasStatusFilter,
  hasPriorityFilter,
  hasAssigneeFilter,
  query: input.query,
  status: input.status,
  assignee_email: input.assignee_email
});

// Build filters object for /api/tickets/search
const filters = {};

// Add status filter (this IS supported by /api/tickets/search)
if (hasStatusFilter) {
  filters.status = input.status;
}

// Note: assignee_email filtering not supported by API
// We'll filter that client-side after getting results

const requestBody = {
  search: input.query || "",
  filters: Object.keys(filters).length > 0 ? filters : "",
  limit: input.limit || 50,
  order_by: "-created_datetime"
};

// Store the assignee filter for client-side filtering
requestBody._client_side_assignee_filter = hasAssigneeFilter ? input.assignee_email : null;

console.log('📤 API Request:', requestBody);

return [{
  json: requestBody
}];
