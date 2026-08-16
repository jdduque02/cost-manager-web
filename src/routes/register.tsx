import { createFileRoute } from "@tanstack/react-router";
import { Register } from "@/components/views/Register";
import { redirectIfAuthenticated } from "@/lib/auth/guards";

export const Route = createFileRoute("/register")({
  beforeLoad: redirectIfAuthenticated,
  component: Register,
});
