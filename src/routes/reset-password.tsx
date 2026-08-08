import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccessToken } from "@/lib/api/client";
import { ResetPassword } from "@/components/views/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || "",
  }),
  beforeLoad: ({ search }) => {
    if (getAccessToken()) {
      throw redirect({ to: "/" });
    }
    if (!search.email) {
      throw redirect({ to: "/forgot-password" });
    }
  },
  component: () => <ResetPassword />,
});
