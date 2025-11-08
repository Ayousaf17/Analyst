# Preprocess Tickets Node

## Overview
The Preprocess Tickets node is a critical component of the analytics workflow that reduces token usage by ~90% when processing large batches of Gorgias tickets for AI analysis.

## Problem Statement

### Before Preprocessing
- Full Gorgias ticket objects contain extensive data:
  - Complete message history (can be 100+ messages)
  - Full HTML/markdown content
  - Extensive metadata and nested objects
  - **Result**: 2000-5000 tokens per ticket

### Cost Impact (Without Preprocessing)
```
1000 tickets × 2500 tokens = 2,500,000 tokens
At Claude Sonnet 4.5 rates: ~$15-30 per analytics query
Risk: Exceeds OpenRouter token limits (causes 400 errors)
```

## Solution

### After Preprocessing
The node extracts only essential fields needed for analytics:
- Ticket ID, subject, status, channel
- Created/closed timestamps
- Calculated resolution time (in minutes)
- **First Response Time (FRT)** - time to first agent response
- Tags and assignee email
- First customer message (truncated to 300 chars)
- Message count
- **Spam flag** - whether ticket is marked as spam
- **Unassigned age** - hours since creation for unassigned tickets

**Result**: 200-300 tokens per ticket (~90% reduction)

### Cost Savings
```
1000 tickets × 250 tokens = 250,000 tokens
At Claude Sonnet 4.5 rates: ~$2-3 per analytics query
Savings: $15-25 per query
Benefit: Stays within OpenRouter limits
```

## Technical Specification

### Input Format
```javascript
{
  body: {
    data: [
      {
        id: 123456,
        subject: "Question about shipping",
        status: "closed",
        channel: "email",
        created_datetime: "2025-11-01T10:00:00Z",
        closed_datetime: "2025-11-01T12:30:00Z",
        messages: [
          {
            body_text: "Very long customer message...",
            // ... extensive message data
          }
        ],
        assignee_user: {
          email: "agent@company.com",
          // ... extensive user data
        },
        tags: ["shipping", "usa"],
        // ... many more fields
      }
      // ... 999 more tickets
    ],
    meta: {
      filtered_by_date: "last 30 days",
      filtered_by_status: "closed",
      cutoff_date: "2025-10-01"
    }
  }
}
```

### Output Format
```javascript
{
  json: {
    summary: {
      total_tickets: 1000,
      period: "last 30 days",
      status_filter: "closed",
      cutoff_date: "2025-10-01"
    },
    tickets: [
      {
        id: 123456,
        subject: "Question about shipping",
        status: "closed",
        channel: "email",
        created_at: "2025-11-01T10:00:00Z",
        closed_at: "2025-11-01T12:30:00Z",
        resolution_minutes: 150,
        first_response_minutes: 45,
        tags: ["shipping", "usa"],
        assignee: "agent@company.com",
        first_message: "Very long customer message... (truncated to 300 chars)",
        message_count: 8,
        spam: false,
        unassigned_age_hours: null
      }
      // ... 999 more lightweight tickets
    ],
    stats: {
      by_status: {
        "closed": 950,
        "open": 50
      },
      by_channel: {
        "email": 600,
        "chat": 300,
        "facebook": 100
      },
      avg_resolution_min: 410,
      spam: {
        count: 12,
        percentage: 1
      },
      unassigned: {
        count: 8,
        avg_age_hours: 36,
        oldest_hours: 72
      },
      first_response_time: {
        avg_minutes: 45,
        median_minutes: 32,
        count_measured: 950,
        count_no_response: 5
      }
    }
  }
}
```

## Field Extraction Strategy

### Essential Fields (Kept)
- **id**: Unique identifier for reference
- **subject**: Question/issue summary
- **status**: Current ticket state
- **channel**: Communication medium
- **created_at**: Timestamp for date analysis
- **closed_at**: Timestamp for resolution time
- **resolution_minutes**: Pre-calculated metric (time from creation to closure)
- **first_response_minutes**: Pre-calculated FRT metric (time to first agent response)
- **tags**: Categorization data
- **assignee**: Agent email (simplified)
- **first_message**: Truncated customer message (context)
- **message_count**: Conversation length indicator
- **spam**: Boolean flag indicating if ticket is marked as spam
- **unassigned_age_hours**: Hours since creation for unassigned tickets (null if assigned)

