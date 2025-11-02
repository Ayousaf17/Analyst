# Memory Implementation Guide - Phase 1: Basic Thread Context

**Date:** November 2, 2025
**Feature:** Add conversation memory to Gorgias AI Agent
**Estimated Time:** 30-45 minutes
**Complexity:** Medium

---

## 🎯 What This Adds

### Before Memory
```
User: "get ticket 234525253"
[Shows ticket details]

User: "close it"
❌ System: Shows open tickets (doesn't know which ticket to close)
```

### After Memory
```
User: "get ticket 234525253"
[Shows ticket details]
Context stored: current_ticket_id = "234525253"

User: "close it"
✅ System: Closes ticket 234525253 (remembers from context!)
```

---

## 📋 Implementation Checklist

### Part 1: Database Setup (5 minutes)

- [ ] Create Supabase table
- [ ] Verify table creation
- [ ] Test manual insert/query

### Part 2: n8n Workflow Nodes (20 minutes)

- [ ] Add "Fetch Memory" node
- [ ] Add "Format Memory" node
- [ ] Add "Save Memory" node
- [ ] Connect nodes to workflow

### Part 3: Update AI Prompts (10 minutes)

- [ ] Update Planning AI system message
- [ ] Update Conversational AI system message

### Part 4: Testing (10 minutes)

- [ ] Test pronoun resolution ("close it")
- [ ] Test follow-up commands
- [ ] Test memory expiration
- [ ] Test multi-thread isolation

---

## 🗄️ PART 1: Database Setup

### Step 1: Create Supabase Table

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click "SQL Editor" in the left sidebar

2. **Run the Schema**
   - Open file: `docs/supabase_thread_memory_schema.sql`
   - Copy the ENTIRE SQL script
   - Paste into Supabase SQL editor
   - Click "Run"

3. **Verify Table Creation**
   ```sql
   SELECT * FROM thread_memory LIMIT 1;
   ```
   Should return empty result (no error)

4. **Test Manual Insert**
   ```sql
   INSERT INTO thread_memory (thread_ts, channel, user_id, last_action)
   VALUES ('test_123', 'C09BXTD0WR0', 'U09BSMA8U75', 'list_customers');

   SELECT * FROM thread_memory WHERE thread_ts = 'test_123';
   ```
   Should return the row you just inserted.

5. **Clean Up Test**
   ```sql
   DELETE FROM thread_memory WHERE thread_ts = 'test_123';
   ```

✅ **Checkpoint:** Table `thread_memory` exists and can be queried.

---

## ⚙️ PART 2: n8n Workflow Nodes

### Architecture Overview

```
Slack Trigger
  ↓
Parse Slack
  ↓
┌─────────────────┐
│ Fetch Memory    │ ← NEW: Get existing memory from Supabase
└─────────────────┘
  ↓
┌─────────────────┐
│ Format Memory   │ ← NEW: Format for Planning AI
└─────────────────┘
  ↓
Plan AI Agent (updated prompt with memory)
  ↓
Handle Plan Response
  ↓
... [existing workflow] ...
  ↓
Collect Results
  ↓
┌─────────────────┐
│ Save Memory     │ ← NEW: Store updated context
└─────────────────┘
  ↓
Calculate Standard Metrics
  ↓
... [rest of workflow] ...
```

---

### Node 1: Fetch Memory (Supabase Node)

**Location:** After "Parse Slack", before "Plan AI Agent"

**Configuration:**
1. **Add new node:** Supabase (Get Rows)
2. **Node name:** "Fetch Memory"
3. **Settings:**
   - **Table:** `thread_memory`
   - **Filter:** Add filter
     - **Column:** `thread_ts`
     - **Operator:** `=`
     - **Value:** `{{ $('Parse Slack').first().json.thread_ts }}`
   - **Limit:** 1

**Test:**
- Should return empty array `[]` if no memory exists
- Should return memory object if exists

---

### Node 2: Format Memory (Code Node)

**Location:** After "Fetch Memory", before "Plan AI Agent"

**Configuration:**
1. **Add new node:** Code (Run Once for All Items)
2. **Node name:** "Format Memory"
3. **Code:** Copy from `docs/fetch_thread_memory_node.js`

