# 006 — Add width transition to Goals progress bar

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: MEDIUM
- **Category**: Missed opportunity / Cohesion

## Estimated scope
1 file (src/components/views/Goals.tsx)

## Problem

The goal-card progress bar fill has no transition at all — its `width`
snaps instantly whenever `pct` changes (e.g. after a deposit toward the
goal, or on initial load if data arrives after first paint):

```tsx
// src/components/views/Goals.tsx:98 — current
<div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-2">
  <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
</div>
```

This is inconsistent with the three sibling progress-bar fills elsewhere in
the same app, which all animate their width:

- `src/components/ui/loading-bar.tsx:48` —
  `"h-full bg-primary transition-all duration-300 ease-out"`
- `src/components/views/Intelligence.tsx:51` —
  `"h-full rounded-full transition-all duration-300 ease-out"`
- `src/components/views/Reports.tsx:505` —
  `"h-full rounded-full bg-destructive/70 transition-all duration-300 ease-out"`

Per AUDIT.md §8 ("state changes that teleport... where a brief transition
would prevent a jarring change") and §7 (cohesion — matching the pattern
already established by three other progress bars in the same codebase),
this is a straightforward fix: bring `Goals.tsx` in line with its siblings.

Note: match the sibling pattern's `transition-all` rather than the more
precise `transition-[width]` — this plan intentionally does not "fix" the
`transition-all`-on-a-width-fill pattern (that's a separate, lower-severity,
repo-wide finding not in scope here); the goal is consistency with the
existing three, not introducing a fourth, different pattern.

## Target

```tsx
/* target — src/components/views/Goals.tsx:98 */
<div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-2">
  <div
    className="h-full bg-gradient-primary transition-all duration-300 ease-out"
    style={{ width: `${pct}%` }}
  />
</div>
```

## Repo conventions to follow

- Exemplar: `src/components/ui/loading-bar.tsx:48` — identical
  `transition-all duration-300 ease-out` pattern applied to a `width`-driven
  fill bar. Copy this exactly for consistency across the app's progress
  bars.

## Steps

1. Open `src/components/views/Goals.tsx`. Locate the progress-bar fill div
   at line 98: `<div className="h-full bg-gradient-primary" style={{
   width: \`${pct}%\` }} />`.
2. Add `transition-all duration-300 ease-out` to its `className`, resulting
   in `className="h-full bg-gradient-primary transition-all duration-300
   ease-out"`. Keep the `style={{ width: \`${pct}%\` }}` prop unchanged.

## Boundaries

- Do NOT touch the parent track div (`className="mt-5 h-2.5 overflow-hidden
  rounded-full bg-surface-2"`) — only the inner fill div changes.
- Do NOT touch `loading-bar.tsx`, `Intelligence.tsx`, or `Reports.tsx` —
  they're already correct and are the exemplar, not the target.
- Do NOT change how `pct` is computed or clamped.
- If line 98's code has drifted from the quoted current code since commit
  70cb322, STOP and report instead of guessing which div to edit.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` and `pnpm run build` must both
  succeed.
- **Feel check**:
  1. Open `/goals`, find a goal with a target amount (so the progress bar
     renders — `hasTarget` must be true).
  2. Trigger a change to `saved`/`pct` for that goal (e.g. add a deposit,
     or edit the goal's saved amount) and confirm the bar fill animates
     smoothly to its new width over ~300ms rather than jumping instantly.
  3. Confirm initial page load still renders the bar at the correct width
     (no visible "grow from 0" flash on first paint — if one appears,
     check whether `pct` is available on first render vs. arriving async;
     report if this needs the initial value to be excluded from
     transitioning, but do not add extra logic unless you actually observe
     this problem).
- **Done when**: the goal progress bar animates width changes at 300ms
  ease-out, matching the feel of the Intelligence/Reports/loading-bar
  progress fills.
