# TENEX Test Workflows & Examples

This document provides step-by-step test workflows to verify that your TENEX multi-agent system is working correctly.

---

## Prerequisites

Before running these tests:

1. ✅ Dependencies installed: `bun install`
2. ✅ Configuration complete: `bun run start daemon` (ran interactive setup)
3. ✅ Daemon running: `bun run start daemon`
4. ✅ Project created via Web Client
5. ✅ API keys configured for at least one LLM provider

---

## Test Workflow 1: Agent Discovery & Listing

**Purpose**: Verify that agents are properly loaded and accessible.

### Steps

```bash
# 1. Start the daemon (if not already running)
bun run start daemon --verbose

# 2. In another terminal, list agents for a project
bun run start agent list --project <your-project-naddr>

# Expected Output:
# - List of all agents loaded for the project
# - Each agent's name, slug, role, and pubkey
# - Phase assignments (if any)
```

### Verification

✅ All expected agents are listed
✅ Each agent has a valid pubkey
✅ Agent roles match their specializations
✅ PM (Project Manager) is the first agent

---

## Test Workflow 2: Simple Feature Request

**Purpose**: Test the complete agent coordination workflow.

### User Request (via Web Client)

```
"Create a simple REST API endpoint that returns 'Hello, World!'"
```

### Expected Agent Flow

```
1. PM Agent receives request
   └─ Logs: "Received user request"

2. PM → Planner: "Create a plan for Hello World API"
   └─ Planner analyzes requirements
   └─ Planner creates structured plan
   └─ Returns plan to PM

3. PM → Executor (phase: "execute"): "Implement the Hello World endpoint"
   └─ Executor creates file
   └─ Executor writes code
   └─ Executor commits changes
   └─ Returns success to PM

4. PM → Verifier (phase: "verification"): "Test the endpoint"
   └─ Verifier runs tests
   └─ Verifier validates response
   └─ Returns test results to PM

5. PM → Documentation Agent (phase: "chores"): "Update documentation"
   └─ Documentation updates README
   └─ Returns success to PM

6. PM → Reflection (phase: "reflection"): "Capture lessons"
   └─ Reflection records learnings
   └─ Returns insights to PM

7. PM → User: "Hello World API created successfully"
```

### Verification

✅ All phases completed
✅ Code file created
✅ Tests pass
✅ Documentation updated
✅ Git commit created
✅ User receives final response

### Debug/Monitor

```bash
# Watch logs in real-time
tail -f ~/.tenex/logs/daemon.log

# Check specific conversation
bun run start debug threaded-formatter <conversation-id> --project <naddr>
```

---

## Test Workflow 3: Multi-Agent Parallel Work

**Purpose**: Test worktree creation and parallel agent execution.

### User Request

```
"Implement both the user authentication API (backend) and login form (frontend) simultaneously"
```

### Expected Flow

```
1. PM receives request

2. PM creates two delegations:

   Delegation 1:
   {
     recipient: "backend-developer-agent",
     request: "Implement authentication API with JWT",
     phase: "execute",
     branch: "feature/auth-backend"
   }

   Delegation 2:
   {
     recipient: "frontend-developer-agent",
     request: "Implement login form with validation",
     phase: "execute",
     branch: "feature/auth-frontend"
   }

3. System creates two worktrees:
   - Project/feature/auth-backend
   - Project/feature/auth-frontend

4. Both agents work simultaneously:
   - Backend agent writes API code
   - Frontend agent writes UI code

5. Both return results to PM

6. PM coordinates verification

7. PM reports completion to user
```

### Verification

```bash
# Check that worktrees were created
git worktree list

# Expected output:
# /path/to/project              <commit>  [main]
# /path/to/feature-auth-backend <commit>  [feature/auth-backend]
# /path/to/feature-auth-frontend <commit> [feature/auth-frontend]

# Check worktree tracking
cat ~/.tenex/projects/<dTag>/worktrees.json

# Should show both worktrees with metadata
```

✅ Two worktrees created
✅ Both agents completed their tasks
✅ Work done in parallel (check timestamps)
✅ Branches contain respective changes

