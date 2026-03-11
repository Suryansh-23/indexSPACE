name: implementation-review
description: Multi-agent adversarial review of recent implementation work. Dispatches 7 parallel review agents + 1 consolidation agent. Produces a detailed improvements document that can be handed to another agent for execution.
user_invocable: true
argument-hint: <handoff-doc-path>
---

# Implementation Review

You are the orchestrator for a multi-agent adversarial code review. Your job is to read the context, identify what changed, dispatch focused review agents in parallel, then consolidate their findings into a single actionable report.

## STEP 1 — Read Prerequisites

Read these files completely before doing anything else:

1. `internal_sdk_docs/CLAUDE.md` — Architecture rules, constraints, testing requirements
2. `internal_sdk_docs/PLAYBOOK.md` — Checklists, patterns, existing widget/hook/function reference
3. The handoff document at `$ARGUMENTS` — This is the spec. Read it fully. This tells you what was SUPPOSED to be built.

If `$ARGUMENTS` is empty or the file doesn't exist, ask the user to provide the path to the handoff/plan document that was used for implementation.

## STEP 2 — Identify Changes

Run these commands to understand what changed:

```bash
git status --short
git log --oneline -20
git diff --name-only
git diff --stat
```

Build a list of ALL changed files (staged, unstaged, and untracked). This list is critical — it gets injected into every agent's prompt so they know exactly what to review.

Also derive the **feature name** from the handoff document filename. For example:
- `Docs/custom-shape-widget-handoff.md` → `custom-shape-widget`
- `Docs/plans/bucket-trading-plan.md` → `bucket-trading`

Create the output directory:
```bash
mkdir -p Docs/reviews/{FEATURE_NAME}/
```

## STEP 3 — Read Agent Prompts

Read the 5 parallel review agent templates from `.claude/skills/implementation-review/agents/`:
- `01-plan-compliance.md` — dispatched as Agent 1
- `02-sdk-best-practices.md` — dispatched as Agent 4
- `03-error-handling.md` — dispatched as Agent 5
- `04-test-quality.md` — dispatched as Agent 6
- `05-code-quality.md` — dispatched as Agent 7

Read the consolidation template (dispatched sequentially after all parallel agents):
- `06-consolidation.md`

Read the 2 existing reviewer agents (dispatched as Agents 2 and 3):
- `.claude/agents/architecture-reviewer.md`
- `.claude/agents/theme-reviewer.md`

**Note on file numbering:** The prompt template files are numbered 01-06 sequentially in the directory. Agents 2 and 3 come from the existing `.claude/agents/` directory, so template files 02-05 map to dispatch positions 4-7. The output files use the dispatch position numbers (01-07).

## STEP 4 — Dispatch 7 Agents in Parallel

