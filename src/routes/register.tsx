import { createFileRoute, redirect } from "@tanstack/react-router";
import { Register } from "@/components/views/Register";
import { getAccessToken } from "@/lib/api/client";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (getAccessToken()) {
      throw redirect({ to: "/" });
    }
  },
  component: Register,
});
