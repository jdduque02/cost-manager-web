import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/views/Landing";

export const Route = createFileRoute("/")({
  component: () => <Landing />,
});
