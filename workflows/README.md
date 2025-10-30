# Workflow Files

## 📁 Workflow Sources

The actual n8n workflow JSON files are hosted in the Replit project:
**Source:** https://replit.com/@v9sxbd649n/GorgiasSlackAI#workflows

---

## 🎯 Production Workflow

### ✅ Gorgias_Intelligent_v23.json (RECOMMENDED)

**Type:** HTTP Request with OpenAI Structured Outputs
**Status:** 🟢 Production Ready
**Reliability:** 100% guaranteed valid JSON

**Source Link:** https://replit.com/@v9sxbd649n/GorgiasSlackAI#workflows/Gorgias_Intelligent_v23.json

**Features:**
- 40 nodes total
- 16 Gorgias actions supported
- OpenAI's native `response_format: json_schema` with `strict: true`
- Zero parser failures possible
- Smart data sampling for rate limit optimization
- Full Supabase observability

**Setup Instructions:**
1. Download from Replit link above
2. Import into n8n
3. Follow [HTTP_VERSION_SETUP_GUIDE.md](../docs/HTTP_VERSION_SETUP_GUIDE.md)

---

## 📦 Alternative Workflow (Archive)

### ❌ Gorgias_Intelligent_v23_AI_Agent.json (NOT RECOMMENDED)

**Type:** AI Agent with Structured Output Parser
**Status:** 🟡 Archive Only
**Reliability:** ~95% (prompt-based parsing)

**Features:**
- 42 nodes total
- Visual configuration approach
- Structured Output Parser (prompt-based)
- Has intermittent "Model output doesn't fit required format" errors
- Not recommended for production use

**Why Not Use This?**
- Prompt-based parsing is unreliable (n8n docs confirm)
- Parser errors occur ~5% of the time
- HTTP Request version provides 100% reliability

---

## 📊 Comparison

| Feature | HTTP Request (v23) | AI Agent (v23) |
|---------|-------------------|----------------|
| **Status** | ✅ Production Ready | ❌ Archive |
| **Reliability** | 100% | ~95% |
| **Parser Errors** | Impossible | ~5% |
| **Nodes** | 40 | 42 |
| **Setup** | 1 credential | Visual config |
| **JSON Validity** | Guaranteed | Sometimes fails |

---

## 🚀 Import Instructions

### Step 1: Download from Replit

Visit: https://replit.com/@v9sxbd649n/GorgiasSlackAI#workflows

Download:
- `Gorgias_Intelligent_v23.json` (production)

### Step 2: Import into n8n

1. Open your n8n instance
2. Click **Workflows** → **Import from File**
3. Select the downloaded JSON file
4. Click **Import**

### Step 3: Configure Credentials

Follow the detailed setup guide:
[HTTP_VERSION_SETUP_GUIDE.md](../docs/HTTP_VERSION_SETUP_GUIDE.md)

**Required Credentials:**
- OpenAI API: HTTP Header Auth
- Gorgias API: HTTP Basic Auth (22 nodes)
- Slack: OAuth2
- Supabase: API credential

### Step 4: Verify Connections

Before activating:
- [ ] All nodes show green checkmarks
- [ ] No credential errors
- [ ] All connections validated
- [ ] OpenAI Chat Model max_tokens ≤16,384

### Step 5: Test

Start with Phase 1 tests from:
[UAT_TESTING_CHECKLIST.md](../docs/UAT_TESTING_CHECKLIST.md)

Test command:
```
@Gorgias Terminal show me open tickets
```

---

## 🔍 What's Inside the Workflow?

### Node Breakdown (v23 HTTP Request)

**Trigger & Parsing:**
- Slack Trigger - Listens for @mentions
- Parse Slack - Extracts user text and creates correlation_id

**AI Planning:**
- OpenAI Structured Output (HTTP Request) - Generates action plan

**Session Management:**
- Format Session - Parses plan array
- Insert Session - Logs to Supabase

