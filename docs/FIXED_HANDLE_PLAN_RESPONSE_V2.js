// Handle Plan AI Agent response with fallback
// Updated to handle OpenAI's "output" wrapper correctly

const planAiOutput = $json;
const userText = $('Parse Slack').first().json.user_text;

let plan = [];

try {
  // ═══════════════════════════════════════════════════════════════
  // EXTRACT PLAN FROM CORRECT PATH
  // ═══════════════════════════════════════════════════════════════

  // OpenAI Structured Output wraps response in "output" key
  // So the structure is: { "output": { "plan": [...] } }
  // NOT: { "plan": [...] }

  if (planAiOutput.output?.plan && Array.isArray(planAiOutput.output.plan) && planAiOutput.output.plan.length > 0) {
    // Valid plan from AI - extract from output.plan path ✅
    plan = planAiOutput.output.plan;
    console.log('✅ Valid plan from AI:', JSON.stringify(plan));
  }
  // Fallback: Check if plan is at root level (old format)
  else if (planAiOutput.plan && Array.isArray(planAiOutput.plan) && planAiOutput.plan.length > 0) {
    plan = planAiOutput.plan;
    console.log('✅ Valid plan from AI (root level):', JSON.stringify(plan));
  }
  // If no valid plan, create intelligent fallback based on user text
  else {
    console.log('⚠️  Plan AI returned empty/invalid output, using intelligent fallback');
    console.log('Raw AI output:', JSON.stringify(planAiOutput));

    const text = userText.toLowerCase();

    // ═══════════════════════════════════════════════════════════════
    // CRITICAL: Check for CUSTOMER operations FIRST (Bug #4 Fix)
    // ═══════════════════════════════════════════════════════════════

    if (text.includes('customer') || text.includes('customers')) {
      // User is asking about CUSTOMERS, not tickets

      if (text.includes('list') || text.includes('show') || text.includes('all')) {
        // "list customers", "show customers", "all customers"
        plan = [{"step": 1, "action": "list_customers"}];
        console.log('📋 Fallback: list_customers');
      }
      else if (text.includes('get') && /\d+/.test(text)) {
        // "get customer 123"
        const customerId = text.match(/\d+/)[0];
        plan = [{"step": 1, "action": "get_customer", "customer_id": customerId}];
        console.log('👤 Fallback: get_customer', customerId);
      }
      else if (text.includes('how many') || text.includes('count')) {
        // "how many customers", "customer count"
        plan = [{"step": 1, "action": "list_customers"}];
        console.log('📊 Fallback: list_customers (count)');
      }
      else {
        // Default for customer-related queries
        plan = [{"step": 1, "action": "list_customers"}];
        console.log('📋 Fallback: list_customers (default)');
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
      text.includes('percentage') ||
      text.includes('team performance')
    ) {
      plan = [{"step": 1, "action": "list_metrics"}];
      console.log('📊 Fallback: list_metrics');
    }

    // ═══════════════════════════════════════════════════════════════
    // EMAIL ADDRESS DETECTION
    // ═══════════════════════════════════════════════════════════════

    else if (/@/.test(text) && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
      // Email detected
      const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)[0];
      plan = [{"step": 1, "action": "list_tickets", "customer_email": email}];
      console.log('📧 Fallback: list_tickets with email', email);
    }

    // ═══════════════════════════════════════════════════════════════
    // TICKET OPERATIONS (Only if NOT customer or metrics)
    // ═══════════════════════════════════════════════════════════════

    else if (text.includes('close') || text.includes('shut')) {
      // User wants to close - but needs ticket ID
      if (/\d{6,}/.test(text)) {
        const ticketId = text.match(/\d{6,}/)[0];
        plan = [{"step": 1, "action": "close_ticket", "ticket_id": ticketId}];
        console.log('🔒 Fallback: close_ticket', ticketId);
      } else {
        // No ticket ID, search first
        const keyword = text.replace(/close|shut|ticket|the/g, '').trim();
        if (keyword.length > 2) {
          plan = [{"step": 1, "action": "search_tickets", "query": keyword}];
          console.log('🔍 Fallback: search_tickets', keyword);
        } else {
          plan = [{"step": 1, "action": "list_tickets", "status": "open", "limit": 10}];
          console.log('📋 Fallback: list_tickets (open)');
        }
      }
    }
    else if (text.includes('search') || text.includes('find')) {
      const query = text.replace(/search|find|tickets|about|for/g, '').trim();
      plan = [{"step": 1, "action": "search_tickets", "query": query || ""}];
      console.log('🔍 Fallback: search_tickets', query);
    }
    else if (text.includes('get ticket') && /\d{6,}/.test(text)) {
      // Extract ticket ID
      const ticketId = text.match(/\d{6,}/)[0];
      plan = [{"step": 1, "action": "get_ticket", "ticket_id": ticketId}];
      console.log('🎫 Fallback: get_ticket', ticketId);
    }
    else if (text.includes('ticket') && (text.includes('list') || text.includes('show') || text.includes('open'))) {
      // "list tickets", "show tickets", "open tickets"
      plan = [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}];
      console.log('📋 Fallback: list_tickets');
    }
    else {
      // Default fallback - list open tickets
      plan = [{"step": 1, "action": "list_tickets", "status": "open", "limit": 50}];
      console.log('📋 Fallback: list_tickets (default)');
    }
  }

  console.log('User text:', userText);
  console.log('Final plan:', JSON.stringify(plan));

} catch (e) {
  console.error('❌ Error in Handle Plan Response:', e);
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
