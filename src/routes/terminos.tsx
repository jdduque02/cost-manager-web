import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/views/LegalPage";

export const Route = createFileRoute("/terminos")({
  component: () => <LegalPage slug="terminos" />,
});
