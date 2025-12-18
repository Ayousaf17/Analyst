# OpenRouter Prompt Templates

## Standard API Call Format

```javascript
POST https://openrouter.ai/api/v1/chat/completions
Headers:
  Authorization: Bearer sk-or-v1-XXXXX
  HTTP-Referer: https://wholesale-leadgen.local
  X-Title: Wholesale Lead Gen

Body:
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [{"role": "user", "content": "PROMPT_HERE"}],
  "max_tokens": 800,
  "temperature": 0.3
}
```

---

## 1. Deal Analysis Prompt

Used in: `skip-trace-enrich.json`

```
Analyze this potential wholesale real estate deal:

Property: {{address}}, {{city}}, {{state}} {{zip}}
Asking Price: ${{asking_price}}
Estimated Value: ${{estimated_value}}
Source: {{source}}
Days on Market: {{days_on_market}}
Listing Description: {{description}}

Evaluate for wholesale potential. Consider:
1. Equity spread (asking vs estimated value)
2. Motivation signals in the listing
3. Property condition indicators
4. Market timing
5. Deal viability

Return ONLY valid JSON:
{
  "ai_score": 0-100,
  "priority": "high" | "medium" | "low",
  "motivation_signals": ["signal1", "signal2"],
  "concerns": ["concern1", "concern2"],
  "estimated_arv": number,
  "max_offer": number,
  "summary": "2-3 sentence deal summary",
  "recommended_action": "contact immediately" | "worth pursuing" | "low priority" | "skip"
}
```

---

## 2. Listing Legitimacy Check

Used in: `craigslist-monitor.json`, `fb-marketplace-scraper.json`

```
Analyze this real estate listing for legitimacy:

Title: {{title}}
Description: {{description}}
Price: ${{price}}
Location: {{location}}
Contact Info: {{contact}}
Posted: {{post_date}}

Determine if this is a legitimate FSBO listing or spam/scam.

Red flags to check:
- Price too good to be true
- Generic/stock photos mentioned
- Requests for money upfront
- No address given
- Non-local contact info
- Poor grammar suggesting scam
- Rental disguised as sale

Return ONLY valid JSON:
{
  "is_legitimate": true | false,
  "confidence": 0-100,
  "red_flags": ["flag1", "flag2"],
  "property_type": "house" | "condo" | "land" | "other" | "unknown",
  "is_fsbo": true | false,
  "reason": "Brief explanation"
}
```

---

## 3. Initial Email Generation

Used in: `initial-email-outreach.json`

```
Generate a personalized cold email to a property owner about buying their house.

Owner Name: {{owner_name}}
Property Address: {{address}}, {{city}}
Asking Price: ${{asking_price}}
Source: {{source}}
Motivation Signals: {{motivation_signals}}

My Info:
- Name: {{your_name}}
- Company: {{your_company}}
- Phone: {{your_phone}}

Guidelines:
- Warm, conversational tone
- Reference specific property details
- Acknowledge their situation without being pushy
- Clear call to action (call or reply)
- Short - under 150 words
- No aggressive "CASH OFFER" language

Return ONLY valid JSON:
{
  "subject": "Email subject line",
  "body": "Email body text",
  "personalization_notes": "What was personalized"
}
```

---

## 4. Follow-up Email Generation

Used in: `email-followup-sequence.json`

```
Generate a follow-up email to a property owner who hasn't responded.

Owner Name: {{owner_name}}
Property Address: {{address}}
Days Since Last Contact: {{days_since_contact}}
Follow-up Number: {{followup_number}} (1, 2, or 3)
Previous Subject: {{previous_subject}}
Previous Email Sent: {{previous_body}}

My Info:
- Name: {{your_name}}
- Phone: {{your_phone}}

Guidelines:
- Different angle than previous email
- Follow-up 1: Gentle check-in
- Follow-up 2: Add value (market info, flexibility)
- Follow-up 3: Final attempt, leave door open
- Shorter than initial email
- Easy to reply to

Return ONLY valid JSON:
{
  "subject": "Email subject line",
  "body": "Email body text",
  "angle": "What approach this email takes"
}
```

---

## 5. SMS Generation

Used in: `sms-outreach.json`

```
Generate a short SMS to a property owner about buying their house.

Owner Name: {{owner_name}}
Property Address: {{address}}
My Name: {{your_name}}
My Phone: {{your_phone}}

Guidelines:
- Maximum 160 characters
- Friendly, not salesy
- Simple question to get response
- Include opt-out: "Reply STOP to opt out"

Return ONLY valid JSON:
{
  "message": "SMS text under 160 chars including opt-out",
  "character_count": number
}
```

