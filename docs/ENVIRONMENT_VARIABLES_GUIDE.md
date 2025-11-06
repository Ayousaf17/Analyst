# Environment Variables Implementation Guide

## Overview

This guide shows how to update each n8n workflow node to use environment variables instead of hardcoded values. This enables multi-environment deployment and easier configuration management.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`

3. Configure n8n to load environment variables (see n8n documentation for your deployment method)

---

## Node Update Instructions

### 1. OpenAI Structured Output Node

**Location:** Main workflow - "OpenAI Structured Output (HTTP Request)"

**Before:**
```json
{
  "url": "https://api.openai.com/v1/chat/completions",
  "body": {
    "model": "gpt-4o-mini-2024-07-18",
    "max_tokens": 8000,
    "temperature": 0.3
  }
}
```

**After:**
```json
{
  "url": "={{ $env.OPENAI_API_URL }}",
  "body": {
    "model": "={{ $env.OPENAI_MODEL }}",
    "max_tokens": "={{ parseInt($env.OPENAI_MAX_TOKENS) }}",
    "temperature": "={{ parseFloat($env.OPENAI_TEMPERATURE_PLAN) }}"
  }
}
```

**Steps:**
1. Open the "OpenAI Structured Output" HTTP Request node
2. Replace `url` field with: `={{ $env.OPENAI_API_URL }}`
3. In Body → model: Replace with `={{ $env.OPENAI_MODEL }}`
4. In Body → max_tokens: Replace with `={{ parseInt($env.OPENAI_MAX_TOKENS) }}`
5. In Body → temperature: Replace with `={{ parseFloat($env.OPENAI_TEMPERATURE_PLAN) }}`
6. Save the node

---

### 2. Conversational Response AI Node

**Location:** Main workflow - "Conversational Response AI (HTTP Request)"

**Before:**
```json
{
  "url": "https://api.openai.com/v1/chat/completions",
  "body": {
    "model": "gpt-4o-mini-2024-07-18",
    "temperature": 0.7
  }
}
```

**After:**
```json
{
  "url": "={{ $env.OPENAI_API_URL }}",
  "body": {
    "model": "={{ $env.OPENAI_MODEL }}",
    "temperature": "={{ parseFloat($env.OPENAI_TEMPERATURE_CONVERSATION) }}"
  }
}
```

**Steps:**
1. Open the "Conversational Response AI" HTTP Request node
2. Replace `url` field with: `={{ $env.OPENAI_API_URL }}`
3. In Body → model: Replace with `={{ $env.OPENAI_MODEL }}`
4. In Body → temperature: Replace with `={{ parseFloat($env.OPENAI_TEMPERATURE_CONVERSATION) }}`
5. Save the node

---

### 3. All Gorgias API Nodes (16 total)

**Nodes to Update:**
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

**Before (example):**
```json
{
  "url": "https://ironside.gorgias.com/api/tickets/{{$json.ticket_id}}"
}
```

**After:**
```json
{
  "url": "={{ $env.GORGIAS_BASE_URL }}/api/tickets/{{$json.ticket_id}}"
}
```

**Steps for Each Node:**
1. Open the HTTP Request node
2. Find the URL field
3. Replace `https://ironside.gorgias.com` with `={{ $env.GORGIAS_BASE_URL }}`
4. Keep the rest of the URL path intact
5. Save the node

**Common URL Patterns:**
- Tickets: `={{ $env.GORGIAS_BASE_URL }}/api/tickets`
- Ticket by ID: `={{ $env.GORGIAS_BASE_URL }}/api/tickets/{{$json.ticket_id}}`
- Customers: `={{ $env.GORGIAS_BASE_URL }}/api/customers`
- Customer by ID: `={{ $env.GORGIAS_BASE_URL }}/api/customers/{{$json.customer_id}}`
- Users: `={{ $env.GORGIAS_BASE_URL }}/api/users`
- Statistics: `={{ $env.GORGIAS_BASE_URL }}/api/statistics`

---

### 4. Supabase Nodes

**Nodes to Update:**
- Insert Session
- Insert api_logs
- Any other Supabase operations

**Before:**
```json
{
  "url": "https://your-project.supabase.co/rest/v1/agent_sessions"
}
```

**After:**
```json
{
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/agent_sessions"
}
```

**Steps:**
1. Open the Supabase node
2. If using HTTP Request: Replace URL with `={{ $env.SUPABASE_URL }}/rest/v1/{table_name}`
3. If using native Supabase node: The URL may be configured in credentials, update there
4. Save the node

---

### 5. Error Handler Slack Nodes (Future)

**When creating error handler:**

**Error Channel Node:**
```json
{
  "channel": "={{ $env.SLACK_ERROR_CHANNEL }}"
}
```

**Log Channel Node:**
```json
{
  "channel": "={{ $env.SLACK_LOG_CHANNEL }}"
}
```

