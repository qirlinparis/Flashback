# Flashback

A spaced repetition system for your own thinking.

Not Anki for facts — a retrieval layer for your personal archive. Journal entries, half-formed ideas, reflections, things you noticed. These resurface at the right time, when your mind is ready to do something new with them.

## Status

In production at https://qirlinparis.codes

## Stack

- Python + FastAPI (REST API, port 8000)
- python-telegram-bot (Telegram client)
- SQLite (flashback.db)
- OpenRouter API (Claude Sonnet — ingestion processing)
- nginx + certbot (reverse proxy + SSL)
- Deployed on DigitalOcean (root@104.236.27.211)

## Architecture

API-first. The Telegram bot is one client. iOS app is the next. All logic lives in FastAPI.

See `docs/PROJECT_STATE.md` for full design decisions and `CLAUDE.md` for architecture and working agreements.
