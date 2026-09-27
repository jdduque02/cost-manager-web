# 007 — Wire useCountUp into Dashboard KPI values

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: MEDIUM
- **Category**: Missed opportunity

## Estimated scope
1 file (src/components/views/Dashboard.tsx)

## Problem

`src/hooks/use-count-up.ts` already exists in the repo — a correct,
`prefers-reduced-motion`-aware count-up hook (it checks
`window.matchMedia("(prefers-reduced-motion: reduce)").matches` and, if
true, sets the value directly with no animation — confirmed in the hook's
source, do not re-verify, do not duplicate this logic elsewhere). Nothing in
the app currently uses it (confirmed:
`grep -rn "useCountUp" src --include=*.tsx` returns zero call sites).

The Dashboard's four KPI cards render pre-formatted currency/percentage
strings directly with no transition:

```tsx
// src/components/views/Dashboard.tsx:401-425 — current
<KPI
  label="Patrimonio"
  value={fmtAmount(netWorthValue)}
  delta="Tiempo real"
  positive
  icon={Wallet}
/>
<KPI
  label="Ingresos del mes"
  value={fmtAmount(monthlyIncome)}
  delta="Este mes"
  positive
  icon={TrendingUp}
/>
<KPI
  label="Gastos del mes"
  value={fmtAmount(monthlyExpenses)}
  delta="Este mes"
  positive={false}
  icon={ArrowDownRight}
/>
<KPI
  label="Tasa de ahorro"
  value={`${savingsRate.toFixed(1)}%`}
  delta="Este mes"
  positive={savingsRate > 0}
  icon={PiggyBank}
/>
```

These are exactly the balance/KPI numbers AUDIT.md §8 calls out as
"state changes that teleport... where a brief transition would prevent a
jarring change," and the product direction for this app explicitly allows
count-up feedback motion on balance figures (numbers a user reads to make
decisions should not get *decorative* motion, but legible state-indication
motion like a count-up is in scope and was flagged as a specific missed
opportunity during the audit).

`fmtAmount` (from `useFormattedAmount()`, `src/lib/hooks/use-formatted-
amount.ts`) already handles the app's balance-visibility/privacy mode
correctly — when the user has amounts masked, it returns a constant `MASKED`
string regardless of the numeric input, so animating the underlying number
is always safe: masked mode simply shows the masked string the whole time,
count-up mode formats the animated number every tick.

## Target

Call `useCountUp` once per KPI numeric value, with a small per-card stagger
(30-80ms increments per AUDIT.md §7, matching the stagger convention already
used by `RevealSection` elsewhere on this same page — e.g. `<RevealSection
delay={100}>` on the News Carousel a few lines below), and pass the animated
number through `fmtAmount` / `toFixed` exactly as today, only swapping the
raw value for the animated one:

```tsx
/* target — src/components/views/Dashboard.tsx, inside Dashboard(), after netWorthValue/monthlyIncome/monthlyExpenses/savingsRate are computed */
const animatedNetWorth = useCountUp(netWorthValue, { duration: 800 });
const animatedMonthlyIncome = useCountUp(monthlyIncome, { duration: 800, delay: 60 });
const animatedMonthlyExpenses = useCountUp(monthlyExpenses, { duration: 800, delay: 120 });
const animatedSavingsRate = useCountUp(savingsRate, { duration: 800, delay: 180 });
```

```tsx
/* target — the four KPI call sites, value props only */
<KPI
  label="Patrimonio"
  value={fmtAmount(animatedNetWorth)}
  delta="Tiempo real"
  positive
  icon={Wallet}
/>
<KPI
  label="Ingresos del mes"
  value={fmtAmount(animatedMonthlyIncome)}
  delta="Este mes"
  positive
  icon={TrendingUp}
/>
<KPI
  label="Gastos del mes"
  value={fmtAmount(animatedMonthlyExpenses)}
  delta="Este mes"
  positive={false}
  icon={ArrowDownRight}
/>
<KPI
  label="Tasa de ahorro"
  value={`${animatedSavingsRate.toFixed(1)}%`}
  delta="Este mes"
  positive={savingsRate > 0}
  icon={PiggyBank}
/>
```

