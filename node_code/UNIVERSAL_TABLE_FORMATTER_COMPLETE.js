// ============================================
// COMPLETE CODE FOR: Universal Table Formatter Node
// ============================================
// This node formats different types of Gorgias data
// into clean, readable Slack messages
// ============================================

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format get_ticket response
function formatGetTicket(data) {
  const ticket = data.results?.[0]?.summary || data.results?.[0]?.response_data || {};

  if (!ticket || !ticket.id) {
    return '❌ No ticket data found.';
  }

  // Message body with fallback chain (UPDATED WITH first_message fallback)
  const messageBody = ticket.messages?.[0]?.body_text
                   || ticket.messages?.[0]?.stripped_text
                   || ticket.first_message?.body_text  // ← NEW: Check summarized message
                   || ticket.body_text
                   || 'No message content available';

  const preview = messageBody.length > 300
    ? messageBody.substring(0, 300) + '...'
    : messageBody;

  let output = `🎫 Ticket #${ticket.id} - ${ticket.subject || 'No Subject'}\n\n`;

  output += `📋 Details:\n`;
  output += `• Status: ${ticket.status || 'Unknown'}\n`;
  output += `• Priority: ${ticket.priority || 'Unknown'}\n`;
  output += `• Customer: ${ticket.customer_name || 'Unknown'}\n`;
  output += `• Assignee: ${ticket.assignee || 'Unassigned'}\n`;
  output += `• Created: ${ticket.created || 'Unknown'}\n`;
  output += `• Last updated: ${ticket.updated || 'Unknown'}\n`;
  output += `• Messages: ${ticket.message_count || 'Unknown'}\n`;
  output += `• Tags: ${ticket.tags?.length > 0 ? ticket.tags.join(', ') : 'None'}\n\n`;

  output += `💬 Customer Message:\n`;
  output += `"${preview}"\n\n`;

  output += `💡 Quick Actions:\n`;
  output += `• Assign: "@Gorgias Terminal assign ticket ${ticket.id} to [email]"\n`;
  output += `• Add note: "@Gorgias Terminal add note to ticket ${ticket.id}: [message]"\n`;
  output += `• Update priority: "@Gorgias Terminal set ticket ${ticket.id} priority to urgent"`;

  return output;
}

// Format list_tickets response
function formatListTickets(data) {
  const tickets = data.results || [];

  if (tickets.length === 0) {
    return '📋 No tickets found matching your criteria.';
  }

  let output = `📋 Found ${tickets.length} ticket(s):\n\n`;

  tickets.forEach((item, index) => {
    const ticket = item.summary || item.response_data || {};

    // Get message preview with fallback
    const messageBody = ticket.messages?.[0]?.body_text
                     || ticket.messages?.[0]?.stripped_text
                     || ticket.first_message?.body_text  // ← NEW: Check summarized message
                     || ticket.body_text
                     || 'No message available';

    const preview = messageBody.length > 100
      ? messageBody.substring(0, 100) + '...'
      : messageBody;

    output += `${index + 1}. 🎫 #${ticket.id} - ${ticket.subject || 'No Subject'}\n`;
    output += `   Status: ${ticket.status || 'Unknown'} | Priority: ${ticket.priority || 'Unknown'}\n`;
    output += `   Customer: ${ticket.customer_name || 'Unknown'}\n`;
    output += `   Preview: "${preview}"\n\n`;
  });

  output += `💡 To view full details: "@Gorgias Terminal get ticket [ID]"`;

  return output;
}

// Format get_customer response
function formatGetCustomer(data) {
  const customer = data.results?.[0]?.summary || data.results?.[0]?.response_data || {};

  if (!customer || !customer.id) {
    return '❌ No customer data found.';
  }

  let output = `👤 Customer Profile\n\n`;

  output += `📋 Details:\n`;
  output += `• Name: ${customer.name || 'Unknown'}\n`;
  output += `• Email: ${customer.email || 'Unknown'}\n`;
  output += `• Total Tickets: ${customer.ticket_count || 0}\n`;
  output += `• Created: ${customer.created || 'Unknown'}\n`;
  output += `• Last Updated: ${customer.updated || 'Unknown'}\n`;
  output += `• Tags: ${customer.tags?.length > 0 ? customer.tags.join(', ') : 'None'}\n\n`;

  output += `💡 Quick Actions:\n`;
  output += `• View tickets: "@Gorgias Terminal list tickets for customer ${customer.email}"\n`;
  output += `• Update customer: "@Gorgias Terminal update customer ${customer.id}"`;

  return output;
}

// Format list_customers response
function formatListCustomers(data) {
  const customers = data.results || [];

  if (customers.length === 0) {
    return '👥 No customers found matching your criteria.';
  }

  let output = `👥 Found ${customers.length} customer(s):\n\n`;

  customers.forEach((item, index) => {
    const customer = item.summary || item.response_data || {};

    output += `${index + 1}. 👤 ${customer.name || 'Unknown'}\n`;
    output += `   Email: ${customer.email || 'Unknown'}\n`;
    output += `   Tickets: ${customer.ticket_count || 0} | Tags: ${customer.tags?.length > 0 ? customer.tags.join(', ') : 'None'}\n\n`;
  });

  output += `💡 To view full details: "@Gorgias Terminal get customer [email]"`;

  return output;
}

// Format search_knowledge_base response
function formatSearchKnowledge(data) {
  const articles = data.results || [];

  if (articles.length === 0) {
    return '📚 No knowledge base articles found matching your search.';
  }

  let output = `📚 Found ${articles.length} knowledge base article(s):\n\n`;

  articles.forEach((item, index) => {
    const article = item.summary || item.response_data || {};

    output += `${index + 1}. 📄 ${article.title || 'Untitled'}\n`;
    output += `   URL: ${article.url || 'No URL'}\n`;
    if (article.excerpt) {
      const excerpt = article.excerpt.length > 150
        ? article.excerpt.substring(0, 150) + '...'
        : article.excerpt;
      output += `   Preview: "${excerpt}"\n`;
    }
    output += `\n`;
  });

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

  if (data.results && Array.isArray(data.results) && data.results.length > 0) {
    return `✅ Operation completed successfully. Found ${data.results.length} result(s).`;
  }

  return `✅ Operation completed successfully.`;
}

// Main formatting logic
const inputData = $input.first().json;
const action = inputData.action || 'unknown';

let formattedOutput = '';

switch (action) {
  case 'get_ticket':
    formattedOutput = formatGetTicket(inputData);
    break;

  case 'list_tickets':
    formattedOutput = formatListTickets(inputData);
    break;

  case 'get_customer':
    formattedOutput = formatGetCustomer(inputData);
    break;

  case 'list_customers':
    formattedOutput = formatListCustomers(inputData);
    break;

  case 'search_knowledge_base':
    formattedOutput = formatSearchKnowledge(inputData);
    break;

  case 'error':
    formattedOutput = formatError(inputData);
    break;

  default:
    formattedOutput = formatGeneric(inputData);
}

// Return formatted output
return [{
  json: {
    formatted_message: formattedOutput,
    original_action: action,
    timestamp: new Date().toISOString()
  }
}];
