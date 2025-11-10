# SW4 Router Integration Guide

**Status:** ✅ SW4 Production-Ready
**Date:** November 10, 2025
**Purpose:** Complete guide for integrating SW4 into the Router workflow

---

## 📋 Prerequisites

Before integrating SW4 into Router:

- ✅ SW4 workflow imported into n8n
- ✅ SW4 workflow ID obtained from n8n
- ✅ All 4 operations tested standalone
- ✅ Supabase logging verified (log ID: 280)
- ✅ Credentials configured (Gorgias, OpenAI, Supabase)

---

## 🔧 Step 1: Get SW4 Workflow ID

After importing SW4 into n8n:

1. Open SW4 workflow in n8n
2. Note the workflow ID from the URL: `https://n8n.instance/workflow/{WORKFLOW_ID}`
3. Copy the workflow ID (e.g., `XZYe7dKHwQzgugiM`)

---

## 🛠️ Step 2: Add SW4 Tool to Router

### Location in Router Workflow:
Navigate to: **Router AI Agent** → **Tools** → **Add Tool Workflow**

### Configuration:

```json
{
  "name": "SW4_ResourceDiscovery",
  "description": "Discover Gorgias resources: users (agents/team) and saved ticket views. Use for: 'list all users', 'show agents', 'who's on the team', 'list views', 'get view 123'.",
  "workflowId": {
    "__rl": true,
    "value": "REPLACE_WITH_SW4_WORKFLOW_ID",
    "mode": "list",
    "cachedResultUrl": "/workflow/REPLACE_WITH_SW4_WORKFLOW_ID",
    "cachedResultName": "Ironside Computers — SW4 - Resource Discovery (Users & Views)"
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
        "name": "view_id",
        "stringValue": "={{ $('Parse Slack').first().json.view_id }}"
      },
      {
        "name": "ticket_id",
        "stringValue": "={{ $('Parse Slack').first().json.ticket_id }}"
      },
      {
        "name": "customer_email",
        "stringValue": "={{ $('Parse Slack').first().json.customer_email }}"
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

**⚠️ Important:**
- Replace `REPLACE_WITH_SW4_WORKFLOW_ID` with actual workflow ID from Step 1
- Use **list mode** (not id mode) for workflow ID
- Keep all field mappings exactly as shown (Parse Slack node reference)

---

## 📝 Step 3: Update Router System Message

### Location:
**Router AI Agent** → **Options** → **System Message**

### Add This Section:

```markdown
**SW4_ResourceDiscovery** - Resource Discovery (Users & Views)
- Use for: List users/agents, get user details, list ticket views, get view details
- Handles: "list all users", "show agents", "who's on the team", "list views", "get view 123"
- Returns: User data (name, email, role, status), View data (id, name, description)
- NOTE: Focused on users and views only; future expansion for integrations/custom fields
```

### Place It After SW3 and Before SW5:

```markdown
AVAILABLE SUB-WORKFLOW TOOLS (5):

**SW1_TicketReadOps** - Ticket Read Operations
...

**SW2_TicketWriteOps** - Ticket Write Operations
...

**SW3_TagOps** - Tag Operations
...

**SW4_ResourceDiscovery** - Resource Discovery (Users & Views)  ⬅️ ADD HERE
- Use for: List users/agents, get user details, list ticket views, get view details
- Handles: "list all users", "show agents", "who's on the team", "list views", "get view 123"
- Returns: User data (name, email, role, status), View data (id, name, description)
- NOTE: Focused on users and views only; future expansion for integrations/custom fields

