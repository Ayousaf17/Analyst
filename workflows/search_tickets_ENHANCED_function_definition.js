// ENHANCED search_tickets function definition
// Replace the existing search_tickets function in Build_OpenAI_Request_FULL.js with this:

{
  type: "function",
  function: {
    name: "search_tickets",
    description: "Search for tickets using text search and/or filters like status, priority, assignee, customer, or tags. Use when user wants to find specific tickets matching criteria.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search for in ticket content, subject, or messages (e.g., 'billing', 'refund', 'shipping issue')"
        },
        status: {
          type: "string",
          enum: ["open", "closed", "pending"],
          description: "Filter by ticket status. Use 'open' for active tickets, 'closed' for resolved, 'pending' for awaiting response"
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "Filter by ticket priority level"
        },
        customer_email: {
          type: "string",
          description: "Filter by customer's email address to find all tickets from a specific customer"
        },
        assignee_email: {
          type: "string",
          description: "Filter by assignee's email address to find tickets assigned to a specific team member"
        },
        tags: {
          type: "string",
          description: "Filter by tag name (e.g., 'urgent', 'billing', 'ORDER-STATUS')"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return",
          default: 30
        }
      }
    }
  }
}
