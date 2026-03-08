/**
 * db.test.js – Integration tests for the database layer
 * Uses Node.js built-in test runner (node --test)
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Use a temp file so tests are isolated
const TMP_DB = path.join(os.tmpdir(), `flashback_test_${Date.now()}.db`);
process.env.DB_PATH = TMP_DB;

const db = require("../src/db");
const { createItem } = require("../src/srs");

after(() => {
  db.closeDb();
  try { fs.unlinkSync(TMP_DB); } catch {}
});

const ENTRY = {
  id: "test_abc123",
  source: "manual",
  title: "Test Entry",
  content: "This is a test entry content.",
  tags: ["test", "memory"],
};

describe("upsertEntry / getEntry", () => {
  it("inserts a new entry", () => {
    db.upsertEntry(ENTRY);
    const found = db.getEntry(ENTRY.id);
    assert.equal(found.id, ENTRY.id);
    assert.equal(found.source, ENTRY.source);
    assert.equal(found.title, ENTRY.title);
    assert.equal(found.content, ENTRY.content);
    assert.deepEqual(found.tags, ENTRY.tags);
  });

  it("returns null for non-existent entry", () => {
    assert.equal(db.getEntry("does_not_exist"), null);
  });

  it("upserts (updates) an existing entry", () => {
    db.upsertEntry({ ...ENTRY, title: "Updated Title" });
    const found = db.getEntry(ENTRY.id);
    assert.equal(found.title, "Updated Title");
  });
});

describe("listEntries", () => {
  it("lists all entries", () => {
    const entries = db.listEntries();
    assert.ok(entries.length >= 1);
    assert.ok(entries.some((e) => e.id === ENTRY.id));
  });

  it("filters by source", () => {
    db.upsertEntry({ ...ENTRY, id: "test_notion_1", source: "notion" });
    const notionEntries = db.listEntries({ source: "notion" });
    assert.ok(notionEntries.every((e) => e.source === "notion"));
  });
});

describe("deleteEntry", () => {
  it("removes an entry", () => {
    const id = "test_to_delete";
    db.upsertEntry({ ...ENTRY, id });
    db.deleteEntry(id);
    assert.equal(db.getEntry(id), null);
  });
});

describe("upsertSrsMeta / getSrsMeta", () => {
  it("saves and retrieves SRS metadata", () => {
    const srs = createItem();
    db.upsertSrsMeta(ENTRY.id, srs);
    const saved = db.getSrsMeta(ENTRY.id);
    assert.ok(saved);
    assert.equal(saved.repetitions, srs.repetitions);
    assert.equal(saved.interval, srs.interval);
    assert.equal(saved.easinessFactor, srs.easinessFactor);
  });

  it("returns null when no SRS meta exists", () => {
    assert.equal(db.getSrsMeta("definitely_missing"), null);
  });
});

describe("getDueEntries", () => {
  it("returns entries whose nextReview is in the past", () => {
    // The entry we created above with createItem() is immediately due
    const due = db.getDueEntries(10);
    assert.ok(due.some((e) => e.id === ENTRY.id));
  });

  it("does not return entries scheduled in the future", () => {
    const futureId = "test_future";
    db.upsertEntry({ ...ENTRY, id: futureId });
    const futureSRS = {
      repetitions: 1,
      interval: 30,
      easinessFactor: 2.5,
      nextReview: new Date(Date.now() + 30 * 86400_000).toISOString(),
    };
    db.upsertSrsMeta(futureId, futureSRS);

    const due = db.getDueEntries(100);
    assert.ok(!due.some((e) => e.id === futureId));
  });
});
