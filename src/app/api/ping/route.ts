// src/app/api/ping/route.ts
// Minimal health-check endpoint used by E2E tests to verify rate-limit proxy
// does not block normal traffic.
import { NextResponse } from "next/server";


export async function GET() {
  return NextResponse.json({ ok: true });
}
