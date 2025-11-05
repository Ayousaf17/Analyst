// ADD THIS CODE NODE AFTER "Handle Plan Response"
// This will show us exactly what Handle Plan Response is outputting

const output = $json;

console.log('🔍 DEBUG: Handle Plan Response Output');
console.log('='.repeat(60));
console.log('Full output:', JSON.stringify(output, null, 2));
console.log('='.repeat(60));

// Check for plan structure
if (output.plan) {
  console.log('✅ Has plan array:', output.plan);
  if (output.plan.length > 0) {
    console.log('✅ Plan item 0:', output.plan[0]);
    console.log('   - action:', output.plan[0].action);
    console.log('   - question:', output.plan[0].question);
  }
} else {
  console.log('❌ No plan array found!');
}

// Check for flattened structure
if (output.action) {
  console.log('✅ Has action (flattened):', output.action);
}

if (output.question) {
  console.log('✅ Has question:', output.question);
} else {
  console.log('❌ No question field found!');
}

// Check for channel/thread info
console.log('📍 Channel fields:');
console.log('   - channel:', output.channel);
console.log('   - slack_channel:', output.slack_channel);
console.log('   - thread_ts:', output.thread_ts);
console.log('   - slack_thread_ts:', output.slack_thread_ts);

// Pass through unchanged
return [{ json: output }];
