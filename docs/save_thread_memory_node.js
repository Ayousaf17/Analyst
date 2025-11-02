// Save Thread Memory Node
// Stores updated conversation context to Supabase

const slackData = $('Parse Slack').first().json;
const threadTs = slackData.thread_ts;
const channel = slackData.channel;
const userId = slackData.user_id;
const userText = slackData.user_text;

// Get the plan that was executed
const handlePlanData = $('Handle Plan Response').first().json;
const plan = handlePlanData.plan || [];
const firstStep = plan[0] || {};

// Get results from the action execution (if available)
const actionResults = $('Collect Results')?.first()?.json || {};

// Extract entities from the executed action
const currentTicketId = firstStep.ticket_id || actionResults.ticket_id || null;
const currentCustomerId = firstStep.customer_id || actionResults.customer_id || null;
const currentCustomerEmail = firstStep.customer_email || actionResults.customer_email || null;
const currentQuery = firstStep.query || null;
const action = firstStep.action || 'unknown';

// Get existing memory (if any)
const existingMemory = $('Fetch Memory')?.first()?.json?.memory || {};
const existingHistory = existingMemory.recent_history || [];

// Build new history entry
const newHistoryEntry = {
  action: action,
  user_text: userText,
  ticket_id: currentTicketId,
  customer_id: currentCustomerId,
  customer_email: currentCustomerEmail,
  query: currentQuery,
  timestamp: new Date().toISOString()
};

// Keep last 5 entries in history
const updatedHistory = [...existingHistory, newHistoryEntry].slice(-5);

// Build the memory object to save
const memoryToSave = {
  thread_ts: threadTs,
  channel: channel,
  user_id: userId,

  // Update current context (but don't overwrite if null)
  current_ticket_id: currentTicketId || existingMemory.current_ticket_id || null,
  current_customer_id: currentCustomerId || existingMemory.current_customer_id || null,
  current_customer_email: currentCustomerEmail || existingMemory.current_customer_email || null,
  current_query: currentQuery || existingMemory.current_query || null,

  // Update last action
  last_action: action,
  last_action_timestamp: new Date().toISOString(),

  // Update history
  recent_history: updatedHistory
};

// Return for Supabase upsert
// Configure Supabase node with:
// - Operation: Insert or Update (Upsert)
// - Table: thread_memory
// - Conflict column: thread_ts

return [{
  json: memoryToSave
}];
