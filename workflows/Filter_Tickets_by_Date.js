// ============================================================================
// FILTER TICKETS BY DATE - For Analytics Path
// ============================================================================
// Purpose: Pre-filter tickets based on user's requested time period
// Position: Between "Fetch Tickets for Analytics" and "Ticket Analytics Agent"
// Benefits:
// - Reduces tokens sent to AI
// - Faster AI processing
// - More accurate results
// - Better user experience
// ============================================================================

// Get cutoff date from Parse Slack
const parseSlack = $('Parse Slack').first().json;
const cutoffTimestamp = parseSlack.cutoff_timestamp;
const timePeriod = parseSlack.time_period;
const statusFilter = parseSlack.status_filter;

// Get all tickets from Fetch node
const allTickets = $json.body.data;

console.log('═══════════════════════════════════════');
console.log('📊 Ticket Filtering Starting...');
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 1: Filter by date
// ═══════════════════════════════════════
let filteredTickets = allTickets.filter(ticket => {
  const createdTime = new Date(ticket.created_datetime).getTime();
  return createdTime >= cutoffTimestamp;
});

console.log('  Date filtering:');
console.log('    Period:', timePeriod);
console.log('    Cutoff date:', new Date(cutoffTimestamp).toISOString());
console.log('    Before:', allTickets.length, 'tickets');
console.log('    After:', filteredTickets.length, 'tickets');
console.log('    Filtered out:', allTickets.length - filteredTickets.length, 'tickets');

// ═══════════════════════════════════════
// STEP 2: Filter by status (if specified)
// ═══════════════════════════════════════
if (statusFilter && statusFilter !== 'all') {
  const beforeStatus = filteredTickets.length;
  filteredTickets = filteredTickets.filter(ticket => {
    return ticket.status === statusFilter;
  });

  console.log('  Status filtering:');
  console.log('    Status:', statusFilter);
  console.log('    Before:', beforeStatus, 'tickets');
  console.log('    After:', filteredTickets.length, 'tickets');
  console.log('    Filtered out:', beforeStatus - filteredTickets.length, 'tickets');
} else {
  console.log('  Status filtering: Skipped (analyzing all statuses)');
}

// ═══════════════════════════════════════
// STEP 3: Log summary statistics
// ═══════════════════════════════════════
const statusCounts = {};
filteredTickets.forEach(ticket => {
  const status = ticket.status || 'unknown';
  statusCounts[status] = (statusCounts[status] || 0) + 1;
});

console.log('───────────────────────────────────────');
console.log('📊 Filtered Tickets Summary:');
console.log('  Total to analyze:', filteredTickets.length);
console.log('  Status breakdown:', JSON.stringify(statusCounts, null, 2));
console.log('  Date range:', new Date(cutoffTimestamp).toISOString(), 'to now');
console.log('  Token savings:', `~${(allTickets.length - filteredTickets.length) * 200}`, 'tokens');
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 4: Return filtered tickets
// ═══════════════════════════════════════
// Keep same structure as Fetch node output
return [{
  json: {
    body: {
      object: 'list',
      data: filteredTickets,
      meta: {
        filtered_by_date: timePeriod,
        filtered_by_status: statusFilter || 'all',
        original_count: allTickets.length,
        filtered_count: filteredTickets.length,
        cutoff_date: new Date(cutoffTimestamp).toISOString()
      }
    }
  }
}];
