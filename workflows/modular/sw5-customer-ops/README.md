# SW5 - Customer Operations

**Workflow:** Ironside Computers — SW5 - Customer Operations
**Type:** AI Agent + HTTP Request Tools
**Status:** ✅ Complete, Ready to Enable

---

## 🎯 Purpose

SW5 handles all customer-related operations in Gorgias:
- **Customer Discovery** - List, search, get customer details
- **Customer Tickets** - View all tickets for a customer
- **Customer Analytics** - Ticket counts, stats, history

---

## 🏗️ Architecture

**Pattern:** AI Agent with HTTP Request Tool nodes (same as SW1, SW3, SW4)

**Nodes:** 11 total
- 1 Trigger (Execute Workflow Trigger)
- 1 AI Agent (orchestrator)
- 1 OpenAI Model (gpt-4o-mini, temp 0.1)
- 4 HTTP Request Tool nodes (customer operations)
- 4 Processing nodes (Format, Log, Insert, Response)

---

## 🔧 Operations (4 Tools)

### **1. gorgias_list_customers**
- **Endpoint:** `GET /api/customers?limit=100&order_by=created_datetime:desc`
- **Use:** List all customers
- **Returns:** Customer IDs, emails, names, created dates
- **Queries:** "list customers", "show all customers", "how many customers"

### **2. gorgias_get_customer**
- **Endpoint:** `GET /api/customers/{customer_id}`
- **Use:** Get specific customer by ID
- **Returns:** Full customer profile with tickets count, tags, metadata
- **Queries:** "get customer 123", "show customer #456"

### **3. gorgias_search_customers**
- **Endpoint:** `GET /api/customers?email={query}`
- **Use:** Search customers by email or name (fuzzy matching)
- **Returns:** Matching customers
- **Queries:** "find customer email@example.com", "search for John"

### **4. gorgias_get_customer_tickets**
- **Endpoint:** `GET /api/tickets?customer_id={id}&limit=100`
- **Use:** Get all tickets for a customer
- **Returns:** Ticket list with status, priority, assignee, messages
- **Queries:** "show tickets for customer", "customer ticket history"

---

## 📥 Input Format

SW5 receives this from Router:

```json
{
  "query": "list all customers",
  "raw_text": "cleaned slack message",
  "customer_email": "user@example.com",
  "customer_id": "123",
  "ticket_id": "456",
  "channel": "C09BXTD0WR0",
  "thread_ts": "1699564809.012840",
  "user": "U09BSMA8U75"
}
```

---

## 📤 Output Format

SW5 returns to Router:

```json
{
  "workflow": "SW5",
  "operation": "list_customers" | "get_customer" | "search_customers" | "get_customer_tickets" | "customer_analytics",
  "success": true | false,
  "data": {
    "customers": [...],
    "customer": {...},
    "tickets": [...],
    "stats": {...}
  },
  "summary": "Found 245 customers",
  "error": null
}
```

---

## 🧪 Test Cases

**List Customers:**
```
"list all customers" → SW5 returns all customers
"show customers" → SW5 lists customers
"how many customers" → SW5 counts and lists customers
```

**Get Customer:**
```
"get customer 123" → SW5 returns customer details
"show customer #456" → SW5 fetches customer profile
"customer info for id 789" → SW5 retrieves customer
```

**Search Customers:**
```
"find customer email@example.com" → SW5 searches by email
"search for John" → SW5 searches by name (fuzzy)
"does customer sarah@test.com exist?" → SW5 validates existence
```

**Customer Tickets:**
```
"show tickets for customer email@example.com" → SW5 gets all tickets
"customer ticket history" → SW5 returns ticket list
"how many tickets does customer 123 have?" → SW5 counts tickets
```

**Customer Analytics:**
```
"customer stats for email@example.com" → SW5 analyzes ticket data
"how many open tickets for customer 123?" → SW5 filters and counts
```

---

## 🔗 Router Integration

### **Tool Configuration in Router:**

```json
{
  "name": "SW5_CustomerOps",
  "description": "Handle customer operations: list customers, get customer details, search customers, view customer tickets. Use for: 'list customers', 'find customer email@example.com', 'show tickets for customer', 'customer ticket history'.",
  "workflowId": {
    "__rl": true,
    "value": "REPLACE_WITH_SW5_WORKFLOW_ID",
    "mode": "list"
  },
  "fields": {
    "values": [
      {
        "name": "query",
        "stringValue": "={{ $('Parse Slack').first().json.raw_text }}"
      },
      {
        "name": "customer_email",
        "stringValue": "={{ $('Parse Slack').first().json.customer_email }}"
      },
      {
        "name": "customer_id",
        "stringValue": "={{ $('Parse Slack').first().json.customer_id }}"
      },
      {
        "name": "ticket_id",
        "stringValue": "={{ $('Parse Slack').first().json.ticket_id }}"
      },
      {
        "name": "user",
        "stringValue": "={{ $('Parse Slack').first().json.user }}"
      },
      {
        "name": "channel",
        "stringValue": "={{ $('Parse Slack').first().json.channel }}"
      },
      {
        "name": "thread_ts",
        "stringValue": "={{ $('Parse Slack').first().json.thread_ts }}"
      }
    ]
  }
}
```

