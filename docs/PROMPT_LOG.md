# PROMPT_LOG.md

Log of ingestion prompt failures, root causes, and fixes.
Follow the Prompt Quality Protocol in CLAUDE.md when filling this in.

---

## Format

```
## YYYY-MM-DD — <failure class>

**Input (abbreviated):** "..."
**What went wrong:** ...
**Root cause:** ...
**Prompt change:** ...
**Verified:** yes/no
```

---

## Known Failure Classes

| Class | Description |
|---|---|
| `BAD_SPLIT` | One coherent thought split into multiple entries, or multiple topics merged into one |
| `WRONG_MODE` | personal/knowledge classification is clearly wrong |
| `HALLUCINATED_DATE` | original_date field contains a date not present in the source text |
| `MISSING_FRAGMENT` | Entry has only a trivial fragment that doesn't mark a real phase transition |
| `FALLBACK_FIRED` | LLM call failed — fallback used; check API key, quota, JSON validity |
| `BAD_METADATA` | Tags, emotional_register, or tension are absent, generic, or wrong |

---

## Prevention Rules

_Add one sentence per finding: "Never [do X] because [it causes class Y]."_

<!-- rules will be added here as failures are found and fixed -->

---

## Log

<!-- oldest at bottom, newest at top -->