---

## Test Workflow 4: Phase Transitions

**Purpose**: Test agent self-delegation and phase management.

### User Request

```
"Plan and execute a function to calculate fibonacci numbers"
```

### Expected Flow

```
1. PM in "chat" phase receives request

2. PM delegates to Planner:
   └─ Planner creates plan

3. PM self-delegates to "execute" phase:
   {
     recipient: "self-pubkey",
     request: "Execute the fibonacci implementation",
     phase: "execute"
   }

4. PM in "execute" phase:
   └─ Implements fibonacci function
   └─ Writes tests

5. PM self-delegates to "verification" phase:
   {
     recipient: "self-pubkey",
     request: "Verify the implementation",
     phase: "verification"
   }

6. PM in "verification" phase:
   └─ Runs tests
   └─ Validates correctness
```

### Verification

✅ PM successfully transitions between phases
✅ Each phase uses appropriate phase instructions
✅ Implementation is complete and tested

---

## Test Workflow 5: Delegation Modes

### Test 5A: Blocking Mode (Default)

**User Request**:
```
"Create a database schema for a blog application"
```

**Expected**:
- Delegating agent waits for response
- No user interaction during delegation
- Response returned when complete

**Verification**:
```bash
# Check logs for "blocking mode" or "waiting for responses"
grep -i "blocking\|waiting" ~/.tenex/logs/daemon.log
```

### Test 5B: Pair Mode

**User Request**:
```
"Refactor the authentication system using pair programming mode"
```

**Expected Flow**:
```
1. PM delegates with mode: "pair"
2. Developer agent starts work
3. After 3 tool calls, agent sends CHECK_IN
4. User receives notification: "Agent has completed X steps. Continue?"
5. User responds: CONTINUE or STOP
6. If CONTINUE, agent resumes
7. If STOP, agent saves work and aborts
```

**Verification**:
✅ CHECK_IN events received
✅ User can approve/reject
✅ Agent respects user decisions
✅ Work is saved if aborted

---

## Test Workflow 6: Tool Execution

**Purpose**: Verify all agent tools work correctly.

### Test Each Tool Category

#### File Operations

```
User: "Create a new file called test.txt with content 'Hello TENEX'"

Expected agent tools:
- write_file: test.txt
- read_file: test.txt (to verify)

Verification:
ls -la test.txt
cat test.txt
```

#### Git Operations

```
User: "Commit the current changes with message 'Add test file'"

Expected agent tools:
- git_status
- git_add
- git_commit

Verification:
git log -1
git show HEAD
```

#### Shell Execution

```
User: "List all TypeScript files in the src directory"

Expected agent tools:
- shell_execute: "find src -name '*.ts'"

Verification:
Output contains .ts files
```

#### Delegation

```
User: "Ask another agent to review this code"

Expected agent tools:
- delegate: { recipient, request, phase }

Verification:
- Delegation event published
- Response received
```

#### Phase Management

```
User (to PM): "Add a new phase called 'design' for UI/UX planning"

Expected agent tools:
- phase_add: { phase: "design", instructions: "..." }

Verification:
# Check agent's phases
bun run start debug system-prompt --project <naddr> --agent pm

# Should show new "design" phase
```

---

## Test Workflow 7: Error Handling

**Purpose**: Test system resilience and error recovery.

### Test 7A: Invalid Delegation

```
User: "Have the agent delegate to itself without a phase"

Expected:
Error: "Self-delegation is not permitted without specifying a phase"

Verification:
✅ Error message is clear
✅ System doesn't crash
✅ User is informed
```

### Test 7B: Tool Failure

```
User: "Read a file that doesn't exist: /nonexistent/path.txt"

Expected:
- Agent uses read_file tool
- Tool returns error
- Agent handles error gracefully
- Agent informs user: "File not found"

Verification:
✅ Agent doesn't crash
✅ Error is logged
✅ User receives helpful message
```

### Test 7C: Network Failure (Nostr)

