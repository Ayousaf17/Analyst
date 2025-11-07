// ============================================================================
// TICKET ANALYTICS AGENT - DYNAMIC USER PROMPT
// ============================================================================
// Purpose: Build dynamic prompt based on user's actual request
// Data: Fetched tickets from Gorgias API HTTP Response
// Period: Dynamic from Parse Slack (e.g., "7d", "30d")
// Status: Dynamic from Parse Slack (e.g., "closed", "open", null)
// ============================================================================

console.log('═══════════════════════════════════════');
console.log('🔍 Building Ticket Analytics Agent Prompt');
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 1: Get Parse Slack data for dynamic values
// ═══════════════════════════════════════
let parseSlack;
try {
  parseSlack = $('Parse Slack').first().json;
  console.log('✅ Retrieved Parse Slack data');
} catch (e) {
  console.log('⚠️ Could not retrieve Parse Slack data:', e.message);
  parseSlack = {};
}

// Get the actual period the user requested
const period = parseSlack.time_period || '30d';
const status = parseSlack.status_filter || 'all';
const cutoffDate = parseSlack.cutoff_date || new Date(Date.now() - 30*24*60*60*1000).toISOString();

console.log('  Period:', period);
console.log('  Status:', status);
console.log('  Cutoff date:', cutoffDate);

// ═══════════════════════════════════════
// STEP 2: Get tickets from Fetch node
// ═══════════════════════════════════════
let tickets = [];

try {
  // HTTP Request node with "Full Response" option returns:
  // { body: { data: [...], meta: {...} }, headers: {...}, statusCode: 200 }

  if ($json.body && $json.body.data) {
    tickets = $json.body.data;
    console.log('✅ Retrieved tickets from $json.body.data');
  } else if ($json.data) {
    // Fallback: sometimes it might be at $json.data
    tickets = $json.data;
    console.log('✅ Retrieved tickets from $json.data (fallback)');
  } else if (Array.isArray($json)) {
    // Fallback: sometimes the response itself is an array
    tickets = $json;
    console.log('✅ Retrieved tickets from $json (array fallback)');
  } else {
    console.log('⚠️ Could not find tickets in expected locations');
    console.log('  Available keys:', Object.keys($json));
    tickets = [];
  }

  console.log('  Total tickets:', tickets.length);

  // Log sample ticket structure for debugging
  if (tickets.length > 0) {
    console.log('  Sample ticket fields:', Object.keys(tickets[0]).slice(0, 10).join(', '));
  }

} catch (e) {
  console.log('❌ Error retrieving tickets:', e.message);
  tickets = [];
}

// ═══════════════════════════════════════
// STEP 3: Build the prompt
// ═══════════════════════════════════════
const userPrompt = {
  tickets: tickets,
  period: period,
  status: status,
  cutoff_date: cutoffDate,
  instructions: `Analyze these Gorgias support tickets from the ${period} period${status !== 'all' ? ` (${status} status)` : ''}. Focus on tickets created after ${cutoffDate}.

Please provide:
1. **Summary**: Overall ticket volume and trends for this ${period} period
2. **Status Breakdown**: Count of tickets by status (open, closed, pending, etc.)
3. **Channel Analysis**: Which channels are most active (email, chat, etc.)
4. **Common Topics**: Most frequent customer issues and themes
5. **Response Patterns**: Average response times and resolution rates
6. **Recommendations**: Actionable insights to improve support operations

Analyze only tickets created on or after ${cutoffDate}${status !== 'all' ? ` with status: ${status}` : ''}.`
};

console.log('───────────────────────────────────────');
console.log('📊 Final Prompt Summary:');
console.log('  Period:', period);
console.log('  Status filter:', status);
console.log('  Cutoff date:', cutoffDate);
console.log('  Tickets to analyze:', tickets.length);
console.log('  Instructions length:', userPrompt.instructions.length, 'chars');
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 4: Return the dynamic prompt as JSON
// ═══════════════════════════════════════
return [{
  json: userPrompt
}];
