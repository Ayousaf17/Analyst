# Airtable Schema

## Base Structure

Create an Airtable base with the following tables:

## Table 1: Leads

Primary table for all property leads.

| Field Name | Type | Description |
|------------|------|-------------|
| Lead ID | Auto Number | Unique identifier |
| Address | Single Line Text | Property street address |
| City | Single Line Text | City name |
| State | Single Line Text | State abbreviation |
| ZIP | Single Line Text | ZIP code |
| Source | Single Select | Zillow FSBO, Craigslist, FB Marketplace, Expired MLS |
| Status | Single Select | New, Enriching, Ready, Contacted, Warm, HOT, Cold, Dead |
| Asking Price | Currency | Listed price |
| Estimated Value | Currency | ARV or Zillow estimate |
| Equity Percentage | Percent | (Estimated Value - Asking Price) / Estimated Value |
| Owner Name | Single Line Text | Property owner name |
| Owner Phone | Phone | Primary phone number |
| Owner Email | Email | Primary email |
| Owner Phone 2 | Phone | Secondary phone |
| Owner Email 2 | Email | Secondary email |
| Listing URL | URL | Original listing link |
| Photos | Attachment | Property photos |
| AI Score | Number (0-100) | Motivation/deal score |
| Priority | Single Select | High, Medium, Low |
| AI Analysis | Long Text | JSON with deal analysis |
| Property Condition | Number (1-10) | AI-assessed condition |
| Condition Notes | Long Text | Issues identified from photos |
| Last Contact Date | Date | Most recent outreach |
| Emails Sent | Number | Count of emails sent |
| SMS Sent | Number | Count of SMS sent |
| Response Analysis | Long Text | JSON with response classification |
| Notes | Long Text | Manual notes |
| Created At | Created Time | Auto timestamp |
| Updated At | Last Modified | Auto timestamp |

### Status Options
- `New` - Just scraped, needs enrichment
- `Enriching` - Skip trace in progress
- `Ready` - Enriched, ready for outreach
- `Contacted` - Initial outreach sent
- `Warm` - Responded with interest
- `HOT` - High motivation, ready for call
- `Cold` - No response after 3 touches
- `Dead` - Not interested / Do not contact

### Source Options
- `Zillow FSBO`
- `Craigslist`
- `FB Marketplace`
- `Expired MLS`

### Priority Options
- `High` - AI Score >= 70
- `Medium` - AI Score 40-69
- `Low` - AI Score < 40

## Table 2: Conversations

Audit trail of all communications.

| Field Name | Type | Description |
|------------|------|-------------|
| Conversation ID | Auto Number | Unique identifier |
| Lead | Link to Leads | Related lead record |
| Type | Single Select | Email Sent, Email Received, SMS Sent, SMS Received, Call |
| Direction | Single Select | Outbound, Inbound |
| Subject | Single Line Text | Email subject line |
| Body | Long Text | Message content |
| Channel | Single Select | Email, SMS, Phone |
| Sentiment | Single Select | Positive, Neutral, Negative |
| AI Classification | Single Select | Interest, Question, Rejection, Spam |
| Timestamp | Date & Time | When communication occurred |
| Message ID | Single Line Text | Gmail/Twilio message ID |
| Template Used | Link to Templates | Which template was used |

### Type Options
- `Email Sent`
- `Email Received`
- `SMS Sent`
- `SMS Received`
- `Call`
- `Voicemail`

## Table 3: Templates

Email and SMS templates with performance tracking.

| Field Name | Type | Description |
|------------|------|-------------|
| Template ID | Auto Number | Unique identifier |
| Name | Single Line Text | Template name |
| Type | Single Select | Initial Email, Follow-up 1, Follow-up 2, Follow-up 3, SMS |
| Subject | Single Line Text | Email subject (supports variables) |
| Body | Long Text | Message body (supports variables) |
| Times Used | Number | Usage count |
| Opens | Number | Email opens (if tracked) |
| Responses | Number | Response count |
| Response Rate | Formula | Responses / Times Used |
| Active | Checkbox | Is template active |
| Notes | Long Text | A/B test notes |

### Template Variables
Use these in subject/body:
- `{{owner_name}}` - Owner's first name
- `{{address}}` - Property address
- `{{city}}` - City name
- `{{asking_price}}` - Listed price
- `{{your_name}}` - Your name
- `{{your_phone}}` - Your phone
- `{{your_company}}` - Company name

## Table 4: Settings

Configuration values for workflows.

| Field Name | Type | Description |
|------------|------|-------------|
| Key | Single Line Text | Setting name |
| Value | Long Text | Setting value (can be JSON) |
| Description | Long Text | What this setting controls |

### Required Settings
| Key | Example Value | Description |
|-----|---------------|-------------|
| `target_cities` | `["Austin", "San Antonio", "Houston"]` | Cities to scrape |
| `your_name` | `John Smith` | Your name for templates |
| `your_phone` | `(512) 555-1234` | Your phone number |
| `your_company` | `ABC Investments` | Company name |
| `your_email` | `john@abc.com` | Reply-to email |
| `min_equity_percent` | `20` | Minimum equity threshold |
| `min_ai_score` | `40` | Minimum score to contact |
| `hot_lead_threshold` | `80` | Score for HOT classification |
| `max_emails` | `3` | Max follow-up emails |
| `followup_days` | `[3, 7, 14]` | Days between follow-ups |

## Views to Create

### Leads Table Views

1. **New Leads** - Filter: Status = "New"
2. **Ready for Outreach** - Filter: Status = "Ready" AND AI Score >= 40
3. **Awaiting Response** - Filter: Status = "Contacted"
4. **Hot Leads** - Filter: Status = "HOT"
5. **All Active** - Filter: Status NOT IN (Cold, Dead)
6. **High Priority** - Filter: Priority = "High"
7. **Needs Follow-up** - Filter: Status = "Contacted" AND Last Contact Date < 3 days ago

### Conversations Table Views

1. **Recent Activity** - Sort by Timestamp DESC
2. **Inbound Only** - Filter: Direction = "Inbound"
3. **By Lead** - Group by Lead

## Automations (Optional)

Set up these Airtable automations as backup:

1. **New Lead Notification** - When Status changes to "Ready", send Slack message
2. **Hot Lead Alert** - When Status changes to "HOT", send Slack message
3. **Daily Summary** - Every day at 8 PM, run script to count stats

## API Access

1. Go to airtable.com/create/tokens
2. Create Personal Access Token with scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
3. Copy Base ID from URL: `airtable.com/appXXXXXXXXXX/...`
4. Set `AIRTABLE_BASE_ID` environment variable in n8n
