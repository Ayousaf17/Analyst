// ============================================================================
// NODE: Build OpenAI Request (MODIFIED FOR PATTERN 3)
// ============================================================================
// Purpose: Build function calling request with context-enriched descriptions
// Position: After "Enrich Context"
// Changes from v23: Added context awareness + enriched function descriptions
// ============================================================================

const enrichedData = $json;
const userText = enrichedData.user_text_with_context;  // Context-enriched version
const lastTicket = enrichedData.last_ticket;
const lastUser = enrichedData.last_user;
const lastAction = enrichedData.last_action;

console.log('═══════════════════════════════════════');
console.log('🔨 Building OpenAI Request (Context-Aware)');
console.log('═══════════════════════════════════════');
console.log('Context available:', enrichedData.has_context);
console.log('Last ticket:', lastTicket || 'none');
console.log('Last user:', lastUser || 'none');

// ============================================================================
// Build Context-Aware System Message
// ============================================================================

const systemMessage = `You are a friendly Gorgias ticket assistant that understands natural language and context.

CONTEXT AVAILABLE:
${lastTicket ? `- Last ticket discussed: #${lastTicket}` : '- No ticket context'}
${lastUser ? `- Last user discussed: ${lastUser}` : '- No user context'}
${lastAction ? `- Last action: ${lastAction}` : '- No action context'}

NATURAL LANGUAGE UNDERSTANDING:
When users say casual things, map them to function parameters:

Pronouns:
- "close it" → use ticket_id=${lastTicket || 'NEEDS_CLARIFICATION'}
- "assign it to spencer" → use ticket_id=${lastTicket || 'NEEDS_CLARIFICATION'}, assignee_email=spencer@...
- "show me that ticket" → use ticket_id=${lastTicket || 'NEEDS_CLARIFICATION'}

Names (map to emails):
- "spencer's tickets" → assignee_email="spencer@ironsidecomputers.com"
- "alex's stuff" → assignee_email="alex@ironsidecomputers.com"
- "jamie" → assignee_email="jamie@ironsidecomputers.com"

Shorthand:
- "urgent tickets" → priority="urgent", status="open"
- "billing issues" → query="billing"
- "show open" → status="open"

RULES:
1. Be flexible with phrasing - understand intent, not just exact words
2. Use context (last ticket, last user) when user references "it" or "that"
3. If context is missing for a pronoun, output NEEDS_CLARIFICATION in the parameter
4. Map first names to full email addresses using your knowledge of the team
5. Always try to fulfill the request - don't give up easily`;

// ============================================================================
// Build Request Body with Enriched Functions
// ============================================================================

