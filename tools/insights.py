"""
tools/insights.py — reads interaction_logs and prints a usage report.

Run directly on the server (no auth needed):
    python tools/insights.py

Uses the same DB_PATH env var as the main app (defaults to flashback.db
in the project root).
"""
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).parent.parent / "flashback.db"))


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def section(title):
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


def run():
    conn = connect()

    # ── 1. Totals ─────────────────────────────────────────────────────────────
    section("Totals")
    totals = conn.execute("""
        SELECT
            (SELECT COUNT(*) FROM users)         AS users,
            (SELECT COUNT(*) FROM entries)       AS entries,
            (SELECT COUNT(*) FROM fragments)     AS fragments,
            (SELECT COUNT(*) FROM interaction_logs) AS interactions
    """).fetchone()
    print(f"  users:        {totals['users']}")
    print(f"  entries:      {totals['entries']}")
    print(f"  fragments:    {totals['fragments']}")
    print(f"  interactions: {totals['interactions']}")

    # ── 2. Fallback rate ──────────────────────────────────────────────────────
    section("LLM fallback rate")
    entry_cols = [row[1] for row in conn.execute("PRAGMA table_info(entries)").fetchall()]
    if "used_fallback" in entry_cols:
        fb = conn.execute("""
            SELECT
                COUNT(*) AS total,
                SUM(used_fallback) AS fallbacks
            FROM entries
        """).fetchone()
        total_entries = fb["total"] or 1
        fallbacks = fb["fallbacks"] or 0
        pct = round(fallbacks / total_entries * 100, 1)
        print(f"  {fallbacks} / {total_entries} entries used fallback  ({pct}%)")
    else:
        print("  column not yet present — restart the API to apply the migration")

    # ── 3. Action distribution ────────────────────────────────────────────────
    section("Action distribution")
    actions = conn.execute("""
        SELECT action, COUNT(*) AS n
        FROM interaction_logs
        GROUP BY action
        ORDER BY n DESC
    """).fetchall()
    total_interactions = totals["interactions"] or 1
    for row in actions:
        pct = round(row["n"] / total_interactions * 100, 1)
        print(f"  {row['action']:<12} {row['n']:>5}  ({pct}%)")

    # ── 4. Average time spent per action ─────────────────────────────────────
    section("Average time spent (ms) per action")
    times = conn.execute("""
        SELECT action, ROUND(AVG(time_spent_ms)) AS avg_ms, COUNT(*) AS n
        FROM interaction_logs
        WHERE time_spent_ms IS NOT NULL
        GROUP BY action
        ORDER BY avg_ms DESC
    """).fetchall()
    if times:
        for row in times:
            print(f"  {row['action']:<12} {int(row['avg_ms']):>6} ms  (n={row['n']})")
    else:
        print("  no time_spent_ms data recorded yet")

    # ── 5. Engagement by hour of day ─────────────────────────────────────────
    section("Interactions by hour of day (UTC)")
    hours = conn.execute("""
        SELECT hour_of_day, COUNT(*) AS n
        FROM interaction_logs
        WHERE hour_of_day IS NOT NULL
        GROUP BY hour_of_day
        ORDER BY hour_of_day ASC
    """).fetchall()
    if hours:
        max_n = max(r["n"] for r in hours)
        for row in hours:
            bar = "█" * int(row["n"] / max_n * 20)
            print(f"  {row['hour_of_day']:02d}h  {bar:<20}  {row['n']}")
    else:
        print("  no hour_of_day data recorded yet")

    # ── 6. Reflection rate ────────────────────────────────────────────────────
    section("Reflection rate")
    ref = conn.execute("""
        SELECT
            COUNT(*) AS total,
            SUM(reflection_added) AS with_reflection
        FROM interaction_logs
    """).fetchone()
    with_ref = ref["with_reflection"] or 0
    total_i = ref["total"] or 1
    pct = round(with_ref / total_i * 100, 1)
    print(f"  {with_ref} / {total_i} interactions added a reflection  ({pct}%)")

    # ── 7. Fragments never surfaced ───────────────────────────────────────────
    section("Fragments never surfaced")
    unsurfaced = conn.execute("""
        SELECT COUNT(*) AS n
        FROM fragments f
        WHERE f.id NOT IN (
            SELECT DISTINCT fragment_id FROM interaction_logs
        )
    """).fetchone()
    total_frags = totals["fragments"] or 1
    n = unsurfaced["n"]
    pct = round(n / total_frags * 100, 1)
    print(f"  {n} / {total_frags} fragments have never been surfaced  ({pct}%)")

    conn.close()
    print()


if __name__ == "__main__":
    print(f"\nFlashback Insights — DB: {DB_PATH}")
    run()
