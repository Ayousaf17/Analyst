// ============================================
// COMPLETE UPDATED CODE FOR: Universal Table Formatter Node - WITH EMOJI SUPPORT
// ============================================
// Handles both direct summaries AND wrapped original_data
// NOW WITH EMOJI PREPENDING
// ============================================

// Format list_tickets response
function formatListTickets(summaries, emoji) {
  console.log('═══════════════════════════════════════');
  console.log('📋 formatListTickets');
  console.log('  Summaries count:', summaries.length);
  console.log('═══════════════════════════════════════');

  if (summaries.length === 0) {
    return `${emoji} No tickets found matching your criteria.`;
  }

  // Limit display to first 10 tickets
  const displayLimit = Math.min(10, summaries.length);
  const tickets = summaries.slice(0, displayLimit);

  let output = `${emoji} Found ${summaries.length} ticket(s)`;
  if (summaries.length > displayLimit) {
    output += ` (showing first ${displayLimit})`;
  }
  output += `:\n\n`;

  tickets.forEach((ticket, index) => {
    // Get message preview
    const messageBody = ticket.first_message?.body_text
                     || ticket.excerpt
                     || 'No message available';

    const preview = messageBody.length > 150
      ? messageBody.substring(0, 150) + '...'
      : messageBody;

    // Format ticket entry
    output += `${index + 1}. 🎫 #${ticket.id} - ${ticket.subject || 'No Subject'}\n`;
    output += `   📊 ${ticket.status || 'unknown'} | ${ticket.priority || 'normal'} priority`;

    if (ticket.customer_name || ticket.customer_email) {
      output += ` | ${ticket.customer_name || ticket.customer_email}`;
    }

    output += `\n`;

    if (ticket.assignee) {
      output += `   👤 Assigned to: ${ticket.assignee}\n`;
    }

    output += `   💬 "${preview}"\n`;

    if (ticket.tags && ticket.tags.length > 0) {
      output += `   🏷️  ${ticket.tags.slice(0, 3).join(', ')}\n`;
    }

    output += `\n`;
  });

  if (summaries.length > displayLimit) {
    output += `... and ${summaries.length - displayLimit} more ticket(s)\n\n`;
  }

  output += `💡 Quick Actions:\n`;
  output += `• View details: "@Gorgias Terminal get ticket [ID]"\n`;
  output += `• Search: "@Gorgias Terminal search tickets about [topic]"`;

  return output;
}

// Format get_ticket response
function formatGetTicket(summaries, emoji) {
  console.log('═══════════════════════════════════════');
  console.log('🎫 formatGetTicket');
  console.log('  Summaries count:', summaries.length);
  console.log('═══════════════════════════════════════');

  if (summaries.length === 0) {
    return `${emoji} No ticket data found.`;
  }

  const ticket = summaries[0];

  // Message body with fallback chain (FULL message, no truncation)
  const messageBody = ticket.first_message?.body_text
                   || ticket.excerpt
                   || 'No message content available';

  let output = `${emoji} Ticket #${ticket.id} - ${ticket.subject || 'No Subject'}\n\n`;

  output += `📋 Details:\n`;
  output += `• Status: ${ticket.status || 'Unknown'}\n`;
  output += `• Priority: ${ticket.priority || 'Unknown'}\n`;
  output += `• Customer: ${ticket.customer_name || ticket.customer_email || 'Unknown'}\n`;
  output += `• Assignee: ${ticket.assignee || 'Unassigned'}\n`;
  output += `• Created: ${ticket.created || 'Unknown'}\n`;
  output += `• Last updated: ${ticket.updated || 'Unknown'}\n`;
  output += `• Messages: ${ticket.message_count || 'Unknown'}\n`;
  output += `• Tags: ${ticket.tags?.length > 0 ? ticket.tags.join(', ') : 'None'}\n`;
  output += `• Unread: ${ticket.is_unread ? 'Yes' : 'No'}\n`;
  output += `• Spam: ${ticket.spam ? 'Yes' : 'No'}\n\n`;

  output += `💬 Customer Message:\n`;
  output += `"${messageBody}"\n\n`;

  output += `💡 Quick Actions:\n`;
  output += `• Assign: "@Gorgias Terminal assign ticket ${ticket.id} to [email]"\n`;
  output += `• Add note: "@Gorgias Terminal add note to ticket ${ticket.id}: [message]"\n`;
  output += `• Update priority: "@Gorgias Terminal set ticket ${ticket.id} priority to urgent"`;

  return output;
}

// Format error messages
function formatError(data, emoji) {
  const error = data.error || 'Unknown error occurred';
  const details = data.details || '';

  let output = `${emoji} Error occurred:\n\n`;
  output += `${error}\n`;
  if (details) {
    output += `\nDetails: ${details}`;
  }

  return output;
}

// Main formatting logic
const inputData = $input.first().json;

// ✅ GET EMOJI FROM INPUT
const emoji = inputData.emoji || '💼';

console.log('═══════════════════════════════════════');
console.log('🎨 Universal Table Formatter (WITH EMOJI)');
console.log('═══════════════════════════════════════');
console.log('Input keys:', Object.keys(inputData));
console.log('Emoji:', emoji);

// Extract summaries and action from multiple possible locations
let summaries = [];
let action = 'unknown';

// Path 1: data.original_data.summaries (wrapped by analytics node)
if (inputData.original_data && inputData.original_data.summaries) {
  console.log('✅ Found summaries in original_data');
  summaries = inputData.original_data.summaries;
  action = inputData.original_data.action || 'unknown';
}
// Path 2: data.summaries (direct from Summarize Results)
else if (inputData.summaries) {
  console.log('✅ Found summaries at root level');
  summaries = inputData.summaries;
  action = inputData.action || 'unknown';
}
// Path 3: Check if there's an error but still has original data
else if (inputData.error && inputData.original_data) {
  console.log('⚠️  Error present but checking original_data anyway');
  if (inputData.original_data.summaries) {
    summaries = inputData.original_data.summaries;
    action = inputData.original_data.action || 'unknown';
  }
}

console.log('Action:', action);
console.log('Summaries count:', summaries.length);
console.log('───────────────────────────────────────');

let formattedOutput = '';

// Format based on action and data availability
if (summaries.length > 0) {
  switch (action) {
    case 'get_ticket':
      formattedOutput = formatGetTicket(summaries, emoji);
      break;

    case 'list_tickets':
      formattedOutput = formatListTickets(summaries, emoji);
      break;

    default:
      // Generic formatting for unknown action types
      formattedOutput = formatListTickets(summaries, emoji);
  }
} else {
  // No summaries found
  if (inputData.error) {
    formattedOutput = formatError(inputData, emoji);
  } else {
    formattedOutput = `${emoji} No tickets found matching your criteria.`;
  }
}

console.log('✅ Formatted output length:', formattedOutput.length, 'characters');
console.log('═══════════════════════════════════════');

// Return formatted output
return [{
  json: {
    formatted_message: formattedOutput,
    original_action: action,
    emoji: emoji,
    timestamp: new Date().toISOString()
  }
}];
