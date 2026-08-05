# SIF NAV data pipeline

Keeps `lib/data/` supplied with real, dated NAV for all 30 tracked SIF schemes.

**Model:** the site is statically rendered and NAV changes once a day, so there
is **no live backend and no runtime fetch**. A nightly job pulls AMFI's file,
writes JSON into `lib/data/raw/`, and the commit triggers a redeploy. The app
imports that JSON, which is what keeps DESIGN_CONTRACT §1.13 true — every number
on the site traces to `@/lib/data`.

```
GitHub Actions cron (19:00 IST, Mon–Fri)
  → python pipeline/fetch_nav.py      # fetch → validate 30 codes → upsert → export
  → npx tsc --noEmit                  # the data must typecheck before it lands
  → git commit + push                 # host rebuilds and redeploys
```

## Files

| File | Role |
|------|------|
| `sifs.json` | The 30 tracked AMFI scheme codes. **Codes only** — scheme identity, AMC mapping and disclosures live in `lib/data/raw/schemes.json` and are researched by hand. |
| `sif_parser.py` | Parses AMFI's `;`-delimited SIF_NAVAll.txt. |
| `store.py` | Canonical history + writes the two files the app reads. |
| `fetch_nav.py` | **Daily job.** Fetch → validate → upsert → export. |
| `backfill_excel.py` | **One-time.** Loads per-scheme history from AMFI's Excel export. |
| `gen_sifs.py` | Regenerates `sifs.json` from a live/sample AMFI file. |
| `data/nav-history.json` | Canonical, committed, diffable history (the audit log). |
| `excel/` | The 30 source spreadsheets the history was backfilled from. |

### What the pipeline writes into the app

- **`lib/data/raw/nav-history.json`** — `{ source, asOf, series: { "SIF-3": [[date, nav], …] } }`,
  keyed by AMFI scheme code, ascending. Pairs rather than objects to keep the
  route bundle small.
- **`lib/data/raw/schemes.json`** — patched **in place**, and only the `nav` /
  `navAsOf` fields. Identity, AMC mapping and disclosures in that file are
  authoritative and the pipeline must never overwrite them.

## Common tasks

Install once: `pip install -r requirements.txt`

```bash
# Daily update (what the GitHub Action runs)
python pipeline/fetch_nav.py

# Test against a saved file without hitting the network
python pipeline/fetch_nav.py --file path/to/SIF_NAVAll.txt --dry-run

# Reload history from the source spreadsheets
python pipeline/backfill_excel.py pipeline/excel --dry-run   # preview
python pipeline/backfill_excel.py pipeline/excel             # write
```

### The Excel format (AMFI "Historical NAV Data" export)

The filenames carry only a date range, **not the fund** — each file is
identified by the scheme-name block inside it:

```
Historical NAV Data for From 01-Sep-2025 to 04-Aug-2026   <- row 1  title
Apex SIF                                                  <- row 2  house
Apex Hybrid Long-Short Fund                               <- row 3  fund
Apex Hybrid Long-Short Fund - Regular - Growth            <- row 4  PLAN → the code
Net Asset Value | Repurchase Price | Sale Price | Date    <- row 5  header
10.02           |                  |            | 30-Mar-2026
```

The loader finds the header row, then matches the plan line against `sifs.json`
to resolve the code (falling back to a `SIF-<n>` filename token, then `--code`).
Re-running is safe: rows upsert on `(code, date)`.

**Verifying a backfill:** each file's last row should equal the NAV AMFI reports
for that code on the same date. All 30 matched exactly on 2026-08-03, which is
what confirmed the file→code mapping was right rather than merely plausible.

## Adding, removing or renumbering a scheme

Edit `sifs.json`. A code that stops resolving fails the daily job loudly rather
than silently dropping a scheme. If the scheme set itself changes, update
`lib/data/raw/schemes.json` too — that is where identity lives.

## Deploying

The repo is not yet under version control. To run the scheduler:

1. `git init`, commit, and push to GitHub.
2. Settings → Actions → General → Workflow permissions → **Read and write**.
3. Connect the repo to a host that redeploys on push (Vercel suits Next.js 16).
4. Actions → **Update SIF NAV** → *Run workflow* to prove the loop before
   waiting for 19:00 IST.
