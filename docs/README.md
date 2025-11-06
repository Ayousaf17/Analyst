# Gorgias Terminal - Documentation Package

Complete documentation for the Slack + Gorgias AI Agent workflow.

---

## Quick Start

**New to the project?** Start here:
1. Read [`CLAUDE_START_HERE.md`](CLAUDE_START_HERE.md) - 5 minute overview
2. Skim [`ARCHITECTURE.md`](ARCHITECTURE.md) - Comprehensive reference
3. Check [`NODE_MAP.json`](NODE_MAP.json) - Physical locations

**Need to debug?** → [`docs/DEBUGGING.md`](docs/DEBUGGING.md)  
**Adding features?** → [`docs/EXTENSION_GUIDE.md`](docs/EXTENSION_GUIDE.md)  
**Node details?** → [`docs/NODE_REFERENCE.md`](docs/NODE_REFERENCE.md)

---

## File Structure

```
gorgias-terminal/
├── README.md                      # This file
├── ARCHITECTURE.md                # Comprehensive technical reference (~8000 lines)
├── CLAUDE_START_HERE.md           # Quick start guide (~500 lines)
├── NODE_MAP.json                  # Node metadata and physical locations
├── workflow.json                  # n8n workflow export (your existing file)
│
├── database/
│   ├── schema.sql                 # Supabase table definitions with indexes
│   └── queries.sql                # Common debugging queries
│
├── docs/
│   ├── DEBUGGING.md               # Troubleshooting guide with examples
│   ├── EXTENSION_GUIDE.md         # How to add new features
│   └── NODE_REFERENCE.md          # Detailed documentation for all 54 nodes
│
└── nodes/                         # (Optional) Extracted node code
    ├── parse-slack.js             # Extract from workflow.json
    ├── build-openai-request.js
    ├── handle-plan-response.js
    ├── client-side-filter.js
    ├── calculate-metrics.js
    └── universal-formatter.js
```

---

## Documentation Overview

### Core Documentation (Required Reading)

#### [`ARCHITECTURE.md`](ARCHITECTURE.md)
**~8000 lines** | **Comprehensive Reference**

The source of truth for the entire system. Contains:
- System overview and tech stack
- Complete data flow diagrams
- All 54 nodes documented with code examples
- Database schema and relationships
- Token optimization strategies
- Performance budgets
- Extension points
- What Claude Code should/shouldn't do

**When to read**: Before making any code changes

---

#### [`CLAUDE_START_HERE.md`](CLAUDE_START_HERE.md)
**~500 lines** | **Quick Start**

10-minute overview to get oriented. Contains:
- Architecture in 10 seconds
- Core flow diagram
- Critical vs. safe files
- How to add a new action (step-by-step)
- How to debug issues
- Common tasks with examples

**When to read**: First time working with the project

---

#### [`NODE_MAP.json`](NODE_MAP.json)
**JSON** | **Physical Locations**

Machine-readable reference showing:
- All 54 nodes with IDs, types, positions
- Node categories (critical, code, HTTP, database)
- Input/output formats
- Safe vs. dangerous modifications
- Data flow paths (main, analytics, error, clarification)
- Environment variables and credentials

**When to use**: Finding a specific node, understanding connections

---

### Database Documentation

#### [`database/schema.sql`](database/schema.sql)
**~400 lines** | **Supabase Schema**

Complete database schema with:
- `agent_sessions` table (tracks commands)
- `api_logs` table (full observability)
- Indexes for performance
- Views for analytics dashboards
- Helper functions for debugging
- Triggers for auto-timestamps
- Data retention policies

**When to use**: Setting up database, adding fields, optimizing queries

---

#### [`database/queries.sql`](database/queries.sql)
**~600 lines** | **Debugging Queries**

Pre-written SQL queries for common tasks:
- Execution tracing by correlation_id
- Error analysis (last 24 hours, by node, by user)
- Performance metrics (slow queries, averages, percentiles)
- Usage analytics (commands per day, top actions, adoption)
- Ticket operations (most operated, by type)
- System health checks

**When to use**: Debugging issues, monitoring system, analyzing usage

---

### Guides & References

#### [`docs/DEBUGGING.md`](docs/DEBUGGING.md)
**~800 lines** | **Troubleshooting Guide**

Step-by-step debugging for common issues:
- Command not understood → Fix function descriptions
- Search returns wrong results → Fix filter logic
- Getting errors → Decode status codes
- Slow responses → Identify bottlenecks
- Duplicate tickets → Fix deduplication
- Analytics too slow → Optimize data fetching

Each issue includes:
- Symptoms
- Root causes
- How to debug (with SQL queries)
- How to fix (with code examples)
- Testing checklist

**When to use**: Something isn't working, need to diagnose issues

---

#### [`docs/EXTENSION_GUIDE.md`](docs/EXTENSION_GUIDE.md)
**~700 lines** | **Adding Features**

