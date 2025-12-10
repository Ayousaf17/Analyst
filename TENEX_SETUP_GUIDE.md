# TENEX Multi-Agent System - Complete Setup Guide

## Overview

TENEX is a sophisticated **multi-agent coordination system** built on the Nostr protocol that enables autonomous AI agents to collaborate on complex software development tasks through intelligent routing, phase-based workflows, and continuous learning.

### Key Innovation: Context-First Development

Unlike traditional AI assistants where you interact with a single entity, TENEX employs an **intelligent routing pattern** where requests are automatically routed to specialized agents best suited for each task.

---

## Architecture Overview

### 1. Core Components

```
src/
├── agents/         # Agent definitions and execution runtime
│   ├── AgentRegistry.ts       # In-memory runtime instances for a project
│   ├── AgentStorage.ts        # Persistent agent storage
│   ├── agent-loader.ts        # Loads agents from storage into registry
│   ├── execution/             # Agent execution framework
│   │   ├── SessionManager.ts
│   │   ├── AgentSupervisor.ts
│   │   └── ToolExecutionTracker.ts
│   └── types/                 # Agent type definitions
│
├── services/       # Business logic and orchestration
│   ├── delegation/            # Agent-to-agent delegation
│   │   ├── DelegationService.ts      # Executes delegations
│   │   ├── DelegationRegistry.ts     # Tracks active delegations
│   │   └── PairModeRegistry.ts       # Manages pair programming mode
│   ├── ConfigService.ts       # Configuration management
│   ├── SchedulerService.ts    # Background job scheduling
│   └── rag/                   # RAG (Retrieval Augmented Generation)
│
├── nostr/          # Nostr protocol integration
│   ├── AgentPublisher.ts      # Publishes agent events
│   ├── AgentEventEncoder.ts   # Encodes agent messages
│   └── ndkClient.ts           # Nostr Development Kit client
│
├── llm/            # LLM provider abstractions
│   ├── factories/             # Provider-specific factories
│   └── LLMService.ts          # Unified LLM interface
│
├── tools/          # Agent tool implementations
│   └── implementations/       # File ops, git, shell, etc.
│
├── prompts/        # System prompt composition
│   ├── fragments/             # Reusable prompt components
│   └── utils/                 # Prompt building utilities
│
├── daemon/         # Long-running background processes
│   └── TerminalInputManager.ts
│
└── tenex.ts        # Main CLI entry point
```

### 2. Agent Architecture

#### AgentInstance Structure
Each agent in TENEX has:
- **name**: Display name
- **slug**: Unique identifier (kebab-case)
- **role**: Expertise and personality
- **description**: One-liner purpose
- **instructions**: Detailed operational guidelines
- **useCriteria**: When to select this agent
- **phases**: Phase-specific instructions
- **tools**: Available capabilities
- **llmConfig**: Model configuration
- **nsec/pubkey**: Nostr identity

#### Agent Lifecycle
1. **Storage**: Agents are stored in `~/.tenex/agents/` (unified storage)
2. **Project Association**: Projects reference agents by event ID via tags
3. **Loading**: `AgentRegistry` loads agents for a project
4. **Instantiation**: `createAgentInstance()` creates runtime instances with methods
5. **Execution**: Agents receive events, process them, and respond

---

## Phase-Based Workflow

Every interaction follows a structured lifecycle:

### 1. **Chat**
Initial conversation and requirement understanding

### 2. **Plan**
Structured approach definition

### 3. **Execute**
Implementation and tool usage

### 4. **Verification**
Quality assurance and testing

### 5. **Chores**
Documentation and maintenance

### 6. **Reflection**
Learning capture and improvement

**Phases are dynamic** - Project Managers can add/remove phases using `phase_add` and `phase_remove` tools.

---

## Agent Coordination & Communication

### Delegation System

The **DelegationService** orchestrates agent-to-agent communication:

```typescript
// DelegationService workflow:
1. Agent creates delegation intent
2. Service publishes delegation event to Nostr
3. Recipient agents receive and process
4. Responses are collected and returned
5. Worktrees can be created for parallel work
```