const requestBody = {
  model: $vars.OPENAI_MODEL || "gpt-4o",
  messages: [
    {
      role: "system",
      content: systemMessage
    },
    {
      role: "user",
      content: userText
    }
  ],
  
  tools: [
    // ────────────────────────────────────────────────────────────────
    // Function 1: ask_clarification (unchanged)
    // ────────────────────────────────────────────────────────────────
    {
      type: "function",
      function: {
        name: "ask_clarification",
        description: "Ask for missing information when you can't resolve parameters from context. Use ONLY when absolutely necessary - try to use context first.",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The clarifying question to ask"
            },
            context: {
              type: "string",
              description: "What you were trying to do"
            },
            missing_info: {
              type: "string",
              description: "What specific info is needed"
            }
          },
          required: ["question"]
        }
      }
    },
    
    // ────────────────────────────────────────────────────────────────
    // Function 2: list_tickets (enriched)
    // ────────────────────────────────────────────────────────────────
    {
      type: "function",
      function: {
        name: "list_tickets",
        description: `List tickets with filters. Use when user says:
- "show tickets" / "list tickets" / "what's in the queue"
- "show open tickets" / "display closed tickets"
- "show urgent tickets" / "high priority tickets"

Natural language examples:
- "show me the queue" → list_tickets with status="open"
- "urgent tickets" → list_tickets with priority="urgent", status="open"
- "what's closed today" → list_tickets with status="closed"`,
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["open", "closed", "pending", "all"],
              description: "Filter by status. Default: open"
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high", "urgent"],
              description: "Filter by priority"
            },
            limit: {
              type: "number",
              description: "Max tickets to return",
              default: 50
            }
          }
        }
      }
    },
    
    // ────────────────────────────────────────────────────────────────
    // Function 3: get_ticket (enriched with pronoun support)
    // ────────────────────────────────────────────────────────────────
    {
      type: "function",
      function: {
        name: "get_ticket",
        description: `Get details of a specific ticket. Use when user mentions:
- Explicit ID: "get ticket 12345" / "show ticket #12345"
- Pronoun referring to last ticket: "show it" / "view that ticket" / "close it"
- Context clue: "the ticket I mentioned" / "that one"

PRONOUN RESOLUTION:
If user says "it" / "that ticket" / "this one" and lastTicket is available:
→ Use lastTicket=${lastTicket || 'NEEDS_CLARIFICATION'} as ticket_id

If no context and user didn't provide ID:
→ Use ticket_id="NEEDS_CLARIFICATION"`,
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: `Ticket ID number. Use ${lastTicket || 'NEEDS_CLARIFICATION'} if user says "it" or "that ticket".`
            }
          },
          required: ["ticket_id"]
        }
      }
    },
    
    // ────────────────────────────────────────────────────────────────
    // Function 4: search_tickets (enriched with name mapping)
    // ────────────────────────────────────────────────────────────────
    {
      type: "function",
      function: {
        name: "search_tickets",
        description: `Search for tickets using filters. Use when user mentions:
- Names: "spencer's tickets" / "alex's stuff" / "jamie's queue"
- Topics: "billing issues" / "refund requests" / "shipping problems"
- Status + filter: "open billing tickets" / "urgent refund requests"

NAME MAPPING:
Map first names to full emails:
- "spencer" / "spencer's" → assignee_email="spencer@ironsidecomputers.com"
- "alex" / "alex's" → assignee_email="alex@ironsidecomputers.com"
- "jamie" / "jamie's" → assignee_email="jamie@ironsidecomputers.com"

TOPIC MAPPING:
Map topics to query parameter:
- "billing issues" → query="billing"
- "refund requests" → query="refund"`,
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for ticket content/subject"
            },
            status: {
              type: "string",
              enum: ["open", "closed", "pending"],
              description: "Filter by status"
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high", "urgent"],
              description: "Filter by priority"
            },
            customer_email: {
              type: "string",
              description: "Filter by customer email"
            },
            assignee_email: {
              type: "string",
              description: `Filter by assignee. For first names, map to email (e.g., "spencer" → "spencer@ironsidecomputers.com"). For "mine", use ${lastUser || 'current_user'}.`
            },
            tags: {
              type: "string",
              description: "Filter by tag name"
            },
            limit: {
              type: "number",
              description: "Max results",
              default: 30
            }
          }
        }
      }
    },
    
    // ────────────────────────────────────────────────────────────────
    // Function 5: close_ticket (enriched)
    // ────────────────────────────────────────────────────────────────
    {
      type: "function",
      function: {
        name: "close_ticket",
        description: `Close a ticket. Use when user says:
- "close ticket 12345" / "close #12345"
- "close it" / "close that ticket" (uses lastTicket=${lastTicket || 'NEEDS_CLARIFICATION'})
- "mark as resolved" / "resolve it"`,
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: `Ticket ID to close. Use ${lastTicket || 'NEEDS_CLARIFICATION'} if user says "it".`
            }
          },
          required: ["ticket_id"]
        }
      }
    },
    
    // ────────────────────────────────────────────────────────────────
    // Function 6: assign_ticket (enriched)
    // ────────────────────────────────────────────────────────────────
    {
      type: "function",
      function: {
        name: "assign_ticket",
        description: `Assign a ticket to someone. Use when user says:
- "assign ticket 12345 to spencer" / "assign to alex"
- "assign it to jamie" (uses lastTicket=${lastTicket || 'NEEDS_CLARIFICATION'})
- "give it to taylor"

NAME MAPPING (same as search_tickets):
- "spencer" → "spencer@ironsidecomputers.com"
- "alex" → "alex@ironsidecomputers.com"`,
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: `Ticket ID to assign. Use ${lastTicket || 'NEEDS_CLARIFICATION'} if user says "it".`
            },
            assignee_email: {
              type: "string",
              description: "Email of assignee. Map first names to full emails."
            }
          },
          required: ["ticket_id", "assignee_email"]
        }
      }
    },
    
    // ────────────────────────────────────────────────────────────────
    // Function 7: set_priority (enriched)
    // ────────────────────────────────────────────────────────────────
    {
      type: "function",
      function: {
        name: "set_priority",
        description: `Change ticket priority. Use when user says:
- "set ticket 12345 to urgent" / "make it high priority"
- "mark as urgent" / "bump priority"

PRIORITY MAPPING:
- "urgent" / "critical" / "asap" → "urgent"
- "high" / "important" → "high"
- "normal" / "medium" → "normal"
- "low" → "low"`,
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: `Ticket ID. Use ${lastTicket || 'NEEDS_CLARIFICATION'} if user says "it".`
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high", "urgent"],
              description: "New priority level"
            }
          },
          required: ["ticket_id", "priority"]
        }
      }
    },
    
    // ────────────────────────────────────────────────────────────────
    // Remaining functions (simplified - use same enrichment pattern)
    // ────────────────────────────────────────────────────────────────
    
    // ... (include rest of your 21 functions with similar context-aware descriptions)
    // I've shown the pattern for the most important 7 functions
    // Apply the same enrichment to: create_ticket, set_status, add_tags, etc.
  ],
  
  tool_choice: "auto",
  temperature: parseFloat($vars.OPENAI_TEMPERATURE_PLAN) || 0.7,  // Increased for flexibility
  max_tokens: parseInt($vars.OPENAI_MAX_TOKENS) || 4096
};

console.log('✅ Built context-aware request');
console.log('  Functions available:', requestBody.tools.length);
console.log('  Context in system message:', enrichedData.has_context);
console.log('═══════════════════════════════════════');

return [{
  json: requestBody
}];