```
# Simulate: Disconnect network temporarily

Expected:
- Daemon continues running
- Queues events
- Reconnects when network returns
- Processes queued events

Verification:
✅ No data loss
✅ Automatic reconnection
✅ Events processed after recovery
```

---

## Test Workflow 8: Conversation Threading

**Purpose**: Test conversation history and context management.

### Test 8A: Context Retention

```
User: "Create a User model with name and email fields"
[Agent creates model]

User: "Now add a password field to that model"
[Agent should know which model]

Expected:
- Agent remembers previous context
- Agent updates the correct User model
- No need to re-specify "User model"

Verification:
✅ Agent correctly identifies "that model"
✅ Changes applied to User model
✅ Conversation history maintained
```

### Test 8B: Multi-Turn Conversation

```
Turn 1: "What's the current project structure?"
Turn 2: "Add a new directory called 'controllers'"
Turn 3: "Create a UserController in that directory"
Turn 4: "Add a method to handle user registration"

Expected:
Each turn builds on previous context

Verification:
# Check conversation formatter
bun run start debug threaded-formatter <conversation-id> --project <naddr>

# Should show:
- All turns in order
- Context building across turns
- Agent responses reference previous turns
```

---

## Test Workflow 9: RAG & Memory

**Purpose**: Test knowledge retention and retrieval.

### Setup

```
User: "Remember this: Our coding standard is to use 4 spaces for indentation"
[Agent stores in RAG]

User (later conversation): "Format this code according to our standards"
[Agent retrieves coding standard]

Expected:
- Agent queries RAG for "coding standard"
- Retrieves "4 spaces for indentation"
- Formats code accordingly

Verification:
✅ Knowledge stored in RAG
✅ Retrieved in relevant context
✅ Applied correctly
```

---

## Test Workflow 10: Multi-LLM Configuration

**Purpose**: Test using different LLMs for different agents.

### Configuration

```json
// ~/.tenex/config/config.json
{
  "llms": {
    "configurations": {
      "fast": {
        "provider": "openai",
        "model": "gpt-3.5-turbo"
      },
      "smart": {
        "provider": "anthropic",
        "model": "claude-sonnet-4"
      },
      "local": {
        "provider": "ollama",
        "model": "llama2"
      }
    }
  }
}
```

### Agent Configuration

```
PM Agent: Uses "smart" (Claude Sonnet 4)
Executor: Uses "smart"
Verifier: Uses "fast" (GPT-3.5)
Reflection: Uses "local" (Ollama)
```

### Test

```
User: "Create a simple function and test it"

Expected:
- PM (Claude) plans
- Executor (Claude) implements
- Verifier (GPT-3.5) validates
- Reflection (Ollama) captures lessons

Verification:
# Check logs for model usage
grep -i "model\|provider" ~/.tenex/logs/daemon.log

✅ Different models used
✅ All complete successfully
✅ Costs optimized (fast for simple tasks)
```

---

## Monitoring & Metrics

### Real-Time Monitoring

```bash
# Watch daemon logs
tail -f ~/.tenex/logs/daemon.log

# Filter for specific agent
tail -f ~/.tenex/logs/daemon.log | grep "agent-slug"

# Filter for delegations
tail -f ~/.tenex/logs/daemon.log | grep -i "delegation"

# Filter for tool calls
tail -f ~/.tenex/logs/daemon.log | grep -i "tool"
```

### Metrics to Track

- **Agent Response Time**: Time from request to first response
- **Tool Call Success Rate**: Successful tool calls / total calls
- **Delegation Success Rate**: Successful delegations / total delegations
- **Phase Transition Time**: Time spent in each phase
- **LLM Token Usage**: Total tokens consumed per agent

### Telemetry Dashboard

```bash
# TENEX includes OpenTelemetry integration
# Export to Jaeger/Zipkin for visualization

# View traces:
# http://localhost:16686 (if Jaeger running)
```

---

## Troubleshooting Guide

### Issue: Agent Not Responding

**Symptoms**:
- User message sent
- No agent response after 30+ seconds

