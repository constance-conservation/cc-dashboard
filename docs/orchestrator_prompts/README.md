# Orchestrator prompts

Self-contained prompts for spinning up parallel Claude Code instances
to execute specific briefs from `docs/executor_briefs/`.

## Convention

Each prompt is self-contained — a parallel session has zero context
from the orchestrator's chat history. Prompts cover:

1. **Big picture** — what the project is, what's already shipped.
2. **Repo state** — exact branch / commit / cwd to start from.
3. **The brief to execute** — file path in the repo.
4. **Hard constraints** — files NOT to touch (to avoid clobbering
   parallel sessions), git operations not to perform.
5. **Coordination notes** — what other parallel work is happening.
6. **Report-back format** — concise status to surface back to the orchestrator.

## How to use

The user (Peter) opens a fresh Claude Code instance in this repo. Pastes
the prompt body into the first message. The instance:

- Pulls latest main
- Cuts the feature branch
- Reads the brief
- Implements
- Builds + verifies
- Pushes + opens PR
- Reports back

The orchestrator (the main Claude Code session) reviews each PR and
performs the merge.

## Active prompts (round 4)

- `E15b_session_prompt.md` — Add/delete sites + zones + new client (½ day)
- `E16_session_prompt.md` — Generation pipeline full port + tests + Vercel Cron (~2 days)

## Archive (merged)

- `E10b_session_prompt.md` — edit mode + image uploads ✅ merged
- `E11_session_prompt.md` — Inspections page ✅ merged
- `E13_session_prompt.md` — Operations 3 pages ✅ merged
- `E12_session_prompt.md` — Pipeline Health page ✅ merged
- `E14_session_prompt.md` — Global Sites view ✅ merged
- `E15_session_prompt.md` — Inline CRUD across reporting views ✅ merged

## Worktree pattern (round 3+)

After round 2 hit branch chaos (multiple sessions stashing each other's
work in a single shared tree), the standard is now:

```
cd /Users/feelgood/Desktop/cc-dashboard
git checkout main && git pull
git worktree add /Users/feelgood/Desktop/cc-dashboard-eXX -b feature/reporting-port-eXX main
cd /Users/feelgood/Desktop/cc-dashboard-eXX
cp /Users/feelgood/Desktop/cc-dashboard/.env.local .
npm install
```

Each session lives in its own physical directory. No `git checkout`
fights. After merge, the orchestrator runs `git worktree remove
/Users/feelgood/Desktop/cc-dashboard-eXX` to clean up.

## Adding new prompts

When a new brief lands in `docs/executor_briefs/` and is suitable for
parallel execution, write a prompt here following the same structure.