**SW5_CustomerOps** - Customer Operations
...
```

---

## 🧪 Step 4: Test SW4 via Router

### Slack Test Commands:

#### Test 1: List Users
```
@Gorgias Terminal list all users
```
**Expected:** Returns list of all team members/agents

#### Test 2: Get User Details
```
@Gorgias Terminal get user 123
```
**Expected:** Returns details for user ID 123

#### Test 3: List Views
```
@Gorgias Terminal list all views
```
**Expected:** Returns all saved ticket views

#### Test 4: Get View Details
```
@Gorgias Terminal get view 456
```
**Expected:** Returns view 456 details or tickets

---

## ✅ Verification Checklist

After integration, verify:

- [ ] SW4 workflow ID correctly set in Router
- [ ] Tool enabled (no `disabled: true` flag)
- [ ] Field mappings use `$('Parse Slack').first().json` pattern
- [ ] System message includes SW4 description
- [ ] Test 1: "list all users" works
- [ ] Test 2: "get user 123" works
- [ ] Test 3: "list all views" works
- [ ] Test 4: "get view 456" works
- [ ] Supabase logs show SW4 entries
- [ ] Router → SW4 → Response flow complete
- [ ] Slack formatting correct
- [ ] Thread replies working

---

## 🔍 Troubleshooting

### Issue: Router doesn't call SW4
**Check:**
- SW4 workflow ID correct in Router
- SW4 tool not disabled
- System message includes SW4 description
- Query keywords match SW4 triggers ("list users", "show agents", "list views")

### Issue: SW4 returns "unknown" operation
**Check:**
- Format Response node in SW4 has operation inference logic
- Query passed correctly from Router to SW4
- SW4 AI Agent receives query field

### Issue: No Supabase logs for SW4
**Check:**
- Supabase credentials configured in SW4
- Insert api_logs node has continueOnFail: true
- Prepare Log Entry correctly builds log object

### Issue: SW4 response not formatted in Slack
**Check:**
- Build Slack Reply node handles SW4 response structure
- SW4 returns { workflow: "SW4", operation, success, data, summary }
- Router passes SW4 response to Build Slack Reply

---

## 📊 Expected Supabase Log Entry

After successful SW4 call via Router:

```json
{
  "workflow_id": "SW4",
  "run_id": "execution_id",
  "node_name": "SW4_AI_Agent",
  "direction": "response",
  "method": "list_users" | "get_user" | "list_views" | "get_view",
  "url": "https://ironsidecomputers.gorgias.com/api/users" | "/api/views",
  "status_code": 200,
  "request_body": "{\"query\":\"list all users\",\"user_id\":null,...}",
  "response_body": "{\"users\":[...]}",
  "error_message": null,
  "actor_user": "U09BSMA8U75",
  "channel": "C09BXTD0WR0",
  "thread_ts": "1699564809.012840",
  "ticket_id": null,
  "tags": [],
  "duration_ms": null,
  "extra": "{\"operation\":\"list_users\",\"success\":true}"
}
```

---

## 🎯 Success Criteria

SW4 integration is successful when:

✅ All 4 test commands work via Slack
✅ Supabase logs show SW4 entries with correct operation
✅ Response times < 2 seconds
✅ Slack formatting displays user/view data correctly
✅ No errors in n8n execution logs
✅ Router correctly routes "list users" and "list views" queries to SW4
✅ SW4 never called for ticket operations (those go to SW1)

---

## 🚀 Production Deployment

Once all tests pass:

1. **Enable SW4 in production Router**
2. **Monitor Supabase logs for 24 hours**
3. **Check error rate < 1%**
4. **Verify response times < 2s**
5. **Collect user feedback**

---

## 🔄 Rollback Plan

If SW4 integration fails:

1. **Disable SW4 tool in Router** (add `disabled: true`)
2. **Keep Router active** (SW1/SW2/SW3/SW5 still work)
3. **Check Supabase logs** for error details
4. **Fix issue in SW4 workflow**
5. **Re-test standalone**
6. **Re-enable in Router**

---

## 📚 Related Documentation

- **SW4 README.md** - Complete SW4 documentation
- **MODULAR_ARCHITECTURE_HANDOFF.md** - Overall architecture
- **DEPLOYMENT_GUIDE.md** - Full deployment process
- **Router JSON** - Main orchestrator configuration

---

## 📞 Support

**Issues:** https://github.com/Ayousaf17/Analyst/issues
**Branch:** `claude/gorgias-terminal-sw2-sw3-011CUyfojeB1GmZSd1CD6Uhz`
**SW4 Workflow ID:** `REPLACE_WITH_ACTUAL_ID`

---

**Version:** 1.0 (Production)
**Status:** ✅ Ready for Router Integration
**Last Updated:** November 10, 2025
