import { render, screen } from "@testing-library/react";
import { LegalPage } from "./LegalPage";
import { LEGAL_DOCS, LEGAL_VERSION, type LegalSlug } from "@/content/legal";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: Record<string, unknown>) => (
    <a href={to as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

describe("LegalPage", () => {
  it.each(Object.keys(LEGAL_DOCS) as LegalSlug[])("renders %s with heading and version", (slug) => {
    render(<LegalPage slug={slug} />);
    expect(screen.getByRole("heading", { level: 1, name: LEGAL_DOCS[slug].title })).toBeVisible();
    expect(screen.getByText(`Versión ${LEGAL_VERSION}`)).toBeVisible();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("links to the other two legal documents but not to itself", () => {
    render(<LegalPage slug="cookies" />);
    const nav = screen.getByRole("navigation", { name: "Documentos legales" });
    expect(nav).toHaveTextContent("Privacidad");
    expect(nav).toHaveTextContent("Términos");
    expect(nav).not.toHaveTextContent("Cookies");
  });

  it("declares every browser storage key the app actually uses", () => {
    render(<LegalPage slug="cookies" />);
    for (const key of [
      "cm_access_token",
      "cm_refresh_token",
      "cm:has-session",
      "cost-manager-theme",
      "cm:locale",
      "cm:hide-amounts",
      "cost-manager.fx-rates.v1",
    ]) {
      expect(screen.getByText(new RegExp(key.replace(/[.]/g, "\\.")))).toBeInTheDocument();
    }
  });

  it("marks the data controller fields as pending until they are completed", () => {
    render(<LegalPage slug="privacidad" />);
    expect(screen.getAllByText(/\[COMPLETAR/).length).toBeGreaterThan(0);
  });
});