---

## 6. Response Analysis

Used in: `email-response-monitor.json`, `sms-response-monitor.json`

```
Analyze this response from a property owner:

Original Outreach: {{our_message}}
Their Response: {{their_response}}
Property: {{address}}
Current Status: {{status}}

Classify the response and determine next action.

Return ONLY valid JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "classification": "interested" | "question" | "objection" | "rejection" | "spam" | "unsubscribe",
  "motivation_level": "high" | "medium" | "low" | "none",
  "key_points": ["point1", "point2"],
  "suggested_response": "Brief suggested reply",
  "recommended_status": "Warm" | "HOT" | "Cold" | "Dead",
  "urgency": "high" | "medium" | "low",
  "summary": "1-2 sentence summary"
}
```

---

## 7. Hot Lead Brief

Used in: `hot-lead-brief-generator.json`

```
Generate a call preparation brief for a hot wholesale lead.

Property: {{address}}, {{city}}, {{state}}
Owner: {{owner_name}}
Phone: {{owner_phone}}
Asking Price: ${{asking_price}}
Estimated Value: ${{estimated_value}}
Source: {{source}}
AI Score: {{ai_score}}

Conversation History:
{{conversation_history}}

AI Analysis:
{{ai_analysis}}

Create a comprehensive call prep document.

Return ONLY valid JSON:
{
  "summary": "2-3 sentence deal overview",
  "why_selling": "Inferred motivation",
  "what_they_want": "Their likely priorities",
  "why_its_a_deal": "The opportunity",
  "talking_points": ["point1", "point2", "point3"],
  "questions_to_ask": ["question1", "question2", "question3"],
  "objections_to_expect": [
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."}
  ],
  "max_offer_recommendation": number,
  "negotiation_range": {"low": number, "target": number, "walk_away": number},
  "next_steps": "Recommended approach",
  "red_flags": ["flag1", "flag2"]
}
```

---

## 8. Daily Digest Summary

Used in: `daily-digest.json`

```
Generate a daily summary for a wholesale real estate lead generation system.

Today's Stats:
- New Leads Found: {{new_leads}}
- Leads Enriched: {{enriched}}
- Emails Sent: {{emails_sent}}
- SMS Sent: {{sms_sent}}
- Responses Received: {{responses}}
- Hot Leads: {{hot_leads}}
- Leads Gone Cold: {{cold_leads}}

Top Leads Today:
{{top_leads_json}}

Week-over-Week:
- Last Week New Leads: {{last_week_leads}}
- Last Week Responses: {{last_week_responses}}

Generate an executive summary.

Return ONLY valid JSON:
{
  "headline": "One-line summary of the day",
  "highlights": ["highlight1", "highlight2"],
  "concerns": ["concern1", "concern2"],
  "recommendations": ["rec1", "rec2"],
  "hot_lead_summary": "Brief on hot leads",
  "tomorrow_focus": "What to prioritize tomorrow"
}
```

---

## 9. Photo Analysis

Used in: `photo-analysis.json`

```
Analyze these property photos for condition assessment.

Property: {{address}}
Asking Price: ${{asking_price}}

[Photos attached]

Evaluate the property condition from visible elements.

Return ONLY valid JSON:
{
  "condition_score": 1-10,
  "visible_issues": ["issue1", "issue2"],
  "positive_features": ["feature1", "feature2"],
  "estimated_repair_cost": "low" | "medium" | "high" | "unknown",
  "repair_estimate_range": "$X - $Y",
  "renovation_level": "cosmetic" | "moderate" | "major" | "gut",
  "red_flags": ["flag1", "flag2"],
  "notes": "Additional observations"
}
```

---

## Temperature Settings

| Prompt Type | Temperature | Reasoning |
|-------------|-------------|-----------|
| Deal Analysis | 0.3 | Consistent, analytical |
| Legitimacy Check | 0.2 | High accuracy needed |
| Email Generation | 0.7 | Creative, varied |
| Response Analysis | 0.3 | Consistent classification |
| Hot Lead Brief | 0.4 | Structured but insightful |
| Daily Digest | 0.5 | Summary with personality |
| Photo Analysis | 0.3 | Objective assessment |

## Token Limits

| Prompt Type | Max Tokens |
|-------------|------------|
| Deal Analysis | 800 |
| Legitimacy Check | 400 |
| Email Generation | 600 |
| Response Analysis | 600 |
| Hot Lead Brief | 1200 |
| Daily Digest | 800 |
| Photo Analysis | 600 |
