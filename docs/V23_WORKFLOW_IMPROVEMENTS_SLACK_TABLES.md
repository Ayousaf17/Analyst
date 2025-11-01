# v23 Workflow Improvements: Slack Tables & Standard Metrics

**Created:** November 1, 2025
**Status:** Implementation Ready
**Priority:** Medium - Quality of Life Improvements

---

## 📋 OVERVIEW

Your friend made excellent suggestions for improving the v23 workflow's data presentation in Slack. This document addresses:

1. **Standard Metrics Template** - Pre-defined statistics that the LLM automatically fetches
2. **Slack Table Support** - Native table blocks (new!) + ASCII table alternatives
3. **Monospace Formatting** - Using code blocks for clean data presentation
4. **ASCII Art Tables** - Beautiful formatted tables within monospace blocks

---

## 🎯 FRIEND'S SUGGESTIONS ANALYSIS

### ✅ Suggestion 1: Standard Set of Statistics
> "Is there a standard set of statistics I can code that LLM will just go get so I don't have to change that code for list metrics?"

**Answer:** YES! We can create a standardized metrics template that:
- Defines exactly what statistics to fetch
- LLM automatically calculates from ticket data
- No code changes needed when adding new metric queries
- Works with existing `list_metrics` action

### ✅ Suggestion 2: Slack Table Support
> "Does Slack API let me display things in tables?"

**Answer:** YES! As of **August 14, 2025**, Slack added native **table block** support to their API!
- 📚 Docs: https://docs.slack.dev/changelog/2025/08/14/block-kit-table-block
- Native table rendering (not just ASCII)
- Proper columns, headers, and cell formatting
- Character limit: 3000 characters per table

### ✅ Suggestion 3: Monospace Formatting
> "Slack does support monospace formatting, you know, like three tick marks and then code"

