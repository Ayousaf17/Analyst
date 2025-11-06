// COMPLETE CLIENT-SIDE FILTERING
// Handles ALL filter types after fetching tickets from API

// Access Merge node inputs
const buildRequest = $input.first().json;
const searchResponse = $input.last().json;

// Extract the client-side filters object
const filters = buildRequest._client_side_filters || {};

console.log('🔧 Applying client-side filters:', filters);

// Extract tickets from API response
let tickets = searchResponse.body?.data || searchResponse.data || searchResponse;

// Ensure tickets is an array
if (!Array.isArray(tickets)) {
  console.log('⚠️ No tickets array found in response');
  tickets = [];
}

console.log(`📊 Initial ticket count: ${tickets.length}`);

// FILTER 1: Status
if (filters.status) {
  const beforeCount = tickets.length;
  tickets = tickets.filter(ticket =>
    ticket.status?.toLowerCase() === filters.status.toLowerCase()
  );
  console.log(`✅ Status filter (${filters.status}): ${beforeCount} → ${tickets.length}`);
}

// FILTER 2: Priority
if (filters.priority) {
  const beforeCount = tickets.length;
  tickets = tickets.filter(ticket =>
    ticket.priority?.toLowerCase() === filters.priority.toLowerCase()
  );
  console.log(`✅ Priority filter (${filters.priority}): ${beforeCount} → ${tickets.length}`);
}

// FILTER 3: Assignee Email
if (filters.assignee_email) {
  const beforeCount = tickets.length;
  tickets = tickets.filter(ticket =>
    ticket.assignee_user?.email?.toLowerCase() === filters.assignee_email.toLowerCase()
  );
  console.log(`✅ Assignee filter (${filters.assignee_email}): ${beforeCount} → ${tickets.length}`);
}

// FILTER 4: Customer Email
if (filters.customer_email) {
  const beforeCount = tickets.length;
  tickets = tickets.filter(ticket =>
    ticket.customer?.email?.toLowerCase() === filters.customer_email.toLowerCase()
  );
  console.log(`✅ Customer filter (${filters.customer_email}): ${beforeCount} → ${tickets.length}`);
}

// FILTER 5: Tags
if (filters.tags) {
  const beforeCount = tickets.length;
  const searchTag = filters.tags.toLowerCase();
  tickets = tickets.filter(ticket => {
    if (!ticket.tags || !Array.isArray(ticket.tags)) return false;
    return ticket.tags.some(tag =>
      tag.name?.toLowerCase().includes(searchTag)
    );
  });
  console.log(`✅ Tags filter (${filters.tags}): ${beforeCount} → ${tickets.length}`);
}

// FILTER 6: Date Range
if (filters.date_from || filters.date_to) {
  const beforeCount = tickets.length;

  tickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.created_datetime);

    // Check date_from
    if (filters.date_from) {
      const fromDate = new Date(filters.date_from);
      if (ticketDate < fromDate) return false;
    }

    // Check date_to
    if (filters.date_to) {
      const toDate = new Date(filters.date_to);
      // Add one day to include the entire end date
      toDate.setDate(toDate.getDate() + 1);
      if (ticketDate >= toDate) return false;
    }

    return true;
  });

  console.log(`✅ Date range filter (${filters.date_from || 'any'} to ${filters.date_to || 'any'}): ${beforeCount} → ${tickets.length}`);
}

console.log(`📊 Final ticket count after all filters: ${tickets.length}`);

// Return filtered tickets in same structure
return [{
  json: {
    data: tickets,
    meta: {
      total_count: tickets.length,
      filtered: Object.keys(filters).length > 0,
      applied_filters: filters
    }
  }
}];
