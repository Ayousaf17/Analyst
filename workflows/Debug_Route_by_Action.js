// ADD THIS CODE TO A NEW CODE NODE BEFORE "Route by Action"
// This will help diagnose what's happening

const input = $json;

console.log('🔍 DEBUG: Input to Route by Action');
console.log('Full input:', JSON.stringify(input, null, 2));
console.log('Action value:', input.action);
console.log('Action type:', typeof input.action);
console.log('Plan structure:', input.plan);

// Check if action exists
if (!input.action) {
  console.error('❌ ERROR: No "action" field found in input!');
  console.log('Available fields:', Object.keys(input));
}

// Check if action is in plan array
if (input.plan && input.plan.length > 0) {
  console.log('✅ Plan exists:', input.plan[0]);
  console.log('Action in plan:', input.plan[0].action);
}

// Pass through unchanged
return [{ json: input }];
