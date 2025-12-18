# Deployment Guide

Complete guide for deploying the Wholesale Lead Generation System to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Airtable Setup](#airtable-setup)
3. [n8n Deployment](#n8n-deployment)
4. [Credential Configuration](#credential-configuration)
5. [Workflow Import](#workflow-import)
6. [Webhook Configuration](#webhook-configuration)
7. [Testing](#testing)
8. [Go Live Checklist](#go-live-checklist)
9. [Monitoring](#monitoring)

---

## Prerequisites

### Required Accounts

- [ ] **n8n** - Self-hosted or Cloud (cloud.n8n.io)
- [ ] **Airtable** - Pro plan recommended for automations
- [ ] **OpenRouter** - With credits loaded
- [ ] **Google Cloud Console** - For Gmail OAuth
- [ ] **Twilio** - Upgraded account (not trial)
- [ ] **Slack** - With admin access to create app/bot

### Optional Services

- [ ] **Apify** - For Facebook Marketplace scraping
- [ ] **BatchSkipTracing** - For skip tracing API

---

## Airtable Setup

### 1. Create Base

1. Go to [airtable.com](https://airtable.com)
2. Create new base: "Wholesale Leads"
3. Note the Base ID from URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`

### 2. Create Tables

See `docs/AIRTABLE-SCHEMA.md` for complete schema.

**Quick Setup:**

```
Tables to create:
1. Leads (main lead database)
2. Conversations (email/SMS history)
3. Templates (email templates)
4. Settings (configuration key-value pairs)
```

### 3. Create Views

Create these filtered views in the Leads table:

| View Name | Filter |
|-----------|--------|
| New Leads | Status = "New" |
| Ready for Outreach | Status = "Ready" |
| HOT Leads | Status = "HOT" |
| Needs Follow-up | Status = "Contacted" AND Days Since Contact > 3 |
| Cold | Status = "Cold" |
| All Active | Status != "Dead" |

### 4. Add Settings Records

In the Settings table, add these records:

| Key | Value |
|-----|-------|
| your_name | Your Name |
| your_company | Your Company LLC |
| your_phone | (555) 555-5555 |
| your_email | you@yourdomain.com |
| sms_opt_out_keyword | STOP |
| target_cities | Houston,Dallas,Austin |

---

## n8n Deployment

### Option A: n8n Cloud (Recommended for Starting)

1. Sign up at [cloud.n8n.io](https://cloud.n8n.io)
2. Create new instance
3. Note your URL: `https://yourname.app.n8n.cloud`

### Option B: Self-Hosted (Docker)

```bash
# Create data directory
mkdir -p ~/.n8n

# Run n8n
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-secure-password \
  -e WEBHOOK_URL=https://your-domain.com/ \
  n8nio/n8n
```

### Option C: Self-Hosted (Docker Compose)

```yaml
# docker-compose.yml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://${N8N_HOST}/
      - GENERIC_TIMEZONE=America/Chicago
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

### Environment Variables

Set in n8n Settings → Variables:

```
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
TWILIO_PHONE_NUMBER=+15551234567
DIGEST_EMAIL=you@yourdomain.com
```

---

## Credential Configuration

### 1. Airtable

1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Create Personal Access Token with scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
3. In n8n: Credentials → Add → Airtable
4. Name: `airtable-creds`
5. Paste token

### 2. OpenRouter

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create API key
3. In n8n: Credentials → Add → Header Auth
4. Name: `openrouter-auth`
5. Header Name: `Authorization`
6. Header Value: `Bearer sk-or-xxxxx`

### 3. Gmail OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. Enable Gmail API
4. Configure OAuth consent screen:
   - User type: External
   - App name: "Lead Gen System"
   - Scopes: `gmail.send`, `gmail.readonly`, `gmail.modify`
5. Create OAuth Client ID:
   - Type: Web application
   - Authorized redirect URI: `https://your-n8n-url/rest/oauth2-credential/callback`
6. In n8n: Credentials → Add → Gmail OAuth2
7. Name: `gmail-oauth`
8. Enter Client ID and Secret
9. Click Connect and authorize

### 4. Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Get Account SID and Auth Token
3. Buy a phone number (SMS-capable)
4. In n8n: Credentials → Add → Twilio
5. Name: `twilio-creds`
6. Enter Account SID and Auth Token

### 5. Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create New App → From scratch
3. Add Bot Token Scopes:
   - `chat:write`
   - `channels:read`
4. Install to Workspace
5. Copy Bot User OAuth Token
6. Create channels: `#hot-leads`, `#daily-digest`, `#opportunities`
7. Invite bot to channels: `/invite @YourBot`
8. In n8n: Credentials → Add → Slack
9. Name: `slack-creds`
10. Enter Bot Token

---

## Workflow Import

### Import Order

Import workflows in this order to ensure dependencies are met:

1. **Engine 1 - Sourcing**
   - zillow-fsbo-scraper.json
   - craigslist-monitor.json
   - fb-marketplace-scraper.json
   - expired-listings-monitor.json

2. **Engine 2 - Enrichment**
   - skip-trace-enrich.json
   - photo-analysis.json

3. **Engine 3 - Outreach**
   - initial-email-outreach.json
   - email-followup-sequence.json
   - sms-outreach.json

4. **Engine 4 - Qualification**
   - email-response-monitor.json
   - sms-response-monitor.json
   - hot-lead-brief-generator.json
   - daily-digest.json

### Import Steps

1. Open n8n
2. Click "Add Workflow"
3. Click menu (⋮) → Import from File
4. Select JSON file
5. Review and save
6. Link credentials to nodes
7. Activate workflow

---

## Webhook Configuration

### Gmail Push Notifications (Optional)

For real-time email monitoring:

1. In n8n, get webhook URL from email-response-monitor workflow
2. Set up Gmail push notifications via Google Cloud Pub/Sub
3. Configure watch on inbox

### Twilio SMS Webhook

1. In n8n, activate sms-response-monitor workflow
2. Copy webhook URL from Twilio Webhook node
3. In Twilio Console:
   - Go to Phone Numbers → Your Number
   - Under Messaging → "A Message Comes In"
   - Set to Webhook: `https://your-n8n-url/webhook/twilio-sms-webhook`
   - Method: POST

---

## Testing

### Phase 1: Individual Workflow Tests

Test each workflow manually before activating:

```
1. [ ] Zillow FSBO Scraper - Manual trigger, verify leads created
2. [ ] Skip Trace Enrich - Add test lead, verify enrichment
3. [ ] Initial Email - Create test lead with your email
4. [ ] Email Response - Send yourself an email reply
5. [ ] SMS Outreach - Test with your phone number
6. [ ] SMS Response - Reply to test SMS
7. [ ] Daily Digest - Manual trigger, verify Slack message
```

### Phase 2: End-to-End Test

1. Manually add a lead with your contact info
2. Let it flow through enrichment
3. Receive initial outreach
4. Reply to trigger response handling
5. Verify HOT lead alert and brief generation

### Phase 3: Volume Test

1. Add 10 test leads
2. Run outreach workflow
3. Verify rate limiting works
4. Check for errors in execution log

---

## Go Live Checklist

### Before Activating

- [ ] All credentials tested and working
- [ ] Airtable schema matches expectations
- [ ] Settings table populated
- [ ] Slack channels created and bot invited
- [ ] Test emails delivered (not spam)
- [ ] Test SMS delivered
- [ ] Webhook URLs configured
- [ ] Environment variables set

### Activation Order

1. Start with sourcing workflows (get leads)
2. Activate enrichment (process leads)
3. Enable outreach (contact leads)
4. Turn on response monitoring (handle replies)
5. Enable alerts and reports

### Initial Volume Recommendations

| Workflow | Initial Setting | Scale To |
|----------|-----------------|----------|
| Zillow Scraper | 3 cities | 10+ cities |
| Email Outreach | 10/batch | 50/batch |
| SMS Outreach | 5/batch | 20/batch |
| Follow-up | 20/day | 50/day |

---

## Monitoring

### Daily Checks

1. Review execution log for failures
2. Check Airtable for new leads
3. Review daily digest metrics
4. Monitor Slack for HOT alerts

### Weekly Review

1. Email deliverability (check bounce rate)
2. SMS delivery status
3. Response rates by source
4. AI scoring accuracy
5. Cost tracking (API usage)

### Key Metrics to Track

| Metric | Target | Alert If |
|--------|--------|----------|
| Lead acquisition | 10+/day | < 5/day |
| Email open rate | > 20% | < 10% |
| Response rate | > 2% | < 0.5% |
| HOT lead conversion | > 5% | < 2% |
| Workflow success rate | > 95% | < 90% |

### Cost Monitoring

Track monthly costs for:
- n8n (if cloud)
- OpenRouter API calls
- Twilio SMS
- Skip tracing calls
- Apify usage (if using)

---

## Backup & Recovery

### Workflow Backup

Export all workflows weekly:
1. Select workflow
2. Menu → Download
3. Store in version control

### Airtable Backup

1. Use Airtable's built-in backup feature
2. Or: Create a backup workflow that exports to CSV

### Recovery Procedure

1. Restore Airtable data from backup
2. Import workflow JSON files
3. Reconfigure credentials
4. Test before activating

---

## Support Contacts

- **n8n Support**: [community.n8n.io](https://community.n8n.io)
- **Airtable Support**: [support.airtable.com](https://support.airtable.com)
- **Twilio Support**: [twilio.com/help/contact](https://www.twilio.com/help/contact)
- **OpenRouter**: Discord community
