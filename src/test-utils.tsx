import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
  useSearch: () => ({ email: "test@example.com" }),
  useMatch: () => ({}),
  Link: ({ children, to, ...props }: Record<string, unknown>) => (
    <a href={to as string} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="outlet" />,
  createFileRoute: () => ({}),
  redirect: (opts: { to: string }) => {
    throw Object.assign(new Error(`Redirect to ${opts.to}`), { redirect: opts });
  },
}));

vi.mock("@/components/brand/sprig-isotipo", () => ({
  SprigIsotipo: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="sprig-isotipo" />
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "1"),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderWithProviders(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: TestProviders, ...options });
}

// eslint-disable-next-line react-refresh/only-export-components
export { renderWithProviders as render, TestProviders };
