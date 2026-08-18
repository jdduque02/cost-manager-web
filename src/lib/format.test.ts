import { fmtCurrency, parseCurrency, MASKED } from "./format";

describe("fmtCurrency", () => {
  it("formats COP currency", () => {
    const result = fmtCurrency(150000);
    expect(result).toContain("150.000");
  });

  it("formats zero", () => {
    const result = fmtCurrency(0);
    expect(result).toContain("0");
  });

  it("formats negative numbers", () => {
    const result = fmtCurrency(-50000);
    expect(result).toContain("50.000");
  });

  it("formats large numbers", () => {
    const result = fmtCurrency(1000000);
    expect(result).toContain("1.000.000");
  });

  it("uses COP by default", () => {
    const result = fmtCurrency(1000);
    expect(result).toMatch(/\$|COP/);
  });
});

describe("parseCurrency", () => {
  it("parses plain number string", () => {
    expect(parseCurrency("50000")).toBe(50000);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseCurrency("abc")).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseCurrency("")).toBe(0);
  });

  it("handles negative values", () => {
    expect(parseCurrency("-10000")).toBe(-10000);
  });

  it("strips currency symbol", () => {
    expect(parseCurrency("$50000")).toBe(50000);
  });

  it("returns 0 for NaN results", () => {
    expect(parseCurrency("COP 1.234.567")).toBe(0);
  });
});

describe("MASKED", () => {
  it("is a non-empty string", () => {
    expect(typeof MASKED).toBe("string");
    expect(MASKED.length).toBeGreaterThan(0);
  });

  it("contains bullet characters", () => {
    expect(MASKED).toMatch(/•/);
  });
});
