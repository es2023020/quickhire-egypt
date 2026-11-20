import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem("qh_admin");
        localStorage.removeItem("qh_admin_email");
        // Cloaking: Never redirect to /auth (which leaks the admin portal location).
        // Render standard 404 as if the admin route does not exist.
        throw notFound();
      }
    }
  },
  component: () => <Outlet />,
});
