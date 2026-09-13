import { act, render } from "@testing-library/react";
import { LoadingBar } from "./loading-bar";

const mockUseIsFetching = vi.fn();
const mockUseIsMutating = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useIsFetching: () => mockUseIsFetching(),
  useIsMutating: () => mockUseIsMutating(),
}));

describe("LoadingBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseIsFetching.mockReturnValue(0);
    mockUseIsMutating.mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when idle", () => {
    const { container } = render(<LoadingBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("appears when isLoading becomes true", () => {
    mockUseIsFetching.mockReturnValue(1);
    const { container } = render(<LoadingBar />);
    expect(container.firstChild).not.toBeNull();
  });

  it("unmounts after the fade-out timeout once loading finishes", () => {
    mockUseIsFetching.mockReturnValue(1);
    const { rerender, container } = render(<LoadingBar />);
    expect(container.firstChild).not.toBeNull();

    mockUseIsFetching.mockReturnValue(0);
    rerender(<LoadingBar />);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender(<LoadingBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it("still shows the bar for a short while after loading finishes (fade-out grace period)", () => {
    mockUseIsFetching.mockReturnValue(1);
    const { rerender, container } = render(<LoadingBar />);

    mockUseIsFetching.mockReturnValue(0);
    rerender(<LoadingBar />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender(<LoadingBar />);

    expect(container.firstChild).not.toBeNull();
  });
});
