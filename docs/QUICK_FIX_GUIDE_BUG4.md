# QUICK FIX: Apply Bug #4 Fix to Your Workflow

## The Problem You're Seeing

```
Command: "list customers"
Current Output: Shows TICKETS ❌
Expected Output: Should show CUSTOMERS ✅
```

**Why:** The Planning AI system message in your n8n workflow hasn't been updated yet.

## The 5-Minute Fix

### Step 1: Get the New System Message

The new system message is here:
```
/home/user/Analyst/docs/UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt
```

### Step 2: Open n8n Workflow

1. Go to your n8n instance
2. Open the Gorgias AI Agent workflow
3. Put it in edit mode

### Step 3: Find the Planning AI Node

Look for:
- Node name: **"Plan AI Agent"** or **"OpenAI Structured Output"**
- It's an HTTP Request node
- It's connected after "Parse Slack"
- URL points to OpenAI API

### Step 4: Update the System Message

1. Click the Planning AI node
2. Scroll to **Options** section
3. Find **System Message** field (big text box)
4. Click in the box, press `Ctrl+A` (select all)
5. Press `Delete`
6. Open `UPDATED_PLANNING_AI_SYSTEM_MESSAGE.txt`
7. Copy EVERYTHING (Ctrl+A, Ctrl+C)
8. Paste into n8n System Message field (Ctrl+V)

### Step 5: Look for This Section

Verify the new message includes this:

```
═══════════════════════════════════════════════════════════════════
5. ACTION DISAMBIGUATION (CRITICAL - Bug #4 Fix)
═══════════════════════════════════════════════════════════════════

**Customer vs Ticket Operations - Check Carefully!**

CRITICAL: Check for "customer" or "customers" keyword in the query!

If query mentions "customer" or "customers":
✅ list_customers - "list customers", "show customers", "all customers"
```

If you see this, you've got the right message!

### Step 6: Save the Workflow

1. Click **Save** button (top-right)
2. Wait for green checkmark
3. Done!

## Test After Fix

Try these commands in Slack:

```
@Gorgias Terminal list customers
```
**Should show:** Customer list ✅ (not tickets)

```
@Gorgias Terminal show customers
```
**Should show:** Customer list ✅ (not tickets)

```
@Gorgias Terminal list tickets
```
**Should show:** Ticket list ✅ (still works)

## If It Still Doesn't Work

1. Check the system message was actually saved
2. Try reloading the n8n page
3. Check the workflow is active
4. Try a slightly different command: "show all customers"

---

**Time:** 5 minutes
**Difficulty:** Easy - just copy/paste
**Impact:** Fixes customer vs ticket routing immediately
