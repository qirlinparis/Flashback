import os
import sqlite3
import random
import secrets
import hashlib
from datetime import datetime, date
from pathlib import Path
from src.config import API_TOKEN_SECRET

DB_PATH = Path(os.environ.get("DB_PATH", str(Path(__file__).parent.parent / "flashback.db")))


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create all tables if they don't exist."""
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id     INTEGER UNIQUE,
                api_token_hash  TEXT UNIQUE,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS entries (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER NOT NULL REFERENCES users(id),
                text            TEXT NOT NULL,
                source_type     TEXT DEFAULT 'telegram',
                created_at      TEXT DEFAULT (datetime('now')),
                original_date   TEXT,
                mode            TEXT DEFAULT 'personal',
                summary         TEXT,
                conceptual_tags TEXT,
                emotional_register TEXT,
                tension         TEXT,
                formal_skeleton TEXT
            );

            CREATE TABLE IF NOT EXISTS fragments (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_id        INTEGER NOT NULL REFERENCES entries(id),
                text            TEXT NOT NULL,
                fragment_type   TEXT DEFAULT 'phase_transition',
                char_start      INTEGER,
                char_end        INTEGER
            );

            CREATE TABLE IF NOT EXISTS review_states (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                fragment_id     INTEGER NOT NULL REFERENCES fragments(id),
                next_review_date TEXT NOT NULL,
                interval_days   INTEGER DEFAULT 1,
                ease_factor     REAL DEFAULT 2.5,
                review_count    INTEGER DEFAULT 0,
                status          TEXT DEFAULT 'active'
            );

            CREATE TABLE IF NOT EXISTS reflections (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_id        INTEGER NOT NULL REFERENCES entries(id),
                user_id         INTEGER NOT NULL REFERENCES users(id),
                text            TEXT NOT NULL,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS interaction_logs (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER NOT NULL REFERENCES users(id),
                fragment_id     INTEGER NOT NULL REFERENCES fragments(id),
                action          TEXT NOT NULL,
                time_spent_ms   INTEGER,
                reflection_added INTEGER DEFAULT 0,
                surfaced_at     TEXT DEFAULT (datetime('now')),
                hour_of_day     INTEGER,
                day_of_week     INTEGER
            );
        """)

        # Migration: add api_token_hash to databases that predate this column
        existing_cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "api_token_hash" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN api_token_hash TEXT UNIQUE")


# --- Users ---

def get_or_create_user(telegram_id):
    """Returns user row. Creates if first time. Used by the bot (no token)."""
    with get_connection() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)
        ).fetchone()
        if user:
            return user
        conn.execute(
            "INSERT INTO users (telegram_id) VALUES (?)", (telegram_id,)
        )
        return conn.execute(
            "SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)
        ).fetchone()


def _generate_token():
    return "flbk_" + secrets.token_hex(32)


def _hash_token(raw_token):
    return hashlib.sha256((API_TOKEN_SECRET + raw_token).encode()).hexdigest()


def register_user(telegram_id):
    """Issues a fresh token. Returns (user_row, raw_token). Used by /register API."""
    raw_token = _generate_token()
    token_hash = _hash_token(raw_token)
    with get_connection() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)
        ).fetchone()
        if user:
            conn.execute(
                "UPDATE users SET api_token_hash = ? WHERE id = ?",
                (token_hash, user["id"])
            )
        else:
            conn.execute(
                "INSERT INTO users (telegram_id, api_token_hash) VALUES (?, ?)",
                (telegram_id, token_hash)
            )
        user = conn.execute(
            "SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)
        ).fetchone()
    return user, raw_token


def get_user_by_token(raw_token):
    """Returns user row if token is valid, None otherwise."""
    token_hash = _hash_token(raw_token)
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE api_token_hash = ?", (token_hash,)
        ).fetchone()


def fragment_belongs_to_user(fragment_id, user_id):
    """Returns True if the fragment belongs to the given user."""
    with get_connection() as conn:
        return conn.execute("""
            SELECT f.id FROM fragments f
            JOIN entries e ON f.entry_id = e.id
            WHERE f.id = ? AND e.user_id = ?
        """, (fragment_id, user_id)).fetchone() is not None


# --- Write ---

def save_entry(user_id, text, source_type="telegram", original_date=None,
               mode="personal", summary=None, conceptual_tags=None,
               emotional_register=None, tension=None, formal_skeleton=None):
    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO entries (user_id, text, source_type, original_date, mode,
                                 summary, conceptual_tags, emotional_register,
                                 tension, formal_skeleton)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, text, source_type, original_date, mode,
              summary, conceptual_tags, emotional_register,
              tension, formal_skeleton))
        return cursor.lastrowid


def save_fragment(entry_id, text, fragment_type="phase_transition",
                  char_start=None, char_end=None):
    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO fragments (entry_id, text, fragment_type, char_start, char_end)
            VALUES (?, ?, ?, ?, ?)
        """, (entry_id, text, fragment_type, char_start, char_end))
        fragment_id = cursor.lastrowid

    # auto-create review state for every new fragment
    init_review_state(fragment_id)
    return fragment_id


