# Design System: Sprig — Personal Finance (Colombia)

## 1. Visual Theme & Atmosphere
A warm, trustworthy financial dashboard — closer to "well-run neighborhood credit union"
than "fintech unicorn." Density sits mid-range: enough data on screen to feel
useful (balances, transactions, charts) without turning into a cockpit. Variance
is moderate-high — asymmetric hero and summary layouts, not a grid of identical
tiles. Motion is fluid but restrained: numbers count up, cards settle into place,
nothing loops for its own sake. The palette leans organic (forest green, warm
cream, muted gold) rather than corporate blue or neon fintech gradients — it
should feel like paper ledgers and growing money, not a crypto exchange.

- Density: 5/10 (Daily App Balanced — dashboards and tables lean 6-7, marketing/empty states lean 3-4)
- Variance: 6/10 (Offset Asymmetric — hero and summary cards break the grid; data tables stay orderly)
- Motion: 5/10 (Fluid CSS — spring-based transitions, count-up numbers; no perpetual ambient loops on financial data)

## 2. Color Palette & Roles
Locked to the existing Sprig tokens in `src/styles.css` — do not introduce new hexes.

- **Warm Linen** (`#F4F1E7`) — Primary background, light mode
- **Pure Surface** (`#FFFFFF`) — Card and container fill, light mode
- **Sage Wash** (`#E6EFE6`) — Secondary surface, muted backgrounds, chip fills
- **Charcoal Ink** (`#1A1A1A`) — Primary text (light mode), primary background (dark mode)
- **Steel Muted** (`#555A5E`) — Secondary text, metadata, chart-5
- **Forest Primary** (`#1E5C3A`) — Primary actions, brand mark, chart-1 (light mode)
- **Deep Fern** (`#2F7D53`) — Success states, focus ring, secondary surfaces, chart-3
- **Antique Gold** (`#D4A53A`) — The single accent. CTAs in dark mode, highlights, chart-2. Saturation held below 80% — never a bright/neon yellow
- **Soft Amber** (`#E8B94A`) — Warning states, chart-4 (use sparingly, never alongside Antique Gold in the same element)
- **Border Hairline** (`#E6E8EC`) — 1px structural lines, input borders

Dark mode inverts the role of Forest/Gold: background becomes Charcoal Ink,
surfaces become Forest Primary, and Antique Gold takes over as primary/accent.
Never introduce a second accent color. Never use pure black — Charcoal Ink
(`#1A1A1A`) is the floor.

## 3. Typography Rules
- **Display:** `Space Grotesk` — track-tight, used for hero numbers, page titles, balance figures. Weight and color carry hierarchy, not size alone
- **Body / UI:** `Schibsted Grotesk` — relaxed leading, max 65 characters per line for explanatory copy (education content, empty states, tooltips)
- **Mono:** Not currently in the stack — when high-density tabular figures need tabular alignment (transaction tables, statements), use `font-variant-numeric: tabular-nums` on Schibsted Grotesk rather than introducing a mono font
- **Banned:** Inter, generic system sans as a primary display face, any serif (this is a software dashboard — serif is always banned here)
- **High-Density Override:** transaction lists, statement tables, and any view showing >8 numeric rows must use tabular-nums for column alignment

## 4. Component Stylings
Reuse the 32 components in `src/components/ui` (shadcn/ui "new-york") before building new ones — see [combobox.tsx](src/components/ui/combobox.tsx), [currency-input.tsx](src/components/ui/currency-input.tsx), etc.

- **Buttons:** Flat fills using Forest Primary (light) / Antique Gold (dark). No outer glow, no neon shadow. Tactile -1px translate + slight shadow compression on `:active`. Ghost/outline for secondary actions — never two filled buttons of equal weight in one view
- **Cards:** Rounded per `--radius` (0.875rem base, scaling to `--radius-2xl`/`3xl` for hero/summary cards). Use `--shadow-elegant` (diffused, tinted toward Charcoal Ink at low opacity) — never a generic drop shadow. Reserve cards for balance summaries, goal cards, and dialogs; transaction lists use border-top dividers instead of nested cards
- **Money display:** Always through `fmtCurrency`/`parseCurrency` in [src/lib/format.ts](src/lib/format.ts) (es-CO/COP) — never format currency inline in a component. Positive amounts use Deep Fern, negative use destructive red, never color-code by category
- **Charts:** Highcharts or Recharts only (whichever the sibling view already uses) — no third charting library. Chart colors pull from `--chart-1` through `--chart-5` in order, never ad-hoc hexes
- **Inputs/Forms:** Label above input, helper text optional, error text below in destructive color. Focus ring uses `--ring` (Deep Fern light / Antique Gold dark). No floating labels
- **Loading States:** Skeletal loaders matching exact layout dimensions (see [loading-bar.tsx](src/components/ui/loading-bar.tsx)) — no generic circular spinners for content areas; a small inline spinner is acceptable only inside a button mid-submit
- **Empty States:** Composed illustrations or icon + copy explaining how to populate the view (e.g. "add your first goal") — never bare "No data" text
- **Error States:** Inline, adjacent to the field or action that failed; toast/banner only for request-level failures, not field validation

