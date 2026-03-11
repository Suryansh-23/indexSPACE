name: implement
description: Unified skill for implementing new features in the SDK — widgets, hooks, core functions, belief shapes, or improvements. Enforces architecture compliance, plan-first workflow, and living doc updates.
user_invocable: true
---

# Implement Feature

You are implementing a new feature or improvement in the FunctionSpace Trading SDK. This skill enforces architecture compliance, a plan-first workflow, and documentation updates.

## PHASE 0 — Read the Living Docs (MANDATORY, NEVER SKIP)

Before doing ANYTHING else, read these three files completely:

1. `internal_sdk_docs/CLAUDE.md` — Architecture, constraints, layer rules, testing, reviewers
2. `internal_sdk_docs/PLAYBOOK.md` — Step-by-step guides, checklists, existing widget reference, core functions list
3. `internal_sdk_docs/REACT_ROADMAP.md` — React layer evolution, caching strategy, hook patterns

These are the source of truth. If the code disagrees with the docs, the code is wrong.

## PHASE 1 — Understand the Input

The user will provide one of:
- **A handoff document path** (e.g., `Docs/custom-shape-widget-handoff.md`) — read it completely
- **A verbal description** of the feature

If a handoff doc is provided, read it fully. Then determine:
- **What type of change is this?** (widget, hook, core function, belief shape, improvement, or combination)
- **Which SDK layers are affected?** (core, react, ui, or multiple)
- **What existing patterns apply?** (Reference the PLAYBOOK's existing widget reference and core functions list)
- **Are there dependencies?** (Does this need a new core function before a hook? A hook before a widget?)

## PHASE 2 — Ask Clarifying Questions

Before planning, resolve all ambiguity. Ask the user about:
- Scope boundaries (what's in, what's out)
- Behavioral expectations not covered by the handoff/description
- Design choices where multiple valid approaches exist
- Whether new hooks or core functions are needed vs reusing existing ones

Do NOT proceed to planning with unresolved questions. It is better to ask too many questions than to assume incorrectly.

## PHASE 3 — Plan (MANDATORY)

Enter plan mode. Explore the codebase to understand existing patterns, then write a detailed implementation plan.

**The plan MUST be written to a file at:**
```
Docs/plans/<feature-name>-plan.md
```

**The plan file must include:**

### Plan Structure
1. **Context** — What is being built and why
2. **Input Source** — Handoff doc path or summary of verbal description
3. **Affected Layers** — Which packages will be modified (core, react, ui)
4. **Implementation Steps** — Ordered list with:
   - What to create/modify (specific file paths)
   - Which PLAYBOOK checklist to follow for each step
   - Dependencies between steps (e.g., "core function must exist before hook")
5. **Existing Patterns to Follow** — Reference specific existing implementations (e.g., "follow the `useMarket` pattern", "follow `ShapeCutter` component structure")
6. **Testing Strategy** — Which test files to update, what test cases to add
7. **Reviewer Requirements** — Which automated reviewers to run (architecture-reviewer, theme-reviewer, or both)
8. **Doc Updates Required** — Which sections of CLAUDE.md and PLAYBOOK.md need updating

### After Plan Approval

Once the user approves the plan, prompt them:

> **Plan approved and saved to `Docs/plans/<feature-name>-plan.md`.
> Please run `/compact` before we begin implementation to ensure maximum context for the build phase.**

Wait for the user to confirm they've run `/compact` before proceeding to Phase 4.

## PHASE 4 — Implement

Follow the approved plan step by step. For each step:

1. **Reference the PLAYBOOK** — Follow the relevant checklist exactly:
   - Adding a widget → PLAYBOOK "Quick Reference: Adding a New Widget" + "SDK Expansion Checklist"
   - Adding a hook → Use the `add-hook` skill (`.claude/skills/add-hook/SKILL.md`)
   - Adding a core function → PLAYBOOK "SDK Expansion Checklist" core function section
   - Adding a belief shape → PLAYBOOK "Position Generator Architecture" + "SDK Expansion Checklist"
   - Modifying existing code → Follow existing patterns in that file

2. **Respect layer boundaries:**
   - `core` imports NOTHING from react or ui
   - `react` imports ONLY from core
   - `ui` imports from core and react

3. **Respect theming rules:**
   - No hardcoded colors — use `var(--fs-*)` in CSS
   - No CSS variables in Recharts SVG props — use `ctx.chartColors.*`
   - New widget root classes go in the derived-variables selector in `base.css`

4. **All styles go in `packages/ui/src/styles/base.css`** — do not create new CSS files

5. **Export everything** from the appropriate `index.ts` files

## PHASE 5 — Verify

Run all verification steps:

```bash
npx vitest run                        # All tests must pass
cd demo-app && npx vite build         # Build must succeed
```

Then run the appropriate automated reviewers based on what changed:

- **Architecture changes** (hooks, components, imports, exports) → Run architecture-reviewer agent
- **Theme changes** (CSS variables, chart colors, presets, base.css) → Run theme-reviewer agent
- **Both** if changes span architecture and theming

Fix any issues the reviewers flag before proceeding.

## PHASE 6 — Update Living Docs (MANDATORY)

This is NOT optional. If it's not in the docs, the work is not done.

Consult the update matrix in `internal_sdk_docs/CLAUDE.md` (Step 3: Update the docs) and update:

| What changed | Update in... |
|---|---|
| New widget | PLAYBOOK.md — Widget Reference, File Locations |
| New hook | PLAYBOOK.md — Available Hooks; CLAUDE.md — test table if new test file |
| New core function | PLAYBOOK.md — Core Functions list (correct category + layer) |
| New belief shape | PLAYBOOK.md — L2 generators table, Region Types if new |
| New CSS widget root class | PLAYBOOK.md — derived-variables selector example |
| New pattern discovered | PLAYBOOK.md — relevant section |
| New test file | CLAUDE.md — Testing Requirements table |
| Architecture change | CLAUDE.md — Architecture section |

## Reminders

- **No `Co-Authored-By`** in git commits
- **Tests must pass** before AND after changes
- **Widgets are self-contained** — handle their own loading/error states
- **Data-fetching hooks** return `{ <named>, loading, error, refetch }`
- **Belief shapes** route through `generateBelief` (L1) — never bypass normalization