**Test:**
- Run workflow
- Check output: Should have `has_memory: false` (first time)
- Should have `context_summary: "None"`

---

### Node 3: Update Planning AI

**Location:** Existing "Plan AI Agent" node

**Configuration:**
1. **Open existing "Plan AI Agent" node**
2. **System Message field:**
   - Open file: `docs/PLANNING_AI_WITH_MEMORY.txt`
   - Copy ENTIRE contents
   - Replace old system message
3. **Save node**

**Key Addition:**
The new system message includes:
```
Previous Context: {{ $('Fetch Memory').first().json.context_summary || 'None' }}

Current Focus:
- Ticket: {{ $('Fetch Memory').first().json.current_ticket_id || 'None' }}
- Customer: {{ $('Fetch Memory').first().json.current_customer_email || 'None' }}
```

---

### Node 4: Prepare Memory Save (Code Node)

**Location:** After "Collect Results", before "Calculate Standard Metrics"

**Configuration:**
1. **Add new node:** Code (Run Once for All Items)
2. **Node name:** "Prepare Memory Save"
3. **Code:** Copy from `docs/save_thread_memory_node.js`

**Test:**
- Run workflow with a command
- Check output: Should have structure:
  ```json
  {
    "thread_ts": "...",
    "channel": "...",
    "current_ticket_id": "...",
    "last_action": "...",
    "recent_history": [...]
  }
  ```

---

### Node 5: Save Memory (Supabase Node)

**Location:** After "Prepare Memory Save"

**Configuration:**
1. **Add new node:** Supabase (Insert or Update - Upsert)
2. **Node name:** "Save Memory"
3. **Settings:**
   - **Table:** `thread_memory`
   - **Conflict Column:** `thread_ts`
   - **Data to Insert:** `{{ $json }}`

**Test:**
- Run workflow
- Check Supabase: `SELECT * FROM thread_memory LIMIT 10;`
- Should see new memory entries

---

## 🔗 Connect the Nodes

### Connection Flow

1. **Slack Trigger** → Parse Slack
2. **Parse Slack** → Fetch Memory
3. **Fetch Memory** → Format Memory
4. **Format Memory** → Plan AI Agent
5. **Plan AI Agent** → Handle Plan Response
6. ... [existing workflow] ...
7. **Collect Results** → Prepare Memory Save
8. **Prepare Memory Save** → Save Memory
9. **Save Memory** → Calculate Standard Metrics
10. **Calculate Standard Metrics** → ... [rest of workflow]

---

## 💬 PART 3: Update AI Prompts

### Update Planning AI (Already Done in Node 3)

✅ Already completed in Part 2, Node 3

---

### Update Conversational AI

**Location:** Existing "Conversational Response AI" node

**Configuration:**
1. **Open the node**
2. **System Message field:**
   - Open file: `docs/CONVERSATIONAL_AI_WITH_MEMORY_ADDITION.txt`
   - Copy the contents
   - **Add it at the TOP** of your existing system message
   - Keep all existing content below
3. **Save node**

**What this adds:**
- Acknowledgment of previous actions
- Avoids redundant suggestions
- Pattern recognition
- Progressive workflow guidance

---

## 🧪 PART 4: Testing

### Test 1: Basic Pronoun Resolution

**Test Sequence:**
```
1. @Gorgias Terminal get ticket 234525253
   Expected: Shows ticket details

2. @Gorgias Terminal close it
   Expected: Closes ticket 234525253 (uses memory!)
```

**Verify:**
- [ ] Second command closes the correct ticket
- [ ] Check Supabase: `SELECT * FROM thread_memory ORDER BY updated_at DESC LIMIT 1;`
- [ ] Should show `current_ticket_id: "234525253"`

---

### Test 2: Customer Follow-up

**Test Sequence:**
```
1. @Gorgias Terminal list tickets for john@example.com
   Expected: Shows tickets for john@example.com

2. @Gorgias Terminal show their details
   Expected: Shows customer details for john@example.com
```

**Verify:**
- [ ] Second command uses correct customer email
- [ ] Memory stores `current_customer_email: "john@example.com"`

---

### Test 3: Multi-step Workflow

