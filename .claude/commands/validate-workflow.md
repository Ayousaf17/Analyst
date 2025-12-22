# Validate n8n Workflow

Analyze an n8n workflow JSON file for common issues and best practices.

## Task

I'll validate the workflow at $ARGUMENTS checking for:

## Validation Checks

### Structure
- All nodes have unique IDs and names
- All connections reference valid node IDs
- No orphaned nodes (disconnected from flow)

### Credentials
- No hardcoded API keys or secrets
- All credential references are valid
- Proper credential types for each integration

### Error Handling
- Error workflows are configured
- Retry logic for HTTP requests
- Fallback paths for critical operations

### Performance
- Minimize sequential LLM calls
- Data sampling for large payloads
- Proper timeout configurations

### Security
- No sensitive data in expressions
- Rate limiting considerations
- Input validation on user-provided data

## Process

1. Read and parse the workflow JSON
2. Run all validation checks
3. Report issues by severity (critical, warning, info)
4. Suggest specific fixes for each issue

## Output Format

```
## Validation Results

### Critical Issues
- [Issue description and fix]

### Warnings
- [Issue description and fix]

### Recommendations
- [Best practice suggestions]

### Summary
- Total nodes: X
- Credentials required: Y
- Estimated reliability: Z%
```
