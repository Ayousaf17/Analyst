// Deduplicate Results
// Removes duplicate tickets from multi-step operations
// Position: Between "Collect Results" and "Conversational Response AI"

// Get results from input
const results = $json.results || [];

// If no results or not an array, return empty with stats
if (!Array.isArray(results) || results.length === 0) {
  console.log('📊 No results to deduplicate');
  return [{
    json: {
      ...$json,
      results: [],
      original_count: 0,
      deduplicated_count: 0,
      duplicates_removed: 0
    }
  }];
}

console.log(`📊 Original result count: ${results.length}`);

// Deduplicate by ticket ID, keeping the most recent version
const uniqueTickets = {};

results.forEach(result => {
  // Handle different result structures
  // Results can be: direct ticket objects, or nested in .ticket or .data
  const ticketId = result.id || result.ticket?.id || result.data?.id;

  if (!ticketId) {
    // If no ID found, it might be an error or special result
    // Keep it with a random key to avoid losing data
    const randomKey = `no_id_${Math.random()}`;
    uniqueTickets[randomKey] = result;
    console.log('⚠️ Found result with no ticket ID, preserving it');
    return;
  }

  if (!uniqueTickets[ticketId]) {
    // First occurrence of this ticket ID
    uniqueTickets[ticketId] = result;
  } else {
    // Duplicate found - keep the one with newer updated_at timestamp
    const existingDate = new Date(
      uniqueTickets[ticketId].updated_at ||
      uniqueTickets[ticketId].ticket?.updated_at ||
      0
    );

    const newDate = new Date(
      result.updated_at ||
      result.ticket?.updated_at ||
      0
    );

    if (newDate > existingDate) {
      // Replace with newer version
      uniqueTickets[ticketId] = result;
      console.log(`🔄 Replaced ticket ${ticketId} with newer version`);
    } else {
      console.log(`🗑️ Removed duplicate ticket ${ticketId} (older version)`);
    }
  }
});

// Convert back to array
const deduped = Object.values(uniqueTickets);

const stats = {
  original_count: results.length,
  deduplicated_count: deduped.length,
  duplicates_removed: results.length - deduped.length
};

console.log(`✅ Deduplication complete:`, stats);
console.log(`   - Original: ${stats.original_count}`);
console.log(`   - After dedup: ${stats.deduplicated_count}`);
console.log(`   - Removed: ${stats.duplicates_removed}`);

// Return deduplicated results with stats
return [{
  json: {
    ...$json,
    results: deduped,
    ...stats
  }
}];
