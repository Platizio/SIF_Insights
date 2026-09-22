"""Roster watch: fail when AMFI lists a Regular/Growth SIF we do not track.

WHY THIS EXISTS, SEPARATELY FROM fetch_nav.py

`fetch_nav.py` validates the codes in sifs.json and fails loudly when one of
them stops resolving. That catches a scheme DISAPPEARING. It is structurally
blind to a scheme APPEARING: it only ever looks up the codes it already knows,
so a newly launched fund is invisible to it for as long as nobody happens to
read the feed by hand. Three funds — SIF-154, SIF-156 and SIF-157 — were live
on AMFI for weeks before anyone noticed, which is what prompted this file.

WHY IT IS NOT PART OF THE NIGHTLY JOB

A new fund is not a reason to refuse that night's NAV. Wiring this into
fetch_nav.py would mean a launch elsewhere in the market blocks our own price
update, which is the wrong trade. This runs as its own scheduled workflow and
fails on its own, leaving the NAV commit alone.

WHAT COUNTS AS "OURS"

The site lists one share class per fund: Regular Plan, Growth option. Direct
plans and every IDCW variant are deliberately absent, so they must not trip
this alarm — at 122 feed rows against 33 tracked schemes, an alarm that fires
on all of them would be muted within a week.

Exit codes:
    0  the roster matches, or the only additions are Direct/IDCW share classes
    1  a Regular+Growth scheme is missing, OR the feed's shape changed, OR the
       fetch failed -- GitHub fails the job and emails the owner
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time

import requests

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
SIFS_PATH = os.path.join(PIPELINE_DIR, "sifs.json")

# The header AMFI publishes today. Checked in full rather than trusted, because
# every field below is read POSITIONALLY: if a column is inserted or reordered,
# plan and option quietly become something else and this check starts passing
# for the wrong reason. A drifted header is a failure, not a warning.
EXPECTED_HEADER = [
    "Scheme Code",
    "ISIN Div Payout/ ISIN Growth",
    "ISIN Div Reinvestment",
    "Scheme Name",
    "Plan",
    "Option",
    "Net Asset Value",
    "Date",
]

COL = {name: i for i, name in enumerate(EXPECTED_HEADER)}

# AMFI writes the same option four ways — "Growth", "GROWTH", "Growth Option",
# "GROWTH OPTION" — so it is matched by shape, not by string equality. Anything
# with IDCW in it is a different share class and is not ours.
_GROWTH = re.compile(r"^growth(\s+option)?$", re.I)
_REGULAR = re.compile(r"regular", re.I)
_DIRECT = re.compile(r"direct", re.I)


def fetch_text(url: str, attempts: int = 3, timeout: int = 60) -> str:
    """Fetch the feed, retrying a few times before giving up."""
    last = None
    for i in range(1, attempts + 1):
        try:
            r = requests.get(url, timeout=timeout)
            r.raise_for_status()
            # requests guesses ISO-8859-1 for text/plain with no charset, which
            # mangles any non-ASCII scheme name. AMFI publishes UTF-8.
            r.encoding = "utf-8"
            if not r.text.strip():
                raise ValueError("empty response body")
            return r.text
        except Exception as e:  # noqa: BLE001 - reported verbatim below
            last = e
            print(f"  attempt {i}/{attempts} failed: {e}", file=sys.stderr)
            if i < attempts:
                time.sleep(2 * i)
    raise SystemExit(f"ERROR: could not fetch {url}: {last}")


def parse_rows(text: str) -> list[dict]:
    """Split the feed into rows, asserting the header is the shape we expect."""
    rows: list[dict] = []
    header_seen = False

    for raw in text.splitlines():
        line = raw.strip()
        if not line or ";" not in line:
            continue  # section header or AMC name, not a data row

        parts = [p.strip() for p in line.split(";")]

        if parts[0] == "Scheme Code":
            header_seen = True
            if parts != EXPECTED_HEADER:
                print("ERROR: AMFI feed header changed. Every field here is read "
                      "by position, so this check cannot be trusted until the "
                      "column map is updated.", file=sys.stderr)
                print(f"  expected: {EXPECTED_HEADER}", file=sys.stderr)
                print(f"  actual  : {parts}", file=sys.stderr)
                raise SystemExit(1)
            continue

        if not parts[0].upper().startswith("SIF-"):
            continue
        if len(parts) != len(EXPECTED_HEADER):
            print(f"ERROR: row has {len(parts)} fields, expected "
                  f"{len(EXPECTED_HEADER)}: {line[:120]}", file=sys.stderr)
            raise SystemExit(1)

        rows.append({
            "code": parts[COL["Scheme Code"]],
            "name": parts[COL["Scheme Name"]],
            "plan": parts[COL["Plan"]],
            "option": parts[COL["Option"]],
            "nav": parts[COL["Net Asset Value"]],
            "date": parts[COL["Date"]],
        })

    if not header_seen:
        print("ERROR: no header row found — the feed is not the format this "
              "check knows how to read.", file=sys.stderr)
        raise SystemExit(1)
    if not rows:
        print("ERROR: header parsed but no SIF rows found.", file=sys.stderr)
        raise SystemExit(1)
    return rows


def classify(row: dict) -> str:
    """Which share class is this row? 'ours' | 'other' | 'ambiguous'.

    'ambiguous' is a real state, not a fudge. Four schemes we already track —
    the iSIF ones — publish a BLANK Plan and Option, so their share class is
    not recoverable from the feed at all. A new fund that arrives the same way
    cannot be classified here and must be looked at by a person rather than
    guessed at, so it is reported rather than silently dropped.
    """
    plan, option = row["plan"], row["option"]

    if _DIRECT.search(plan):
        return "other"
    if option and not _GROWTH.match(option):
        return "other"  # IDCW and its many spellings
    if not plan and not option:
        return "ambiguous"
    if _REGULAR.search(plan) and _GROWTH.match(option):
        return "ours"
    # A blank plan with an explicit Growth, or vice versa: still not decidable.
    return "ambiguous"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--file", help="read a local copy instead of the network")
    args = ap.parse_args()

    with open(SIFS_PATH, encoding="utf-8") as f:
        catalog = json.load(f)
    tracked = {c["code"] for c in catalog["codes"]}
    # Rows a person has already looked at and ruled out. Without this the four
    # blank-column iSIF Direct plans trip the alarm every single night, and an
    # alarm that is always red is an alarm nobody reads.
    excluded = {e["code"] for e in catalog.get("excluded", [])}

    if args.file:
        print(f"Parsing local file: {args.file}")
        with open(args.file, encoding="utf-8") as f:
            text = f.read()
    else:
        print(f"Fetching {catalog['sourceUrl']}")
        text = fetch_text(catalog["sourceUrl"])

    rows = parse_rows(text)
    untracked = [r for r in rows
                 if r["code"] not in tracked and r["code"] not in excluded]
    missing = [r for r in untracked if classify(r) == "ours"]
    ambiguous = [r for r in untracked if classify(r) == "ambiguous"]
    other = len(untracked) - len(missing) - len(ambiguous)

    print(f"Feed rows: {len(rows)} | tracked: {len(tracked)} | "
          f"reviewed-and-excluded: {len(excluded)} | "
          f"untracked: {len(untracked)} "
          f"({len(missing)} Regular+Growth, {len(ambiguous)} unclassifiable, "
          f"{other} Direct/IDCW)")

    # Every code we track should still be in the feed. fetch_nav.py fails on
    # this too, but it runs on a different schedule; saying it here means one
    # alarm reports the whole roster rather than half of it.
    gone = sorted(tracked - {r["code"] for r in rows})
    if gone:
        print(f"\nERROR: {len(gone)} tracked code(s) are no longer in the feed: "
              f"{', '.join(gone)}", file=sys.stderr)

    if missing:
        print("\nERROR: AMFI lists Regular Plan / Growth scheme(s) the site "
              "does not carry:", file=sys.stderr)
        for r in missing:
            print(f"  {r['code']:<9} {r['nav']:>10}  {r['date']}  {r['name']}",
                  file=sys.stderr)

    if ambiguous:
        print("\nWARNING: untracked scheme(s) whose share class the feed does "
              "not state — a person has to decide:", file=sys.stderr)
        for r in ambiguous:
            print(f"  {r['code']:<9} plan={r['plan']!r} option={r['option']!r}"
                  f"  {r['name']}", file=sys.stderr)

    if missing or ambiguous or gone:
        print("\nTo resolve: add the scheme to pipeline/sifs.json AND to "
              "lib/data/raw/schemes.json (id, amcId, name, category, type, "
              "amfiSchemeCode, isin), then run pipeline/fetch_nav.py to seed "
              "its NAV history. Disclosures are researched separately and the "
              "site renders 'Not captured' until they exist.", file=sys.stderr)
        return 1

    print("\nRoster matches: every Regular+Growth scheme in the feed is tracked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