Note `positive={savingsRate > 0}` on the last KPI intentionally keeps using
the raw (non-animated) `savingsRate` for the boolean comparison — only the
displayed text uses the animated value; the badge's positive/negative state
should reflect the true final value immediately, not flicker during the
count-up.

## Repo conventions to follow

- Import `useCountUp` from `@/hooks/use-count-up` (the hook already exists
  at `src/hooks/use-count-up.ts`; add the import, do not recreate the hook).
- Stagger increments of 60-100ms already used by `RevealSection delay={...}`
  calls on this same page (e.g. `delay={100}` on the News Carousel section)
  — this plan's 0/60/120/180ms staggering follows that established rhythm.
- `fmtAmount` usage pattern is unchanged — same function, same call
  signature, only the numeric argument changes from the raw value to the
  animated one.

## Steps

1. Open `src/components/views/Dashboard.tsx`. Add
   `import { useCountUp } from "@/hooks/use-count-up";` to the import block
   at the top of the file (place it near the other hook imports, e.g. next
   to `useFormattedAmount`'s import).
2. Inside `Dashboard()`, immediately after the existing
   `const savingsRate = ...` calculation (around line 191-192), add the four
   `useCountUp` calls shown in the Target section.
3. Update the four `KPI` call sites (around lines 401-428) to use
   `animatedNetWorth`, `animatedMonthlyIncome`, `animatedMonthlyExpenses`,
   and `animatedSavingsRate` in place of `netWorthValue`, `monthlyIncome`,
   `monthlyExpenses`, and `savingsRate` — but ONLY inside the `value={...}`
   prop. Leave `positive={savingsRate > 0}` referencing the raw
   `savingsRate`, unchanged.

## Boundaries

- Do NOT modify `src/hooks/use-count-up.ts` — it's already correct.
- Do NOT modify the `KPI` component itself (its props/signature stay
  `value: string`) — this plan only changes what's passed into `value`.
- Do NOT add count-up to any other numeric display outside these four KPI
  cards (e.g. chart tooltips, transaction row amounts) — out of scope.
- Do NOT change `fmtAmount`/`useFormattedAmount` — masked-mode behavior must
  stay exactly as-is.
- If `netWorthValue`/`monthlyIncome`/`monthlyExpenses`/`savingsRate` or the
  KPI JSX has drifted from the quoted current code since commit 70cb322,
  STOP and report instead of guessing where to wire the hook.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` and `pnpm run build` must both
  succeed. `pnpm test` (Vitest) must still pass — check whether any existing
  Dashboard test asserts on the KPI's rendered text synchronously
  immediately after mount; if so, note that `useCountUp` starts at 0 and
  animates up, so a synchronous assertion checking for the *final* formatted
  value right after render may now fail intermittently — if you find such a
  test, report it rather than silently changing test behavior.
- **Feel check**:
  1. Run `pnpm dev`, log in, land on `/dashboard`.
  2. Confirm all four KPI values count up from 0 (or from a lower value) to
     their final value over ~800ms, staggered slightly (Patrimonio starts
     first, Tasa de ahorro last, ~180ms behind).
  3. Toggle balance visibility to masked mode (if a UI control exists for
     this — check `VisibilityProvider`/`useVisibility` usage in the app,
     e.g. a Settings toggle or an eye icon) and confirm KPI values show the
     masked placeholder with no animation artifacts (no flashing numbers
     before the mask applies).
  4. In DevTools Rendering panel, emulate `prefers-reduced-motion: reduce`,
     reload — confirm KPI values appear at their final value immediately,
     with no count-up (per `useCountUp`'s existing reduced-motion handling).
  5. Navigate away from `/dashboard` and back — confirm the count-up
     replays correctly each time the component remounts, with no console
     errors about unmounted-component state updates (the hook already
     clears its `requestAnimationFrame`/`setTimeout` on unmount — confirm
     this still holds by watching the console during rapid navigation
     away mid-animation).
- **Done when**: all four KPIs count up on mount with the specified stagger,
  reduced-motion and masked-mode both degrade correctly, and no new
  TypeScript/build/test failures are introduced.
