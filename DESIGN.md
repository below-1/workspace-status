# DESIGN — workspace-status

Static status pages published from data pipelines in the private `below-1/workspace` repo.

Status: **design draft — implementation pending review**.

## 1. Identity

- Repo: `below-1/workspace-status` (public; GitHub Free requires public repo for Pages).
- Local clone: `/home/luden/workspace-status` (sibling of `/home/luden/workspace`).
- Site URL: `https://below-1.github.io/workspace-status/`.
- Astro `site`: `https://below-1.github.io`.
- Astro `base`: `/workspace-status`.
- Output: static, `dist/`.
- Package manager in this repo: `npm` with committed `package-lock.json`. No Bun workspace link.

Repo name is deliberately general. Page content is **not** generalized: this repo starts with two concrete pages for the `parse-usulan-perpanjangan` task. Future status pages will be added as their own concrete pages with their own data shapes.

## 2. Scope

Initial routes:

| Route | Page | Source dataset |
|---|---|---|
| `/` | landing / directory | both JSON files |
| `/paruh-pendidikan` | PPPK paruh waktu — Dinas Pendidikan dan Kebudayaan | `src/data/paruh-pendidikan.json` |
| `/paruh-non-pendidikan` | PPPK paruh waktu — Non Dinas Pendidikan | `src/data/paruh-non-pendidikan.json` |

Out of scope for first release:

- content collections
- generic `sections[]` renderer
- per-OPD compliance status (`DITERIMA` / `PERLU PERBAIKAN` / `BELUM MENGUSUL`)
- client-side fetching, APIs, databases, auth
- committing generated `dist/`

Shared code limited to `BaseLayout.astro`. A component is extracted only when identical markup actually repeats.

## 3. Repo layout

```
workspace-status/
  DESIGN.md
  README.md
  astro.config.mjs
  package.json
  package-lock.json
  tsconfig.json
  .gitignore
  public/
    .nojekyll
    robots.txt
  src/
    data/
      paruh-pendidikan.json
      paruh-non-pendidikan.json
    layouts/
      BaseLayout.astro
    pages/
      index.astro
      paruh-pendidikan.astro
      paruh-non-pendidikan.astro
  .github/workflows/deploy-pages.yml
```

`src/data/*.json` is tracked in git. `dist/`, `node_modules/`, `.astro/` are ignored.

## 4. Data flow

```
private workspace
  tasks/parse-usulan-perpanjangan
    output/*.tsv + data/paruh-waktu-with-unit.tsv
        |
        | actions/12_publish_status.py (new, manual pipeline)
        v
  ../workspace-status/src/data/*.json   (atomic write)
        |
        | operator reviews diff, commits, pushes (manual)
        v
  public GitHub repo main
        |
        | .github/workflows/deploy-pages.yml
        v
  GitHub Pages
```

No reverse dependency. The public repo never reads the private repo. No tokens or secrets are stored in either repo for this flow.

The generator writes JSON only. It does **not** commit, push, or call the GitHub API. Manual commit/push is the review gate before anything becomes public.

## 5. Source data

Generator inputs, all already produced by `parse-usulan-perpanjangan`:

- `data/paruh-waktu-with-unit.tsv` — master PPPK paruh waktu (NIP → UNIT, jenjang, satuan kerja).
- `output/usulan_rows_dedup.tsv` — processed rows, `jenis_pppk`, `unit`.
- `output/usulan_rows.tsv` — per-file parsed rows.
- `output/eml_excel_mapping.tsv` — attachment → sender/date/subject.
- `output/nip_defects.tsv` — ACTIVE defects per sender mail.
- `data/store/mails/*.json` — latest mail per sender.

Aggregation math must be reused from existing PDF code (`lib/paruh_report.py` / `lib/opd_status.py`), not reimplemented. New shared module: `tasks/parse-usulan-perpanjangan/lib/status_export.py`.

