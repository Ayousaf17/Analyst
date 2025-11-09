// ============================================================================
// AUTOMATED PROMPT IMPROVEMENT SYSTEM
// ============================================================================
// Purpose: Analyze hybrid logs and generate improved Agent prompts
// How it works: Extracts failure patterns → Generates few-shot examples
// Run: Weekly via scheduled n8n workflow
// ============================================================================

const supabase = require('@supabase/supabase-js');

// ════════════════════════════════════════════════════════════════════════
// STEP 1: Fetch Training Data from Last 30 Days
// ════════════════════════════════════════════════════════════════════════

async function fetchTrainingData() {
  const { data, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('extra->>routing_strategy', 'hybrid')
    .eq('extra->>winning_path', 'v23')  // v23 won = Agent failed
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  console.log(`📊 Fetched ${data.length} failure cases`);
  return data;
}

// ════════════════════════════════════════════════════════════════════════
// STEP 2: Categorize Failures
// ════════════════════════════════════════════════════════════════════════

function categorizeFailures(sessions) {
  const categories = {
    parameter_mapping: [],
    temporal_parsing: [],
    missing_context: [],
    wrong_tool: [],
    other: []
  };

  for (const session of sessions) {
    const failureType = session.extra?.agent_failure_reason || 'other';
    const category = categories[failureType] || categories.other;
    
    category.push({
      input: session.raw_text,
      agent_output: session.extra?.agent_result?.parameters,
      correct_output: session.extra?.v23_result?.parameters,
      failure_reason: failureType
    });
  }

  console.log('📋 Failure Distribution:');
  for (const [category, items] of Object.entries(categories)) {
    console.log(`  ${category}: ${items.length}`);
  }

  return categories;
}

// ════════════════════════════════════════════════════════════════════════
// STEP 3: Extract Few-Shot Examples
// ════════════════════════════════════════════════════════════════════════

function extractFewShotExamples(categories) {
  const examples = {};

  // For each failure category, extract top 10 examples
  for (const [category, failures] of Object.entries(categories)) {
    if (failures.length === 0) continue;

    // Take diverse examples (avoid duplicates)
    const uniqueExamples = [];
    const seenInputs = new Set();

    for (const failure of failures) {
      const normalizedInput = failure.input.toLowerCase().trim();
      
      if (!seenInputs.has(normalizedInput) && uniqueExamples.length < 10) {
        uniqueExamples.push({
          input: failure.input,
          wrong: failure.agent_output,
          correct: failure.correct_output
        });
        seenInputs.add(normalizedInput);
      }
    }

    examples[category] = uniqueExamples;
  }

  return examples;
}

// ════════════════════════════════════════════════════════════════════════
// STEP 4: Generate Improved System Prompt
// ════════════════════════════════════════════════════════════════════════

function generateImprovedPrompt(fewShotExamples) {
  let prompt = `You are a Gorgias ticket assistant with natural language understanding.

Your job: Understand user requests and call the appropriate tools with correct parameters.

CRITICAL LESSONS LEARNED FROM PAST MISTAKES:

`;

  // ────────────────────────────────────────────────────────────────────
  // Add parameter_mapping examples
  // ────────────────────────────────────────────────────────────────────
  if (fewShotExamples.parameter_mapping?.length > 0) {
    prompt += `═══════════════════════════════════════════════════════════════════
1. PARAMETER MAPPING (MOST COMMON ERROR)
═══════════════════════════════════════════════════════════════════

When users mention names, ALWAYS map them to full email addresses.

Known Team Members:
- spencer → spencer@ironsidecomputers.com
- alex → alex@ironsidecomputers.com
- jamie → jamie@ironsidecomputers.com
- taylor → taylor@ironsidecomputers.com
- jordan → jordan@ironsidecomputers.com

Examples from past failures (DO NOT REPEAT THESE MISTAKES):

`;

    for (const example of fewShotExamples.parameter_mapping.slice(0, 5)) {
      prompt += `❌ WRONG:
Input: "${example.input}"
Your past mistake: ${JSON.stringify(example.wrong, null, 2)}

✅ CORRECT:
${JSON.stringify(example.correct, null, 2)}

`;
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Add temporal_parsing examples
  // ────────────────────────────────────────────────────────────────────
  if (fewShotExamples.temporal_parsing?.length > 0) {
    prompt += `═══════════════════════════════════════════════════════════════════
2. TEMPORAL PARSING (DATES AND TIME RANGES)
═══════════════════════════════════════════════════════════════════

When users mention time periods, parse them into date_from and date_to fields.

Today's date: ${new Date().toISOString().split('T')[0]}

Examples from past failures (DO NOT REPEAT THESE MISTAKES):

`;

    for (const example of fewShotExamples.temporal_parsing.slice(0, 5)) {
      prompt += `❌ WRONG:
Input: "${example.input}"
Your past mistake: ${JSON.stringify(example.wrong, null, 2)}

✅ CORRECT:
${JSON.stringify(example.correct, null, 2)}

`;
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Add missing_context examples
  // ────────────────────────────────────────────────────────────────────
  if (fewShotExamples.missing_context?.length > 0) {
    prompt += `═══════════════════════════════════════════════════════════════════
3. CONTEXT RESOLUTION (PRONOUNS AND REFERENCES)
═══════════════════════════════════════════════════════════════════

When users say "it", "that", "this ticket", use conversation memory.

You have access to conversation history - USE IT!

Examples from past failures (DO NOT REPEAT THESE MISTAKES):

`;

    for (const example of fewShotExamples.missing_context.slice(0, 5)) {
      prompt += `❌ WRONG:
Input: "${example.input}"
Your past mistake: ${JSON.stringify(example.wrong, null, 2)}
Problem: You didn't check conversation history for the ticket reference

✅ CORRECT:
${JSON.stringify(example.correct, null, 2)}
How: Look at previous messages to find the ticket ID being referenced

`;
    }
  }

  prompt += `═══════════════════════════════════════════════════════════════════
FINAL REMINDERS:
═══════════════════════════════════════════════════════════════════

1. ALWAYS map first names to full emails (spencer → spencer@ironsidecomputers.com)
2. ALWAYS parse temporal phrases into date_from/date_to (last week → actual dates)
3. ALWAYS check conversation memory for pronoun resolution (it → ticket ID)
4. NEVER leave parameters incomplete or in wrong format
5. NEVER use field names that don't exist (use assignee_email, not assignee)

You are learning from past mistakes. Do better this time!
`;

  return prompt;
}

// ════════════════════════════════════════════════════════════════════════
// STEP 5: Save Improved Prompt (with Version Control)
// ════════════════════════════════════════════════════════════════════════

async function saveImprovedPrompt(newPrompt) {
  const version = `v${Date.now()}`;
  
  // Save to database for version control
  await supabase
    .from('prompt_versions')
    .insert({
      version: version,
      prompt_text: newPrompt,
      created_at: new Date().toISOString(),
      based_on_failures_count: 100,
      status: 'pending_approval'
    });

  console.log(`✅ New prompt saved as version: ${version}`);
  console.log('📝 Prompt preview (first 500 chars):');
  console.log(newPrompt.substring(0, 500) + '...');
  
  return {
    version,
    prompt: newPrompt,
    approval_url: `https://your-dashboard.com/prompts/${version}/review`
  };
}

// ════════════════════════════════════════════════════════════════════════
// STEP 6: A/B Test New Prompt
// ════════════════════════════════════════════════════════════════════════

async function deployABTest(promptVersion) {
  // Deploy new prompt to 20% of traffic
  const abTestConfig = {
    version: promptVersion,
    traffic_percentage: 20,  // Start with 20%
    duration_hours: 168,     // Run for 1 week
    success_threshold: 0.10, // Need 10% improvement to keep
    rollback_on_regression: true
  };

  await supabase
    .from('ab_tests')
    .insert({
      test_id: `ab_${Date.now()}`,
      prompt_version: promptVersion,
      config: abTestConfig,
      started_at: new Date().toISOString(),
      status: 'active'
    });

  console.log('🧪 A/B test deployed!');
  console.log(`  New prompt: ${traffic_percentage}% of traffic`);
  console.log(`  Old prompt: ${100 - traffic_percentage}% of traffic`);
  console.log(`  Duration: ${duration_hours} hours`);
  
  return abTestConfig;
}

// ════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ════════════════════════════════════════════════════════════════════════

async function improveAgentPrompt() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎓 Automated Prompt Improvement System - Starting');
  console.log('═══════════════════════════════════════════════════════════');

  // Step 1: Fetch failures
  const sessions = await fetchTrainingData();

  // Step 2: Categorize
  const categories = categorizeFailures(sessions);

  // Step 3: Extract examples
  const fewShotExamples = extractFewShotExamples(categories);

  // Step 4: Generate new prompt
  const improvedPrompt = generateImprovedPrompt(fewShotExamples);

  // Step 5: Save with version control
  const { version } = await saveImprovedPrompt(improvedPrompt);

  // Step 6: Deploy A/B test
  await deployABTest(version);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Prompt improvement complete!');
  console.log(`  Version: ${version}`);
  console.log('  Status: A/B testing (20% traffic)');
  console.log('  Monitor: https://your-dashboard.com/ab-tests');
  console.log('═══════════════════════════════════════════════════════════');

  return {
    success: true,
    version,
    examples_used: Object.values(fewShotExamples).flat().length,
    ab_test_active: true
  };
}

// Run weekly via n8n schedule trigger
module.exports = { improveAgentPrompt };
