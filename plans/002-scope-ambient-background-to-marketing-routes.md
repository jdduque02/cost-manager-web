# 002 — Scope AmbientBackground to marketing/auth routes only

- **Status**: TODO
- **Commit**: 70cb322
- **Severity**: HIGH
- **Category**: Purpose & frequency / Cohesion

## Estimated scope
2 files (src/routes/__root.tsx, no changes needed to ambient-background.tsx itself)

## Problem

`<AmbientBackground />` (src/components/ui/ambient-background.tsx) renders a
continuous decorative motion system: a 140s linear grid pan, two 26s/32s
ease-in-out "breathing" glows, a 30s drift on an SVG line, and a dot tracing
a path every 30s. Per AUDIT.md §1, this is exactly "rare / first-time —
delight budget" tier motion, appropriate for a marketing hero.

It is currently mounted unconditionally for every route in the app:

```tsx
// src/routes/__root.tsx:93-101 — current
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <AmbientBackground />
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

This means the same continuous ambient motion plays behind `/dashboard`,
`/transactions`, `/reports`, `/wealth`, `/goals`, `/categories` — the data
views this product's own direction says should "feel calm and trustworthy,"
not gimmicky. It also runs behind `/admin`, `/logs`, `/emails`, `/settings`.
This is a cohesion violation (AUDIT.md §7: "one bouncy component in a crisp
app") at app-wide scale, and a wasted-motion-budget issue (§1).

## Target

Mount `AmbientBackground` conditionally, only on the marketing/auth routes:
`/` (Landing), `/login`, `/register`, `/forgot-password`, `/reset-password`.
Every other route (`/dashboard`, `/transactions`, `/goals`, `/wealth`,
`/categories`, `/reports`, `/intelligence`, `/admin`, `/logs`, `/emails`,
`/settings`) renders with no ambient background.

`RootShell` is the `shellComponent` — it renders the outer `<html>`/`<body>`
and is not reliably inside router match context the way `RootComponent`
(rendered via `component: RootComponent` and containing `<Outlet />`) is.
The repo already has a proven pattern for reading the current path with
router context: `src/components/layout/AppShell.tsx:208` uses
`useRouterState({ select: (s) => s.location.pathname })`. `AppShell` is
rendered deep inside `<Outlet />`, which is itself inside `RootComponent`,
confirming `RootComponent`'s subtree has router context. Move
`AmbientBackground` out of `RootShell` and into `RootComponent`, gated by
the same `useRouterState` pattern:

```tsx
// target — src/routes/__root.tsx

const AMBIENT_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingBar />
      <Toaster richColors closeButton position="top-right" />
      <ScopedAmbientBackground />
      <AuthProvider>
        <VisibilityProvider>
          <NotificationProvider>
            <NuqsAdapter>
              <Outlet />
            </NuqsAdapter>
          </NotificationProvider>
        </VisibilityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function ScopedAmbientBackground() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!AMBIENT_ROUTES.has(pathname)) return null;
  return <AmbientBackground />;
}
```

`AmbientBackground` itself (`ambient-background.tsx`) uses `position: fixed;
inset: 0;` (via its `.ambient` class in styles.css:233-240) so its position
in the React tree relative to `<Outlet />` does not affect its visual
placement — it stacks via `z-index: 0` regardless of where it's rendered in
`RootComponent`.

## Repo conventions to follow

- Router-aware conditional rendering: `src/components/layout/AppShell.tsx:208`
  — `const pathname = useRouterState({ select: (s) => s.location.pathname });`
  — import `useRouterState` from `@tanstack/react-router` the same way.
- Route path strings match the `createFileRoute("...")` values in
  `src/routes/index.tsx` (`"/"`), `login.tsx`, `register.tsx`,
  `forgot-password.tsx`, `reset-password.tsx` — read each of those five
  files to confirm the exact path string `createFileRoute` is called with
  before hardcoding `AMBIENT_ROUTES`, in case any differs from the filename
  (e.g. check for a hyphen vs no-hyphen mismatch).

## Steps

1. Open `src/routes/__root.tsx`. Add `useRouterState` to the existing
   `import { Outlet, Link, createRootRoute, HeadContent, Scripts } from
   "@tanstack/react-router";` line.
2. Read `src/routes/index.tsx`, `login.tsx`, `register.tsx`,
   `forgot-password.tsx`, `reset-password.tsx` and confirm their exact
   `createFileRoute("...")` path strings. Build the `AMBIENT_ROUTES` Set
   from the confirmed strings (expected: `"/"`, `"/login"`, `"/register"`,
   `"/forgot-password"`, `"/reset-password"` — but verify, don't assume).
3. Remove `<AmbientBackground />` from `RootShell` (styles.css:96 in the
   current file, inside `<ThemeProvider>`), leaving `<ThemeProvider>
   {children}</ThemeProvider>` with nothing else added.
4. Add the `AMBIENT_ROUTES` Set constant and the `ScopedAmbientBackground`
   function (as shown in Target) somewhere in `__root.tsx`, e.g. directly
   above `RootShell`.
5. Render `<ScopedAmbientBackground />` inside `RootComponent`, before
   `<AuthProvider>` (as shown in Target) — position among the other
   `RootComponent` children doesn't matter functionally since
   `AmbientBackground` is `position: fixed`, but keep it near the top for
   readability, matching where `LoadingBar` and `Toaster` already sit.
6. Confirm the `AmbientBackground` import path
   (`import { AmbientBackground } from "@/components/ui/ambient-background";`)
   stays valid — it should, since the component itself isn't moving.

## Boundaries

- Do NOT change `src/components/ui/ambient-background.tsx` itself — this
  plan only changes where/when it mounts, not its internals (SMIL reduced-
  motion fix is tracked separately in plan 008).
- Do NOT add ambient background to any authenticated app route
  (`/dashboard`, `/transactions`, `/goals`, `/wealth`, `/categories`,
  `/reports`, `/intelligence`, `/admin`, `/logs`, `/emails`, `/settings`).
- Do NOT change `ThemeProvider`, `QueryClientProvider`, `AuthProvider`, or
  any other provider's nesting order beyond removing/adding
  `AmbientBackground`/`ScopedAmbientBackground`.
- If any of the five target routes' `createFileRoute` path string doesn't
  match what's assumed above, use the actual string you find — do not guess.
- If `RootComponent` does not have `<Outlet />` reachable via router context
  by the time you check (structure drifted since commit 70cb322), STOP and
  report instead of improvising.

## Verification

- **Mechanical**: `pnpm exec tsc --noEmit` must pass with no new errors.
  `pnpm run build` must succeed.
- **Feel check**:
  1. Run `pnpm dev`, navigate to `/` (Landing) — confirm the ambient grid
     pan, glows, and line-draw are visible and animating.
  2. Navigate to `/login` and `/register` — confirm ambient background is
     present.
  3. Log in and navigate to `/dashboard` — confirm NO ambient background is
     rendered (inspect DOM: no element with class `ambient` should exist).
  4. Navigate to `/transactions`, `/goals`, `/wealth`, `/settings` — confirm
     the same absence.
  5. Navigate back to `/` — confirm the ambient background reappears
     (mount/unmount on route change works correctly, no stale DOM node).
- **Done when**: ambient background renders only on the five marketing/auth
  routes and is completely absent (no DOM node) on every authenticated app
  route, with no TypeScript or build errors.
