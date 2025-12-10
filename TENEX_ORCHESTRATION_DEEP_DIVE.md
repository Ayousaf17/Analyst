# TENEX Multi-Agent Orchestration - Technical Deep Dive

This document provides an in-depth technical analysis of how TENEX orchestrates multi-agent collaboration, focusing on the coordination mechanisms, communication protocols, and execution flows.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent Orchestration Flow](#agent-orchestration-flow)
3. [Communication Protocol](#communication-protocol)
4. [Delegation Mechanism](#delegation-mechanism)
5. [Phase Management](#phase-management)
6. [Tool Execution Framework](#tool-execution-framework)
7. [State Management](#state-management)
8. [Advanced Coordination Patterns](#advanced-coordination-patterns)

---

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│                  (Web Client / iOS Client)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓ Nostr Events
┌─────────────────────────────────────────────────────────────┐
│                      Entry Point Layer                       │
│                   src/tenex.ts (CLI Entry)                   │
│                  src/daemon (Daemon Process)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Orchestration Layer                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           ConversationCoordinator                    │   │
│  │  - Manages conversation lifecycle                    │   │
│  │  - Routes events to agents                           │   │
│  │  - Maintains conversation state                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Agent Runtime Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AgentRegistry│  │SessionManager│  │AgentSupervisor│     │
│  │              │  │              │  │              │      │
│  │ - Loads      │  │ - Manages    │  │ - Executes   │      │
│  │   agents     │  │   sessions   │  │   agents     │      │
│  │ - Provides   │  │ - Tracks     │  │ - Monitors   │      │
│  │   instances  │  │   context    │  │   execution  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Delegation    │  │ToolExecution │  │LLMOperations │      │
│  │Service       │  │Tracker       │  │Registry      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Nostr Protocol│  │LLM Providers │  │Tool Impls    │      │
│  │(NDK)         │  │(OpenAI, etc) │  │(File, Git)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent Orchestration Flow

### Complete Request Lifecycle

```
1. USER REQUEST
   │
   ├─> User sends message via Web Client
   │   - Message contains: content, optional context
   │   - Published as Nostr event (kind: custom)
   │   - Tagged with: project, conversation
   │
   ↓
2. EVENT RECEPTION
   │
   ├─> Daemon receives Nostr event
   │   Location: src/daemon/event-handler.ts
   │   - Validates event signature
   │   - Checks whitelist (if configured)
   │   - Identifies target project
   │
   ↓
3. PROJECT ROUTING
   │
   ├─> ProjectContext loaded
   │   Location: src/services/ProjectContext.ts
   │   - Loads project configuration
   │   - Initializes AgentRegistry for project
   │   - Loads all project agents from storage
   │
   ↓
4. CONVERSATION COORDINATION
   │
   ├─> ConversationCoordinator handles event
   │   Location: src/conversations/ConversationCoordinator.ts
   │   - Creates or retrieves conversation
   │   - Determines target agent (usually PM)
   │   - Builds execution context
   │
   ↓
5. AGENT SELECTION
   │
   ├─> AgentRegistry.getProjectPM()
   │   Location: src/agents/AgentRegistry.ts
   │   - Returns first agent (PM) for project
   │   - PM is responsible for routing
   │
   ↓
6. AGENT EXECUTION
   │
   ├─> AgentSupervisor.execute()
   │   Location: src/agents/execution/AgentSupervisor.ts
   │
   │   Phase 1: PROMPT COMPOSITION
   │   ├─> SystemPromptBuilder.build()
   │   │   Location: src/prompts/utils/systemPromptBuilder.ts
   │   │   - Combines fragments (identity, role, phase, tools)
   │   │   - Includes conversation history
   │   │   - Adds phase-specific instructions
   │   │
   │   Phase 2: LLM INVOCATION
   │   ├─> LLMService.generateText()
   │   │   Location: src/llm/LLMService.ts
   │   │   - Calls configured LLM provider
   │   │   - Streams response tokens
   │   │   - Handles tool calls
   │   │
   │   Phase 3: TOOL EXECUTION
   │   ├─> ToolExecutionTracker.execute()
   │   │   Location: src/agents/execution/ToolExecutionTracker.ts
   │   │   - Validates tool call
   │   │   - Executes tool implementation
   │   │   - Returns result to LLM
   │   │   - Continues until completion
   │   │
   │   Phase 4: RESPONSE HANDLING
   │   └─> Response processing
   │       - If delegation: DelegationService.execute()
   │       - If ask: AgentPublisher.ask()
   │       - If final: Publish to user
   │
   ↓
7. DELEGATION (if needed)
   │
   ├─> DelegationService.execute()
   │   Location: src/services/delegation/DelegationService.ts
   │
   │   Step 1: Validate delegations
   │   ├─> Check for self-delegation (requires phase)
   │   ├─> Validate recipients exist
   │   │
   │   Step 2: Create worktrees (if requested)
   │   ├─> For each delegation with branch:
   │   │   └─> createWorktree()
   │   │       - Creates git worktree
   │   │       - Tracks in metadata
   │   │
   │   Step 3: Publish delegation events
   │   ├─> AgentPublisher.delegate()
   │   │   - Creates delegation events
   │   │   - Tags with recipient, phase, context
   │   │   - Publishes to Nostr
   │   │   - Registers in DelegationRegistry
   │   │
   │   Step 4: Wait for responses (blocking mode)
   │   ├─> DelegationRegistry.waitForBatch()
   │   │   - Subscribes to response events
   │   │   - Collects all responses
   │   │   - Times out after configured duration
   │   │
   │   Step 5: Return responses
   │   └─> Compile DelegationResponses
   │       - Aggregate all responses
   │       - Include worktree info
   │       - Return to delegating agent
   │
   ↓
8. RECIPIENT AGENT EXECUTION
   │
   ├─> Same flow as step 6, but for recipient agent
   │   - Recipient receives delegation event
   │   - Executes with phase context
   │   - Uses tools to complete task
   │   - Publishes response
   │
   ↓
9. RESPONSE AGGREGATION
   │
   ├─> PM receives all responses
   │   - Analyzes results
   │   - Determines next step
   │   - May delegate further
   │   - Or respond to user
   │
   ↓
10. USER RESPONSE
    │
    └─> Final response published
        - PM compiles final answer
        - Published as Nostr event
        - Appears in Web Client
        - Conversation history updated
```

---

## Communication Protocol

### Nostr Event Structure

All agent communication uses Nostr events. TENEX defines custom event kinds and tag structures.

#### Agent Definition Event (Kind: 4199)

```typescript
{
  kind: 4199,
  pubkey: "agent-public-key-hex",
  created_at: timestamp,
  content: "",  // Empty for agent definitions
  tags: [
    ["title", "Agent Name"],
    ["description", "One-line description"],
    ["role", "Expert in X, Y, Z..."],
    ["instructions", "Detailed operational guidelines"],
    ["use-criteria", "When to use this agent"],
    ["phase", "execute"],  // Optional: specific phase
    ["ver", "1"],          // Version

    // Tool assignments
    ["tool", "read_file"],
    ["tool", "write_file"],
    ["tool", "git_commit"],

    // Phase-specific instructions
    ["phase:execute", "Instructions for execute phase"],
    ["phase:verify", "Instructions for verify phase"]
  ]
}
```

#### Delegation Event (Custom Kind)

```typescript
{
  kind: DELEGATION_KIND,
  pubkey: "delegating-agent-pubkey",
  created_at: timestamp,
  content: JSON.stringify({
    delegations: [
      {
        recipient: "recipient-agent-pubkey",
        request: "Task description",
        phase: "execute",
        branch: "feature/new-work"  // Optional
      }
    ]
  }),
  tags: [
    ["e", "triggering-event-id", "reply"],    // Reply to this event
    ["e", "root-event-id", "root"],           // Thread root
    ["p", "recipient-pubkey"],                 // Recipient
    ["conversation", "conversation-id"],       // Conversation context
    ["project", "project-dtag"],              // Project scope
    ["phase", "execute"],                      // Current phase
    ["delegation-batch", "batch-uuid"],        // Batch identifier
    ["mode", "blocking"]                       // Execution mode
  ]
}
```

#### Response Event

```typescript
{
  kind: RESPONSE_KIND,
  pubkey: "responding-agent-pubkey",
  created_at: timestamp,
  content: "Response text with results...",
  tags: [
    ["e", "delegation-event-id", "reply"],     // Reply to delegation
    ["e", "root-event-id", "root"],            // Thread root
    ["p", "delegating-agent-pubkey"],          // Back to delegator
    ["conversation", "conversation-id"],       // Same conversation
    ["delegation-batch", "batch-uuid"],        // Same batch
    ["delegation-response", "1"]               // Marks as response
  ]
}
```

### Event Flow Diagram

```
User
  │
  ├─> [User Message Event]
  │   tags: [project, conversation]
  │
  ↓
PM Agent
  │
  ├─> Processes message
  ├─> Decides to delegate
  │
  ├─> [Delegation Event]
  │   tags: [recipient=Executor, phase=execute, batch-id]
  │
  ↓
Executor Agent
  │
  ├─> Receives delegation
  ├─> Executes task
  ├─> Uses tools (file_write, git_commit)
  │
  ├─> [Response Event]
  │   tags: [reply-to=delegation-id, batch-id]
  │   content: "Task completed. Created file X, committed Y"
  │
  ↓
PM Agent
  │
  ├─> Receives response
  ├─> Aggregates results
  │
  ├─> [User Response Event]
  │   tags: [reply-to=user-message, conversation]
  │   content: "Task completed successfully"
  │
  ↓
User
```

---

## Delegation Mechanism

### DelegationService Deep Dive

**Location**: `src/services/delegation/DelegationService.ts`

#### Key Components

1. **DelegationRegistry**
   ```typescript
   class DelegationRegistry {
     // Tracks active delegation batches
     private activeBatches: Map<string, DelegationBatch>

     // Registers a new batch
     registerBatch(batchId: string, delegations: Delegation[]): void

     // Records a response
     recordResponse(batchId: string, response: Response): void

     // Waits for all responses (blocking mode)
     async waitForBatch(batchId: string): Promise<Response[]>

     // Checks batch status
     getBatchStatus(batchId: string): BatchStatus
   }
   ```

2. **Batch Lifecycle**
   ```
   CREATE
     │
     ├─> Generate unique batch ID (UUID)
     ├─> Register batch in registry
     ├─> Store expected response count
     │
   PUBLISH
     │
     ├─> For each delegation:
     │   ├─> Create delegation event
     │   ├─> Tag with batch ID
     │   ├─> Publish to Nostr
     │
   WAIT (Blocking Mode)
     │
     ├─> Subscribe to response events with batch ID
     ├─> Collect responses as they arrive
     ├─> Check if all expected responses received
     ├─> Timeout after configured duration (default: 60s)
     │
   COMPLETE
     │
     └─> Return aggregated responses
         └─> Unregister batch from registry
   ```

3. **Pair Mode Flow**
   ```
   DELEGATION (mode: pair)
     │
     ├─> Publish delegation with pair mode flag
     │
   EXECUTION
     │
     ├─> Recipient executes normally
     ├─> After N tool calls (checkInFrequency):
     │   │
     │   ├─> Agent sends CHECK_IN event
     │   │   content: "Completed steps X, Y, Z. Continue?"
     │   │   tags: [action=CHECK_IN, batch-id]
     │   │
     │   └─> Wait for user response
     │
   USER DECISION
     │
     ├─> User receives notification
     ├─> User chooses:
     │   ├─> CONTINUE: Agent resumes
     │   ├─> STOP: Agent saves and aborts
     │   └─> FEEDBACK: Agent receives guidance
     │
   COMPLETION
     │
     └─> If CONTINUE: Repeat until done
         └─> If STOP: Return partial results with abort flag
   ```

#### Self-Delegation Logic

**Purpose**: Enable phase transitions

```typescript
// In DelegationService.execute()

// Check for self-delegation
const selfDelegationAttempts = intent.delegations.filter(
  d => d.recipient === this.agent.pubkey
);

if (selfDelegationAttempts.length > 0) {
  const hasPhase = selfDelegationAttempts.some(d => d.phase);

  if (!hasPhase) {
    // ❌ REJECT: Self-delegation without phase
    throw new Error(
      "Self-delegation is not permitted without specifying a phase"
    );
  }

  // ✅ ALLOW: Self-delegation with phase (phase transition)
  logger.info("Agent delegating to itself via phase transition", {
    fromPhase: currentPhase,
    toPhase: selfDelegationAttempts[0].phase
  });
}
```

**Why?**
- Prevents infinite loops (agent delegating to itself endlessly)
- Allows intentional phase transitions
- Phase change provides new context and instructions

---

## Phase Management

### Phase System Architecture

**Phases** provide contextual instructions that modify agent behavior.

#### Phase Definition

```typescript
interface AgentPhases {
  [phaseName: string]: string;  // Phase name → Instructions
}

// Example
{
  "plan": "Create a detailed implementation plan...",
  "execute": "Implement the solution with tests...",
  "verify": "Run tests and validate quality...",
  "chores": "Update documentation and clean up...",
  "reflection": "Capture lessons learned..."
}
```

#### Phase Application

**Location**: `src/prompts/fragments/05-agent-phases.ts`

When an agent is in a phase:
1. Phase instructions are added to system prompt
2. Agent behavior adapts to phase context
3. Tool usage may be restricted (e.g., no file writes in "plan" phase)

#### Phase Tools

```typescript
// Add a new phase
phase_add({
  phase: "design",
  instructions: "Create UI/UX mockups and user flows..."
})

// Remove a phase
phase_remove({
  phase: "old-phase"
})

// Transition to a phase (via self-delegation)
delegate({
  recipient: "self",
  request: "Execute the plan",
  phase: "execute"
})
```

#### Phase Inheritance

```
Project Level Phases
  │
  ├─> Defined by PM agent
  ├─> Stored in agent.phases
  │
  ↓
Agent-Specific Phases
  │
  ├─> Each agent can have phase-specific instructions
  ├─> Inherited from agent definition (Nostr event)
  │
  ↓
Delegation Phase
  │
  └─> Explicitly specified in delegation
      └─> Overrides current phase for that task
```

**Example**:
```typescript
// PM has phases: plan, execute, verify
PM.phases = {
  plan: "Create structured plans",
  execute: "Implement solutions",
  verify: "Ensure quality"
}

// PM delegates to Developer with phase
delegate({
  recipient: "developer-pubkey",
  phase: "execute",  // Developer will use "execute" phase context
  request: "Implement the API"
})

// Developer receives:
// - PM's request: "Implement the API"
// - Phase instructions: "Implement solutions" (from PM.phases.execute)
```

---

## Tool Execution Framework

### Tool Registry

**Location**: `src/tools/ToolRegistry.ts`

All available tools are registered:

```typescript
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAgentTools(agent: AgentInstance): ToolDefinition[] {
    return agent.tools
      .map(name => this.tools.get(name))
      .filter(Boolean);
  }
}
```

### Tool Execution Flow

```
LLM GENERATES TOOL CALL
  │
  ├─> {
  │     name: "read_file",
  │     parameters: { path: "/path/to/file.txt" }
  │   }
  │
  ↓
VALIDATION
  │
  ├─> ToolExecutionTracker.execute()
  │
  │   1. Check tool is assigned to agent
  │   ├─> agent.tools.includes("read_file") ?
  │   │   ✅ Yes: Continue
  │   │   ❌ No: Error "Tool not available"
  │   │
  │   2. Validate parameters
  │   ├─> Zod schema validation
  │   │   ✅ Valid: Continue
  │   │   ❌ Invalid: Error "Invalid parameters"
  │
  ↓
EXECUTION
  │
  ├─> Load tool implementation
  │   Location: src/tools/implementations/read_file.ts
  │
  ├─> Execute tool
  │   const result = await toolImpl.execute(parameters, context)
  │
  ├─> Handle result
  │   ✅ Success: Return result to LLM
  │   ❌ Error: Return error message to LLM
  │
  ↓
CONTINUATION
  │
  └─> LLM receives result
      ├─> Processes result
      ├─> May call more tools
      └─> Eventually returns final response
```

### Key Tool Categories

#### 1. File Operations

```typescript
// read_file
await read_file({ path: "/path/to/file.txt" })
// Returns: file content

// write_file
await write_file({
  path: "/path/to/file.txt",
  content: "File content"
})

// edit_file (structured edits)
await edit_file({
  path: "/path/to/file.txt",
  edits: [
    { line: 10, action: "replace", content: "new line" }
  ]
})
```

#### 2. Git Operations

```typescript
// git_status
await git_status()
// Returns: current status, staged files, etc.

// git_commit
await git_commit({
  message: "feat: Add new feature",
  files: ["src/file.ts"]
})

// git_branch
await git_branch({
  name: "feature/new-branch",
  checkout: true
})
```

#### 3. Shell Execution

```typescript
// shell_execute
await shell_execute({
  command: "npm test",
  cwd: "/project/path"
})
// Returns: stdout, stderr, exit code
```

#### 4. Delegation Tools

```typescript
// delegate (targeted delegation)
await delegate({
  delegations: [{
    recipient: "agent-pubkey",
    request: "Do something",
    phase: "execute",
    branch: "feature/branch"  // Optional
  }],
  mode: "blocking"  // or "pair"
})

// ask (broadcast to all agents)
await ask({
  content: "Who can help with this?",
  suggestions: ["Try X", "Consider Y"]
})
```

#### 5. Phase Management Tools

```typescript
// phase_add
await phase_add({
  phase: "design",
  instructions: "Create UI mockups..."
})

// phase_remove
await phase_remove({
  phase: "old-phase"
})
```

---

## State Management

### Conversation State

**Location**: `src/conversations/ConversationCoordinator.ts`

```typescript
interface Conversation {
  id: string;                    // Unique conversation ID
  projectDTag: string;           // Project identifier
  history: NDKEvent[];           // All events in order
  currentPhase?: string;         // Active phase
  participants: Set<string>;     // Agent pubkeys
  metadata: ConversationMetadata;
}

class ConversationCoordinator {
  private conversations: Map<string, Conversation> = new Map();

  // Creates or retrieves conversation
  getConversation(id: string): Conversation;

  // Adds event to history
  addEvent(conversationId: string, event: NDKEvent): void;

  // Gets formatted history for LLM
  getFormattedHistory(conversationId: string, agent: AgentInstance): Message[];
}
```

### Agent State

Each agent maintains:

1. **Runtime State** (ephemeral, in memory)
   ```typescript
   class AgentInstance {
     pubkey: string;
     name: string;
     slug: string;
     currentPhase?: string;
     activeSessions: Map<string, Session>;
   }
   ```

2. **Persistent State** (stored on disk)
   ```typescript
   interface StoredAgent {
     pubkey: string;
     nsec: string;          // Private key
     slug: string;
     name: string;
     role: string;
     tools: string[];
     llmConfig: string;
     phases: { [phase: string]: string };
     projects: string[];    // Associated project dTags
   }
   ```

### Project State

**Location**: `~/.tenex/projects/<dTag>/`

```
<dTag>/
├── config.json           # Project configuration
├── conversations/        # Conversation histories
│   └── <conv-id>.json
├── worktrees.json       # Worktree tracking
└── metadata.json        # Additional metadata
```

---

## Advanced Coordination Patterns

### Pattern 1: Hierarchical Delegation

PM delegates to specialists, who may delegate further:

```
User
  │
  ↓
PM (Project Manager)
  │
  ├─> Planner: "Create plan"
  │   └─> Returns: Detailed plan
  │
  ├─> Architect: "Design system"
  │   ├─> Frontend Specialist: "Design UI"
  │   └─> Backend Specialist: "Design API"
  │
  └─> PM: "Execute based on plan and design"
      ├─> Developer: "Implement frontend"
      ├─> Developer: "Implement backend"
      ├─> Verifier: "Test everything"
      └─> Documentation: "Update docs"
```

### Pattern 2: Parallel Execution with Worktrees

Multiple agents work simultaneously on different branches:

```
PM
  │
  ├─> [Delegation Batch]
  │   ├─> Agent A: branch=feature/frontend
  │   ├─> Agent B: branch=feature/backend
  │   └─> Agent C: branch=feature/tests
  │
  ├─> System creates 3 worktrees
  │
  ├─> All agents execute in parallel
  │   ├─> Agent A: Implements UI
  │   ├─> Agent B: Implements API
  │   └─> Agent C: Writes tests
  │
  └─> PM receives all results
      └─> Coordinates merging
```

### Pattern 3: Iterative Refinement (Pair Mode)

Agent and user collaborate iteratively:

```
User: "Refactor the authentication system"
  │
  ↓
PM → Developer (mode: pair)
  │
  ├─> Developer: Step 1-3 (analyze, plan, start impl)
  ├─> CHECK_IN: "Analyzed auth system, found issues X, Y, Z. Plan to refactor to pattern P. Proceed?"
  │
  ├─> User: "Yes, but also address issue W"
  │
  ├─> Developer: Step 4-6 (refactor + issue W)
  ├─> CHECK_IN: "Refactored to pattern P, addressed W. Tests passing. Shall I update docs?"
  │
  ├─> User: "Yes, and add migration guide"
  │
  ├─> Developer: Step 7-9 (docs + migration)
  └─> COMPLETE: "All done. Docs and migration guide added."
```

### Pattern 4: Broadcast Query (Ask Pattern)

Find the right agent for a task:

```
PM receives complex request: "Optimize database queries"
  │
  ├─> PM: Not sure which agent to delegate to
  │
  ├─> PM uses 'ask' tool
  │   {
  │     content: "Who has experience optimizing database queries?",
  │     suggestions: ["Check DB specialist", "Ask backend team"]
  │   }
  │
  ├─> Broadcast to all agents
  │
  ├─> Responses:
  │   ├─> DB Specialist: "I can help. I'm specialized in SQL optimization."
  │   ├─> Backend Dev: "I have some experience, but DB Specialist is better."
  │   └─> (no other responses)
  │
  └─> PM: Selects DB Specialist for delegation
```

### Pattern 5: Phase Pipeline

Task flows through phases sequentially:

```
Task: "Add user registration feature"

CHAT phase (PM)
  ├─> Understand requirements
  ├─> Clarify with user
  └─> Transition to PLAN

PLAN phase (PM → Planner or PM self-delegates)
  ├─> Create implementation plan
  ├─> Define steps, files, tests
  └─> Transition to EXECUTE

EXECUTE phase (PM → Developer)
  ├─> Implement user model
  ├─> Implement registration API
  ├─> Write unit tests
  └─> Transition to VERIFICATION

VERIFICATION phase (PM → Verifier)
  ├─> Run tests
  ├─> Check code quality
  ├─> Validate requirements
  └─> Transition to CHORES

CHORES phase (PM → Documentation)
  ├─> Update API docs
  ├─> Update README
  ├─> Add usage examples
  └─> Transition to REFLECTION

REFLECTION phase (PM → Reflection Agent)
  ├─> Capture lessons
  ├─> Update knowledge base
  └─> Complete

User receives: "Feature complete!"
```

---

## Performance Optimizations

### 1. Event Caching

```typescript
// Cache frequently accessed events
class EventCache {
  private cache = new LRU<string, NDKEvent>({ max: 1000 });

  get(eventId: string): NDKEvent | undefined {
    return this.cache.get(eventId);
  }

  set(eventId: string, event: NDKEvent): void {
    this.cache.set(eventId, event);
  }
}
```

### 2. Lazy Agent Loading

```typescript
// Only load agents when needed
class AgentRegistry {
  private loadedAgents = new Set<string>();

  async ensureAgentLoaded(slug: string): Promise<void> {
    if (!this.loadedAgents.has(slug)) {
      await this.loadAgent(slug);
      this.loadedAgents.add(slug);
    }
  }
}
```

### 3. Batch Event Processing

```typescript
// Process multiple events together
class EventProcessor {
  private eventQueue: NDKEvent[] = [];

  queueEvent(event: NDKEvent): void {
    this.eventQueue.push(event);
    this.scheduleProcessing();
  }

  private scheduleProcessing(): void {
    // Debounced processing every 100ms
    this.processBatch(this.eventQueue.splice(0));
  }
}
```

---

## Security Considerations

### 1. Signature Verification

All Nostr events must have valid signatures:

```typescript
// Verify event signature
async function verifyEvent(event: NDKEvent): Promise<boolean> {
  return await event.verifySignature();
}
```

### 2. Whitelist Enforcement

Optional pubkey whitelist restricts who can interact:

```typescript
// Check whitelist
if (config.whitelistedPubkeys.length > 0) {
  if (!config.whitelistedPubkeys.includes(event.pubkey)) {
    logger.warn("Event from non-whitelisted pubkey", { pubkey: event.pubkey });
    return; // Ignore event
  }
}
```

### 3. Tool Permission Boundaries

Agents can only use assigned tools:

```typescript
// Validate tool access
if (!agent.tools.includes(toolName)) {
  throw new Error(`Agent ${agent.slug} does not have access to tool ${toolName}`);
}
```

### 4. Worktree Isolation

Each worktree is isolated to prevent conflicts:

```typescript
// Create isolated worktree
const worktreePath = await createWorktree(
  projectPath,
  branchName,
  baseBranch
);

// Worktrees are in separate directories
// No risk of conflicting file edits
```

---

## Conclusion

TENEX's multi-agent orchestration is built on several key principles:

1. **Event-Driven**: All communication via Nostr events
2. **Decentralized**: No central coordinator, peer-to-peer
3. **Phase-Based**: Structured workflow ensures quality
4. **Tool-Enabled**: Rich capabilities through tool system
5. **Extensible**: Easy to add new agents, tools, phases

The system's power comes from:
- **Intelligent routing** by PM agents
- **Delegation mechanism** for task distribution
- **Phase system** for contextual execution
- **Worktrees** for parallel development
- **Pair mode** for interactive collaboration

This architecture enables truly autonomous multi-agent collaboration while maintaining quality, security, and user control.