### Removed Fields
- Full message history (except first message, truncated)
- HTML content and formatting
- Complete user objects
- Attachment metadata
- Custom fields
- API metadata
- Nested objects

## Pre-Calculated Statistics

The node generates aggregations to help the AI analyze trends:

1. **Status Breakdown**
   - Count by status (open, closed, spam, etc.)
   - Helps AI understand ticket distribution

2. **Channel Breakdown**
   - Count by channel (email, chat, phone, etc.)
   - Identifies primary support channels

3. **Average Resolution Time**
   - Mean resolution time in minutes
   - Baseline for performance analysis

4. **Spam Metrics**
   - Count of spam tickets
   - Percentage of total tickets marked as spam
   - Helps identify spam patterns and filter quality

5. **Unassigned Ticket Metrics**
   - Count of currently unassigned tickets
   - Average age in hours for unassigned tickets
   - Oldest unassigned ticket age
   - Highlights tickets needing assignment

6. **First Response Time (FRT) Metrics**
   - Average FRT in minutes
   - Median FRT in minutes
   - Count of tickets with measured FRT
   - Count of tickets with no agent response yet
   - Key customer service performance indicator

## Usage in Analytics Workflow

### Flow Position
```
Fetch Tickets for Analytics
    ↓
Preprocess Tickets ← You are here
    ↓
Ticket Analytics Agent (Claude Sonnet 4.5)
    ↓
Universal Formatter
    ↓
Conversational Response AI
```

### Example: Analytics Query
```
User asks: "What are the top recurring questions this month?"

1. Fetch Tickets for Analytics: Retrieves 1000 closed tickets
   → 2,500,000 tokens (would fail)

2. Preprocess Tickets: Reduces to essential fields
   → 250,000 tokens (succeeds)

3. Ticket Analytics Agent: Analyzes preprocessed data
   → Returns insights on recurring questions
```

## Modification Guidelines

### Safe to Modify
- **Truncation length**: Change 300 char limit for first_message
- **Field selection**: Add/remove fields based on analytics needs
- **Stat calculations**: Add new aggregations (e.g., by_priority)

### Dangerous to Modify
- **Output structure**: The analytics agent expects specific fields
  - Changing `summary`, `tickets`, or `stats` structure will break downstream nodes
- **Field names**: Renaming fields will break analytics agent prompts

## Token Usage Analysis

### Example: 1000 Tickets

| Scenario | Tokens per Ticket | Total Tokens | Cost (Sonnet 4.5) |
|----------|-------------------|--------------|-------------------|
| Full tickets | 2500 | 2,500,000 | $15-30 |
| Preprocessed | 250 | 250,000 | $2-3 |
| **Savings** | **90%** | **2,250,000** | **$12-27** |

## Error Prevention

### OpenRouter Token Limits
- **Limit**: ~500k tokens per request
- **Full tickets**: 1000 tickets = 2.5M tokens ❌ (exceeds limit)
- **Preprocessed**: 1000 tickets = 250k tokens ✅ (within limit)

### Robustness
- Handles missing fields gracefully (uses defaults)
- Validates date formats before calculating resolution time
- Returns empty array if no tickets provided

## Testing Checklist

When modifying this node, verify:
- [ ] Output structure matches expected format
- [ ] Token count reduced by 80-95%
- [ ] All essential fields present
- [ ] Stats calculations are correct
- [ ] Analytics agent can parse the output
- [ ] No token limit errors in OpenRouter

## File Location
- **Code**: `/nodes/preprocess-tickets.js`
- **Workflow**: Used in `Fixed_Analytics_Workflow.json`
- **Documentation**: This file

## Related Nodes
- **fetch_tickets_for_analytics**: Upstream (provides raw ticket data)
- **ticket_analytics_agent**: Downstream (consumes preprocessed data)
- **summarize_results**: Similar purpose but for main workflow

## Version History
- **2025-11-08**: Added missing metrics (spam, unassigned age, FRT)
  - Added spam detection tracking (count & percentage)
  - Added unassigned ticket age calculation (hours)
  - Added First Response Time (FRT) metrics (avg, median, counts)
  - Updated documentation with new field specifications
- **2025-11-07**: Initial creation, extracted from Fixed_Analytics_Workflow
  - Reduces token usage by 90%
  - Prevents OpenRouter token limit errors
