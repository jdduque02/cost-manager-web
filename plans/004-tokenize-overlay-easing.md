# 004 — Add --ease-out token, apply to Dialog/AlertDialog/Popover/DropdownMenu/Select

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: MEDIUM
- **Category**: Easing & duration / Cohesion & tokens

## Estimated scope
6 files (src/styles.css, dialog.tsx, alert-dialog.tsx, popover.tsx, dropdown-menu.tsx, select.tsx)

## Problem

None of the entrance/exit animations on `Dialog`, `AlertDialog`, `Popover`,
`DropdownMenu`, or `Select` specify an easing utility. Reading
`node_modules/tw-animate-css/dist/tw-animate.css` confirms the fallback:

```css
/* tw-animate-css, confirmed default */
--animate-in: enter var(--tw-animation-duration,var(--tw-duration,.15s)) var(--tw-ease,ease) ...;
--animate-out: exit var(--tw-animation-duration,var(--tw-duration,.15s)) var(--tw-ease,ease) ...;
```

With no `--tw-ease` set, these fall back to the plain CSS `ease` keyword.
AUDIT.md §2 reserves `ease` for "hover / color change," not for entering or
exiting elements — those should use `ease-out` (repo target:
`cubic-bezier(0.23, 1, 0.32, 1)`, the "strong ease-out for UI"). Five
components across the repo silently share this same unmanaged default —
per AUDIT.md §7 this is a consolidation finding: "duplicated near-identical
easings... is a consolidation finding."

Current code (each missing any `ease-*` utility on its content class):

```tsx
// src/components/ui/dialog.tsx:41 — current (relevant excerpt)
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```

```tsx
// src/components/ui/alert-dialog.tsx:33 — current (relevant excerpt)
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```

```tsx
// src/components/ui/popover.tsx:22 — current
"z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)"
```

```tsx
// src/components/ui/dropdown-menu.tsx:49 (DropdownMenuContent) and :30-ish (SubContent) — current
"z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)"
```

```tsx
// src/components/ui/select.tsx:67 (SelectContent) — current
"relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)"
```

Also, none of `popover.tsx`, `dropdown-menu.tsx`, `select.tsx` set an
explicit `duration-*` — they rely on the `.15s` (150ms) library default.
150ms is within AUDIT.md's dropdown/select budget (150-250ms), so this is
NOT a finding on its own, but per AUDIT.md §7 ("curves and durations should
live as shared tokens... five hand-typed... is a consolidation finding")
this plan makes it explicit rather than implicit, matching the explicit
`duration-200` already used on `dialog.tsx`/`alert-dialog.tsx`.

## Target

1. Add `--ease-out` to `src/styles.css`'s `:root` token block:

```css
/* src/styles.css:42 — current */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
```

```css
/* target */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
```

(If plan 003 already ran and added `--ease-drawer` here too, add `--ease-out`
as a third line in the same block — do not remove `--ease-drawer`.)

2. Add `ease-[var(--ease-out)]` to each of the five content classes below,
   and add `duration-200` explicitly to the three that don't have it yet
   (`popover.tsx`, `dropdown-menu.tsx` both Content and SubContent,
   `select.tsx`) so all five share one explicit, intentional value within
   AUDIT.md's dropdown/select 150-250ms budget:

```tsx
/* target — dialog.tsx DialogContent class (duration-200 already present, just add ease) */
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 ease-[var(--ease-out)] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```

```tsx
/* target — alert-dialog.tsx AlertDialogContent class (duration-200 already present, just add ease) */
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```

```tsx
/* target — popover.tsx PopoverContent class (add duration-200 + ease) */
"z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none duration-200 ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)"
```

```tsx
/* target — dropdown-menu.tsx DropdownMenuContent class (add duration-200 + ease) */
"z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md duration-200 ease-[var(--ease-out)]",
"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)"
```

```tsx
/* target — dropdown-menu.tsx DropdownMenuSubContent class (add duration-200 + ease) */
"z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg duration-200 ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)"
```

```tsx
/* target — select.tsx SelectContent class (add duration-200 + ease) */
"relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md duration-200 ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)"
```

## Repo conventions to follow

- Easing tokens live in `src/styles.css`'s `:root` block, next to
  `--ease-out-soft` (line 42) — that's the naming/placement exemplar.
- `ease-[var(--token)]` is the Tailwind arbitrary-value pattern for
  consuming a CSS custom property in a utility class — matches the existing
  `origin-(--radix-*-content-transform-origin)` arbitrary-property pattern
  already used in these exact files.

## Steps

1. Open `src/styles.css`. In `:root` (around line 42), add
   `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` next to `--ease-out-soft`
   (if plan 003 already added `--ease-drawer` here, add this as a new line,
   don't remove anything).
2. Open `src/components/ui/dialog.tsx`. In `DialogContent`'s class string,
   insert `ease-[var(--ease-out)] ` immediately after `duration-200 `.
3. Open `src/components/ui/alert-dialog.tsx`. In `AlertDialogContent`'s
   class string, insert `ease-[var(--ease-out)] ` immediately after
   `duration-200 `.
4. Open `src/components/ui/popover.tsx`. In `PopoverContent`'s class
   string, insert `duration-200 ease-[var(--ease-out)] ` immediately after
   `outline-none `.
5. Open `src/components/ui/dropdown-menu.tsx`. In `DropdownMenuContent`'s
   class string, insert `duration-200 ease-[var(--ease-out)]` at the end of
   the first template string segment (before the comma that starts the
   `data-[state=open]:animate-in...` segment). In `DropdownMenuSubContent`'s
   class string, insert `duration-200 ease-[var(--ease-out)] ` immediately
   after `shadow-lg `.
6. Open `src/components/ui/select.tsx`. In `SelectContent`'s class string,
   insert `duration-200 ease-[var(--ease-out)] ` immediately after
   `shadow-md `.

## Boundaries

- Do NOT touch `sheet.tsx` — its easing is handled in plan 003 with the
  drawer-specific curve, not this generic `--ease-out`.
- Do NOT touch `combobox.tsx` or `command.tsx` unless they render their own
  independent `animate-in`/`animate-out` content class distinct from
  `popover.tsx`/`select.tsx` — check first; if they compose `PopoverContent`
  or `SelectContent` internally, no separate edit is needed there.
- Do NOT change `slide-in-from-*`/`zoom-in-*`/`fade-in-*` values, side
  variants, or `transform-origin` — only add `duration-200`
  (where missing) and `ease-[var(--ease-out)]`.
- Do NOT change `dialog.tsx`/`alert-dialog.tsx`'s existing `duration-200` —
  it's already correct, only the easing is being added.
- If any class string has drifted from what's quoted above since commit
  70cb322, STOP and report instead of guessing where to insert.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` and `pnpm run build` must both
  succeed.
- **Feel check**:
  1. Open a `Dialog` and an `AlertDialog` — in DevTools Animations panel at
     10% playback, confirm the entrance now decelerates with the stronger
     `--ease-out` curve rather than the generic built-in `ease`.
  2. Open a `Popover`, a `DropdownMenu`, and a `Select` — same check; also
     confirm each still scales from its trigger's `transform-origin` (this
     plan must not change origin behavior).
  3. Confirm total animation duration is still ~200ms for all five (measure
     in the Animations panel) — within AUDIT.md's dropdown/select 150-250ms
     and modal 200-500ms budgets.
- **Done when**: all five components use `--ease-out` with an explicit
  `duration-200`, origins are unchanged, and build/typecheck pass.
