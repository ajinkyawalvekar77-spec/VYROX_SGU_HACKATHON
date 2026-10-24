# Optiqo Frontend — Backend Integration & Handoff Guide

## 1. Quickstart & Environment Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation & Run
```bash
npm install
npm run dev
npm run test
npm run build
npx oxlint src
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Root URL of backend REST API without trailing slash. |
| `VITE_USE_MOCKS` | `true` | When `true`, services route to mock adapters. When `false`, real HTTP requests. |

---

## 2. Route Map

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Overview` | Live Dashboard, 4 summary metric cards, pipeline stepper, demand forecast chart, risk donut, top alerts. (PRD J1) |
| `/validation` | `DataValidation` | Pre-flight sanity checks, findings table, slide-out drawer. (PRD J1, P0-01..03) |
| `/risk` | `RiskOverview` | Ranked SKU-destination pairs, network shortages, quantitative drivers drawer. (PRD J2, P0-07) |
| `/plan` | `DistributionPlan` | Transfer recommendations, status simulator, before/after cards, plan lines table, master-detail drawer on row click, CSV export. (PRD J3, P0-04..06, P0-11) |
| `/plan/:lineId` | `RecommendationDetail` | One-sentence explanation, verifier badge, forecast chart, stock balances, shelf-life bar, next-best alternative, binding constraints, graceful 404. Also embeds as drawer inside `/plan`. (PRD J4, P0-08) |
| `/backtest` | `Backtesting` | K1-K8 KPI table, gain decomposition, 30-day trajectory tabs, honest reporting stress test. (PRD J5, P0-09) |
| `/runs` | `RunDetails` | Solver execution logs, run comparison modal, CSV/JSON manifest downloads. (PRD J7) |
| `*` | `NotFound` | 404 page. |

---

## 3. Layout & Scroll Architecture

### 3-Zone Independent Scrolling
`html` and `body` have `overflow: hidden; max-height: 100dvh` — they never scroll.

| Zone | Element | Role |
|------|---------|------|
| Zone 1 | `aside` (Sidebar) | Internal nav scroll only |
| Zone 2 | `header` (Topbar) | Sticky — gains shadow when Zone 3 scrolls |
| Zone 3 | `main#main-content` | Sole scroll container for all page content |

**Rules:**
- All drawer/modal scroll locking must target `#main-content` via `mainEl.style.overflow = 'hidden'`, never `document.body`.
- Tooltips inside the collapsed sidebar use `createPortal(..., document.body)` with `position: fixed` to avoid `overflow-x: hidden` clipping.
- Scroll position is saved/restored per route by `useScrollRestoration` hook.

### Edge-to-Edge Layout
`app-shell-container` fills 100dvh x 100vw with no outer margin or border-radius. The violet canvas background has been removed for a clean full-bleed layout.

---

## 4. Component Inventory

### Layout & Shell
- **`AppShell.jsx`** — Root layout: pinned desktop sidebar, mobile overlay drawer, topbar, `#main-content` scroll zone. Persists sidebar collapse to `localStorage`.
- **`PageLayout.jsx`** — Standardized page wrapper with slots: `title`, `subtitle`, `headerActions`, `filterBar` (sticky under topbar), `summaryCards` (4-col grid), `sectionNav` (sticky in-page anchors), `children`.
- **`Topbar.jsx`** — Sticky top navbar with dynamic scroll elevation shadow, breadcrumbs, command palette trigger, solver status chip, notification popover, user menu.
- **`Sidebar.jsx`** — 3-section grouped navigation (Workspace / Analysis / Operations), collapsible rail mode, alert badges, pinned footer. Collapse state persisted to `localStorage('optiqo_sidebar_collapsed')`.

### Navigation & Search
- **`Breadcrumbs.jsx`** — Route-aware breadcrumb trail with Home icon link.
- **`CommandPalette.jsx`** — Dialog triggered by `Ctrl+K`. Fuzzy search across pages, SKUs, hubs, and quick actions. Keyboard arrow + Enter navigation.
- **`UserMenu.jsx`** — Dropdown: user profile, workspace label, theme toggle, API credentials.

