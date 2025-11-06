// Client-side filtering for assignee (since API doesn't support it)

const response = $json;
const assigneeFilter = $json._client_side_assignee_filter;

// If no assignee filter, return all results
if (!assigneeFilter) {
  console.log('✅ No assignee filter, returning all results');
  return [$input.item];
}

// Extract tickets from response
let tickets = [];
if (response.body && response.body.data) {
  tickets = response.body.data;
} else if (Array.isArray(response.data)) {
  tickets = response.data;
} else if (Array.isArray(response)) {
  tickets = response;
}

console.log(`🔍 Filtering ${tickets.length} tickets by assignee: ${assigneeFilter}`);

// Filter by assignee email
const filteredTickets = tickets.filter(ticket => {
  if (!ticket.assignee_user) {
    return false;
  }
  return ticket.assignee_user.email &&
         ticket.assignee_user.email.toLowerCase() === assigneeFilter.toLowerCase();
});

console.log(`✅ Found ${filteredTickets.length} tickets assigned to ${assigneeFilter}`);

// Return filtered results in same structure as API response
if (response.body && response.body.data) {
  return [{
    json: {
      ...response,
      body: {
        ...response.body,
        data: filteredTickets
      }
    }
  }];
} else {
  return [{
    json: filteredTickets
  }];
}
