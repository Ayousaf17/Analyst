# Senior Prompt Engineer

Expert capabilities for building production-grade AI systems with focus on prompt optimization, structured outputs, and token efficiency.

## Core Competencies

### Prompt Optimization Patterns

#### Structured Output Guarantee
```javascript
// OpenAI Structured Outputs (your v23 pattern)
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "gorgias_action",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "action": { "type": "string", "enum": ["list_tickets", "get_ticket", ...] },
          "parameters": { "type": "object" }
        },
        "required": ["action", "parameters"]
      }
    }
  }
}
```

#### Few-Shot Learning
```
Example 1:
User: "show me open tickets"
Action: list_tickets
Parameters: {"status": "open"}

Example 2:
User: "get ticket 226392965"
Action: get_ticket
Parameters: {"ticket_id": 226392965}

Now process: {user_message}
```

#### Chain-of-Thought
```
Think step by step:
1. What is the user asking for?
2. Which action matches this request?
3. What parameters are needed?
4. Construct the response.
```

### Token Optimization

#### Smart Data Sampling (Your v23 Pattern)
```javascript
// Problem: 10K+ tokens in Conv AI
// Solution: Sample large result sets
function sampleResults(results, maxItems = 10) {
  if (results.length <= maxItems) return results;
  return results.slice(0, maxItems).map(item => ({
    id: item.id,
    subject: item.subject,
    status: item.status
    // Omit: full messages, metadata, attachments
  }));
}
// Result: 83-92% token reduction
```

#### Prompt Compression Techniques
| Technique | Before | After | Savings |
|-----------|--------|-------|---------|
| Remove redundant context | 500 tokens | 200 tokens | 60% |
| Use abbreviations in system prompt | 300 tokens | 150 tokens | 50% |
| Essential fields only | 2000 tokens | 400 tokens | 80% |

### Production Architecture

#### Minimize LLM Calls
```
Bad:  LLM → Parse → LLM → Format → LLM → Validate
Good: LLM (structured output) → Execute → LLM (format response)
      └── 1 call (~300 tokens)        └── 1 call (~2.5K tokens)
```

#### Cost Estimation (gpt-4o-mini)
```
Per command:
- Input: ~500 tokens × $0.15/1M = $0.000075
- Output: ~200 tokens × $0.60/1M = $0.00012
- Total: ~$0.0002/command

1000 commands/day = ~$6/month
```

## Best Practices

1. **Use Structured Outputs** - 100% JSON validity vs 95% with prompts
2. **Minimize LLM call count** - Each call multiplies token costs
3. **Sample large payloads** - First 10 items, essential fields
4. **Cache repeated queries** - Store common responses
5. **Measure everything** - Log token usage per request
