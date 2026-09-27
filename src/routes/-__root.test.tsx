import { render, screen } from "@testing-library/react";
import { AMBIENT_ROUTES, ScopedAmbientBackground } from "./__root";

const mockUseRouterState = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouterState: (opts: { select: (s: { location: { pathname: string } }) => unknown }) =>
    mockUseRouterState(opts),
  createRootRoute: () => ({}),
  Outlet: () => null,
  Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  HeadContent: () => null,
  Scripts: () => null,
}));

vi.mock("@/components/ui/ambient-background", () => ({
  AmbientBackground: () => <div data-testid="ambient-background" />,
}));

function setPathname(pathname: string) {
  mockUseRouterState.mockImplementation(
    (opts: { select: (s: { location: { pathname: string } }) => unknown }) =>
      opts.select({ location: { pathname } }),
  );
}

describe("ScopedAmbientBackground", () => {
  it.each([...AMBIENT_ROUTES])("renders AmbientBackground on marketing route %s", (route) => {
    setPathname(route);
    render(<ScopedAmbientBackground />);
    expect(screen.getByTestId("ambient-background")).toBeInTheDocument();
  });

  it.each(["/dashboard", "/transactions", "/goals", "/wealth", "/settings"])(
    "renders nothing on authenticated app route %s",
    (route) => {
      setPathname(route);
      const { container } = render(<ScopedAmbientBackground />);
      expect(screen.queryByTestId("ambient-background")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
    },
  );
});