**Answer:** CORRECT! Triple backticks (```) create monospace code blocks:
```
Text inside here is monospace
Perfect for ASCII tables
```

### ✅ Suggestion 4: ASCII Art Alternative
> "You could have an ASCII art template. Just create your own table with monospace formatting."

**Answer:** EXCELLENT IDEA! ASCII tables in code blocks:
- Guaranteed to work (no API version dependencies)
- Easy to generate programmatically
- Beautiful alignment with monospace
- Works in all Slack versions

---

## 🔢 PART 1: STANDARD METRICS TEMPLATE

### The Problem

Currently, when users ask "how many tickets today?" or "which agents are performing best?", the workflow:
1. Routes to `list_metrics` action
2. Fetches ALL tickets
3. Conversational AI manually calculates statistics
4. No standardized format

**Issues:**
- ❌ Token waste (AI has to figure out what to calculate)
- ❌ Inconsistent results (different calculations each time)
- ❌ Slow responses (AI does math instead of presenting data)

### The Solution: Pre-Defined Metrics Schema

Create a **Standard Metrics Schema** that the LLM always uses for `list_metrics` queries.

#### Standard Metrics to Always Calculate

```javascript
// Standard Metrics Schema
const STANDARD_METRICS = {
  // 1. Volume Metrics
  volume: {
    total_tickets: 0,
    open_tickets: 0,
    closed_tickets: 0,
    new_today: 0,
    closed_today: 0,
    new_this_week: 0,
    closed_this_week: 0
  },

  // 2. Status Distribution
  by_status: {
    open: 0,
    closed: 0,
    pending: 0,
    spam: 0
  },

  // 3. Priority Distribution
  by_priority: {
    low: 0,
    normal: 0,
    high: 0,
    urgent: 0
  },

  // 4. Agent Performance
  by_agent: [
    {
      name: "Agent Name",
      total_assigned: 0,
      open_tickets: 0,
      closed_tickets: 0,
      close_rate: 0.00,
      avg_response_time_hours: 0
    }
  ],

  // 5. Customer Metrics
  by_customer: [
    {
      email: "customer@example.com",
      total_tickets: 0,
      open_tickets: 0,
      latest_ticket_id: 0
    }
  ],

  // 6. Time-Based Trends
  trends: {
    tickets_per_day_avg: 0,
    busiest_day: "Monday",
    slowest_day: "Saturday",
    avg_resolution_time_hours: 0
  },

  // 7. Channel/Source Distribution
  by_channel: {
    email: 0,
    chat: 0,
    phone: 0,
    social: 0
  },

  // 8. Response Time Stats
  response_times: {
    avg_first_response_minutes: 0,
    avg_resolution_hours: 0,
    fastest_agent: "Agent Name",
    slowest_agent: "Agent Name"
  }
};
```

### Implementation: Update Conversational AI System Message

Add this section at the TOP of the Conversational AI System Message:

```
═══════════════════════════════════════════════════════════════════
📊 STANDARD METRICS TEMPLATE
═══════════════════════════════════════════════════════════════════

When action is "list_metrics", you MUST calculate the following standard metrics:

**Required Metrics (Always Calculate):**
1. **Volume Metrics**
   - Total tickets in dataset
   - Open vs Closed breakdown
   - New tickets today
   - Closed tickets today
   - New tickets this week
   - Closed tickets this week

2. **Status Distribution**
   - Count by status (open, closed, pending, spam)
   - Percentage of total for each status

3. **Priority Distribution**
   - Count by priority (low, normal, high, urgent)
   - Percentage of total for each priority

4. **Agent Performance** (Top 5)
   - Tickets assigned per agent
   - Open vs Closed per agent
   - Close rate percentage
   - Rank by performance

5. **Response Time Stats**
   - Average first response time
   - Average resolution time
   - Fastest responding agent
   - Slowest responding agent

**Calculation Instructions:**

From the results array you receive:
- Group tickets by: assignee_user.name, status, priority, customer.email
- Count occurrences for each group
- Calculate percentages: (count / total) * 100
- Rank agents by closed_tickets DESC
- Calculate averages where timestamps available

**Output Format:**
Always present metrics using the ASCII table template (see PART 2 below).

═══════════════════════════════════════════════════════════════════
```

### Why This Works

✅ **No code changes needed** - Just update AI prompt
✅ **Consistent results** - Same metrics every time
✅ **LLM knows exactly what to do** - Clear instructions
✅ **Extensible** - Add new metrics to template as needed

---

## 📊 PART 2: SLACK TABLE FORMATTING

### Option A: Native Slack Table Blocks (Recommended)

As of August 2025, Slack supports **native table blocks** via Block Kit.

#### Implementation

Update the **Final Slack Reply** node to use Block Kit with table blocks:

```javascript
// Build table block for metrics
const tableBlock = {
  type: "rich_text",
  elements: [
    {
      type: "rich_text_section",
      elements: [
        {
          type: "text",
          text: "📊 Ticket Performance Metrics\n\n"
        }
      ]
    },
    {
      type: "table",
      cells: [
        // Header row
        [
          { type: "text", text: "Metric" },
          { type: "text", text: "Count" },
          { type: "text", text: "Percentage" }
        ],
        // Data rows
        [
          { type: "text", text: "Open Tickets" },
          { type: "text", text: "13" },
          { type: "text", text: "13%" }
        ],
        [
          { type: "text", text: "Closed Tickets" },
          { type: "text", text: "87" },
          { type: "text", text: "87%" }
        ],
        [
          { type: "text", text: "Total" },
          { type: "text", text: "100" },
          { type: "text", text: "100%" }
        ]
      ]
    }
  ]
};

// Send to Slack
await $http.request({
  method: 'POST',
  url: 'https://slack.com/api/chat.postMessage',
  headers: {
    'Authorization': 'Bearer ' + $credentials.slackOauth2Api.accessToken,
    'Content-Type': 'application/json'
  },
  body: {
    channel: channelId,
    thread_ts: threadTs,
    blocks: [tableBlock]
  }
});
```

**Pros:**
✅ Native Slack rendering
✅ Clean, professional appearance
✅ Columns automatically aligned
✅ Supports bold/italic in cells

**Cons:**
❌ Requires Block Kit API
❌ 3000 character limit
❌ More complex implementation

---

### Option B: ASCII Tables in Code Blocks (Recommended for Simplicity)

Your friend's suggestion! Create beautiful ASCII tables within triple backtick code blocks.

#### Implementation: Add ASCII Table Generator

Create a new **Code node** called "Format Metrics Table" before the Conversational AI:

```javascript
/**
 * ASCII Table Generator for Slack Monospace Formatting
 * Converts metrics data into beautiful aligned tables
 */

function generateASCIITable(data, title) {
  const lines = [];

  // Title
  lines.push(`╔══════════════════════════════════════════════════════╗`);
  lines.push(`║  ${title.padEnd(50)}  ║`);
  lines.push(`╠══════════════════════════════════════════════════════╣`);

  // Headers
  const headers = Object.keys(data[0]);
  const colWidths = headers.map(h => Math.max(h.length, 15));

  let headerRow = '║  ';
  headers.forEach((h, i) => {
    headerRow += h.padEnd(colWidths[i]) + '  │  ';
  });
  headerRow = headerRow.slice(0, -3) + '║';
  lines.push(headerRow);

  lines.push(`╠${'═'.repeat(54)}╣`);

  // Data rows
  data.forEach(row => {
    let dataRow = '║  ';
    headers.forEach((h, i) => {
      const value = String(row[h] || '');
      dataRow += value.padEnd(colWidths[i]) + '  │  ';
    });
    dataRow = dataRow.slice(0, -3) + '║';
    lines.push(dataRow);
  });

  // Footer
  lines.push(`╚══════════════════════════════════════════════════════╝`);

  return lines.join('\n');
}

// Example: Status Distribution Table
const statusData = [
  { Status: 'Open', Count: '13', Percentage: '13%' },
  { Status: 'Closed', Count: '87', Percentage: '87%' },
  { Status: 'Total', Count: '100', Percentage: '100%' }
];

const statusTable = generateASCIITable(statusData, '📊 Status Distribution');

// Example: Agent Performance Table
const agentData = [
  { Agent: 'Spencer James', Assigned: '45', Closed: '42', Rate: '93%' },
  { Agent: 'Zach Ruland', Assigned: '38', Closed: '35', Rate: '92%' },
  { Agent: 'Mackenzie Zerkel', Assigned: '17', Closed: '10', Rate: '59%' }
];

const agentTable = generateASCIITable(agentData, '🏆 Top Performers');

// Combine tables with code block markers
const formattedOutput = `
\`\`\`
${statusTable}

${agentTable}
\`\`\`

💡 *What would you like to do?*
• View agent details: "@Gorgias Terminal show Spencer James tickets"
• See trends: "@Gorgias Terminal show me weekly trends"
• Deep dive: "@Gorgias Terminal analyze top performing agents"
`;

return [{ json: { formatted_metrics: formattedOutput } }];
```

#### Simpler ASCII Table Template (Lightweight)

If you want something even simpler, use this basic template:

```javascript
/**
 * Simple ASCII Table Generator
 * Uses basic characters for maximum compatibility
 */

function createSimpleTable(headers, rows) {
  const colWidths = headers.map((h, i) => {
    const maxDataWidth = Math.max(...rows.map(r => String(r[i] || '').length));
    return Math.max(h.length, maxDataWidth) + 2;
  });

  // Top border
  let table = '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐\n';

  // Headers
  table += '│' + headers.map((h, i) => ' ' + h.padEnd(colWidths[i] - 1)).join('│') + '│\n';

  // Separator
  table += '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤\n';

  // Data rows
  rows.forEach(row => {
    table += '│' + row.map((cell, i) => ' ' + String(cell).padEnd(colWidths[i] - 1)).join('│') + '│\n';
  });

  // Bottom border
  table += '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘';

  return table;
}

// Example usage
const headers = ['Metric', 'Value', '%'];
const rows = [
  ['Open Tickets', '13', '13%'],
  ['Closed Tickets', '87', '87%'],
  ['Total', '100', '100%']
];

const table = createSimpleTable(headers, rows);

// Wrap in code block for Slack
const slackMessage = '```\n' + table + '\n```';

console.log(slackMessage);
```

**Expected Output in Slack:**

```
┌──────────────────┬─────────┬──────┐
│ Metric           │ Value   │ %    │
├──────────────────┼─────────┼──────┤
│ Open Tickets     │ 13      │ 13%  │
│ Closed Tickets   │ 87      │ 87%  │
│ Total            │ 100     │ 100% │
└──────────────────┴─────────┴──────┘
```

**Pros:**
✅ Simple to implement
✅ Works everywhere (all Slack versions)
✅ Beautiful monospace alignment
✅ No API complexity
✅ No character limits

**Cons:**
❌ Requires monospace font (code blocks)
❌ Manual table generation

---

## 🎨 PART 3: COMPLETE CONVERSATIONAL AI UPDATE

### Updated System Message Section

Add this to your existing 161-line Conversational AI System Message:

```
═══════════════════════════════════════════════════════════════════
📊 METRICS FORMATTING RULES
═══════════════════════════════════════════════════════════════════

**When action is "list_metrics":**

1. Calculate standard metrics (see STANDARD METRICS TEMPLATE above)

2. Format output using ASCII tables in code blocks:

**Template:**
```
📊 Ticket Metrics Report

\`\`\`
┌──────────────────┬─────────┬──────────┐
│ Status           │ Count   │ Percent  │
├──────────────────┼─────────┼──────────┤
│ Open             │ 13      │ 13%      │
│ Closed           │ 87      │ 87%      │
│ Total            │ 100     │ 100%     │
└──────────────────┴─────────┴──────────┘

┌──────────────────┬──────────┬─────────┬──────┐
│ Agent            │ Assigned │ Closed  │ Rate │
├──────────────────┼──────────┼─────────┼──────┤
│ Spencer James    │ 45       │ 42      │ 93%  │
│ Zach Ruland      │ 38       │ 35      │ 92%  │
│ Mackenzie Zerkel │ 17       │ 10      │ 59%  │
└──────────────────┴──────────┴─────────┴──────┘
\`\`\`

📈 **Insights:**
• Spencer James leads with 93% close rate (42 closed)
• Zach Ruland close behind at 92% (35 closed)
• 87% overall close rate - excellent performance!

💡 **What would you like to do?**
• Deep dive: "@Gorgias Terminal show me Spencer's tickets"
• Compare periods: "@Gorgias Terminal compare this week vs last week"
• View trends: "@Gorgias Terminal show me daily trends"
```

**Formatting Rules:**
- Always wrap ASCII tables in triple backticks (\`\`\`)
- Use box-drawing characters: ┌ ┬ ┐ ├ ┼ ┤ └ ┴ ┘ │ ─
- Align columns with proper padding
- Add insights below the table
- Suggest next actions at the end

**DO:**
✅ Use monospace code blocks for all tables
✅ Calculate percentages to 0 decimal places (87%)
✅ Rank agents by performance (best first)
✅ Include insights that highlight key findings
✅ Provide actionable next steps

**DON'T:**
❌ Show raw JSON data
❌ List individual tickets (use summary stats only)
❌ Use markdown tables (not supported in Slack)
❌ Forget the code block markers (\`\`\`)

═══════════════════════════════════════════════════════════════════
```

---

## 📝 PART 4: IMPLEMENTATION GUIDE

### Step 1: Update Conversational AI System Message

1. Open n8n workflow
2. Find **Conversational Response AI** node
3. Open **System Message** field
4. Add the sections from PART 1 (Standard Metrics) and PART 3 (Formatting Rules) to the TOP
5. Keep existing 161-line formatting guide below
6. Save node

### Step 2: (Optional) Add ASCII Table Generator Node

If you want to pre-generate tables instead of letting the AI do it:

1. Add a new **Code** node before Conversational Response AI
2. Name it: "Format Metrics Table"
3. Paste the ASCII table generator code from PART 2, Option B
4. Connect: Collect Results → Format Metrics Table → Conversational Response AI
5. Update Conversational AI prompt to use `{{ $('Format Metrics Table').first().json.formatted_metrics }}`

### Step 3: Test with Metrics Queries

Run these test commands in Slack:

```
@Gorgias Terminal how many tickets today?
@Gorgias Terminal which agents are performing best?
@Gorgias Terminal show me ticket statistics
@Gorgias Terminal what's our close rate?
@Gorgias Terminal who is the fastest agent?
```

**Expected Output:**
- Clean ASCII tables in code blocks
- Standard metrics always calculated
- Beautiful monospace alignment
- Insights and recommendations

### Step 4: (Advanced) Use Native Slack Table Blocks

If you want to use Slack's new native table blocks:

1. Update **Final Slack Reply** node
2. Change from simple text message to Block Kit API
3. Use the table block code from PART 2, Option A
4. Test and verify rendering

---

## 🎯 EXAMPLES

### Example 1: Status Distribution

**User Query:** "@Gorgias Terminal show me ticket status breakdown"

**AI Response:**
```
📊 Ticket Status Report

```
┌──────────────┬─────────┬──────────┐
│ Status       │ Count   │ Percent  │
├──────────────┼─────────┼──────────┤
│ Open         │ 13      │ 13%      │
│ Closed       │ 87      │ 87%      │
│ Pending      │ 0       │ 0%       │
│ Spam         │ 0       │ 0%       │
├──────────────┼─────────┼──────────┤
│ **Total**    │ **100** │ **100%** │
└──────────────┴─────────┴──────────┘
```

📈 **Insights:**
• Excellent close rate of 87%
• Only 13 tickets currently open
• No pending or spam tickets

💡 **Want more details?**
• "@Gorgias Terminal show me those 13 open tickets"
• "@Gorgias Terminal compare to last week"
```

---

### Example 2: Agent Performance

**User Query:** "@Gorgias Terminal which agents are top performers?"

**AI Response:**
```
🏆 Top Performing Agents

```
┌────────────────────┬──────────┬─────────┬─────────┬────────┐
│ Agent              │ Assigned │ Closed  │ Open    │ Rate   │
├────────────────────┼──────────┼─────────┼─────────┼────────┤
│ Spencer James      │ 45       │ 42      │ 3       │ 93%    │
│ Zach Ruland        │ 38       │ 35      │ 3       │ 92%    │
│ Mackenzie Zerkel   │ 17       │ 10      │ 7       │ 59%    │
└────────────────────┴──────────┴─────────┴─────────┴────────┘
```

📊 **Team Statistics:**
• Average close rate: 81%
• Total tickets handled: 100
• Average tickets per agent: 33

🥇 **Top Performer:** Spencer James (93% close rate)

💡 **Actions:**
• "@Gorgias Terminal show Spencer James's tickets"
• "@Gorgias Terminal help Mackenzie with open tickets"
• "@Gorgias Terminal show team trends this month"
```

---

### Example 3: Multi-Table Metrics

**User Query:** "@Gorgias Terminal show me all metrics"

**AI Response:**
```
📊 Complete Ticket Metrics Report

**Status Distribution**
```
┌──────────┬─────────┬──────────┐
│ Status   │ Count   │ Percent  │
├──────────┼─────────┼──────────┤
│ Open     │ 13      │ 13%      │
│ Closed   │ 87      │ 87%      │
└──────────┴─────────┴──────────┘
```

**Priority Breakdown**
```
┌──────────┬─────────┬──────────┐
│ Priority │ Count   │ Percent  │
├──────────┼─────────┼──────────┤
│ Urgent   │ 5       │ 5%       │
│ High     │ 12      │ 12%      │
│ Normal   │ 83      │ 83%      │
└──────────┴─────────┴──────────┘
```

**Top 3 Agents**
```
┌────────────────┬─────────┬────────┐
│ Agent          │ Closed  │ Rate   │
├────────────────┼─────────┼────────┤
│ Spencer James  │ 42      │ 93%    │
│ Zach Ruland    │ 35      │ 92%    │
│ Mackenzie Z.   │ 10      │ 59%    │
└────────────────┴─────────┴────────┘
```

📈 **Key Insights:**
• 87% close rate - above target!
• Only 5% urgent tickets - manageable load
• Spencer and Zach are crushing it 🔥

💡 **Next Steps:**
• "@Gorgias Terminal show trends over time"
• "@Gorgias Terminal list urgent tickets"
```

---

## ✅ TESTING CHECKLIST

After implementing these improvements:

- [ ] Test metrics query: "how many tickets today?"
- [ ] Verify ASCII tables render in monospace
- [ ] Check table alignment is perfect
- [ ] Test multi-table output
- [ ] Verify all standard metrics calculated
- [ ] Test with different query phrasings
- [ ] Confirm insights are meaningful
- [ ] Check suggested actions are relevant
- [ ] Verify no token overflow (stay under 2,500)
- [ ] Test in actual Slack channel

---

## 📊 EXPECTED IMPACT

### Before These Improvements
- Metrics responses: Unstructured text
- Data presentation: Messy, hard to read
- User experience: Confusing
- Token usage: Variable (500-3,000)

### After These Improvements
✅ **Metrics responses:** Clean ASCII tables
✅ **Data presentation:** Beautiful, aligned, professional
✅ **User experience:** Easy to scan and understand
✅ **Token usage:** Consistent (~1,500)
✅ **Response quality:** Standardized, reliable

---

## 🎉 BENEFITS SUMMARY

### For Users
✅ Professional-looking tables in Slack
✅ Easy to scan and compare data
✅ Consistent metrics every time
✅ Clear insights and recommendations

### For You (Developer)
✅ No code changes for new metric queries
✅ LLM knows exactly what to calculate
✅ Easier to maintain and extend
✅ Better token efficiency

### For the System
✅ Reduced token usage (standardized prompts)
✅ Faster responses (pre-defined calculations)
✅ More reliable output (template-based)
✅ Better observability (consistent structure)

---

## 📚 REFERENCES

- **Slack Table Block Docs:** https://docs.slack.dev/changelog/2025/08/14/block-kit-table-block
- **Slack Formatting Guide:** https://api.slack.com/reference/surfaces/formatting
- **ASCII Box Drawing Characters:** https://en.wikipedia.org/wiki/Box-drawing_character
- **Slack Tables Tool:** https://slack-tables.com/

---

## 🚀 NEXT STEPS

1. **Immediate:** Update Conversational AI with metrics template and formatting rules
2. **Short-term:** Add ASCII table generator if you want pre-formatted output
3. **Long-term:** Migrate to native Slack table blocks for even better UX
4. **Future:** Add interactive buttons for drill-down metrics

---

**Status:** ✅ READY FOR IMPLEMENTATION
**Estimated Time:** 30-60 minutes
**Complexity:** Low-Medium
**Impact:** High (significant UX improvement)

Your friend's suggestions are spot-on! These improvements will make your v23 workflow much more professional and user-friendly. 🎯
