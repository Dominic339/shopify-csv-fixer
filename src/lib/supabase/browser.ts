import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseConfigured = Boolean(url && anonKey);

// Export the name your UI code expects
export function createClient(): SupabaseClient {
  if (!supabaseConfigured) {
    // Return a typed no-op stub so the app renders without crashing when
    // NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are absent
    // (e.g. CI E2E runs, local dev without .env.local).
    const stub = {
      auth: {
        getSession: (): Promise<{ data: { session: null }; error: null }> =>
          Promise.resolve({ data: { session: null }, error: null }),
        getUser: (): Promise<{ data: { user: null }; error: null }> =>
          Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: (_event: unknown, _cb?: unknown) => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: (): Promise<{ error: null }> => Promise.resolve({ error: null }),
      },
      from: (_table: string) => ({
        select: (_cols?: string) => ({
          eq: (_col: string, _val: unknown) => ({
            maybeSingle: (): Promise<{ data: null; error: null }> =>
              Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    };
    return stub as unknown as SupabaseClient;
  }
  return createBrowserClient(url, anonKey);
}

// Keep this export too (so other files can use the more explicit name)
export function createSupabaseBrowserClient() {
  return createClient();
}
