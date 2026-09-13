# 003 — Fix competing transition/animate-in systems in Sheet, apply drawer easing

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: HIGH
- **Category**: Interruptibility / Performance / Easing

## Estimated scope
2 files (src/components/ui/sheet.tsx, src/styles.css)

## Problem

`sheet.tsx`'s content variant class mixes a bare Tailwind `transition`
utility with the `animate-in`/`animate-out` (tw-animate-css keyframe-driven)
utilities on the same element:

```tsx
// src/components/ui/sheet.tsx:33-45 — current
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out duration-300 data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    ...
  },
);
```

Tailwind's bare `transition` utility sets `transition-property: color,
background-color, border-color, text-decoration-color, fill, stroke,
opacity, box-shadow, transform, filter, backdrop-filter` with `duration-300
ease-in-out`. At the same time, `animate-in`/`animate-out` apply a CSS
`animation` (the `enter`/`exit` keyframes from `tw-animate-css`, confirmed in
`node_modules/tw-animate-css/dist/tw-animate.css`) that also drives
`transform` and `opacity`. Two motion systems — a `transition` and an
`animation` — are both targeting `transform`/`opacity` on the same element.
CSS animations take priority over transitions for the properties they share,
so the `transition` half is largely dead weight for `transform`/`opacity`,
but it still actively fires on every other listed property (e.g. `box-shadow`,
`filter`) on every state change, and being present at all makes this element
harder to reason about and prone to visual jitter if `animate-in`/`animate-
out` classes are ever removed independently of `transition`. This matches
AUDIT.md §4 ("keyframes on toasts/toggles/rapidly-triggered UI") and §5
("`transition: all`-equivalent bundles animate unintended properties").

Additionally, `ease-in-out` here is Tailwind's built-in (weak) curve. This is
a drawer — AUDIT.md §2 prescribes the iOS-like drawer curve for exactly this
case:

```css
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

which does not exist yet as a token anywhere in this repo.

## Target

1. Add `--ease-drawer` to `src/styles.css`'s `:root` token block, next to the
   existing `--ease-out-soft`:

```css
/* src/styles.css:42 — current */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
```

```css
/* target */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

2. Remove the bare `transition ease-in-out duration-300` from
   `sheetVariants`'s base string, and instead pass the drawer easing to the
   `animate-in`/`animate-out` animation via Tailwind's arbitrary-value
   `ease-[...]` utility (which sets `--tw-ease`, consumed by tw-animate-css's
   `--animate-in`/`--animate-out` custom properties — confirmed in
   `node_modules/tw-animate-css/dist/tw-animate.css`:
   `--animate-in: enter var(--tw-animation-duration,var(--tw-duration,.15s))
   var(--tw-ease,ease)...`):

```tsx
/* target — src/components/ui/sheet.tsx sheetVariants base class */
"fixed z-50 gap-4 bg-background p-6 shadow-lg ease-[var(--ease-drawer)] duration-300 data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out"
```

Note: only the bare `transition ease-in-out` prefix is removed; every other
class (`duration-300`, `data-[state=closed]:duration-200`,
`data-[state=open]:duration-300`, `data-[state=open]:animate-in`,
`data-[state=closed]:animate-out`) stays exactly as-is — those `duration-*`
utilities already correctly set `--tw-duration`, which `--animate-in`/
`--animate-out` consume.

## Repo conventions to follow

- New easing tokens are added to the `:root { … }` block in
  `src/styles.css`, alongside `--ease-out-soft` (styles.css:42) — this is
  the only existing custom easing token in the repo, so it's the exemplar
  for naming/placement.
- Tailwind arbitrary-value syntax for consuming a CSS variable in a utility
  class (`ease-[var(--ease-drawer)]`) matches how `origin-(--radix-*-
  content-transform-origin)` already consumes a CSS variable via Tailwind's
  arbitrary-property syntax elsewhere in this same file's sibling
  components (e.g. `src/components/ui/popover.tsx`,
  `src/components/ui/dropdown-menu.tsx`).

## Steps

1. Open `src/styles.css`. In the `:root` block (around line 42, right after
   `--ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);`), add:
   `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);`
2. Open `src/components/ui/sheet.tsx`. In `sheetVariants`'s base class
   string (line 34), remove the substring `transition ease-in-out ` (the
   two tokens `transition` and `ease-in-out`, plus the trailing space)
   and insert `ease-[var(--ease-drawer)] ` immediately before `duration-300`.
3. Confirm the resulting base class string is exactly:
   `"fixed z-50 gap-4 bg-background p-6 shadow-lg ease-[var(--ease-drawer)] duration-300 data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out"`

## Boundaries

- Do NOT touch the `side` variants (`top`/`bottom`/`left`/`right` slide
  classes) — only the base class string changes.
- Do NOT touch `SheetOverlay` (sheet.tsx, the `data-[state=open]:animate-in
  data-[state=closed]:animate-out data-[state=closed]:fade-out-0
  data-[state=open]:fade-in-0` overlay fade) — it has no `transition`
  conflict and is out of scope.
- Do NOT modify `dialog.tsx`, `alert-dialog.tsx`, `popover.tsx`,
  `dropdown-menu.tsx`, or `select.tsx` — their easing token application is
  tracked separately in plan 004.
- Do NOT add a new duration value — `duration-300`/`duration-200` are
  already within AUDIT.md's 200-500ms modal/drawer budget; leave them as-is.
- If `sheetVariants`'s base class string has drifted from the quoted current
  code since commit 70cb322, STOP and report instead of guessing which
  substring to remove.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` and `pnpm run build` must both
  succeed.
- **Feel check**:
  1. Open any `Sheet` in the app (check which view uses it —
     `grep -rn "from \"@/components/ui/sheet\"" src` to find a live trigger,
     likely a mobile nav or filter drawer) and open/close it several times.
  2. In DevTools Animations panel, set playback to 10% and confirm the
     drawer's entrance now uses the custom `--ease-drawer` curve — motion
     should feel like it decelerates smoothly into place with a slight
     "settle," not the generic linear-ish `ease-in-out` feel.
  3. Rapidly toggle the sheet open/close (click trigger, then immediately
     click again before the animation finishes) several times — confirm no
     visible jitter, flash, or transform snapping back to a wrong position
     (this is the specific bug the `transition`+`animate-in` conflict could
     cause).
  4. Confirm the sheet still slides in from the correct edge (`top`/
     `bottom`/`left`/`right` depending on usage) exactly as before — this
     plan must not change direction/positioning, only the easing mechanism.
- **Done when**: the sheet opens/closes using `--ease-drawer`, rapid
  toggling shows no jitter, and the build/typecheck pass cleanly.
