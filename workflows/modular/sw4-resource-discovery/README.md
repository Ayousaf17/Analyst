# SW4 - Resource Discovery

**Workflow:** Ironside Computers — SW4 - Resource Discovery
**Type:** AI Agent + HTTP Request Tools
**Status:** ✅ Complete, Ready to Enable

---

## 🎯 Purpose

SW4 handles discovery and search of Gorgias system resources:
- **Users** - Team members, agents, roles
- **Views** - Ticket views and filters
- **Integrations** - Connected systems
- **Custom Fields** - Available ticket fields

---

## 🏗️ Architecture

**Pattern:** AI Agent with HTTP Request Tool nodes (same as SW1 and SW3)

**Nodes:** 13 total
- 1 Trigger (Execute Workflow Trigger)
- 1 AI Agent (orchestrator)
- 1 OpenAI Model (gpt-4o-mini, temp 0.1)
- 6 HTTP Request Tool nodes (one per resource type)
- 4 Processing nodes (Format, Log, Insert, Response)

---

## 🔧 Operations (6 Tools)

### **1. gorgias_list_users**
- **Endpoint:** `GET /api/users`
- **Use:** List all team members/agents
- **Returns:** User IDs, names, emails, roles, active status
- **Queries:** "list users", "show team", "who's available"

### **2. gorgias_get_user**
- **Endpoint:** `GET /api/users/{user_id}`
- **Use:** Get specific user by ID
- **Returns:** Full user profile with permissions
- **Queries:** "get user 123", "show agent #456"

### **3. gorgias_search_users**
- **Endpoint:** `GET /api/users?email={query}`
- **Use:** Find users by name or email (fuzzy matching)
- **Returns:** Matching users
- **Queries:** "find user named Sarah", "search for john"

### **4. gorgias_list_views**
- **Endpoint:** `GET /api/views`
- **Use:** List all ticket views/filters
- **Returns:** View IDs, names, descriptions, filter criteria
- **Queries:** "list views", "show available views"

### **5. gorgias_list_integrations**
- **Endpoint:** `GET /api/integrations`
- **Use:** List active integrations
- **Returns:** Integration names, types, connection status
- **Queries:** "list integrations", "what's connected"

### **6. gorgias_list_custom_fields**
- **Endpoint:** `GET /api/custom-fields`
- **Use:** List available custom fields
- **Returns:** Field IDs, names, types, options
- **Queries:** "list custom fields", "what fields can I use"

---

## 📥 Input Format

SW4 receives this from Router:

```json
{
  "query": "list all users",
  "raw_text": "cleaned slack message",
  "user_id": "123",
  "user_name": "Sarah",
  "search_term": "john",
  "resource_type": "users",
  "channel": "C09BXTD0WR0",
  "thread_ts": "1699564809.012840",
  "user": "U09BSMA8U75"
}
```

---

## 📤 Output Format

SW4 returns to Router:

```json
{
  "workflow": "SW4",
  "operation": "list_users" | "get_user" | "search_users" | "list_views" | "list_integrations" | "list_custom_fields" | "validate",
  "success": true | false,
  "data": {
    "users": [...],
    "views": [...],
    "integrations": [...],
    "custom_fields": [...]
  },
  "summary": "Found 12 team members",
  "error": null
}
```

---

## 🧪 Test Cases

**Users:**
```
"list all users" → SW4 returns all team members
"find user named Sarah" → SW4 searches and finds user
"get user 123" → SW4 returns user details for ID 123
"does user john@example.com exist?" → SW4 validates user
```

**Views:**
```
"show me all views" → SW4 lists ticket views
"list views" → SW4 returns configured views
```

**Integrations:**
```
"what integrations are connected" → SW4 lists active integrations
"list integrations" → SW4 returns integration status
```

**Custom Fields:**
```
"list custom fields" → SW4 shows available ticket fields
"what fields can I use" → SW4 returns field metadata
```

---

## 🔗 Router Integration

### **Tool Configuration in Router:**

```json
{
  "name": "SW4_ResourceDiscovery",
  "description": "Discover and search system resources: users, views, integrations, custom fields. Use for: 'list users', 'find user named X', 'show views', 'list integrations', 'what custom fields exist'.",
  "workflowId": {
    "__rl": true,
    "value": "REPLACE_WITH_SW4_WORKFLOW_ID",
    "mode": "list"
  },
  "fields": {
    "values": [
      {
        "name": "query",
        "stringValue": "={{ $('Parse Slack').first().json.raw_text }}"
      },
      {
        "name": "user_id",
        "stringValue": "={{ $('Parse Slack').first().json.assignee_id }}"
      },
      {
        "name": "search_term",
        "stringValue": "={{ $('Parse Slack').first().json.assignee }}"
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
**SW4_ResourceDiscovery** - Resource Discovery
- Use for: Find users, list team members, show views/integrations/fields
- Handles: "list users", "find user Sarah", "show views", "list integrations", "what custom fields"
- Returns: User details, system resources
- NOTE: For assignee resolution during ticket operations, Parse Slack already handles it
```

---

## 🆚 SW4 vs Parse Slack

**Why keep SW4 despite Parse Slack's assignee resolution?**

| Feature | Parse Slack | SW4 |
|---------|-------------|-----|
| **Purpose** | Assignee name→ID for ticket ops | Full resource discovery |
| **Use Case** | "assign ticket to Sarah" | "list all users", "find Sarah" |
| **Scope** | Single user lookup | All users, views, integrations |
| **Search** | Exact name matching | Fuzzy matching, email search |
| **Discovery** | ❌ No | ✅ Yes (list all resources) |
| **Views/Integrations** | ❌ No | ✅ Yes |
| **Custom Fields** | ❌ No | ✅ Yes |

**Complementary, not redundant!**

---

## 🐛 Known Issues

None currently. SW4 is complete and ready for Router integration.

---

## 📊 Supabase Logging

SW4 logs to `api_logs` table with:
- `workflow_id`: "SW4"
- `operation`: "list_users", "get_user", "search_users", etc.
- `method`: "resource_discovery"
- `url`: Gorgias API endpoint called
- `request_body`: Input data from Router
- `response_body`: Resource data returned
- Full context (user, channel, thread_ts)

---

## 🚀 Deployment Steps

1. **Import into n8n:**
   - Import `sw4-resource-discovery.json`
   - Configure credentials (same as SW1/SW3)

2. **Update Router:**
   - Add SW4 tool configuration (see above)
   - Update system message with SW4 description
   - Replace `REPLACE_WITH_SW4_WORKFLOW_ID` with actual workflow ID

3. **Test Standalone:**
   - Use pinned test data: `{ "query": "list all users" }`
   - Verify response format
   - Check Supabase logging

4. **Test via Router:**
   - Slack: "@Gorgias Terminal list all users"
   - Verify Router calls SW4
   - Verify response formatting
   - Check end-to-end flow

---

## 📝 Notes

- **AI Agent Pattern:** SW4 uses the same proven pattern as SW1 and SW3
- **HTTP Request Tools:** All 6 resource operations are HTTP Request Tool nodes
- **Fuzzy Matching:** AI intelligently handles search and validation
- **Supabase Logging:** Full observability for all operations
- **Ready to Enable:** No known bugs, complete implementation

---

**Version:** 1.0
**Status:** ✅ Complete, Ready to Enable
**Next:** Integrate with Router, test end-to-end
