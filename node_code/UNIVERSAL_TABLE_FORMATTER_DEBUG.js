// ============================================
// Universal Table Formatter - DEBUG VERSION
// ============================================
// Add this TEMPORARILY to see what data structure you're receiving
// ============================================

const inputData = $input.first().json;

console.log('═══════════════════════════════════════');
console.log('🔍 Universal Table Formatter - Input Debug');
console.log('═══════════════════════════════════════');
console.log('Full Input:', JSON.stringify(inputData, null, 2));
console.log('───────────────────────────────────────');
console.log('Input Keys:', Object.keys(inputData));
console.log('Action:', inputData.action);
console.log('Results:', inputData.results);
console.log('Results Length:', inputData.results?.length);
if (inputData.results && inputData.results.length > 0) {
  console.log('First Result:', JSON.stringify(inputData.results[0], null, 2));
  console.log('First Result Keys:', Object.keys(inputData.results[0]));
}
console.log('═══════════════════════════════════════');

// Return the input unchanged so workflow continues
return [$input.first()];
