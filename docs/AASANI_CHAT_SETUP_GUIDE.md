# Aasani AI Chat - OpenRouter Setup Guide

> Production-ready conversational AI workflow using FREE Gemini models via OpenRouter

---

## Overview

This workflow powers a conversational AI chat assistant for Aasani Systems that:
- Uses **FREE Gemini 2.0 Flash** for 90% of conversations (zero cost)
- Upgrades to **Claude Sonnet** for high-value qualified leads (ROI-positive)
- Qualifies leads through natural conversation
- Calculates operational cost waste
- Saves qualified leads to Google Sheets
- Sends email notifications for hot leads

---

## Architecture

```
Framer Chat Widget
       ↓
   [Webhook]
       ↓
  [Extract Data]
       ↓
[Generate System Prompt]
       ↓
  [Select Model] ←── FREE Gemini (default) or Claude (high-value)
       ↓
 [OpenRouter API]
       ↓
[Process Response]
       ↓
  [IF Qualified?]
      ↙    ↘
  [Sheets] [Gmail] → [Merge]
      ↘    ↗           ↓
         ←────────────────
                ↓
      [Webhook Response]
```

---

## Prerequisites

Before importing, you'll need:

1. **OpenRouter Account** (free)
   - Sign up at https://openrouter.ai
   - Create an API key
   - Free tier includes 1000s of requests/day with Gemini

2. **Google Cloud Project** (for Sheets & Gmail)
   - Enable Google Sheets API
   - Enable Gmail API
   - Create OAuth2 credentials

3. **n8n Instance**
   - Self-hosted or n8n Cloud
   - Version 1.0+ recommended

---

## Step 1: Import Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `workflows/Aasani_AI_Chat_OpenRouter.json`
4. Click **Import**

---

## Step 2: Configure Credentials

### OpenRouter API Key

1. Go to **Credentials** → **New Credential**
2. Select **Header Auth**
3. Configure:
   - **Name**: `OpenRouter API Key`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer sk-or-v1-your-key-here`
4. Save

### Google Sheets OAuth

1. Go to **Credentials** → **New Credential**
2. Select **Google Sheets OAuth2 API**
3. Follow the OAuth flow to connect your Google account
4. Name it: `Google Sheets OAuth`

### Gmail OAuth

1. Go to **Credentials** → **New Credential**
2. Select **Gmail OAuth2 API**
3. Follow the OAuth flow
4. Name it: `Gmail OAuth`

---

## Step 3: Update Placeholder Values

Open the workflow and update these nodes:

### Google Sheets Node
- Replace `YOUR_GOOGLE_SHEET_ID` with your actual Sheet ID
- Create a sheet named "Leads" with these columns:
  - Timestamp
  - Name
  - Email
  - Estimated Monthly Cost
  - Lead Data
  - Status
  - Source
  - Model Used
  - Tokens Used
  - Calendar Shown
  - Notes

### Gmail Node
- Update the recipient email address
- Or set `notificationEmail` in credentials

---

## Step 4: Test the Webhook

1. Activate the workflow
2. Copy the webhook URL (shown in Webhook node)
3. Test with curl:

```bash
curl -X POST https://your-n8n.com/webhook/aasani-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi there!",
    "conversationHistory": [],
    "userName": null,
    "userEmail": null,
    "leadData": {},
    "timestamp": "2024-01-15T10:30:00Z"
  }'
```

Expected response:
```json
{
  "reply": "Hey there! I'm here to help you figure out where operational chaos might be costing your business. What's your name?",
  "quickReplies": [],
  "showCostCard": false,
  "costAmount": 0,
  "showCalendar": false
}
```

---

## Model Selection Logic

| Condition | Model | Cost |
|-----------|-------|------|
| Default | `google/gemini-2.0-flash-exp:free` | $0.00 |
| High-value ($5K+) + Engaged (6+ msgs) | `anthropic/claude-sonnet-4` | ~$0.15 |
| Very high-value ($10K+) + 4+ msgs | `anthropic/claude-sonnet-4` | ~$0.15 |

**ROI Logic**: Spending $0.15 on Claude for a potential $10K+ client is ROI-positive.

---

## Lead Qualification Triggers

A lead is marked as "qualified" when:
- `showCalendar` = true (AI determined they're ready for a call)
- OR `costAmount` > $3,000/month (significant waste identified)

Qualified leads trigger:
1. Google Sheets row append
2. Email notification

---

## Framer Integration

Add this to your Framer chat widget:

```javascript
async function sendMessage(message, history, userData) {
  const response = await fetch('https://your-n8n.com/webhook/aasani-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      conversationHistory: history,
      userName: userData.name || null,
      userEmail: userData.email || null,
      leadData: userData.leadData || {},
      timestamp: new Date().toISOString()
    })
  });

  return response.json();
}
```

Handle the response:
```javascript
const data = await sendMessage(userInput, conversationHistory, userData);

// Display the reply
displayMessage(data.reply);

// Show quick reply buttons if provided
if (data.quickReplies.length > 0) {
  showQuickReplies(data.quickReplies);
}

// Show cost card if triggered
if (data.showCostCard) {
  showCostCard(data.costAmount);
}

// Show calendar embed if triggered
if (data.showCalendar) {
  showCalendarEmbed('https://cal.com/ayub-yousaf-c1ijnf/15min');
}
```

---

## Cost Estimates

### OpenRouter (with free Gemini)
- Per conversation (avg 5 messages): $0.00
- High-value lead upgrade: ~$0.15
- Monthly (1000 conversations, 5% premium): ~$7.50

### Google/Gmail
- Free tier: Included

### Total Monthly Estimate
- 1000 conversations/month: ~$7.50
- 5000 conversations/month: ~$37.50

---

## Troubleshooting

### "No response from OpenRouter API"
- Check API key is valid
- Verify you have credits (free tier has limits)
- Check the model name is correct

### "Failed to parse AI response as JSON"
- Normal for some edge cases
- Fallback response is generated automatically
- Check OpenRouter dashboard for actual responses

### Google Sheets not updating
- Verify OAuth credentials are valid
- Check sheet ID is correct
- Ensure "Leads" sheet exists with correct columns

### Email not sending
- Verify Gmail OAuth is connected
- Check recipient email address
- Review Gmail sending limits

---

## Customization

### Modify System Prompt
Edit the `Code - Generate System Prompt` node to:
- Change company information
- Adjust pricing
- Modify qualification criteria
- Update calendar link

### Adjust Model Selection
Edit the `Code - Select Model` node to:
- Change thresholds ($5K, 6 messages)
- Add more model tiers
- Implement A/B testing

### Add More Actions
Extend the workflow to:
- Send Slack notifications
- Create CRM records (HubSpot, Salesforce)
- Trigger follow-up sequences

---

## Support

For issues with:
- **n8n**: https://community.n8n.io
- **OpenRouter**: https://openrouter.ai/docs
- **This workflow**: Check the Analyst repo issues

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12 | Initial release with OpenRouter + Gemini |

---

**Ready to deploy?** Activate the workflow and test with a curl request!
