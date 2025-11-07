// ============================================================================
// PARSE SLACK - Enhanced with Time Period & Status Extraction
// ============================================================================
// Purpose:
// 1. Clean Slack formatting
// 2. Generate correlation_id
// 3. Capture start_timestamp for performance metrics
// 4. Extract time period from user request (for analytics)
// 5. Extract status filter if mentioned
// ============================================================================

const start_timestamp = Date.now();

// Get raw Slack data
const event = $input.first().json.event || $input.first().json;
const text = event.text || '';
const channel = event.channel || '';
const thread_ts = event.thread_ts || event.ts || '';
const user_id = event.user || '';

// ═══════════════════════════════════════
// STEP 1: Clean Slack formatting
// ═══════════════════════════════════════
let cleaned = text;

// Remove @mentions like <@U123456>
cleaned = cleaned.replace(/<@[A-Z0-9]+>/g, '').trim();

// Clean mailto links: <mailto:test@example.com|test@example.com> → test@example.com
cleaned = cleaned.replace(/<mailto:([^|>]+)\|([^>]+)>/g, '$2');

// Clean URL links: <https://example.com|example.com> → example.com
cleaned = cleaned.replace(/<https?:\/\/[^|>]+\|([^>]+)>/g, '$1');

// Remove remaining angle brackets
cleaned = cleaned.replace(/[<>]/g, '').trim();

// ═══════════════════════════════════════
// STEP 2: Generate correlation_id
// ═══════════════════════════════════════
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const random = Math.random().toString(36).substring(2, 8);
const correlation_id = `corr_${timestamp}_${user_id}_${random}`;

// ═══════════════════════════════════════
// STEP 3: Extract time period from user text
// ═══════════════════════════════════════
let time_period = '30d';  // Default fallback
let time_period_days = 30; // For filtering

const lowerText = cleaned.toLowerCase();

// Pattern 1: "last X days/weeks/months"
const lastPattern = /last\s+(\d+)\s+(day|days|week|weeks|month|months)/i;
const lastMatch = lowerText.match(lastPattern);

if (lastMatch) {
  const count = parseInt(lastMatch[1], 10);
  const unit = lastMatch[2];

  if (unit.startsWith('day')) {
    time_period = `${count}d`;
    time_period_days = count;
  } else if (unit.startsWith('week')) {
    time_period = `${count * 7}d`;
    time_period_days = count * 7;
  } else if (unit.startsWith('month')) {
    time_period = `${count * 30}d`;
    time_period_days = count * 30;
  }

  console.log(`✅ Extracted time period: ${time_period} (${time_period_days} days)`);
}

// Pattern 2: "past X days/weeks/months" (same as "last")
const pastPattern = /past\s+(\d+)\s+(day|days|week|weeks|month|months)/i;
const pastMatch = lowerText.match(pastPattern);

if (!lastMatch && pastMatch) {
  const count = parseInt(pastMatch[1], 10);
  const unit = pastMatch[2];

  if (unit.startsWith('day')) {
    time_period = `${count}d`;
    time_period_days = count;
  } else if (unit.startsWith('week')) {
    time_period = `${count * 7}d`;
    time_period_days = count * 7;
  } else if (unit.startsWith('month')) {
    time_period = `${count * 30}d`;
    time_period_days = count * 30;
  }

  console.log(`✅ Extracted time period: ${time_period} (${time_period_days} days)`);
}

// Pattern 3: Common phrases
if (!lastMatch && !pastMatch) {
  if (lowerText.includes('today')) {
    time_period = '1d';
    time_period_days = 1;
    console.log('✅ Detected "today" → 1d');
  } else if (lowerText.includes('yesterday')) {
    time_period = '1d';
    time_period_days = 1;
    console.log('✅ Detected "yesterday" → 1d');
  } else if (lowerText.includes('this week')) {
    time_period = '7d';
    time_period_days = 7;
    console.log('✅ Detected "this week" → 7d');
  } else if (lowerText.includes('this month')) {
    time_period = '30d';
    time_period_days = 30;
    console.log('✅ Detected "this month" → 30d');
  } else {
    console.log('⚠️ No time period detected, using default: 30d');
  }
}

// ═══════════════════════════════════════
// STEP 4: Extract status filter
// ═══════════════════════════════════════
let status_filter = null; // null means "all statuses"

if (lowerText.includes('closed')) {
  status_filter = 'closed';
  console.log('✅ Detected status filter: closed');
} else if (lowerText.includes('open')) {
  status_filter = 'open';
  console.log('✅ Detected status filter: open');
} else if (lowerText.includes('pending')) {
  status_filter = 'pending';
  console.log('✅ Detected status filter: pending');
} else {
  console.log('⚠️ No status filter detected, will analyze all statuses');
}

// ═══════════════════════════════════════
// STEP 5: Calculate cutoff timestamp
// ═══════════════════════════════════════
const cutoff_timestamp = start_timestamp - (time_period_days * 24 * 60 * 60 * 1000);
const cutoff_date = new Date(cutoff_timestamp).toISOString();

console.log('───────────────────────────────────────');
console.log('📊 Parse Slack Output:');
console.log('  User text:', cleaned);
console.log('  Time period:', time_period, `(${time_period_days} days)`);
console.log('  Status filter:', status_filter || 'all');
console.log('  Cutoff date:', cutoff_date);
console.log('  Correlation ID:', correlation_id);
console.log('═══════════════════════════════════════');

// ═══════════════════════════════════════
// STEP 6: Return enhanced output
// ═══════════════════════════════════════
return [{
  json: {
    user_text: cleaned || text || '',
    channel,
    user_id,
    thread_ts,
    correlation_id,
    start_timestamp,

    // New fields for dynamic analytics
    time_period,           // "7d", "30d", etc.
    time_period_days,      // 7, 30, etc.
    status_filter,         // "closed", "open", null
    cutoff_timestamp,      // Unix timestamp for filtering
    cutoff_date            // ISO date string for filtering
  }
}];
