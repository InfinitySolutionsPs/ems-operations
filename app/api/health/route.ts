import { NextResponse } from "next/server";
import { env } from "@/lib/server-env";

export async function GET() {
  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 });
  }
}
