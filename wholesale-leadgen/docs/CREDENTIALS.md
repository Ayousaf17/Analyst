# Credentials Setup Guide

## n8n Credential Configuration

### 1. Airtable (`airtable-creds`)

**Type:** Airtable Personal Access Token

1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click "Create new token"
3. Name: `n8n-wholesale-leadgen`
4. Add scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
5. Add access to your wholesale leads base
6. Copy the token (starts with `pat`)

**n8n Setup:**
- Credential Type: `Airtable Personal Access Token`
- Access Token: `pat.XXXXX...`

**Environment Variable:**
```bash
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```
Find Base ID in your Airtable URL: `airtable.com/appXXXXXXX/...`

---

### 2. OpenRouter (`openrouter-auth`)

**Type:** HTTP Header Auth

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create new API key
3. Copy the key (starts with `sk-or-v1-`)

**n8n Setup:**
- Credential Type: `Header Auth`
- Name: `Authorization`
- Value: `Bearer sk-or-v1-XXXXX...`

**API Usage:**
```javascript
POST https://openrouter.ai/api/v1/chat/completions
Headers:
  Authorization: Bearer sk-or-v1-XXXXX
  HTTP-Referer: https://wholesale-leadgen.local
  X-Title: Wholesale Lead Gen

Body:
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [{"role": "user", "content": "..."}],
  "max_tokens": 800,
  "temperature": 0.3
}
```

---

### 3. Gmail (`gmail-oauth`)

**Type:** Gmail OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: Your n8n OAuth callback URL
5. Copy Client ID and Client Secret

**n8n Setup:**
- Credential Type: `Gmail OAuth2`
- Client ID: `XXXXX.apps.googleusercontent.com`
- Client Secret: `GOCSPX-XXXXX`
- Click "Sign in with Google" to authorize

**Scopes Required:**
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`

---

### 4. Slack (`slack-creds`)

**Type:** Slack OAuth2 or Bot Token

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create new app "Wholesale Lead Gen Bot"
3. Add Bot Token Scopes:
   - `chat:write`
   - `channels:read`
4. Install to workspace
5. Copy Bot User OAuth Token (starts with `xoxb-`)

**n8n Setup:**
- Credential Type: `Slack OAuth2 API` or `Slack API`
- Access Token: `xoxb-XXXXX...`

**Channel Setup:**
- Create `#hot-leads` channel
- Invite bot to channel

---

### 5. Twilio (`twilio-creds`)

**Type:** Twilio API

1. Go to [twilio.com/console](https://www.twilio.com/console)
2. Copy Account SID and Auth Token from dashboard
3. Buy a phone number with SMS capability

**n8n Setup:**
- Credential Type: `Twilio API`
- Account SID: `ACXXXXX...`
- Auth Token: `XXXXX...`

**Phone Number:**
- Store your Twilio phone number in Airtable Settings table
- Key: `twilio_phone`, Value: `+15125551234`

**Webhook Setup (for incoming SMS):**
1. In Twilio Console, go to Phone Numbers
2. Select your number
3. Set "A MESSAGE COMES IN" webhook to:
   ```
   https://your-n8n-domain.com/webhook/sms-response
   ```

---

### 6. Skip Tracing (`skiptracing-auth`)

**Type:** HTTP Header Auth (BatchSkipTracing or similar)

**BatchSkipTracing Setup:**
1. Go to [batchskiptracing.com](https://batchskiptracing.com)
2. Create account and purchase credits
3. Get API key from dashboard

**n8n Setup:**
- Credential Type: `Header Auth`
- Name: `x-api-key`
- Value: `YOUR_API_KEY`

**Alternative Services:**
- BatchLeads
- PropStream
- REI Skip
- Skip Genie

Each has different API formats - adjust workflow accordingly.

---

## Environment Variables

Set these in your n8n instance:

```bash
# Required
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Optional (can also store in Airtable Settings)
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
HOT_LEAD_THRESHOLD=80
MAX_EMAILS=3
```

## Webhook URLs

After importing workflows, note these webhook URLs:

| Webhook | URL Pattern |
|---------|-------------|
| SMS Response | `https://your-n8n.com/webhook/sms-response` |
| Email Response | `https://your-n8n.com/webhook/email-response` |
| New Lead Manual | `https://your-n8n.com/webhook/new-lead` |

## Testing Credentials

Test each credential before activating workflows:

1. **Airtable** - Create a test record via API
2. **OpenRouter** - Send a simple completion request
3. **Gmail** - Send test email to yourself
4. **Slack** - Post test message to #hot-leads
5. **Twilio** - Send test SMS to your phone
6. **Skip Tracing** - Run single lookup

## Security Notes

- Never commit credentials to git
- Use n8n's credential system, not hardcoded values
- Rotate API keys quarterly
- Monitor API usage for anomalies
- Set up billing alerts on paid services
