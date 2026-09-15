import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";
import { canEnter, getAccess } from "@/lib/access";
import fleet from "@/lib/fleet-seed.json";

const reply = (error: string, status = 400) => NextResponse.json({ error }, { status });
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const number = (v: unknown) => v === "" || v == null ? null : Number(v);
const validDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);

export async function GET(request: NextRequest) {
  const access = await getAccess(request);
  if (!access.profile?.active) return reply("الحساب غير مخوّل", 403);
  const station = access.profile.role === "station_user" ? access.profile.station : null;
  const from = new URL(request.url).searchParams.get("from") || "1900-01-01";
  const to = new URL(request.url).searchParams.get("to") || "2999-12-31";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return reply("الفترة غير صالحة");
  const vehicles = await env.DB.prepare("SELECT v.*, s.name station_name FROM vehicles v LEFT JOIN stations s ON s.id=v.station_id ORDER BY v.plate_number").all();
  const available = station ? vehicles.results.filter((v: any) => v.station_name === station) : vehicles.results;
  const ids = new Set(available.map((v: any) => Number(v.id)));
  const [fuel, movements, incidents] = await env.DB.batch([
    env.DB.prepare("SELECT f.*,v.plate_number,i.incident_number FROM fuel_fillings f JOIN vehicles v ON v.id=f.vehicle_id LEFT JOIN incidents i ON i.id=f.incident_id WHERE substr(f.filled_at,1,10) BETWEEN ? AND ? ORDER BY f.filled_at DESC LIMIT 1000").bind(from,to),
    env.DB.prepare("SELECT m.*,v.plate_number,i.incident_number FROM vehicle_movements m JOIN vehicles v ON v.id=m.vehicle_id LEFT JOIN incidents i ON i.id=m.incident_id WHERE substr(m.departed_at,1,10) BETWEEN ? AND ? ORDER BY m.departed_at DESC LIMIT 1000").bind(from,to),
    env.DB.prepare("SELECT i.id,i.incident_number,i.vehicle,i.vehicle_id,i.call_date,i.distance_km,i.fuel_liters,i.station,i.approval_status FROM incidents i WHERE i.call_date BETWEEN ? AND ? ORDER BY i.call_date DESC LIMIT 5000").bind(from,to),
  ]);
  const normalize = (v: unknown) => text(v).replace(/\s/g, "");
  const plates = new Set(available.map((v:any)=>normalize(v.plate_number)));
  const existingPlates = new Set(vehicles.results.map((v:any)=>normalize(v.plate_number)));
  const pendingImportCount = access.profile.role === "admin" ? fleet.filter(v=>v.plate!=="3-2003-55" && v.plate!=="3-0257-55" && !existingPlates.has(normalize(v.plate))).length : 0;
  return NextResponse.json({ vehicles: available, canEditVehicles: access.profile.role === "admin", pendingImportCount, fuel: fuel.results.filter((r:any)=>ids.has(Number(r.vehicle_id))),
    movements: movements.results.filter((r:any)=>ids.has(Number(r.vehicle_id))),
    incidents: incidents.results.filter((r:any)=>(!station || r.station===station) && (ids.has(Number(r.vehicle_id)) || plates.has(normalize(r.vehicle)))),
    importReview: [{plate:"3-2003-55",reason:"وردت مرتين بوقود وحالة مختلفين (صفا 42 و78)"},{plate:"3-0257-55",reason:"مدرجة تحت الصيانة لكن حالتها داخل الخدمة (صف 87)"}] });
}

