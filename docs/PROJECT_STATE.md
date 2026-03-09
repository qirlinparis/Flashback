# Flashback — Project State
### Last updated: March 9, 2026 (1 AM session)

---

## What Flashback Is

An SRS system for personal archive. Not Anki for facts — a retrieval layer for your own thinking. The gap it fills: every note tool optimizes for capture. Nobody has solved "how do the right things come back to me at the right time?" for personal writing, ideas, and reflections.

The core value: **re-encountering the version of you that understood something, at the moment you're ready to do something new with it.**

---

## Architecture Decisions (Locked)

### Data Model — Three Layers

```
Source (one paste action, raw input)
  → Entry (one coherent thread of thought — AI splits multi-topic pastes)
    → Fragment (the "moment of contact" — where thinking shifted)
```

- One paste can contain multiple entries (e.g., the Oct 16 journal had body-anxiety AND law-realization — two separate entries)
- AI identifies fragments by looking for **phase transitions in the writing**, not key sentences
- Metadata per entry: id, text, source type, created_at, original_date (parsed from text or user-provided or omitted), tags (AI-generated at ingestion for future semantic retrieval)

### Review State (per fragment)

```
- next_review_date
- interval (days)
- ease_factor
- review_count
- status: active | archived | core
```

### Reflections (optional, linked to entries)

```
- entry_id
- text
- created_at
```

### Ingestion
- v1: Plain text paste into Telegram bot
- AI silently processes: splits entries, identifies fragments, generates metadata
- No confirmation step — trust the system
- Future: Notion, Obsidian, Apple Notes, Discord, bookmarks, shared links

### Surfacing Algorithm
- v1: Time-based SRS (proven, no AI dependency)
- Future: relevance-triggered (connected to current thinking), resonance-triggered (conceptual similarity), importance-weighted (engagement data)
- Even in v1, store AI-generated summaries + conceptual tags + emotional register at ingestion — don't use them yet, but they're there for future algorithms

### Archive Philosophy
- Comprehensiveness first, curation emerges from engagement
- "Let it go" is reversible (archived, not deleted)
- The system filters for you — that's the core promise

---

## Interaction Design (Locked)

### The Widget (the door)
- Dark, minimal, Co-Star energy
- Shows **your actual first words** with trailing off, not AI paraphrase
- Time distance below ("8 months ago")
- Tapping opens the app (the room)
- 1-2 cards per day, quiet — no notifications except rare high-value
- If it has value, it can be quiet and you'll look for it

### The Room (the full experience)
- Full entry text with **fragment highlighted** (brighter text, rest dimmed — but not too dimmed)
- Original date visible
- Past reflections shown below chronologically if they exist
- "Add a thought" is hidden by default — just a small text link, never demands

### Actions (simplified)
Three states visible:
1. **"Let it go"** — archived, reversible, "you can find it again if you want"
2. **"Not now"** — back in rotation, normal timing, "it'll come back"
3. **"Keep this"** — shortened interval or permanent slow rotation, "held close"

Fourth state (core/forever) exists conceptually but review the interaction later.

Doing nothing (closing) = "Not now" by default. Zero friction path.

### Deep Session Mode
- Available when you want it, not pushed
- Swipeable queue (like Mymind's Serendipity tab)
- Dot indicators, subtle
- Each card shows your words + time distance + context tag
- Tap opens the room

### Confirmation Messages
Quiet, not celebratory:
- "it'll come back"
- "held close"  
- "archived — you can find it again if you want"

---

## Design Insights from Real Journal Entries

Three entries were analyzed. Key findings:

1. **Fragment identification should find "turns"** — moments where thinking shifted, not key facts. E.g., the passage from "I don't typically like dogs" through "so feather, I gave" is one turn.

2. **Different entries need different surfacing strategies:**
   - Emotional/experiential entries (café/dog) → time-based, periodic regardless of context
   - Decision-relevant entries (law realization) → ideally relevance-triggered
   - Philosophical frameworks (Valentine's/flowers) → ideally resonance-triggered

3. **The widget trigger should activate YOUR memory before you re-read.** The gap between trigger and full text is where value lives. But show your real words, not AI paraphrase.

4. **Multi-topic journal sessions must be split.** Oct 16 entry has two unrelated insights — treating it as one entry dilutes both.

---

## Prototype Status

- Interactive React prototype built (flashback-prototype.jsx)
- Uses real journal entries
- Shows: widget → room transition, fragment highlighting, reflection layer, deep session mode
- Feedback: fragment selection felt out of context — prefer showing full first sentence with trailing second sentence. Dimmed text too dim.
- NOT fixed yet — cosmetic, address in next iteration

---

## Technical Direction

### v1 Stack (Telegram bot)
- Python + python-telegram-bot
- SQLite for persistence
- AI (Claude API) for ingestion processing: entry splitting, fragment identification, metadata generation
- SRS algorithm (SM-2 variant adapted for non-factual content)
- Scheduled job for proactive surfacing via Telegram message

### Future Integrations (designed for, not built)
- Notion API
- Obsidian vault (local file access)
- Apple Notes (likely through shortcuts or export)
- Discord messages
- Web bookmarks / shared links
- iOS widget (requires native layer — Path C: pre-loaded queue)

### Key Principle
Louvre directs architecture, Claude builds. Every decision about what the system should do is Louvre's. The learning happens through making structural decisions, understanding output, catching errors — not typing syntax.

---

## Open Questions for Next Session

1. Widget text: full first sentence + trailing second sentence? Or something else?
2. Dimmed text opacity — find the right level
3. How much AI processing at paste time? (entry splitting + fragment ID + tags — what else?)
4. Exact gesture/interaction mapping refinement
5. Queue size for deep session — fixed or dynamic?
6. Cold start: import existing Apple Notes archive early? Or build capture flow first?
7. How should the "high-value only" notification trigger work? What makes something high-value?

---

## Broader Context

This project sits at the intersection of the two highest-leverage skills for Louvre's next 30 years: **building independently** (directing AI to construct systems you architect) and **information asymmetry** (understanding systems deeply enough that abstraction doesn't become dependency).

The meta-skill being practiced: envision a system → direct its construction → understand how it works → verify correctness → deploy into the real world. That loop is the atomic unit of building independently. Flashback is the first real iteration.
