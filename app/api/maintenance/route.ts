import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";
import { canEnter, getAccess } from "@/lib/access";

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const str = (value: FormDataEntryValue | null) => typeof value === "string" ? value.trim() : "";
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
type Store = { put: (key: string, bytes: ArrayBuffer, options: object) => Promise<unknown>; get: (key: string) => Promise<{ body: Uint8Array; httpEtag: string } | null>; delete: (key: string) => Promise<void> };
const bucket = () => (env as unknown as { BUCKET: Store }).BUCKET;
async function accessFor(request: NextRequest) {
  const access = await getAccess(request);
  return access.profile?.active ? access : null;
}

export async function GET(request: NextRequest) {
  const access = await accessFor(request);
  if (!access) return error("يرجى تسجيل الدخول", 401);
  const query = new URL(request.url).searchParams;
  const attachmentId = Number(query.get("attachment"));
  if (query.has("attachment")) {
    if (!Number.isInteger(attachmentId) || attachmentId < 1) return error("رقم الطلب غير صالح");
    const row = await env.DB.prepare("SELECT m.attachment_key,m.attachment_name,m.attachment_type,s.name station_name FROM vehicle_maintenance m JOIN stations s ON s.id=m.station_id WHERE m.id=?").bind(attachmentId).first<any>();
    if (!row) return error("المرفق غير موجود", 404);
    if (access.profile?.role === "station_user" && row.station_name !== access.profile.station) return error("خارج نطاق المحطة", 403);
    const object = await bucket().get(row.attachment_key);
    if (!object) return error("ملف الطلب غير متاح", 404);
    const filename = encodeURIComponent(String(row.attachment_name).replace(/[\r\n]/g, ""));
    return new Response(new Uint8Array(object.body), { headers: {
      "Content-Type": row.attachment_type,
      "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  }
  const from = query.get("from") || "1900-01-01";
  const to = query.get("to") || "2999-12-31";
  if (!date(from) || !date(to) || from > to) return error("فترة التواريخ غير صالحة");
  const vehicleId = Number(query.get("vehicleId") || 0);
  const stationId = Number(query.get("stationId") || 0);
  if (!Number.isInteger(vehicleId) || !Number.isInteger(stationId) || vehicleId < 0 || stationId < 0) return error("الفلاتر غير صالحة");
  const [vehicles, stations, requests] = await env.DB.batch([
    env.DB.prepare("SELECT v.id,v.plate_number,v.active,v.service_status,v.station_id,s.name station_name FROM vehicles v LEFT JOIN stations s ON s.id=v.station_id ORDER BY v.plate_number"),
    env.DB.prepare("SELECT id,name,governorate FROM stations ORDER BY name"),
    env.DB.prepare(`SELECT m.*,v.plate_number,v.manufacturer,v.model,s.name station_name
      FROM vehicle_maintenance m JOIN vehicles v ON v.id=m.vehicle_id JOIN stations s ON s.id=m.station_id
      WHERE m.request_date BETWEEN ? AND ? AND (?=0 OR m.vehicle_id=?) AND (?=0 OR m.station_id=?)
      ORDER BY m.request_date DESC,m.id DESC LIMIT 2000`).bind(from,to,vehicleId,vehicleId,stationId,stationId),
  ]);
  const scoped = (rows: any[]) => access.profile?.role === "station_user" ? rows.filter((x) => x.station_name === access.profile?.station || x.name === access.profile?.station) : rows;
  return NextResponse.json({ vehicles: scoped(vehicles.results), stations: access.profile?.role === "station_user" ? stations.results.filter((s: any) => s.name === access.profile?.station) : stations.results, requests: scoped(requests.results).map(({ attachment_key, ...row }: any) => row), canClose: access.profile?.role === "admin" });
}

export async function POST(request: NextRequest) {
  const access = await accessFor(request);
  if (!access || !canEnter(access.profile?.role)) return error("لا تملكين صلاحية إضافة طلب صيانة", 403);
  const form = await request.formData();
  if (str(form.get("signedConfirmed")) !== "yes") return error("يجب تأكيد إرفاق الطلب الورقي الموقّع");
  const file = form.get("signedRequest");
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return error("أرفقي طلب الصيانة الورقي الموقع بصيغة PDF أو صورة JPG/PNG وبحجم لا يتجاوز 10 ميغابايت");
  const bytes = await file.arrayBuffer();
  const header = new Uint8Array(bytes.slice(0, 8));
  const validFile = file.type === "application/pdf" ? String.fromCharCode(...header.slice(0, 5)) === "%PDF-"
    : file.type === "image/jpeg" ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
      : [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte);
  if (!validFile) return error("محتوى الملف لا يطابق نوع PDF أو الصورة المحددة");
  const vehicleId = Number(str(form.get("vehicleId")));
  const stationId = Number(str(form.get("stationId")));
  const odometer = Number(str(form.get("odometerKm")));
  const requestDate = str(form.get("requestDate"));
  const department = str(form.get("department"));
  const requestedRepair = str(form.get("requestedRepair"));
  const driverName = str(form.get("driverName"));
  if (!Number.isInteger(vehicleId) || vehicleId < 1 || !Number.isInteger(stationId) || stationId < 1 || !Number.isFinite(odometer) || odometer < 0 || !date(requestDate) || !department || !requestedRepair || !driverName) return error("أكملي بيانات الطلب والعداد والتاريخ");
  const vehicle = await env.DB.prepare("SELECT v.id,v.active,v.service_status,v.station_id,s.name station_name FROM vehicles v LEFT JOIN stations s ON s.id=v.station_id WHERE v.id=?").bind(vehicleId).first<any>();
  const station = await env.DB.prepare("SELECT id,name FROM stations WHERE id=?").bind(stationId).first<any>();
  if (!vehicle || !station) return error("المركبة أو المركز غير موجود");
  if (vehicle.station_id && vehicle.station_id !== stationId) return error("المركز لا يطابق المركز المسجل للمركبة");
  if (access.profile?.role === "station_user" && station.name !== access.profile.station) return error("المركبة خارج نطاق محطتك", 403);
  if (!vehicle.active || vehicle.service_status !== "active") return error("المركبة خارج الخدمة أو لديها طلب صيانة مفتوح");
  const key = `maintenance/${crypto.randomUUID()}`;
  try {
    await bucket().put(key, bytes, { httpMetadata: { contentType: file.type } });
    const [insert] = await env.DB.batch([
      env.DB.prepare(`INSERT INTO vehicle_maintenance
        (vehicle_id,station_id,request_date,department,odometer_km,requested_repair,failure_cause,driver_name,center_manager_name,circle_manager_name,attachment_key,attachment_name,attachment_type,created_by)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM vehicles WHERE id=? AND active=1 AND service_status='active')
        AND NOT EXISTS (SELECT 1 FROM vehicle_maintenance WHERE vehicle_id=? AND status='open')`).bind(vehicleId,stationId,requestDate,department,odometer,requestedRepair,str(form.get("failureCause"))||null,driverName,str(form.get("centerManagerName"))||null,str(form.get("circleManagerName"))||null,key,file.name,file.type,access.email,vehicleId,vehicleId),
      env.DB.prepare("UPDATE vehicles SET active=0,service_status='maintenance',out_of_service_reason='طلب صيانة مفتوح' WHERE id=? AND EXISTS (SELECT 1 FROM vehicle_maintenance WHERE attachment_key=? AND status='open')").bind(vehicleId,key),
    ]);
    if (!insert.meta.changes) { await bucket().delete(key); return error("فُتح طلب صيانة لهذه المركبة بالفعل؛ حدّثي القائمة"); }
    return NextResponse.json({ ok: true, id: insert.meta.last_row_id }, { status: 201 });
  } catch {
    await bucket().delete(key).catch(() => undefined);
    return error("تعذر حفظ الطلب أو المرفق، ولم تتغير حالة المركبة", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const access = await accessFor(request);
  if (!access || access.profile?.role !== "admin") return error("إغلاق طلب الصيانة متاح للمدير فقط", 403);
  const body = await request.json() as Record<string, unknown>;
  const id = Number(body.id);
  const performed = typeof body.performedWork === "string" ? body.performedWork.trim() : "";
  const receiver = typeof body.receivedBy === "string" ? body.receivedBy.trim() : "";
  const receivedAt = typeof body.receivedAt === "string" ? body.receivedAt.trim() : "";
  if (!Number.isInteger(id) || id < 1 || !performed || !receiver || !date(receivedAt)) return error("حددي الإصلاح المنفذ وتاريخ الاستلام واسم المستلم");
  const current = await env.DB.prepare("SELECT vehicle_id,status FROM vehicle_maintenance WHERE id=?").bind(id).first<any>();
  if (!current || current.status !== "open") return error("الطلب غير موجود أو مغلق بالفعل", 409);
  try {
    const [closed] = await env.DB.batch([
      env.DB.prepare(`UPDATE vehicle_maintenance SET status='closed',performed_work=?,received_at=?,received_by=?,maintenance_recommendation=?,manager_recommendation=?,finance_recommendation=?,administrative_recommendation=?,closed_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='open'`)
        .bind(performed,receivedAt,receiver,body.maintenanceRecommendation||null,body.managerRecommendation||null,body.financeRecommendation||null,body.administrativeRecommendation||null,access.email,id),
      env.DB.prepare(`UPDATE vehicles SET active=1,service_status='active',out_of_service_reason=NULL WHERE id=? AND NOT EXISTS (SELECT 1 FROM vehicle_maintenance WHERE vehicle_id=? AND status='open')`).bind(current.vehicle_id,current.vehicle_id),
    ]);
    if (!closed.meta.changes) return error("الطلب مغلق بالفعل", 409);
    return NextResponse.json({ ok: true });
  } catch { return error("تعذر إغلاق الطلب؛ حالة المركبة لم تتغير", 500); }
}
