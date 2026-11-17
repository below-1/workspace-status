# DESIGN — workspace-status

Static status pages published from data pipelines in the private `below-1/workspace` repo.

Status: **implemented** (design baseline; see current files for exact code).

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

Shared code is **global** (theme, layout, chart wrappers, table/KPI presentation), not a generic content model. Extract a component only when identical markup actually repeats.

## 3. Stack

- **Astro** — static pages, routing, build-time JSON import, SEO.
- **React** — interactive islands only (theme toggle + charts).
- **shadcn/ui** — copied components, not a dependency package.
- **Tailwind CSS v4** — global utility layer + CSS variables.
- **Recharts** — chart engine, wrapped by a local shadcn-style `chart` component.
- **TypeScript strict**.

Integration rules:

- `.astro` files own page structure, KPI cards, chart frames, and static tables. Good for HTML weight and accessibility.
- React is added through `@astrojs/react`; no full-page React SPA.
- React islands: theme toggle, donut, jenjang bar, unit bar. Each receives JSON data as props at build time.
- shadcn components live in `src/components/ui/` and follow shadcn's copy-paste pattern (CVA + Radix Slot + Tailwind tokens).
- `rsc: false` in `components.json` — Astro React islands are not React Server Components.
- Tailwind v4 via `@tailwindcss/vite` (not `@astrojs/tailwind`).
- Global CSS imported once in `BaseLayout.astro`. No per-page style files.

`.astro/components/*` and `src/components/*` can coexist; convention: React components only under `src/components/`.

## 4. Repo layout

```
workspace-status/
  DESIGN.md
  README.md
  astro.config.mjs
  package.json
  package-lock.json
  tsconfig.json
  components.json
  .gitignore
  public/
    .nojekyll
    robots.txt
  src/
    styles/
      globals.css              # Tailwind import + theme tokens + base styles
    data/
      paruh-pendidikan.json
      paruh-non-pendidikan.json
    lib/
      utils.ts                 # shadcn cn()
      format.ts                # number/percent formatters
      table.ts                 # TableColumn type
    components/
      ui/                      # shadcn-style: button, card, badge, table, chart
      ThemeToggle.tsx
      charts/
        RatioDonut.tsx
        HorizontalStatusChart.tsx
        JenjangBar.tsx
        UnitBar.tsx
        ChartFrame.astro       # shared title/desc/empty-state wrapper
      KpiCards.astro
      StatTable.astro
    layouts/
      BaseLayout.astro
    pages/
      index.astro
      paruh-pendidikan.astro
      paruh-non-pendidikan.astro
  .github/workflows/deploy-pages.yml
```

`src/data/*.json` is tracked in git. `dist/`, `node_modules/`, `.astro/` are ignored.

## 5. Data flow

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

## 6. Source data

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

## 7. JSON contracts

Both files carry `meta` and `summary`, then page-specific keys. They are separate shapes on purpose.

### 7.1 `src/data/paruh-pendidikan.json`

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

### 7.2 `src/data/paruh-non-pendidikan.json`

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

## 8. Global theme + styling

One theme for the whole repo. Defined once in `src/styles/globals.css`, imported once in `BaseLayout.astro`. Every page and every React island uses the same CSS variables. No local color literals in pages/components except data-viz series colors that are also sourced from tokens.

### 8.1 Direction

Recommended: **Calm Teal on Slate**, with the existing report maroon (`#8B0000`) kept only as a small brand accent (header rule / footer), not as the primary action color.

Why:
- Calm, institutional, non-alarmist for progress reporting.
- Teal/green/amber/red separate cleanly in charts.
- Contrast passes WCAG AA on light backgrounds.
- Maroon continuity with `laporan_*.pdf` without making every chart look like an error state.

Alternative considered: **Institutional Maroon** (primary `#8B0000`). Rejected as global primary — too heavy and collides semantically with red "belum / invalid" states.

### 8.2 Tokens (light)

