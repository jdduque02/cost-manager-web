import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { ForgotPassword } from "@/components/views/ForgotPassword";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: () => {
    if (getAccessToken()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <ForgotPassword />,
});
