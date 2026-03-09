# Flashback

## What This Is
An SRS system for personal archive. Not Anki for facts — a retrieval layer for personal writing/thinking. The gap: every note tool optimizes for capture, nobody has solved "how do the right things come back at the right time" for personal writing.

Core value: re-encountering the version of you that understood something, at the moment you're ready to do something new with it.

## Who I'm Working With
Louvre. Based in Thailand. Learning programming from near-zero (Python). Has a law degree, studies Jaynes' Probability Theory (re-deriving it, not just reading), writes philosophical journal entries, and thinks by rejecting proxies to find the real thing underneath.

## Working Agreement — READ THIS FIRST
- **Louvre architects, I build.** Every structural decision is theirs.
- **Never write code without them understanding every decision.** If they can't explain what a piece does and why, stop and explain the underlying concept.
- **When stuck, ask 1-2 questions before giving answers.** Let them figure it out first.
- **After each build stage, explain what happened underneath** — the invisible layer (what the OS did, what went over the wire, what's in memory).
- **Push back when a decision won't scale.** Be honest about tradeoffs.
- **Never be hollow.** If something is unclear, say so. If a direction seems wrong, say so with reasoning.

## Architecture

### Data Model — Three Layers
```
Source (one paste action, raw input)
  → Entry (one coherent thread of thought — AI splits multi-topic pastes)
    → Fragment (the "moment of contact" / phase transition in thinking)
```

### Entry Schema
- id, text, source_type (telegram/notion/obsidian/manual), created_at
- original_date (parsed from text, user-provided, or omitted)
- mode: "knowledge" | "personal" (AI-assigned at ingestion)
- AI-generated metadata stored at ingestion: summary, conceptual_tags, emotional_register, tension (what's unresolved — [pole_A, pole_B])
- formal_skeleton (extracted structure: claims, variables, what's underdefined)

### Fragment Schema
- id, entry_id, text, fragment_type (phase_transition/key_insight/question)
- position_in_entry (start/end char indices)

### ReviewState (per fragment)
- fragment_id, next_review_date, interval_days, ease_factor, review_count
- status: active | archived | core
- mode determines scheduling function:
  - knowledge → classic SRS forgetting curve
  - personal → distance-value curve (sweet spot: weeks to months)

### Reflection Schema
- entry_id, text, created_at
- Optional — never demanded by the system

### Scheduling / Priority
- 1-2 surfacings per day maximum
- Alternate between knowledge and personal modes
- Ties broken by: longest past due date
- No notifications except rare high-value
- Deep session mode available on demand

## Interaction Design

### Widget (the door)
- Shows user's actual first words, trailing off with "..."
- Time distance below ("8 months ago")
- Dark, minimal, quiet
- Tap opens the room

### Room (the full experience)
- Full entry text, fragment highlighted (brighter), rest dimmed (but readable)
- Original date visible
- Past reflections shown below if they exist
- "Add a thought" hidden by default — small text link, never demands

### Actions
- "Let it go" → archived (reversible), confirmation: "you can find it again if you want"
- "Not now" → back in rotation, confirmation: "it'll come back"
- "Keep this" → shorter interval / permanent rotation, confirmation: "held close"
- Default (close without acting) = "Not now"

### Deep Session
- Swipeable card queue
- Dot indicators (subtle)
- Tap card to open room

## What Makes This Alien (future, not v1)
- Tension extraction at ingestion: every entry gets {tension: [pole_A, pole_B]}
- Formal skeleton extraction: claims, variables, objective functions, what's underdefined
- Retrieval by structural matching across domains, not topic similarity
- Contradiction surfacing: find user's own entries that disagree with each other
- These are stored from v1 but not used for retrieval until the archive is large enough

## Tech Stack (v1)
- Python + python-telegram-bot
- SQLite for persistence
- Claude API for ingestion processing (entry splitting, fragment ID, metadata)
- Deployed on DigitalOcean (student credits available)

## Current Status
- Repo initialized with README
- Interactive React prototype exists (flashback-prototype.jsx) — demonstrates widget → room → deep session flow using real journal entries
- No backend code yet
- Full project state doc exists (docs/PROJECT_STATE.md)

## What To Build Next
1. Telegram bot skeleton (polling, basic message handling)
2. SQLite database with the schema above
3. Ingestion pipeline: receive text → Claude API splits entries/identifies fragments/generates metadata → store
4. Basic SRS scheduler: compute what's due, send via Telegram
5. Interaction: user responds with action (keep/later/let go), system updates review state
