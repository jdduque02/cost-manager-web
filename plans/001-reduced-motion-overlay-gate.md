# 001 — Add global prefers-reduced-motion gate for Radix overlay entrances

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file (src/styles.css), ~15 lines added

## Problem

Every Radix-based overlay in this repo (`Dialog`, `AlertDialog`, `Sheet`, `Popover`,
`DropdownMenu`, `Select`, `Combobox`, `Command`) uses the `tw-animate-css`
`data-[state=open]:animate-in` / `data-[state=closed]:animate-out` utility
classes, combined with `fade-in-0`, `zoom-in-95`, `slide-in-from-*` modifiers.

These utilities compile (confirmed by reading
`node_modules/tw-animate-css/dist/tw-animate.css`) to CSS `animation` rules
driven by custom properties `--tw-enter-translate-x/y`, `--tw-enter-scale`,
`--tw-enter-opacity`, `--tw-enter-blur` etc. — e.g.:

```css
/* tw-animate-css, current behavior */
@keyframes enter {
  from {
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0)
      scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1))
      rotate(var(--tw-enter-rotate, 0));
    filter: blur(var(--tw-enter-blur, 0));
  }
}
```

`src/styles.css` has exactly one `@media (prefers-reduced-motion: reduce)`
block (lines 346-359), and it only targets the hand-written `.ambient*`
decorative background classes — it does nothing for the `enter`/`exit`
keyframes above. So every dialog zoom, every dropdown slide, every sheet
drawer slide currently runs unconditionally for users who have opted into
reduced motion at the OS level. This is the exact case AUDIT.md §6 calls out:
"movement with no `prefers-reduced-motion` handling."

Current file, end of the `@layer components` block:

```css
/* src/styles.css:346-359 — current */
  @media (prefers-reduced-motion: reduce) {
    .ambient,
    .ambient * {
      animation: none !important;
    }
    .ambient__dot {
      display: none;
    }
    .ambient__stroke {
      stroke-dashoffset: 0;
    }
    html {
      scroll-behavior: auto;
    }
  }
}
```

## Target

Add a second, global reduced-motion rule that neutralizes the `--tw-enter-*`
/ `--tw-exit-*` transform/scale/rotate custom properties app-wide, while
preserving the opacity fade (so state changes are still legible — per
AUDIT.md §6: "Reduced motion means fewer and gentler animations, not zero —
keep transitions that aid comprehension, remove movement and position
changes"). This must sit in `src/styles.css`, outside the `.ambient`-specific
block (add it as its own rule, not merged into the existing one — the
existing one is scoped to `.ambient` on purpose and should stay that way):

```css
/* target — new rule, added directly after the existing @media (prefers-reduced-motion: reduce) block that closes the @layer components at styles.css:359 */
@media (prefers-reduced-motion: reduce) {
  [data-state] {
    --tw-enter-translate-x: 0 !important;
    --tw-enter-translate-y: 0 !important;
    --tw-enter-scale: 1 !important;
    --tw-enter-rotate: 0 !important;
    --tw-exit-translate-x: 0 !important;
    --tw-exit-translate-y: 0 !important;
    --tw-exit-scale: 1 !important;
    --tw-exit-rotate: 0 !important;
  }
}
```

This targets any element carrying Radix's `data-state` attribute (every
`Dialog`/`AlertDialog`/`Sheet`/`Popover`/`DropdownMenu`/`Select` content and
overlay in this repo sets `data-state="open"` or `"closed"` — confirmed by
reading `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `popover.tsx`,
`dropdown-menu.tsx`, `select.tsx`). Overriding the custom properties (rather
than disabling `animation` entirely) keeps the opacity fade — `fade-in-0`/
`fade-out-0` still drive `--tw-enter-opacity`/`--tw-exit-opacity`, which this
rule does not touch — so the element still visibly appears/disappears, it
just no longer slides, zooms, or rotates.

## Repo conventions to follow

- All custom motion CSS lives in `src/styles.css`, inside `@layer components`
  where the existing `.ambient` rules and their reduced-motion override
  already live (styles.css:232-360). Add the new rule as a sibling inside
  the same `@layer components` block, immediately after the existing
  `@media (prefers-reduced-motion: reduce)` block, before the closing `}`
  of `@layer components`.
- Exemplar for the "override custom properties instead of nuking `animation`"
  pattern: there isn't one yet in this repo for Radix content — this plan
  establishes it. But the *intent* — keep opacity, drop movement — already
  exists as a written pattern in the `.ambient` block's comment-free style;
  match that terse, no-comment style (this repo's CLAUDE.md says default to
  no comments unless a non-obvious WHY needs explaining — one short comment
  explaining why custom properties are overridden instead of `animation:
  none` is warranted here since it's non-obvious).

## Steps

1. Open `src/styles.css`. Locate the existing `@media (prefers-reduced-motion:
   reduce)` block that starts around line 346 and ends with the `}` that
   also closes `@layer components` (around line 359-360).
2. Immediately after that block's closing `}` (but still inside
   `@layer components`, i.e. before `@layer components`'s own closing `}`),
   insert the new `@media (prefers-reduced-motion: reduce)` rule shown in
   the Target section above, targeting `[data-state]`.
3. Add one short line comment directly above the new rule:
   `/* neutralize Radix enter/exit transform+scale, keep opacity fade */`

## Boundaries

- Do NOT touch `.ambient*` rules or their existing reduced-motion block —
  that's a separate, already-correct concern (tracked in plan 008 for the
  SMIL-specific gap).
- Do NOT modify any component file (`dialog.tsx`, `sheet.tsx`, etc.) — this
  is a pure CSS-only fix.
- Do NOT add a JS-based `useReducedMotion()` hook or React changes.
- Do NOT change the existing `fade-in-0`/`fade-out-0` opacity behavior.
- If `src/styles.css` no longer has a single `@layer components` block
  containing `.ambient` by the time you read it (structure drifted since
  commit 70cb322), STOP and report instead of improvising a different
  location.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` (no TS touched, should be a no-op
  pass) and `pnpm run build` — confirm the build succeeds with no CSS syntax
  errors.
- **Feel check**:
  1. In Chrome DevTools, open the Rendering panel (Cmd/Ctrl+Shift+P →
     "Show Rendering"), set "Emulate CSS media feature
     prefers-reduced-motion" to `reduce`.
  2. Open any `Dialog` (e.g. a transaction row → edit) — confirm it still
     fades in/out (opacity visibly changes) but does NOT zoom or slide from
     off-center.
  3. Open a `DropdownMenu` or `Select` — confirm it still fades but does not
     slide in from its trigger side.
  4. Open the `Sheet` (mobile nav or a drawer) — confirm it fades but does
     not slide in from the edge.
  5. Turn the emulation back to "No emulation" and re-check the same three
     — confirm the full slide/zoom motion is back (the rule only applies
     under reduced motion).
  6. In the Animations panel, step frame-by-frame under reduced motion to
     confirm no `translate3d`/`scale3d` movement occurs, only opacity.
- **Done when**: all three interaction checks above pass under emulated
  `prefers-reduced-motion: reduce`, and the same three pass with full motion
  under normal settings.
