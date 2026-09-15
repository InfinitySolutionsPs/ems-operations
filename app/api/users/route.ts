import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";

function identity(request: NextRequest) {
  const rawName =
    request.headers.get("oai-authenticated-user-full-name") || "مدير النظام";
  let name = rawName;
  try {
    name = decodeURIComponent(rawName);
  } catch {}
  return {
    id: request.headers.get("oai-authenticated-user-id") || "local-admin",
    email: (
      request.headers.get("oai-authenticated-user-email") || "admin@prcs.local"
    ).toLowerCase(),
    name,
  };
}
async function ensureAdmin(request: NextRequest) {
  const user = identity(request);
  const count = await env.DB.prepare(
    "SELECT COUNT(*) count FROM user_profiles",
  ).first<{ count: number }>();
  const isOwner =
    user.id === "490cc2e4-a020-4cd3-85c7-a76fc3b767bd" ||
    ["walaa.wahba1990@gmail.com", "wwahba@palestinercs.org"].includes(
      user.email,
    );
  if (!count?.count || isOwner) {
    const existing = await env.DB.prepare(
      "SELECT id FROM user_profiles WHERE external_user_id=? OR lower(email)=? LIMIT 1",
    )
      .bind(user.id, user.email)
      .first<{ id: number }>();
    if (existing)
      await env.DB.prepare(
        "UPDATE user_profiles SET external_user_id=?, email=?, full_name=?, role='admin', active=1 WHERE id=?",
      )
        .bind(user.id, user.email, user.name, existing.id)
        .run();
    else
      await env.DB.prepare(
        "INSERT INTO user_profiles (external_user_id,email,full_name,role,active) VALUES (?,?,?,'admin',1)",
      )
        .bind(user.id, user.email, user.name)
        .run();
    if (isOwner)
      await env.DB.prepare(
        "DELETE FROM user_profiles WHERE lower(email)='sites-screenshot-service-noreply@chatgpt.com'",
      ).run();
  }
  return user;
}
export async function GET(request: NextRequest) {
  const current = await ensureAdmin(request);
  const users = await env.DB.prepare(
    "SELECT * FROM user_profiles ORDER BY id",
  ).all();
  const profile = await env.DB.prepare(
    "SELECT * FROM user_profiles WHERE external_user_id=? OR email=? LIMIT 1",
  )
    .bind(current.id, current.email)
    .first();
  return NextResponse.json({ users: users.results, currentUser: profile });
}
export async function POST(request: NextRequest) {
  const actor = await ensureAdmin(request);
  const me = await env.DB.prepare(
    "SELECT role FROM user_profiles WHERE external_user_id=? OR lower(email)=? LIMIT 1",
  )
    .bind(actor.id, actor.email)
    .first<{ role: string }>();
  if (me?.role !== "admin")
    return NextResponse.json(
      { error: "هذه العملية متاحة لمدير النظام فقط" },
      { status: 403 },
    );
  const b = (await request.json()) as Record<string, string>;
  if (!b.email || !b.fullName || !b.role)
    return NextResponse.json(
      { error: "يرجى استكمال بيانات المستخدم" },
      { status: 400 },
    );
  const email = b.email.trim().toLowerCase();
  if (
    await env.DB.prepare(
      "SELECT id FROM user_profiles WHERE lower(email)=? LIMIT 1",
    )
      .bind(email)
      .first()
  )
    return NextResponse.json(
      { error: "البريد الإلكتروني مسجل مسبقًا" },
      { status: 409 },
    );
  try {
    const result = await env.DB.prepare(
      "INSERT INTO user_profiles (external_user_id,email,full_name,role,station,active) VALUES (?,?,?,?,?,1)",
    )
      .bind(
        `email:${email}`,
        email,
        b.fullName.trim(),
        b.role,
        b.station || null,
      )
      .run();
    return NextResponse.json(
      { ok: true, id: result.meta.last_row_id },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "البريد الإلكتروني مسجل مسبقًا" },
      { status: 409 },
    );
  }
}
export async function PATCH(request: NextRequest) {
  const actor = await ensureAdmin(request);
  const me = await env.DB.prepare(
    "SELECT role FROM user_profiles WHERE external_user_id=? OR lower(email)=? LIMIT 1",
  )
    .bind(actor.id, actor.email)
    .first<{ role: string }>();
  if (me?.role !== "admin")
    return NextResponse.json(
      { error: "هذه العملية متاحة لمدير النظام فقط" },
      { status: 403 },
    );
  const b = (await request.json()) as {
    id: number;
    fullName?: string;
    email?: string;
    role?: string;
    station?: string;
    active?: boolean;
  };
  const email = b.email?.trim().toLowerCase() || null;
  if (
    email &&
    (await env.DB.prepare(
      "SELECT id FROM user_profiles WHERE lower(email)=? AND id<>? LIMIT 1",
    )
      .bind(email, b.id)
      .first())
  )
    return NextResponse.json(
      { error: "البريد الإلكتروني مسجل لمستخدم آخر" },
      { status: 409 },
    );
  await env.DB.prepare(
    "UPDATE user_profiles SET full_name=COALESCE(?,full_name), email=COALESCE(?,email), role=COALESCE(?,role), station=CASE WHEN ? IS NULL THEN station ELSE ? END, active=COALESCE(?,active) WHERE id=?",
  )
    .bind(
      b.fullName?.trim() || null,
      email,
      b.role || null,
      b.station === undefined ? null : b.station,
      b.station === undefined ? null : b.station || null,
      b.active === undefined ? null : b.active ? 1 : 0,
      b.id,
    )
    .run();
  return NextResponse.json({ ok: true });
}
