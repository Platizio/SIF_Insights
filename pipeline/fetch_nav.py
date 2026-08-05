"""Daily job: fetch AMFI SIF NAV, keep our 30 codes, upsert history, export artifacts.

Exit codes:
    0  success (data may or may not have changed)
    1  validation failure (missing codes / unparseable / stale source) -> the
       GitHub Action fails and emails the owner instead of committing bad data.

Usage:
    python fetch_nav.py               # fetch live, validate, upsert, export
    python fetch_nav.py --file X.txt  # use a local file instead of the network
    python fetch_nav.py --dry-run     # fetch + validate only, write nothing
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone

from sif_parser import index_by_code, parse
import store

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
SIFS_PATH = os.path.join(PIPELINE_DIR, "sifs.json")
IST = timezone(timedelta(hours=5, minutes=30))
STALE_AFTER_DAYS = 5  # newest NAV older than this => warn (long holidays tolerated)


def load_catalog() -> dict:
    with open(SIFS_PATH, encoding="utf-8") as f:
        return json.load(f)


def fetch_text(url: str, retries: int = 3) -> str:
    import requests
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SIF-Insights/1.0)"}
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, headers=headers, timeout=60)
            r.raise_for_status()
            if not r.text.strip():
                raise ValueError("empty response body")
            return r.text
        except Exception as e:  # noqa: BLE001 - retry any network/HTTP error
            last_err = e
            print(f"  fetch attempt {attempt}/{retries} failed: {e}", file=sys.stderr)
            if attempt < retries:
                time.sleep(3 * attempt)
    raise SystemExit(f"ERROR: could not fetch {url}: {last_err}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", help="parse a local AMFI file instead of fetching")
    ap.add_argument("--dry-run", action="store_true", help="validate only; write nothing")
    args = ap.parse_args()

    catalog = load_catalog()
    codes = [c["code"] for c in catalog["codes"]]
    names = {c["code"]: c["name"] for c in catalog["codes"]}

    if args.file:
        with open(args.file, encoding="utf-8") as f:
            text = f.read()
        print(f"Parsing local file: {args.file}")
    else:
        print(f"Fetching {catalog['sourceUrl']}")
        text = fetch_text(catalog["sourceUrl"])

    idx = index_by_code(parse(text))

    # --- Validation gate: all 30 codes must resolve, or fail loudly. ---
    missing = [c for c in codes if c not in idx]
    if missing:
        print(f"ERROR: {len(missing)}/{len(codes)} codes missing from source "
              f"(format drift or renumber?): {missing}", file=sys.stderr)
        return 1

    rows = {c: idx[c] for c in codes}
    newest = max(r.nav_date for r in rows.values())
    today_ist = datetime.now(IST).date()
    age_days = (today_ist - newest).days
    print(f"Newest NAV date in source: {newest.isoformat()} "
          f"(today IST {today_ist.isoformat()}, age {age_days}d)")
    if age_days > STALE_AFTER_DAYS:
        print(f"WARNING: source NAV is {age_days} days old (> {STALE_AFTER_DAYS}); "
              "AMFI may not have published yet.", file=sys.stderr)
    if age_days < 0:
        print(f"ERROR: source NAV date {newest} is in the future vs IST today "
              f"{today_ist}.", file=sys.stderr)
        return 1

    if args.dry_run:
        print(f"[dry-run] validated {len(rows)}/{len(codes)} codes; no files written.")
        return 0

    # --- Upsert into canonical history and export frontend artifacts. ---
    history = store.load_history()
    changed = 0
    for code, r in rows.items():
        if store.upsert(history, code, r.nav_date.isoformat(), r.nav):
            changed += 1
    store.save_history(history)
    store.export_frontend(history, names)

    print(f"Upserted {changed}/{len(codes)} codes with new/changed NAV for {newest}.")
    print(f"Canonical: {store.HISTORY_PATH}")
    print(f"Artifacts: {store.PUBLIC_NAV_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
