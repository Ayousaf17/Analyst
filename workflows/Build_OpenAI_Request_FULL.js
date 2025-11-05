const userText = $json.user_text;

const requestBody = {
  model: "gpt-4o-mini-2024-07-18",
  messages: [
    {
      role: "user",
      content: userText
    }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "ask_clarification",
        description: "Ask the user for clarification or missing information when you don't have enough details to complete their request. Use this when required parameters are missing or the request is ambiguous.",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The clarifying question to ask the user"
            },
            context: {
              type: "string",
              description: "What action the user was trying to perform"
            },
            missing_info: {
              type: "string",
              description: "What specific information is needed (e.g., 'tags', 'assignee_email', 'ticket_id')"
            }
          },
          required: ["question"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_tickets",
        description: "List tickets with optional filters like status or priority. Use when user wants to see multiple tickets or filter tickets.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["open", "closed", "pending", "all"],
              description: "Filter tickets by status"
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high", "urgent"],
              description: "Filter tickets by priority"
            },
            limit: {
              type: "number",
              description: "Maximum number of tickets to return",
              default: 50
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_ticket",
        description: "Retrieve details of a specific ticket by its ID. Use when user mentions a specific ticket number or ID.",
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: "The ticket ID number"
            }
          },
          required: ["ticket_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "search_tickets",
        description: "Search for tickets using keywords or search terms. Use when user wants to find tickets by content, keywords, or topics.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term or keywords to find in tickets"
            },
            limit: {
              type: "number",
              description: "Maximum number of results",
              default: 30
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_ticket",
        description: "Create a new ticket. Use when user wants to open or create a new support ticket.",
        parameters: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              description: "Ticket subject or title"
            },
            message: {
              type: "string",
              description: "Ticket message or description"
            },
            customer_email: {
              type: "string",
              description: "Customer email address"
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high", "urgent"],
              description: "Ticket priority"
            }
          },
          required: ["subject", "message"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "close_ticket",
        description: "Close a ticket. Use when user wants to close, resolve, or mark a ticket as done.",
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: "The ticket ID to close"
            }
          },
          required: ["ticket_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "assign_ticket",
        description: "Assign a ticket to an agent. Use when user wants to assign or reassign a ticket to someone.",
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: "The ticket ID to assign"
            },
            assignee_email: {
              type: "string",
              description: "Email of the agent to assign the ticket to"
            }
          },
          required: ["ticket_id", "assignee_email"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "set_priority",
        description: "Set or change the priority of a ticket. Use when user wants to mark a ticket as urgent, high, normal, or low priority.",
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: "The ticket ID"
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
    {
      type: "function",
      function: {
        name: "set_status",
        description: "Change the status of a ticket. Use when user wants to change ticket status.",
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: "The ticket ID"
            },
            status: {
              type: "string",
              enum: ["open", "closed", "pending"],
              description: "New status"
            }
          },
          required: ["ticket_id", "status"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "add_tags",
        description: "Add tags to a ticket. Use when user wants to tag, label, or categorize a ticket.",
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: "The ticket ID"
            },
            tags: {
              type: "string",
              description: "Comma-separated tags to add"
            }
          },
          required: ["ticket_id", "tags"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "remove_tags",
        description: "Remove tags from a ticket. Use when user wants to untag or remove labels from a ticket.",
        parameters: {
          type: "object",
          properties: {
            ticket_id: {
              type: "string",
              description: "The ticket ID"
            },
            tags: {
              type: "string",
              description: "Comma-separated tags to remove"
            }
          },
          required: ["ticket_id", "tags"]
        }
      }
    }
  ],
  tool_choice: "auto",
  temperature: 0.1
};

return [{
  json: requestBody
}];
