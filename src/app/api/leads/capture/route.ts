import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    await supabase.from("lead_emails").upsert(
      { email: email.toLowerCase().trim(), source: source ?? "quota_wall", created_at: new Date().toISOString() },
      { onConflict: "email", ignoreDuplicates: true }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
