// WORKING: search node JSON body
// URL: https://ironsidecomputers.gorgias.com/api/tickets/search
// Method: POST
// Copy this into the "JSON Body" field of the search node

={{ {
  search: $json.query || "",
  filters: ""
} }}

// Key points:
// - Use "search" field (not "query")
// - filters must be a string (not object)
// - limit and order_by are NOT supported by this endpoint