**Debug**:
```bash
# Check daemon status
ps aux | grep tenex

# Check Nostr connectivity
grep -i "relay\|connection" ~/.tenex/logs/daemon.log

# Check agent registry
bun run start agent list --project <naddr>
```

**Common Fixes**:
- Restart daemon
- Check relay URLs in config
- Verify API keys
- Check network connectivity

### Issue: Tool Execution Fails

**Symptoms**:
- Agent tries to use tool
- Tool returns error
- Task incomplete

**Debug**:
```bash
# Check tool errors
grep -i "tool.*error\|tool.*fail" ~/.tenex/logs/daemon.log

# Check file permissions
ls -la /path/to/file

# Check git status
git status
```

**Common Fixes**:
- Verify file paths are absolute
- Check file permissions
- Ensure git repo is initialized
- Verify working directory

### Issue: Delegation Timeout

**Symptoms**:
- Agent delegates to another agent
- No response received
- Timeout error after 60 seconds

**Debug**:
```bash
# Check delegation registry
grep -i "delegation.*timeout\|delegation.*waiting" ~/.tenex/logs/daemon.log

# Check recipient agent status
bun run start agent list --project <naddr>
```

**Common Fixes**:
- Verify recipient agent is loaded
- Check recipient agent's Nostr identity
- Increase timeout in config
- Check Nostr relay connectivity

---

## Performance Testing

### Load Test: Multiple Concurrent Conversations

```bash
# Simulate multiple users
# (Requires multiple Nostr clients)

# Test plan:
1. Create 5 concurrent conversations
2. Each sends: "Create a simple function"
3. Monitor system resources
4. Verify all complete successfully

# Metrics:
- CPU usage
- Memory usage
- Response times
- Success rate
```

### Stress Test: Large Codebase Operations

```bash
# Test with large operations
User: "Analyze and refactor this 10,000 line codebase"

# Monitor:
- Token usage
- Processing time
- Memory consumption
- Tool call frequency

# Verify:
✅ System remains stable
✅ Doesn't crash or hang
✅ Completes successfully (may take time)
```

---

## Validation Checklist

After running all test workflows:

### Core Functionality
- [ ] Daemon starts successfully
- [ ] Agents load from Nostr
- [ ] Agent registry populated
- [ ] Configuration loaded correctly

### Agent Coordination
- [ ] PM routes requests correctly
- [ ] Delegations work (blocking mode)
- [ ] Pair mode works correctly
- [ ] Phase transitions work
- [ ] Self-delegation works with phase

### Tool Execution
- [ ] File operations work
- [ ] Git operations work
- [ ] Shell execution works
- [ ] Delegation tool works
- [ ] Phase management tools work

### Communication
- [ ] Nostr events published
- [ ] Nostr events received
- [ ] Conversation threading works
- [ ] Context retained across turns

### Error Handling
- [ ] Invalid delegations caught
- [ ] Tool failures handled gracefully
- [ ] Network failures recovered
- [ ] Errors logged appropriately

### Advanced Features
- [ ] Worktrees created successfully
- [ ] RAG retrieval works
- [ ] Multi-LLM configuration works
- [ ] Telemetry data collected

---

## Next Steps

Once all tests pass:

1. **Production Readiness**
   - Set up monitoring
   - Configure alerts
   - Set up backups
   - Document runbooks

2. **Customization**
   - Create custom agents
   - Define custom phases
   - Add custom tools
   - Configure MCP servers

3. **Optimization**
   - Tune LLM selection
   - Optimize token usage
   - Configure caching
   - Tune performance parameters

4. **Scale**
   - Add more agents
   - Handle more projects
   - Increase concurrency
   - Optimize resource usage

---

## Support & Resources

- **Logs**: `~/.tenex/logs/daemon.log`
- **Config**: `~/.tenex/config/config.json`
- **Agent Storage**: `~/.tenex/agents/`
- **Project Data**: `~/.tenex/projects/`

**Report Issues**: https://github.com/tenex-chat/tenex/issues

**Community**: Check the Nostr network for TENEX discussions