#### Delegation Modes

**1. Blocking Mode (default)**
- Agent waits for all responses before continuing
- Synchronous execution
- Use for sequential tasks

**2. Pair Mode**
- Real-time collaboration
- Check-in points for approval
- Can abort or continue
- Use for iterative development

#### Example Delegation Flow

```typescript
// Agent A delegates to Agent B
{
  delegations: [{
    recipient: "agent-b-pubkey",
    request: "Implement authentication API",
    phase: "execute",
    branch: "feature/auth"  // Optional: creates worktree
  }]
}

// System creates worktree (if requested)
// Publishes delegation event
// Agent B receives and processes
// Agent B responds with results
// Agent A receives response and continues
```

### Self-Delegation (Phase Transitions)

Agents can delegate to themselves to transition between phases:

```typescript
{
  recipient: "self-pubkey",
  request: "Execute the plan",
  phase: "execute"  // Required for self-delegation
}
```

---

## How Agents Coordinate

### 1. Event-Based Communication

All agent communication happens through **Nostr events**:
- **Kind 4199**: Agent definitions
- **Custom kinds**: Delegation, responses, updates

### 2. Conversation Threading

- Each conversation has a unique ID
- Events are threaded using Nostr's reply chain
- `ConversationCoordinator` manages conversation state

### 3. Intelligent Routing

**Project Manager (PM) Agent** acts as the orchestrator:
- First agent in project's agent tags
- Routes requests to specialized agents
- Manages phases and workflow

### 4. Tool Execution

Agents have access to tools:
- **File operations**: read, write, edit
- **Git operations**: commit, branch, worktree
- **Shell execution**: run commands
- **Delegation**: ask other agents
- **Phase management**: add/remove phases
- **MCP integration**: Dynamic tool loading

---

## Multi-Agent Specialization

### Agent Types (Fetched from Nostr)

While agents are dynamically loaded from Nostr, typical specializations include:

1. **Project Manager (PM)**
   - Orchestrates workflow
   - Routes to specialists
   - Manages phases
   - Entry point for user requests

2. **Planner**
   - Creates structured approaches
   - Breaks down complex tasks
   - Defines execution steps

3. **Executor/Developer**
   - Implements code
   - Writes tests
   - Performs refactoring

4. **Verifier/QA**
   - Runs tests
   - Validates implementation
   - Ensures quality standards

5. **Documentation Agent**
   - Updates docs
   - Maintains README files
   - Generates API documentation

6. **Reflection Agent**
   - Captures lessons learned
   - Improves future performance
   - Maintains knowledge base

---

## Installation & Setup

### Prerequisites

- **Node.js** 18+ or **Bun** runtime (Bun recommended)
- **Git** for version control
- **API keys** for at least one LLM provider:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Google (Gemini)
  - OpenRouter
  - Ollama (local models)

### Installation Steps

```bash
# 1. Clone the repository
cd tenex
# Already cloned at: /home/user/Analyst/tenex

# 2. Install dependencies
bun install
# Note: Requires proper network access to npm registry

# 3. Build the project (optional)
bun run build

# 4. Run initial setup
bun run start daemon
# This will launch interactive setup for:
#   - LLM provider configuration
#   - API keys
#   - Whitelisted pubkeys (for Nostr access control)
```

### Configuration

TENEX uses a configuration file at `~/.tenex/config/config.json`:

```json
{
  "whitelistedPubkeys": [
    "your-nostr-pubkey-hex"
  ],
  "llms": {
    "configurations": {
      "default": {
        "provider": "anthropic",
        "model": "claude-sonnet-4",
        "apiKey": "your-api-key"
      }
    }
  },
  "relays": [
    "wss://relay.damus.io",
    "wss://relay.nostr.band"
  ]
}
```

---

## Running the System

### Start the Daemon

```bash
# Start TENEX daemon (manages all projects)
bun run start daemon

# With verbose logging
bun run start daemon --verbose

# With custom config
bun run start daemon --config /path/to/config.json
```