export async function POST(request: NextRequest) {
  const access = await getAccess(request);
  if (!access.profile?.active || !canEnter(access.profile.role)) return reply("لا تملك صلاحية إدخال بيانات الأسطول",403);
  const b = await request.json() as Record<string,unknown>;
  if (b.action === "import") {
    if (access.profile.role !== "admin") return reply("استيراد الأسطول للمدير فقط",403);
    const [existing,stationList] = await env.DB.batch([env.DB.prepare("SELECT plate_number FROM vehicles"),env.DB.prepare("SELECT id,code FROM stations")]);
    const known = new Set(existing.results.map((v:any)=>text(v.plate_number).replace(/\s/g,"")));
    const stationIds = new Map(stationList.results.map((s:any)=>[s.code,Number(s.id)]));
    const stationCode = (location:string) => location.includes("دير")?"DEI":location.includes("خانيونس")?"KHA":location.includes("جباليا")?"JAB":location.includes("رفح")?"RAF":location==="غزة"?"GAZ":null;
    const safe = fleet.filter(v=>v.plate !== "3-2003-55" && v.plate !== "3-0257-55" && !known.has(v.plate.replace(/\s/g,"")));
    for (let i=0;i<safe.length;i+=40) {
      await env.DB.batch(safe.slice(i,i+40).map(v=>env.DB.prepare("INSERT OR IGNORE INTO vehicles (plate_number,manufacturer,fuel_type,work_location,service_status,out_of_service_reason,active,fleet_source_row,station_id) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(v.plate,v.manufacturer||null,v.fuelType||null,v.location||null,v.status.startsWith("داخل")?"active":"out_of_service",v.reason||null,v.status.startsWith("داخل")?1:0,v.sourceRow,stationIds.get(stationCode(v.location))||null)));
    }
    await env.DB.prepare("UPDATE incidents SET vehicle_id=(SELECT id FROM vehicles WHERE TRIM(plate_number)=TRIM(incidents.vehicle) LIMIT 1) WHERE vehicle_id IS NULL AND vehicle IS NOT NULL AND EXISTS (SELECT 1 FROM vehicles WHERE TRIM(plate_number)=TRIM(incidents.vehicle))").run();
    return NextResponse.json({ok:true,added:safe.length,skipped:fleet.length-safe.length,review:2});
  }
  if (b.action === "importArchive") {
    if (access.profile.role !== "admin") return reply("استيراد الأرشيف متاح لمدير النظام فقط",403);
    const rows = Array.isArray(b.rows) ? b.rows.slice(0,2000) : [];
    let added = 0;
    for (const row of rows as any[]) {
      const plate = text(row.plate); if (!plate) continue;
      const result = await env.DB.prepare("INSERT OR IGNORE INTO vehicles (plate_number,manufacturer,model,fuel_type,work_location,service_status,active) VALUES (?,?,?,?,?,?,?)")
        .bind(plate,text(row.manufacturer)||null,text(row.model)||null,text(row.fuelType)||null,text(row.location)||null,text(row.status).startsWith("خارج")?"out_of_service":"active",text(row.status).startsWith("خارج")?0:1).run();
      if (result.meta.changes) added++;
    }
    return NextResponse.json({ok:true,added});
  }
  const vehicleId = Number(b.vehicleId);
  const vehicle = await env.DB.prepare("SELECT v.*,s.name station_name FROM vehicles v LEFT JOIN stations s ON s.id=v.station_id WHERE v.id=?").bind(vehicleId).first<any>();
  if (!vehicle) return reply("المركبة غير موجودة");
  if (access.profile.role === "station_user" && vehicle.station_name !== access.profile.station) return reply("المركبة خارج نطاق محطتك",403);
  const incidentId = number(b.incidentId);
  if (incidentId != null && (!Number.isInteger(incidentId) || incidentId < 1)) return reply("رقم البلاغ غير صالح");
  if (incidentId != null) {
    const incident = await env.DB.prepare("SELECT vehicle,vehicle_id,station FROM incidents WHERE id=?").bind(incidentId).first<{vehicle:string|null;vehicle_id:number|null;station:string}>();
    if (!incident || (incident.vehicle_id !== vehicleId && text(incident.vehicle).replace(/\s/g,"") !== text(vehicle.plate_number).replace(/\s/g,"")) || (access.profile.role === "station_user" && incident.station !== access.profile.station)) return reply("البلاغ لا يخص هذه المركبة");
  }
  const staffId = number(b.driverStaffId), fillerId = number(b.filledByStaffId);
  for (const id of [staffId,fillerId]) if (id != null && (!Number.isInteger(id) || !(await env.DB.prepare("SELECT id FROM staff WHERE id=?").bind(id).first()))) return reply("الموظف المحدد غير موجود");
  try {
    let result;
    if (b.action === "fill") {
      const liters=number(b.liters), odometer=number(b.odometerKm);
      if (!validDate(b.filledAt) || liters==null || !Number.isFinite(liters) || liters<=0 || (odometer!=null && (!Number.isFinite(odometer)||odometer<0)) || !text(b.filledByName) || !["بنزين","سولار"].includes(text(b.fuelType))) return reply("يرجى إدخال تاريخ وكمية صحيحة واسم المُعبّئ وتحديد وقود السيارة في الإعدادات");
      if (vehicle.fuel_type && text(b.fuelType)!==vehicle.fuel_type) return reply("نوع الوقود لا يطابق بطاقة المركبة");
      result=await env.DB.prepare("INSERT INTO fuel_fillings (vehicle_id,incident_id,filled_at,liters,fuel_type,odometer_km,driver_staff_id,driver_name,filled_by_staff_id,filled_by_name,source_name,voucher_number,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(vehicleId,incidentId,b.filledAt,liters,text(b.fuelType),odometer,staffId,text(b.driverName)||null,fillerId,text(b.filledByName),text(b.sourceName)||null,text(b.voucherNumber)||null,text(b.notes)||null,access.email).run();
    } else if (b.action === "movement") {
      if (!vehicle.active) return reply("المركبة خارج الخدمة؛ لا يمكن تسجيل حركة جديدة");
      const start=number(b.kmStart),end=number(b.kmEnd);
      if (!validDate(b.departedAt) || (b.returnedAt && (!validDate(b.returnedAt)||String(b.returnedAt)<String(b.departedAt))) || start==null || !Number.isFinite(start) || start<0 || (end!=null && (!Number.isFinite(end)||end<start))) return reply("التاريخ أو قراءة العداد غير صحيحة");
      result=await env.DB.prepare("INSERT INTO vehicle_movements (vehicle_id,incident_id,driver_staff_id,driver_name,departed_at,returned_at,km_start,km_end,destination,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(vehicleId,incidentId,staffId,text(b.driverName)||null,b.departedAt,b.returnedAt||null,start,end,text(b.destination)||null,text(b.notes)||null,access.email).run();
    } else return reply("نوع العملية غير معروف");
    await env.DB.prepare("INSERT INTO audit_logs (actor,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)")
      .bind(access.email,"create",b.action==="fill"?"fuel_filling":"vehicle_movement",String(result.meta.last_row_id),vehicle.plate_number).run();
    return NextResponse.json({ok:true,id:result.meta.last_row_id},{status:201});
  } catch { return reply("تعذر حفظ العملية. يرجى إعادة المحاولة",500); }
}