Construct 7 Task tool calls in a **single message** so they run in parallel. Each Task call:
- Uses `subagent_type: "general-purpose"`
- Uses `model: "sonnet"`
- **Prepend this directive to EVERY agent prompt** (before the agent's own instructions):
  > "IMPORTANT: For all file reading use the Read tool, for all content searching use the Grep tool, for all file finding use the Glob tool. Do NOT use Bash commands for these operations (no cat, grep, find, head, tail, echo). Only use the Bash tool for commands that truly require shell execution: git commands, npx vitest, npx vite build, and mkdir. This ensures you can operate without permission prompts."
- Contains the full agent prompt with these placeholders replaced:
  - `{HANDOFF_DOC_PATH}` → the actual handoff doc path from `$ARGUMENTS`
  - `{CHANGED_FILES}` → the full list of changed files from Step 2 (one per line)
  - `{FEATURE_NAME}` → the derived feature name
  - `{OUTPUT_DIR}` → `Docs/reviews/{FEATURE_NAME}/`

### Agent dispatch list:

**Agent 1 — Plan Compliance**
- Prompt: contents of `01-plan-compliance.md` with placeholders replaced
- Writes to: `{OUTPUT_DIR}/01-plan-compliance.md`

**Agent 2 — Architecture Reviewer**
- Prompt: contents of `.claude/agents/architecture-reviewer.md` with this addition prepended:
  > "You are reviewing changes for the `{FEATURE_NAME}` implementation. Focus your review on these changed files: {CHANGED_FILES}. Write your full review output as a markdown file to `{OUTPUT_DIR}/02-architecture.md`. Start with a `# Architecture Review: {FEATURE_NAME}` heading. Use the output format from your instructions but write it to the file, not to the console."
- Writes to: `{OUTPUT_DIR}/02-architecture.md`

**Agent 3 — Theme Reviewer**
- Prompt: contents of `.claude/agents/theme-reviewer.md` with this addition prepended:
  > "You are reviewing changes for the `{FEATURE_NAME}` implementation. Focus your review on these changed files: {CHANGED_FILES}. Write your full review output as a markdown file to `{OUTPUT_DIR}/03-theme.md`. Start with a `# Theme Review: {FEATURE_NAME}` heading. Use the output format from your instructions but write it to the file, not to the console."
- Writes to: `{OUTPUT_DIR}/03-theme.md`

**Agent 4 — SDK Best Practices**
- Prompt: contents of `02-sdk-best-practices.md` with placeholders replaced
- Writes to: `{OUTPUT_DIR}/04-sdk-practices.md`

**Agent 5 — Error Handling & Correctness**
- Prompt: contents of `03-error-handling.md` with placeholders replaced
- Writes to: `{OUTPUT_DIR}/05-error-handling.md`

**Agent 6 — Test Quality**
- Prompt: contents of `04-test-quality.md` with placeholders replaced
- Writes to: `{OUTPUT_DIR}/06-test-quality.md`

**Agent 7 — Code Quality Catch-All**
- Prompt: contents of `05-code-quality.md` with placeholders replaced
- Writes to: `{OUTPUT_DIR}/07-code-quality.md`

## STEP 4b — Handle Agent Failures

After all 7 agents complete, check each Task result. If any agent failed or timed out:
1. Note which agent(s) failed
2. Check if their output file was partially written (read it if it exists)
3. If an output file is missing, create a placeholder noting the agent failed:
   ```
   # [Agent Name] Review: {FEATURE_NAME}
   **STATUS: AGENT FAILED — this review was not completed.**
   ```
4. Inform the consolidation agent which reports are missing so it can flag the gap in the coverage matrix

Do NOT re-dispatch failed agents. Proceed with whatever reports were produced.

## STEP 5 — Dispatch Consolidation Agent (Sequential)

After ALL 7 agents complete (or fail), read brief summaries of each agent's key findings from their Task return values. Then dispatch the consolidation agent:

- Uses `subagent_type: "general-purpose"`
- Uses `model: "sonnet"`
- Prompt: contents of `06-consolidation.md` with placeholders replaced, PLUS brief summaries of each agent's key findings
- The consolidation agent will:
  1. Read all 7 report files from `{OUTPUT_DIR}/`
  2. Deduplicate and cross-reference findings
  3. Run regression (`npx vitest run` + `cd demo-app && npx vite build`)
  4. Write `{OUTPUT_DIR}/review-{FEATURE_NAME}.md` (the detailed handoff report)
  5. Write `{OUTPUT_DIR}/doc-updates-draft.md` (proposed edits to living docs)

## STEP 6 — Report to User

After consolidation completes:
1. Read `{OUTPUT_DIR}/review-{FEATURE_NAME}.md`
2. Present a summary to the user:
   - Number of CRITICAL / WARNING / NOTE findings
   - Regression pass/fail
   - Whether doc updates are recommended
   - The full path to the review file
3. Tell the user: "The review is at `{OUTPUT_DIR}/review-{FEATURE_NAME}.md` — this file can be handed to another agent with `/implement` for remediation."
