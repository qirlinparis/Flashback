"""
Flashback Security Test Suite
------------------------------
Runs attack scenarios against a live API instance.

Usage:
  Terminal 1:  DB_PATH=test.db API_PORT=8001 python -m src.api
  Terminal 2:  TEST_API_URL=http://localhost:8001 python tests/security_test.py

The script exits with code 0 if all tests pass, code 1 if any fail.
"""

import os
import sys
import httpx

BASE_URL = os.environ.get("TEST_API_URL", "http://localhost:8000")

results = []


def check(name, passed, detail=""):
    label = "PASS" if passed else "FAIL"
    results.append((name, passed, detail))
    print(f"  {label}  {name}" + (f"  →  {detail}" if detail else ""))


def register(telegram_id):
    r = httpx.post(f"{BASE_URL}/register", params={"telegram_id": telegram_id})
    r.raise_for_status()
    return r.json()["token"]


def ingest(token, text):
    r = httpx.post(
        f"{BASE_URL}/ingest",
        json={"text": text, "source_type": "test"},
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


def surface(token):
    r = httpx.get(
        f"{BASE_URL}/surface",
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Setup: register two users, seed data for user A
# ---------------------------------------------------------------------------
print(f"\nConnecting to {BASE_URL} ...")

try:
    httpx.get(f"{BASE_URL}/health", timeout=3).raise_for_status()
except Exception as e:
    print(f"\nERROR: API not reachable at {BASE_URL}\n  {e}")
    print("\nStart the API first:")
    print("  DB_PATH=test.db API_PORT=8001 python -m src.api\n")
    sys.exit(2)

print("API is up. Setting up test users...\n")

token_a = register(10001)
token_b = register(10002)

# Ingest something so user A has fragments to surface and act on
ingest_result = ingest(token_a, "Today I realized that uncertainty is not the enemy of action.")
entry_id_a = ingest_result["stored"][0]["entry_id"]
fragment_ids_a = ingest_result["stored"][0]["fragment_ids"]
fragment_id_a = fragment_ids_a[0] if fragment_ids_a else None

print("Running security tests...\n")

# ---------------------------------------------------------------------------
# 1–5: Unauthenticated access to every protected endpoint
# ---------------------------------------------------------------------------
for label, method, path, kwargs in [
    ("1", "GET",  "/surface", {}),
    ("2", "POST", "/ingest",  {"json": {"text": "test"}}),
    ("3", "POST", "/action",  {"json": {"fragment_id": 1, "action": "keep"}}),
    ("4", "POST", "/reflect", {"json": {"entry_id": 1, "text": "thought"}}),
]:
    r = getattr(httpx, method.lower())(f"{BASE_URL}{path}", **kwargs)
    check(f"[{label}] {method} {path} no token → 401", r.status_code == 401, f"got {r.status_code}")

# ---------------------------------------------------------------------------
# 6: Fake token rejected
# ---------------------------------------------------------------------------
r = httpx.get(f"{BASE_URL}/surface", headers={"Authorization": "Bearer flbk_fakefakefake"})
check("[5] /surface fake token → 401", r.status_code == 401, f"got {r.status_code}")

# ---------------------------------------------------------------------------
# 7: Cross-user action (User B tries to act on User A's fragment)
# ---------------------------------------------------------------------------
if fragment_id_a:
    r = httpx.post(
        f"{BASE_URL}/action",
        json={"fragment_id": fragment_id_a, "action": "keep"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    check("[6] /action cross-user fragment → 403", r.status_code == 403, f"got {r.status_code}")
else:
    check("[6] /action cross-user fragment → 403", False, "no fragment_id to test (ingestion may have failed)")

# ---------------------------------------------------------------------------
# 8: Cross-user reflect (User B tries to reflect on User A's entry)
# ---------------------------------------------------------------------------
r = httpx.post(
    f"{BASE_URL}/reflect",
    json={"entry_id": entry_id_a, "text": "sneaky reflection"},
    headers={"Authorization": f"Bearer {token_b}"},
)
check("[7] /reflect cross-user entry → 403", r.status_code == 403, f"got {r.status_code}")

# ---------------------------------------------------------------------------
# 9: SQL injection in text field (value injection — should be stored safely or 422)
# ---------------------------------------------------------------------------
sql_payload = "'; DROP TABLE entries; --"
r = httpx.post(
    f"{BASE_URL}/ingest",
    json={"text": sql_payload},
    headers={"Authorization": f"Bearer {token_a}"},
)
safe = r.status_code in (200, 422)
check("[8] SQL injection in text value → safe (200 or 422)", safe, f"got {r.status_code}")

# Confirm entries table still exists by surfacing
try:
    surface(token_a)
    check("[8b] entries table intact after injection attempt", True)
except Exception as e:
    check("[8b] entries table intact after injection attempt", False, str(e))

# ---------------------------------------------------------------------------
# 10: SQL injection in integer field (fragment_id)
# ---------------------------------------------------------------------------
r = httpx.post(
    f"{BASE_URL}/action",
    json={"fragment_id": "1 OR 1=1", "action": "keep"},
    headers={"Authorization": f"Bearer {token_a}"},
)
check("[9] SQL injection in integer field → 422", r.status_code == 422, f"got {r.status_code}")

# ---------------------------------------------------------------------------
# 11: Malformed JSON body
# ---------------------------------------------------------------------------
r = httpx.post(
    f"{BASE_URL}/ingest",
    content=b"not json at all }{",
    headers={"Authorization": f"Bearer {token_a}", "Content-Type": "application/json"},
)
check("[10] Malformed JSON body → 422", r.status_code == 422, f"got {r.status_code}")

# ---------------------------------------------------------------------------
# 12: Re-register invalidates old token
# ---------------------------------------------------------------------------
new_token_a = register(10001)  # same telegram_id, new token issued
r = httpx.get(f"{BASE_URL}/surface", headers={"Authorization": f"Bearer {token_a}"})
check("[11] Re-register invalidates old token → 401", r.status_code == 401, f"got {r.status_code}")

# Confirm new token works
r = httpx.get(f"{BASE_URL}/surface", headers={"Authorization": f"Bearer {new_token_a}"})
check("[11b] New token after re-register → 200", r.status_code == 200, f"got {r.status_code}")

# ---------------------------------------------------------------------------
# 13: /health requires no token
# ---------------------------------------------------------------------------
r = httpx.get(f"{BASE_URL}/health")
check("[12] /health no token → 200", r.status_code == 200, f"got {r.status_code}")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
passed = sum(1 for _, ok, _ in results if ok)
total = len(results)
print(f"\n{'─' * 50}")
print(f"  {passed}/{total} tests passed")

if passed < total:
    print("\n  FAILURES:")
    for name, ok, detail in results:
        if not ok:
            print(f"    FAIL  {name}  →  {detail}")
    print()
    sys.exit(1)
else:
    print("  All tests passed.\n")
    sys.exit(0)
