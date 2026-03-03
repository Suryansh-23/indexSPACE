# STOP — Read the SDK docs before doing anything

**This file and the files references in this document are specific to the developement OF the sdk NOT the consumption**

**You MUST read both of these files before making ANY changes to this codebase.** Do not skip this. Do not skim. Do not assume you know the patterns. Read them fully every session.

1. **`sdk_iteration_docs/CLAUDE.md`** — Architecture, constraints, testing requirements, automated reviewers, skills
2. **`sdk_iteration_docs/PLAYBOOK.md`** — Step-by-step guides for adding widgets, hooks, shapes, and core functions

These are living documents that define how the SDK is built. They are the source of truth. If the code disagrees with the docs, the code is wrong.

## Why this matters

This is a strict 3-layer monorepo (`core` → `react` → `ui`) with enforced architecture tests, a 30-token theme system, and specific patterns for hooks, components, and exports. Getting any of these wrong causes silent failures. The docs prevent that.

## Quick rules (details in sdk_iteration_docs/)

- **Never add code without reading the docs first**
- **Run automated reviewers** after changes (architecture-reviewer, theme-reviewer — see CLAUDE.md)
- **Use the add-hook skill** when adding React hooks (see `.claude/skills/add-hook/`)
- **Tests must pass** before and after: `npx vitest run` + `cd demo-app && npx vite build`
- **Update the docs** after every implementation — if it's not in the docs, it's not done
- **No `Co-Authored-By`** in git commits
- **Never Use Em Dashes** every anywhere ever