### Data Display
- **`DataTable.jsx`** — Sortable table with sticky header, density toggle (persisted to `localStorage('optiqo_datatable_density')`), `selectedRowKey` row highlight, custom totals `footer`, pagination, empty/error states.
- **`StatCard.jsx`** — Metric card with large values, delta indicators, hover lift on interactive cards.
- **`SectionCard.jsx`** — Card container with header, subtitle, controls slot.
- **`ChartCard.jsx`** — SectionCard tailored for Recharts with custom `ChartTooltip`.

### Overlays & Feedback
- **`Drawer.jsx`** — Accessible slide-out panel, backdrop blur, `Escape` listener, focus trapping. Scroll locking targets `#main-content` only.
- **`Tooltip.jsx`** — Portal-based floating tooltip (`createPortal` into `document.body`, `position: fixed`). Prevents sidebar overflow clipping.
- **`HelpModal.jsx`** — Keyboard shortcuts modal triggered by `?` key.
- **`Toast.jsx`** — Toast notification provider and `useToast` hook.

### Status & Indicators
- **`RunStatusCard.jsx`** — Compact solver run status card in sidebar footer.
- **`StatusBanner.jsx`** — Maps all 7 PRD status codes (`ok`, `warning`, `error`) with action buttons.
- **`StatusChip.jsx`** — Compact status pill for solver codes.
- **`SeverityChip.jsx`** — Color-coded severity badge.

---

## 5. Global Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Command Palette search |
| `?` | Open Help & Keyboard Shortcuts modal |
| `Esc` | Close any open modal, drawer, or palette |
| `Up` / `Down` | Navigate command palette results |
| `Enter` | Select command palette result |
| `Tab` / `Shift+Tab` | Trap focus inside open Drawer or modal |

---

## 6. Persistence Keys (localStorage)

| Key | Values | Component |
|-----|--------|-----------|
| `optiqo_sidebar_collapsed` | `'true'` / `'false'` | `AppShell.jsx` / `Sidebar.jsx` |
| `optiqo_datatable_density` | `'comfortable'` / `'compact'` | `DataTable.jsx` |
| `optiqo_theme` | `'light'` / `'dark'` | `useTheme.js` |

---

## 7. Mock vs. Real Status per Endpoint

| Service Area | Endpoint | Method | Mock | Real Backend |
|--------------|----------|:------:|:----:|:------------:|
| **Validation** | `/validation/report` | GET | Ready | Contract proposed |
| | `/validation/run` | POST | Ready | Contract proposed |
| | `/validation/history` | GET | Ready | Contract proposed |
| **Forecast** | `/forecast/summary` | GET | Ready | Contract proposed |
| | `/forecast/series` | GET | Ready | Contract proposed |
| **Risk** | `/risk/overview` | GET | Ready | Contract proposed |
| | `/risk/breakdown` | GET | Ready | Contract proposed |
| **Plan** | `/plan/active` | GET | Ready | Contract proposed |
| | `/plan/lines/:lineId` | GET | Ready | Contract proposed (P0-08 verifier) |
| | `/plan/generate` | POST | Ready | Contract proposed (async job) |
| **Backtest** | `/backtest/summary` | GET | Ready | Contract proposed |
| **Runs** | `/runs` | GET | Ready | Contract proposed |
| | `/runs/:runId` | GET | Ready | Contract proposed |
| | `/runs/:runId/export` | GET | Ready | Fallback client-side export |

---

## 8. Questions for Backend Owner

1. **Async Solver Polling**: Does `POST /plan/generate` return a `runId` for polling via `GET /runs/:runId`, or will WebSocket / SSE be supported?
2. **Inventory Categorization (P0-03)**: Will `/validation/report` expose `inventorySummary: { usableUnits, unusableExpiredUnits, quarantinedUnits }` in v2?
3. **Export URLs**: Will `/runs/:runId/export` return a pre-signed S3/GCS URL or stream `text/csv` directly?
4. **Explanation Verifier (P0-08)**: Confirm field names `explanation: string` and `explanationVerified: boolean` in `/plan/lines/:lineId`.

