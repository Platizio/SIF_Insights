"""Parse the AMFI SIF NAV file into structured rows.

Source format (semicolon-delimited, one scheme per line):
    Scheme Code;ISIN Growth;ISIN Reinvest;Scheme Name;Net Asset Value;Date
e.g.
    SIF-3;INF966L30027;-;qsif Equity Long Short Fund - Growth Option - Regular Plan;9.0806;06-Apr-2026

The Scheme Name itself may contain ';', so we parse the fixed fields from the
ENDS of the line: code is field 0, date is the last field, NAV the second-last,
and everything between field 3 and the NAV is the name.

Section-header lines like
    Open Ended Schemes(Equity Oriented Investment Strategies - ...)
carry the equity/hybrid category, which we attach to the rows that follow.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}


@dataclass(frozen=True)
class NavRow:
    code: str          # "SIF-3"
    scheme_name: str    # full AMFI scheme name
    nav: float
    nav_date: date
    category: str       # "equity" | "hybrid" | "other"


def parse_amfi_date(s: str) -> date:
    """Parse AMFI's DD-MMM-YYYY (e.g. '03-Aug-2026') into a date."""
    day, mon, year = s.strip().split("-")
    return date(int(year), _MONTHS[mon[:3].title()], int(day))


def _category_from_header(header: str) -> str:
    low = header.lower()
    if "hybrid" in low:
        return "hybrid"
    if "equity" in low:
        return "equity"
    if "debt" in low:
        return "debt"
    return "other"


def parse(text: str) -> list[NavRow]:
    """Parse the whole file into NavRow list (skipping headers/blank/invalid)."""
    rows: list[NavRow] = []
    category = "other"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        # Section header: "... Schemes(<Equity|Hybrid> Investment Strategies - ...)"
        if "Schemes(" in line:
            category = _category_from_header(line)
            continue
        if ";" not in line:
            continue  # AMC sub-headers like "qsif SIF"
        parts = line.split(";")
        if len(parts) < 6:
            continue
        code = parts[0].strip()
        if not code.upper().startswith("SIF-"):
            continue  # column-title row ("Scheme Code;...") or stray text
        nav_str = parts[-2].strip()
        date_str = parts[-1].strip()
        name = ";".join(parts[3:-2]).strip()
        try:
            nav = float(nav_str)
        except ValueError:
            continue  # e.g. 'N.A.'
        try:
            nav_date = parse_amfi_date(date_str)
        except (ValueError, KeyError):
            continue
        rows.append(NavRow(code, name, nav, nav_date, category))
    return rows


def index_by_code(rows: list[NavRow]) -> dict[str, NavRow]:
    """Map scheme code -> row (last one wins if duplicated)."""
    return {r.code: r for r in rows}
