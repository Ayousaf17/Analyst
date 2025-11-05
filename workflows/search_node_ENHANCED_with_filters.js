// ENHANCED: search node with multi-criteria filtering
// URL: https://ironsidecomputers.gorgias.com/api/tickets/search
// Method: POST
// Copy this into the "JSON Body" field of the search node

={{ {
  search: $json.query || "",
  filters: Object.keys({
    ...(($json.status && $json.status !== '') ? { status: $json.status } : {}),
    ...(($json.priority && $json.priority !== '') ? { priority: $json.priority } : {}),
    ...(($json.customer_email && $json.customer_email !== '') ? { customer: { email: $json.customer_email } } : {}),
    ...(($json.assignee_email && $json.assignee_email !== '') ? { assignee_user: { email: $json.assignee_email } } : {}),
    ...(($json.tags && $json.tags !== '') ? { tags: { name: $json.tags } } : {})
  }).length > 0 ? {
    ...(($json.status && $json.status !== '') ? { status: $json.status } : {}),
    ...(($json.priority && $json.priority !== '') ? { priority: $json.priority } : {}),
    ...(($json.customer_email && $json.customer_email !== '') ? { customer: { email: $json.customer_email } } : {}),
    ...(($json.assignee_email && $json.assignee_email !== '') ? { assignee_user: { email: $json.assignee_email } } : {}),
    ...(($json.tags && $json.tags !== '') ? { tags: { name: $json.tags } } : {})
  } : ""
} }}

// This supports filtering by:
// - status: "open", "closed", "pending"
// - priority: "low", "normal", "high", "urgent"
// - customer_email: customer's email address
// - assignee_email: who's assigned to the ticket
// - tags: tag name (e.g., "urgent", "billing")
// - query: text search across ticket content
