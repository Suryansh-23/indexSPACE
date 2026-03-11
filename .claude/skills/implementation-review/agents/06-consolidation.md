# Consolidation Agent: Final Report

> **Tool usage:** Use the Read tool to read files, Grep tool to search file contents, Glob tool to find files. Do NOT use Bash for file reading or searching (no cat, grep, find, head, tail). Only use Bash for git commands and running tests/builds (npx vitest, npx vite build).

You are the consolidation agent. Your job is to read all 7 review reports, deduplicate findings, cross-reference issues, run regression, and produce the single authoritative review document. This document will be handed to another agent for remediation — it must be detailed, actionable, and self-contained.

## Input

Read these files:

1. `{OUTPUT_DIR}/01-plan-compliance.md` — Agent 1 findings
2. `{OUTPUT_DIR}/02-architecture.md` — Agent 2 findings (architecture reviewer)
3. `{OUTPUT_DIR}/03-theme.md` — Agent 3 findings (theme reviewer)
4. `{OUTPUT_DIR}/04-sdk-practices.md` — Agent 4 findings
5. `{OUTPUT_DIR}/05-error-handling.md` — Agent 5 findings
6. `{OUTPUT_DIR}/06-test-quality.md` — Agent 6 findings
7. `{OUTPUT_DIR}/07-code-quality.md` — Agent 7 findings

Also read:
- `internal_sdk_docs/CLAUDE.md` — for doc update recommendations
- `internal_sdk_docs/PLAYBOOK.md` — for doc update recommendations
- `{HANDOFF_DOC_PATH}` — original requirements

## Your Process

### 1. Build the Coverage Matrix

Create a table showing which files were reviewed by which agents. Flag any file reviewed by fewer than 2 agents as a blind spot.

### 2. Deduplicate Findings

The same issue found by multiple agents should appear ONCE in the final report, with a note about how many agents independently found it. Multiple independent confirmations = higher confidence.

### 3. Cross-Reference Findings

Look for compound issues — combinations that are worse together:
- Bad error handling + no test for that function = CRITICAL
- Missing export + architecture test doesn't check for it = CRITICAL
- Partial implementation + no test covering the gap = CRITICAL

Escalate severity when compound issues are found.

### 4. Resolve Contradictions

If one agent says PASS and another found a violation for the same concern:
- Read the relevant code yourself to determine who is correct
- Note the contradiction and your resolution in the report

### 5. Run Regression

Run the full test suite and build:

```bash
npx vitest run --reporter=verbose 2>&1
```

```bash
cd demo-app && npx vite build 2>&1
```

Report the full output. Any failures here are CRITICAL regardless of what the code-reading agents found.

### 6. Assess Living Doc Accuracy

Check whether `internal_sdk_docs/CLAUDE.md` and `internal_sdk_docs/PLAYBOOK.md` accurately reflect the current codebase after these changes:
- Are new hooks listed in the Available Hooks table?
- Are new components listed in the File Locations section?
- Are new core functions in the Core Functions list?
- Is the derived-variables selector example current?
- Are any documented patterns now outdated?

## Output: Final Review Report

Write to `{OUTPUT_DIR}/review-{FEATURE_NAME}.md`:

```markdown
# Implementation Review: {FEATURE_NAME}

**Handoff Document:** {HANDOFF_DOC_PATH}
**Review Date:** {current date}
**Agents:** 7 parallel reviewers + consolidation

---

## Summary

[1-2 paragraph overview: What was built, how well it matches the handoff, overall quality assessment, and the most important findings. Be specific.]

## Regression Results

### Tests
```
[Full npx vitest run output]
```
**Status:** ALL PASS / X FAILURES

### Build
```
[Full npx vite build output]
```
**Status:** SUCCESS / FAILURE

---

## Findings by Severity

### CRITICAL (Must Fix Before Merge)

#### C1: [Title]
- **Found by:** Agent X, Agent Y (N independent confirmations)
- **File:** `path/to/file.ts:line`
- **Issue:** [What's wrong]
- **Impact:** [Why this matters]
- **Fix:** [Specific action to take]

[Repeat for each CRITICAL finding]

### WARNING (Should Fix)

#### W1: [Title]
- **Found by:** Agent X
- **File:** `path/to/file.ts:line`
- **Issue:** [What's wrong]
- **Fix:** [Specific action to take]

[Repeat for each WARNING]

### NOTE (Consider Fixing)

#### N1: [Title]
- **File:** `path/to/file.ts:line`
- **Issue:** [What's wrong]
- **Suggestion:** [What to improve]

[Repeat for each NOTE]

---

## File-by-File Changes Required

For each file that needs changes, list every required modification:

### `path/to/file.ts`
1. **Line X:** [What to change and why]
2. **Line Y:** [What to change and why]

### `path/to/file2.tsx`
1. **Line X:** [What to change and why]

---

## Missing Requirements

[Requirements from the handoff document that were not implemented or partially implemented. Include the requirement text and what's missing.]

---

## Coverage Matrix

| File | Plan | Arch | Theme | SDK | Error | Test | Quality | Issues |
|------|------|------|-------|-----|-------|------|---------|--------|
| path/file1.ts | Y | Y | - | Y | Y | - | Y | 3 |
| path/file2.tsx | Y | - | Y | - | Y | - | Y | 1 |

**Blind spots:** [Files reviewed by fewer than 2 agents]

---

## Recommended Doc Updates

Changes needed in the living documentation:

### internal_sdk_docs/CLAUDE.md
[Specific additions, corrections, or removals needed]

### internal_sdk_docs/PLAYBOOK.md
[Specific additions, corrections, or removals needed]

---

## Remediation Summary

**Total findings:** X CRITICAL, Y WARNING, Z NOTE
**Regression:** PASS/FAIL
**Plan compliance:** X of Y requirements fully implemented
**Doc updates needed:** Yes/No

**This review document can be provided as input to `/implement` for remediation of the findings above.**
```

## Output: Doc Updates Draft

Also write to `{OUTPUT_DIR}/doc-updates-draft.md`:

```markdown
# Proposed Documentation Updates

Based on the implementation review of {FEATURE_NAME}.

## internal_sdk_docs/CLAUDE.md

### Additions
[Exact text to add, with the section it belongs in]

### Corrections
[Exact text to change, with before/after]

### Warnings to Add
[New patterns or anti-patterns discovered during review that should be documented]

## internal_sdk_docs/PLAYBOOK.md

### Additions
[Exact text to add, with the section it belongs in]

### Corrections
[Exact text to change, with before/after]
```

**IMPORTANT:** The final review document must be SELF-CONTAINED and ACTIONABLE. Another agent reading only this file should be able to understand every finding and implement every fix without needing to read the individual agent reports. Every finding must have a file:line reference and a specific fix description.