**Test Sequence:**
```
1. @Gorgias Terminal get ticket 234525253
   Expected: Shows ticket details

2. @Gorgias Terminal assign it to spencer@example.com
   Expected: Assigns ticket 234525253 to Spencer

3. @Gorgias Terminal reply with "I've assigned this to our team lead"
   Expected: Sends reply to ticket 234525253
```

**Verify:**
- [ ] All commands use the correct ticket ID
- [ ] Memory persists across multiple actions
- [ ] `recent_history` array grows with each action

---

### Test 4: Explicit Override

**Test Sequence:**
```
1. @Gorgias Terminal get ticket 234525253
   Expected: Shows ticket details, stores in memory

2. @Gorgias Terminal close ticket 999999
   Expected: Closes ticket 999999 (NOT 234525253!)
```

**Verify:**
- [ ] Command 2 uses explicit ID, not memory
- [ ] Memory updates to `current_ticket_id: "999999"`

---

### Test 5: Memory Expiration

**Setup:** Run a command, wait 1 hour 5 minutes

**Test:**
```
@Gorgias Terminal close it
Expected: Doesn't know which ticket (memory expired)
```

**Verify:**
- [ ] Check Supabase: Run cleanup function
  ```sql
  SELECT cleanup_expired_thread_memory();
  SELECT * FROM thread_memory;
  ```
- [ ] Old entries should be deleted

---

### Test 6: Thread Isolation

**Test:** Run commands in two different threads simultaneously

**Thread 1:**
```
@Gorgias Terminal get ticket 111111
```

**Thread 2:**
```
@Gorgias Terminal get ticket 222222
```

**Then Thread 1:**
```
@Gorgias Terminal close it
Expected: Closes ticket 111111 (NOT 222222)
```

**Verify:**
- [ ] Each thread has separate memory
- [ ] Check Supabase: Should see 2 different `thread_ts` entries
- [ ] No cross-thread contamination

---

## 📊 Success Criteria

After implementation, you should have:

✅ **Database:**
- [ ] `thread_memory` table exists
- [ ] Can query and insert records
- [ ] Auto-cleanup function works

✅ **Workflow:**
- [ ] Fetch Memory node retrieves context
- [ ] Format Memory node creates summary
- [ ] Planning AI uses memory in decisions
- [ ] Save Memory node stores updates
- [ ] All nodes properly connected

✅ **Functionality:**
- [ ] "close it" works after viewing ticket
- [ ] "show their tickets" works after customer mention
- [ ] "reply to it" works with current ticket
- [ ] Explicit IDs override memory
- [ ] Memory expires after 1 hour
- [ ] Threads are isolated

✅ **AI Behavior:**
- [ ] Planning AI resolves pronouns correctly
- [ ] Conversational AI acknowledges previous actions
- [ ] No redundant suggestions
- [ ] Progressive workflow guidance

---

## 🚨 Troubleshooting

### Issue: "close it" shows open tickets instead of closing

**Possible causes:**
1. Memory not being saved
2. Planning AI not reading memory
3. Context extraction failing

**Debug:**
1. Check Supabase: `SELECT * FROM thread_memory ORDER BY updated_at DESC LIMIT 5;`
2. Check Format Memory output: Should have `current_ticket_id`
3. Check Planning AI receives context: Look at logs
4. Verify system message has memory section

---

### Issue: Memory not expiring

**Possible causes:**
1. Cleanup function not running
2. `expires_at` timestamp not updating

**Fix:**
1. Manual cleanup: `SELECT cleanup_expired_thread_memory();`
2. Set up cron job (if using pg_cron extension)
3. Or add cleanup to workflow (check every hour)

---

### Issue: Cross-thread contamination

**Possible causes:**
1. Fetch Memory not filtering by `thread_ts`
2. Save Memory overwriting wrong thread

**Debug:**
1. Check Fetch Memory filter: Should be `thread_ts = {{ ... }}`
2. Check Save Memory: Should use correct `thread_ts` from Parse Slack
3. Query Supabase: `SELECT thread_ts, channel, user_id, current_ticket_id FROM thread_memory;`

---

### Issue: High token usage

**Symptoms:** Token usage increased significantly

