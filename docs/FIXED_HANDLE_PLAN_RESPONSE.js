// Handle Plan AI Agent response with fallback
const planAiOutput = $json;
const userText = $('Parse Slack').first().json.user_text;

let plan = [];

try {
  // Check if output exists and is not empty
  if (planAiOutput.output && typeof planAiOutput.output === 'object' && Object.keys(planAiOutput.output).length > 0) {
    // Valid output from AI Agent
    plan = planAiOutput.output.plan || [];
  }
  // If output is empty, create a smart fallback based on user text
  else {
    console.log('Plan AI returned empty output, using intelligent fallback');

    const text = userText.toLowerCase();

    // ═══════════════════════════════════════════════════════════════
    // CRITICAL: Check for CUSTOMER operations FIRST (Bug #4 Fix)
    // ═══════════════════════════════════════════════════════════════

    if (text.includes('customer') || text.includes('customers')) {
      // User is asking about CUSTOMERS, not tickets

      if (text.includes('list') || text.includes('show') || text.includes('all')) {
        // "list customers", "show customers", "all customers"
        plan = [{"step": 1, "action": "list_customers"}];
      }
      else if (text.includes('get') && /\d+/.test(text)) {
        // "get customer 123"
        const customerId = text.match(/\d+/)[0];
        plan = [{"step": 1, "action": "get_customer", "customer_id": customerId}];
      }
      else if (text.includes('how many') || text.includes('count')) {
        // "how many customers", "customer count"
        plan = [{"step": 1, "action": "list_customers"}];
      }
      else {
        // Default for customer-related queries
        plan = [{"step": 1, "action": "list_customers"}];
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // METRICS/ANALYTICS DETECTION (Check BEFORE ticket operations)
    // ═══════════════════════════════════════════════════════════════

    else if (
      text.includes('metric') ||
      text.includes('stat') ||
      text.includes('performance') ||
      text.includes('analytics') ||
      (text.includes('how many') && text.includes('ticket')) ||
      text.includes('which users') ||
      text.includes('who is') ||
      text.includes('fastest') ||
      text.includes('slowest') ||
      text.includes('best') ||
      text.includes('worst') ||
      text.includes('percentage')
    ) {
      plan = [{"step": 1, "action": "list_metrics"}];
    }

    // ═══════════════════════════════════════════════════════════════
    // TICKET OPERATIONS (Only if NOT customer or metrics)
    // ═══════════════════════════════════════════════════════════════

    else if (text.includes('close') || text.includes('shut')) {
      // User wants to close - but needs ticket ID, so search first
      const keyword = text.replace(/close|shut|ticket|the/g, '').trim();
      if (keyword.length > 2) {
        plan = [{"step": 1, "action": "search_tickets", "query": keyword}];
      } else {
        plan = [{"step": 1, "action": "list_tickets", "status": "open", "limit": 10}];
      }
    }
    else if (text.includes('search') || text.includes('find')) {
      const query = text.replace(/search|find|tickets|about|for/g, '').trim();
      plan = [{"step": 1, "action": "search_tickets", "query": query || ""}];
    }
    else if (text.includes('get ticket') && /\d{6,}/.test(text)) {
      // Extract ticket ID
      const ticketId = text.match(/\d{6,}/)[0];
      plan = [{"step": 1, "action": "get_ticket", "ticket_id": ticketId}];
    }
    else if (text.includes('ticket') && (text.includes('list') || text.includes('show') || text.includes('open'))) {
      // "list tickets", "show tickets", "open tickets"
      plan = [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}];
    }
    else {
      // Default fallback - list open tickets
      plan = [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}];
    }
  }

  console.log('User text:', userText);
  console.log('Final plan:', JSON.stringify(plan));

} catch (e) {
  console.error('Error in Handle Plan Response:', e);
  // Ultimate fallback
  plan = [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}];
}

// Return the plan in the format Format Session expects
return [{
  json: {
    plan: plan,
    raw_ai_output: planAiOutput
  }
}];