Group rule stays `common.paruh_group(unit)`:
- `DINAS PENDIDIKAN*` / `CABANG DINAS PENDIDIKAN*` → Pendidikan
- everything else → Non-Pendidikan

Satuan-kerja jenjang rule stays `common.paruh_jenjang(...)`.

## 6. JSON contracts

Both files carry `meta` and `summary`, then page-specific keys. They are separate shapes on purpose.

### 6.1 `src/data/paruh-pendidikan.json`

```json
{
  "meta": {
    "title": "PPPK Paruh Waktu — Dinas Pendidikan dan Kebudayaan",
    "period": "2026",
    "generated_at": "12 Des 2026, 09:30 WITA",
    "source": "parse-usulan-perpanjangan",
    "source_updated_at": "12 Des 2026, 08:55 WITA"
  },
  "summary": {
    "total": 4373,
    "processed": 12,
    "belum": 4361,
    "ratio": 0.27,
    "province": { "total": 4536, "processed": 12, "ratio": 0.26 },
    "unit_count": 2,
    "satuan_kerja_count": 594,
    "unregistered": 0
  },
  "jenjang": [
    { "name": "SMA", "total": 0, "processed": 0, "belum": 0, "ratio": 0.0 }
  ],
  "units": [
    { "unit": "DINAS PENDIDIKAN DAN KEBUDAYAAN", "total": 4373, "processed": 12, "belum": 4361, "ratio": 0.27 }
  ],
  "satuan_kerja": [
    { "name": "SMAN ...", "total": 10, "processed": 0, "belum": 10, "ratio": 0.0 },
    { "name": "Satuan kerja lainnya (593 satuan kerja)", "total": 4363, "processed": 12, "belum": 4351, "ratio": 0.28 }
  ],
  "invalid_submissions": [
    { "unit": "DINAS PENDIDIKAN DAN KEBUDAYAAN", "reason": "Tanpa lampiran Excel", "count": 1 }
  ]
}
```

Notes:
- `satuan_kerja` contains top 15 rows by `total`, plus one aggregated `Satuan kerja lainnya (n satuan kerja)` row. Mirrors the PDF, avoids a 594-row table.
- `ratio` values are percentages, not fractions.

### 6.2 `src/data/paruh-non-pendidikan.json`

```json
{
  "meta": {
    "title": "PPPK Paruh Waktu — Non Dinas Pendidikan",
    "period": "2026",
    "generated_at": "12 Des 2026, 09:30 WITA",
    "source": "parse-usulan-perpanjangan",
    "source_updated_at": "12 Des 2026, 08:55 WITA"
  },
  "summary": {
    "total": 163,
    "processed": 40,
    "belum": 123,
    "ratio": 24.54,
    "province": { "total": 4536, "processed": 12, "ratio": 0.26 },
    "unit_count": 23,
    "unregistered": 0,
    "unit_status_counts": { "lengkap": 3, "sebagian": 5, "kosong": 15 }
  },
  "units": [
    { "unit": "BIRO UMUM", "total": 4, "processed": 4, "belum": 0, "ratio": 100.0 }
  ],
  "invalid_submissions": [
    { "unit": "SATUAN ...", "reason": "NIP tidak valid (2 baris)", "count": 1 }
  ]
}
```

No `jenjang` or `satuan_kerja` keys. The page renders `unit_status_counts` instead.

Reasons used in `invalid_submissions` are the existing fixed strings:
- `Tanpa lampiran Excel (hanya PDF/tautan)`
- `Berkas Excel tidak sesuai template`
- `NIP tidak valid (n baris)`

Only `unit`, `reason`, `count`. Never sender address, sender name, NIP, or subject.

## 7. Page design

### `/paruh-pendidikan`

1. Title + `Terakhir diperbarui: <generated_at>`.
2. KPI row: total master, sudah masuk, belum, persentase.
3. Progress bar + province-wide line (`x/y` provinsi, share of group).
4. Table: per jenjang.
5. Table: per unit kerja.
6. Table: top satuan kerja + `lainnya` row.
7. Notes: NIP matching, newest submission wins, `TAK TERDAFTAR` excluded, master source.
8. Invalid-submissions table when non-empty.

