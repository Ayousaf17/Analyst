-- ============================================================================
-- TRAINING DASHBOARD QUERIES
-- ============================================================================
-- Purpose: Monitor AI Agent improvement over time
-- Use: Visualize in Grafana, Metabase, or custom dashboard
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────
-- CHART 1: Agent Win Rate Over Time (Weekly Trend)
-- ────────────────────────────────────────────────────────────────────────
-- Shows if training is working

SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_hybrid_runs,
  SUM(CASE WHEN extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) as agent_wins,
  ROUND(
    SUM(CASE WHEN extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    1
  ) as agent_win_rate_pct
FROM agent_sessions
WHERE extra->>'routing_strategy' = 'hybrid'
  AND created_at > NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week;

/*
Visualization: Line chart
X-axis: week
Y-axis: agent_win_rate_pct
Goal: See upward trend (agent improving over time)

Expected pattern:
Week 1:  35% ─────────
Week 2:  38% ─────────────
Week 3:  42% ───────────────
Week 4:  48% ─────────────────── ✅ Training working!
Week 5:  51% ───────────────────────
*/

-- ────────────────────────────────────────────────────────────────────────
-- CHART 2: Failure Category Breakdown (Current Week)
-- ────────────────────────────────────────────────────────────────────────
-- Shows what to focus on next

SELECT 
  extra->>'agent_failure_reason' as failure_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM agent_sessions
WHERE extra->>'routing_strategy' = 'hybrid'
  AND extra->>'winning_path' = 'v23'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY extra->>'agent_failure_reason'
ORDER BY count DESC;

/*
Visualization: Pie chart or bar chart

Current week:
parameter_mapping:  45 (56%)  ← Focus here!
temporal_parsing:   18 (22%)
missing_context:    12 (15%)
wrong_tool:          5 (6%)

After training parameter_mapping:
temporal_parsing:   25 (48%)  ← New focus!
parameter_mapping:  15 (29%)  ← Improved!
missing_context:    10 (19%)
wrong_tool:          2 (4%)
*/

-- ────────────────────────────────────────────────────────────────────────
-- CHART 3: Training Impact (Before/After Comparison)
-- ────────────────────────────────────────────────────────────────────────
-- Shows improvement after deploying new prompt

WITH prompt_deployments AS (
  -- Track when new prompts were deployed
  SELECT 
    version,
    created_at as deployed_at
  FROM prompt_versions
  WHERE status = 'deployed'
  ORDER BY created_at DESC
  LIMIT 1
),
performance_comparison AS (
  SELECT 
    CASE 
      WHEN s.created_at < pd.deployed_at THEN 'before'
      ELSE 'after'
    END as period,
    COUNT(*) as requests,
    SUM(CASE WHEN s.extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) as agent_wins,
    ROUND(
      SUM(CASE WHEN s.extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
      1
    ) as win_rate
  FROM agent_sessions s
  CROSS JOIN prompt_deployments pd
  WHERE s.extra->>'routing_strategy' = 'hybrid'
    AND s.created_at > pd.deployed_at - INTERVAL '7 days'
    AND s.created_at < pd.deployed_at + INTERVAL '7 days'
  GROUP BY period
)
SELECT 
  period,
  requests,
  agent_wins,
  win_rate || '%' as win_rate,
  ROUND(
    win_rate - LAG(win_rate) OVER (ORDER BY period),
    1
  ) as improvement
FROM performance_comparison
ORDER BY period;

/*
Visualization: Bar chart comparison

Result:
period | requests | agent_wins | win_rate | improvement
-------+----------+------------+----------+-------------
before |      245 |         87 |   35.5%  |        NULL
after  |      238 |        114 |   47.9%  |     +12.4%  ✅

Conclusion: New prompt improved Agent win rate by 12.4%!
*/

-- ────────────────────────────────────────────────────────────────────────
-- CHART 4: Per-Category Improvement Tracking
-- ────────────────────────────────────────────────────────────────────────
-- Shows which specific issues training solved

WITH recent_deployment AS (
  SELECT created_at as deployed_at
  FROM prompt_versions
  WHERE status = 'deployed'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  extra->>'agent_failure_reason' as category,
  COUNT(CASE WHEN s.created_at < rd.deployed_at THEN 1 END) as before_count,
  COUNT(CASE WHEN s.created_at >= rd.deployed_at THEN 1 END) as after_count,
  ROUND(
    (COUNT(CASE WHEN s.created_at < rd.deployed_at THEN 1 END) -
     COUNT(CASE WHEN s.created_at >= rd.deployed_at THEN 1 END)) * 100.0 /
    NULLIF(COUNT(CASE WHEN s.created_at < rd.deployed_at THEN 1 END), 0),
    1
  ) as reduction_pct
FROM agent_sessions s
CROSS JOIN recent_deployment rd
WHERE s.extra->>'routing_strategy' = 'hybrid'
  AND s.extra->>'winning_path' = 'v23'
  AND s.created_at > rd.deployed_at - INTERVAL '7 days'
  AND s.created_at < rd.deployed_at + INTERVAL '7 days'
GROUP BY extra->>'agent_failure_reason'
ORDER BY before_count DESC;

/*
Visualization: Horizontal bar chart (before/after)

Result:
category              | before | after | reduction
----------------------+--------+-------+-----------
parameter_mapping     |     45 |    12 |     -73%  ✅ HUGE WIN!
temporal_parsing      |     18 |    15 |     -17%  ⚠️ Minor improvement
missing_context       |     12 |    10 |     -17%  ⚠️ Minor improvement
wrong_tool            |      5 |     3 |     -40%  ✅ Good

Insight: Training fixed parameter_mapping (73% reduction!)
Next: Focus on temporal_parsing (only 17% reduction)
*/

-- ────────────────────────────────────────────────────────────────────────
-- CHART 5: Learning Velocity (How Fast is Agent Improving?)
-- ────────────────────────────────────────────────────────────────────────
-- Shows rate of improvement over time

WITH weekly_stats AS (
  SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as total,
    SUM(CASE WHEN extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) as wins,
    ROUND(
      SUM(CASE WHEN extra->>'winning_path' = 'agent' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
      1
    ) as win_rate
  FROM agent_sessions
  WHERE extra->>'routing_strategy' = 'hybrid'
    AND created_at > NOW() - INTERVAL '12 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT 
  week,
  win_rate,
  win_rate - LAG(win_rate) OVER (ORDER BY week) as week_over_week_change,
  win_rate - FIRST_VALUE(win_rate) OVER (ORDER BY week) as total_improvement
FROM weekly_stats
ORDER BY week;

/*
Visualization: Line chart with two lines
Line 1: win_rate (absolute)
Line 2: total_improvement (cumulative)

Result:
week       | win_rate | week_change | total_improvement
-----------+----------+-------------+-------------------
2024-11-04 |    35.5% |        NULL |              0.0%
2024-11-11 |    38.2% |       +2.7% |             +2.7%
2024-11-18 |    41.8% |       +3.6% |             +6.3%
2024-11-25 |    43.1% |       +1.3% |             +7.6%  ← Slowing down
2024-12-02 |    47.9% |       +4.8% |            +12.4%  ← Training kicked in!
2024-12-09 |    51.2% |       +3.3% |            +15.7%

Insight: Learning velocity increased after Week 5 training
Action: Continue training cycle to maintain momentum
*/

-- ────────────────────────────────────────────────────────────────────────
-- TABLE 1: Recent Wins (Agent Beating v23)
-- ────────────────────────────────────────────────────────────────────────
-- Shows specific queries where Agent is now winning

SELECT 
  raw_text,
  extra->'agent_result'->'parameters' as agent_params,
  extra->>'agent_score' as agent_score,
  extra->>'v23_score' as v23_score,
  ROUND(
    (extra->>'agent_score')::float - (extra->>'v23_score')::float,
    1
  ) as margin_of_victory,
  created_at
FROM agent_sessions
WHERE extra->>'routing_strategy' = 'hybrid'
  AND extra->>'winning_path' = 'agent'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY margin_of_victory DESC
LIMIT 10;

/*
Shows Agent's recent victories

Result:
raw_text                    | agent_score | v23_score | margin
----------------------------+-------------+-----------+--------
"spencer's urgent stuff"    |          95 |        45 |   +50  🎉
"close it"                  |          88 |        32 |   +56  🎉
"what's going on?"          |          92 |        40 |   +52  🎉

These are Agent's STRENGTHS now!
*/

-- ────────────────────────────────────────────────────────────────────────
-- TABLE 2: Remaining Challenges (Agent Still Losing)
-- ────────────────────────────────────────────────────────────────────────
-- Shows where Agent needs more training

SELECT 
  raw_text,
  extra->>'agent_failure_reason' as why_failed,
  extra->'agent_result'->'parameters' as agent_attempt,
  extra->'v23_result'->'parameters' as correct_params,
  created_at
FROM agent_sessions
WHERE extra->>'routing_strategy' = 'hybrid'
  AND extra->>'winning_path' = 'v23'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

/*
Shows Agent's current weaknesses

Result:
raw_text                    | why_failed        | agent_attempt
----------------------------+-------------------+------------------
"last month's billing"      | temporal_parsing  | {"query": "last..."}
"show me yesterday's"       | temporal_parsing  | {"query": "yest..."}

Pattern: Still struggling with temporal parsing
Action: Next training cycle should focus on date parsing
*/