## 5. Layout Principles
- No overlapping elements — every element occupies its own clear spatial zone
- Hero/marketing sections (Landing, onboarding) use asymmetric or split-screen layouts, not centered stacks, since variance is 6
- Dashboard and data views (Dashboard, Reports, Wealth, TransactionsList) prioritize clarity over asymmetry — a well-ordered grid is correct here even though it reads as more "predictable"; don't force asymmetry onto tabular financial data
- Avoid the generic "3 equal cards horizontally" feature row on marketing/education pages — use 2-column zig-zag or an asymmetric grid instead
- CSS Grid over Flexbox math for multi-column layouts; avoid `calc()` percentage hacks
- Contain content with max-width constraints (1400px centered) on wide dashboard views
- Full-height sections use `min-h-[100dvh]`, never `h-screen`

## 6. Responsive Rules
- Mobile-first collapse below 768px: all multi-column dashboards, summary card rows, and forms drop to single column
- No horizontal scroll except deliberate horizontally-scrollable tables/calendars with a visible scroll affordance
- Headline sizes scale via `clamp()`; body text minimum 1rem/14px
- All interactive elements (including table row actions and dialog close buttons) minimum 44px tap target on touch
- Desktop horizontal nav collapses to a mobile menu/sheet
- Vertical section spacing reduces proportionally via `clamp(3rem, 8vw, 6rem)` on marketing pages; dashboard views use fixed, denser spacing at all breakpoints since they're data tools, not editorial pages

## 7. Motion & Interaction
- Spring physics default for interactive elements: stiffness 100, damping 20 — no linear easing. The existing `--ease-out-soft` cubic-bezier is the fallback for CSS-only transitions where spring isn't available
- Balance figures and KPI numbers count up on mount/update rather than snapping
- Staggered cascade reveals for lists (transactions, goals, categories) — no instant-mount lists
- Reserve perpetual micro-loops (pulse, shimmer) for loading skeletons only — financial data should feel calm and settled once loaded, not perpetually animating
- Animate exclusively via `transform` and `opacity`; never animate `top`, `left`, `width`, `height`
- Respect `prefers-reduced-motion` — disable count-up and cascade delays, keep instant state changes

## 8. Anti-Patterns (Banned)
- No emojis anywhere in the UI
- No Inter font
- No serif fonts anywhere in this app (it's a dashboard, not editorial)
- No pure black (`#000000`) — Charcoal Ink (`#1A1A1A`) is the floor
- No neon/outer-glow shadows, no purple/blue "AI" gradient aesthetic
- No second accent color alongside Antique Gold
- No gradient text on headers
- No custom mouse cursors
- No overlapping elements
- No 3-equal-column card grids on marketing pages
- No generic placeholder names ("John Doe", "Acme Corp") — use realistic Colombian names/merchants in mockups and seed data
- No fake round numbers in mock financial data (avoid `$1,000,000.00` — use realistic COP figures with cents)
- No AI copywriting clichés ("Elevate tus finanzas", "Unleash", "Next-Gen")
- No filler UI text ("Scroll to explore", bouncing chevrons)
- No broken Unsplash links — use `picsum.photos` or SVG avatars for mock imagery
- No centered hero on the Landing page — asymmetric/split layout only
- No formatting currency outside `fmtCurrency`/`parseCurrency`
- No introducing a third charting library beyond Highcharts/Recharts
- No storing tokens in localStorage — this is an app-security rule, not just a design one, but it governs any auth-adjacent UI state shown on screen