**Solutions:**
1. Limit `recent_history` to 3-5 items (already in code)
2. Summarize old context instead of full retention
3. Only include relevant context fields in prompt
4. Consider using cheaper model for memory management

---

## 📈 Performance Impact

### Token Usage

**Before Memory:**
- Average: 2,500 tokens per request
- Cost: ~$0.02 per request (GPT-4)

**After Memory:**
- Average: 3,500 tokens per request (+1,000 tokens)
- Cost: ~$0.028 per request (+40%)
- Extra cost: ~$0.008 per request

**For 1,000 requests/day:**
- Extra cost: ~$8/day or ~$240/month

**Mitigation:**
- Smart pruning (keep only last 3 actions in full detail)
- Summarize older context
- Use cheaper model (GPT-3.5) for memory-only queries

---

### Supabase Storage

**Per thread:**
- ~1-2 KB per memory record
- Auto-cleanup after 1 hour

**For 100 active threads:**
- Storage: ~200 KB (negligible)
- Queries: ~200 SELECT + 100 UPSERT per hour
- Supabase free tier: 500,000 queries/month (plenty of headroom)

---

## 🎓 How Memory Works

### Data Flow

```
1. User sends command in thread
   ↓
2. Fetch Memory queries Supabase by thread_ts
   ↓
3. Format Memory creates context summary
   ↓
4. Planning AI receives context + user text
   ↓
5. Planning AI resolves pronouns using context
   ↓
6. Actions execute
   ↓
7. Prepare Memory Save extracts new entities
   ↓
8. Save Memory upserts to Supabase
   ↓
9. Memory expires after 1 hour (auto-cleanup)
```

---

### Memory Structure

```json
{
  "thread_ts": "1762052904.296909",
  "channel": "C09BXTD0WR0",
  "user_id": "U09BSMA8U75",

  "current_ticket_id": "234525253",
  "current_customer_id": null,
  "current_customer_email": "john@example.com",
  "current_query": null,

  "last_action": "get_ticket",
  "last_action_timestamp": "2025-11-02T10:14:00Z",

  "recent_history": [
    {
      "action": "list_customers",
      "user_text": "list customers",
      "timestamp": "2025-11-02T10:10:00Z"
    },
    {
      "action": "get_ticket",
      "user_text": "get ticket 234525253",
      "ticket_id": "234525253",
      "timestamp": "2025-11-02T10:14:00Z"
    }
  ],

  "created_at": "2025-11-02T10:10:00Z",
  "updated_at": "2025-11-02T10:14:00Z",
  "expires_at": "2025-11-02T11:14:00Z"
}
```

---

## 🚀 Next Steps After Implementation

### Phase 2: Smart Memory (Future Enhancement)

Consider adding:
- Memory summarization (compress old context)
- Pattern detection (user frequently checks Spencer's stats)
- Cross-thread insights (user patterns across all threads)
- Preference learning (user prefers certain views/formats)

**Time:** 2-4 hours additional work

---

### Monitoring & Optimization

1. **Track token usage** (first week)
   - Compare before/after
   - Identify heavy consumers
   - Optimize if needed

2. **User feedback**
   - Ask users if pronoun resolution is helpful
   - Identify edge cases
   - Refine prompts

3. **Database maintenance**
   - Monitor table size
   - Verify auto-cleanup works
   - Adjust expiration time if needed (1 hour too short/long?)

---

## 📁 Files Reference

| File | Purpose |
|------|---------|
| `supabase_thread_memory_schema.sql` | Database schema + cleanup function |
| `fetch_thread_memory_node.js` | Format memory for Planning AI |
| `save_thread_memory_node.js` | Prepare memory for Supabase |
| `PLANNING_AI_WITH_MEMORY.txt` | Updated Planning AI prompt |
| `CONVERSATIONAL_AI_WITH_MEMORY_ADDITION.txt` | Conversational AI memory section |
| `MEMORY_IMPLEMENTATION_GUIDE.md` | This guide |
| `MEMORY_TESTING_GUIDE.md` | Comprehensive testing checklist |

---

**Total Time:** 30-45 minutes
**Difficulty:** Medium
**Impact:** High - Significant UX improvement
**Risk:** Low - Isolated feature, easy to rollback

Ready to implement! 🚀
