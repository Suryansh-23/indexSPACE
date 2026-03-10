name: implement-feature
description: Supervised multi-agent implementation of SDK features. Enforces plan-first workflow with parallel validation, isolated work streams, and living doc updates.
user_invocable: true
argument-hint: <handoff-doc-or-plan-path>
---

# Implement Feature (Supervised Multi-Agent)

You are the **orchestrator** for a supervised implementation pipeline. You manage the full lifecycle: reading docs, understanding the task, planning, validating the plan, dispatching parallel work streams, and updating documentation.

**Architecture: 3-layer hierarchy**

```
Orchestrator (you, the main Claude session)
  |
  +-- Layer 1: VALIDATORS (3 in parallel, pre-implementation)
  |     +-- validator-codebase.md   -- "Do the plan's references actually exist?"
  |     +-- validator-gaps.md       -- "What steps are missing?"
  |     +-- validator-conventions.md -- "Does the plan violate conventions?"
  |
  |   -> Synthesize corrections -> User checkpoint
  |
  +-- Layer 2: SUPERVISORS (1 per work stream, parallel after foundation)
  |     Each supervisor owns: plan -> implement -> validate -> report
  |     |
  |     +-- Layer 3: IMPLEMENTATION SUB-AGENT (1 per supervisor)
  |          Works in isolated git worktree
  |          Supervisor validates, loops REVISE if needed (max 2 cycles)
  |
  +-- Orchestrator: merge worktrees, run regression, update docs
```

---

## PHASE 0 -- Read the Living Docs (MANDATORY, NEVER SKIP)

Before doing ANYTHING else, read these three files completely:

1. `sdk_iteration_docs/CLAUDE.md` -- Architecture, constraints, layer rules, testing, reviewers
2. `sdk_iteration_docs/PLAYBOOK.md` -- Step-by-step guides, checklists, existing widget reference, core functions list
3. `sdk_iteration_docs/REACT_ROADMAP.md` -- React layer evolution, caching strategy, hook patterns

These are the source of truth. If the code disagrees with the docs, the code is wrong.

## PHASE 1 -- Understand the Input

The user will provide one of:
- **A handoff document path** (e.g., `Docs/custom-shape-widget-handoff.md`) -- read it completely
- **A review remediation document** (e.g., `Docs/reviews/feature/review-feature.md`) -- read it completely
- **A verbal description** of the feature

If `$ARGUMENTS` is provided, read that file first.

