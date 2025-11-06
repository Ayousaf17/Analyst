// Get Action Emoji
// Returns emoji indicator for the primary action
// Position: Between "Format Session" and "Conversational Response AI"

// Define emoji mappings for all 16 actions
const actionEmoji = {
  // Ticket Operations
  list_tickets: '📋',
  search_tickets: '🔍',
  get_ticket: '🎫',
  create_ticket: '✨',

  // Ticket Management
  assign_ticket: '👤',
  close_ticket: '✅',
  set_priority: '🔥',
  set_status: '🔄',

  // Tags
  add_tags: '🏷️',
  remove_tags: '🗑️',

  // Communication
  reply_public: '💬',
  comment_internal: '📝',

  // Customer Operations
  list_customers: '👥',
  get_customer: '👤',

  // User Operations
  find_user: '🔎',

  // Analytics
  list_metrics: '📊'
};

// Get the plan from Format Session node
let plan = [];
let primaryAction = 'unknown';

try {
  plan = $('Format Session').first().json.plan;
  primaryAction = plan && plan[0] ? plan[0].action : 'unknown';
} catch (e) {
  console.log('⚠️ Could not retrieve plan from Format Session node');
}

// Get the emoji for the primary action (default to briefcase if unknown)
const emoji = actionEmoji[primaryAction] || '💼';

console.log(`🎨 Action emoji: ${emoji} for action: ${primaryAction}`);

// Return emoji and metadata
return [{
  json: {
    emoji: emoji,
    primary_action: primaryAction,
    plan: plan,
    all_emojis: actionEmoji
  }
}];
