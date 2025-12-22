# Analyze Token Usage

Estimate OpenAI token usage and costs for an n8n workflow.

## Task

I'll analyze token usage for the workflow or prompt at $ARGUMENTS

## Analysis Process

1. **Identify LLM Calls**
   - Count OpenAI/LLM nodes in workflow
   - Map data flow into each LLM call

2. **Estimate Input Tokens**
   - System prompt length
   - User message/context size
   - Tool definitions and schemas

3. **Estimate Output Tokens**
   - Expected response structure
   - JSON schema complexity
   - Typical response length

4. **Calculate Costs**
   - gpt-4o-mini: $0.15/1M input, $0.60/1M output
   - gpt-4o: $2.50/1M input, $10/1M output

## Output Format

```
## Token Analysis

### LLM Call 1: [Node Name]
- Input tokens: ~X
- Output tokens: ~Y
- Cost per call: $Z

### LLM Call 2: [Node Name]
...

### Summary
- Total calls per execution: N
- Estimated tokens per execution: X
- Cost per execution: $Y
- Daily cost (1000 executions): $Z
- Monthly estimate: $W
```

## Optimization Suggestions

- Identify redundant context
- Suggest prompt compression
- Recommend data sampling strategies
- Flag unnecessary LLM calls
