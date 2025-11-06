# Add Analytics Function to OpenAI Request

**Current Issue:** Your Build OpenAI Request node has NO analytics/metrics function!

**What you have:**
- 11 functions (list_tickets, get_ticket, close_ticket, etc.)
- ❌ NO analyze_insights
- ❌ NO list_metrics
- ❌ NO show_statistics

**What this means:**
- Users CAN'T trigger analytics with natural language
- "show me insights" → might default to list_tickets
- "what are common issues?" → might search tickets
- "analyze patterns" → might fail

**Solution:** Add analytics functions to your Build OpenAI Request node

---

## 🔧 Functions to Add

### **Function 1: analyze_insights** (CRITICAL)

This routes to your existing Claude Sonnet 4.5 analytics branch!

```javascript
{
  type: "function",
  function: {
    name: "analyze_insights",
    description: "Analyze closed tickets from the last 30 days to identify recurring issues, patterns, and operational improvement opportunities. Use when user wants insights, trends, common problems, or recommendations to reduce ticket volume.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["7d", "30d", "90d"],
          description: "Time period to analyze (7 days, 30 days, or 90 days)",
          default: "30d"
        },
        focus: {
          type: "string",
          enum: ["recurring_questions", "tag_analysis", "assignee_performance", "all"],
          description: "What to focus the analysis on",
          default: "all"
        }
      }
    }
  }
}
```

**Trigger phrases:**
- "show me insights"
- "what are the most common issues?"
- "analyze ticket patterns"
- "what problems are recurring?"
- "give me recommendations to reduce tickets"
- "what should we improve?"

---

### **Function 2: list_metrics** (OPTIONAL - for future)

For quick statistics without deep analysis.

```javascript
{
  type: "function",
  function: {
    name: "list_metrics",
    description: "Get ticket statistics and metrics like volume, resolution times, status distribution, and agent performance. Use when user wants quick numbers or dashboard-style metrics.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month"],
          description: "Time period for metrics (today, this week, or this month)",
          default: "week"
        },
        group_by: {
          type: "string",
          enum: ["status", "priority", "assignee", "tag"],
          description: "How to group the metrics",
          default: "status"
        }
      }
    }
  }
}
```

**Trigger phrases:**
- "show me ticket metrics"
- "how many tickets this week?"
- "what's our resolution time?"
- "show agent performance"
- "ticket stats"

---

## 📝 Complete Updated Code

Here's your **Build OpenAI Request** node with analytics added:

```javascript
// ============================================================================
// UPDATED CODE FOR: Build OpenAI Request Node (WITH ANALYTICS FUNCTION)
// ============================================================================

const userText = $json.user_text;

const requestBody = {
  model: $vars.OPENAI_MODEL,
  messages: [
    {
      role: "user",
      content: userText
    }
  ],
  tools: [
    // ========================================
    // EXISTING FUNCTIONS (keep all 11)
    // ========================================
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
    },

    // ========================================
    // NEW: ANALYTICS FUNCTION ✅
    // ========================================
    {
      type: "function",
      function: {
        name: "analyze_insights",
        description: "Analyze closed tickets from the last 30 days to identify recurring issues, customer pain points, tag patterns, and operational improvement opportunities. Use when user asks for insights, trends, common problems, patterns, or recommendations to reduce ticket volume. Provides actionable recommendations with specific examples and ticket volume data.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["7d", "30d", "90d"],
              description: "Time period to analyze (7 days, 30 days, or 90 days)",
              default: "30d"
            },
            focus: {
              type: "string",
              enum: ["recurring_questions", "tag_analysis", "assignee_performance", "all"],
              description: "What to focus the analysis on: recurring customer questions, tag distribution, agent performance, or comprehensive analysis",
              default: "all"
            }
          }
        }
      }
    }

    // ========================================
    // OPTIONAL: LIST_METRICS FUNCTION
    // (Uncomment if you want quick stats)
    // ========================================
    /*
    {
      type: "function",
      function: {
        name: "list_metrics",
        description: "Get quick ticket statistics and metrics like volume, resolution times, status distribution, and agent performance. Use when user wants dashboard-style numbers or quick stats without deep analysis.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["today", "week", "month"],
              description: "Time period for metrics (today, this week, or this month)",
              default: "week"
            },
            group_by: {
              type: "string",
              enum: ["status", "priority", "assignee", "tag"],
              description: "How to group the metrics",
              default: "status"
            }
          }
        }
      }
    }
    */
  ],
  tool_choice: "auto",
  temperature: parseFloat($vars.OPENAI_TEMPERATURE_PLAN),
  max_tokens: parseInt($vars.OPENAI_MAX_TOKENS)
};

return [{
  json: requestBody
}];
```

---

## 🔀 Update Route by Action Switch

Once you add the analytics function, make sure your **Route by Action** switch has an output for it:

**Current outputs (15):**
- Output 0: list_tickets
- Output 1: get_ticket
- Output 2: search_tickets
- Output 3: create_ticket
- Output 4: close_ticket
- Output 5: assign_ticket
- Output 6: set_priority
- Output 7: set_status
- Output 8: add_tags
- Output 9: remove_tags
- Output 10: ask_clarification
- Output 11-14: (other actions)

**Add:**
- **Output 15: analyze_insights** → Routes to Fetch Tickets for Analytics

---

## 🧪 Testing Analytics Function

**After adding the function, test with:**

1. **"show me insights"**
   - Should call analyze_insights()
   - Should route to Fetch Tickets for Analytics
   - Should return Claude Sonnet 4.5 analysis

2. **"what are the most common issues?"**
   - Should call analyze_insights()
   - Focus on recurring_questions

3. **"analyze ticket patterns from last 90 days"**
   - Should call analyze_insights(period: "90d")

4. **"show team performance"**
   - Should call analyze_insights(focus: "assignee_performance")

---

## 📊 Expected Flow

**Before (broken):**
```
User: "show me insights"
    ↓
OpenAI: No analyze_insights function → defaults to list_tickets
    ↓
Shows ticket list (not insights!) ❌
```

**After (working):**
```
User: "show me insights"
    ↓
OpenAI: analyze_insights() ✅
    ↓
Route by Action → analyze_insights output
    ↓
Fetch Tickets for Analytics (1000 tickets)
    ↓
Ticket Analytics Agent (Claude Sonnet 4.5)
    ↓
Insights with recurring_questions, top_tags, recommendations ✅
```

---

## ✅ Summary

**What you need to do:**

1. **Add analyze_insights function** to Build OpenAI Request (code above)
2. **Add Output 15** to Route by Action switch
3. **Connect Output 15** to Fetch Tickets for Analytics
4. **Test** with "show me insights"

**Optional:**
- Add list_metrics function (for future quick stats)
- Add more analytics functions as needed

**Result:**
- Users can now trigger analytics with natural language ✅
- OpenAI routes to your Claude Sonnet 4.5 analytics branch ✅
- Analytics stays isolated from regular API requests ✅

---

**Ready to implement?** Just copy the updated Build OpenAI Request code and add the Route by Action output! 🚀
