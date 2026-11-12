# WriteSpace.lk — Working Rules (read first)

Primary context: **this file + [PROGRESS.md](PROGRESS.md)**. Use
[docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) only when you need repo structure.
Design/rationale: [ARCHITECTURE.md](ARCHITECTURE.md). Setup: [README.md](README.md).

## Session management & token optimization (mandatory)

1. **One task per session.** Handle one clearly defined task per conversation.
   Don't auto-start unrelated work; avoid unnecessary exploration and repeated explanation.
2. **On task completion:** (a) verify + run relevant targeted tests; (b) summarize changes briefly;
   (c) update `PROGRESS.md` only if meaningful progress was made; (d) report modified files,
   test results, remaining issues; (e) confirm whether the task is fully completed.
3. **End every completed task** by telling the user:
   "Task completed. Start a fresh Claude Code session using /clear before beginning the next unrelated task."
   Then stop — no further exploring/reviewing/suggesting unless asked.
4. **Context:** CLAUDE.md + PROGRESS.md are primary; PROJECT_MAP.md only for structure.
   Don't re-read unchanged files, don't scan the whole repo for one task, avoid unnecessary
   subagents/duplicate tool calls, keep output concise, don't repeat established info.
5. **Preserve work:** never discard uncommitted changes; never modify unrelated files;
   never commit/push/switch branches without explicit approval; preserve existing decisions/conventions.
6. **Fresh sessions:** don't assume prior chat history. Read this file + PROGRESS.md, then
   inspect only the files the new task needs.
7. These rules apply to all future tasks here. Minimize token use while keeping quality,
   correctness, and reliability.

## Fixed project conventions
- Money = integer minor units (LKR cents); format only at display (`src/lib/pricing/money.ts`).
- Demo mode: `hasSupabase()` serves fixtures from `src/lib/demo/data.ts` when env is absent.
- Keep DB schema in step across `supabase/migrations/*`, `seed.sql`, and `setup.sql`.
- Admin defense-in-depth: middleware gate + `requirePerm` + Postgres RLS.