| Token | Hex | Use |
|---|---|---|
| `background` | `#F8FAFC` | page |
| `foreground` | `#0F172A` | text |
| `card` | `#FFFFFF` | cards / table surface |
| `muted` | `#F1F5F9` | subtle bands |
| `muted-foreground` | `#64748B` | labels, timestamps |
| `border` | `#E2E8F0` | borders |
| `primary` | `#0F766E` | links, active, progress fill |
| `primary-foreground` | `#FFFFFF` | text on primary |
| `accent` | `#B45309` | highlight, warnings |
| `success` | `#15803D` | sudah masuk / lengkap |
| `warning` | `#B45309` | sebagian |
| `danger` | `#B91C1C` | belum / kosong / invalid |
| `brand` | `#8B0000` | thin header rule only |

Dark mode tokens mirror these (`background #0B1120`, `card #111827`, `foreground #E2E8F0`, `primary #2DD4BF`, etc.). Class strategy: `<html class="dark">`. Inline pre-paint script in `BaseLayout.astro` reads `localStorage.theme` / `prefers-color-scheme`, sets class before render. `ThemeToggle.tsx` hydrates `client:idle` and only flips the class + storage.

### 8.3 Typography

- Self-host via `@fontsource/inter` (MIT/SIL OFL). No runtime Google Fonts request.
- Body + headings: **Inter**.
- Numbers/tables: same Inter with `font-variant-numeric: tabular-nums`.
- Max two weights: 400 and 600. Headings use 600.
- Indonesian labels; dates in `dd MMM yyyy, HH:mm WITA`.

### 8.4 Layout language

- `max-w-6xl` container, generous `py-8` page padding.
- Header: site title, current page label, `Terakhir diperbarui`, theme toggle.
- Cards: `rounded-xl border bg-card shadow-sm`, no heavy shadows.
- KPI cards: label uppercase small `tracking-wide text-muted-foreground`, value `text-3xl font-semibold tabular-nums`.
- Progress bar: `h-2.5 rounded-full bg-muted`, fill `bg-primary`; pending segment `bg-danger/20` with explicit label.
- Tables: sticky header, right-aligned numeric columns, `tabular-nums`, horizontal scroll wrapper on small screens, zebra via `odd:bg-muted/40`.
- Badges: shadcn `Badge` variants mapped to `success` / `warning` / `danger` tokens. Never color alone — always text label too.
- Spacing: Tailwind scale 4/6/8. Radius: `rounded-lg` / `rounded-xl`.

### 8.5 Tailwind / shadcn setup

`src/styles/globals.css` skeleton:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --primary: #0f766e;
  --primary-foreground: #ffffff;
  --success: #15803d;
  --warning: #b45309;
  --danger: #b91c1c;
  --brand: #8b0000;
  /* + shadcn required vars: muted, border, ring, radius, ... */
}

.dark { /* mirrored tokens */ }

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
}

@layer base {
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "tnum";
  }
}
```

`components.json` essentials:

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "utils": "@/lib/utils"
  }
}
```

`astro.config.mjs` essentials:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://below-1.github.io',
  base: '/workspace-status',
  output: 'static',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
