import { createFileRoute } from "@tanstack/react-router";
import { redirectIfAuthenticated } from "@/lib/auth/guards";
import { ForgotPassword } from "@/components/views/ForgotPassword";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: redirectIfAuthenticated,
  component: () => <ForgotPassword />,
});
