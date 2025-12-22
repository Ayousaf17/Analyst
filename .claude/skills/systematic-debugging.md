# Systematic Debugging

A disciplined approach to technical problem-solving. Core mandate: **investigate root causes before attempting any fixes**.

## The Four-Phase Framework

### Phase 1: Root Cause Investigation
Before touching code:
1. Read error messages thoroughly (every word matters)
2. Reproduce the issue consistently
3. Examine recent changes (git log, git diff)
4. Gather diagnostic evidence across component boundaries
5. Trace data flow backward through call stacks

### Phase 2: Pattern Analysis
1. Locate working examples of similar functionality
2. Compare implementations against references completely
3. Identify differences between working and broken code
4. Document all dependencies involved

### Phase 3: Hypothesis and Testing
Use the scientific method:
1. Form a single, clear hypothesis
2. Test minimally - one variable at a time
3. Verify results explicitly
4. Reformulate if unsuccessful

### Phase 4: Implementation
1. Create a failing test case first
2. Implement a single, targeted fix
3. Verify the fix works
4. Check for regressions

## The 3-Fix Limit (Critical Safeguard)

After **two failed fix attempts**, a third failure triggers:
- STOP attempting repairs
- Question the underlying design/architecture
- Consider if the approach itself is flawed

This prevents endless thrashing on symptoms instead of causes.

## Red Flags - Return to Phase 1 Immediately

If you catch yourself thinking:
- "Just try changing X and see if it works"
- "Maybe if I tweak this..."
- Proposing solutions before understanding data flow
- Attempting fixes without full comprehension

**STOP. Go back to Phase 1.**

## Debugging Techniques

### Binary Search
Isolate the problem by commenting out half the code, then narrowing.

### Minimal Reproduction
Create the smallest possible case that exhibits the bug.

### Rubber Duck Debugging
Explain the problem out loud, step by step.

### Git Bisect
Find the exact commit that introduced the bug:
```bash
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# Git walks you through commits
```

## For n8n Workflows Specifically

1. Check node connections in the visual editor
2. Examine execution data at each node
3. Verify credential configurations
4. Check expression syntax ($json, $node, etc.)
5. Review error workflow triggers