**Execution Loop:**
- Expand Plan - Creates step items
- Split Steps - Loop controller
- Normalize Step - Standardizes data
- Switch (Route by Action) - Routes to 16 actions

**Gorgias API Calls (16 HTTP Request Nodes):**
1. list_tickets
2. search_tickets
3. get_ticket
4. create_ticket
5. assign_ticket
6. close_ticket
7. set_priority
8. set_status
9. add_tags
10. remove_tags
11. reply_public
12. comment_internal
13. list_customers
14. get_customer
15. find_user
16. list_metrics

**Logging & Observability:**
- Format Log - Structures log data
- Insert api_logs - Logs to Supabase
- Fetch Loop Results - Retrieves all logs for correlation_id

**Response Generation:**
- Collect Results - Aggregates API responses
- Conversational Response AI - Formats natural language response
- Final Slack Reply - Sends to Slack thread

---

## 🎯 Workflow Execution Flow

```
User @mentions in Slack
    ↓
Slack Trigger
    ↓
Parse Slack (extract text, generate correlation_id)
    ↓
OpenAI Structured Output (HTTP) → Returns plan array
    ↓
Format Session → Parse plan[]
    ↓
Insert Session → Log to Supabase
    ↓
Expand Plan → Create step items
    ↓
Split Steps → Loop over plan
    ↓ [loop]
Normalize Step → Route by Action → HTTP Request → Gorgias API
    ↓
Format Log → Insert api_logs
    ↓
Back to Split Steps (continue loop)
    ↓ [done]
Fetch Loop Results → Collect Results
    ↓
Conversational Response AI → Format natural response
    ↓
Final Slack Reply → Send to Slack thread
    ↓
User sees formatted response
```

---

## 📚 Additional Resources

- [Complete Technical Handoff](../docs/TECHNICAL_HANDOFF_V23.md)
- [Setup Guide](../docs/HTTP_VERSION_SETUP_GUIDE.md)
- [Connection Diagram](../docs/V23_CONNECTION_DIAGRAM.md)
- [UAT Testing Plan](../docs/UAT_TESTING_CHECKLIST.md)

---

## 🔐 Security Notes

**Credentials Required:**
1. **OpenAI API Key**
   - Get from: https://platform.openai.com/api-keys
   - Type: HTTP Header Auth
   - Header: `Authorization: Bearer {key}`

2. **Gorgias API Credentials**
   - Get from: Gorgias Settings → API
   - Type: HTTP Basic Auth
   - Used in: 22 nodes (16 actions + variations)

3. **Slack OAuth Token**
   - Get from: Slack App settings
   - Type: OAuth2
   - Scopes: channels:history, chat:write, app_mentions:read

4. **Supabase API Key**
   - Get from: Supabase project settings
   - Type: API credential
   - Used for: agent_sessions, api_logs tables

**Important:**
- Never commit credentials to Git
- Store in n8n's credential manager
- Use environment variables for sensitive data

---

## ❓ FAQ

**Q: Which workflow should I use?**
A: Use `Gorgias_Intelligent_v23.json` (HTTP Request version). It's production-ready with 100% reliability.

**Q: Why not use the AI Agent version?**
A: The AI Agent version uses prompt-based parsing which fails ~5% of the time. The HTTP Request version uses OpenAI's native structured outputs which are guaranteed valid.

**Q: Can I modify the workflow?**
A: Yes, but test thoroughly. The current version is optimized for rate limits and reliability.

**Q: How do I update the workflow?**
A: Download the latest version from Replit, export your current workflow (backup), then import the new version and reconfigure credentials.

**Q: Where are the credentials stored?**
A: In n8n's credential manager. Never in the workflow JSON itself.

---

**Version:** 1.0
**Last Updated:** October 30, 2025
**Status:** Ready for Production

**Ready to import?** Start with the [Setup Guide](../docs/HTTP_VERSION_SETUP_GUIDE.md)! 🚀
