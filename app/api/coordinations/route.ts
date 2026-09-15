import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";
import { canEnter, getAccess } from "@/lib/access";
import { coordinationSeed } from "@/lib/coordination-seed";

const insertSql = `INSERT OR IGNORE INTO coordinations
(source_key,sequence_number,coordination_date,coordinating_agency,vehicle_count,coordination_type,result_description,ambulance_patients,ambulance_companions,bus_patients,coordination_status,participating_vehicles,notes_patients,notes_companions,notes_total,created_by)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'excel-import')`;

async function ensureHistoricalData() {
  await env.DB.batch(
    coordinationSeed.map((row) => env.DB.prepare(insertSql).bind(...row)),
  );
}

export async function GET(request: NextRequest) {
  await ensureHistoricalData();
  const from = request.nextUrl.searchParams.get("from") || "1900-01-01";
  const to = request.nextUrl.searchParams.get("to") || "2999-12-31";
  const agency = request.nextUrl.searchParams.get("agency") || "all";
  let where = "coordination_date BETWEEN ? AND ?";
  const args: unknown[] = [from, to];
  if (agency !== "all") {
    where += " AND coordinating_agency=?";
    args.push(agency);
  }
  const statements = [
    env.DB.prepare(
      `SELECT * FROM coordinations WHERE ${where} ORDER BY coordination_date DESC,id DESC`,
    ).bind(...args),
    env.DB.prepare(
      `SELECT COUNT(*) total,COALESCE(SUM(vehicle_count),0) vehicles,COALESCE(SUM(ambulance_patients),0) patients,COALESCE(SUM(ambulance_companions),0) companions,COALESCE(SUM(bus_patients),0) bus_patients,SUM(CASE WHEN coordination_status='نجح' THEN 1 ELSE 0 END) successful FROM coordinations WHERE ${where}`,
    ).bind(...args),
    env.DB.prepare(
      `SELECT CASE WHEN coordinating_agency='صليب احمر' THEN 'الصليب الأحمر' ELSE coordinating_agency END name,COUNT(*) value FROM coordinations WHERE ${where} GROUP BY name ORDER BY value DESC`,
    ).bind(...args),
    env.DB.prepare(
      `SELECT coordination_type name,COUNT(*) value FROM coordinations WHERE ${where} GROUP BY coordination_type ORDER BY value DESC`,
    ).bind(...args),
    env.DB.prepare(
      `SELECT coordination_date name,COUNT(*) value FROM coordinations WHERE ${where} GROUP BY coordination_date ORDER BY coordination_date`,
    ).bind(...args),
  ];
  const [records, summary, agencies, types, timeline] =
    await env.DB.batch(statements);
  return NextResponse.json({
    records: records.results,
    summary: summary.results[0] || {},
    agencies: agencies.results,
    types: types.results,
    timeline: timeline.results,
  });
}

export async function POST(request: NextRequest) {
  const access = await getAccess(request);
  if (
    !access.profile ||
    !access.profile.active ||
    !canEnter(access.profile.role)
  )
    return NextResponse.json(
      { error: "لا تملك صلاحية إدخال التنسيقات" },
      { status: 403 },
    );
  const b = (await request.json()) as Record<string, unknown>;
  if (!b.coordinationDate || !b.coordinatingAgency || !b.coordinationType)
    return NextResponse.json(
      { error: "يرجى استكمال التاريخ والجهة وطبيعة التنسيق" },
      { status: 400 },
    );
  const result = await env.DB.prepare(
    `INSERT INTO coordinations
    (coordination_date,coordinating_agency,vehicle_count,coordination_type,result_description,ambulance_patients,ambulance_companions,bus_patients,coordination_status,participating_vehicles,notes_patients,notes_companions,notes_total,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      b.coordinationDate,
      b.coordinatingAgency,
      Number(b.vehicleCount || 0),
      b.coordinationType,
      b.resultDescription || null,
      Number(b.ambulancePatients || 0),
      Number(b.ambulanceCompanions || 0),
      Number(b.busPatients || 0),
      b.coordinationStatus || "نجح",
      b.participatingVehicles || null,
      Number(b.notesPatients || 0),
      Number(b.notesCompanions || 0),
      Number(b.notesTotal || 0),
      b.notes || null,
      access.email,
    )
    .run();
  await env.DB.prepare(
    "INSERT INTO audit_logs (actor,action,entity_type,entity_id,details) VALUES (?,'create','coordination',?,'إضافة تنسيق')",
  )
    .bind(access.email, String(result.meta.last_row_id))
    .run();
  return NextResponse.json(
    { ok: true, id: result.meta.last_row_id },
    { status: 201 },
  );
}
