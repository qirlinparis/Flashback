/**
 * db.js – SQLite database layer using Node.js built-in node:sqlite
 *
 * Schema:
 *   entries  – imported journal / note snippets
 *   srs_meta – SM-2 metadata linked to each entry
 *
 * Requires Node.js >= 22.5.0 (built-in SQLite support).
 */

const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "flashback.db");

let _db;

function getDb() {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id          TEXT PRIMARY KEY,
      source      TEXT NOT NULL,
      title       TEXT,
      content     TEXT NOT NULL,
      tags        TEXT DEFAULT '[]',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS srs_meta (
      entry_id          TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
      repetitions       INTEGER NOT NULL DEFAULT 0,
      interval_days     INTEGER NOT NULL DEFAULT 0,
      easiness_factor   REAL    NOT NULL DEFAULT 2.5,
      next_review       TEXT    NOT NULL,
      last_reviewed_at  TEXT
    );
  `);
}

// ─── Entries ────────────────────────────────────────────────────────────────

function upsertEntry(entry) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO entries (id, source, title, content, tags, created_at, updated_at)
    VALUES (@id, @source, @title, @content, @tags, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title      = excluded.title,
      content    = excluded.content,
      tags       = excluded.tags,
      updated_at = excluded.updated_at
  `).run({
    ...entry,
    tags: JSON.stringify(entry.tags || []),
    created_at: entry.created_at || now,
    updated_at: now,
  });
}

function getEntry(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM entries WHERE id = ?").get(id);
  return row ? parseEntry(row) : null;
}

function listEntries({ source } = {}) {
  const db = getDb();
  const rows = source
    ? db.prepare("SELECT * FROM entries WHERE source = ? ORDER BY created_at DESC").all(source)
    : db.prepare("SELECT * FROM entries ORDER BY created_at DESC").all();
  return rows.map(parseEntry);
}

function deleteEntry(id) {
  getDb().prepare("DELETE FROM entries WHERE id = ?").run(id);
}

function parseEntry(row) {
  return { ...row, tags: JSON.parse(row.tags || "[]") };
}

// ─── SRS Meta ────────────────────────────────────────────────────────────────

function upsertSrsMeta(entryId, meta) {
  getDb().prepare(`
    INSERT INTO srs_meta (entry_id, repetitions, interval_days, easiness_factor, next_review, last_reviewed_at)
    VALUES (@entry_id, @repetitions, @interval_days, @easiness_factor, @next_review, @last_reviewed_at)
    ON CONFLICT(entry_id) DO UPDATE SET
      repetitions      = excluded.repetitions,
      interval_days    = excluded.interval_days,
      easiness_factor  = excluded.easiness_factor,
      next_review      = excluded.next_review,
      last_reviewed_at = excluded.last_reviewed_at
  `).run({
    entry_id: entryId,
    repetitions: meta.repetitions,
    interval_days: meta.interval,
    easiness_factor: meta.easinessFactor,
    next_review: meta.nextReview,
    last_reviewed_at: new Date().toISOString(),
  });
}

function getSrsMeta(entryId) {
  const row = getDb().prepare("SELECT * FROM srs_meta WHERE entry_id = ?").get(entryId);
  if (!row) return null;
  return {
    repetitions: row.repetitions,
    interval: row.interval_days,
    easinessFactor: row.easiness_factor,
    nextReview: row.next_review,
    lastReviewedAt: row.last_reviewed_at,
  };
}

/** Returns entries whose next_review is today or earlier, joined with their entry data. */
function getDueEntries(limit = 20) {
  const now = new Date().toISOString();
  const rows = getDb().prepare(`
    SELECT e.*, s.repetitions, s.interval_days, s.easiness_factor, s.next_review, s.last_reviewed_at
    FROM entries e
    JOIN srs_meta s ON s.entry_id = e.id
    WHERE s.next_review <= ?
    ORDER BY s.next_review ASC
    LIMIT ?
  `).all(now, limit);
  return rows.map((r) => ({
    ...parseEntry(r),
    srs: {
      repetitions: r.repetitions,
      interval: r.interval_days,
      easinessFactor: r.easiness_factor,
      nextReview: r.next_review,
      lastReviewedAt: r.last_reviewed_at,
    },
  }));
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = {
  getDb,
  upsertEntry,
  getEntry,
  listEntries,
  deleteEntry,
  upsertSrsMeta,
  getSrsMeta,
  getDueEntries,
  closeDb,
};
