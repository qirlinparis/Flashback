/**
 * index.js – Flashback API server
 *
 * Endpoints:
 *   GET  /health                      – liveness check
 *   GET  /entries                     – list all imported entries
 *   POST /entries                     – manually add an entry
 *   DELETE /entries/:id               – remove an entry and its SRS data
 *   GET  /review/due                  – get entries due for review today
 *   POST /review/:id                  – submit a review rating (0-5)
 *   POST /sync/:source                – trigger a sync from notion|obsidian|apple_notes
 */

const express = require("express");
const cron = require("node-cron");
const crypto = require("crypto");

const { upsertEntry, getEntry, listEntries, deleteEntry, upsertSrsMeta, getSrsMeta, getDueEntries } = require("./db");
const { createItem, reviewItem } = require("./srs");

const app = express();
app.use(express.json());

// ─── Health ──────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ─── Entries ─────────────────────────────────────────────────────────────────

app.get("/entries", (req, res) => {
  const { source } = req.query;
  const entries = listEntries(source ? { source } : undefined);
  res.json({ entries, count: entries.length });
});

app.post("/entries", (req, res) => {
  const { title, content, tags, source } = req.body;
  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  const id = `manual_${crypto.randomUUID()}`;
  const entry = {
    id,
    source: source || "manual",
    title: title || null,
    content,
    tags: Array.isArray(tags) ? tags : [],
  };

  upsertEntry(entry);

  // Initialise SRS so the entry is immediately due for review
  upsertSrsMeta(id, createItem());

  res.status(201).json({ entry: getEntry(id), srs: getSrsMeta(id) });
});

app.delete("/entries/:id", (req, res) => {
  const entry = getEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  deleteEntry(req.params.id);
  res.json({ deleted: true });
});

// ─── Review ──────────────────────────────────────────────────────────────────

app.get("/review/due", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const due = getDueEntries(limit);
  res.json({ due, count: due.length });
});

app.post("/review/:id", (req, res) => {
  const entry = getEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  const rating = Number(req.body.rating);
  if (isNaN(rating) || rating < 0 || rating > 5) {
    return res.status(400).json({ error: "rating must be a number between 0 and 5" });
  }

  let current = getSrsMeta(req.params.id);
  if (!current) {
    // Entry exists but hasn't been scheduled yet – initialise it
    current = createItem();
  }

  const updated = reviewItem(current, rating);
  upsertSrsMeta(req.params.id, updated);

  res.json({ entryId: req.params.id, srs: getSrsMeta(req.params.id) });
});

// ─── Sync ─────────────────────────────────────────────────────────────────────

async function syncSource(source) {
  let fetchEntries;
  if (source === "notion") {
    fetchEntries = require("./integrations/notion").fetchEntries;
  } else if (source === "obsidian") {
    fetchEntries = require("./integrations/obsidian").fetchEntries;
  } else if (source === "apple_notes") {
    fetchEntries = require("./integrations/apple-notes").fetchEntries;
  } else {
    throw new Error(`Unknown source: ${source}`);
  }

  const entries = await Promise.resolve(fetchEntries());
  let added = 0;
  let updated = 0;

  for (const entry of entries) {
    const existing = getEntry(entry.id);
    upsertEntry(entry);

    // Only create SRS metadata if it doesn't already exist
    if (!getSrsMeta(entry.id)) {
      upsertSrsMeta(entry.id, createItem());
      added++;
    } else {
      updated++;
    }
  }

  return { total: entries.length, added, updated };
}

app.post("/sync/:source", async (req, res) => {
  const { source } = req.params;
  const valid = ["notion", "obsidian", "apple_notes"];
  if (!valid.includes(source)) {
    return res.status(400).json({ error: `source must be one of: ${valid.join(", ")}` });
  }

  try {
    const result = await syncSource(source);
    res.json({ source, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Scheduled daily sync ────────────────────────────────────────────────────

// Run every day at the configured hour (default: 07:00) in the server's local
// timezone. Override with SYNC_CRON_HOUR (0-23) or a full cron expression via
// SYNC_CRON (e.g. "0 8 * * *"). Set TZ to control the server timezone.
const syncCron = process.env.SYNC_CRON
  || `0 ${process.env.SYNC_CRON_HOUR || "7"} * * *`;

cron.schedule(syncCron, async () => {
  const sources = [];
  if (process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID) sources.push("notion");
  if (process.env.OBSIDIAN_VAULT_PATH) sources.push("obsidian");
  if (process.platform === "darwin") sources.push("apple_notes");

  for (const source of sources) {
    try {
      const result = await syncSource(source);
      console.log(`[cron] ${source} sync complete:`, result);
    } catch (err) {
      console.error(`[cron] ${source} sync failed:`, err.message);
    }
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Flashback API running on http://localhost:${PORT}`);
  });
}

module.exports = { app, syncSource };
