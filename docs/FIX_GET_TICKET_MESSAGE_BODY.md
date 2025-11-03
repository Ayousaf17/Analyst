# Fix: Get Ticket Message Body Not Showing

**Issue:** Ticket details show "No message content available" instead of the actual customer message.

**Root Cause:** Gorgias API requires explicit `include` parameter to fetch message bodies with ticket data.

---

## 🔧 Fix: Update get_ticket HTTP Request Node

### Step 1: Open the get_ticket Node

1. Open your n8n workflow
2. Find the **"get_ticket"** HTTP Request node
3. Click to open node settings

### Step 2: Add Query Parameter

Your current configuration:
```
URL: https://ironsidecomputers.gorgias.com/api/tickets/{{ $json.ticket_id }}
```

**Add this query parameter:**

1. Find the **"Query Parameters"** section
2. Click **"Add Parameter"**
3. Set:
   - **Name:** `include`
   - **Value:** `messages`

This tells Gorgias to include the message bodies in the response.

### Step 3: Alternative - Update URL Directly

If query parameters don't work, update the URL field to:
```
https://ironsidecomputers.gorgias.com/api/tickets/{{ $json.ticket_id }}?include=messages
```

### Step 4: Test

After making the change:
1. Save the node
2. Run test: `"@Gorgias Terminal get ticket 234774491"`
3. Expected output should now show the actual message text

---

## 📊 Expected Output After Fix

**Before (Current):**
```
💬 Customer Message:
"No message content available"
```

**After (Fixed):**
```
💬 Customer Message:
"Hi, I ordered a custom PC two weeks ago and haven't received any shipping updates. Can you please let me know when it will ship? Order #12345."
```

---

## 🔍 Verify the Fix

After updating, check the n8n execution logs:

1. Run the get_ticket action
2. Click on the **get_ticket** HTTP Request node in the execution
3. Check the **Output** tab
4. Look for the `messages` array in the response:

**You should see:**
```json
{
  "id": "234774491",
  "subject": "Order shipping question",
  "messages": [
    {
      "id": "...",
      "body_text": "Hi, I ordered a custom PC...",
      "body_html": "<p>Hi, I ordered...</p>",
      "stripped_text": "Hi, I ordered a custom PC..."
    }
  ]
}
```

If you see an empty `messages` array or no `messages` field at all, the `include` parameter isn't working.

---

## 🛠️ Alternative Fix: Check Gorgias API Documentation

If adding `include=messages` doesn't work, check the exact parameter name in Gorgias docs:

**Common variations:**
- `?include=messages`
- `?expand=messages`
- `?with[]=messages`
- `?fields=messages`

**Gorgias API v1 typically uses:** `?include=messages`

**If still not working:**
1. Check Gorgias API docs: https://developers.gorgias.com/reference/get-a-ticket
2. Look for the correct parameter to include message bodies
3. Update the query parameter accordingly

---

## ✅ Complete get_ticket Node Configuration

**Final configuration should be:**

**URL:**
```
https://ironsidecomputers.gorgias.com/api/tickets/{{ $json.ticket_id }}
```

**Query Parameters:**
| Name | Value |
|------|-------|
| include | messages |

**Headers:**
| Name | Value |
|------|-------|
| Accept | application/json |
| Content-Type | application/json |

**Authentication:** HTTP Basic Auth (Gorgias)

**Options:**
- Full Response: true
- Response Format: json

---

## 🎯 Testing Checklist

After applying the fix:

- [ ] Unpinned test data from Slack Trigger node
- [ ] Added `include=messages` query parameter to get_ticket node
- [ ] Saved the workflow
- [ ] Tested: `"@Gorgias Terminal get ticket 234774491"`
- [ ] Verified correct ticket ID is fetched (234774491, not 234525253)
- [ ] Verified customer message body is displayed (not "No message content available")
- [ ] Message preview shows first ~300 characters of actual customer message

---

## 📝 Expected Full Output After Both Fixes

```
🎫 Ticket #234774491 - Order shipping question

📋 Details:
• Status: Open
• Priority: Normal
• Customer: John Doe
• Assignee: Zach Ruland
• Created: Nov 2, 2025
• Last updated: Nov 3, 2025
• Messages: 2
• Tags: shipping, order-status

💬 Customer Message:
"Hi, I ordered a custom PC two weeks ago (Order #12345) and haven't received any shipping updates. Can you please let me know when it will ship? I need it by next Friday for a project. Thanks!"

💡 What would you like to do?
• Reply: "@Gorgias Terminal reply to ticket 234774491 with [message]"
• Update status: "@Gorgias Terminal set ticket 234774491 status to pending"
• Add tags: "@Gorgias Terminal add tags to ticket 234774491: urgent,shipping"
```

---

## 🚨 If Message Body Still Doesn't Show

**Check the raw API response:**

1. After running get_ticket, open the execution
2. Click on the **get_ticket** HTTP Request node
3. Look at the raw JSON output
4. Check if `messages` array exists
5. Check if `messages[0].body_text` or `messages[0].stripped_text` exists

**If messages array is empty or missing:**
- The `include` parameter may need different syntax
- Check Gorgias API documentation for correct parameter name
- May need to use `expand` or `with[]` instead of `include`

**If messages array exists but body_text is null:**
- Use `body_html` instead and strip HTML tags
- Or use `stripped_text` field

**Update Universal Table Formatter if needed:**
Find this line in the `formatGetTicket` function:
```javascript
const messageBody = ticket.messages?.[0]?.body_text
                 || ticket.messages?.[0]?.stripped_text
                 || ticket.body_text
                 || 'No message content available';
```

Add more fallback options:
```javascript
const messageBody = ticket.messages?.[0]?.body_text
                 || ticket.messages?.[0]?.stripped_text
                 || ticket.messages?.[0]?.body_html?.replace(/<[^>]*>/g, '') // Strip HTML
                 || ticket.body_text
                 || ticket.last_message?.body_text
                 || 'No message content available';
```

---

This should fix both issues. Let me know what you see after making these changes!
