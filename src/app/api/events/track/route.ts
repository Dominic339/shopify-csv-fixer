import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { event_name, session_key, plan, metadata } = body as {
      event_name?: string;
      session_key?: string;
      plan?: string;
      metadata?: Record<string, unknown>;
    };

    if (!event_name || typeof event_name !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Try to get user id if authenticated — not required
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // anonymous is fine
    }

    const admin = createSupabaseAdminClient();
    await admin.from("tool_events").insert({
      event_name,
      user_id: userId,
      session_key: session_key ?? null,
      plan: plan ?? "free",
      metadata: metadata ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never surface errors to the client — tracking must be silent
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
