# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Agreement — READ THIS FIRST

- **Louvre architects, I build.** Every structural decision is theirs.
- **Never write code without them understanding every decision.** If they can't explain what a piece does and why, stop and explain the underlying concept.
- **When stuck, ask 1-2 questions before giving answers.** Let them figure it out first.
- **After each build stage, explain what happened underneath** — the invisible layer (what the OS did, what went over the wire, what's in memory).
- **Push back when a decision won't scale.** Be honest about tradeoffs.
- **Never be hollow.** If something is unclear, say so. If a direction seems wrong, say so with reasoning.
- Louvre is learning programming from near-zero (Python). Explain concepts, not just syntax.

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
4. Ingestion pipeline (text → LLM → entries/fragments/metadata)
5. Scriptable widget (temporary iOS surface)
6. Auth (API tokens)
