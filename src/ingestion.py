import json
import httpx
from src.config import OPENROUTER_API_KEY, LLM_MODEL
from src.database import save_entry, save_fragment


SYSTEM_PROMPT = """You process text for a personal archive system. The text is a journal entry, reflection, or note written by the user.

Analyze the text and return a JSON object with this exact structure:

{
  "entries": [
    {
      "text": "the full text of this entry",
      "mode": "personal or knowledge",
      "original_date": "YYYY-MM-DD if mentioned in text, otherwise null",
      "summary": "1-2 sentence summary",
      "conceptual_tags": ["tag1", "tag2"],
      "emotional_register": "the emotional tone",
      "tension": ["pole_A", "pole_B"],
      "formal_skeleton": "claims, variables, what's underdefined",
      "fragments": [
        {
          "text": "the fragment text",
          "fragment_type": "phase_transition or key_insight or question",
          "char_start": 0,
          "char_end": 100
        }
      ]
    }
  ]
}

Rules:
- If the text contains multiple unrelated topics, split into separate entries.
- If it's one coherent thought, return one entry.
- mode: "knowledge" for factual/conceptual content. "personal" for emotional/experiential/reflective.
- Fragments mark moments where thinking SHIFTS — phase transitions, not key sentences. Look for turns in the writing: where the author moves from one stance to another, where a realization arrives, where a question emerges from experience.
- Every entry must have at least one fragment.
- tension: the unresolved poles being worked through. null if none.
- formal_skeleton: logical structure — what claims are made, what variables are in play, what's left underdefined. null if purely experiential.
- char_start and char_end are character positions within that entry's text.
- Return ONLY valid JSON. No markdown, no explanation."""


def call_llm(text):
    """Call OpenRouter and return parsed JSON. Returns None on failure."""
    response = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
        json={
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            "temperature": 0.3,
        },
        timeout=30.0,
    )
    response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]

    # strip markdown code fences if present
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    return json.loads(content)


def fallback_entry(text):
    """When LLM fails, store the whole text as one entry with one fragment."""
    return {
        "entries": [{
            "text": text,
            "mode": "personal",
            "original_date": None,
            "summary": None,
            "conceptual_tags": None,
            "emotional_register": None,
            "tension": None,
            "formal_skeleton": None,
            "fragments": [{
                "text": text,
                "fragment_type": "phase_transition",
                "char_start": 0,
                "char_end": len(text),
            }],
        }]
    }


def ingest(user_id, text, source_type="telegram"):
    """
    Full ingestion pipeline:
    1. Send text to LLM for splitting/analysis
    2. Store entries and fragments in database
    3. Returns list of (entry_id, [fragment_ids]) tuples
    """
    try:
        result = call_llm(text)
    except Exception as e:
        print(f"LLM failed ({e}), using fallback")
        result = fallback_entry(text)

    stored = []

    for entry_data in result["entries"]:
        # serialize list/dict fields to JSON strings for SQLite
        tags = entry_data.get("conceptual_tags")
        tension = entry_data.get("tension")

        entry_id = save_entry(
            user_id=user_id,
            text=entry_data["text"],
            source_type=source_type,
            original_date=entry_data.get("original_date"),
            mode=entry_data.get("mode", "personal"),
            summary=entry_data.get("summary"),
            conceptual_tags=json.dumps(tags) if tags else None,
            emotional_register=entry_data.get("emotional_register"),
            tension=json.dumps(tension) if tension else None,
            formal_skeleton=entry_data.get("formal_skeleton"),
        )

        fragment_ids = []
        for frag in entry_data.get("fragments", []):
            fid = save_fragment(
                entry_id=entry_id,
                text=frag["text"],
                fragment_type=frag.get("fragment_type", "phase_transition"),
                char_start=frag.get("char_start"),
                char_end=frag.get("char_end"),
            )
            fragment_ids.append(fid)

        stored.append({"entry_id": entry_id, "fragment_ids": fragment_ids})

    return stored