The daemon:
- Manages all projects in a single process
- Listens for Nostr events
- Routes requests to appropriate agents
- Maintains conversation state

### Alternative: Direct CLI

```bash
# Run the main entry point
bun run start
```

---

## Testing & Verification

### 1. Run Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch

# Run only unit tests
bun test src/**/__tests__/*.test.ts

# Run only integration tests
bun test src/**/__tests__/*.integration.test.ts
```

### 2. Type Checking

```bash
# Run type checker
bun run typecheck

# Verbose mode
bun run typecheck:verbose
```

### 3. Linting

```bash
# Run linter
bun run lint

# Auto-fix issues
bun run lint:fix

# Architecture linting
bun run lint:architecture
```

---

## Sample Test Workflow

### Creating a Test Conversation

Once the daemon is running and you have a project created via the [TENEX Web Client](https://github.com/tenex-chat/web-client):

#### Example 1: Simple Feature Request

```
User Message (via web client):
"Create a REST API endpoint for user authentication with JWT tokens"

System Flow:
1. PM Agent receives request
2. PM delegates to Planner: "Create implementation plan"
3. Planner creates structured plan
4. PM delegates to Executor with phase="execute"
5. Executor implements the code
6. PM delegates to Verifier with phase="verification"
7. Verifier runs tests and validates
8. PM delegates to Documentation Agent with phase="chores"
9. Documentation updates README and API docs
10. PM delegates to Reflection with phase="reflection"
11. Reflection captures lessons learned
```

#### Example 2: Bug Fix

```
User Message:
"Fix the authentication bug where tokens expire too quickly"

System Flow:
1. PM receives bug report
2. PM delegates to Executor: "Investigate and fix authentication token expiry"
3. Executor uses tools:
   - read_file: Check auth configuration
   - grep: Search for token expiry code
   - edit: Fix the bug
   - git: Commit changes
4. PM delegates to Verifier: "Verify the fix"
5. Verifier runs tests
6. PM responds to user with results
```

#### Example 3: Parallel Work (Worktrees)

```
User Message:
"Implement both frontend and backend for the new dashboard feature"

PM Agent creates delegations:
[
  {
    recipient: "frontend-dev-pubkey",
    request: "Implement dashboard UI",
    branch: "feature/dashboard-frontend"
  },
  {
    recipient: "backend-dev-pubkey",
    request: "Implement dashboard API",
    branch: "feature/dashboard-backend"
  }
]

System:
- Creates two worktrees (parallel branches)
- Both agents work simultaneously
- Results are merged back
```

---

## Agent Communication Examples

### 1. Simple Ask

```typescript
// Agent uses 'ask' tool
{
  type: "ask",
  content: "What is the current project structure?",
  suggestions: ["Check src/ directory", "Look at package.json"]
}

// Broadcast to all agents
// First to respond is used
```

### 2. Targeted Delegation

```typescript
// Agent uses 'delegate' tool
{
  type: "delegate",
  delegations: [{
    recipient: "specialist-agent-pubkey",
    request: "Implement feature X with these requirements...",
    phase: "execute"
  }]
}

// Sent to specific agent
// Waits for response
```

### 3. Pair Programming Mode

```typescript
// Delegation with pair mode
{
  type: "delegate",
  delegations: [{
    recipient: "developer-agent-pubkey",
    request: "Refactor the authentication system",
    phase: "execute"
  }],
  mode: "pair",
  pairConfig: {
    checkInFrequency: 3  // Check in every 3 tool calls
  }
}

// Agent works interactively
// User can approve/reject/abort at checkpoints
```

---

## Understanding the System

### How to Send Tasks

1. **Via Web Client** (Recommended)
   - Use [TENEX Web Client](https://github.com/tenex-chat/web-client)
   - Send natural language requests
   - System routes to appropriate agents

2. **Via Nostr Events**
   - Publish events directly to Nostr
   - Use project's nsec for authentication
   - Reference conversation threads

### Key Nostr Concepts

- **nsec**: Private key (secret, never share)
- **npub**: Public key (shareable identity)
- **naddr**: Nostr address (identifies entities)
- **dTag**: Unique identifier for replaceable events

### Project Structure

```
~/.tenex/
├── agents/                 # Unified agent storage
│   └── <pubkey>.json      # Agent definitions
├── projects/              # Project metadata
│   └── <dTag>/
│       ├── config.json    # Project config
│       └── conversations/ # Conversation history
└── config/
    └── config.json        # Global config
```

---

## Advanced Features

### 1. Dynamic Tool Loading (MCP)

TENEX supports Model Context Protocol for dynamic tool loading:

```typescript
// DynamicToolService manages MCP tools
await dynamicToolService.initialize();

// Tools are loaded from MCP servers
// Available to all agents
```

### 2. RAG (Retrieval Augmented Generation)

```typescript
// RAGService provides context-aware retrieval
// Uses LanceDB for vector storage
// Embeddings via @xenova/transformers
```

### 3. Worktree Management

```typescript
// Create isolated worktrees for parallel development
const worktree = await createWorktree(
  projectPath,
  "feature/new-branch",
  "main"
);

// Track worktree metadata
await trackWorktreeCreation(projectPath, {
  path: worktree,
  branch: "feature/new-branch",
  createdBy: agentPubkey,
  conversationId: conversationId
});
```

### 4. Telemetry & Observability

```typescript
// OpenTelemetry integration
// Tracks:
//   - Tool calls
//   - Agent executions
//   - Delegation flows
//   - Performance metrics
```

---

## Debugging & Troubleshooting

### Debug Commands

```bash
# Show system prompt for an agent
bun run start debug system-prompt --project <naddr> --agent <name>

# Show conversation formatter output
bun run start debug threaded-formatter <conversationId> --project <naddr>
```

### Common Issues

**1. Agent not responding**
- Check Nostr relay connectivity
- Verify agent is loaded in registry
- Check logs: `~/.tenex/logs/`

**2. Tool execution fails**
- Verify tool permissions
- Check working directory
- Review tool error messages

**3. Configuration errors**
- Run: `bun run start daemon` for interactive setup
- Verify API keys are valid
- Check config at `~/.tenex/config/config.json`

### Logging

```bash
# Enable debug logging
export LOG_LEVEL=debug
bun run start daemon --verbose

# Logs location
~/.tenex/logs/daemon.log
```

---

## Next Steps

1. **Install Dependencies** (when network access is available)
   ```bash
   bun install
   ```

2. **Run Initial Setup**
   ```bash
   bun run start daemon
   ```

3. **Create a Project**
   - Use the TENEX Web Client
   - Or use iOS client
   - Projects are Nostr events

4. **Send Your First Request**
   - Via web client: "Create a simple Hello World API"
   - Watch agents collaborate
   - See phase transitions

5. **Explore Advanced Features**
   - Try pair programming mode
   - Experiment with custom agents
   - Use worktrees for parallel development

---

## Resources

- **Main Repository**: https://github.com/tenex-chat/tenex
- **Web Client**: https://github.com/tenex-chat/web-client
- **Documentation**:
  - [Architecture](./docs/ARCHITECTURE.md)
  - [Contributing](./docs/CONTRIBUTING.md)
  - [Testing](./docs/TESTING_STATUS.md)
- **Nostr Protocol**: https://nostr.com

---

## Development Commands

```bash
# Start development
bun run start

# Build distribution
bun run build

# Run tests
bun test

# Type check
bun run typecheck

# Lint code
bun run lint
bun run lint:fix

# Architecture linting
bun run lint:architecture

# Clean build
bun run clean
```

---

## Key Takeaways

✅ **Multi-Agent**: Specialized agents work together
✅ **Phase-Based**: Structured workflow ensures quality
✅ **Nostr-Native**: Decentralized, censorship-resistant
✅ **Tool-Rich**: Comprehensive capabilities for development
✅ **LLM-Agnostic**: Works with multiple providers
✅ **Context-First**: Optimized for AI-assisted development
✅ **Continuous Learning**: Agents improve over time

**Philosophy**: "The best code is the code you don't have to write. The second best is code written by agents who learn from every line they produce."