def init_review_state(fragment_id):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO review_states (fragment_id, next_review_date)
            VALUES (?, date('now', '+1 day'))
        """, (fragment_id,))


def save_reflection(user_id, entry_id, text):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO reflections (user_id, entry_id, text)
            VALUES (?, ?, ?)
        """, (user_id, entry_id, text))


def log_interaction(user_id, fragment_id, action, time_spent_ms=None,
                    reflection_added=False):
    """Log every surfacing event for future algorithm research."""
    now = datetime.now()
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO interaction_logs
                (user_id, fragment_id, action, time_spent_ms,
                 reflection_added, hour_of_day, day_of_week)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, fragment_id, action, time_spent_ms,
              int(reflection_added), now.hour, now.weekday()))


# --- Read ---

def get_entry(entry_id):
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM entries WHERE id = ?", (entry_id,)
        ).fetchone()


def get_fragments_for_entry(entry_id):
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM fragments WHERE entry_id = ?", (entry_id,)
        ).fetchall()


def get_reflections_for_entry(entry_id):
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM reflections WHERE entry_id = ? ORDER BY created_at ASC",
            (entry_id,)
        ).fetchall()


def get_due_fragments(user_id, limit=2):
    """
    Returns fragments due for review today.

    Personal mode: random order, skips anything surfaced within last 30 days.
    Knowledge mode: most overdue first.
    """
    with get_connection() as conn:
        # get all due fragments for this user
        rows = conn.execute("""
            SELECT f.*, e.mode, e.text AS entry_text, rs.next_review_date,
                   rs.interval_days, rs.review_count, rs.status
            FROM fragments f
            JOIN entries e ON f.entry_id = e.id
            JOIN review_states rs ON rs.fragment_id = f.id
            WHERE e.user_id = ?
              AND rs.status = 'active'
              AND rs.next_review_date <= date('now')
              AND f.id NOT IN (
                  SELECT fragment_id FROM interaction_logs
                  WHERE user_id = ?
                    AND surfaced_at >= datetime('now', '-30 days')
                    AND action != 'not_now'
              )
            ORDER BY rs.next_review_date ASC
        """, (user_id, user_id)).fetchall()

    if not rows:
        return []

    # split by mode
    personal = [r for r in rows if r["mode"] == "personal"]
    knowledge = [r for r in rows if r["mode"] == "knowledge"]

    # personal: random pick
    if personal:
        random.shuffle(personal)

    # knowledge: already sorted by most overdue (from SQL)

    # interleave: alternate modes, prefer depth (fewer total)
    result = []
    pi, ki = 0, 0
    prefer_personal = True
    while len(result) < limit and (pi < len(personal) or ki < len(knowledge)):
        if prefer_personal and pi < len(personal):
            result.append(personal[pi])
            pi += 1
        elif ki < len(knowledge):
            result.append(knowledge[ki])
            ki += 1
        elif pi < len(personal):
            result.append(personal[pi])
            pi += 1
        prefer_personal = not prefer_personal

    return result


# --- Update ---

def update_review_state(fragment_id, action):
    """
    Update scheduling after user responds.
    action: 'keep' | 'not_now' | 'let_go'
    """
    with get_connection() as conn:
        state = conn.execute(
            "SELECT * FROM review_states WHERE fragment_id = ?", (fragment_id,)
        ).fetchone()

        if not state:
            return

        if action == "let_go":
            # archived — never surfaces again
            conn.execute("""
                UPDATE review_states SET status = 'archived'
                WHERE fragment_id = ?
            """, (fragment_id,))

        elif action == "not_now":
            # back in rotation at current interval
            conn.execute("""
                UPDATE review_states
                SET next_review_date = date('now', '+' || interval_days || ' days'),
                    review_count = review_count + 1
                WHERE fragment_id = ?
            """, (fragment_id,))

        elif action == "keep":
            # get entry mode to decide scheduling
            entry_mode = conn.execute("""
                SELECT e.mode FROM entries e
                JOIN fragments f ON f.entry_id = e.id
                WHERE f.id = ?
            """, (fragment_id,)).fetchone()

            if entry_mode and entry_mode["mode"] == "personal":
                # personal: random interval between 30-90 days
                new_interval = random.randint(30, 90)
            else:
                # knowledge: increase interval (SM-2 style)
                new_interval = int(state["interval_days"] * state["ease_factor"])

            conn.execute("""
                UPDATE review_states
                SET next_review_date = date('now', '+' || ? || ' days'),
                    interval_days = ?,
                    review_count = review_count + 1
                WHERE fragment_id = ?
            """, (new_interval, new_interval, fragment_id))
