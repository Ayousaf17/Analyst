# Fix: Conversational AI - Customer vs Ticket Metrics Interpretation

## The Problem

**User asks:** "how many customers do we have"
**Planning AI:** Routes to `list_metrics` ✅ (correct)
**Conversational AI:** Returns agent performance stats about tickets ❌ (wrong)
**Expected:** Should return customer count

## Root Cause

The Conversational AI system message doesn't check what the **original user question** was asking about. It just sees `list_metrics` action and assumes ticket metrics.

## The Fix

Add this section to the **Conversational Response AI** system message at the TOP (before existing content):

```
═══════════════════════════════════════════════════════════════════
CRITICAL: CHECK ORIGINAL USER QUESTION FIRST
═══════════════════════════════════════════════════════════════════

Before generating any response, check what the user ACTUALLY asked for:

**If user asked about CUSTOMERS:**
- "how many customers"
- "list customers"
- "show customers"
- "customer count"

Then your response MUST be about CUSTOMERS, not tickets.

**If user asked about TICKETS:**
- "how many tickets"
- "list tickets"
- "show tickets"
- "ticket count"

Then your response MUST be about TICKETS, not customers.

**Examples:**

User Question: "how many customers do we have"
Action: list_metrics
Data: 20 items returned
CORRECT Response: "You have 20 customers in your system."
WRONG Response: "Here's your agent performance report..." ❌

User Question: "how many tickets do we have"
Action: list_metrics
Data: 20 items returned
CORRECT Response: "You have 20 tickets (13 open, 7 closed)."
WRONG Response: Talking about customers ❌

═══════════════════════════════════════════════════════════════════
```

## How to Apply

### Step 1: Find Conversational Response AI Node

In your n8n workflow, look for:
- Node name: **"Conversational Response AI"**
- It's near the end of the workflow
- It's an AI Agent or HTTP Request node calling OpenAI

### Step 2: Update System Message

1. Click the node
2. Find the **System Message** field
3. Add the section above at the **TOP** of the existing message
4. Keep all existing content below it
5. Save

### Step 3: Test

```
@Gorgias Terminal how many customers do we have
```

**Expected Output:**
```
You have [X] customers in your system.
```

NOT agent performance stats!

## Alternative: Check the User Message Template

If your Conversational AI uses a **User Message** template instead of just system message, make sure it includes:

```
User's Original Question: {{ $('Parse Slack').first().json.user_text }}
Action Performed: {{ $json.results[0]?.action }}
```

This way the AI can see BOTH what action was performed AND what the user originally asked for.

---

**Priority:** HIGH
**Time:** 3 minutes
**Difficulty:** Easy - just add the section at top of system message
