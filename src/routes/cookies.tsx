import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/views/LegalPage";

export const Route = createFileRoute("/cookies")({
  component: () => <LegalPage slug="cookies" />,
});
