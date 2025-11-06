// Client-side filtering for criteria not supported by API
// Handles: assignee_email, customer_email

// Access the Merge node inputs
const buildRequest = $input.first().json;
const searchResponse = $input.last().json;

const assigneeFilter = buildRequest._client_side_assignee_filter;
const customerFilter = buildRequest._client_side_customer_filter;

console.log('🔍 Client-side filters:', {
  assignee: assigneeFilter,
  customer: customerFilter
});

// If no client-side filters, return all results
if (!assigneeFilter && !customerFilter) {
  console.log('✅ No client-side filters, returning all results');
  return [{ json: searchResponse }];
}

// Extract tickets from API response
let tickets = [];
if (searchResponse.body && searchResponse.body.data) {
  tickets = searchResponse.body.data;
} else if (Array.isArray(searchResponse.data)) {
  tickets = searchResponse.data;
} else if (Array.isArray(searchResponse)) {
  tickets = searchResponse;
}

console.log(`🔍 Filtering ${tickets.length} tickets with client-side filters`);

// Filter by assignee email
if (assigneeFilter) {
  const beforeCount = tickets.length;
  tickets = tickets.filter(ticket => {
    if (!ticket.assignee_user) {
      return false;
    }
    return ticket.assignee_user.email &&
           ticket.assignee_user.email.toLowerCase() === assigneeFilter.toLowerCase();
  });
  console.log(`  ✅ Assignee filter: ${beforeCount} → ${tickets.length} tickets`);
}

// Filter by customer email
if (customerFilter) {
  const beforeCount = tickets.length;
  tickets = tickets.filter(ticket => {
    if (!ticket.customer) {
      return false;
    }
    return ticket.customer.email &&
           ticket.customer.email.toLowerCase() === customerFilter.toLowerCase();
  });
  console.log(`  ✅ Customer filter: ${beforeCount} → ${tickets.length} tickets`);
}

console.log(`✅ Final result: ${tickets.length} tickets after all filters`);

// Return filtered results in same structure as API response
if (searchResponse.body && searchResponse.body.data) {
  return [{
    json: {
      ...searchResponse,
      body: {
        ...searchResponse.body,
        data: tickets
      }
    }
  }];
} else {
  return [{
    json: tickets
  }];
}
