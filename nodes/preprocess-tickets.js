/**
 * Preprocess Tickets Node
 *
 * Purpose: Reduce token usage for AI analytics by extracting only essential ticket fields
 *
 * Why this exists:
 * - Full Gorgias ticket objects can be 2000-5000 tokens each
 * - Analyzing 1000 tickets would cost 2M+ tokens (~$15-30 per query)
 * - This preprocessing reduces each ticket to ~200-300 tokens
 * - Saves ~90% of token costs for analytics queries
 *
 * Input: HTTP Response from Gorgias API
 * Output: Lightweight ticket objects + summary stats
 *
 * Metrics Calculated:
 * - Resolution time (time from creation to closure)
 * - First Response Time (FRT) - time to first agent response
 * - Spam detection and percentage
 * - Unassigned ticket tracking with age calculation
 * - Status and channel breakdowns
 *
 * Token Savings Example:
 * - Before: 1000 tickets × 2500 tokens = 2,500,000 tokens
 * - After:  1000 tickets × 250 tokens  = 250,000 tokens
 * - Savings: ~$20 per analytics query at Claude Sonnet 4.5 rates
 */

// Preprocess ticket data to reduce token usage
const inputData = $input.first().json;
const tickets = inputData.body?.data || [];

// Extract only essential fields and truncate long content
const processedTickets = tickets.map(ticket => {
  // Get first customer message (truncated to prevent token explosion)
  const firstMessage = ticket.messages?.[0]?.body_text || 'No message';
  const truncatedMessage = firstMessage.length > 300
    ? firstMessage.substring(0, 300) + '...'
    : firstMessage;

  // Calculate resolution time if closed (for performance metrics)
  let resolutionMinutes = null;
  if (ticket.closed_datetime && ticket.created_datetime) {
    const created = new Date(ticket.created_datetime);
    const closed = new Date(ticket.closed_datetime);
    resolutionMinutes = Math.round((closed - created) / 60000);
  }

  // Calculate First Response Time (FRT) - time to first agent response
  let firstResponseMinutes = null;
  if (ticket.messages && Array.isArray(ticket.messages) && ticket.messages.length > 0) {
    // Find first message from an agent
    const firstAgentMessage = ticket.messages.find(msg => msg.from_agent === true);
    if (firstAgentMessage && firstAgentMessage.created_datetime && ticket.created_datetime) {
      const created = new Date(ticket.created_datetime);
      const responded = new Date(firstAgentMessage.created_datetime);
      firstResponseMinutes = Math.round((responded - created) / 60000);
    }
  }

  // Calculate unassigned age for currently unassigned tickets
  const isUnassigned = !ticket.assignee_user || !ticket.assignee_user.email;
  let unassignedAgeHours = null;
  if (isUnassigned && ticket.created_datetime) {
    const created = new Date(ticket.created_datetime);
    const now = new Date();
    unassignedAgeHours = Math.round((now - created) / 3600000); // Convert to hours
  }

  // Return only essential fields (reduces from ~2500 to ~250 tokens per ticket)
  return {
    id: ticket.id,
    subject: ticket.subject || 'No subject',
    status: ticket.status,
    channel: ticket.channel,
    created_at: ticket.created_datetime,
    closed_at: ticket.closed_datetime,
    resolution_minutes: resolutionMinutes,
    first_response_minutes: firstResponseMinutes,
    tags: ticket.tags || [],
    assignee: ticket.assignee_user?.email || 'unassigned',
    first_message: truncatedMessage,
    message_count: ticket.messages?.length || 0,
    spam: ticket.spam || false,
    unassigned_age_hours: unassignedAgeHours
  };
});

// Create summary stats for the AI prompt (context awareness)
const summary = {
  total_tickets: processedTickets.length,
  period: inputData.body?.meta?.filtered_by_date || 'unknown',
  status_filter: inputData.body?.meta?.filtered_by_status || 'all',
  cutoff_date: inputData.body?.meta?.cutoff_date || 'unknown'
};

// Pre-calculate basic stats to help the AI (saves additional processing tokens)
const stats = {
  // Status breakdown (e.g., {open: 50, closed: 950})
  by_status: processedTickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {}),

  // Channel breakdown (e.g., {email: 600, chat: 300, facebook: 100})
  by_channel: processedTickets.reduce((acc, t) => {
    acc[t.channel] = (acc[t.channel] || 0) + 1;
    return acc;
  }, {}),

  // Average resolution time in minutes
  avg_resolution_min: processedTickets
    .filter(t => t.resolution_minutes !== null)
    .reduce((sum, t, _, arr) => {
      return arr.length > 0 ? sum + t.resolution_minutes / arr.length : 0;
    }, 0),

  // SPAM METRICS
  spam: {
    count: processedTickets.filter(t => t.spam === true).length,
    percentage: processedTickets.length > 0
      ? Math.round((processedTickets.filter(t => t.spam === true).length / processedTickets.length) * 100)
      : 0
  },

  // UNASSIGNED METRICS
  unassigned: {
    count: processedTickets.filter(t => t.assignee === 'unassigned').length,
    avg_age_hours: (() => {
      const unassignedTickets = processedTickets.filter(t => t.unassigned_age_hours !== null);
      if (unassignedTickets.length === 0) return 0;
      const totalHours = unassignedTickets.reduce((sum, t) => sum + t.unassigned_age_hours, 0);
      return Math.round(totalHours / unassignedTickets.length);
    })(),
    oldest_hours: (() => {
      const ages = processedTickets
        .filter(t => t.unassigned_age_hours !== null)
        .map(t => t.unassigned_age_hours);
      return ages.length > 0 ? Math.max(...ages) : 0;
    })()
  },

  // FIRST RESPONSE TIME (FRT) METRICS
  first_response_time: {
    avg_minutes: (() => {
      const withFRT = processedTickets.filter(t => t.first_response_minutes !== null);
      if (withFRT.length === 0) return 0;
      const total = withFRT.reduce((sum, t) => sum + t.first_response_minutes, 0);
      return Math.round(total / withFRT.length);
    })(),
    median_minutes: (() => {
      const times = processedTickets
        .filter(t => t.first_response_minutes !== null)
        .map(t => t.first_response_minutes)
        .sort((a, b) => a - b);
      if (times.length === 0) return 0;
      const mid = Math.floor(times.length / 2);
      return times.length % 2 === 0 ? Math.round((times[mid - 1] + times[mid]) / 2) : times[mid];
    })(),
    count_measured: processedTickets.filter(t => t.first_response_minutes !== null).length,
    count_no_response: processedTickets.filter(t =>
      t.first_response_minutes === null && t.message_count > 0
    ).length
  }
};

// Return preprocessed data (ready for AI consumption)
return {
  json: {
    summary,
    tickets: processedTickets,
    stats
  }
};
