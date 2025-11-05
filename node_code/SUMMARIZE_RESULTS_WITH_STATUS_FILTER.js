// ============================================
// COMPLETE CODE FOR: Summarize Results for AI Node
// ============================================
// VERSION: With Status Filtering Support
// FIXES: Gorgias API 400 error for status parameter
// ============================================

// Helper function to truncate strings
function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

// Main summarization function
function summarizeTicket(ticket) {
  const summary = {
    id: ticket.id || null,
    subject: truncate(ticket.subject || '', 100),
    status: ticket.status || null,
    priority: ticket.priority || null,
    customer_name: ticket.customer?.name || ticket.customer?.email || null,
    customer_email: ticket.customer?.email || null,
    created: ticket.created_datetime ? ticket.created_datetime.split('T')[0] : null,
    updated: ticket.updated_datetime ? ticket.updated_datetime.split('T')[0] : null,
    closed: ticket.closed_datetime ? ticket.closed_datetime.split('T')[0] : null,
    tags: Array.isArray(ticket.tags) ? ticket.tags.map(t => t.name || t).slice(0, 5) : [],
    assignee: ticket.assignee_user?.name || ticket.assignee_user?.email || null,
    message_count: ticket.messages_count || ticket.message_count || 0,
    is_unread: ticket.is_unread || false,
    spam: ticket.spam || false,
    excerpt: truncate(ticket.excerpt || '', 200)
  };

  // Keep first message body if available
  if (ticket.messages && Array.isArray(ticket.messages) && ticket.messages.length > 0) {
    const firstMessage = ticket.messages[0];
    summary.first_message = {
      body_text: truncate(firstMessage.body_text || firstMessage.stripped_text || '', 500),
      from_agent: firstMessage.from_agent || false,
      created: firstMessage.created_datetime ? firstMessage.created_datetime.split('T')[0] : null
    };
  }

  return summary;
}

// ============================================
// NEW: Filter tickets by status
// ============================================
function filterByStatus(tickets, requestedStatus) {
  // If no status requested or "all", return all tickets
  if (!requestedStatus || requestedStatus === 'all') {
    return tickets;
  }

  // Filter tickets by status
  const statusLower = requestedStatus.toLowerCase();
  const filtered = tickets.filter(ticket => {
    const ticketStatus = (ticket.status || '').toLowerCase();
    return ticketStatus === statusLower;
  });

  console.log(`🔍 Status Filter: ${tickets.length} → ${filtered.length} tickets (status: ${requestedStatus})`);

  return filtered;
}

// Process all items from input
const items = $input.all();
const results = [];

console.log('═══════════════════════════════════════');
console.log('📤 Summarize Results for AI (with Status Filter)');
console.log('═══════════════════════════════════════');
console.log('Input items:', items.length);

for (const item of items) {
  const data = item.json;

  console.log('───────────────────────────────────────');
  console.log('Processing item with keys:', Object.keys(data));

  // Extract the requested status for filtering
  const requestedStatus = data.status;
  if (requestedStatus) {
    console.log('📋 Requested status filter:', requestedStatus);
  }

  // Handle different input structures
  let ticketsToSummarize = [];
  let originalCount = 0;

  // Structure 1: results[0].response_data = [array of tickets]
  if (data.results && Array.isArray(data.results) && data.results.length > 0) {
    const firstResult = data.results[0];

    if (firstResult.response_data && Array.isArray(firstResult.response_data)) {
      console.log('✅ Found response_data array with', firstResult.response_data.length, 'tickets');
      originalCount = firstResult.response_data.length;

      // Apply status filter BEFORE summarization
      ticketsToSummarize = filterByStatus(firstResult.response_data, requestedStatus);
    }
    // Structure 2: results[0].summary (already summarized)
    else if (firstResult.summary) {
      console.log('✅ Found pre-summarized ticket');
      ticketsToSummarize = [firstResult.summary];
      originalCount = 1;

      // Apply status filter
      ticketsToSummarize = filterByStatus(ticketsToSummarize, requestedStatus);
    }
    // Structure 3: results[0] is the ticket itself
    else if (firstResult.id) {
      console.log('✅ Found ticket at results[0]');
      ticketsToSummarize = [firstResult];
      originalCount = 1;

      // Apply status filter
      ticketsToSummarize = filterByStatus(ticketsToSummarize, requestedStatus);
    }
  }
  // Structure 4: Direct ticket object
  else if (data.id && data.status) {
    console.log('✅ Found direct ticket object');
    ticketsToSummarize = [data];
    originalCount = 1;

    // Apply status filter
    ticketsToSummarize = filterByStatus(ticketsToSummarize, requestedStatus);
  }

  console.log('Tickets after filtering:', ticketsToSummarize.length);

  // Summarize each ticket
  if (ticketsToSummarize.length > 0) {
    const summaries = ticketsToSummarize.map(ticket => summarizeTicket(ticket));

    results.push({
      json: {
        action: data.action || 'list_tickets',
        summaries: summaries,
        total_count: summaries.length,
        original_count: originalCount,  // Track how many before filtering
        filtered_by_status: requestedStatus || 'all',  // Track what filter was applied
        correlation_id: data.correlation_id,
        user_text: data.user_text,
        channel: data.channel,
        thread_ts: data.thread_ts
      }
    });

    console.log('✅ Created', summaries.length, 'summaries');
  } else {
    console.log('⚠️  No tickets found after filtering');

    results.push({
      json: {
        action: data.action || 'unknown',
        summaries: [],
        total_count: 0,
        original_count: originalCount,
        filtered_by_status: requestedStatus || 'all',
        correlation_id: data.correlation_id,
        user_text: data.user_text,
        channel: data.channel,
        thread_ts: data.thread_ts
      }
    });
  }
}

console.log('═══════════════════════════════════════');
console.log('✅ Returning', results.length, 'result items');
console.log('═══════════════════════════════════════');

return results;
