# Aasani Systems - Operations & Backend Setup Guide

## Your Current Stack (What You Have)
- Google Workspace (email, docs, calendar)
- Google AI Studio + Gemini
- Claude, ChatGPT
- n8n (automation)
- OpenRouter (LLM routing)
- Supabase (database)
- Vercel (hosting)
- Framer (website)

---

## What's Missing - Add Immediately

### CRM: HubSpot (FREE tier)
- Unlimited contacts
- Gmail integration
- Deal pipeline visualization
- Meeting scheduler included
- n8n integration

**Your Pipeline:**
```
Lead → Consultation Scheduled → Phase 1 Proposal Sent →
Phase 1 Won → Phase 1 Delivered → Phase 2 Proposal Sent →
Phase 2 Won → Retainer Discussion → Retainer Won
```

### Contracts/Proposals: PandaDoc ($19/mo)
- E-signature
- Payment collection
- Template library

### Invoicing: Stripe (2.9% + $0.30 per transaction)
- Professional invoices
- Auto-pay capability
- Integrates with everything

### Calendar Booking: Calendly (FREE tier)
- Google Calendar sync
- Auto-reminders
- HubSpot integration

### Time Tracking: Clockify (FREE)
- Track by client/phase
- Know if Phase 1 is profitable

### Accounting: Wave (FREE)
- Auto-imports Stripe
- Basic P&L, expenses

---

## Payment Terms

**Phase 1 (Foundation Assessment - $4,500-5,500):**
- 50% upfront before kickoff
- 50% upon report delivery

**Phase 2 (Systems Architecture - $18K-75K):**
- 25% upfront
- 25% at Week 6 (design complete)
- 25% at Week 12 (80% implementation)
- 25% at final handoff

**Phase 4 (Retainers - $3,000-3,500/mo):**
- Auto-charge 1st of month via Stripe
- Grace period: 3 days, then pause work

**Terms:** NET 15 (not NET 30)

---

## Workflow Detangler → Lead Capture Flow

### n8n Workflow:
```
[User submits on Framer] → [Webhook triggers n8n] →
[n8n calls OpenRouter/Claude API] → [Returns JSON] →
[Store in Supabase] → [Create HubSpot contact] →
[Send results email] → [Add to nurture sequence] →
[Slack notification to you]
```

### Supabase Schema:
```sql
CREATE TABLE workflow_detangler_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP DEFAULT NOW(),
  workflow_description TEXT NOT NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  company_name VARCHAR(255),
  analysis_json JSONB NOT NULL,
  friction_score INTEGER,
  friction_label VARCHAR(50),
  hubspot_contact_id VARCHAR(255),
  consultation_booked BOOLEAN DEFAULT FALSE,
  converted_to_client BOOLEAN DEFAULT FALSE
);
```

---

## n8n Automation Priorities

### Priority 1: Workflow Detangler Flow
- Impact: 24/7 lead generation
- Time to build: 8-12 hours

### Priority 2: Client Onboarding Sequence
- Trigger: Deal moves to "Phase 1 Won"
- Actions: Welcome email, create ClickUp project, send questionnaire, schedule kickoff

### Priority 3: Invoice Follow-Up
- Trigger: Stripe invoice unpaid after 3 days
- Actions: Send reminders, Slack alert, pause project if 10+ days overdue

### Priority 4: No-Show Recovery
- Trigger: Calendly event passed, no outcome logged
- Actions: Send reschedule link, move to stale lead sequence

---

## Holiday Prep Checklist (Before Jan 2026)

### Week 1 (Dec 16-22): Foundation
- [ ] Business bank account (Mercury or local)
- [ ] Stripe account approved
- [ ] Website live with basic page
- [ ] HubSpot CRM configured
- [ ] Calendly connected
- [ ] LinkedIn profile optimized

### Week 2 (Dec 23-29): Build Workflow Detangler
- [ ] Supabase database schema
- [ ] n8n automation flow
- [ ] Test with 5 sample workflows
- [ ] OpenRouter account funded ($20)
- [ ] Framer form integrated

### Week 3 (Dec 30-Jan 5): Client Delivery Prep
- [ ] Interview question bank
- [ ] Tool Audit spreadsheet template
- [ ] Readiness Report template
- [ ] Phase 1 SOW template (PandaDoc)
- [ ] Pre-engagement questionnaire

### Week 4 (Jan 6-12): Launch
- [ ] Email 20 contacts announcing launch
- [ ] Post "official launch" on LinkedIn
- [ ] Run 3 mock consultations
- [ ] Test full lead capture flow

---

## Daily Rhythm

**Morning (9:00-9:30):**
- Check HubSpot for new leads
- Review today's Calendly calls
- Check Stripe for payment issues
- Time block deep work

**End of Day (5:00-5:30):**
- Log time in Clockify
- Update HubSpot deal stages
- Set tomorrow's #1 priority

---

## Weekly Rhythm

| Day | Focus |
|-----|-------|
| **Monday** | Sales & outreach (LinkedIn, follow-ups, proposals) |
| **Tue-Thu** | Client delivery (deep work, no meetings after 2pm) |
| **Friday** | Operations & content (admin, metrics review, LinkedIn posts) |

---

## Monthly Costs

| Tool | Cost |
|------|------|
| HubSpot | $0 |
| PandaDoc | $19 |
| Stripe | 2.9% + $0.30 |
| Calendly | $0-10 |
| ClickUp | $0 |
| Clockify | $0 |
| Wave | $0 |
| Plausible | $9 |
| **Total** | ~$40-50/mo |

---

## First Hire (Month 2-3)

**Virtual Assistant ($500-800/mo, 10-15 hrs/week)**
- Calendly management
- CRM data entry
- Invoice follow-up
- Client onboarding emails

**Warning Signs You Need Help:**
- Working 60+ hours/week for 2+ weeks
- Missing client deadlines
- Response time to leads >24 hours
