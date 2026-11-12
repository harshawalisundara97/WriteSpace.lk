# WriteSpace.lk — Working Rules (read first)

Primary context: **this file + [PROGRESS.md](PROGRESS.md)** (current status). Use
[docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) only when repo structure is needed.
Design/rationale: [ARCHITECTURE.md](ARCHITECTURE.md). Setup: [README.md](README.md).

## Task & conversation management (mandatory)

1. **One task per conversation.** Handle one development task at a time; don't continue with
   unrelated work after it's done. Avoid unnecessary exploration, repeated explanation, duplicate analysis.
2. **At task completion:** (1) verify the implementation; (2) run relevant targeted tests;
   (3) update `PROGRESS.md` only when meaningful progress was made; (4) summarize modified files
   + test results; (5) state clearly whether the task is complete; (6) give a short handoff
   summary if further work is pending.
3. **Conversation handoff** — after completing a task, tell the user:
   "Task completed. You can start a new conversation within this same project for your next task.
   Use the project documentation and relevant files to continue."
   Do not automatically start another task.
4. **Context efficiency.** CLAUDE.md is the primary instruction source; PROGRESS.md for status;
   PROJECT_MAP.md only when necessary. Don't repeatedly scan the repo or re-read unchanged files
   without reason; avoid unnecessary agents/tool calls; keep responses and terminal output concise;
   don't repeat what the docs already say.
5. **Preserve existing work.** Never discard uncommitted changes; don't modify unrelated files;
   don't commit/push/switch branches without approval; preserve existing architecture and decisions.
6. **New conversation behaviour.** Don't assume prior chat history. Use the project docs, identify
   the requested task, inspect only the relevant implementation files, and don't reconstruct the
   whole project context unnecessarily.

These rules apply to every task in this project. Minimize token use while keeping quality,
correctness, and reliability.

## Fixed project conventions
- Money = integer minor units (LKR cents); format only at display (`src/lib/pricing/money.ts`).
- Demo mode: `hasSupabase()` serves fixtures from `src/lib/demo/data.ts` when env is absent.
- Keep DB schema in step across `supabase/migrations/*`, `seed.sql`, and `setup.sql`.
- Admin defense-in-depth: middleware gate + `requirePerm` + Postgres RLS.
