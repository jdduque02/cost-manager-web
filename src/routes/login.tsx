import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { Login } from "@/components/views/Login";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    // If the user is already authenticated, redirect them to the dashboard
    if (getAccessToken()) {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Login />,
});
