# Search Text Node - JSON Body Fix

## The Problem

Current JSON Body setting:
```javascript
={{ $json.search }}
```

This sends just a string (e.g., `""`), but the API expects a JSON object:
```json
{
  "search": "",
  "filters": ""
}
```

## The Solution

Change the JSON Body to:

```javascript
={{
  {
    "search": $json.search,
    "filters": $json.filters
  }
}}
```

Or with fallback values:

```javascript
={{
  {
    "search": $json.search || "",
    "filters": $json.filters || ""
  }
}}
```

## How This Works

1. The outer `={{ }}` tells n8n to evaluate the expression
2. The inner `{ }` creates a JavaScript object
3. `$json.search` gets the search value from the input
4. `$json.filters` gets the filters value from the input
5. This automatically **excludes** `_client_side_filters` from being sent to the API

## Input Example

Build Search Request outputs:
```json
{
  "search": "",
  "filters": "",
  "_client_side_filters": {
    "status": "closed",
    "assignee_email": "ay17yousaf@gmail.com"
  }
}
```

## What Gets Sent to API

```json
{
  "search": "",
  "filters": ""
}
```

The `_client_side_filters` field is **NOT** sent to the API (which is what we want).

## Steps to Fix in n8n

1. Open the **Search Text** node
2. Find the **JSON** section under Body
3. Replace the current value with:
```javascript
={{
  {
    "search": $json.search || "",
    "filters": $json.filters || ""
  }
}}
```
4. Save and test

## Expected Result

The API should now receive a valid JSON object and return search results successfully.
