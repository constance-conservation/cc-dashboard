# CLAUDE.md — CC-Dashboard Collaboration Rules

These rules govern every session in this repository. Follow them exactly.

---

## Session startup

1. Read `WORK.md` at the start of every session to load current sprint context.
2. Identify the active branch. If on `main`, stop and ask which branch to use.
3. Brief the user on where we left off before doing anything.

---

## Memory management

Continuously write to the persistent memory system at `C:\Users\61422\.claude\projects\c--Users-61422-Projects-cc-dashboard\memory\` throughout every session. Do not wait until the end.

**Save immediately when you learn:**
- A new tool, integration, or credential is available (type: `reference`)
- James corrects your approach or confirms a non-obvious one worked (type: `feedback`)
- A task decision, deadline, or constraint is stated (type: `project`)
- Anything about James's role, preferences, or working style (type: `user`)

**What NOT to save:** code patterns derivable from reading files, git history, ephemeral task state that only matters this session.

**Format:** Each memory is its own `.md` file with frontmatter (`name`, `description`, `type`). Always update `MEMORY.md` index after writing or updating a file. Check for an existing memory to update before creating a new one.

---

## Work tracking

- **WORK.md** is the single source of truth for sprint tasks, backlog, and completed work.
- Update it as you go: set status to "In Progress" when starting, add findings, mark done when complete.
- When a new task arrives, add it to WORK.md before writing any code.
- Analyse each task for sub-agent parallelisation. Document the analysis in WORK.md under the task.

---

## Branch and deploy strategy

- **Never commit directly to `main`.**
- Branch names: `feat/<short-description>` for features, `fix/<short-description>` for bug fixes.
- At the end of every session, push the current branch to the remote so Vercel auto-builds a preview.
- Do not open a PR unless James explicitly asks — development may continue on the branch.

---

## Sub-agent parallelisation

When given a multi-part task:
1. Break it into atomic subtasks.
2. Identify which are independent (no shared file writes, no ordering dependencies).
3. Document the parallelisation plan in WORK.md.
4. Spawn parallel sub-agents for independent subtasks using the `Agent` tool with `subagent_type=general-purpose`.
5. Collect results and integrate.

---

## Supabase / database rules

- **Always ask James before running any migration against Supabase.** Prepare the SQL file first, show it, then wait for explicit approval.
- New tables must include RLS + an `anon_all_<table>` policy (`FOR ALL TO anon USING (true) WITH CHECK (true)`).
- Migration files go in `supabase/migrations/` numbered sequentially (e.g. `012_...`).

---

## Code conventions

- CSS: `var(--*)` design tokens — never raw Tailwind utilities.
- State: global via `CCStateContext` (`lib/store/CCStateContext.tsx`), local UI via `useState`.
- No comments unless the WHY is non-obvious.
- No extra abstractions beyond what the task requires.

---

## TypeScript checks

- Run `npx tsc --noEmit` and `git diff` as **separate** Bash calls — never chain with `|`.
- Errors in `.next/` are pre-existing and can be ignored; filter with `grep -v ".next/"`.

---

## Testing

- Test runner: **Vitest** (`npm test` = single run, `npm run test:watch` = watch mode).
- Test files live at `lib/**/*.test.ts` — co-located with the module they test.
- Pure business logic must be extracted to `lib/` modules before testing. Never test React components or Supabase calls directly.
- **Write or update tests whenever you:**
  - Add a new pure function to `lib/`
  - Fix a bug in existing logic (regression test first, then fix)
  - Add a new feature to the rostering engine or any other `lib/` module
- Run `npm test` after every change to a tested module. All tests must pass before committing.
- Test file reference: `lib/rostering/engine.test.ts` — rostering auto-generate, computeMonthlyTarget, etc.
