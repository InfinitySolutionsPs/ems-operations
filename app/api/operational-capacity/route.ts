import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import capacityArchive from "@/lib/capacity-archive.json";

export async function GET(request: NextRequest) {
  const station = await env.DB.prepare("SELECT id FROM stations WHERE name LIKE '%غزة%' LIMIT 1").first<{id:number}>();
  if (station) {
    const staff = await env.DB.prepare("SELECT id,full_name FROM staff").all();
    const byName = new Map(staff.results.map((s:any)=>[String(s.full_name).trim(),Number(s.id)]));
    const statements:any[] = [];
    for (const row of capacityArchive as any[]) {
      const staffId = byName.get(String(row.name).trim()); if (!staffId) continue;
      for (const shift of ["A","B","C"]) if (row[shift]) statements.push(env.DB.prepare("INSERT INTO operational_assignments (work_date,staff_id,station_id,shift,duty_type,work_location,attendance_status,notes,created_by) SELECT '2026-09-01',?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM operational_assignments WHERE work_date='2026-09-01' AND staff_id=? AND shift=?)").bind(staffId,station.id,shift,row.duty,"غزة","حاضر",row.detail||null,"archive",staffId,shift));
    }
    for (let i=0;i<statements.length;i+=40) await env.DB.batch(statements.slice(i,i+40));
  }
  const date = request.nextUrl.searchParams.get("date");
  const from =
    request.nextUrl.searchParams.get("from") ||
    date ||
    new Date().toISOString().slice(0, 10);
  const to = request.nextUrl.searchParams.get("to") || date || from;
  const result = await env.DB.prepare(
    `SELECT oa.*, s.full_name, s.cadre_type, s.job_title, s.detail,
    st.name station_name, v.plate_number vehicle_number
    FROM operational_assignments oa JOIN staff s ON s.id=oa.staff_id
    JOIN stations st ON st.id=oa.station_id LEFT JOIN vehicles v ON v.id=oa.vehicle_id
    WHERE oa.work_date BETWEEN ? AND ? ORDER BY oa.work_date DESC, st.name, oa.shift, s.full_name`,
  )
    .bind(from, to)
    .all();
  return NextResponse.json({ assignments: result.results });
}

export async function PATCH(request: NextRequest) {
  const access = await getAccess(request);
  if (
    !access.profile ||
    !["admin", "central_user"].includes(access.profile.role)
  )
    return NextResponse.json(
      { error: "لا توجد صلاحية لتعديل جدول الدوام" },
      { status: 403 },
    );
  const b = (await request.json()) as Record<string, string | number | null>;
  if (!b.id || !b.workDate || !b.staffId || !b.stationId || !b.shift)
    return NextResponse.json(
      { error: "يرجى استكمال البيانات الإلزامية" },
      { status: 400 },
    );
  await env.DB.prepare(
    `UPDATE operational_assignments SET work_date=?,staff_id=?,station_id=?,shift=?,duty_type=?,vehicle_id=?,work_location=?,attendance_status=?,notes=? WHERE id=?`,
  )
    .bind(
      b.workDate,
      b.staffId,
      b.stationId,
      b.shift,
      b.dutyType || "دوام مركز",
      b.vehicleId || null,
      b.workLocation || null,
      b.attendanceStatus || "حاضر",
      b.notes || null,
      b.id,
    )
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const access = await getAccess(request);
  if (access.profile?.role !== "admin")
    return NextResponse.json(
      { error: "حذف التكليف متاح لمدير النظام فقط" },
      { status: 403 },
    );
  const id = request.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "السجل غير محدد" }, { status: 400 });
  await env.DB.prepare("DELETE FROM operational_assignments WHERE id=?")
    .bind(id)
    .run();
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const access = await getAccess(request);
  if (
    !access.profile ||
    !["admin", "central_user"].includes(access.profile.role)
  )
    return NextResponse.json(
      { error: "لا توجد صلاحية لإدخال القدرة التشغيلية" },
      { status: 403 },
    );
  const b = (await request.json()) as Record<string, string | number | null>;
  if (!b.workDate || !b.staffId || !b.stationId || !b.shift)
    return NextResponse.json(
      { error: "يرجى استكمال الموظف والمركز والتاريخ والوردية" },
      { status: 400 },
    );
  const duplicate = await env.DB.prepare(
    "SELECT id FROM operational_assignments WHERE work_date=? AND staff_id=? AND shift=? LIMIT 1",
  )
    .bind(b.workDate, b.staffId, b.shift)
    .first();
  if (duplicate)
    return NextResponse.json(
      { error: "الموظف مسجل مسبقًا في هذه الوردية" },
      { status: 409 },
    );
  const result = await env.DB.prepare(
    `INSERT INTO operational_assignments
    (work_date,staff_id,station_id,shift,duty_type,vehicle_id,work_location,attendance_status,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      b.workDate,
      b.staffId,
      b.stationId,
      b.shift,
      b.dutyType || "دوام مركز",
      b.vehicleId || null,
      b.workLocation || null,
      b.attendanceStatus || "حاضر",
      b.notes || null,
      access.email,
    )
    .run();
  return NextResponse.json(
    { ok: true, id: result.meta.last_row_id },
    { status: 201 },
  );
}
