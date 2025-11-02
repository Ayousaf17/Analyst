// Fetch Thread Memory Node
// Retrieves conversation context from Supabase for the current thread

const slackData = $('Parse Slack').first().json;
const threadTs = slackData.thread_ts;
const channel = slackData.channel;
const userId = slackData.user_id;

// Query Supabase for existing thread memory
// This will be handled by n8n's Supabase node, but here's the logic:

// IMPORTANT: This is a placeholder - you'll use n8n's Supabase node
// Configure the Supabase node with:
// - Operation: Get Rows
// - Table: thread_memory
// - Filter: thread_ts = {{ $('Parse Slack').first().json.thread_ts }}

// If memory exists, it will have this structure:
// {
//   "thread_ts": "1762052904.296909",
//   "channel": "C09BXTD0WR0",
//   "user_id": "U09BSMA8U75",
//   "current_ticket_id": "234525253",
//   "current_customer_id": "123",
//   "current_customer_email": "john@example.com",
//   "current_query": "billing",
//   "last_action": "get_ticket",
//   "last_action_timestamp": "2025-11-02T10:14:00Z",
//   "recent_history": [
//     {
//       "action": "list_customers",
//       "user_text": "list customers",
//       "timestamp": "2025-11-02T10:10:00Z"
//     },
//     {
//       "action": "get_ticket",
//       "user_text": "get ticket 234525253",
//       "ticket_id": "234525253",
//       "timestamp": "2025-11-02T10:14:00Z"
//     }
//   ],
//   "created_at": "2025-11-02T10:10:00Z",
//   "updated_at": "2025-11-02T10:14:00Z",
//   "expires_at": "2025-11-02T11:14:00Z"
// }

// This code runs AFTER the Supabase node
// It formats the memory for use by Planning AI

const items = $input.all();

// Check if we got memory from Supabase
if (items.length > 0 && items[0].json) {
  const memory = items[0].json;

  // Format memory into human-readable context
  const contextParts = [];

  if (memory.current_ticket_id) {
    contextParts.push(`Current ticket: #${memory.current_ticket_id}`);
  }

  if (memory.current_customer_id) {
    contextParts.push(`Current customer: ${memory.current_customer_email || memory.current_customer_id}`);
  }

  if (memory.current_query) {
    contextParts.push(`Last search: "${memory.current_query}"`);
  }

  if (memory.last_action) {
    contextParts.push(`Last action: ${memory.last_action}`);
  }

  const contextSummary = contextParts.length > 0
    ? contextParts.join(' | ')
    : 'None';

  return [{
    json: {
      has_memory: true,
      memory: memory,
      context_summary: contextSummary,
      current_ticket_id: memory.current_ticket_id || null,
      current_customer_id: memory.current_customer_id || null,
      current_customer_email: memory.current_customer_email || null,
      last_action: memory.last_action || null,
      recent_history: memory.recent_history || []
    }
  }];
} else {
  // No memory found for this thread
  return [{
    json: {
      has_memory: false,
      memory: {},
      context_summary: 'None',
      current_ticket_id: null,
      current_customer_id: null,
      current_customer_email: null,
      last_action: null,
      recent_history: []
    }
  }];
}
