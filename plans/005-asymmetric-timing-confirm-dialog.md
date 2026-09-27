# 005 — Asymmetric entrance/exit timing on destructive confirm dialog

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: MEDIUM
- **Category**: Interruptibility

## Estimated scope
1 file (src/components/ui/alert-dialog.tsx)

## Problem

`AlertDialog` is used in this repo exclusively through
`src/components/ui/confirm-dialog.tsx` (confirmed:
`grep -rln "from \"@/components/ui/alert-dialog\"" src` returns only that
one file), which is Sprig's destructive-action confirmation (delete a
transaction, delete a goal, etc. — `confirmLabel` defaults to "Eliminar").

Its content animation is fully symmetric — both open and close take exactly
200ms:

```tsx
// src/components/ui/alert-dialog.tsx:33 — current
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```

AUDIT.md §4 says: "Asymmetric timing: deliberate phases (press, hold,
destructive confirm) animate slower; the system's response snaps.
Symmetric timing on press-and-release is a finding." This dialog interrupts
the user specifically to make them pause before a destructive action —
giving its entrance a beat longer than its dismissal reinforces "stop and
consider," while a snappier close keeps cancel/confirm feeling responsive.

## Target

Split the single `duration-200` into an explicit slower open / snappier
close, both still within AUDIT.md's modal budget (200-500ms open is fine;
150ms close undercuts the 200ms modal floor slightly but confirm-dialog
close is closer in spirit to a "system response snap" than a full modal
dismiss — cap it at the dropdown/tooltip floor of 150ms rather than going
lower):

```tsx
/* target — src/components/ui/alert-dialog.tsx AlertDialogContent class */
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg data-[state=open]:duration-300 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```

The bare `duration-200` is replaced by two state-scoped duration
utilities: `data-[state=open]:duration-300` (entrance, slower — inside
AUDIT.md's 200-500ms modal range) and `data-[state=closed]:duration-150`
(exit, snappier).

If plan 004 (tokenize overlay easing) has already run on this file and
added `ease-[var(--ease-out)]` to this same class string, keep that
addition — this plan only changes the duration utilities, not the easing.

## Repo conventions to follow

- State-scoped Tailwind utilities (`data-[state=open]:...`,
  `data-[state=closed]:...`) are already the established pattern in this
  exact file and in `sheet.tsx` (e.g. `sheet.tsx`'s
  `data-[state=closed]:duration-200 data-[state=open]:duration-300`) — this
  plan follows that same `side`/`state`-scoped duration convention rather
  than inventing a new mechanism.

## Steps

1. Open `src/components/ui/alert-dialog.tsx`. Locate `AlertDialogContent`'s
   class string (around line 33).
2. Replace the bare `duration-200` token with
   `data-[state=open]:duration-300 data-[state=closed]:duration-150`
   (two tokens replacing one), keeping every other class unchanged.

## Boundaries

- Do NOT touch `AlertDialogOverlay`'s class (the backdrop fade) — leave its
  timing as-is; only the content's open/close asymmetry changes.
- Do NOT touch `dialog.tsx` (the non-destructive `Dialog` primitive) — this
  plan is scoped to `AlertDialog` only, since that's the destructive-
  confirmation-specific component per AUDIT.md §4's guidance.
- Do NOT change `confirm-dialog.tsx` — no changes needed there, the timing
  change is fully contained in `alert-dialog.tsx`.
- If `AlertDialogContent`'s class string has drifted from the quoted
  current code since commit 70cb322, STOP and report instead of guessing.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` and `pnpm run build` must both
  succeed.
- **Feel check**:
  1. Trigger a delete confirmation somewhere in the app (e.g. delete a
     transaction or a goal) to open `ConfirmDialog`.
  2. In DevTools Animations panel, measure the open animation — confirm it
     takes ~300ms.
  3. Click "Cancelar" — confirm the close animation takes ~150ms and feels
     noticeably snappier than the open.
  4. Confirm the dialog still visually reads as "the same modal," just with
     a deliberate-entrance/snappy-exit feel — not jarring or broken.
- **Done when**: open takes 300ms, close takes 150ms, and both still fade +
  zoom + slide correctly with no regression to positioning.
