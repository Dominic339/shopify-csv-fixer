// The Supabase browser client, loaded on first use. The library is about 70 KB compressed and
// most pages only need it after they have rendered (to read the sign-in state), so it stays out
// of the initial JavaScript.
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseConfigured = Boolean(url && anonKey);

function makeStub(): SupabaseClient {
    // A typed no-op stub so the app renders without crashing when
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

let client: Promise<SupabaseClient> | null = null;

/** The shared browser client. Without Supabase settings it is a no-op stub. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigured) return Promise.resolve(makeStub());
  client ??= import("@supabase/ssr").then(({ createBrowserClient }) => createBrowserClient(url, anonKey));
  return client;
}