Step-by-step instructions for:
- Adding new Gorgias actions (with complete example)
- Adding client-side filters
- Adding new metrics to calculations
- Adding response formatting
- Adding error handling
- Adding workflow automations
- Adding proactive notifications

Each guide includes:
- Complete code examples
- Testing procedures
- Best practices
- Common pitfalls

**When to use**: Extending functionality, adding features

---

#### [`docs/NODE_REFERENCE.md`](docs/NODE_REFERENCE.md)
**~1000 lines** | **Complete Node Catalog**

Detailed documentation for all 54 nodes:
- Purpose and description
- Input/output formats
- Configuration details
- Code examples
- Performance characteristics
- When to modify vs. when to ask

Organized by:
- Entry & Parsing
- Intelligence Layer
- Orchestration
- Execution & Routing
- Gorgias API Nodes
- Processing & Analysis
- Response Generation
- Error Handling
- Database Operations

**When to use**: Understanding what a specific node does, modifying nodes

---

## System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                      USER (Slack)                          │
│         @Gorgias Terminal show urgent tickets              │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                   ENTRY & PARSING                          │
│  ┌──────────────┐    ┌────────────────────────────────┐   │
│  │ Slack Trigger│───▶│ Parse Slack (clean formatting) │   │
│  └──────────────┘    └──────────────┬─────────────────┘   │
└───────────────────────────────────────┼─────────────────────┘
                                        │
┌───────────────────────────────────────▼─────────────────────┐
│                INTELLIGENCE LAYER (OpenAI)                  │
│  ┌───────────────────┐   ┌──────────────────────────┐     │
│  │ Build 20+ Function│──▶│ OpenAI Function Calling  │     │
│  │   Definitions     │   │   (GPT-4.1-mini)         │     │
│  └───────────────────┘   └──────────┬───────────────┘     │
│                                     │                       │
│  ┌──────────────────────────────────▼───────────────────┐ │
│  │ Handle Plan Response (parse function call)           │ │
│  └──────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼───────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                   ORCHESTRATION LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐ │
│  │Format     │─▶│Insert     │─▶│Expand    │─▶│Split   │ │
│  │Session    │  │Session    │  │Plan      │  │Steps   │ │
│  │           │  │(Supabase) │  │          │  │(Loop)  │ │
│  └────────────┘  └────────────┘  └──────────┘  └───┬────┘ │
└─────────────────────────────────────────────────────┼──────┘
                                                      │
┌─────────────────────────────────────────────────────▼──────┐
│              EXECUTION LAYER (21-way Router)               │
│  ┌──────────────┐    ┌────────────────────────────────┐   │
│  │ Normalize   │───▶│ Route by Action (Switch)       │   │
│  │ Step        │    │                                 │   │
│  └──────────────┘    └──────┬─────────────────────────┘   │
│                             │                              │
│    ┌────────────────────────┴─────────────────────┐       │
│    │  Gorgias API Nodes (15 HTTP Request nodes)  │       │
│    │  - list_tickets    - assign_ticket          │       │
│    │  - get_ticket      - set_priority            │       │
│    │  - search_tickets  - set_status              │       │
│    │  - create_ticket   - update_tags             │       │
│    │  - reply_public    - comment_internal        │       │
│    └────────────────────────┬─────────────────────┘       │
└─────────────────────────────────────────────────┼─────────┘
                                                  │
┌─────────────────────────────────────────────────▼─────────┐
│                    LOGGING & TRACKING                      │
│  ┌─────────────┐    ┌────────────────────────────────┐   │
│  │ Format Log │───▶│ Insert api_logs (Supabase)     │   │
│  └─────────────┘    └────────────────┬───────────────┘   │
└─────────────────────────────────────────┼─────────────────┘
                                          │
┌─────────────────────────────────────────▼─────────────────┐
│              RESULTS PROCESSING PIPELINE                   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Fetch   │▶│Collect  │▶│Dedupe    │▶│Summarize    │  │
│  │ Loop    │ │Results  │ │Results   │ │for AI       │  │
│  │ Results │ └─────────┘ └──────────┘ └──────┬──────┘  │
│  └─────────┘                                  │          │
│  ┌────────────────────────────────────────────▼──────┐   │
│  │ Calculate Standard Metrics (100+ metrics in JS)  │   │
│  │ (0 tokens, ~100ms, saves $0.05-0.10/query)       │   │
│  └────────────────────────────┬──────────────────────┘   │
└─────────────────────────────────────────────┼───────────┘
                                              │
┌─────────────────────────────────────────────▼─────────────┐
│              RESPONSE GENERATION LAYER                     │
│  ┌────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │Get Action │──▶│Universal     │──▶│Conversational  │  │
│  │Emoji      │   │Table         │   │Response AI     │  │
│  │           │   │Formatter     │   │(GPT-4 +Memory) │  │
│  └────────────┘   └──────────────┘   └───────┬────────┘  │
└─────────────────────────────────────────────────┼─────────┘
                                                  │
