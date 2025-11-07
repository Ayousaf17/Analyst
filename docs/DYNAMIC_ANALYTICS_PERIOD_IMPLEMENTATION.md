# Dynamic Analytics Period Implementation

## Problem Statement

**Issue:** The Analytics path had hardcoded values:
- Period: Always `"30d"` regardless of user request
- Status: Always `"closed"` regardless of user request

**User Request Example:**
```
@Gorgias Terminal analyze insights from last 7 days
```

**Expected Behavior:** System should analyze 7 days of data, not 30 days

**Actual Behavior:** System analyzed 30 days (hardcoded)

---

## Solution Overview

Make the analytics **dynamic** by:

1. **Parse Slack** - Extract time period and status from user's request
2. **Ticket Analytics Agent** - Use dynamic values instead of hardcoded ones
3. **Filtering** - Filter tickets to match the requested time range

---

## Implementation Steps

### Step 1: Update Parse Slack Node

**Location:** Beginning of workflow (first node after Slack Trigger)

**Replace existing code with:**
`workflows/Parse_Slack_with_Time_Extraction.js`

**What This Does:**
- ✅ Maintains all existing functionality (cleaning, correlation_id, start_timestamp)
- ✅ Extracts time period from user text:
  - "last 7 days" → `time_period: "7d"`
  - "past 2 weeks" → `time_period: "14d"`
  - "this month" → `time_period: "30d"`
  - No match → `time_period: "30d"` (default)
- ✅ Extracts status filter:
  - "closed tickets" → `status_filter: "closed"`
  - "open tickets" → `status_filter: "open"`
  - No match → `status_filter: null` (analyze all)
- ✅ Calculates cutoff date for filtering

**New Output Fields:**
```json
{
  "user_text": "analyze insights from last 7 days",
  "channel": "C09BXTD0WR0",
  "user_id": "U09BSMA8U75",
  "thread_ts": "1762451457.804479",
  "correlation_id": "corr_2025-11-07T12-34-56_U09BSMA8U75_a3f2e1",
  "start_timestamp": 1762474379338,
  "time_period": "7d",
  "time_period_days": 7,
  "status_filter": null,
  "cutoff_timestamp": 1761869579338,
  "cutoff_date": "2025-10-31T12:34:56.338Z"
}
```

---

### Step 2: Update Ticket Analytics Agent - User Prompt

**Location:** Analytics path, before OpenRouter API call

**Current BROKEN Prompt:**
```javascript
{
  "tickets": {{ $json.tickets }},  // ❌ Wrong path
  "period": "30d",                  // ❌ Hardcoded
  "status": "closed"                // ❌ Hardcoded
}
```

**Option A: Simple Fix (Direct Expression)**

Replace with:
```javascript
{
  "tickets": {{ $json.body.data }},
  "period": "{{ $('Parse Slack').first().json.time_period }}",
  "status": "{{ $('Parse Slack').first().json.status_filter || 'all' }}",
  "cutoff_date": "{{ $('Parse Slack').first().json.cutoff_date }}"
}
```

**Option B: Code Node (More Control)**

Use: `workflows/Ticket_Analytics_Agent_User_Prompt_Dynamic.js`

This code node:
- Fetches Parse Slack data dynamically
- Gets tickets from `$json.body.data`
- Builds a comprehensive prompt with instructions
- Logs what's being sent to the AI

---

### Step 3: Add Ticket Filtering (Optional but Recommended)

**Location:** Between "Fetch Tickets for Analytics" and "Ticket Analytics Agent"

**Purpose:** Pre-filter tickets by date before sending to AI (reduces tokens, faster processing)

**New Node:** Code node named "Filter Tickets by Date"

**Code:**
```javascript
// Get cutoff date from Parse Slack
const parseSlack = $('Parse Slack').first().json;
const cutoffTimestamp = parseSlack.cutoff_timestamp;
const timePeriod = parseSlack.time_period;

// Get all tickets
const allTickets = $json.body.data;

// Filter tickets by created_datetime
const filteredTickets = allTickets.filter(ticket => {
  const createdTime = new Date(ticket.created_datetime).getTime();
  return createdTime >= cutoffTimestamp;
});

console.log('───────────────────────────────────────');
console.log('📊 Ticket Filtering:');
console.log('  Period:', timePeriod);
console.log('  Cutoff date:', new Date(cutoffTimestamp).toISOString());
console.log('  Total tickets fetched:', allTickets.length);
console.log('  Tickets in range:', filteredTickets.length);
console.log('  Filtered out:', allTickets.length - filteredTickets.length);
console.log('═══════════════════════════════════════');

// Return filtered tickets in same structure
return [{
  json: {
    body: {
      data: filteredTickets
    }
  }
}];
```

