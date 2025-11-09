-- ============================================================================
-- TRAINING DATA EXTRACTION QUERIES
-- ============================================================================
-- Purpose: Analyze hybrid path logs to find patterns in Agent failures
-- Use: Run these queries weekly to identify improvement opportunities
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- QUERY 1: Agent Failure Categories (Last 7 Days)
-- ────────────────────────────────────────────────────────────────────────
-- Shows what types of mistakes the Agent path makes most often

SELECT 
  extra->>'agent_failure_reason' as failure_category,
  COUNT(*) as failure_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as failure_percentage,
  ARRAY_AGG(DISTINCT raw_text ORDER BY raw_text LIMIT 5) as example_queries
FROM agent_sessions
WHERE extra->>'routing_strategy' = 'hybrid'
  AND extra->>'winning_path' = 'v23'  -- v23 won means Agent failed
  AND extra ? 'agent_failure_reason'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY extra->>'agent_failure_reason'
ORDER BY failure_count DESC;

/*
Example Output:

failure_category      | failure_count | failure_percentage | example_queries
----------------------+---------------+--------------------+--------------------------------
parameter_mapping     |            45 |               56.3 | {"spencer's stuff",
                      |               |                    |  "alex's urgent tickets",
                      |               |                    |  "show me jamie's queue"}
temporal_parsing      |            18 |               22.5 | {"tickets from last week",
                      |               |                    |  "show me yesterday's issues",
                      |               |                    |  "urgent from this month"}
missing_context       |            12 |               15.0 | {"close it", "assign to alex",
                      |               |                    |  "show that ticket"}
wrong_tool_selection  |             5 |                6.2 | {"get all tickets",
                      |               |                    |  "find everything"}

INTERPRETATION:
- 56% of Agent failures = name → email mapping issues
- 22% = temporal parsing (dates/time ranges)
- 15% = missing conversation context
- 6% = picked wrong tool

ACTION: Focus on improving parameter_mapping first (biggest impact)
*/

-- ────────────────────────────────────────────────────────────────────────
-- QUERY 2: Specific Parameter Mapping Failures
-- ────────────────────────────────────────────────────────────────────────
-- Drill down into parameter mapping errors

SELECT 
  raw_text as user_query,
  extra->'agent_result'->'parameters' as agent_params,
  extra->'v23_result'->'parameters' as v23_params,
  created_at
FROM agent_sessions
WHERE extra->>'agent_failure_reason' = 'parameter_mapping'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

/*
Example Output:

user_query                          | agent_params                     | v23_params
------------------------------------+----------------------------------+-------------------------------------
"spencer's urgent stuff"            | {"assignee_email": "spencer"}    | {"assignee_email": "spencer@..."}
"show alex's tickets"               | {"assignee": "alex"}             | {"assignee_email": "alex@..."}
"jamie's billing issues"            | {"assignee_email": "jamie",      | {"assignee_email": "jamie@...",
                                    |  "query": "billing"}             |  "tags": "billing"}

PATTERN DETECTED:
- Agent consistently fails to map first names to full emails
- Agent sometimes uses wrong field name ("assignee" vs "assignee_email")
- Agent puts tags in "query" field instead of "tags" field

TRAINING OPPORTUNITY:
Update Agent's system prompt with explicit name → email mapping examples
*/

-- ────────────────────────────────────────────────────────────────────────
-- QUERY 3: V23 vs Agent Parameter Comparison (Side by Side)
-- ────────────────────────────────────────────────────────────────────────
-- Shows exactly what v23 did right that Agent did wrong