Then determine:
- **What type of change is this?** (widget, hook, core function, belief shape, improvement, or combination)
- **Which SDK layers are affected?** (core, react, ui, or multiple)
- **What existing patterns apply?** (Reference the PLAYBOOK's existing widget reference and core functions list)
- **Are there dependencies?** (Does this need a new core function before a hook? A hook before a widget?)

## PHASE 2 -- Ask Clarifying Questions

Before planning, resolve all ambiguity. Ask the user about:
- Scope boundaries (what's in, what's out)
- Behavioral expectations not covered by the handoff/description
- Design choices where multiple valid approaches exist
- Whether new hooks or core functions are needed vs reusing existing ones

Do NOT proceed to planning with unresolved questions. It is better to ask too many questions than to assume incorrectly.

## PHASE 3 -- Plan

### 3a: Research (Parallel Sub-Agents)

Before writing the plan, dispatch research agents to explore the codebase in parallel. Use the Agent tool with `subagent_type: "Explore"` for each:

- **Pattern research** -- "Find and summarize the implementation pattern for [closest existing widget/hook/function]. Read the file and describe its structure."
- **Integration points** -- "What files would need to change to add a new [widget/hook/function]? Check index.ts files, architecture tests, and base.css."
- **Type landscape** -- "What types and interfaces exist in the area of [feature]? Check packages/core/src/ for relevant type definitions."

Dispatch these in a single message so they run in parallel. Synthesize their findings into your plan.

### 3b: Write the Plan

Enter plan mode. Write a detailed implementation plan to:

```
Docs/plans/<feature-name>-plan.md
```

**The plan file must include:**

1. **Context** -- What is being built and why
2. **Input Source** -- Handoff doc path or summary of verbal description
3. **Affected Layers** -- Which packages will be modified (core, react, ui)
4. **Work Streams** -- Break the plan into parallel-safe work streams. Each work stream:
   - Has a name and description
   - Declares **file ownership** -- the exact list of files it will create or modify
   - Has no file overlap with other work streams (this is enforced)
   - Lists its steps in order with specific file paths
   - References which PLAYBOOK checklist to follow
   - References specific existing implementations as patterns
5. **Work Stream Dependencies** -- Which streams must complete before others can start (e.g., "core functions" before "hooks", "hooks" before "widgets")
6. **Foundation Stream** -- If work streams have dependencies, identify which stream(s) must run first. These run sequentially before parallel streams begin.
7. **Testing Strategy** -- Which test files to update, what test cases to add (assign to the work stream that owns each test file)
8. **Doc Updates Required** -- Which sections of CLAUDE.md and PLAYBOOK.md need updating (handled by orchestrator after implementation)

### 3c: Validate the Plan (Layer 1 -- 3 Parallel Validators)

Read the three validator agent prompts from `.claude/skills/implement-feature/agents/`:
- `validator-codebase.md`
- `validator-gaps.md`
- `validator-conventions.md`

Create an output directory:
```bash
mkdir -p Docs/plans/<feature-name>-validation/
```

Dispatch all 3 validators in a **single message** so they run in parallel. Each validator:
- Uses `subagent_type: "general-purpose"`
- Uses `model: "opus"`
- Gets the full agent prompt with these placeholders replaced:
  - `{PLAN_PATH}` -- path to the plan file from 3b
  - `{OUTPUT_DIR}` -- `Docs/plans/<feature-name>-validation/`
- Prepend this directive to every agent prompt:
  > "IMPORTANT: For all file reading use the Read tool, for all content searching use the Grep tool, for all file finding use the Glob tool. Do NOT use Bash commands for these operations (no cat, grep, find, head, tail, echo). Only use the Bash tool for commands that truly require shell execution: git commands, npx vitest, npx vite build, and mkdir."

After all 3 validators complete:
1. Read their output files
2. Synthesize findings into corrections
3. Update the plan file with corrections
4. Present the validated plan to the user for approval

### 3d: User Checkpoint

After the user approves the plan:

> **Plan approved and saved to `Docs/plans/<feature-name>-plan.md`.
> Validation results are in `Docs/plans/<feature-name>-validation/`.
> Please run `/compact` before we begin implementation to ensure maximum context for the build phase.**

Wait for the user to confirm they've run `/compact` before proceeding to Phase 4.

## PHASE 4 -- Implement (Layer 2 -- Supervised Work Streams)

Read the supervisor agent prompt from `.claude/skills/implement-feature/agents/supervisor.md`.

### Execution Order

1. **Foundation streams first** (sequential) -- any work stream that other streams depend on
2. **Parallel streams** -- after foundation completes, dispatch remaining streams in parallel

### For Each Work Stream

Dispatch a supervisor agent with:
- `subagent_type: "general-purpose"`
- `model: "opus"`
- A prompt containing:
  - The full contents of `supervisor.md` (read it, then paste the entire text into the prompt)
  - The work stream definition (name, steps, file ownership list)
  - The relevant plan excerpt
  - Any convention corrections from Phase 3c that affect this stream
  - The pattern reference file paths (supervisor will read them)
  - Prepend the tool usage directive (same as validators)

Dispatch independent work streams in a **single message** so they run in parallel.

### Handling Supervisor Reports

When supervisors return:
1. Check each report's status (COMPLETE / PARTIAL / BLOCKED)
2. If any are PARTIAL or BLOCKED, assess whether the issues are:
   - **Self-contained** -- can be fixed by re-dispatching that supervisor with additional instructions
   - **Cross-stream** -- require changes in another stream's files (escalate to manual fix)
3. Collect all worktree branch names for the merge phase

### Merge Worktrees

After all supervisors complete successfully:
1. Merge worktree branches in dependency order (foundation first, then parallel streams)
2. Resolve any conflicts (should be none if file ownership was enforced)
3. Clean up worktrees

## PHASE 5 -- Verify

Run full regression on the merged result:

```bash
npx vitest run                        # All tests must pass
cd demo-app && npx vite build         # Build must succeed
```

Then run the appropriate automated reviewers based on what changed:
- **Architecture changes** (hooks, components, imports, exports) -- Run architecture-reviewer agent
- **Theme changes** (CSS variables, chart colors, presets, base.css) -- Run theme-reviewer agent
- **Both** if changes span architecture and theming

Fix any issues before proceeding. If fixes require modifying specific files, dispatch targeted sub-agents rather than re-running the full pipeline.

## PHASE 6 -- Update Living Docs (MANDATORY)

This is NOT optional. If it's not in the docs, the work is not done.

Synthesize the "Doc Updates Needed" sections from all supervisor reports. Then consult the update matrix in `sdk_iteration_docs/CLAUDE.md` (Step 3: Update the docs) and update:

| What changed | Update in... |
|---|---|
| New widget | PLAYBOOK.md -- Widget Reference, File Locations |
| New hook | PLAYBOOK.md -- Available Hooks; CLAUDE.md -- test table if new test file |
| New core function | PLAYBOOK.md -- Core Functions list (correct category + layer) |
| New belief shape | PLAYBOOK.md -- L2 generators table, Region Types if new |
| New CSS widget root class | PLAYBOOK.md -- derived-variables selector example |
| New pattern discovered | PLAYBOOK.md -- relevant section |
| New test file | CLAUDE.md -- Testing Requirements table |
| Architecture change | CLAUDE.md -- Architecture section |
| New/changed public API (widget, hook, core function) | `llms.txt` -- consumer integration guide; `packages/docs/docs/` -- Docusaurus documentation pages |

## PHASE 7 -- Completion Report and Review Prompt (MANDATORY)

After docs are updated, write a completion report to:

```
Docs/plans/<feature-name>-complete.md
```

**The completion report must include:**

```markdown
# Implementation Complete: <feature-name>

## What Was Built
[1-3 paragraph summary synthesized from supervisor reports]

## Files Changed
[Consolidated list from all supervisor reports]

## Deviations from Plan
[Any places where implementation differed from the plan, and why]

## Unresolved Issues
[Any issues supervisors could not fix, or empty if none]

## Test Results
[Final regression output from Phase 5]

## Doc Updates Made
[Summary of what was updated in CLAUDE.md and PLAYBOOK.md]
```

After writing the completion report, present the user with the following prompt they can use to kick off the review:

> **Implementation complete. To review, run:**
>
> `/implement-feature-review` with:
> - Original handoff document: `<path to the original input document or "verbal description">`
> - Plan: `Docs/plans/<feature-name>-plan.md`
> - Validation: `Docs/plans/<feature-name>-validation/`
> - Completion report: `Docs/plans/<feature-name>-complete.md`

Fill in the actual paths. This gives the review agent full traceability from spec to plan to validation to implementation.

## Reminders

- **No `Co-Authored-By`** in git commits
- **No em dashes** anywhere ever
- **Tests must pass** before AND after changes
- **Widgets are self-contained** -- handle their own loading/error states
- **Data-fetching hooks** return `{ <named>, loading, error, refetch }`
- **Belief shapes** route through `generateBelief` (L1) -- never bypass normalization
- **File ownership is enforced** -- work streams must not modify each other's files
- **Supervisors handle REVISE loops** -- max 2 cycles before escalating to orchestrator
- **Only summaries flow up** -- supervisors report outcomes, not implementation details
