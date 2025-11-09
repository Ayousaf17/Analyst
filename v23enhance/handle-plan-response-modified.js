// ============================================================================
// NODE: Handle Plan Response (MODIFIED FOR PATTERN 3)
// ============================================================================
// Purpose: Parse OpenAI function call + resolve NEEDS_CLARIFICATION placeholders
// Position: After "OpenAI Structured Output"
// Changes from v23: Added smart parameter resolution logic
// ============================================================================

const httpResponse = $json;

console.log('═══════════════════════════════════════');
console.log('🔍 Handle Plan Response (Smart Resolution)');
console.log('═══════════════════════════════════════');

// Get user context
const parseSlackData = $('Parse Slack').first().json;
const enrichedData = $('Enrich Context').first().json;
const userText = parseSlackData.user_text;
const channel = parseSlackData.channel;
const threadTs = parseSlackData.thread_ts;
const correlationId = parseSlackData.correlation_id || '';
const userId = parseSlackData.user_id || '';

// Get context entities
const lastTicket = enrichedData.last_ticket;
const lastUser = enrichedData.last_user;

let plan = [];

// ============================================================================
// STEP 1: Extract Function Call from OpenAI Response
// ============================================================================

try {
  const message = httpResponse.choices[0].message;
  
  // Check if OpenAI called a function
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];
    const functionName = toolCall.function.name;
    let functionArgs = JSON.parse(toolCall.function.arguments);
    
    console.log('✅ Function called:', functionName);
    console.log('📦 Raw arguments:', JSON.stringify(functionArgs, null, 2));
    
    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Smart Parameter Resolution
    // ═══════════════════════════════════════════════════════════════
    
    let needsClarification = false;
    let clarificationQuestion = '';
    
    // ───────────────────────────────────────────────────────────────
    // 2a. Resolve ticket_id (if NEEDS_CLARIFICATION)
    // ───────────────────────────────────────────────────────────────
    if (functionArgs.ticket_id === 'NEEDS_CLARIFICATION') {
      console.log('⚠️ ticket_id needs resolution');
      
      if (lastTicket) {
        // Use context
        functionArgs.ticket_id = lastTicket;
        console.log(`✅ Resolved "it" to ticket #${lastTicket}`);
      } else {
        // Need to ask
        needsClarification = true;
        clarificationQuestion = 'Which ticket would you like me to work with? Please provide the ticket ID.';
        console.log('❌ No ticket in context - asking for clarification');
      }
    }
    
    // ───────────────────────────────────────────────────────────────
    // 2b. Resolve assignee_email (map first names to emails)
    // ───────────────────────────────────────────────────────────────
    if (functionArgs.assignee_email && !functionArgs.assignee_email.includes('@')) {
      console.log('⚠️ assignee_email is a first name, needs mapping');
      
      // Team member mapping (CUSTOMIZE FOR YOUR TEAM)
      const emailMap = {
        'spencer': 'spencer@ironsidecomputers.com',
        'alex': 'alex@ironsidecomputers.com',
        'jamie': 'jamie@ironsidecomputers.com',
        'taylor': 'taylor@ironsidecomputers.com',
        'jordan': 'jordan@ironsidecomputers.com',
        'riley': 'riley@ironsidecomputers.com'
      };
      
      const firstName = functionArgs.assignee_email.toLowerCase();
      
      if (emailMap[firstName]) {
        functionArgs.assignee_email = emailMap[firstName];
        console.log(`✅ Resolved "${firstName}" to ${emailMap[firstName]}`);
      } else {
        // Unknown name
        needsClarification = true;
        clarificationQuestion = `I don't recognize "${firstName}". Can you provide their full email address?`;
        console.log(`❌ Unknown team member: ${firstName}`);
      }
    }
    
    // ───────────────────────────────────────────────────────────────
    // 2c. Resolve customer_email (if NEEDS_CLARIFICATION)
    // ───────────────────────────────────────────────────────────────
    if (functionArgs.customer_email === 'NEEDS_CLARIFICATION') {
      needsClarification = true;
      clarificationQuestion = 'What is the customer\\'s email address?';
      console.log('❌ customer_email needs clarification');
    }
    
    // ───────────────────────────────────────────────────────────────
    // 2d. Resolve priority (map natural language to enum)
    // ───────────────────────────────────────────────────────────────
    if (functionArgs.priority) {
      const priorityMap = {
        'critical': 'urgent',
        'asap': 'urgent',
        'important': 'high',
        'medium': 'normal'
      };
      
      const normalizedPriority = functionArgs.priority.toLowerCase();
      
      if (priorityMap[normalizedPriority]) {
        const originalPriority = functionArgs.priority;
        functionArgs.priority = priorityMap[normalizedPriority];
        console.log(`✅ Mapped "${originalPriority}" to "${functionArgs.priority}"`);
      }
    }
    
    // ───────────────────────────────────────────────────────────────
    // 2e. Resolve status (map natural language to enum)
    // ───────────────────────────────────────────────────────────────
    if (functionArgs.status) {
      const statusMap = {
        'resolved': 'closed',
        'done': 'closed',
        'waiting': 'pending',
        'hold': 'pending'
      };
      
      const normalizedStatus = functionArgs.status.toLowerCase();
      
      if (statusMap[normalizedStatus]) {
        const originalStatus = functionArgs.status;
        functionArgs.status = statusMap[normalizedStatus];
        console.log(`✅ Mapped "${originalStatus}" to "${functionArgs.status}"`);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Build Plan or Ask for Clarification
    // ═══════════════════════════════════════════════════════════════
    
    if (needsClarification) {
      // Ask user for missing information
      console.log('❓ Asking for clarification:', clarificationQuestion);
      
      plan = [{\n        step: 1,
        action: 'ask_clarification',
        question: clarificationQuestion,
        context: `Trying to ${functionName}`,
        original_function: functionName,
        original_args: functionArgs
      }];
      
    } else {
      // All parameters resolved - create plan
      console.log('✅ All parameters resolved - creating plan');
      
      plan = [{\n        step: 1,
        action: functionName,
        ...functionArgs,
        
        // Metadata for logging
        _resolved: true,
        _had_context: enrichedData.has_context,
        _used_last_ticket: functionArgs.ticket_id === lastTicket,
        _used_last_user: functionArgs.assignee_email === lastUser
      }];
    }
    
    console.log('📤 Final plan:', JSON.stringify(plan, null, 2));
    
  } else {
    // ═══════════════════════════════════════════════════════════════
    // No Function Call - OpenAI Responded with Text
    // ═══════════════════════════════════════════════════════════════
    
    console.log('⚠️ No function call detected');
    
    // Check if OpenAI responded with clarifying question
    if (message.content && message.content.trim() !== '') {
      console.log('✅ OpenAI asked clarifying question:', message.content);
      
      plan = [{\n        step: 1,
        action: 'ask_clarification',
        question: message.content
      }];
      
    } else {
      console.error('❌ No function call and no text content');
      
      // Fallback plan
      plan = [{\n        step: 1,
        action: 'list_tickets',
        status: 'open',
        limit: 50,
        _fallback: true
      }];
    }
  }
  
} catch (e) {
  console.error('❌ Failed to parse OpenAI response:', e.message);
  console.error('Raw response:', JSON.stringify(httpResponse, null, 2));
  
  // Error fallback
  plan = [{\n    step: 1,
    action: 'ask_clarification',
    question: 'Sorry, I didn\\'t understand that. Can you rephrase your request?',
    _error: e.message
  }];
}

console.log('═══════════════════════════════════════');
console.log('✅ Plan finalized with', plan.length, 'step(s)');
console.log('═══════════════════════════════════════');

// ============================================================================
// STEP 4: Return Plan
// ============================================================================

return [{
  json: {
    plan: plan,
    user_text: userText,
    channel: channel,
    thread_ts: threadTs,
    correlation_id: correlationId,
    user_id: userId,
    
    // Metadata for analytics
    resolution_metadata: {
      had_context: enrichedData.has_context,
      last_ticket_used: plan[0]?.ticket_id === lastTicket,
      last_user_used: plan[0]?.assignee_email === lastUser,
      needed_clarification: plan[0]?.action === 'ask_clarification'
    }
  }
}];
