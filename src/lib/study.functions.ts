import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type StudyResource = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  url: string | null;
  content: string | null;
  sort_order: number;
};

export const listStudyResources = createServerFn({ method: "GET" }).handler(
  async () => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await sb
      .from("study_resources")
      .select("id, category, title, description, url, content, sort_order")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as StudyResource[];
  },
);
