/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import staffArchive from "@/lib/staff-archive.json";

const employeeNameKey = (value: unknown) =>
  String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

export async function GET() {
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO stations (code,name,governorate) VALUES (?,?,?)",
    ).bind("JAB", "محطة جباليا", "شمال غزة"),
    env.DB.prepare(
      "INSERT OR IGNORE INTO stations (code,name,governorate) VALUES (?,?,?)",
    ).bind("GAZ", "محطة غزة", "غزة"),
    env.DB.prepare(
      "INSERT OR IGNORE INTO stations (code,name,governorate) VALUES (?,?,?)",
    ).bind("DEI", "محطة دير البلح", "الوسطى"),
    env.DB.prepare(
      "INSERT OR IGNORE INTO stations (code,name,governorate) VALUES (?,?,?)",
    ).bind("KHA", "محطة خانيونس", "خانيونس"),
    env.DB.prepare(
      "INSERT OR IGNORE INTO stations (code,name,governorate) VALUES (?,?,?)",
    ).bind("RAF", "محطة رفح", "رفح"),
  ]);
  const existing = await env.DB.prepare("SELECT lower(trim(full_name)) name FROM staff").all();
  const known = new Set(existing.results.map((x:any)=>employeeNameKey(x.name)));
  const pending = (staffArchive as any[]).filter(row=>{
    const name = employeeNameKey(row.fullName);
    if (!name || known.has(name)) return false;
    known.add(name);
    return true;
  });
  for (let i=0;i<pending.length;i+=40) {
    await env.DB.batch(pending.slice(i,i+40).map((row:any)=>env.DB.prepare("INSERT INTO staff (full_name,cadre_type,job_title,detail) VALUES (?,?,?,?)").bind(row.fullName, row.category || "غير محدد", row.emtLevel || "غير محدد", JSON.stringify({ station: row.station, startYear: row.startYear, gender: row.gender, birthYear: row.birthYear, category: row.category, emtLevel: row.emtLevel, medicalQualification: row.medicalQualification, ambulanceLicence: row.ambulanceLicence }))));
  }
  const [stations, vehicles, staff, settings] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM stations ORDER BY name"),
    env.DB.prepare("SELECT * FROM vehicles ORDER BY plate_number"),
    env.DB.prepare("SELECT * FROM staff ORDER BY full_name"),
    env.DB.prepare("SELECT * FROM system_settings ORDER BY category,key"),
  ]);
  return NextResponse.json({
    stations: stations.results,
    vehicles: vehicles.results,
    staff: staff.results,
    settings: settings.results,
  });
}

