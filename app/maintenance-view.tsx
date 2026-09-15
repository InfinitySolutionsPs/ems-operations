"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Download, FileText, Filter, PlusCircle, RefreshCw, Wrench, X } from "lucide-react";
import { toast } from "sonner";

type Vehicle = { id: number; plate_number: string; active: number; service_status: string; station_id: number | null; station_name: string | null };
type Station = { id: number; name: string };
type Maintenance = Record<string, string | number | null> & { id: number; vehicle_id: number; station_id: number; status: string; plate_number: string; station_name: string };
const today = new Date().toISOString().slice(0, 10);
const start = `${new Date().getUTCFullYear()}-01-01`;

export default function MaintenanceView({ onVehiclesChanged }: { onVehiclesChanged: () => void }) {
  const [filters, setFilters] = useState({ from: start, to: today, vehicleId: "", stationId: "" });
  const [data, setData] = useState<{ vehicles: Vehicle[]; stations: Station[]; requests: Maintenance[]; canClose: boolean }>({ vehicles: [], stations: [], requests: [], canClose: false });
  const [draft, setDraft] = useState({ vehicleId: "", stationId: "", requestDate: today, department: "", odometerKm: "", requestedRepair: "", failureCause: "", driverName: "", centerManagerName: "", circleManagerName: "" });
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Maintenance | null>(null);
  const [closeDraft, setCloseDraft] = useState({ performedWork: "", receivedAt: today, receivedBy: "", maintenanceRecommendation: "", managerRecommendation: "", financeRecommendation: "", administrativeRecommendation: "" });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/maintenance?${new URLSearchParams(filters)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setSelected((previous) => previous ? result.requests.find((row: Maintenance) => row.id === previous.id) || null : null);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "تعذر تحميل طلبات الصيانة"); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  const setFilter = (key: keyof typeof filters, value: string) => setFilters((previous) => ({ ...previous, [key]: value }));
  const setField = (key: keyof typeof draft, value: string) => setDraft((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return toast.error("أرفقي الطلب الورقي الموقع أولًا");
    const fileInput = event.currentTarget.elements.namedItem("signedRequest") as HTMLInputElement;
    const confirmed = (event.currentTarget.elements.namedItem("signedConfirmed") as HTMLInputElement).checked;
    if (!confirmed) return toast.error("أكدي أن الطلب الورقي موقّع");
    const form = new FormData(event.currentTarget);
    form.set("signedConfirmed", "yes");
    setBusy(true);
    try {
      // The native form includes the required signed-confirmation checkbox.
      Object.entries(draft).forEach(([key, value]) => form.set(key, value));
      form.set("signedRequest", file);
      const response = await fetch("/api/maintenance", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("حُفظ الطلب وأصبحت المركبة قيد الصيانة");
      setDraft({ vehicleId: "", stationId: "", requestDate: today, department: "", odometerKm: "", requestedRepair: "", failureCause: "", driverName: "", centerManagerName: "", circleManagerName: "" });
      setFile(null);
      fileInput.value = "";
      await load(); onVehiclesChanged();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "تعذر حفظ الطلب"); }
    finally { setBusy(false); }
  };
  const closeRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch("/api/maintenance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, ...closeDraft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("أُغلق الطلب وعادت المركبة إلى الخدمة");
      setSelected(null); await load(); onVehiclesChanged();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "تعذر إغلاق الطلب"); }
    finally { setBusy(false); }
  };
  const openCount = data.requests.filter((row) => row.status === "open").length;
  return <div className="page-stack maintenance-page">
    <section className="panel maintenance-hero"><div className="round-icon large"><Wrench /></div><div><h2>طلبات صيانة المركبات</h2><p>كل طلب مرتبط بالمركبة ونسخة موقّعة من النموذج الورقي. تبقى المركبة خارج الخدمة حتى توثيق الاستلام.</p></div><strong>{openCount} قيد الصيانة</strong></section>
    <form className="panel maintenance-form" onSubmit={submit}>
      <div className="maintenance-heading"><div><h3><PlusCircle /> طلب صيانة جديد</h3><p>بيانات نموذج أمر إصلاح سيارة</p></div></div>
      <div className="maintenance-fields">
        <label>رقم المركبة *<select required value={draft.vehicleId} onChange={(event) => { const vehicle = data.vehicles.find((v) => String(v.id) === event.target.value); setDraft((previous) => ({ ...previous, vehicleId: event.target.value, stationId: vehicle?.station_id ? String(vehicle.station_id) : "" })); }}><option value="">اختاري المركبة</option>{data.vehicles.map((v) => <option key={v.id} value={v.id} disabled={!v.active || v.service_status !== "active"}>{v.plate_number} — {v.station_name || "غير محدد"}{v.service_status === "maintenance" ? " (قيد الصيانة)" : !v.active ? " (خارج الخدمة)" : ""}</option>)}</select></label>
        <label>المركز / الوحدة *<select required value={draft.stationId} onChange={(event) => setField("stationId", event.target.value)}><option value="">اختاري المركز</option>{data.stations.map((station) => <option value={station.id} key={station.id}>{station.name}</option>)}</select></label>
        <label>تاريخ الطلب *<input required type="date" value={draft.requestDate} onChange={(event) => setField("requestDate", event.target.value)} /></label>
        <label>القسم *<input required value={draft.department} onChange={(event) => setField("department", event.target.value)} /></label>
        <label>رقم العداد (كم) *<input required type="number" min="0" step="0.1" value={draft.odometerKm} onChange={(event) => setField("odometerKm", event.target.value)} /></label>
        <label>اسم السائق *<input required value={draft.driverName} onChange={(event) => setField("driverName", event.target.value)} /></label>
        <label>مدير المركز<input value={draft.centerManagerName} onChange={(event) => setField("centerManagerName", event.target.value)} /></label>
        <label>مدير الدائرة<input value={draft.circleManagerName} onChange={(event) => setField("circleManagerName", event.target.value)} /></label>
        <label className="wide">الإصلاح المطلوب *<textarea required rows={3} value={draft.requestedRepair} onChange={(event) => setField("requestedRepair", event.target.value)} /></label>
        <label className="wide">سبب العطل<textarea rows={2} value={draft.failureCause} onChange={(event) => setField("failureCause", event.target.value)} /></label>
        <label className="wide maintenance-upload"><FileText /><span><b>طلب الصيانة الورقي الموقّع *</b><small>PDF أو صورة JPG/PNG حتى 10 ميغابايت</small></span><input name="signedRequest" required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <label className="wide maintenance-confirm"><input name="signedConfirmed" value="yes" required type="checkbox" /> أؤكد أن الملف المرفق هو نسخة الطلب الورقي الموقّعة.</label>
      </div>
      <div className="maintenance-footer"><button className="primary" disabled={busy}><PlusCircle /> {busy ? "جارٍ الحفظ…" : "حفظ طلب الصيانة"}</button></div>
    </form>
    <section className="panel maintenance-results"><div className="maintenance-heading"><div><h3><Filter /> سجل طلبات الصيانة</h3><p>{data.requests.length} طلبًا مطابقًا للفلاتر</p></div><button type="button" className="ghost" onClick={load} disabled={loading}><RefreshCw /> تحديث</button></div>
      <div className="maintenance-filters">
        <label>من تاريخ<input type="date" value={filters.from} onChange={(event) => setFilter("from", event.target.value)} /></label>
        <label>إلى تاريخ<input type="date" value={filters.to} onChange={(event) => setFilter("to", event.target.value)} /></label>
        <label>رقم المركبة<select value={filters.vehicleId} onChange={(event) => setFilter("vehicleId", event.target.value)}><option value="">جميع المركبات</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></label>
        <label>المركز<select value={filters.stationId} onChange={(event) => setFilter("stationId", event.target.value)}><option value="">جميع المراكز</option>{data.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
        <button type="button" className="ghost" onClick={() => setFilters({ from: start, to: today, vehicleId: "", stationId: "" })}><X /> مسح</button>
      </div>
      <div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>المركبة</th><th>المركز</th><th>العداد</th><th>الإصلاح المطلوب</th><th>الحالة</th><th>التفاصيل</th></tr></thead><tbody>{data.requests.map((row) => <tr key={row.id}><td>#{row.id}</td><td>{row.request_date}</td><td><b>{row.plate_number}</b></td><td>{row.station_name}</td><td>{row.odometer_km}</td><td className="maintenance-summary">{row.requested_repair}</td><td><span className={row.status === "open" ? "maintenance-status open" : "maintenance-status closed"}>{row.status === "open" ? "قيد الصيانة" : "مكتمل"}</span></td><td><button type="button" className="ghost" onClick={() => setSelected(row)}><FileText /> فتح</button></td></tr>)}</tbody></table>{!loading && !data.requests.length && <p className="maintenance-empty">لا توجد طلبات ضمن الفترة والفلاتر المختارة.</p>}</div>
    </section>
    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><div className="incident-detail-modal maintenance-modal" role="dialog" aria-modal="true" aria-label={`طلب صيانة المركبة ${selected.plate_number}`} dir="rtl"><div className="modal-head"><div><h2>طلب صيانة #{selected.id} — {selected.plate_number}</h2><p>{selected.station_name} • {selected.request_date}</p></div><button className="ghost" onClick={() => setSelected(null)}><X /> إغلاق</button></div>
      <div className="maintenance-detail"><p><b>القسم:</b> {selected.department}</p><p><b>العداد:</b> {selected.odometer_km} كم</p><p><b>السائق:</b> {selected.driver_name}</p><p><b>مدير المركز:</b> {selected.center_manager_name || "—"}</p><p><b>مدير الدائرة:</b> {selected.circle_manager_name || "—"}</p><p><b>الإصلاح المطلوب:</b> {selected.requested_repair}</p><p><b>سبب العطل:</b> {selected.failure_cause || "—"}</p><a className="ghost maintenance-attachment" href={`/api/maintenance?attachment=${selected.id}`} target="_blank" rel="noopener noreferrer"><Download /> فتح الطلب الورقي الموقّع</a></div>
      {selected.status === "closed" ? <div className="maintenance-completed"><h3><ClipboardCheck /> أُنجزت الصيانة</h3><p><b>الإجراءات:</b> {selected.performed_work}</p>{([["maintenance_recommendation", "توجيهات الصيانة"], ["manager_recommendation", "توجيهات مدير الصيانة"], ["finance_recommendation", "توجيهات المدير المالي"], ["administrative_recommendation", "توجيهات المدير الإداري"]] as const).map(([key, label]) => selected[key] ? <p key={key}><b>{label}:</b> {selected[key]}</p> : null)}<small>استلمها {selected.received_by} بتاريخ {selected.received_at}</small></div> : data.canClose && <form className="maintenance-close" onSubmit={closeRequest}><h3>إغلاق طلب الصيانة وإعادة المركبة للخدمة</h3><div className="maintenance-fields"><label className="wide">الإجراءات التي تمت *<textarea required rows={3} value={closeDraft.performedWork} onChange={(event) => setCloseDraft({ ...closeDraft, performedWork: event.target.value })} /></label><label>تاريخ الاستلام *<input required type="date" value={closeDraft.receivedAt} onChange={(event) => setCloseDraft({ ...closeDraft, receivedAt: event.target.value })} /></label><label>اسم المستلم *<input required value={closeDraft.receivedBy} onChange={(event) => setCloseDraft({ ...closeDraft, receivedBy: event.target.value })} /></label>{([["maintenanceRecommendation", "توجيهات الصيانة"], ["managerRecommendation", "توجيهات مدير الصيانة"], ["financeRecommendation", "توجيهات المدير المالي"], ["administrativeRecommendation", "توجيهات المدير الإداري"]] as const).map(([key, label]) => <label key={key}>{label}<textarea value={closeDraft[key]} onChange={(event) => setCloseDraft({ ...closeDraft, [key]: event.target.value })} /></label>)}</div><button className="primary" disabled={busy}><ClipboardCheck /> {busy ? "جارٍ الإغلاق…" : "توثيق الاستلام وإعادة المركبة للخدمة"}</button></form>}
    </div></div>}
  </div>;
}
