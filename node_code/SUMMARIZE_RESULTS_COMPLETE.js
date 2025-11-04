// ============================================
// COMPLETE CODE FOR: Summarize Results for AI Node
// ============================================
// This node processes ticket/customer/order data and creates
// token-efficient summaries for AI consumption
// ============================================

// Helper function to truncate strings
function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

// Main summarization function
function summarizeObject(obj, type = 'unknown') {
  const summary = {};

  // Basic fields
  summary.id = obj.id || null;

  if (type === 'ticket') {
    summary.subject = truncate(obj.subject || '', 100);
    summary.status = obj.status || null;
    summary.priority = obj.priority || null;
    summary.customer_name = obj.customer?.name || obj.requester?.name || null;
    summary.created = obj.created_datetime ? obj.created_datetime.split('T')[0] : null;
    summary.updated = obj.updated_datetime ? obj.updated_datetime.split('T')[0] : null;
    summary.closed = obj.closed_datetime ? obj.closed_datetime.split('T')[0] : null;
    summary.tags = Array.isArray(obj.tags) ? obj.tags.slice(0, 5) : [];
    summary.assignee = obj.assignee_user?.name || obj.assignee_user?.email || null;

    // Messages (keep first message body for context) ← UPDATED SECTION
    if (obj.messages && Array.isArray(obj.messages) && obj.messages.length > 0) {
      summary.message_count = obj.messages.length;

      // Keep first message body (customer's original message)
      const firstMessage = obj.messages[0];
      if (firstMessage) {
        summary.first_message = {
          body_text: truncate(firstMessage.body_text || firstMessage.stripped_text || '', 500),
          from_agent: firstMessage.from_agent || false,
          created: firstMessage.created_datetime ? firstMessage.created_datetime.split('T')[0] : null
        };
      }
    } else if (obj.messages) {
      summary.message_count = 1;
    }

    // Custom fields (limit to 5 most relevant)
    if (obj.custom_fields && typeof obj.custom_fields === 'object') {
      summary.custom_fields = {};
      const fields = Object.entries(obj.custom_fields).slice(0, 5);
      fields.forEach(([key, value]) => {
        summary.custom_fields[key] = typeof value === 'string' ? truncate(value, 50) : value;
      });
    }
  } else if (type === 'customer') {
    summary.name = obj.name || null;
    summary.email = obj.email || null;
    summary.created = obj.created_datetime ? obj.created_datetime.split('T')[0] : null;
    summary.updated = obj.updated_datetime ? obj.updated_datetime.split('T')[0] : null;
    summary.ticket_count = obj.statistics?.ticket_count || 0;
    summary.tags = Array.isArray(obj.tags) ? obj.tags.slice(0, 5) : [];
  } else if (type === 'order') {
    summary.order_number = obj.order_number || obj.name || null;
    summary.created = obj.created_at ? obj.created_at.split('T')[0] : null;
    summary.total = obj.total_price || obj.subtotal_price || null;
    summary.currency = obj.currency || null;
    summary.status = obj.financial_status || obj.fulfillment_status || null;
    summary.customer_name = obj.customer?.first_name && obj.customer?.last_name
      ? `${obj.customer.first_name} ${obj.customer.last_name}`
      : obj.customer?.email || null;
  }

  return summary;
}

// Process all items from input
const items = $input.all();
const results = [];

for (const item of items) {
  const data = item.json;

  // Determine data type
  let type = 'unknown';
  if (data.subject || data.status || data.ticket_id) {
    type = 'ticket';
  } else if (data.email && (data.name || data.statistics)) {
    type = 'customer';
  } else if (data.order_number || data.total_price) {
    type = 'order';
  }

  // Summarize the data
  const summary = summarizeObject(data, type);

  results.push({
    json: {
      type: type,
      summary: summary,
      original_id: data.id
    }
  });
}

return results;