WITH hybrid_sessions AS (
  SELECT 
    correlation_id,
    raw_text,
    extra->'agent_result'->'parameters' as agent_params,
    extra->'v23_result'->'parameters' as v23_params,
    created_at
  FROM agent_sessions
  WHERE extra->>'routing_strategy' = 'hybrid'
    AND extra->>'winning_path' = 'v23'
    AND created_at > NOW() - INTERVAL '7 days'
)
SELECT 
  raw_text,
  
  -- Extract specific parameter comparisons
  agent_params->>'assignee_email' as agent_assignee,
  v23_params->>'assignee_email' as v23_assignee,
  
  agent_params->>'priority' as agent_priority,
  v23_params->>'priority' as v23_priority,
  
  agent_params->>'date_from' as agent_date_from,
  v23_params->>'date_from' as v23_date_from,
  
  agent_params->>'tags' as agent_tags,
  v23_params->>'tags' as v23_tags,
  
  created_at
FROM hybrid_sessions
ORDER BY created_at DESC
LIMIT 20;

/*
Example Output:

raw_text                    | agent_assignee | v23_assignee        | agent_date_from | v23_date_from
----------------------------+----------------+---------------------+-----------------+---------------
"spencer's urgent from      | "spencer"      | "spencer@ironsid... | NULL            | "2025-01-08"
 last week"                 |                |                     |                 |
"show alex's billing"       | "alex"         | "alex@ironsid..."   | NULL            | NULL
"jamie's tickets today"     | "jamie"        | "jamie@ironsid..."  | "today"         | "2025-01-15"

INSIGHT:
- Agent NEVER completes email addresses (0/20)
- Agent SOMETIMES parses dates, but inconsistently
- v23 ALWAYS gets emails right (20/20)
- v23 ALWAYS parses dates correctly (20/20)

TRAINING DATA EXTRACTED:
These 20 examples become training examples for Agent prompt improvement
*/

-- ────────────────────────────────────────────────────────────────────────
-- QUERY 4: Temporal Parsing Failures (Date/Time Issues)
-- ────────────────────────────────────────────────────────────────────────
-- Find queries where Agent failed to parse temporal phrases

SELECT 
  raw_text,
  extra->'agent_result'->'parameters'->>'date_from' as agent_date_from,
  extra->'agent_result'->'parameters'->>'date_to' as agent_date_to,
  extra->'v23_result'->'parameters'->>'date_from' as v23_date_from,
  extra->'v23_result'->'parameters'->>'date_to' as v23_date_to,
  created_at
FROM agent_sessions
WHERE extra->>'agent_failure_reason' = 'temporal_parsing'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

/*
Example Output:

raw_text                    | agent_date_from | v23_date_from | agent_date_to | v23_date_to
----------------------------+-----------------+---------------+---------------+-------------
"last week's tickets"       | NULL            | "2025-01-08"  | NULL          | "2025-01-15"
"show me yesterday"         | "yesterday"     | "2025-01-14"  | "yesterday"   | "2025-01-15"
"this month's urgent"       | NULL            | "2025-01-01"  | NULL          | "2025-01-31"

TRAINING EXAMPLES EXTRACTED:
- "last week" → date_from: "2025-01-08", date_to: "2025-01-15"
- "yesterday" → date_from: "2025-01-14", date_to: "2025-01-15"
- "this month" → date_from: "2025-01-01", date_to: "2025-01-31"
*/

-- ────────────────────────────────────────────────────────────────────────
-- QUERY 5: Success Cases (Where Agent Actually Won)
-- ────────────────────────────────────────────────────────────────────────
-- Learn from Agent's successes too!

SELECT 
  raw_text,
  extra->'agent_result'->'parameters' as agent_params,
  extra->'v23_result'->'parameters' as v23_params,
  extra->>'agent_score' as agent_score,
  extra->>'v23_score' as v23_score,
  created_at
FROM agent_sessions
WHERE extra->>'routing_strategy' = 'hybrid'
  AND extra->>'winning_path' = 'agent'  -- Agent won!
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

/*
Example Output:

raw_text                    | agent_params                     | agent_score | v23_score
----------------------------+----------------------------------+-------------+-----------
"close it"                  | {"ticket_id": "12345"}           |         85  |        40
"what's going on with       | {"query": "billing delays",      |         90  |        50
 billing delays?"           |  "tags": "billing"}              |             |

INSIGHT:
Agent wins when:
- Query needs context resolution ("it" → ticket from memory)
- Query is open-ended ("what's going on...")
- Natural language query without explicit parameters

These are Agent's STRENGTHS - don't change these!
*/