```

`tsconfig.json`: extend `astro/tsconfigs/strict`, set `jsx: "react-jsx"`, `baseUrl: "."`, `paths: { "@/*": ["src/*"] }`.

## 9. Charts / data viz

Free libraries evaluated (checked on npm, current versions):

| Library | License | Fit | Verdict |
|---|---|---|---|
| shadcn `chart` + Recharts | MIT | React-first, declarative bar/donut/line, themeable via CSS vars | **chosen** |
| Nivo | MIT | Beautiful defaults, many chart types, heavier bundle | later if needed |
| Visx | MIT | Low-level React + D3 primitives, max control, slower to build | not now |
| Chart.js + react-chartjs-2 | MIT | Canvas, capable, less React-idiomatic | not now |
| uPlot | MIT | Tiny/fast time series, poor categorical bars | only for future trend pages |
| ECharts | Apache-2.0 | Very powerful, large bundle | overkill |
| Observable Plot (`@observablehq/plot`) | ISC | Great build-time SVG, not React-native | optional future static charts |
| D3 | ISC | Maximum control, high cost | not now |

Decision: use **shadcn `chart`**, which wraps **Recharts**. One dependency path, MIT, consistent tokens, no custom chart CSS. Install only the pieces needed: `chart`, `card`, `badge`, `table`, `button`.

Charts implemented:

| Page | Chart | Data | Why |
|---|---|---|---|
| Pendidikan | donut | `summary.processed` vs `summary.belum` | instant overall ratio |
| Pendidikan | horizontal stacked bar | `jenjang[]` | 0% school placement is the story; sorted by `total` |
| Pendidikan | horizontal bar | `satuan_kerja[]` | top 15 + `lainnya`, no 594-row chart |
| Non-Pendidikan | horizontal stacked bar | `units[]` | done/pending per unit, sorted by `total` |
| Non-Pendidikan | 3 stat cards | `unit_status_counts` | lengkap/sebagian/kosong, no chart needed |
| `/` | small progress line | both `summary` | directory context |

Rules:
- Tables remain the source of truth; charts are a visual summary beside them, never instead of them.
- `ChartFrame.astro` supplies title, short description, and empty state; chart islands carry Recharts tooltips.
- Series colors from tokens: `primary` = sudah masuk, `danger/30` = belum, `warning` = sebagian.
- Always show numeric labels/legend. No color-only meaning.
- React islands use `client:visible` for charts below fold, `client:idle` for `ThemeToggle`, `client:load` only if a chart must paint immediately.
- No chart library loaded on `/` beyond what is needed for tiny progress bars.

## 10. Page design

### `/paruh-pendidikan`

1. Title + `Terakhir diperbarui: <generated_at>`.
2. KPI row (Astro static, shadcn Card styling): total master, sudah masuk, belum, persentase.
3. `RatioDonut` + province-wide line (`x/y` provinsi, share of group).
4. `JenjangBar` + static table per jenjang.
5. Static table per unit kerja.
6. `UnitBar` for `satuan_kerja[]` + static table.
7. Notes: NIP matching, newest submission wins, `TAK TERDAFTAR` excluded, master source.
8. Invalid-submissions table when non-empty.

### `/paruh-non-pendidikan`

1. Title + `Terakhir diperbarui`.
2. KPI row.
3. `RatioDonut` + province line.
4. 3 stat cards from `unit_status_counts`.
5. `UnitBar` + static table per unit kerja.
6. Notes.
7. Invalid-submissions table when non-empty.

### `/`

- Site title, one paragraph.
- Two cards linking to the pages, each showing group total + processed + ratio.
- Tiny CSS progress line per card from JSON. No chart island.

## 11. Workspace generator changes

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

## 12. GitHub Actions deployment

`.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]

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
          node-version: 24
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

Current default branch is `master`; workflow allows both `main` and `master` until branch naming is settled.

Pages source is set to GitHub Actions once, after the workflow exists:

```
gh api repos/below-1/workspace-status/pages -X POST -f build_type=workflow
```

Deferred until implementation. Repo is already public and cloned; Pages itself is not enabled yet.

## 13. Safety

- Public repo. Treat every committed byte as public forever.
- JSON is aggregate-only. No NIP, names, emails, phone numbers, subjects, or source filenames.
- Invalid submissions include counts by unit + fixed reason only.
- `robots.txt` present; add `noindex` later if needed.
- Operator reviews `git diff` in public repo before commit.
- Chart tooltips/labels only use fields present in JSON; no hidden raw row data passed to islands.

## 14. Local commands

In public repo:

```
npm install
npx shadcn@latest init
npx shadcn@latest add button card badge table chart
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

## 15. Rollout order after design approval

1. Add `astro.config.mjs`, `package.json`, `tsconfig.json`, `components.json`, `.gitignore`, `public/`.
2. Add `src/styles/globals.css` with global tokens; import in `BaseLayout.astro`.
3. Init shadcn; add `button`, `card`, `badge`, `table`, `chart`.
4. Add `ThemeToggle.tsx` + pre-paint script.
5. Add chart islands (`RatioDonut`, `JenjangBar`, `UnitBar`) + `ChartFrame`.
6. Add three pages with placeholder-free rendering from JSON.
7. Add `deploy-pages.yml`.
8. Enable Pages via `gh api`.
9. In private workspace: add `repo_root`, `status_export.py`, action, pipeline, tests.
10. Run `publish-web`; inspect generated JSON.
11. Commit JSON in public repo; verify live Pages URL.

Implementation does not start until this expanded design is reviewed.
