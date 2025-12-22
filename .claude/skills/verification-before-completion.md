# Verification Before Completion

**Core Rule: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

## The Verification Gate

Before asserting ANY work is complete:

1. **IDENTIFY** - What command proves this claim?
2. **EXECUTE** - Run the full command freshly (not from memory)
3. **READ** - Examine complete output and exit codes
4. **VERIFY** - Does output actually match the claim?
5. **ONLY THEN** - State the result with evidence

Skipping steps is dishonesty, not efficiency.

## Red Flags - STOP Immediately

Never proceed when using language like:
- "should work now"
- "probably fixed"
- "seems to be working"
- "I think it's done"

Never express satisfaction before verification:
- "Great!"
- "Done!"
- "All set!"

## What Counts as Evidence

### Tests Pass
```bash
# REQUIRED: Actual test output
npm test
# ✓ 47 tests passed
# Exit code: 0
```

NOT: "I ran the tests earlier and they passed"

### Build Succeeds
```bash
# REQUIRED: Build command with exit code
npm run build && echo "Exit: $?"
# Exit: 0
```

NOT: "The linter passed so the build should work"

### Bug Fixed
```bash
# REQUIRED: Reproduce original symptom, show it passes
# Before: GET /api/tickets returned 500
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/tickets
# 200
```

NOT: "I fixed the code so it should work now"

### Workflow Deployed
```bash
# REQUIRED: Execution evidence
# Trigger test in Slack: "@Gorgias Terminal show me open tickets"
# Response received with ticket data
```

NOT: "I imported the workflow so it should be active"

## Why This Matters

Failed verification has caused:
- Undefined functions shipped to production
- Incomplete features deployed
- Broken trust: "I don't believe you"

## Universal Application

This applies to:
- Every positive claim about work state
- Exact phrases, paraphrases, and implications
- Any communication suggesting completion

**If you cannot show evidence, you cannot claim completion.**
