import { act, renderHook } from "@testing-library/react";
import { VisibilityProvider, useVisibility } from "./visibility-context";
import { useFormattedAmount } from "./hooks/use-formatted-amount";
import { HIDE_AMOUNTS_KEY, MASKED } from "./format";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <VisibilityProvider>{children}</VisibilityProvider>
);

describe("hide amounts", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows amounts by default", () => {
    const { result } = renderHook(() => useFormattedAmount(), { wrapper });
    expect(result.current(1500)).not.toBe(MASKED);
    expect(result.current(1500)).toContain("1.500");
  });

  it("masks every amount once hidden and restores them when shown", () => {
    const { result } = renderHook(() => ({ fmt: useFormattedAmount(), vis: useVisibility() }), {
      wrapper,
    });
    act(() => result.current.vis.setHidden(true));
    expect(result.current.fmt(1500)).toBe(MASKED);
    expect(result.current.fmt(1500, { prefix: "+" })).toBe(MASKED);
    act(() => result.current.vis.setHidden(false));
    expect(result.current.fmt(1500)).toContain("1.500");
  });

  it("remembers the preference between visits", () => {
    const first = renderHook(() => useVisibility(), { wrapper });
    act(() => first.result.current.setHidden(true));
    expect(window.localStorage.getItem(HIDE_AMOUNTS_KEY)).toBe("1");
    first.unmount();

    const second = renderHook(() => useVisibility(), { wrapper });
    expect(second.result.current.hidden).toBe(true);
  });
});
