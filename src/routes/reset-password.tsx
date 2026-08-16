import { createFileRoute, redirect } from "@tanstack/react-router";
import { redirectIfAuthenticated } from "@/lib/auth/guards";
import { ResetPassword } from "@/components/views/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || "",
  }),
  beforeLoad: ({ search }) => {
    redirectIfAuthenticated();
    if (!search.email) {
      throw redirect({ to: "/forgot-password" });
    }
  },
  component: () => <ResetPassword />,
});
