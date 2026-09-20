import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { NotificationProvider } from "@/lib/notifications/context";
import { VisibilityProvider } from "@/lib/visibility-context";
import { ThemeProvider } from "@/components/theme-provider";
import { LoadingBar } from "@/components/ui/loading-bar";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { getAccessToken, tryRestoreSession } from "@/lib/api/client";

import appCss from "../styles.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if ((error as { status?: number } | null)?.status === 429) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function ErrorComponent({ error }: { error: Error }) {
  if (import.meta.env.DEV) {
    console.error(error);
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">:(</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Algo salió mal</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un error inesperado. Intenta recargar la página.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Recargar
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    if (import.meta.env.SSR) return;
    if (!getAccessToken()) {
      await tryRestoreSession();
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sprig — Tu dinero bajo control" },
      {
        name: "description",
        content:
          "Controla tus gastos, alcanza tus metas de ahorro y toma mejores decisiones financieras con reportes e inteligencia fiscal en un solo lugar.",
      },
      { property: "og:title", content: "Sprig — Tu dinero bajo control" },
      { property: "og:description", content: "Finanzas personales inteligentes" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

export const AMBIENT_ROUTES = new Set([
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

export function ScopedAmbientBackground() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!AMBIENT_ROUTES.has(pathname)) return null;
  return <AmbientBackground />;
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
