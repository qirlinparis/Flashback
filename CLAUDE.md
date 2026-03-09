# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Agreement — READ THIS FIRST

- **Louvre architects, I build.** Every structural decision is theirs.
- **Never write code without them understanding every decision.** If they can't explain what a piece does and why, stop and explain the underlying concept.
- **When stuck, ask 1-2 questions before giving answers.** Let them figure it out first.
- **After each build stage, explain what happened underneath** — the invisible layer (what the OS did, what went over the wire, what's in memory). Use 3 levels: (1) what the code did, (2) what the OS/process did, (3) what went over the wire.
- **Push back when a decision won't scale.** Be honest about tradeoffs.
- **Never be hollow.** If something is unclear, say so. If a direction seems wrong, say so with reasoning. Never say "this works well" without explaining WHY. Never say "best practice" without naming the specific tradeoff it solves.
- **Deployment/infrastructure commands are Louvre's to type.** Claude writes code. But server admin commands (SSH, systemctl, nginx, certbot, dnf) — Louvre types those. Guide, don't execute.
- Louvre is learning programming from near-zero (Python). Explain concepts, not just syntax.

## Knowledge Gap Detection Protocol

Before skipping over any concept during a build, ask: **"If Louvre never learns this, will they be blocked on a whole class of bugs or problems? Does this knowledge give more leverage than the time it takes?"**

If yes → STOP. Ask 1–2 Socratic questions (what do you think would happen if...?).

Examples: how environment variables actually load into a process, how DNS resolves a domain to a port on a server, why SQL foreign keys refused an insert.

**The threshold:** If skipping this means Louvre will spend hours debugging a class of future errors without knowing where to look — pause and teach.

## /end-session Protocol

When Louvre says `/end-session` (or context is running low), do ALL of the following:

**1. Update memory files:**
- **MEMORY.md** — infrastructure, deployment state, what's pending next
- **LOUVRE_KNOWLEDGE.md** — any concepts that clicked or half-clicked this session
- **IDEAS.md** — any feature/architecture ideas that surfaced

**2. Skills delta:** What can Louvre now do alone that they couldn't before this session? Update the skills matrix.

**3. Two questions (metareflection):**
- **Actionable refinement:** One specific thing from THIS session we could do better next time. Not generic — name the exact moment. (e.g., "We spent 20 minutes on X because we didn't check Y first.")
- **Conceptual shift:** One assumption we're making about the project/architecture/learning that might be wrong. Challenge a foundation. (e.g., "Are we sure SQLite will hold at 1000 users, or should we test that assumption now?")

**4. High-leverage study:** Name the ONE concept that, if Louvre understands deeply before next session, will make everything easier. Be specific — link to a resource or frame the question to research.

## Commands

```bash
# Setup
cp .env.example .env              # then fill in real tokens
pip install -r requirements.txt

# Run the API server (port 8000)
python -m src.api

# Run the Telegram bot
python -m src.bot

# Both auto-initialize the database on startup (creates flashback.db)
```

No test framework configured yet.

## Architecture

**API-first (FastAPI).** The bot is one client. Future iOS app is another. All logic flows through the API.

### Structure
```
src/
  config.py    — loads .env (tokens, API host/port)
  database.py  — SQLite schema, all data access, scheduling logic
  api.py       — FastAPI app (ingest, surface, action, reflect endpoints)
  bot.py       — Telegram bot (polling) — calls database directly for now
```

### Data flow
```
Client (bot / iOS app / widget)
  → FastAPI backend (api.py)
    → Ingestion: text → [future: LLM splits entries] → store
    → Surfacing: get_due_fragments() → serve to client
    → Actions: keep/let_go/not_now → log interaction → update review state
```

### Data model
```
users (multi-user from day one)
  → entries (one coherent thread of thought, with AI metadata)
    → fragments (phase transitions in thinking)
      → review_states (scheduling per fragment)
  → reflections (optional thoughts on entries)
  → interaction_logs (every surfacing event — for algorithm research)
```

### Scheduling
- **Personal mode**: random surfacing, 30-day minimum gap, 30-90 day intervals for kept fragments. No rigid SRS.
- **Knowledge mode**: SM-2 style intervals with ease_factor (FSRS upgrade planned).
- 1-2 surfacings per day. Deep session mode on demand.
- Core insight: late > never >>>> too often.
- All interactions logged for future algorithm discovery.

### API endpoints
- `POST /ingest` — store text (single entry+fragment for now, LLM splitting next)
- `GET /surface/{user_id}` — get today's due fragments
- `POST /action` — record keep/not_now/let_go + log interaction
- `POST /reflect` — add reflection to entry
- `GET /health` — alive check

### LLM integration
- OpenRouter (not direct Anthropic API). Key: `OPENROUTER_API_KEY`.
- Used at ingestion: entry splitting, fragment ID, metadata generation. Not built yet.

## Product context

See `docs/PROJECT_STATE.md` for design decisions and `docs/prototype.jsx` for UI prototype.

Target: composable toward 1000+ paying users. iPhone only for now.

## Build priorities

1. ~~Telegram bot skeleton~~ ✓
2. ~~SQLite database schema~~ ✓
3. ~~FastAPI restructure + user_id + interaction logging~~ ✓
4. ~~Ingestion pipeline (text → LLM → entries/fragments/metadata)~~ ✓
5. ~~Scriptable widget (temporary iOS surface)~~ ✓
6. Production deployment (IN PROGRESS — see MEMORY.md for state)
7. Auth (API tokens)
