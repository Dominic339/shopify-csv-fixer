import { createClient } from "@supabase/supabase-js";

// Browser/client-only Supabase client.
// Prefer using "@/lib/supabase/browser" in components.
// This file exists for backward compatibility with older imports.
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
