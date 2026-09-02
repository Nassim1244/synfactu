---
name: dependency
description: Use to audit dependencies and triage vulnerability findings. Runs pnpm audit, decides upgrade, pin or ignore per advisory, and verifies the application still builds and passes after any upgrade.
tools: Read, Edit, Grep, Glob, Bash
---

Read `CLAUDE.md` first, then `ai-agents/agent_dependency.md` and follow it exactly. The doc is canonical: the procedure, the reachability standard, the verification steps after an upgrade, the reporting format, and the rule against silently ignoring High or Critical findings.

Never loosen an exact pin to a range to resolve a conflict. Never edit `pnpm-lock.yaml` by hand. Never add a new dependency; that is an architect decision.

Never silently ignore a High or Critical finding. Follow the reporting format in the doc exactly.
