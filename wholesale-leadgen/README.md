# Wholesale Real Estate Lead Generation System

Automated lead sourcing, enrichment, outreach, and qualification system built with n8n workflows.

## System Architecture

```
ENGINE 1: LEAD SOURCING → ENGINE 2: ENRICHMENT → ENGINE 3: OUTREACH → ENGINE 4: QUALIFICATION
        |                         |                      |                       |
   Zillow FSBO              Skip Trace            Email Sequence         Response Analysis
   Craigslist               Valuation             SMS Campaigns           Lead Scoring
   FB Marketplace           AI Analysis           Follow-ups              HOT Lead Alerts
   Expired Listings         Photo Analysis        Call Briefs             Daily Digest
```

## Lead Status Flow

```
New → Enriching → Ready → Contacted → Warm/HOT/Cold → Dead
```

## Tech Stack

- **n8n** - Workflow automation (self-hosted or cloud)
- **Airtable** - Lead database (Tables: Leads, Conversations, Templates, Settings)
- **OpenRouter API** - LLM calls (Claude 3.5 Sonnet)
- **Gmail API** - Email outreach
- **Twilio** - SMS outreach
- **Slack** - Hot lead notifications
- **Skip Tracing API** - BatchSkipTracing

## Directory Structure

```
wholesale-leadgen/
├── README.md                    # This file
├── docs/
│   ├── AIRTABLE-SCHEMA.md      # Database schema
│   ├── CREDENTIALS.md          # API setup guide
│   ├── TROUBLESHOOTING.md      # Common issues & fixes
│   └── DEPLOYMENT.md           # Production setup
├── prompts/
│   └── lead-analysis.md        # OpenRouter prompt templates
└── workflows/
    ├── engine1-sourcing/
    │   ├── zillow-fsbo-scraper.json       # Daily FSBO scraper
    │   ├── craigslist-monitor.json        # Every 4 hours
    │   ├── fb-marketplace-scraper.json    # Every 6 hours
    │   └── expired-listings-monitor.json  # Daily 6 AM
    ├── engine2-enrichment/
    │   ├── skip-trace-enrich.json         # Contact + valuation
    │   └── photo-analysis.json            # AI condition scoring
    ├── engine3-outreach/
    │   ├── initial-email-outreach.json    # First contact
    │   ├── email-followup-sequence.json   # Day 3/7/14
    │   └── sms-outreach.json              # SMS campaigns
    └── engine4-qualification/
        ├── email-response-monitor.json    # Gmail monitoring
        ├── sms-response-monitor.json      # Twilio webhook
        ├── hot-lead-brief-generator.json  # Call prep docs
        └── daily-digest.json              # Daily stats report
```

## Quick Start

1. Set up Airtable base (see `docs/AIRTABLE-SCHEMA.md`)
2. Configure credentials in n8n (see `docs/CREDENTIALS.md`)
3. Set environment variable: `AIRTABLE_BASE_ID`
4. Import workflows in order: Engine 1 → Engine 2 → Engine 3 → Engine 4
5. Activate triggers

## Workflow Triggers

| Workflow | Trigger | Schedule |
|----------|---------|----------|
| Zillow FSBO Scraper | Cron | Daily 7 AM |
| Craigslist Monitor | Cron | Every 4 hours |
| FB Marketplace Scraper | Cron | Every 6 hours |
| Expired Listings Monitor | Cron | Daily 6 AM |
| Skip Trace Enrich | Airtable Webhook | On new lead |
| Photo Analysis | Cron | Every 2 hours |
| Initial Email Outreach | Cron | Every 30 min |
| Email Follow-up Sequence | Cron | Daily 9 AM |
| SMS Outreach | Manual/Trigger | AI Score > 80 |
| Email Response Monitor | Gmail Webhook | Real-time |
| SMS Response Monitor | Twilio Webhook | Real-time |
| Hot Lead Brief Generator | Airtable Webhook | Status = HOT |
| Daily Digest | Cron | Daily 8 PM |

## Environment Variables

```bash
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

## Credential Names (n8n)

- `airtable-creds` - Airtable Personal Access Token
- `openrouter-auth` - HTTP Header Auth
- `gmail-oauth` - Gmail OAuth2
- `slack-creds` - Slack Bot Token
- `skiptracing-auth` - BatchSkipTracing API
- `twilio-creds` - Twilio API

## Key Features

- **AI-Powered Scoring** - Every lead scored 0-100 based on motivation signals
- **Multi-Source Acquisition** - Zillow, Craigslist, FB Marketplace, Expired MLS
- **Automated Follow-ups** - Day 3, 7, 14 email cadence
- **TCPA Compliance** - Opt-out handling for SMS
- **Hot Lead Alerts** - Instant Slack notifications
- **Call Prep Briefs** - AI-generated talking points for hot leads

## Support

See `docs/TROUBLESHOOTING.md` for common issues.
