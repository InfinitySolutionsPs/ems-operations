import { env } from "@/lib/server-env";
import { NextRequest, NextResponse } from "next/server";
import { canEnter, getAccess } from "@/lib/access";
import { ensureDataSheetImported } from "@/lib/datasheet-import";

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : v);
const minutesBetween = (a?: string, b?: string) => {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number),
    [bh, bm] = b.split(":").map(Number);
  const value = bh * 60 + bm - (ah * 60 + am);
  return value < 0 ? value + 1440 : value;
};
const minutesBetweenDates = (ad?: unknown, at?: unknown, bd?: unknown, bt?: unknown) => {
  if (!at || !bt) return 0;
  const start = new Date(`${String(ad || "2000-01-01")}T${String(at)}`);
  const end = new Date(`${String(bd || ad || "2000-01-01")}T${String(bt)}`);
  const value = Math.round((end.getTime() - start.getTime()) / 60000);
  return Number.isFinite(value) && value >= 0 ? value : minutesBetween(String(at), String(bt));
};

export async function GET(request: NextRequest) {
  await ensureDataSheetImported(env.DB);
  const access = await getAccess(request);
  if (access.profile && !access.profile.active)
    return NextResponse.json({ error: "الحساب موقوف" }, { status: 403 });
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "1900-01-01";
  const to = url.searchParams.get("to") || "2999-12-31";
  const governorate = url.searchParams.get("governorate") || "all";
  const category = url.searchParams.get("category") || "all";
  let sql = "SELECT * FROM incidents WHERE call_date BETWEEN ? AND ?";
  const args: unknown[] = [from, to];
  if (governorate !== "all") {
    sql += " AND pickup_governorate = ?";
    args.push(governorate);
  }
  if (category !== "all") {
    sql += " AND category = ?";
    args.push(category);
  }
  if (access.profile?.role === "station_user") {
    sql += " AND station = ?";
    args.push(access.profile.station);
  }
  sql += " ORDER BY call_date DESC, call_time DESC LIMIT 1000";
  const result = await env.DB.prepare(sql)
    .bind(...args)
    .all();
  return NextResponse.json({ incidents: result.results });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const access = await getAccess(request);
  if (
    access.profile &&
    (!access.profile.active || !canEnter(access.profile.role))
  )
    return NextResponse.json(
      { error: "لا تملك صلاحية إدخال البلاغات" },
      { status: 403 },
    );
  if (
    access.profile?.role === "station_user" &&
    body.station !== access.profile.station
  )
    return NextResponse.json(
      { error: "يمكنك الإدخال للمحطة المحددة في حسابك فقط" },
      { status: 403 },
    );
  const required = [
    "incidentNumber",
    "gender",
    "urgency",
    "category",
    "caseType",
    "pickupGovernorate",
    "shift",
    "station",
    "callDate",
    "callTime",
  ];
  const missing = required.filter((key) => !clean(body[key]));
  if (missing.length)
    return NextResponse.json(
      { error: "يرجى استكمال الحقول الإلزامية", fields: missing },
      { status: 400 },
    );
  const kmStart = Number(body.kmStart || 0),
    kmEnd = Number(body.kmEnd || 0);
  const distanceKm = kmEnd >= kmStart ? kmEnd - kmStart : 0;
  const responseMinutes = minutesBetweenDates(body.dispatchDate || body.callDate, body.dispatchTime || body.callTime, body.onSceneDate || body.callDate, body.arrivalTime);
  const serviceMinutes = minutesBetweenDates(body.callDate, body.callTime, body.availableDate || body.callDate, body.clearTime);
  const actor = request.headers.get("oai-authenticated-user-email") || "system";
  try {
    const chosenVehicle = body.vehicle ? await env.DB.prepare("SELECT id FROM vehicles WHERE plate_number=? AND active=1").bind(body.vehicle).first<{id:number}>() : null;
    if (body.vehicle && !chosenVehicle) return NextResponse.json({error:"المركبة غير معتمدة أو خارج الخدمة"},{status:400});
    const entries: [string, unknown][] = [
      ["incident_number",body.incidentNumber],["incident_code",body.incidentCode],["beneficiary_name",body.beneficiaryName],["gender",body.gender],["contact",body.contact],["age",body.age?Number(body.age):null],
      ["urgency",body.urgency],["category",body.category],["case_type",body.caseType],["pickup_type",body.pickupType],["pickup_location",body.pickupLocation],["pickup_governorate",body.pickupGovernorate],
      ["pickup_municipality",body.pickupMunicipality],["pickup_neighborhood",body.pickupNeighborhood],["dropoff_type",body.dropoffType],["dropoff_location",body.dropoffLocation],
      ["shift",body.shift],["station",body.station],["vehicle",body.vehicle],["vehicle_id",chosenVehicle?.id||null],["km_start",kmStart||null],["km_end",kmEnd||null],["distance_km",distanceKm],
      ["call_date",body.callDate],["call_time",body.callTime],["dispatch_date",body.dispatchDate],["dispatch_time",body.dispatchTime],["on_scene_date",body.onSceneDate],["arrival_time",body.arrivalTime],
      ["hospital_date",body.hospitalDate],["hospital_time",body.hospitalTime],["available_date",body.availableDate],["clear_time",body.clearTime],["response_minutes",responseMinutes],["service_minutes",serviceMinutes],
      ["dispatcher_primary",body.dispatcherPrimary],["dispatcher_secondary",body.dispatcherSecondary],["emt_driver",body.emtDriver],["emt_lead",body.emtLead],["emt_assist",body.emtAssist],
      ["crew",body.crew],["interventions",body.interventions],["chief_complaint",body.chiefComplaint],["fuel_liters",Number(body.fuelLiters||0)],["notes",body.notes],
      ...["cancelled","patientDeceased","conflictRelated","oxygen","bvm","airway","cpr","aed","drugs","woundCare","tourniquet","immobilization","cervicalCollar","glucoseCheck","splinting","delivery"].map((k)=>[k.replace(/[A-Z]/g,m=>`_${m.toLowerCase()}`), body[k]?1:0] as [string,unknown]),
      ["approval_status","pending"],["data_quality_status","ok"],["created_by",actor],
    ];
    const stmt = env.DB.prepare(`INSERT INTO incidents (${entries.map(([k])=>k).join(",")}) VALUES (${entries.map(()=>"?").join(",")})`);
    const values = entries.map(([,v])=>clean(v));
    const result = await stmt.bind(...values).run();
    await env.DB.prepare(
      "INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES (?, 'create', 'incident', ?, ?)",
    )
      .bind(actor, String(result.meta.last_row_id), String(body.incidentNumber))
      .run();
    await env.DB.prepare(
      "INSERT INTO notifications (recipient, title, message, type, entity_type, entity_id) VALUES (NULL, 'إحصائية بانتظار الاعتماد', ?, 'approval', 'incident', ?)",
    )
      .bind(
        `تم إدخال البلاغ ${String(body.incidentNumber)} ويحتاج إلى مراجعة مدير النظام`,
        String(result.meta.last_row_id),
      )
      .run();
    return NextResponse.json(
      {
        ok: true,
        id: result.meta.last_row_id,
        distanceKm,
        responseMinutes,
        serviceMinutes,
      },
      { status: 201 },
    );
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      return NextResponse.json(
        { error: "رقم البلاغ مستخدم مسبقًا" },
        { status: 409 },
      );
    return NextResponse.json({ error: "تعذر حفظ البلاغ" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const access = await getAccess(request);
  if (
    !access.profile ||
    !access.profile.active ||
    !canEnter(access.profile.role)
  )
    return NextResponse.json(
      { error: "لا تملك صلاحية تعديل البلاغ" },
      { status: 403 },
    );
  const current = await env.DB.prepare(
    "SELECT station,vehicle FROM incidents WHERE id=?",
  )
    .bind(body.id)
    .first<{ station: string; vehicle:string|null }>();
  if (!current)
    return NextResponse.json({ error: "البلاغ غير موجود" }, { status: 404 });
  if (
    access.profile.role === "station_user" &&
    current.station !== access.profile.station
  )
    return NextResponse.json(
      { error: "يمكنك تعديل بلاغات محطتك فقط" },
      { status: 403 },
    );
  const responseMinutes = minutesBetweenDates(body.dispatchDate || body.callDate, body.dispatchTime || body.callTime, body.onSceneDate || body.callDate, body.arrivalTime);
  const serviceMinutes = minutesBetweenDates(body.callDate, body.callTime, body.availableDate || body.callDate, body.clearTime);
  const kmStart = Number(body.kmStart || 0),
    kmEnd = Number(body.kmEnd || 0);
  const chosenVehicle = body.vehicle ? await env.DB.prepare("SELECT id FROM vehicles WHERE plate_number=?").bind(body.vehicle).first<{id:number}>() : null;
  if (body.vehicle && !chosenVehicle && body.vehicle!==current.vehicle) return NextResponse.json({error:"المركبة غير موجودة في الإعدادات"},{status:400});
  const updates: [string,unknown][] = [
    ["beneficiary_name",body.beneficiaryName],["gender",body.gender],["contact",body.contact],["age",body.age?Number(body.age):null],["urgency",body.urgency],["category",body.category],["case_type",body.caseType],
    ["pickup_type",body.pickupType],["pickup_location",body.pickupLocation],["pickup_governorate",body.pickupGovernorate],["pickup_municipality",body.pickupMunicipality],["pickup_neighborhood",body.pickupNeighborhood],
    ["dropoff_type",body.dropoffType],["dropoff_location",body.dropoffLocation],["station",body.station],["shift",body.shift],["vehicle",body.vehicle],["vehicle_id",chosenVehicle?.id||null],
    ["call_date",body.callDate],["call_time",body.callTime],["dispatch_date",body.dispatchDate],["dispatch_time",body.dispatchTime],["on_scene_date",body.onSceneDate],["arrival_time",body.arrivalTime],
    ["hospital_date",body.hospitalDate],["hospital_time",body.hospitalTime],["available_date",body.availableDate],["clear_time",body.clearTime],
    ["km_start",kmStart||null],["km_end",kmEnd||null],["distance_km",kmEnd>=kmStart?kmEnd-kmStart:0],["response_minutes",responseMinutes],["service_minutes",serviceMinutes],
    ["dispatcher_primary",body.dispatcherPrimary],["dispatcher_secondary",body.dispatcherSecondary],["emt_driver",body.emtDriver],["emt_lead",body.emtLead],["emt_assist",body.emtAssist],
    ["chief_complaint",body.chiefComplaint],["fuel_liters",Number(body.fuelLiters||0)],["notes",body.notes],
    ...["cancelled","patientDeceased","conflictRelated","oxygen","bvm","airway","cpr","aed","drugs","woundCare","tourniquet","immobilization","cervicalCollar","glucoseCheck","splinting","delivery"].map((k)=>[k.replace(/[A-Z]/g,m=>`_${m.toLowerCase()}`), body[k]?1:0] as [string,unknown]),
  ];
  await env.DB.prepare(`UPDATE incidents SET ${updates.map(([k])=>`${k}=?`).join(",")},approval_status='pending',approved_by=NULL,approved_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(...updates.map(([,v])=>clean(v)),body.id).run();
  await env.DB.prepare(
    "INSERT INTO audit_logs (actor,action,entity_type,entity_id,details) VALUES (?,'update','incident',?,?)",
  )
    .bind(access.email, String(body.id), "تعديل البلاغ وإعادته للاعتماد")
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const access = await getAccess(request);
  if (access.profile?.role !== "admin" || !access.profile.active)
    return NextResponse.json({ error: "حذف البلاغات متاح لمدير النظام فقط" }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "رقم البلاغ غير صالح" }, { status: 400 });
  const current = await env.DB.prepare("SELECT incident_number FROM incidents WHERE id=?").bind(id).first<{incident_number:string}>();
  if (!current) return NextResponse.json({ error: "البلاغ غير موجود" }, { status: 404 });
  await env.DB.prepare("DELETE FROM incidents WHERE id=?").bind(id).run();
  await env.DB.prepare("INSERT INTO audit_logs (actor,action,entity_type,entity_id,details) VALUES (?,'delete','incident',?,?)")
    .bind(access.email, String(id), `حذف البلاغ ${current.incident_number}`).run();
  return NextResponse.json({ ok: true });
}
