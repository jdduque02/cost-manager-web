import { createFileRoute } from "@tanstack/react-router";
import { redirectIfAuthenticated } from "@/lib/auth/guards";
import { Login } from "@/components/views/Login";

export const Route = createFileRoute("/login")({
  beforeLoad: redirectIfAuthenticated,
  component: () => <Login />,
});
