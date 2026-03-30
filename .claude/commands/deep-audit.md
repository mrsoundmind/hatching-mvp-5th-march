# Deep Audit — 5-Agent Complete Bug Sweep

Run a comprehensive audit of the specified scope using 5 parallel agents, each with a distinct failure perspective. Fix all bugs found, then run a final typecheck + test verification.

## Scope
Audit the following area: $ARGUMENTS

If no scope is specified, audit all files modified in the current git diff (staged + unstaged).

## Step 1: Identify Files in Scope

Read the scope argument. If it references a feature area (e.g., "autonomy", "auth", "chat"), identify all relevant files. If it's a file list, use those directly. Collect the full list of files to audit.

## Step 2: Launch 5 Parallel Audit Agents

Launch ALL 5 agents simultaneously using the Agent tool with `run_in_background: true`. Each agent gets the same file list but a completely different job.

### Agent 1 — Static Code Reviewer
```
You are a senior code reviewer. For each file in scope, check:
- Every function: are all branches handled? Are return types correct?
- Every import: is it actually used? Is it the right import?
- Every variable: can it be null/undefined when accessed? Is it the right type?
- Dead code: functions defined but never called, variables assigned but never read
- Error handling: are thrown errors caught? Are promises awaited? Are catch blocks empty?
- Security: SQL injection, XSS, unvalidated inputs, hardcoded secrets

For each finding, report: file, line number, severity (BUG/WARNING/OK), and what's wrong.
```

### Agent 2 — End-to-End Flow Tracer
```
You are a QA engineer simulating a real user. For every user-facing action in the scope:
1. Start at the UI component (button click, form submit, page load)
2. Trace through: client handler → API call/WS message → server route → business logic → DB operation → response/WS event → back to client handler → UI update
3. At EACH boundary, verify:
   - Does the data shape match what the next layer expects?
   - What happens if this step fails? Does the user see an error?
   - What happens if this step is slow (>5s)? Is there a loading state?
4. Check: are there any server-emitted events that NO client code handles?
5. Check: are there any client handlers listening for events that NO server code emits?

Report each flow as: WORKS / BUG (breaks) / WARNING (edge case)
```

### Agent 3 — Edge Case & Error Path Tester
```
You are a chaos engineer. For every function in scope, test these scenarios:
- What if the input is null, undefined, empty string, empty array, or 0?
- What if a DB query returns no results? What if it throws?
- What if two users do the same action at the exact same time? (race conditions)
- What if an entity (user, project, agent, task) is deleted while being processed?
- What if the WebSocket disconnects mid-operation?
- What if the LLM API times out or returns an error?
- What if a referenced entity (foreign key) doesn't exist?
- What if the same operation is called twice with the same input? (idempotency)
- What if array.find() returns undefined and the code accesses a property on it?
- What if a number overflows or a divide-by-zero occurs?

For each scenario, trace through the ACTUAL CODE (not theory) and determine if it's handled.
```

### Agent 4 — Data Contract Auditor
```
You are a contract verification engineer. Check every data boundary in scope:

API CALLS:
- For every fetch/apiRequest call in the client, verify the argument order matches the function signature
- For every API endpoint, verify the request body Zod schema matches what the client sends
- For every API response, verify the shape matches what the client destructures

WEBSOCKET EVENTS:
- For every WS event the server emits (broadcastToConversation, broadcastToProject), verify:
  1. The event type exists in wsSchemas.ts
  2. The fields emitted match the schema definition
  3. A client handler exists that reads those exact fields
- For every WS event the client listens for, verify the server actually emits it

DATABASE:
- For every storage method call, verify the input matches the schema column types
- Check for any `as any` casts that hide type mismatches
- Check for enum values that aren't in the schema (e.g., status: 'failed' when schema only allows 'todo'|'completed'|'blocked')

Report mismatches with: sender file:line → expected shape → receiver file:line → actual shape
```

### Agent 5 — Build & Test Runner
```
You are a CI/CD pipeline. Run these commands and report EVERY result:
1. npm run typecheck — must pass with zero errors
2. npm run build — must complete successfully
3. Find and run ALL test scripts: npx tsx scripts/test-*.ts, npm run test:*, npm run gate:*
4. For each test failure, report: which test, the error message, and whether it's a real code bug or a missing env var / stale mock

Also check:
- Are there any TypeScript `@ts-ignore` or `@ts-expect-error` comments in the scope?
- Are there any `as any` casts that could hide real bugs?
- Are there console.log statements that should be devLog?
```

## Step 3: Collect Results

Wait for all 5 agents to complete. Compile findings into a single table:

| # | Agent | Severity | File:Line | Issue | Fix needed? |
|---|-------|----------|-----------|-------|-------------|

Categorize as:
- **FIX NOW**: Will break at runtime or corrupt data
- **FIX BEFORE MERGE**: Won't crash but causes bad UX or data inconsistency
- **DEFER**: Known limitation, document for future

## Step 4: Fix All "FIX NOW" and "FIX BEFORE MERGE" Bugs

Fix each bug, one at a time. After all fixes, run typecheck + relevant tests.

## Step 5: Final Verification

Run `npm run typecheck` and `npm run build` to confirm everything still compiles. Run all test scripts that are relevant to the scope. Report the final pass/fail count.