### **Router System Message Addition:**

```markdown
**SW5_CustomerOps** - Customer Operations
- Use for: Get customer details, list customers, search customers, view customer tickets
- Handles: "customer info for email", "list all customers", "show tickets for customer"
- Returns: Customer data, ticket history, analytics
```

---

## 🔄 Common Workflows

### **Email → Tickets Flow:**

User Query: "show tickets for email@example.com"

1. SW5 receives: `{ customer_email: "email@example.com" }`
2. AI calls `gorgias_search_customers` with email
3. Gets customer_id from search result
4. AI calls `gorgias_get_customer_tickets` with customer_id
5. Returns ticket list to Router
6. Router formats for Slack

### **Customer Analytics:**

User Query: "how many tickets does customer 123 have?"

1. SW5 receives: `{ customer_id: "123" }`
2. AI calls `gorgias_get_customer` (get profile)
3. AI calls `gorgias_get_customer_tickets` (get tickets)
4. AI analyzes tickets (count, status distribution)
5. Returns: `{ total: 15, open: 3, closed: 12 }`

---

## 📊 Supabase Logging

SW5 logs to `api_logs` table with:
- `workflow_id`: "SW5"
- `operation`: "list_customers", "get_customer", "search_customers", etc.
- `method`: "customer_ops"
- `url`: Gorgias API endpoint called
- `request_body`: Input data from Router
- `response_body`: Customer/ticket data returned
- `extra`: { operation, customer_id, customer_email }
- Full context (user, channel, thread_ts)

---

## 🚀 Deployment Steps

1. **Import into n8n:**
   - Import `sw5-customer-operations.json`
   - Configure credentials (same as other workflows)

2. **Update Router:**
   - Add SW5 tool configuration (see above)
   - Update system message with SW5 description
   - Replace `REPLACE_WITH_SW5_WORKFLOW_ID` with actual workflow ID

3. **Test Standalone:**
   - Use pinned test data: `{ "query": "list all customers" }`
   - Verify response format
   - Check Supabase logging

4. **Test via Router:**
   - Slack: "@Gorgias Terminal list all customers"
   - Verify Router calls SW5
   - Verify response formatting
   - Check end-to-end flow

5. **Test Email→Tickets Flow:**
   - Slack: "@Gorgias Terminal show tickets for user@example.com"
   - Verify SW5 searches customer first
   - Verify ticket list returned
   - Check multi-step AI orchestration

---

## 🆚 SW5 vs SW1 Ticket Reads

**Why separate workflows for customer tickets?**

| Feature | SW1 (Ticket Read) | SW5 (Customer Ops) |
|---------|------------------|-------------------|
| **Focus** | Ticket-centric | Customer-centric |
| **Primary Entity** | Ticket ID | Customer Email/ID |
| **Use Case** | "get ticket #123" | "show tickets for email@example.com" |
| **Entry Point** | Ticket ID known | Customer email/name known |
| **Search Pattern** | Search tickets by query | Search customers, then get tickets |
| **Analytics** | Ticket volume, assignee workload | Customer ticket count, history |
| **Discovery** | List/filter tickets | List/search customers |

**Complementary, not redundant!**

---

## 🐛 Known Issues

None currently. SW5 is complete and ready for Router integration.

---

## 📝 Notes

- **AI Agent Pattern:** SW5 uses the same proven pattern as SW1, SW3, and SW4
- **HTTP Request Tools:** All 4 customer operations are HTTP Request Tool nodes
- **Multi-Step Orchestration:** AI intelligently chains search → get tickets
- **Fuzzy Matching:** Handles email/name searches with tolerance
- **Supabase Logging:** Full observability for all operations
- **Ready to Enable:** No known bugs, complete implementation

---

## 💡 Future Enhancements

1. **Customer Tags:** Add/remove tags to customers
2. **Customer Metadata:** Update custom customer fields
3. **Customer Analytics:** Average ticket count, response time, satisfaction
4. **Customer Segments:** Group customers by behavior/tags
5. **Purchase History:** If e-commerce integration available

---

**Version:** 1.0
**Status:** ✅ Complete, Ready to Enable
**Next:** Integrate with Router, test end-to-end
