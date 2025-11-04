// ============================================
// COMPLETE CODE FOR: Universal Table Formatter Node - FIXED
// ============================================
// Formats Gorgias data with proper summaries structure
// ============================================

// Format list_tickets response
function formatListTickets(data) {
  const summaries = data.summaries || [];

  console.log('═══════════════════════════════════════');
  console.log('📋 formatListTickets');
  console.log('  Summaries count:', summaries.length);
  console.log('═══════════════════════════════════════');

  if (summaries.length === 0) {
    return '📋 No tickets found matching your criteria.';
  }

  // Limit display to first 10 tickets
  const displayLimit = Math.min(10, summaries.length);
  const tickets = summaries.slice(0, displayLimit);

  let output = `📋 Found ${summaries.length} ticket(s)`;
  if (summaries.length > displayLimit) {
    output += ` (showing first ${displayLimit})`;
  }
  output += `:\n\n`;

  tickets.forEach((ticket, index) => {
    // Get message preview
    const messageBody = ticket.first_message?.body_text
                     || ticket.excerpt
                     || 'No message available';

    // Clean message: collapse newlines and excessive whitespace
    const cleanedMessage = messageBody
      .replace(/\r?\n/g, ' ')           // Replace newlines with spaces
      .replace(/\s+/g, ' ')              // Collapse multiple spaces
      .trim();                           // Remove leading/trailing whitespace

    const preview = cleanedMessage.length > 250
      ? cleanedMessage.substring(0, 250) + '...'
      : cleanedMessage;

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
      output += `   🏷️  ${ticket.tags.join(', ')}\n`;
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
function formatGetTicket(data) {
  const summaries = data.summaries || [];

  console.log('═══════════════════════════════════════');
  console.log('🎫 formatGetTicket');
  console.log('  Summaries count:', summaries.length);
  console.log('═══════════════════════════════════════');

  if (summaries.length === 0) {
    return '❌ No ticket data found.';
  }

  const ticket = summaries[0];

  // Message body with fallback chain
  const messageBody = ticket.first_message?.body_text
                   || ticket.excerpt
                   || 'No message content available';

  // Clean message: collapse newlines and excessive whitespace
  const cleanedMessage = messageBody
    .replace(/\r?\n/g, ' ')           // Replace newlines with spaces
    .replace(/\s+/g, ' ')              // Collapse multiple spaces
    .trim();                           // Remove leading/trailing whitespace

  const preview = cleanedMessage.length > 500
    ? cleanedMessage.substring(0, 500) + '...'
    : cleanedMessage;

  let output = `🎫 Ticket #${ticket.id} - ${ticket.subject || 'No Subject'}\n\n`;

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
  output += `"${preview}"\n\n`;

  output += `💡 Quick Actions:\n`;
  output += `• Assign: "@Gorgias Terminal assign ticket ${ticket.id} to [email]"\n`;
  output += `• Add note: "@Gorgias Terminal add note to ticket ${ticket.id}: [message]"\n`;
  output += `• Update priority: "@Gorgias Terminal set ticket ${ticket.id} priority to urgent"`;

  return output;
}

// Format error messages
function formatError(data) {
  const error = data.error || 'Unknown error occurred';
  const details = data.details || '';

  let output = `❌ Error occurred:\n\n`;
  output += `${error}\n`;
  if (details) {
    output += `\nDetails: ${details}`;
  }

  return output;
}

// Format generic/unknown response types
function formatGeneric(data) {
  if (data.message) {
    return `✅ ${data.message}`;
  }

  if (data.summaries && Array.isArray(data.summaries) && data.summaries.length > 0) {
    return `✅ Operation completed successfully. Found ${data.summaries.length} result(s).`;
  }

  return `✅ Operation completed successfully.`;
}

// Main formatting logic
const inputData = $input.first().json;
const action = inputData.action || 'unknown';

console.log('═══════════════════════════════════════');
console.log('🎨 Universal Table Formatter');
console.log('═══════════════════════════════════════');
console.log('Action:', action);
console.log('Input keys:', Object.keys(inputData));
console.log('Summaries count:', inputData.summaries?.length || 0);

let formattedOutput = '';

switch (action) {
  case 'get_ticket':
    formattedOutput = formatGetTicket(inputData);
    break;

  case 'list_tickets':
    formattedOutput = formatListTickets(inputData);
    break;

  case 'error':
    formattedOutput = formatError(inputData);
    break;

  default:
    formattedOutput = formatGeneric(inputData);
}

console.log('───────────────────────────────────────');
console.log('✅ Formatted output length:', formattedOutput.length, 'characters');
console.log('═══════════════════════════════════════');

// Return formatted output
return [{
  json: {
    formatted_message: formattedOutput,
    original_action: action,
    timestamp: new Date().toISOString()
  }
}];