export async function PATCH(request: NextRequest) {
  const access = await getAccess(request);
  if (access.profile?.role !== "admin")
    return NextResponse.json(
      { error: "تعديل الموظفين متاح لمدير النظام فقط" },
      { status: 403 },
    );
  const b = (await request.json()) as Record<string, any>;
  if (!b.id || !["staff", "station", "vehicle"].includes(b.entity))
    return NextResponse.json(
      { error: "بيانات الموظف غير مكتملة" },
      { status: 400 },
    );
  if (b.entity === "staff")
    await env.DB.prepare(
      "UPDATE staff SET full_name=?,cadre_type=?,job_title=?,detail=?,active=? WHERE id=?",
    )
      .bind(
        b.fullName,
        b.cadreType,
        b.jobTitle,
        b.detail || null,
        b.active === false ? 0 : 1,
        b.id,
      )
      .run();
  else if (b.entity === "station")
    await env.DB.prepare(
      "UPDATE stations SET code=?,name=?,governorate=? WHERE id=?",
    )
      .bind(b.code, b.name, b.governorate, b.id)
      .run();
  else {
    const openMaintenance = await env.DB.prepare("SELECT id FROM vehicle_maintenance WHERE vehicle_id=? AND status='open' LIMIT 1").bind(b.id).first();
    if (openMaintenance && b.serviceStatus !== "maintenance")
      return NextResponse.json({ error: "هذه المركبة قيد الصيانة؛ لا تُعاد للخدمة إلا بإغلاق طلب الصيانة" }, { status: 409 });
    await env.DB.prepare(
      "UPDATE vehicles SET plate_number=?,manufacturer=?,model=?,ambulance_type=?,fuel_type=?,work_location=?,service_status=?,out_of_service_reason=?,active=?,station_id=? WHERE id=?",
    )
      .bind(
        b.plateNumber,
        b.manufacturer || null,
        b.model || null,
        b.ambulanceType || null,
        b.fuelType || null,
        b.workLocation || null,
        openMaintenance ? "maintenance" : b.serviceStatus === "out_of_service" ? "out_of_service" : "active",
        openMaintenance ? "طلب صيانة مفتوح" : b.outOfServiceReason || null,
        openMaintenance || b.serviceStatus === "out_of_service" ? 0 : 1,
        b.stationId ? Number(b.stationId) : null,
        b.id,
      )
      .run();
  }
  return NextResponse.json({ ok: true });
}
export async function POST(request: NextRequest) {
  const access = await getAccess(request);
  if (access.profile?.role !== "admin")
    return NextResponse.json(
      { error: "الإعدادات متاحة لمدير النظام فقط" },
      { status: 403 },
    );
  const b = (await request.json()) as Record<string, any>;
  if (b.entity === "deduplicateStaff") {
    const all = await env.DB.prepare("SELECT * FROM staff ORDER BY id").all();
    const seen = new Map<string, number>();
    const duplicates: { keep: number; remove: number }[] = [];
    for (const row of all.results as any[]) {
      const key = employeeNameKey(row.full_name);
      const keep = seen.get(key);
      if (keep !== undefined) duplicates.push({ keep, remove: row.id });
      else seen.set(key, row.id);
    }
    if (b.dryRun === true)
      return NextResponse.json({ duplicates: duplicates.length, total: all.results.length });
    // Each D1 batch is atomic: relink operational and fleet history before removal.
    for (let i = 0; i < duplicates.length; i += 20) {
      const statements = duplicates.slice(i, i + 20).flatMap(({ keep, remove }) => [
        env.DB.prepare("UPDATE operational_assignments SET staff_id=? WHERE staff_id=?").bind(keep, remove),
        env.DB.prepare("UPDATE vehicle_movements SET driver_staff_id=? WHERE driver_staff_id=?").bind(keep, remove),
        env.DB.prepare("UPDATE fuel_fillings SET driver_staff_id=? WHERE driver_staff_id=?").bind(keep, remove),
        env.DB.prepare("UPDATE fuel_fillings SET filled_by_staff_id=? WHERE filled_by_staff_id=?").bind(keep, remove),
        env.DB.prepare("DELETE FROM staff WHERE id=?").bind(remove),
      ]);
      await env.DB.batch(statements);
    }
    return NextResponse.json({ ok: true, removed: duplicates.length, remaining: all.results.length - duplicates.length });
  }
  if (b.entity === "importStaffArchive") {
    let added = 0;
    const seen = new Set<string>();
    for (const row of staffArchive as any[]) {
      const name = employeeNameKey(row.fullName);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const exists = await env.DB.prepare("SELECT id FROM staff WHERE lower(trim(full_name))=lower(trim(?)) LIMIT 1").bind(row.fullName).first();
      if (exists) continue;
      const detail = JSON.stringify({ station: row.station, startYear: row.startYear, gender: row.gender, birthYear: row.birthYear, category: row.category, emtLevel: row.emtLevel, medicalQualification: row.medicalQualification, ambulanceLicence: row.ambulanceLicence });
      await env.DB.prepare("INSERT INTO staff (full_name,cadre_type,job_title,detail) VALUES (?,?,?,?)").bind(row.fullName, row.category || "غير محدد", row.emtLevel || "غير محدد", detail).run();
      added++;
    }
    return NextResponse.json({ ok: true, added, total: staffArchive.length });
  }
  if (b.entity === "station")
    await env.DB.prepare(
      "INSERT INTO stations (code,name,governorate) VALUES (?,?,?)",
    )
      .bind(b.code, b.name, b.governorate)
      .run();
  else if (b.entity === "vehicle")
    await env.DB.prepare(
      "INSERT INTO vehicles (plate_number,manufacturer,model,ambulance_type,fuel_type,work_location,service_status,out_of_service_reason,active,station_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        b.plateNumber,
        b.manufacturer || null,
        b.model || null,
        b.ambulanceType || null,
        b.fuelType || null,
        b.workLocation || null,
        b.serviceStatus === "out_of_service" ? "out_of_service" : "active",
        b.outOfServiceReason || null,
        b.serviceStatus === "out_of_service" ? 0 : 1,
        b.stationId ? Number(b.stationId) : null,
      )
      .run();
  else if (b.entity === "staff")
    await env.DB.prepare(
      "INSERT INTO staff (full_name,cadre_type,job_title,detail) VALUES (?,?,?,?)",
    )
      .bind(b.fullName, b.cadreType, b.jobTitle, b.detail || null)
      .run();
  else if (b.entity === "setting")
    await env.DB.prepare(
      "INSERT INTO system_settings (key,value,label,category,updated_by) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP",
    )
      .bind(b.key, b.value, b.label, b.category || "general", access.email)
      .run();
  else
    return NextResponse.json(
      { error: "نوع الإعداد غير معروف" },
      { status: 400 },
    );
  return NextResponse.json({ ok: true }, { status: 201 });
}