-- ────────────────────────────────────────────────────────────────────────
-- QUERY 6: Extract Training Dataset (For Prompt Engineering)
-- ────────────────────────────────────────────────────────────────────────
-- Create a training dataset for updating Agent prompts

SELECT 
  raw_text as input,
  extra->'v23_result'->'parameters' as correct_output,
  extra->'agent_result'->'parameters' as agent_attempt,
  extra->>'agent_failure_reason' as failure_type,
  
  -- Calculate how "wrong" the agent was
  CASE 
    WHEN extra->>'agent_failure_reason' = 'parameter_mapping' THEN 'high_priority'
    WHEN extra->>'agent_failure_reason' = 'temporal_parsing' THEN 'medium_priority'
    ELSE 'low_priority'
  END as training_priority,
  
  created_at
FROM agent_sessions
WHERE extra->>'routing_strategy' = 'hybrid'
  AND extra->>'winning_path' = 'v23'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY 
  CASE 
    WHEN extra->>'agent_failure_reason' = 'parameter_mapping' THEN 1
    WHEN extra->>'agent_failure_reason' = 'temporal_parsing' THEN 2
    ELSE 3
  END,
  created_at DESC
LIMIT 100;

/*
This becomes your TRAINING DATASET for prompt improvements

Format for prompt engineering:

Input: "spencer's urgent stuff"
Correct: {"assignee_email": "spencer@ironsidecomputers.com", "priority": "urgent"}
Agent Got: {"assignee_email": "spencer", "priority": "urgent"}
Lesson: Always map first names to full email addresses

Input: "last week's tickets"
Correct: {"date_from": "2025-01-08", "date_to": "2025-01-15"}
Agent Got: {"query": "last week"}
Lesson: Parse temporal phrases into date_from/date_to fields
*/

-- ────────────────────────────────────────────────────────────────────────
-- QUERY 7: Training Impact Measurement (Before/After)
-- ────────────────────────────────────────────────────────────────────────
-- After updating prompts, measure if Agent improved

WITH weekly_performance AS (
  SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as total_hybrid_requests,
    SUM(CASE WHEN extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) as agent_wins,
    SUM(CASE WHEN extra->>'winning_path' = 'v23' THEN 1 ELSE 0 END) as v23_wins,
    ROUND(
      SUM(CASE WHEN extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
      1
    ) as agent_win_rate
  FROM agent_sessions
  WHERE extra->>'routing_strategy' = 'hybrid'
    AND created_at > NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT 
  week,
  total_hybrid_requests,
  agent_wins,
  v23_wins,
  agent_win_rate || '%' as agent_win_rate,
  LAG(agent_win_rate) OVER (ORDER BY week) as previous_week_rate,
  ROUND(agent_win_rate - LAG(agent_win_rate) OVER (ORDER BY week), 1) as improvement
FROM weekly_performance
ORDER BY week DESC;

/*
Example Output:

week       | total | agent_wins | v23_wins | agent_win_rate | previous_week | improvement
-----------+-------+------------+----------+----------------+---------------+-------------
2025-01-13 |   120 |         68 |       52 |          56.7% |         42.3% |      +14.4%  ← Improved!
2025-01-06 |   115 |         48 |       67 |          42.3% |         38.1% |       +4.2%
2024-12-30 |   108 |         41 |       67 |          38.1% |         35.2% |       +2.9%

INTERPRETATION:
After updating Agent prompts on 2025-01-09:
- Agent win rate jumped from 42.3% → 56.7% (+14.4%)
- Training worked! Agent is now competitive with v23

DECISION:
- Continue monitoring
- Consider routing more traffic to Agent path
- Potentially phase out hybrid (use Agent-only for these query types)
*/
