r"""One-time backfill: load per-SIF historical NAV from Excel/CSV into the store.

Handles the AMFI "Historical NAV Data" export, which looks like:

    Historical NAV Data for From 01-Sep-2025 to 04-Aug-2026     <- title
    Apex SIF                                                    <- house
    Apex Hybrid Long-Short Fund                                 <- fund
    Apex Hybrid Long-Short Fund - Regular - Growth              <- PLAN (identifies the code)
    Net Asset Value | Repurchase Price | Sale Price | Date      <- header row
    10.02          |                   |            | 30-Mar-2026
    ...

So the header is NOT the first row, and the filename carries no SIF code. This
loader therefore:
  1. finds the header row by looking for NAV-ish + Date-ish cells,
  2. resolves the SIF code from the scheme-name block above it (matched against
     sifs.json), falling back to a SIF-<n> token in the filename, then --code,
  3. parses the date/NAV columns and upserts (code, date) -> nav.

Nothing is written until you drop --dry-run.

Usage:
    python backfill_excel.py path\to\folder --dry-run   # detect + report
    python backfill_excel.py path\to\folder             # load it
    python backfill_excel.py file.xlsx --code SIF-3 --date-col Date --nav-col NAV
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re

import pandas as pd

import store

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
SIFS_PATH = os.path.join(PIPELINE_DIR, "sifs.json")
_CODE_RE = re.compile(r"SIF-\d+", re.IGNORECASE)
_NAV_RE = re.compile(r"net\s*asset\s*value|\bnav\b", re.IGNORECASE)
_DATE_RE = re.compile(r"date", re.IGNORECASE)
_HEADER_SCAN_ROWS = 25


def _norm(s) -> str:
    """Normalise a scheme name for comparison (case/punctuation/space-insensitive)."""
    s = str(s).lower().replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()


def load_catalog() -> tuple[set[str], dict[str, str]]:
    """(valid codes, normalised scheme name -> code)."""
    with open(SIFS_PATH, encoding="utf-8") as f:
        entries = json.load(f)["codes"]
    return ({e["code"] for e in entries},
            {_norm(e["name"]): e["code"] for e in entries})


def _read_raw(path: str) -> pd.DataFrame:
    if path.lower().endswith(".csv"):
        return pd.read_csv(path, header=None, dtype=object)
    return pd.read_excel(path, header=None, dtype=object)


def _find_header_row(raw: pd.DataFrame) -> int | None:
    """Row index whose cells look like a NAV/Date header."""
    for i in range(min(_HEADER_SCAN_ROWS, len(raw))):
        cells = [str(c) for c in raw.iloc[i].tolist() if c is not None and str(c) != "nan"]
        if not cells:
            continue
        if any(_NAV_RE.search(c) for c in cells) and any(_DATE_RE.search(c) for c in cells):
            return i
    return None


def _resolve_code(path: str, raw: pd.DataFrame, hdr: int | None,
                  by_name: dict[str, str], forced: str | None) -> tuple[str | None, str]:
    """(code, how) — scheme-name block first, then filename, then --code."""
    if forced:
        return forced.upper(), "forced"
    # Scheme-name block: non-empty first-column values above the header row.
    if hdr:
        labels = [str(v).strip() for v in raw.iloc[:hdr, 0].tolist()
                  if v is not None and str(v).strip() not in ("", "nan")]
        # most specific (the plan line) is nearest the header
        for label in reversed(labels):
            code = by_name.get(_norm(label))
            if code:
                return code, f"scheme name {label!r}"
    m = _CODE_RE.search(os.path.basename(path))
    if m:
        return m.group(0).upper(), "filename"
    # a per-row scheme-code column
    for col in raw.columns:
        vals = raw[col].astype(str).str.extract(r"(SIF-\d+)", expand=False).dropna()
        if not vals.empty:
            return vals.iloc[0].upper(), "column"
    return None, "unresolved"


def _pick_column(cols: list, pattern: re.Pattern, override, fallback_idx: int):
    if override is not None:
        if str(override).isdigit():
            return cols[int(override)]
        return override
    for c in cols:
        if pattern.search(str(c)):
            return c
    return cols[fallback_idx] if len(cols) > fallback_idx else None


def load_file(path: str, history, codes: set[str], by_name: dict[str, str],
              args) -> tuple[str | None, int]:
    name = os.path.basename(path)
    raw = _read_raw(path)
    if raw.empty:
        print(f"  {name}: empty file, skipped")
        return None, 0

    hdr = _find_header_row(raw)
    code, how = _resolve_code(path, raw, hdr, by_name, args.code)
    if code is None:
        print(f"  {name}: SKIPPED — could not identify the fund (pass --code)")
        return None, 0
    if code not in codes:
        print(f"  {name}: SKIPPED — {code} is not in sifs.json")
        return None, 0

    if hdr is None:
        body, cols = raw, list(raw.columns)
        date_col = _pick_column(cols, _DATE_RE, args.date_col, 0)
        nav_col = _pick_column(cols, _NAV_RE, args.nav_col, 1)
    else:
        cols = [str(c).strip() for c in raw.iloc[hdr].tolist()]
        body = raw.iloc[hdr + 1:].copy()
        body.columns = cols
        date_col = _pick_column(cols, _DATE_RE, args.date_col, 0)
        nav_col = _pick_column(cols, _NAV_RE, args.nav_col, 1)

    if date_col is None or nav_col is None:
        print(f"  {name}: SKIPPED — could not find date/NAV columns")
        return None, 0

    dates = pd.to_datetime(body[date_col], errors="coerce", dayfirst=True)
    navs = pd.to_numeric(body[nav_col], errors="coerce")
    valid = dates.notna() & navs.notna()

    changed = 0
    for d, v in zip(dates[valid], navs[valid]):
        if store.upsert(history, code, d.date().isoformat(), round(float(v), 4)):
            changed += 1

    span = (f"{dates[valid].min().date()} → {dates[valid].max().date()}"
            if valid.any() else "no valid rows")
    print(f"  {name:<40} -> {code:<8} {int(valid.sum()):>4} rows  {span}   [{how}]")
    return code, changed


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="Excel/CSV file or a folder of them")
    ap.add_argument("--code", help="force the SIF code for the file(s)")
    ap.add_argument("--date-col", help="date column name or 0-based index")
    ap.add_argument("--nav-col", help="NAV column name or 0-based index")
    ap.add_argument("--dry-run", action="store_true", help="detect + report; write nothing")
    args = ap.parse_args()

    codes, by_name = load_catalog()
    if os.path.isdir(args.path):
        files = sorted(f for ext in ("*.xlsx", "*.xls", "*.csv")
                       for f in glob.glob(os.path.join(args.path, ext)))
    else:
        files = [args.path]
    if not files:
        raise SystemExit(f"No Excel/CSV files found at {args.path}")

    history = store.load_history()
    before = {c: len(v) for c, v in history.items()}
    total = 0
    touched: set[str] = set()
    skipped: list[str] = []

    print(f"Reading {len(files)} file(s):")
    for path in files:
        code, changed = load_file(path, history, codes, by_name, args)
        total += changed
        if code:
            touched.add(code)
        else:
            skipped.append(os.path.basename(path))

    print(f"\n{len(touched)}/{len(codes)} tracked codes covered; "
          f"{total} new/changed rows.")
    if skipped:
        print(f"Skipped {len(skipped)} file(s): {skipped}")
    uncovered = sorted(codes - touched)
    if uncovered:
        print(f"No history supplied for: {uncovered}")

    if args.dry_run:
        print("\n[dry-run] nothing written.")
        return

    store.save_history(history)
    with open(SIFS_PATH, encoding="utf-8") as f:
        names = {c["code"]: c["name"] for c in json.load(f)["codes"]}
    store.export_frontend(history, names)
    print(f"\nWrote {store.HISTORY_PATH}")
    print(f"Wrote {store.PUBLIC_NAV_DIR}")
    for c in sorted(touched, key=lambda x: int(x.split('-')[1])):
        print(f"  {c}: {before.get(c, 0)} -> {len(history[c])} points")


if __name__ == "__main__":
    main()