**Benefits:**
- ✅ Only sends relevant tickets to AI
- ✅ Reduces token count significantly
- ✅ Faster AI processing
- ✅ More accurate results

---

## Testing

### Test Case 1: 7 Days (User's Request)
```
@Gorgias Terminal analyze insights from last 7 days
```

**Expected:**
- Parse Slack extracts: `time_period: "7d"`, `time_period_days: 7`
- Analytics Agent receives: `period: "7d"`
- Only tickets from last 7 days analyzed

### Test Case 2: 30 Days (Default)
```
@Gorgias Terminal analyze ticket insights
```

**Expected:**
- Parse Slack defaults: `time_period: "30d"`, `time_period_days: 30`
- Analytics Agent receives: `period: "30d"`
- Last 30 days analyzed

### Test Case 3: 14 Days (2 Weeks)
```
@Gorgias Terminal analyze insights from past 2 weeks
```

**Expected:**
- Parse Slack extracts: `time_period: "14d"`, `time_period_days: 14`
- Analytics Agent receives: `period: "14d"`
- Last 14 days analyzed

### Test Case 4: Closed Tickets Only
```
@Gorgias Terminal analyze closed tickets from last 7 days
```

**Expected:**
- Parse Slack extracts: `time_period: "7d"`, `status_filter: "closed"`
- Analytics Agent receives: `period: "7d"`, `status: "closed"`
- Only closed tickets from last 7 days analyzed

---

## Verification Steps

After implementing:

1. **Check Parse Slack Output:**
   - Trigger workflow with: `@Gorgias Terminal analyze insights from last 7 days`
   - Check Parse Slack execution logs
   - Verify `time_period: "7d"` is captured

2. **Check Analytics Agent Input:**
   - Check Ticket Analytics Agent execution logs
   - Verify it receives: `period: "7d"` (not "30d")
   - Verify tickets array is populated

3. **Check AI Response:**
   - AI should mention "7 days" in its analysis
   - Should NOT mention "30 days"
   - Results should be accurate to the time range

4. **Check Performance Metrics:**
   - Performance metrics should show `result_count` = tickets analyzed
   - Should match the filtered count (not all 100 fetched)

---

## Supported Time Period Formats

The Parse Slack enhancement supports these patterns:

| User Input | Extracted Period | Days |
|-----------|------------------|------|
| "last 7 days" | "7d" | 7 |
| "past 7 days" | "7d" | 7 |
| "last 2 weeks" | "14d" | 14 |
| "past 2 weeks" | "14d" | 14 |
| "last month" | "30d" | 30 |
| "this month" | "30d" | 30 |
| "this week" | "7d" | 7 |
| "today" | "1d" | 1 |
| "yesterday" | "1d" | 1 |
| (no period) | "30d" | 30 |

---

## Architecture Benefits

### Before (Hardcoded):
- ❌ User says "7 days" → system analyzes 30 days
- ❌ Confusing to users
- ❌ Wastes tokens analyzing irrelevant tickets
- ❌ Results don't match user intent

### After (Dynamic):
- ✅ User says "7 days" → system analyzes 7 days
- ✅ Matches user expectations
- ✅ Efficient token usage
- ✅ Accurate results
- ✅ Better user experience

---

## Implementation Priority

1. **CRITICAL:** Update Parse Slack (Step 1)
2. **CRITICAL:** Fix Analytics Agent prompt (Step 2)
3. **RECOMMENDED:** Add ticket filtering (Step 3)

Without Steps 1 & 2, the Analytics path will continue using hardcoded "30d".

---

## Files Created

1. `workflows/Parse_Slack_with_Time_Extraction.js` - Enhanced Parse Slack code
2. `workflows/Ticket_Analytics_Agent_User_Prompt_Dynamic.js` - Dynamic prompt builder
3. `docs/DYNAMIC_ANALYTICS_PERIOD_IMPLEMENTATION.md` - This guide

---

## Next Steps

1. Replace Parse Slack code with new version
2. Update Ticket Analytics Agent user prompt
3. Test with: `@Gorgias Terminal analyze insights from last 7 days`
4. Verify output matches "7 days" (not "30 days")
5. Add filtering node (optional but recommended)

---

## Questions Answered

**Q: "Why is the period 30 days when the user is asking for 7 days?"**
A: The period was hardcoded. This implementation makes it dynamic.

**Q: "Shouldn't this be dynamic?"**
A: Yes! This implementation extracts the period from the user's request.

**Q: "How does it work?"**
A:
1. Parse Slack extracts "last 7 days" from user text
2. Converts to `time_period: "7d"`
3. Ticket Analytics Agent uses that value
4. AI analyzes exactly 7 days of data

---

## End of Implementation Guide
