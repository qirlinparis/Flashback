from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from src.database import (
    init_db, get_or_create_user, get_entry, get_reflections_for_entry,
    get_due_fragments, update_review_state, save_reflection,
    log_interaction,
)
from src.ingestion import ingest as run_ingestion

app = FastAPI(title="Flashback", version="0.1.0")


@app.on_event("startup")
def startup():
    init_db()


# --- Request/Response models ---

class IngestRequest(BaseModel):
    user_id: int
    text: str
    source_type: str = "telegram"
    original_date: Optional[str] = None

class ActionRequest(BaseModel):
    user_id: int
    fragment_id: int
    action: str  # 'keep' | 'not_now' | 'let_go'
    time_spent_ms: Optional[int] = None

class ReflectionRequest(BaseModel):
    user_id: int
    entry_id: int
    text: str


# --- Routes ---

@app.post("/register")
def register(telegram_id: int = 0):
    """Get or create a user. Returns user_id for use in other endpoints."""
    user = get_or_create_user(telegram_id)
    return {"user_id": user["id"]}


@app.post("/ingest")
def ingest(req: IngestRequest):
    """
    Receive raw text → LLM splits into entries → identifies fragments
    → generates metadata → stores everything.
    """
    stored = run_ingestion(req.user_id, req.text, req.source_type)
    return {"stored": stored}


@app.get("/surface/{user_id}")
def surface(user_id: int, limit: int = 2):
    """
    Get today's fragments for a user.
    Returns fragment text, entry context, and metadata.
    """
    fragments = get_due_fragments(user_id, limit=limit)

    if not fragments:
        return {"fragments": [], "message": "nothing today."}

    result = []
    for f in fragments:
        entry = get_entry(f["entry_id"])
        reflections = get_reflections_for_entry(f["entry_id"])

        result.append({
            "fragment_id": f["id"],
            "fragment_text": f["text"],
            "fragment_type": f["fragment_type"],
            "entry_id": f["entry_id"],
            "entry_text": entry["text"] if entry else None,
            "original_date": entry["original_date"] if entry else None,
            "mode": entry["mode"] if entry else None,
            "review_count": f["review_count"],
            "reflections": [{"text": r["text"], "created_at": r["created_at"]}
                            for r in reflections],
        })

    return {"fragments": result}


@app.post("/action")
def action(req: ActionRequest):
    """
    Record user's response to a surfaced fragment.
    Logs interaction for algorithm research, then updates scheduling.
    """
    valid_actions = ("keep", "not_now", "let_go")
    if req.action not in valid_actions:
        raise HTTPException(400, f"action must be one of {valid_actions}")

    log_interaction(
        user_id=req.user_id,
        fragment_id=req.fragment_id,
        action=req.action,
        time_spent_ms=req.time_spent_ms,
    )
    update_review_state(req.fragment_id, req.action)

    messages = {
        "keep": "held close.",
        "not_now": "it'll come back.",
        "let_go": "archived \u2014 you can find it again if you want.",
    }
    return {"message": messages[req.action]}


@app.post("/reflect")
def reflect(req: ReflectionRequest):
    """Add a reflection to an entry."""
    entry = get_entry(req.entry_id)
    if not entry:
        raise HTTPException(404, "entry not found")

    save_reflection(req.user_id, req.entry_id, req.text)
    return {"message": "thought added."}


@app.get("/health")
def health():
    return {"status": "alive"}


if __name__ == "__main__":
    import uvicorn
    from src.config import API_HOST, API_PORT
    uvicorn.run(app, host=API_HOST, port=API_PORT)