### `/paruh-non-pendidikan`

1. Title + `Terakhir diperbarui`.
2. KPI row.
3. Progress bar + province line.
4. Line: `n unit lengkap / m sebagian / k kosong`.
5. Table: per unit kerja.
6. Notes.
7. Invalid-submissions table when non-empty.

### `/`

- Site title, one paragraph.
- Two cards linking to the pages, each showing group total + processed + ratio from JSON.
- No other content.

Styling: plain CSS in `BaseLayout.astro`. Indonesian labels. Desktop tables scroll horizontally on narrow screens.

## 8. Workspace generator changes

New files in private repo:

```
tasks/parse-usulan-perpanjangan/actions/12_publish_status.py
tasks/parse-usulan-perpanjangan/lib/status_export.py
tasks/parse-usulan-perpanjangan/pipelines/publish-web.yaml
```

Changes:

- `src/workspace/tasks/context.py`: add `repo_root` property.
  - `task_dir = <repo>/tasks/<name>` → `repo_root = task_dir.parents[1]`.
- `12_publish_status.py`: thin `run(publish_status)` action.
- `publish-web.yaml`:
  ```yaml
  steps:
    - action: 12_publish_status
  ```
- Not added to `full.yaml`. Run only on demand:
  ```
  pixi run task-run parse-usulan-perpanjangan --pipeline publish-web
  ```
- Target dir: env `STATUS_WEB_DIR`, default `../workspace-status` resolved from `repo_root`.
- Output paths:
  - `<STATUS_WEB_DIR>/src/data/paruh-pendidikan.json`
  - `<STATUS_WEB_DIR>/src/data/paruh-non-pendidikan.json`

Validations before write (fail action, no partial publish):

- `processed + belum == total` per group, per unit, per jenjang, per satuan.
- `sum(group.total) == province.total`.
- `sum(group.processed) <= province.processed` and group processed sets are disjoint.
- `unit_status_counts.lengkap + sebagian + kosong == unit_count`.
- No PII keys anywhere: reject `nip`, `nama`, `email`, `no_hp`, `phone`, `sender`, `subject`, `source_file`.
- `meta.generated_at` and `meta.source` present.

Atomic write: serialize to `*.tmp`, then `Path.replace()`.

No network calls. No commit. No push.

## 9. GitHub Actions deployment

`.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Pages source is set to GitHub Actions once, after the workflow exists:

```
gh api repos/below-1/workspace-status/pages -X POST -f build_type=workflow
```

Deferred until implementation. Repo is already public and cloned; Pages itself is not enabled yet.

## 10. Safety

- Public repo. Treat every committed byte as public forever.
- JSON is aggregate-only. No NIP, names, emails, phone numbers, subjects, or source filenames.
- Invalid submissions include counts by unit + fixed reason only.
- `robots.txt` present; add `noindex` later if needed.
- Operator reviews `git diff` in public repo before commit.

## 11. Local commands

In public repo:

```
npm install
npm run dev
npm run build
npm run check
```

In private workspace, after data refresh:

```
pixi run task-run parse-usulan-perpanjangan --pipeline publish-web
cd ../workspace-status
git diff src/data/
git add src/data/
git commit -m "data: refresh paruh waktu status"
git push
```

## 12. Rollout order after design approval

1. Add `astro.config.mjs`, `package.json`, `tsconfig.json`, `.gitignore`, `public/`.
2. Add `BaseLayout.astro` + three pages with placeholder-free rendering from JSON.
3. Add `deploy-pages.yml`.
4. Enable Pages via `gh api`.
5. In private workspace: add `repo_root`, `status_export.py`, action, pipeline, tests.
6. Run `publish-web`; inspect generated JSON.
7. Commit JSON in public repo; verify live Pages URL.

Implementation does not start until this design is reviewed.
