import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.json({ ok: true, user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ ok: false, user: null }, { status: 500 });
  }
}
