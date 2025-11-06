// Search Text Node - JSON Body
// Only send search and filters to API (filter out client-side metadata)

const input = $json;

return {
  search: input.search || "",
  filters: input.filters || ""
};