---

## Testing Environment Variables

### 1. Test OpenAI Connection
```bash
# In n8n, create a test workflow
# Add HTTP Request node with:
url: ={{ $env.OPENAI_API_URL }}
method: GET

# Expected: Should resolve to https://api.openai.com/v1/chat/completions
```

### 2. Test Gorgias Connection
```bash
# Add HTTP Request node with:
url: ={{ $env.GORGIAS_BASE_URL }}/api/tickets?limit=1
method: GET

# Expected: Should fetch 1 ticket from your Gorgias instance
```

### 3. Test Supabase Connection
```bash
# Add HTTP Request node with:
url: ={{ $env.SUPABASE_URL }}/rest/v1/agent_sessions?limit=1
method: GET

# Expected: Should fetch 1 session from Supabase
```

---

## Workflow Settings Updates

### Using Environment Variables in Settings

In your workflow settings JSON (or via n8n UI):

```json
{
  "settings": {
    "executionTimeout": "={{ parseInt($env.EXECUTION_TIMEOUT) }}",
    "retryOnFail": true,
    "retryCount": "={{ parseInt($env.RETRY_COUNT) }}",
    "retryDelay": "={{ parseInt($env.RETRY_DELAY) }}"
  }
}
```

---

## Troubleshooting

### Issue: Variable Not Resolving
**Error:** `{{ $env.OPENAI_API_URL }}` appears as literal text

**Solution:**
- Ensure the field supports expressions (look for `=` toggle in n8n)
- Click the `=` icon to enable expression mode
- Environment variable should now resolve

### Issue: Type Errors
**Error:** "Expected number, got string"

**Solution:**
- Use `parseInt()` for integers: `={{ parseInt($env.MAX_TOKENS) }}`
- Use `parseFloat()` for decimals: `={{ parseFloat($env.TEMPERATURE) }}`

### Issue: Environment Variables Not Loading
**Solution:**
- Check n8n logs for environment variable loading
- Verify `.env` file is in correct location
- Restart n8n service after adding new variables
- For Docker: Pass variables via `-e` flag or `docker-compose.yml`

---

## Deployment Checklist

### Development Environment
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in development credentials
- [ ] Update all nodes to use `$env` variables
- [ ] Test each node type
- [ ] Verify error handling

### Staging Environment
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in staging credentials
- [ ] Deploy workflow
- [ ] Run integration tests
- [ ] Verify logs in Supabase

### Production Environment
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in production credentials
- [ ] Review all environment variables
- [ ] Deploy workflow
- [ ] Run smoke tests
- [ ] Monitor for 24 hours

---

## Security Best Practices

### Do's ✅
- ✅ Use `.env` file for all secrets
- ✅ Add `.env` to `.gitignore`
- ✅ Commit `.env.example` to git (no secrets)
- ✅ Document all required variables
- ✅ Use different credentials per environment
- ✅ Rotate API keys regularly

### Don'ts ❌
- ❌ Never commit `.env` with real credentials
- ❌ Never hardcode API keys in workflows
- ❌ Never share `.env` file via chat/email
- ❌ Never use production credentials in development
- ❌ Never log environment variable values

---

## Migration Checklist

### Before Migration
- [ ] Export current workflow as backup
- [ ] Document all hardcoded values
- [ ] Create `.env` file with all values
- [ ] Review implementation roadmap

### During Migration
- [ ] Update OpenAI nodes (2 nodes)
- [ ] Update Gorgias nodes (16 nodes)
- [ ] Update Supabase nodes (2-4 nodes)
- [ ] Update Slack nodes (if any)
- [ ] Update workflow settings

### After Migration
- [ ] Test each action individually
- [ ] Run integration test suite
- [ ] Verify Supabase logging works
- [ ] Check Slack notifications
- [ ] Monitor for errors
- [ ] Update documentation

---

## Quick Reference

### Common n8n Expression Patterns

**String Environment Variable:**
```javascript
={{ $env.VARIABLE_NAME }}
```

**Integer Environment Variable:**
```javascript
={{ parseInt($env.VARIABLE_NAME) }}
```

**Float Environment Variable:**
```javascript
={{ parseFloat($env.VARIABLE_NAME) }}
```

**Boolean Environment Variable:**
```javascript
={{ $env.VARIABLE_NAME === 'true' }}
```

**URL Construction:**
```javascript
={{ $env.BASE_URL }}/api/endpoint
```

**Conditional Based on Environment:**
```javascript
={{ $env.NODE_ENV === 'production' ? 'prod-value' : 'dev-value' }}
```

---

## Next Steps

After completing environment variable migration:

1. **Task 1.3:** Add dedicated error handler node
2. **Task 1.4:** Add Slack error formatting
3. **Task 1.5:** Update workflow settings
4. **Test:** Run full integration test suite
5. **Document:** Update main README.md

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Status:** Ready for Implementation
