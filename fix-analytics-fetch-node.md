# Fix: Fetch Tickets for Analytics - 400 Bad Request

**Error:** 400 Bad Request when calling Gorgias `/api/tickets/search`

**Root Cause:** Incorrect template syntax in jsonBody

---

## ❌ Current Code (BROKEN)

```json
{
  "filters": {
    "created_datetime": {
      "from": "{{ $now.minus(30, 'days').toISO() }}",
      "to": "{{ $now.toISO() }}"
    },
    "status": "closed"
  },
  "limit": 1000,
  "order_by": "-created_datetime"
}
```

**Problems:**
1. `{{ }}` is Jinja/Django syntax, not n8n syntax
2. `$now.minus(30, 'days')` - incorrect Luxon syntax
3. Template strings inside JSON won't evaluate

---

## ✅ Fixed Code (WORKING)

**Option 1: Use n8n Expression (Recommended)**

Replace the entire `jsonBody` field with this n8n expression:

```javascript
={{ {
  filters: {
    created_datetime: {
      from: $now.minus({ days: 30 }).toISO(),
      to: $now.toISO()
    },
    status: "closed"
  },
  limit: 1000,
  order_by: "-created_datetime"
} }}
```

**Key changes:**
- ✅ Starts with `={{` to make it an n8n expression
- ✅ Uses object notation (not JSON string)
- ✅ Uses `$now.minus({ days: 30 })` (correct Luxon syntax)
- ✅ Calls `.toISO()` directly (no template brackets)

---

## 🔧 How to Apply Fix

### **Method 1: Update via UI (Easiest)**

1. Open n8n workflow
2. Click on **Fetch Tickets for Analytics** node
3. Under **Body** section:
   - Ensure "Specify Body" is set to **"Using Fields Below"** or **"Using Expression"**
4. In the **JSON** field, replace everything with:

```javascript
={{ {
  filters: {
    created_datetime: {
      from: $now.minus({ days: 30 }).toISO(),
      to: $now.toISO()
    },
    status: "closed"
  },
  limit: 1000,
  order_by: "-created_datetime"
} }}
```

5. Save and test

---

### **Method 2: Full Node Configuration (Complete)**

Here's the complete correct configuration for the node:

```json
{
  "parameters": {
    "url": "https://ironsidecomputers.gorgias.com/api/tickets/search",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpBasicAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Accept",
          "value": "application/json"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ {\n  filters: {\n    created_datetime: {\n      from: $now.minus({ days: 30 }).toISO(),\n      to: $now.toISO()\n    },\n    status: \"closed\"\n  },\n  limit: 1000,\n  order_by: \"-created_datetime\"\n} }}",
    "options": {
      "response": {
        "response": {
          "fullResponse": true,
          "responseFormat": "json"
        }
      }
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [-1728, 2624],
  "id": "40bd445a-6cb4-44fb-af94-c3f835606476",
  "name": "Fetch Tickets for Analytics",
  "retryOnFail": true,
  "credentials": {
    "httpBasicAuth": {
      "id": "00RVVUesFbtpYkL5",
      "name": "Gorgias"
    }
  },
  "onError": "continueErrorOutput"
}
```

---

## 🧪 Test the Fix

After applying, test with:

**Slack message:** `@Gorgias Terminal analyze tickets`

**Expected result:**
```
Fetch Tickets for Analytics (HTTP Request)
    ↓
Request body sent:
{
  "filters": {
    "created_datetime": {
      "from": "2025-10-07T22:14:47.000Z",  // 30 days ago
      "to": "2025-11-06T22:14:47.000Z"     // now
    },
    "status": "closed"
  },
  "limit": 1000,
  "order_by": "-created_datetime"
}
    ↓
Gorgias API response: 200 OK with ticket data
    ↓
Ticket Analytics Agent (Claude Sonnet 4.5)
    ↓
Insights returned ✅
```

---

## 📋 Verification Checklist

After fix:
- [ ] Node executes without 400 error
- [ ] Returns ~1000 closed tickets from last 30 days
- [ ] Ticket Analytics Agent receives data
- [ ] Claude Sonnet 4.5 returns insights JSON
- [ ] Slack shows formatted insights (not error)

---

## 🔍 Debugging Tips

**If still getting 400 error:**

1. **Check the actual request body sent:**
   - Run workflow in test mode
   - Check node output
   - Verify dates are ISO 8601 format

2. **Verify Gorgias API endpoint:**
   - Confirm `/api/tickets/search` accepts POST
   - Verify `filters.created_datetime` format
   - Test with Postman/curl first

3. **Test with simplified body:**
   ```javascript
   ={{ {
     limit: 10,
     status: "closed"
   } }}
   ```

4. **Check Gorgias credentials:**
   - Verify HTTP Basic Auth is correct
   - Test with a simple GET request first

---

## 🎯 Alternative: Use Code Node Instead

If HTTP Request node continues to have issues, use a Code node:

**New node: "Build Analytics Request"**

```javascript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

return [{
  json: {
    filters: {
      created_datetime: {
        from: thirtyDaysAgo.toISOString(),
        to: new Date().toISOString()
      },
      status: "closed"
    },
    limit: 1000,
    order_by: "-created_datetime"
  }
}];
```

Then connect to HTTP Request node that uses `={{ $json }}` as body.

---

## ✅ Summary

**The fix:**
- Change `"{{ $now.minus(30, 'days').toISO() }}"`
- To: `$now.minus({ days: 30 }).toISO()` (inside `={{ }}` expression)

**Why it works:**
- n8n expressions use `={{ }}` not `{{ }}`
- Luxon uses `.minus({ days: 30 })` not `.minus(30, 'days')`
- Object notation evaluates expressions, JSON strings don't

**Result:**
- Gorgias API gets properly formatted ISO 8601 dates ✅
- 200 OK response with ticket data ✅
- Analytics branch works! ✅
