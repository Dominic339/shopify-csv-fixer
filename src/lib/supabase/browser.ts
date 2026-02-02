import { createBrowserClient } from "@supabase/ssr";

// Export the name your UI code expects
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Keep this export too (so other files can use the more explicit name)
export function createSupabaseBrowserClient() {
  return createClient();
}
