// FIXED: search node JSON body
// Copy this into the "JSON Body" field of the search node

={{ {
  type: "ticket",
  query: $json.query || "",
  limit: $json.limit || 30,
  order_by: "-created_datetime"
} }}