┌─────────────────────────────────────────────────▼─────────┐
│                 FINAL SLACK REPLY                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Post formatted response with emoji + tables +       │  │
│  │ AI insights + suggested next actions               │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### 1. Function Calling Pattern
OpenAI GPT-4.1-mini uses function calling to convert natural language into structured actions:
```
"show urgent tickets" → search_tickets(priority="urgent")
```

### 2. Hybrid Filtering
- **API**: Basic text search
- **Client-Side**: Complex filters (status, priority, assignee, customer, tags, dates)
- **Why**: Gorgias API has limited filter support

### 3. Token Optimization
- **JavaScript**: Filtering, calculations, formatting (0 tokens)
- **AI**: Intent detection, natural language responses (~500-1000 tokens/query)
- **Result**: 90% cost reduction vs. sending everything to AI

### 4. Dual Intelligence
- **GPT-4.1-mini**: Fast intent detection + conversational responses (~$0.001/query)
- **Claude Sonnet 4.5**: Deep analytics only when needed (~$0.10/analysis)

### 5. Full Observability
Every API call logged to `api_logs` with:
- Request/response bodies
- Correlation ID for tracing
- Duration, status code, errors
- User context (who, where, when)

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Simple query latency | <5s | 3-5s | ✅ |
| Search with filters | <8s | 5-8s | ✅ |
| Get single ticket | <4s | 2-4s | ✅ |
| Analytics | <30s | 15-25s | ✅ |
| Token usage per query | <1000 | 500-1000 | ✅ |
| Cost per query | <$0.01 | $0.001-0.005 | ✅ |
| Error rate | <2% | TBD | ⏳ |
| Uptime | >99% | TBD | ⏳ |

---

## Environment Setup

### Required Environment Variables

```bash
# OpenAI Configuration
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TEMPERATURE_PLAN=0.1
OPENAI_MAX_TOKENS=4000

# Gorgias Configuration
GORGIAS_BASE_URL=https://ironsidecomputers.gorgias.com
```

### Required Credentials (in n8n)

1. **OpenAI API** - OpenAI account credentials
2. **Gorgias API** - HTTP Basic Auth (email + API key)
3. **Supabase** - Connection URL + API key
4. **Slack OAuth** - OAuth2 token
5. **OpenRouter** - API key (for Claude Sonnet)

---

## Database Setup

1. Create Supabase project
2. Run `database/schema.sql` to create tables
3. Verify indexes created:
```sql
SELECT * FROM pg_indexes WHERE tablename IN ('agent_sessions', 'api_logs');
```
4. Test with sample queries from `database/queries.sql`

---

## Testing

### Unit Testing
Test individual nodes in isolation:
```javascript
// Test Parse Slack
const input = { event: { text: '<@U123> show urgent tickets' } };
const result = parseSlack(input);
// Expect: user_text = "show urgent tickets"
```

### Integration Testing
Test in `#test_gorgias` Slack channel:
```
@Gorgias Terminal list tickets
@Gorgias Terminal search urgent tickets
@Gorgias Terminal get ticket 123
@Gorgias Terminal analyze insights
```

### Error Testing
```
@Gorgias Terminal get ticket 999999999  (non-existent)
@Gorgias Terminal [gibberish]
```

---

## Monitoring

### Key Metrics to Track

**System Health**:
```sql
SELECT COUNT(*) FROM agent_sessions WHERE DATE(created_at) = CURRENT_DATE;
SELECT COUNT(*) FROM api_logs WHERE error_message IS NOT NULL AND created_at > NOW() - INTERVAL '1 hour';
```

**Performance**:
```sql
SELECT node_name, AVG(duration_ms), MAX(duration_ms) FROM api_logs WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY node_name;
```

**Adoption**:
```sql
SELECT COUNT(DISTINCT user_id) FROM agent_sessions WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Command not understood | Check `Build OpenAI Request` function descriptions |
| Wrong search results | Check `Client-Side Filter` logic |
| Errors in Slack | Check `api_logs` table for error_message |
| Slow responses | Check `api_logs.duration_ms` for bottlenecks |
| Duplicates | Check `Deduplicate Results` node |

See [`docs/DEBUGGING.md`](docs/DEBUGGING.md) for detailed troubleshooting.

---

## Contributing

Before making changes:
1. Read relevant documentation
2. Test in `#test_gorgias` channel
3. Update `NODE_MAP.json` if adding nodes
4. Update documentation if changing behavior
5. Check `api_logs` for errors

---

## Support

**Questions?** Check documentation in this order:
1. `CLAUDE_START_HERE.md` - Quick answers
2. `docs/DEBUGGING.md` - Common issues
3. `ARCHITECTURE.md` - Deep dive
4. `docs/NODE_REFERENCE.md` - Specific nodes

**Still stuck?** Provide:
- correlation_id (from Slack or `agent_sessions`)
- User's command
- Error message (from `api_logs`)
- What you've tried

---

## License

© 2025 Aasani Systems. All rights reserved.

---

**Last Updated**: November 6, 2025  
**Version**: 2.0  
**Total Documentation**: ~12,000 lines across 9 files
