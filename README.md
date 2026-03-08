# Flashback

> **An SRS (Spaced Repetition System) for your personal archive.**  
> Flashback surfaces the journal entries, ideas, and knowledge snippets you care about – at just the right moment, using the same science behind language-learning flashcard apps.

---

## What it does

| Feature | Description |
|---|---|
| **SRS engine** | SM-2 algorithm schedules when each memory resurfaces. Rate it 0-5 and the algorithm adapts. |
| **Multi-source import** | Pull entries from **Notion**, **Obsidian** vaults, or **Apple Notes** (macOS). |
| **Manual entries** | Add any text snippet directly via the REST API. |
| **Daily sync** | A built-in cron job syncs connected sources every morning at 07:00. |
| **iOS Widget** | A WidgetKit extension shows the next due memory on your Home Screen or Lock Screen. |
| **REST API** | Every feature is exposed over HTTP so you can integrate with Shortcuts, Raycast, Obsidian plugins, etc. |

---

## Architecture

```
Flashback/
├── backend/                  Node.js API + SRS engine
│   ├── src/
│   │   ├── index.js          Express server + cron scheduler
│   │   ├── srs.js            SM-2 spaced repetition algorithm
│   │   ├── db.js             SQLite database layer (node:sqlite built-in)
│   │   └── integrations/
│   │       ├── notion.js     Notion database adapter
│   │       ├── obsidian.js   Obsidian vault (local files) adapter
│   │       └── apple-notes.js  Apple Notes via AppleScript (macOS only)
│   └── tests/
│       ├── srs.test.js       SM-2 algorithm unit tests
│       ├── db.test.js        Database integration tests
│       └── obsidian.test.js  Obsidian adapter tests
└── ios/FlashbackWidget/      Swift WidgetKit extension
    └── FlashbackWidget/
        ├── FlashbackWidget.swift
        └── Info.plist
```

---

## Getting started

### Requirements

- **Node.js ≥ 22.5.0** (uses the built-in `node:sqlite` module, added in 22.5.0)
- **iOS 17+** with Xcode 15+ for the widget
- macOS for Apple Notes integration (uses AppleScript)

### 1. Run the backend

```bash
cd backend
npm install
npm start          # listens on http://localhost:3000
```

### 2. Configure integrations (optional)

Create a `.env` file (or export variables) before starting the server:

```bash
# Notion
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=your_database_id

# Obsidian (local file path)
OBSIDIAN_VAULT_PATH=/Users/you/Documents/Obsidian/MyVault

# Port (default: 3000)
PORT=3000
```

### 3. Sync your notes

```bash
# Notion
curl -X POST http://localhost:3000/sync/notion

# Obsidian
curl -X POST http://localhost:3000/sync/obsidian

# Apple Notes (macOS only)
curl -X POST http://localhost:3000/sync/apple_notes
```

### 4. Review due entries

```bash
# Get entries due today
curl http://localhost:3000/review/due

# Rate an entry (0 = forgot, 5 = perfect)
curl -X POST http://localhost:3000/review/<entry_id> \
  -H 'Content-Type: application/json' \
  -d '{"rating": 4}'
```

---

## iOS Widget setup

1. Open `ios/FlashbackWidget/FlashbackWidget.xcodeproj` in Xcode.
2. Set your `FLASHBACK_API_URL` in `Info.plist` (or a `Config.xcconfig`).
3. Build and run on your iPhone (or Simulator).
4. Long-press the Home Screen → **+** → search **Flashback** → add the widget.
5. Tap the widget to open the review flow in the app.

The widget supports **small**, **medium**, and **large** sizes and refreshes every 4 hours automatically.

---

## REST API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/entries` | List all entries (`?source=notion\|obsidian\|apple_notes\|manual`) |
| `POST` | `/entries` | Add an entry manually |
| `DELETE` | `/entries/:id` | Delete an entry |
| `GET` | `/review/due` | Get entries due for review (`?limit=20`) |
| `POST` | `/review/:id` | Submit a review rating (body: `{"rating": 0-5}`) |
| `POST` | `/sync/:source` | Trigger a sync (`notion`, `obsidian`, `apple_notes`) |

### Rating scale

| Rating | Meaning |
|--------|---------|
| `0` | Complete blackout – no recollection |
| `1` | Incorrect but felt familiar |
| `2` | Incorrect but obvious once seen |
| `3` | Correct with significant effort |
| `4` | Correct after a hesitation |
| `5` | Perfect, instant recall |

---

## Running tests

```bash
cd backend
npm test
```

All 31 tests should pass covering the SRS algorithm, database layer, and Obsidian adapter.

---

## Integrations in detail

### Notion

Connects to a Notion database. Each page becomes one Flashback entry. Page blocks are fetched as plain text content. Requires `NOTION_TOKEN` (internal integration secret) and `NOTION_DATABASE_ID`.

### Obsidian

Scans a local vault directory recursively for `.md` files. Front matter (`title`, `tags`, `created`, `updated`) is parsed automatically. No API key needed – it reads local files directly.

### Apple Notes

Uses AppleScript to export all notes from the Notes app. **macOS only.** Grant automation permissions when prompted (System Settings → Privacy & Security → Automation).

---

## How the SRS algorithm works

Flashback uses the **SM-2** algorithm popularised by SuperMemo and Anki:

1. Each entry starts with an interval of 0 days (due immediately) and an easiness factor of 2.5.
2. After a review you rate it 0-5.
3. Ratings ≥ 3 are "passes": the interval grows (×easiness factor each time).
4. Ratings < 3 are "fails": the interval resets to 1 day.
5. The easiness factor adjusts up or down based on your ratings, converging to a minimum of 1.3.

This means easy memories resurface every few weeks; tricky ones resurface daily until they stick.

---

## License

MIT
