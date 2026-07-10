import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const isAdmin = localStorage.getItem("qh_admin") === "1";
      if (!isAdmin) throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
