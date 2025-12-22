# Error Resolver

A systematic diagnostic tool for resolving errors across all languages and frameworks.

## 5-Step Resolution Process

### 1. CLASSIFY
Identify the error type:
| Type | Indicators |
|------|------------|
| Syntax | Unexpected token, parse error |
| Type | Cannot read property, undefined is not |
| Reference | ReferenceError, not defined |
| Runtime | Stack overflow, out of memory |
| Network | ECONNREFUSED, timeout, 4xx/5xx |
| Permission | EACCES, 403 Forbidden |
| Dependency | Module not found, version mismatch |
| Configuration | Missing env var, invalid config |
| Database | Connection refused, query failed |

### 2. PARSE
Extract key information:
- Error message (exact text)
- Stack trace (file:line:column)
- Context (what operation was attempted)
- Timing (when did it occur)

### 3. MATCH
Compare against known patterns:
- Have we seen this before?
- Check `.claude/error-solutions/` for past fixes
- Search documentation/Stack Overflow

### 4. ANALYZE
Determine root cause using "5 Whys":
```
Error: Cannot read property 'tickets' of undefined
Why? → response.data is undefined
Why? → API returned empty response
Why? → Request failed silently
Why? → Error handler swallowed exception
Why? → Missing try/catch propagation
ROOT CAUSE: Error handling not propagating failures
```

### 5. RESOLVE
Implement fix and prevention:
1. Fix the immediate issue
2. Add test to prevent regression
3. Document the solution
4. Consider if similar bugs exist elsewhere

## Debugging Commands

### Node.js/JavaScript
```bash
# Debug with inspector
node --inspect-brk script.js

# Check for syntax errors
node --check script.js

# Trace warnings
node --trace-warnings script.js
```

### API/Network
```bash
# Test endpoint
curl -v https://api.example.com/endpoint

# Check DNS
nslookup api.example.com

# Test connectivity
nc -zv api.example.com 443
```

### n8n Workflow Specific
```
1. Open execution history
2. Click failed execution
3. Examine each node's input/output
4. Check "Error" tab for stack trace
5. Verify credentials are valid
6. Test HTTP requests in Postman first
```

## Solution Documentation

Save successful fixes in `.claude/error-solutions/`:
```yaml
# error-solutions/gorgias-401.yaml
error: "401 Unauthorized from Gorgias API"
diagnosis: "API credentials expired or malformed"
root_cause: "Basic auth header not properly base64 encoded"
fix: "Regenerate API key in Gorgias dashboard, update n8n credential"
verification: "curl with new credentials returns 200"
prevention: "Add credential validation on workflow activation"
```
