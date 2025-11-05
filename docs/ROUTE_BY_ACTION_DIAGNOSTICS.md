# Route by Action - Diagnostic Steps

**Problem:** "Destination node not found" error persists even though JSON structure looks correct

**Date:** November 5, 2025

---

## 🔬 Step 1: Check Format Clarification Response Node Status

### Is the node disabled?

1. Click on **Format Clarification Response** node in n8n
2. Look at the node in the canvas
3. **Is it grayed out or has a different appearance?**
4. Right-click the node → Check if there's an "Enable" option
5. If disabled, click "Enable"

### Does the node exist in the right place?

1. Format Clarification Response should be **between Route by Action and Final Slack Reply**
2. Not connected to any other nodes

---

## 🔬 Step 2: Check What Route by Action is Actually Receiving

### Add Debug Node BEFORE Route by Action

1. Add a **Code node** between Handle Plan Response and Route by Action
2. Name it: "Debug Input"
3. Copy code from: `workflows/Debug_Route_by_Action.js`
4. Connect: Handle Plan Response → Debug Input → Route by Action
5. Run workflow with: "add a tag to ticket 234945454"
6. Check console logs

**Expected output in logs:**
```
🔍 DEBUG: Input to Route by Action
Action value: ask_clarification
Action type: string
```

**If you see something different**, copy the FULL log output and send it.

---

## 🔬 Step 3: Verify Route by Action Configuration

### Check the Switch node settings:

1. Double-click "Route by Action" node
2. Scroll to **Rule 1** (should be ask_clarification)
3. Click to expand the rule
4. Verify these exact settings:

```
Data Type: String
Value 1: {{ $json.action }}
Operation: Equal to
Value 2: ask_clarification
Output Key: ask_clarification
```

### Count the rules:

How many routing rules do you see in Route by Action?
- Should be **21 rules** total
- ask_clarification should be **Rule 1** (first rule)

---

## 🔬 Step 4: Check Visual Connection in Canvas

### Verify output dot connection:

1. Click on **Route by Action** node (select it)
2. Look at the **right side** of the node
3. Count the output dots (small circles)
4. **How many dots are there?** (Should be 21)
5. Look at the **FIRST dot** (top one)
6. **Is there a line from that dot to Format Clarification Response?**

**Take a screenshot** of Route by Action node showing:
- The output dots on the right
- The connection lines
- Send screenshot if possible

---

## 🔬 Step 5: Check Node Names (Case Sensitive)

### Verify exact node name:

1. Click **Format Clarification Response** node
2. Look at the **name field** in the node properties (top of left panel)
3. The name must be EXACTLY: `Format Clarification Response`

**Check for these common issues:**
- Extra spaces: "Format Clarification Response " (trailing space)
- Wrong case: "format clarification response"
- Typo: "Format Clarification Respnse"

**Copy and paste the exact name here so I can verify it.**

---

## 🔬 Step 6: Try Alternative IF Node Approach

If all else fails, let's bypass the Switch entirely:

### Create IF node workaround:

1. **Add IF node** between Handle Plan Response and Route by Action
2. Name it: "Check if Clarification"
3. Configure:
   - **Condition 1:** `{{ $json.action === "ask_clarification" }}`
4. **Connect:**
   - Handle Plan Response → Check if Clarification
   - TRUE output → Format Clarification Response
   - FALSE output → Route by Action (remove ask_clarification rule from Switch)
5. Test

This isolates whether the problem is:
- ✅ The Switch node itself
- ✅ The data structure
- ✅ n8n caching/state issues

---

## 🔬 Step 7: Nuclear Option - Recreate Format Clarification Response

### Delete and recreate the node:

1. **Copy the code** from Format Clarification Response first
2. **Delete** the Format Clarification Response node completely
3. **Save workflow**
4. **Reload the page** (close and reopen workflow)
5. **Add new Code node**
6. Name it exactly: `Format Clarification Response`
7. Paste the code
8. **Connect:**
   - Route by Action Output 0 → Format Clarification Response
   - Format Clarification Response → Final Slack Reply
9. **Save workflow**
10. **Reload the page again**
11. Test

---

## 🔬 Step 8: Check Workflow Activation State

### Is the workflow properly activated?

1. Look at the top right of n8n workflow editor
2. **Is there an "Activate" toggle?**
3. Toggle it **OFF** then **ON** again
4. Save workflow
5. Test

---

## 📊 Diagnostic Checklist

Please check each item and report back:

- [ ] Format Clarification Response node is NOT disabled (not grayed out)
- [ ] Route by Action has exactly 21 rules
- [ ] ask_clarification is Rule 1 (first rule, not Rule 20)
- [ ] Route by Action shows 21 output dots on the right side
- [ ] First output dot has a line to Format Clarification Response
- [ ] Node name is exactly: "Format Clarification Response" (check for spaces)
- [ ] Added Debug Input node and checked logs (send log output)
- [ ] Workflow has been saved and reloaded
- [ ] Tried toggling workflow activation OFF and ON

---

## 🎯 What to Send Me

To help debug further, please provide:

1. **Console log output** from Debug Input node (Step 2)
2. **Screenshot** of Route by Action showing output dots and connections
3. **Exact node name** from Format Clarification Response properties
4. **Number of rules** in Route by Action (and which number is ask_clarification)
5. **Any error messages** from browser console (F12 → Console tab)

---

## 💡 Hypothesis

Based on "Destination node not found" error persisting:

**Most Likely Causes:**
1. Format Clarification Response node is disabled
2. ask_clarification is NOT Rule 1 (might be Rule 20 or different position)
3. n8n has cached an old workflow state
4. Connection was made to wrong output index

**Next Best Action:**
Run diagnostic Step 2 (Debug Input node) to see what data Route by Action is receiving.

---

**Last Updated:** November 5, 2025
