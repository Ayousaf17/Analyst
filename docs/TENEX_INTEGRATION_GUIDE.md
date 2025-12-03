# Tenex Integration Guide

This guide explains how to integrate the [tenex multi-agent AI platform](https://github.com/tenex-chat/tenex) with your n8n workflows.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ n8n Workflow (SW3)                                              │
│                                                                 │
│ Calculate Analytics                                             │
│        │                                                        │
│        ▼                                                        │
│ ┌─────────────────────┐                                         │
│ │ Tenex Generate      │──────────┐                              │
│ │ Insights (HTTP)     │          │                              │
│ └─────────────────────┘          │                              │
│        │                         ▼                              │
│        │ success        ┌─────────────────────┐                 │
│        ▼                │ Fallback AI         │                 │
│ ┌─────────────────┐     │ (OpenRouter/Claude) │                 │
│ │ Extract Output  │     └─────────────────────┘                 │
│ └─────────────────┘              │                              │
│        │                         │                              │
│        └──────────┬──────────────┘                              │
│                   ▼                                             │
│           Format Output                                         │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Tenex Bridge Service (localhost:3001)                           │
│                                                                 │
│ POST /analyze     → Execute tenex multi-agent analysis          │
│ POST /verify      → Verify/validate AI outputs                  │
│ POST /multi-phase → Run Plan → Execute → Verify cycle           │
│ GET  /health      → Health check                                │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Tenex Platform                                                  │
│                                                                 │
│ Multi-Agent System:                                             │
│ • Planning Agent  - Creates analysis strategy                   │
│ • Execution Agent - Performs the analysis                       │
│ • Verification Agent - Validates outputs                        │
│ • Reflection Agent - Learns from interactions                   │
│                                                                 │
│ Communication: Nostr Protocol (decentralized)                   │
│ Storage: Persistent learning across sessions                    │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+ or Bun runtime
- Git
- LLM API key (OpenAI, Anthropic, or OpenRouter)
- n8n instance with existing SW3 workflow

## Installation

### Step 1: Clone Tenex

```bash
cd /home/user/Analyst
git clone https://github.com/tenex-chat/tenex
cd tenex
bun install
```

### Step 2: Configure Tenex LLM

```bash
bun run setup:llm
```

Select your LLM provider and enter your API key. Recommended: Use the same OpenRouter key from your n8n workflows.

### Step 3: Start the Bridge Service

```bash
cd /home/user/Analyst/tenex-bridge
bun install
bun run start
```

The bridge will start on `http://localhost:3001`.

### Step 4: Configure n8n Variable

In your n8n instance, add an environment variable:

```
TENEX_BRIDGE_URL=http://localhost:3001
```

Or set it in your n8n settings under Variables.

### Step 5: Import the New Workflow

1. Open n8n
2. Import `workflows/SW3_Analytics_Insights_Tenex.json`
3. Update the `SW3_AnalyticsInsights` tool in your Router workflow to point to this new workflow
4. Test with a simple query

## Workflow Changes

The modified SW3 workflow includes:

| Node | Purpose |
|------|---------|
| `Tenex Generate Insights` | HTTP call to tenex bridge for multi-agent analysis |
| `Tenex Success?` | Checks if tenex returned successfully |
| `Extract Tenex Output` | Parses successful tenex response |
| `Fallback AI Generate Insights` | Original Claude AI as fallback |
| `Extract Fallback Output` | Parses fallback AI response |
| `Merge Insights` | Combines outputs from either path |

### Fallback Behavior

If tenex is unavailable (bridge down, timeout, error), the workflow automatically falls back to the original OpenRouter/Claude AI node. This ensures production reliability.

## Bridge API Reference

### POST /analyze

Main endpoint for running tenex analysis.

**Request:**
```json
{
  "data": { /* analytics data */ },
  "prompt": "Analyze this ticket data...",
  "phase": "execute",
  "systemContext": "You are an operations analyst..."
}
```

**Response:**
```json
{
  "success": true,
  "output": "## Analysis Results\n...",
  "phase": "execute",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /verify

Validate AI outputs for accuracy.

**Request:**
```json
{
  "originalData": { /* source data */ },
  "aiOutput": "The analysis text to verify...",
  "validationRules": [
    "Check all numbers match source data",
    "Verify no hallucinated information"
  ]
}
```

### POST /multi-phase

Run multi-phase analysis (Plan → Execute → Verify).

**Request:**
```json
{
  "data": { /* analytics data */ },
  "prompt": "Comprehensive analysis needed",
  "phases": ["plan", "execute", "verification"]
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "tenex-bridge",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenexPath": "../tenex"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TENEX_BRIDGE_PORT` | `3001` | Port for the bridge service |
| `TENEX_PATH` | `../tenex` | Path to tenex installation |
| `TENEX_TIMEOUT` | `120000` | Timeout in ms for tenex commands |

## Running as a Service

### Using PM2

```bash
npm install -g pm2
cd /home/user/Analyst/tenex-bridge
pm2 start "bun run start" --name tenex-bridge
pm2 save
```

### Using Docker

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  tenex-bridge:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - TENEX_PATH=/app/tenex
      - TENEX_BRIDGE_PORT=3001
    volumes:
      - ../tenex:/app/tenex
```

## Troubleshooting

### Bridge not responding
1. Check if bridge is running: `curl http://localhost:3001/health`
2. Check logs: `bun run start` in terminal to see errors
3. Verify tenex path is correct

### Tenex command failing
1. Run tenex directly: `cd tenex && bun run tenex debug chat --message "test"`
2. Check LLM configuration: `bun run setup:llm`
3. Verify API keys are valid

### Fallback always triggered
1. Check n8n variable `TENEX_BRIDGE_URL` is set
2. Verify bridge is accessible from n8n container/server
3. Increase timeout if analysis is slow

## Benefits of Tenex Integration

1. **Multi-Agent Reasoning**: Specialized agents for planning, execution, and verification
2. **Continuous Learning**: Tenex stores successful patterns via Nostr for future reference
3. **Phase-Based Workflow**: Structured lifecycle ensures quality outputs
4. **Fallback Safety**: Original AI remains as backup for production reliability
5. **Decentralized**: No central server dependency (uses Nostr protocol)

## Next Steps

- [ ] Add verification phase for critical reports
- [ ] Enable multi-phase analysis for complex queries
- [ ] Configure Nostr relays for persistent learning
- [ ] Add caching layer for repeated queries
