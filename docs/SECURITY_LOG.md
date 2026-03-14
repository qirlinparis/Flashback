# Flashback — Security Log

Every finding from the security test suite lives here. Each entry has a class, a root cause, and a prevention rule. The prevention rules feed directly into the security-auditor agent prompt so the same class of problem never gets introduced again.

---

## Known Vulnerability Classes

| Class | What it means |
|-------|---------------|
| `AUTH_BYPASS` | An endpoint is reachable without a valid token |
| `IDOR` | A user can read or modify another user's data by guessing IDs |
| `INJECTION` | User input reaches a SQL query, shell command, or template without sanitization |
| `INPUT_VALIDATION` | Malformed or unexpected input causes a 500 instead of a graceful 422 |
| `TOKEN_LIFECYCLE` | Tokens not invalidated on re-issue, tokens stored in plaintext, tokens logged |
| `LOGIC_ERROR` | Business logic produces a wrong outcome (wrong ownership check, wrong scheduling) |

---

## Prevention Rules (active)

These rules are extracted from past findings and loaded into the security-auditor agent. The agent checks for these in every code review.

*(none yet — added when first real finding is logged)*

---

## Finding Log

### How to add an entry

```
### YYYY-MM-DD — <short title>
**Class:** <class from table above>
**Found by:** security_test.py test [N] / manual review / external report
**What failed:** <what the test showed>
**Root cause:** <why the code was wrong>
**Fix:** <what was changed>
**Prevention rule added:** <the one-sentence rule that prevents this class>
**Test added:** yes/no — <test name if yes>
```

---

*(no findings yet — first run pending)*
