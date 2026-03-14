from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional

from src.database import (
    init_db, register_user, get_user_by_token, fragment_belongs_to_user,
    get_entry, get_reflections_for_entry, get_due_fragments,
    update_review_state, save_reflection, log_interaction,
)
from src.ingestion import ingest as run_ingestion

app = FastAPI(title="Flashback", version="0.1.0")

bearer_scheme = HTTPBearer()


@app.on_event("startup")
def startup():
    init_db()


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)):
    """Validates the Bearer token and returns the user row. Raises 401 if invalid."""
    user = get_user_by_token(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="invalid or missing token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# --- Request models ---

class IngestRequest(BaseModel):
    text: str
    source_type: str = "telegram"

class ActionRequest(BaseModel):
    fragment_id: int
    action: str  # 'keep' | 'not_now' | 'let_go'
    time_spent_ms: Optional[int] = None

class ReflectionRequest(BaseModel):
    entry_id: int
    text: str


# --- Routes ---

@app.post("/register")
def register(telegram_id: int):
    """Register or re-register a user. Returns user_id and a fresh API token."""
    user, raw_token = register_user(telegram_id)
    return {"user_id": user["id"], "token": raw_token}


@app.post("/ingest")
def ingest(req: IngestRequest, current_user=Depends(get_current_user)):
    """
    Receive raw text → LLM splits into entries → identifies fragments
    → generates metadata → stores everything.
    """
    stored = run_ingestion(current_user["id"], req.text, req.source_type)
    return {"stored": stored}


@app.get("/surface")
def surface(limit: int = 2, current_user=Depends(get_current_user)):
    """Get today's fragments for the authenticated user."""
    fragments = get_due_fragments(current_user["id"], limit=limit)

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
            "surface_reason": {
                "interval_days": f["interval_days"],
                "review_count": f["review_count"],
                "next_review_date": f["next_review_date"],
            },
            "reflections": [{"text": r["text"], "created_at": r["created_at"]}
                            for r in reflections],
        })

    return {"fragments": result}


@app.post("/action")
def action(req: ActionRequest, current_user=Depends(get_current_user)):
    """
    Record user's response to a surfaced fragment.
    Logs interaction for algorithm research, then updates scheduling.
    """
    valid_actions = ("keep", "not_now", "let_go")
    if req.action not in valid_actions:
        raise HTTPException(400, f"action must be one of {valid_actions}")

    if not fragment_belongs_to_user(req.fragment_id, current_user["id"]):
        raise HTTPException(403, "not your fragment")

    log_interaction(
        user_id=current_user["id"],
        fragment_id=req.fragment_id,
        action=req.action,
        time_spent_ms=req.time_spent_ms,
    )
    update_review_state(req.fragment_id, req.action)

    messages = {
        "keep": "held close.",
        "not_now": "it'll come back.",
        "let_go": "archived — you can find it again if you want.",
    }
    return {"message": messages[req.action]}


@app.post("/reflect")
def reflect(req: ReflectionRequest, current_user=Depends(get_current_user)):
    """Add a reflection to an entry."""
    entry = get_entry(req.entry_id)
    if not entry:
        raise HTTPException(404, "entry not found")
    if entry["user_id"] != current_user["id"]:
        raise HTTPException(403, "not your entry")

    save_reflection(current_user["id"], req.entry_id, req.text)
    return {"message": "thought added."}


@app.get("/health")
def health():
    return {"status": "alive"}


if __name__ == "__main__":
    import uvicorn
    from src.config import API_HOST, API_PORT
    uvicorn.run(app, host=API_HOST, port=API_PORT)
