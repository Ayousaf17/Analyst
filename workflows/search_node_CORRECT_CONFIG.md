# Correct Configuration for search Node

## Settings

**URL:** `https://ironsidecomputers.gorgias.com/api/tickets/search`

**Method:** POST

**Authentication:** HTTP Basic Auth (Gorgias credentials)

**Headers:**
- Accept: application/json
- Content-Type: application/json

**Send Body:** Yes

**Body Content Type:** JSON

**JSON Body:**

```javascript
={{ {
  filters: {
    query: $json.query || ""
  },
  limit: $json.limit || 30,
  order_by: "-created_datetime"
} }}
```

## Alternative: Simple Search

If the above doesn't work, try this simpler body:

```javascript
={{ {
  query: $json.query || "",
  limit: $json.limit || 30
} }}
```

## Based on "Fetch Tickets for Analytics" Node

The working node in your workflow uses this structure for /api/tickets/search:

```json
{
  "filters": {
    "created_datetime": {
      "from": "...",
      "to": "..."
    },
    "status": "closed"
  },
  "limit": 1000,
  "order_by": "-created_datetime"
}
```

So for text search, adapt it to:

```javascript
={{ {
  filters: {
    query: $json.query || ""
  },
  limit: $json.limit || 30,
  order_by: "-created_datetime"
} }}
```
