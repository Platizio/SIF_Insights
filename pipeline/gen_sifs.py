"""One-off / occasional generator for sifs.json (the 30-code catalog config).

Reads a sample AMFI file (or the live URL) to capture each scheme's name and
equity/hybrid category, derives the SIF house brand from the scheme name, and
maps the eight known houses to their real AMC. Brands we can't verify keep the
brand itself as the house name (never guess an AMC on a finance site).

Usage:
    python gen_sifs.py [path_to_SIF_NAVAll.txt]   # omit path to fetch live
"""
from __future__ import annotations

import json
import os
import sys

from sif_parser import parse, index_by_code

PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_URL = "https://portal.amfiindia.com/spages/SIF_NAVAll.txt"

# The 30 SIF plan-codes to track (all Regular-Plan Growth).
CODES = [
    "SIF-3", "SIF-7", "SIF-11", "SIF-13", "SIF-21", "SIF-25", "SIF-29", "SIF-34",
    "SIF-35", "SIF-40", "SIF-55", "SIF-62", "SIF-80", "SIF-87", "SIF-93", "SIF-96",
    "SIF-102", "SIF-105", "SIF-111", "SIF-114", "SIF-117", "SIF-122", "SIF-124",
    "SIF-126", "SIF-128", "SIF-136", "SIF-138", "SIF-143", "SIF-146", "SIF-150",
]

# Verified house-brand -> AMC (from src/data/amcs.json). Keyed by lowercased
# first token of the scheme name.
KNOWN_HOUSES = {
    "qsif": ("quant", "Quant Mutual Fund"),
    "magnum": ("sbi", "SBI Mutual Fund"),
    "altiva": ("edelweiss", "Edelweiss Mutual Fund"),
    "titanium": ("tata", "Tata Mutual Fund"),
    "diviniti": ("iti", "ITI Mutual Fund"),
    "isif": ("icici", "ICICI Prudential Mutual Fund"),
    "arudha": ("bandhan", "Bandhan Mutual Fund"),
    "wsif": ("wealth", "The Wealth Company Mutual Fund"),
}


def _house(scheme_name: str) -> tuple[str, str]:
    """(amcId, amcName) from the scheme's first token; brand-as-name if unknown."""
    token = scheme_name.strip().split()[0]
    key = token.lower()
    if key in KNOWN_HOUSES:
        return KNOWN_HOUSES[key]
    # Unknown/unverified house: use the brand itself, never guess an AMC.
    brand = token.strip("-").title() if token.isupper() else token
    return (key.strip("-"), brand)


def build(text: str) -> dict:
    idx = index_by_code(parse(text))
    entries = []
    missing = []
    for code in CODES:
        row = idx.get(code)
        if row is None:
            missing.append(code)
            continue
        low = row.scheme_name.lower()
        amc_id, amc_name = _house(row.scheme_name)
        entries.append({
            "code": code,
            "name": row.scheme_name,
            "amcId": amc_id,
            "amc": amc_name,
            "category": row.category,
            "plan": "Direct" if "direct" in low else "Regular",
            "option": "IDCW" if "idcw" in low else "Growth",
        })
    if missing:
        raise SystemExit(f"Codes missing from source file: {missing}")
    return {"sourceUrl": SOURCE_URL,
            "format": ("Semicolon-delimited: Scheme Code;ISIN;ISIN;Scheme Name;NAV;Date. "
                       "Match by Scheme Code (col 0); NAV is 2nd-last field, Date is last."),
            "codes": entries}


def main() -> None:
    if len(sys.argv) > 1:
        text = open(sys.argv[1], encoding="utf-8").read()
    else:
        import requests
        text = requests.get(SOURCE_URL, headers={"User-Agent": "SIF-Insights/1.0"}, timeout=60).text
    catalog = build(text)
    out = os.path.join(PIPELINE_DIR, "sifs.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {out} with {len(catalog['codes'])} codes.")
    houses = sorted({(e["amcId"], e["amc"]) for e in catalog["codes"]})
    print("Houses:")
    for hid, hname in houses:
        print(f"  {hid:12} {hname}")


if __name__ == "__main__":
    main()