---

## 9. Manual Demo Script

### Journey J1: Validation (`/validation` -> `/`)
1. Open `/validation` — StatusBanner shows 3 warnings, 0 critical errors.
2. Click **"Validate Dataset"** — observe staged progress bar.
3. Click any finding row — observe slide-out drawer with schema coordinates.
4. Navigate to `/` Overview.

### Journey J2: Risk Overview (`/risk`)
1. Observe 4 summary metric cards: 16 Total, 3 Critical, 5 High, 8 Medium & Low.
2. Review Network-Level Supply Shortages: 3 critical constraints with deficit units.
3. Click **Cover (Days)** column header to sort — observe reset-to-default badge.
4. Click `SKU-1042 at WH-3` row — observe quantitative drivers drawer.

### Journey J3: Distribution Plan (`/plan`)
1. Inspect 4 summary metric cards: Unmet Demand (-85.7%), Expiry Loss (-78.9%), Freight ($37,910), Checker (0/18 violations).
2. Switch simulator to `INFEASIBLE` — observe red halt card, plan lines hidden.
3. Switch back to `OK`.
4. **Click any plan row** — master-detail drawer opens with full `RecommendationDetail` evidence (forecast chart, stock balances, shelf-life bar, constraints), table filters preserved.
5. In drawer, click **"Full Page"** to open standalone `/plan/:lineId`.
6. Click **"Columns"** — toggle column visibility.
7. Click **"Export CSV"** — observe sanitized download and notification.

### Journey J4: Recommendation Detail (`/plan/:lineId`)
1. Navigate to `/plan/line-001` — observe one-sentence explanation with green **"Verified (PRD P0-08)"** badge.
2. Review 4 Evidence Cards: Demand Horizon, Stock & Balance, Shelf-Life bar, Counterfactual.
3. Test Prev/Next navigation.
4. Test 404: `/plan/unknown-line-999` — verify graceful empty state.

### Journey J5: Backtesting (`/backtest`)
1. Review K1-K8 table (B1 / B2 / Optiqo columns).
2. Review Gain Decomposition: Forecast Effect (+$42,500) vs Allocation (+$68,400).
3. Toggle trajectory tabs: Unmet Demand, Expiry Wastage, Freight Cost.
4. Switch to **Stress Test Parity** — Optiqo freight exceeds B2 (+15.5%), `NOT MET` chips appear (honest reporting).

### Journey J7: Run Details (`/runs`)
1. Select two runs — click **"Compare Selected Runs"** to open comparison modal.
2. Click `run-003` — manifest drawer opens with SHA-256 hash, solver params, library versions.
3. Click **"Download Plan CSV"** or **"Export Manifest JSON"** — observe download + toast.

---

## 10. Design Token Reference

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-shell` | `#FFFFFF` | `#151322` | App shell background (edge-to-edge) |
| `--color-surface` | `#FFFFFF` | `#1A1728` | Card and panel surfaces |
| `--color-sidebar` | `#F8F6FF` | `#12101E` | Sidebar pale-violet background |
| `--color-tint` | `#EFEBFF` | `#24203A` | Hover states, subtle highlights |
| `--color-primary` | `#7B68F5` | `#9585FF` | Violet accent, active states |
| `--color-primary-lilac` | `#B5AAF9` | `#7B68F5` | Secondary violet, chart fills |
| `--color-ink` | `#14121F` | `#EDE9FE` | Primary text |
| `--color-muted` | `#8E8BA0` | `#7F7B98` | Secondary text, labels |
| `--color-border` | `#E4E0F0` | `#29253E` | Card and component borders |
| `--radius-card` | `24px` | `24px` | Card border radius |
| `--radius-pill` | `9999px` | `9999px` | Button and chip border radius |
