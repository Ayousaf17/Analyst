// ============================================================================
// TICKET ANALYTICS AGENT - DYNAMIC USER PROMPT
// ============================================================================
// Purpose: Build dynamic prompt based on user's actual request
// Data: Fetched tickets from Gorgias API (at $json.body.data)
// Period: Dynamic from Parse Slack (e.g., "7d", "30d")
// Status: Dynamic from Parse Slack (e.g., "closed", "open", null)
// ============================================================================

// Get Parse Slack data for dynamic values
const parseSlack = $('Parse Slack').first().json;

// Get the actual period the user requested
const period = parseSlack.time_period || '30d';
const status = parseSlack.status_filter || 'all';
const cutoffDate = parseSlack.cutoff_date;

// Get tickets from Fetch node
const tickets = $json.body.data;

// Build the prompt
const userPrompt = {
  tickets: tickets,
  period: period,
  status: status,
  cutoff_date: cutoffDate,
  instructions: `Analyze these Gorgias support tickets from the ${period} period${status !== 'all' ? ` (${status} status)` : ''}. Focus on tickets created after ${cutoffDate}.`
};

console.log('───────────────────────────────────────');
console.log('📊 Ticket Analytics Agent Input:');
console.log('  Period requested:', period);
console.log('  Status filter:', status);
console.log('  Cutoff date:', cutoffDate);
console.log('  Tickets to analyze:', tickets.length);
console.log('═══════════════════════════════════════');

// Return the dynamic prompt as JSON
return [{
  json: userPrompt
}];
