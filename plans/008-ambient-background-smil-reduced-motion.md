# 008 — Gate the ambient background's SMIL animateMotion behind prefers-reduced-motion

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: MEDIUM
- **Category**: Accessibility

## Estimated scope
1 file (src/components/ui/ambient-background.tsx)

## Problem

`src/components/ui/ambient-background.tsx` renders an SVG dot that traces a
path using SMIL's `<animateMotion>`:

```tsx
// src/components/ui/ambient-background.tsx — current
<circle className="ambient__dot" r="3.5" cx="0" cy="0">
  <animateMotion dur="30s" begin="3s" repeatCount="indefinite">
    <mpath href="#ambient-path" />
  </animateMotion>
</circle>
```

`src/styles.css`'s existing reduced-motion block only addresses this
partially:

```css
/* src/styles.css:346-354 — current */
@media (prefers-reduced-motion: reduce) {
  .ambient,
  .ambient * {
    animation: none !important;
  }
  .ambient__dot {
    display: none;
  }
  ...
}
```

`.ambient__dot { display: none; }` does hide the dot visually under reduced
motion, which happens to mask the problem for this specific element today —
but `animation: none !important` has zero effect on SMIL's `<animateMotion>`
(SMIL animation is a completely separate mechanism from CSS `animation`, not
addressable via CSS at all). The motion itself keeps running in the DOM
even though the element is invisible; if the `display: none` override is
ever removed, relaxed, or the dot is reused/restyled in the future, the
looping motion would immediately become visible again with zero reduced-
motion protection. This is a latent accessibility gap (AUDIT.md §6) — the
CSS-only reduced-motion strategy silently fails to actually stop this
specific animation; it only happens to hide its visible effect today via an
unrelated rule.

Fix it at the source: don't render the `<animateMotion>` element at all when
the user has reduced motion enabled, rather than relying on a `display:
none` elsewhere to hide its effect.

## Target

Make `AmbientBackground` a client component that checks
`prefers-reduced-motion` via `matchMedia` (the same check already used
correctly in `src/hooks/use-count-up.ts:10`) and conditionally omits the
`<animateMotion>` element entirely:

```tsx
/* target — src/components/ui/ambient-background.tsx */
import { useEffect, useState } from "react";

export function AmbientBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return (
    <div aria-hidden className="ambient">
      <div className="ambient__grid" />
      <div className="ambient__glow ambient__glow--a" />
      <div className="ambient__glow ambient__glow--b" />
      <svg className="ambient__line" viewBox="0 0 1440 720" preserveAspectRatio="none">
        <path
          id="ambient-path"
          pathLength={1}
          fill="none"
          d="M -80 580 C 160 500 240 660 430 540 C 600 430 700 300 880 360 C 1060 420 1200 560 1520 280"
        />
        <use href="#ambient-path" className="ambient__stroke ambient__stroke--a" />
        <use href="#ambient-path" className="ambient__stroke ambient__stroke--b" />
        {!reducedMotion && (
          <circle className="ambient__dot" r="3.5" cx="0" cy="0">
            <animateMotion dur="30s" begin="3s" repeatCount="indefinite">
              <mpath href="#ambient-path" />
            </animateMotion>
          </circle>
        )}
      </svg>
    </div>
  );
}
```

The dot circle itself (not just the `animateMotion` child) is omitted under
reduced motion, matching what `.ambient__dot { display: none; }` already
achieves visually — this plan makes that behavior authoritative in JS
instead of relying on a CSS rule to paper over a SMIL animation CSS can't
actually stop. The existing `.ambient__dot { display: none; }` CSS rule can
stay as a defense-in-depth belt-and-suspenders measure — removing it is not
required by this plan (see Boundaries).

## Repo conventions to follow

- `window.matchMedia("(prefers-reduced-motion: reduce)")` is already used
  correctly, including a live-change listener pattern, in
  `src/hooks/use-count-up.ts:10` — model the check the same way (though
  `use-count-up.ts` only reads `.matches` once inside an effect without a
  `change` listener since it's a one-shot animation; this component is
  long-lived for the page's lifetime, so add the `change` listener so a
  user toggling the OS setting while the app is open is respected without
  a reload — this is a reasonable scope expansion directly serving the
  fix, not scope creep).
- This file currently has no `"use client"` directive or hooks; check
  whether sibling client components in `src/components/ui/` that use
  `useEffect`/`useState` include a `"use client"` directive at the top
  (e.g. `src/components/ui/dialog.tsx:1` has `"use client";`) — add one to
  `ambient-background.tsx` if that's the established convention for
  components using React hooks in this codebase, matching `dialog.tsx`'s
  placement (first line of the file).

## Steps

1. Open `src/components/ui/ambient-background.tsx`. Check whether it
   currently has a `"use client"` directive; if sibling hook-using
   components in `src/components/ui/` have one and this file doesn't, add
   `"use client";` as the first line.
2. Add `import { useEffect, useState } from "react";` to the top of the
   file.
3. Inside `AmbientBackground`, add the `reducedMotion` state and the
   `useEffect` that reads and subscribes to
   `matchMedia("(prefers-reduced-motion: reduce)")`, exactly as shown in
   Target.
4. Wrap the `<circle className="ambient__dot" ...>...</circle>` element in
   `{!reducedMotion && ( ... )}`.

## Boundaries

- Do NOT remove the existing `.ambient__dot { display: none; }` rule in
  `src/styles.css` — leave it as defense-in-depth; this plan's job is to
  stop the SMIL animation from running at all, not to clean up CSS.
- Do NOT change any other part of `ambient-background.tsx` (`.ambient__grid`,
  `.ambient__glow`, `.ambient__line`, `.ambient__stroke` elements) — those
  are CSS `animation`-driven and already correctly stopped by the existing
  `animation: none !important` rule; only the SMIL dot is in scope.
- Do NOT change `src/styles.css` in this plan.
- If this component is Server-Component-only in this router setup and
  cannot use `useEffect`/`useState` without breaking SSR (verify by
  checking how other stateful `src/components/ui/*.tsx` files are
  structured — e.g. `dialog.tsx`), and a `"use client"` directive does not
  resolve it, STOP and report instead of restructuring the component tree.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` and `pnpm run build` must both
  succeed.
- **Feel check**:
  1. Run `pnpm dev`, navigate to a route where `AmbientBackground` renders
     (per plan 002, that's `/`, `/login`, `/register`, `/forgot-password`,
     `/reset-password` — if plan 002 hasn't run yet, it's still global, any
     route works).
  2. With no reduced-motion emulation, inspect the DOM (Elements panel) —
     confirm the `<circle class="ambient__dot">` with its
     `<animateMotion>` child IS present.
  3. In DevTools Rendering panel, emulate `prefers-reduced-motion: reduce`,
     reload the page — confirm the `<circle class="ambient__dot">` element
     is now entirely absent from the DOM (not just hidden via CSS — check
     via Elements panel that the node doesn't exist).
  4. With the page already loaded under normal motion, toggle the emulated
     `prefers-reduced-motion` setting in DevTools without reloading —
     confirm the dot element is removed live (tests the `change` listener).
- **Done when**: the animated dot circle is absent from the DOM entirely
  under `prefers-reduced-motion: reduce` (not just visually hidden), and
  present and animating under normal motion settings.
