/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Download,
  Printer,
  Eye,
  FileBarChart,
  Filter,
  Gauge,
  HeartPulse,
  Home,
  MapPin,
  Menu,
  LogOut,
  PlusCircle,
  Upload,
  Trash2,
  Pencil,
  RefreshCw,
  Route,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  UserCog,
  UserRound,
  UsersRound,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast, Toaster } from "sonner";
import MaintenanceView from "./maintenance-view";

type View =
  | "dashboard"
  | "new"
  | "records"
  | "capacity"
  | "coordination"
  | "fleet"
  | "maintenance"
  | "approvals"
  | "reports"
  | "users"
  | "settings";
type Incident = Record<string, string | number | null> & { id?: number };
type Dashboard = {
  summary: Record<string, number>;
  governorates: { name: string; value: number }[];
  categories: { name: string; value: number }[];
  timeline: { month: string; value: number }[];
  cases: { name: string; value: number }[];
  stations: {
    name: string;
    incidents: number;
    distance: number;
    response: number;
  }[];
};

const governors = ["غزة", "شمال غزة", "الوسطى", "خانيونس", "رفح"];
const stations = [
  "محطة غزة",
  "محطة شمال غزة",
  "محطة دير البلح",
  "محطة خانيونس",
  "محطة رفح",
];
const categories = ["Medical", "Trauma", "Other"];
const categoryArabic: Record<string, string> = {
  Medical: "حالات مرضية",
  Trauma: "إصابات",
  Other: "أخرى",
};
const urgencyArabic: Record<string, string> = {
  Red: "حمراء",
  Yellow: "صفراء",
  Green: "خضراء",
  "N/A": "غير مصنفة",
};
const palette = ["#c4172c", "#ef6a78", "#9c1d2d", "#f4a3ac", "#6e1423"];
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;
const emptyForm: Record<string, string> = {
  incidentNumber: "",
  incidentCode: "",
  beneficiaryName: "",
  gender: "",
  contact: "",
  age: "",
  urgency: "",
  category: "",
  caseType: "",
  pickupType: "",
  pickupLocation: "",
  pickupGovernorate: "",
  pickupMunicipality: "",
  pickupNeighborhood: "",
  dropoffType: "",
  dropoffLocation: "",
  shift: "",
  station: "",
  vehicle: "",
  kmStart: "",
  kmEnd: "",
  callDate: today,
  callTime: "",
  dispatchDate: today,
  dispatchTime: "",
  onSceneDate: today,
  arrivalTime: "",
  hospitalDate: today,
  hospitalTime: "",
  availableDate: today,
  clearTime: "",
  crew: "",
  dispatcherPrimary: "",
  dispatcherSecondary: "",
  emtDriver: "",
  emtLead: "",
  emtAssist: "",
  interventions: "",
  chiefComplaint: "",
  cancelled: "", patientDeceased: "", conflictRelated: "",
  oxygen: "", bvm: "", airway: "", cpr: "", aed: "", drugs: "",
  woundCare: "", tourniquet: "", immobilization: "", cervicalCollar: "",
  glucoseCheck: "", splinting: "", delivery: "",
  fuelLiters: "",
  notes: "",
};

export default function HomePage() {
  const [view, setView] = useState<View>("dashboard"),
    [mobile, setMobile] = useState(false),
    [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard>({
    summary: {},
    governorates: [],
    categories: [],
    timeline: [],
    cases: [],
    stations: [],
  });
  const [incidents, setIncidents] = useState<Incident[]>([]),
    [filters, setFilters] = useState({
      from: monthStart,
      to: today,
      governorate: "all",
      category: "all",
    }),
    [form, setForm] = useState(emptyForm);
  const [notifications, setNotifications] = useState<any[]>([]),
    [showNotifications, setShowNotifications] = useState(false),
    [pending, setPending] = useState<Incident[]>([]),
    [users, setUsers] = useState<any[]>([]),
    [currentRole, setCurrentRole] = useState("viewer"),
    [settingsData, setSettingsData] = useState<any>({
      stations: [],
      vehicles: [],
      staff: [],
      settings: [],
    });
  const query = useMemo(
    () => new URLSearchParams(filters).toString(),
    [filters],
  );
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        fetch(`/api/dashboard?${query}`),
        fetch(`/api/incidents?${query}`),
      ]);
      if (!d.ok || !r.ok) throw new Error();
      setDashboard(await d.json());
      setIncidents((await r.json()).incidents);
    } catch {
      toast.error("تعذر تحميل البيانات. حاولي مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }, [query]);
  const loadAux = useCallback(async () => {
    try {
      const [n, a, u, s] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/approvals"),
        fetch("/api/users"),
        fetch("/api/settings"),
      ]);
      if (n.ok) setNotifications((await n.json()).notifications);
      if (a.ok) setPending((await a.json()).incidents);
      if (u.ok) { const userData = await u.json(); setUsers(userData.users); setCurrentRole(userData.currentUser?.role || "viewer"); }
      if (s.ok) setSettingsData(await s.json());
    } catch {}
  }, []);
  useEffect(() => {
    refresh();
    loadAux();
  }, [refresh, loadAux]);
  const setField = (key: string, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "تعذر حفظ البلاغ");
      return;
    }
    toast.success(`تم حفظ البلاغ ${form.incidentNumber}`);
    setForm({ ...emptyForm, callDate: today });
    setView("dashboard");
    refresh();
  };
  const exportCsv = () => {
    const columns = [
      "incident_number",
      "beneficiary_name",
      "gender",
      "age",
      "urgency",
      "category",
      "case_type",
      "pickup_governorate",
      "station",
      "vehicle",
      "call_date",
      "call_time",
      "response_minutes",
      "distance_km",
    ];
    const csv = [
      columns.join(","),
      ...incidents.map((row) =>
        columns
          .map((c) => `"${String(row[c] ?? "").replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `EMS-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const nav = [
    { id: "dashboard", label: "الرئيسية", icon: Home },
    { id: "new", label: "تسجيل بلاغ", icon: PlusCircle },
    { id: "records", label: "سجل البلاغات", icon: ClipboardList },
    { id: "capacity", label: "القدرة التشغيلية", icon: Gauge },
    { id: "coordination", label: "إدخال التنسيقات", icon: Route },
    { id: "fleet", label: "المركبات والوقود", icon: Ambulance },
    { id: "maintenance", label: "صيانة المركبات", icon: Wrench },
    { id: "approvals", label: "اعتماد الإحصائيات", icon: ClipboardCheck },
    { id: "reports", label: "التقارير", icon: FileBarChart },
    { id: "users", label: "المستخدمون", icon: UserCog },
    { id: "settings", label: "الإعدادات", icon: Settings },
  ] as const;
  return (
    <div className="app-shell">
      <Toaster richColors position="top-center" />
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <HeartPulse size={29} />
          </div>
          <div>
            <strong>نظام EMS</strong>
            <span>الهلال الأحمر الفلسطيني</span>
          </div>
          <button className="close-side" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => {
                setView(item.id);
                setMobile(false);
              }}
            >
              <item.icon />
              <span>{item.label}</span>
              {view === item.id && <ChevronLeft className="nav-arrow" />}
            </button>
          ))}
        </nav>
        <div className="side-status">
          <span className="live-dot" />
          <div>
            <b>النظام متصل</b>
            <small>آخر مزامنة: الآن</small>
          </div>
        </div>
        <div className="side-user">
          <div className="avatar">وو</div>
          <div>
            <b>ولاء وهبة</b>
            <small>مدير النظام</small>
          </div>
          <ShieldCheck size={18} />
        </div>
        <a
          className="signout-link"
          href="/signout-with-chatgpt?return_to=/"
          target="_top"
        >
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </a>
      </aside>
      {mobile && (
        <button
          className="overlay"
          onClick={() => setMobile(false)}
          aria-label="إغلاق القائمة"
        />
      )}
      <main className="main">
        <header>
          <button className="menu-btn" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div>
            <h1>{nav.find((n) => n.id === view)?.label}</h1>
            <p>
              {view === "dashboard"
                ? "مؤشرات العمليات المعتمدة"
                : view === "new"
                  ? "إدخال بلاغ جديد وإرساله للاعتماد"
                  : view === "records"
                    ? "متابعة ومراجعة البلاغات المسجلة"
                    : view === "capacity"
                      ? "توزيع الموظفين والمركبات على المراكز والورديات"
                      : view === "coordination"
                        ? "تسجيل عمليات التنسيق وحركة المرضى والمركبات"
                        : view === "fleet"
                          ? "تعبئة الوقود وحركة الأسطول وربطها بالبلاغات"
                          : view === "maintenance"
                            ? "طلبات الصيانة والمرفقات وحالة المركبة"
                        : view === "approvals"
                          ? "مراجعة الإحصائيات قبل ظهورها في المؤشرات"
                          : view === "reports"
                            ? "تقارير مستقلة قابلة للطباعة والتصدير"
                            : view === "users"
                              ? "إدارة الحسابات والأدوار والصلاحيات"
                              : "إدارة القوائم الأساسية للنظام"}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={() => setShowNotifications((v) => !v)}
            >
              <Bell />
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="notification">
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>
            <button className="primary compact" onClick={() => setView("new")}>
              <PlusCircle /> بلاغ جديد
            </button>
          </div>
          {showNotifications && (
            <NotificationPanel
              items={notifications}
              close={() => setShowNotifications(false)}
              reload={loadAux}
            />
          )}
        </header>
        {view === "dashboard" && (
          <DashboardView
            dashboard={dashboard}
            filters={filters}
            setFilters={setFilters}
            loading={loading}
            refresh={refresh}
            onGovernorate={(name) =>
              setFilters((f) => ({ ...f, governorate: name }))
            }
          />
        )}{" "}
        {view === "new" && (
          <IncidentForm form={form} setField={setField} submit={submit} vehicles={settingsData.vehicles} />
        )}{" "}
        {view === "records" && (
          <Records
            incidents={incidents}
            loading={loading}
            onRefresh={refresh}
            filters={filters}
            setFilters={setFilters}
            isAdmin={currentRole === "admin"}
          />
        )}{" "}
        {view === "approvals" && (
          <Approvals
            items={pending}
            reload={() => {
              loadAux();
              refresh();
            }}
          />
        )}{" "}
        {view === "reports" && (
          <ReportsV2
            dashboard={dashboard}
            incidents={incidents}
            filters={filters}
            setFilters={setFilters}
            exportCsv={exportCsv}
            settingsData={settingsData}
          />
        )}{" "}
        {view === "users" && <UsersView users={users} reload={loadAux} />}{" "}
        {view === "settings" && (
          <SettingsView2 data={settingsData} reload={loadAux} />
        )}
        {view === "capacity" && <OperationalCapacity data={settingsData} />}
        {view === "coordination" && <CoordinationView />}
        {view === "fleet" && <FleetView staff={settingsData.staff} stationsData={settingsData.stations} onImported={loadAux} />}
        {view === "maintenance" && <MaintenanceView onVehiclesChanged={loadAux} />}
      </main>
    </div>
  );
}

function Filters({
  filters,
  setFilters,
  refresh,
}: {
  filters: any;
  setFilters: any;
  refresh?: () => void;
}) {
  return (
    <section className="filters-panel">
      <div className="filter-title">
        <div className="round-icon">
          <SlidersHorizontal />
        </div>
        <div>
          <b>فلاتر العرض</b>
          <span>حددي نطاق البيانات المطلوبة</span>
        </div>
      </div>
      <div className="filters-grid">
        <label>
          من تاريخ
          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters((f: any) => ({ ...f, from: e.target.value }))
            }
          />
        </label>
        <label>
          إلى تاريخ
          <input
            type="date"
            value={filters.to}
            onChange={(e) =>
              setFilters((f: any) => ({ ...f, to: e.target.value }))
            }
          />
        </label>
        <label>
          المحافظة
          <select
            value={filters.governorate}
            onChange={(e) =>
              setFilters((f: any) => ({ ...f, governorate: e.target.value }))
            }
          >
            <option value="all">جميع المحافظات</option>
            {governors.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          تصنيف الحالة
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((f: any) => ({ ...f, category: e.target.value }))
            }
          >
            <option value="all">جميع التصنيفات</option>
            {categories.map((x) => (
              <option key={x} value={x}>
                {categoryArabic[x]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-buttons">
        <button
          className="ghost"
          onClick={() =>
            setFilters({
              from: monthStart,
              to: today,
              governorate: "all",
              category: "all",
            })
          }
        >
          <RefreshCw /> إعادة ضبط
        </button>
        {refresh && (
          <button className="primary" onClick={refresh}>
            <Filter /> تطبيق
          </button>
        )}
      </div>
    </section>
  );
}

function DashboardView({
  dashboard,
  filters,
  setFilters,
  loading,
  refresh,
  onGovernorate,
}: {
  dashboard: Dashboard;
  filters: any;
  setFilters: any;
  loading: boolean;
  refresh: () => void;
  onGovernorate: (n: string) => void;
}) {
  const s = dashboard.summary || {};
  const cards = [
    {
      label: "إجمالي البلاغات",
      value: s.total || 0,
      sub: "بلاغ خلال الفترة",
      icon: Siren,
    },
    {
      label: "المستفيدون",
      value: s.beneficiaries || 0,
      sub: "مستفيد مسجل",
      icon: UsersRound,
    },
    {
      label: "متوسط الاستجابة",
      value: `${s.avgResponse || 0}`,
      unit: "دقيقة",
      sub: "من التحريك حتى الوصول",
      icon: Clock3,
    },
    {
      label: "المسافة المقطوعة",
      value: s.distance || 0,
      unit: "كم",
      sub: `${s.redCases || 0} حالة حمراء`,
      icon: Route,
    },
  ];
  return (
    <div className="page-stack">
      <Filters {...{ filters, setFilters, refresh }} />
      <section className="kpi-grid">
        {cards.map((c, i) => (
          <article
            className={`kpi ${loading ? "loading" : ""}`}
            key={c.label}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="kpi-disc">
              <c.icon />
              <strong>{c.value}</strong>
              {c.unit && <small>{c.unit}</small>}
            </div>
            <div>
              <span>{c.label}</span>
              <p>{c.sub}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="charts-grid">
        <article className="panel chart-wide">
          <PanelTitle
            icon={Activity}
            title="اتجاه البلاغات"
            subtitle="التغير الشهري خلال الفترة"
          />
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dashboard.timeline}>
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c4172c" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#c4172c"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#c4172c"
                  strokeWidth={3}
                  fill="url(#area)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <PanelTitle
            icon={Gauge}
            title="توزيع الحالات"
            subtitle="حسب التصنيف الرئيسي"
          />
          <div className="chart-body pie-wrap">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dashboard.categories}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={4}
                >
                  {dashboard.categories.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend">
              {dashboard.categories.map((x, i) => (
                <span key={x.name}>
                  <i style={{ background: palette[i % palette.length] }} />
                  {categoryArabic[x.name] || x.name}
                  <b>{x.value}</b>
                </span>
              ))}
            </div>
          </div>
        </article>
        <article className="panel chart-half">
          <PanelTitle
            icon={MapPin}
            title="البلاغات حسب المحافظة"
            subtitle="اضغطي على العمود لتصفية اللوحة"
          />
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={dashboard.governorates} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={75} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#c4172c"
                  radius={[8, 8, 8, 8]}
                  onClick={(x: any) => onGovernorate(x.name)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel chart-half">
          <PanelTitle
            icon={BarChart3}
            title="أعلى أنواع الحالات"
            subtitle="الأكثر تكرارًا خلال الفترة"
          />
          <div className="ranking">
            {dashboard.cases.map((x, i) => (
              <div key={x.name}>
                <span className="rank">{i + 1}</span>
                <div>
                  <b>{x.name}</b>
                  <span>
                    <i
                      style={{
                        width: `${Math.max(8, (x.value / (dashboard.cases[0]?.value || 1)) * 100)}%`,
                      }}
                    />
                  </span>
                </div>
                <strong>{x.value}</strong>
              </div>
            ))}
            {!dashboard.cases.length && <Empty />}
          </div>
        </article>
      </section>
    </div>
  );
}

function IncidentForm({
  form,
  setField,
  submit,
  vehicles,
}: {
  form: Record<string, string>;
  setField: (k: string, v: string) => void;
  submit: (e: React.FormEvent) => void;
  vehicles: any[];
}) {
  const field = (
    name: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label>
      {label}
      {required && <em>*</em>}
      <input
        type={type}
        value={form[name]}
        required={required}
        onChange={(e) => setField(name, e.target.value)}
      />
    </label>
  );
  const select = (
    name: string,
    label: string,
    options: string[],
    required = false,
    labels?: Record<string, string>,
  ) => (
    <label>
      {label}
      {required && <em>*</em>}
      <select
        value={form[name]}
        required={required}
        onChange={(e) => setField(name, e.target.value)}
      >
        <option value="">اختاري...</option>
        {options.map((x) => (
          <option key={x} value={x}>
            {labels?.[x] || x}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form className="incident-form" onSubmit={submit}>
      <section className="form-hero">
        <div className="round-icon large">
          <Ambulance />
        </div>
        <div>
          <h2>بيانات البلاغ</h2>
          <p>الحقول المعلّمة بنجمة مطلوبة للحفظ</p>
        </div>
        <div className="auto-number">
          <span>رقم البلاغ</span>
          <input
            placeholder="EMS-2026-0001"
            value={form.incidentNumber}
            onChange={(e) => setField("incidentNumber", e.target.value)}
            required
          />
        </div>
      </section>
      <FormSection icon={UserRound} title="بيانات المستفيد">
        <div className="form-grid cols-4">
          {field("beneficiaryName", "الاسم الكامل")}
          {select("gender", "الجنس", ["Male", "Female", "Unknown"], true, {
            Male: "ذكر",
            Female: "أنثى",
            Unknown: "غير معروف",
          })}
          {field("age", "العمر", "number")}
          {field("contact", "رقم التواصل", "tel")}
          {select(
            "urgency",
            "درجة الأولوية",
            ["Red", "Yellow", "Green", "N/A"],
            true,
            urgencyArabic,
          )}
        </div>
      </FormSection>
      <FormSection icon={Siren} title="تصنيف الحالة">
        <div className="form-grid cols-3">
          {select(
            "category",
            "التصنيف الرئيسي",
            categories,
            true,
            categoryArabic,
          )}
          {field("caseType", "نوع الحالة", "text", true)}
          {field("incidentCode", "رمز الحالة")}
        </div>
      </FormSection>
      <FormSection icon={MapPin} title="موقع الالتقاط والتسليم">
        <div className="form-grid cols-4">
          {select("pickupGovernorate", "المحافظة", governors, true)}
          {field("pickupMunicipality", "البلدية")}
          {field("pickupNeighborhood", "الحي")}
          {select("pickupType", "نوع موقع الالتقاط", [
            "House",
            "Shelter/tent",
            "Street",
            "Field",
            "Clinic (Public)",
          ])}
          {field("pickupLocation", "وصف الموقع")}
          {select("dropoffType", "نوع جهة التسليم", [
            "Hospital (Public)",
            "Hospital (Private)",
            "Hospital (Field)",
            "No transport (no need)",
          ])}
          {field("dropoffLocation", "جهة التسليم")}
        </div>
      </FormSection>
      <FormSection icon={Ambulance} title="المحطة والمركبة">
        <div className="form-grid cols-4">
          {select("station", "المحطة", stations, true)}
          {select("shift", "الوردية", ["A", "B", "C"], true)}
          <label>رقم المركبة<select value={form.vehicle} onChange={e=>setField("vehicle",e.target.value)}><option value="">بدون مركبة</option>{form.vehicle && !(vehicles||[]).some((v:any)=>v.plate_number===form.vehicle) && <option value={form.vehicle}>{form.vehicle} (رقم سابق)</option>}{(vehicles||[]).filter((v:any)=>v.active!==0).map((v:any)=><option key={v.id} value={v.plate_number}>{v.plate_number} — {v.fuel_type||"وقود غير محدد"}</option>)}</select></label>
          {field("crew", "أفراد الطاقم")}
          {field("kmStart", "عداد البداية", "number")}
          {field("kmEnd", "عداد النهاية", "number")}
          {field("fuelLiters", "الوقود باللتر", "number")}
        </div>
      </FormSection>
      <FormSection icon={Clock3} title="التوقيتات">
        <div className="form-grid cols-4">
          {field("callDate", "تاريخ البلاغ", "date", true)}
          {field("callTime", "وقت البلاغ", "time", true)}
          {field("dispatchDate", "تاريخ التحريك", "date")}
          {field("dispatchTime", "وقت التحريك", "time")}
          {field("onSceneDate", "تاريخ الوصول للموقع", "date")}
          {field("arrivalTime", "وقت الوصول للموقع", "time")}
          {field("hospitalDate", "تاريخ الوصول للمستشفى", "date")}
          {field("hospitalTime", "وقت الوصول للمستشفى", "time")}
          {field("availableDate", "تاريخ الجاهزية", "date")}
          {field("clearTime", "وقت الجاهزية", "time")}
        </div>
      </FormSection>
      <FormSection icon={UsersRound} title="طاقم البلاغ">
        <div className="form-grid cols-5">
          {field("dispatcherPrimary", "المستقبل الرئيسي")}
          {field("dispatcherSecondary", "المستقبل المساند")}
          {field("emtDriver", "المسعف السائق")}
          {field("emtLead", "مسعف قائد")}
          {field("emtAssist", "مسعف مساعد")}
        </div>
      </FormSection>
      <FormSection icon={Activity} title="التدخلات والملاحظات">
        <div className="form-grid cols-3">
          {field("chiefComplaint", "الشكوى الرئيسية")}
          <label>
            التدخلات الطبية
            <textarea
              value={form.interventions}
              onChange={(e) => setField("interventions", e.target.value)}
              placeholder="الإسعافات أو الإجراءات التي تم تنفيذها"
            />
          </label>
          <label>
            ملاحظات
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="أي تفاصيل إضافية عن البلاغ"
            />
          </label>
        </div>
        <div className="check-grid">
          {[["cancelled","بلاغ ملغي"],["patientDeceased","وفاة المستفيد"],["conflictRelated","مرتبط بالنزاع"],["oxygen","أكسجين"],["bvm","BVM"],["airway","مجرى هوائي"],["cpr","إنعاش CPR"],["aed","جهاز AED"],["drugs","أدوية"],["woundCare","عناية بالجروح"],["tourniquet","عاصبة"],["immobilization","تثبيت"],["cervicalCollar","طوق رقبة"],["glucoseCheck","فحص سكر"],["splinting","جبيرة"],["delivery","ولادة"]].map(([key,label])=>(
            <label className="check-card" key={key}><input type="checkbox" checked={form[key]==="1"} onChange={e=>setField(key,e.target.checked?"1":"")} /><span>{label}</span></label>
          ))}
        </div>
      </FormSection>
      <div className="form-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => location.reload()}
        >
          <X /> إلغاء
        </button>
        <button className="primary" type="submit">
          <Save /> حفظ البلاغ
        </button>
      </div>
    </form>
  );
}

function Records({
  incidents,
  loading,
  onRefresh,
  filters,
  setFilters,
  isAdmin,
}: {
  incidents: Incident[];
  loading: boolean;
  onRefresh: () => void;
  filters: {from:string;to:string;governorate:string;category:string};
  setFilters: React.Dispatch<React.SetStateAction<{from:string;to:string;governorate:string;category:string}>>;
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [recordFilters, setRecordFilters] = useState({ station:"all", shift:"all", urgency:"all", quality:"all" });
  const [selected, setSelected] = useState<any>(null);
  const [incidentDraft, setIncidentDraft] = useState<any>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const rows = incidents.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(search.toLowerCase()) &&
    (recordFilters.station === "all" || x.station === recordFilters.station) &&
    (recordFilters.shift === "all" || x.shift === recordFilters.shift) &&
    (recordFilters.urgency === "all" || x.urgency === recordFilters.urgency) &&
    (recordFilters.quality === "all" || x.data_quality_status === recordFilters.quality)
  );
  const openIncident = (x: any) => {
    setSelected(x);
    setIncidentDraft({
      id: x.id,
      beneficiaryName: x.beneficiary_name || "",
      contact: x.contact || "",
      gender: x.gender || "Male",
      age: x.age || "",
      urgency: x.urgency || "Green",
      category: x.category || "Medical",
      caseType: x.case_type || "",
      pickupType: x.pickup_type || "",
      pickupLocation: x.pickup_location || "",
      pickupGovernorate: x.pickup_governorate || "غزة",
      pickupMunicipality: x.pickup_municipality || "",
      pickupNeighborhood: x.pickup_neighborhood || "",
      dropoffType: x.dropoff_type || "",
      dropoffLocation: x.dropoff_location || "",
      station: x.station || "",
      shift: x.shift || "A",
      vehicle: x.vehicle || "",
      callDate: x.call_date || today,
      callTime: x.call_time || "",
      dispatchDate: x.dispatch_date || x.call_date || today,
      dispatchTime: x.dispatch_time || "",
      onSceneDate: x.on_scene_date || x.call_date || today,
      arrivalTime: x.arrival_time || "",
      hospitalDate: x.hospital_date || x.call_date || today,
      hospitalTime: x.hospital_time || "",
      availableDate: x.available_date || x.call_date || today,
      clearTime: x.clear_time || "",
      kmStart: x.km_start || "",
      kmEnd: x.km_end || "",
      dispatcherPrimary: x.dispatcher_primary || "",
      dispatcherSecondary: x.dispatcher_secondary || "",
      emtDriver: x.emt_driver || "",
      emtLead: x.emt_lead || "",
      emtAssist: x.emt_assist || "",
      chiefComplaint: x.chief_complaint || "",
      fuelLiters: x.fuel_liters || "",
      cancelled: x.cancelled ? "1" : "",
      patientDeceased: x.patient_deceased ? "1" : "",
      conflictRelated: x.conflict_related ? "1" : "",
      oxygen: x.oxygen ? "1" : "", bvm: x.bvm ? "1" : "", airway: x.airway ? "1" : "", cpr: x.cpr ? "1" : "", aed: x.aed ? "1" : "", drugs: x.drugs ? "1" : "",
      woundCare: x.wound_care ? "1" : "", tourniquet: x.tourniquet ? "1" : "", immobilization: x.immobilization ? "1" : "", cervicalCollar: x.cervical_collar ? "1" : "",
      glucoseCheck: x.glucose_check ? "1" : "", splinting: x.splinting ? "1" : "", delivery: x.delivery ? "1" : "",
      notes: x.notes || "",
    });
  };
  const updateIncident = async () => { setSaving(true); try { const r=await fetch("/api/incidents",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(incidentDraft)}); const v=await r.json(); if(!r.ok) throw Error(v.error||"تعذر تعديل البلاغ"); toast.success("تم تعديل البلاغ وإعادته للاعتماد"); setSelected(null); setEditing(false); onRefresh(); } catch(e) { toast.error(String(e).replace(/^Error: /,"")); } finally { setSaving(false); } };
  const deleteIncident = async () => { if(!isAdmin || !selected) return; if(!window.confirm(`هل تريدين حذف البلاغ ${selected.incident_number} نهائيًا؟`)) return; setSaving(true); try { const r=await fetch(`/api/incidents?id=${selected.id}`,{method:"DELETE"}); const v=await r.json(); if(!r.ok) throw Error(v.error||"تعذر حذف البلاغ"); toast.success("تم حذف البلاغ"); setSelected(null); onRefresh(); } catch(e) { toast.error(String(e).replace(/^Error: /,"")); } finally { setSaving(false); } };
  return (
    <div className="page-stack">
      <section className="toolbar panel">
        <div className="search">
          <Search />
          <input
            placeholder="ابحثي برقم البلاغ أو المستفيد أو المحطة"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="ghost" onClick={onRefresh}>
          <RefreshCw /> تحديث
        </button>
      </section>
      <section className="record-filter-bar panel" dir="rtl">
        <div className="filter-title"><span className="filter-mark"><SlidersHorizontal /></span><span><b>فلاتر سجل البلاغات</b><small>حددي الفترة والتصنيف ونطاق العمل</small></span><span className="filter-count">{rows.length} نتيجة</span></div>
        <div className="record-filter-fields">
          <label>من تاريخ<input type="date" value={filters.from} max={filters.to} onChange={e=>setFilters(v=>({...v,from:e.target.value}))}/></label>
          <label>إلى تاريخ<input type="date" value={filters.to} min={filters.from} onChange={e=>setFilters(v=>({...v,to:e.target.value}))}/></label>
          <label>المحافظة<select value={filters.governorate} onChange={e=>setFilters(v=>({...v,governorate:e.target.value}))}><option value="all">كل المحافظات</option>{governors.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>التصنيف<select value={filters.category} onChange={e=>setFilters(v=>({...v,category:e.target.value}))}><option value="all">كل التصنيفات</option>{categories.map(x=><option key={x} value={x}>{categoryArabic[x]}</option>)}</select></label>
          <label>المحطة<select value={recordFilters.station} onChange={e=>setRecordFilters({...recordFilters,station:e.target.value})}><option value="all">كل المحطات</option>{[...new Set(incidents.map(x=>String(x.station)))].filter(Boolean).map(x=><option key={x}>{x}</option>)}</select></label>
          <label>الوردية<select value={recordFilters.shift} onChange={e=>setRecordFilters({...recordFilters,shift:e.target.value})}><option value="all">كل الورديات</option>{["A","B","C"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>الأولوية<select value={recordFilters.urgency} onChange={e=>setRecordFilters({...recordFilters,urgency:e.target.value})}><option value="all">كل الأولويات</option>{["Red","Yellow","Green","N/A"].map(x=><option key={x} value={x}>{urgencyArabic[x]}</option>)}</select></label>
          <label>حالة التدقيق<select value={recordFilters.quality} onChange={e=>setRecordFilters({...recordFilters,quality:e.target.value})}><option value="all">جميع الحالات</option><option value="ok">سليم</option><option value="review">يحتاج مراجعة</option></select></label>
        </div>
        <div className="record-filter-actions"><button className="ghost" onClick={()=>{setRecordFilters({station:"all",shift:"all",urgency:"all",quality:"all"});setFilters({from:monthStart,to:today,governorate:"all",category:"all"});setSearch("")}}><RefreshCw /> إعادة ضبط الفلاتر</button></div>
      </section>
      <section className="panel table-panel">
        <PanelTitle
          icon={ClipboardList}
          title="البلاغات المسجلة"
          subtitle={`${rows.length} بلاغًا ضمن الفلاتر الحالية`}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم البلاغ</th>
                <th>التاريخ</th>
                <th>المستفيد</th>
                <th>الحالة</th>
                <th>الأولوية</th>
                <th>المحافظة</th>
                <th>المحطة</th>
                <th>الاستجابة</th>
                <th>التدقيق</th>
                <th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={String(x.id)}>
                  <td>
                    <b>{String(x.incident_number)}</b>
                  </td>
                  <td>{String(x.call_date)}</td>
                  <td>{String(x.beneficiary_name || "—")}</td>
                  <td>{String(x.case_type)}</td>
                  <td>
                    <span
                      className={`priority p-${String(x.urgency).toLowerCase()}`}
                    >
                      {urgencyArabic[String(x.urgency)] || String(x.urgency)}
                    </span>
                  </td>
                  <td>{String(x.pickup_governorate)}</td>
                  <td>{String(x.station)}</td>
                  <td>{String(x.response_minutes || 0)} دقيقة</td>
                  <td><span className={`quality-badge ${x.data_quality_status === "review" ? "review" : "ok"}`}>{x.data_quality_status === "review" ? "يحتاج مراجعة" : "سليم"}</span></td>
                  <td>
                    <button
                      className="table-icon-action"
                      onClick={() => openIncident(x)}
                    >
                      <Eye /> فتح
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td colSpan={10}>
                    <Empty />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
          <section
            className="incident-detail-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>تفاصيل البلاغ {selected.incident_number}</h2>
                <p>عرض كامل مع تعديل حسب صلاحية الحساب</p>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>
            <div className="incident-detail-grid">
              {[
                ["beneficiaryName", "اسم المستفيد", "text"],
                ["contact", "رقم التواصل", "text"],
                [
                  "gender",
                  "الجنس",
                  "select",
                  [
                    ["Male", "ذكر"],
                    ["Female", "أنثى"],
                  ],
                ],
                ["age", "العمر", "number"],
                [
                  "urgency",
                  "الأولوية",
                  "select",
                  [
                    ["Red", "حمراء"],
                    ["Yellow", "صفراء"],
                    ["Green", "خضراء"],
                  ],
                ],
                [
                  "category",
                  "التصنيف",
                  "select",
                  categories.map((x) => [x, categoryArabic[x]]),
                ],
                ["caseType", "نوع الحالة", "text"],
                ["pickupLocation", "موقع الالتقاط", "text"],
                ["pickupMunicipality", "البلدية", "text"],
                ["pickupNeighborhood", "الحي", "text"],
                ["dropoffLocation", "جهة التسليم", "text"],
                [
                  "pickupGovernorate",
                  "المحافظة",
                  "select",
                  governors.map((x) => [x, x]),
                ],
                ["station", "المحطة", "select", stations.map((x) => [x, x])],
                ["shift", "الوردية", "select", ["A","B","C"].map((x) => [x, x])],
                ["vehicle", "المركبة", "text"],
                ["callDate", "التاريخ", "date"],
                ["callTime", "وقت البلاغ", "time"],
                ["dispatchDate", "تاريخ التحريك", "date"],
                ["dispatchTime", "الانطلاق", "time"],
                ["onSceneDate", "تاريخ الوصول للموقع", "date"],
                ["arrivalTime", "الوصول", "time"],
                ["hospitalDate", "تاريخ المستشفى", "date"],
                ["hospitalTime", "وقت المستشفى", "time"],
                ["availableDate", "تاريخ الجاهزية", "date"],
                ["clearTime", "الجاهزية", "time"],
                ["kmStart", "عداد البداية", "number"],
                ["kmEnd", "عداد النهاية", "number"],
                ["fuelLiters", "الوقود", "number"],
                ["dispatcherPrimary", "المستقبل الرئيسي", "text"],
                ["dispatcherSecondary", "المستقبل المساند", "text"],
                ["emtDriver", "المسعف السائق", "text"],
                ["emtLead", "مسعف قائد", "text"],
                ["emtAssist", "مسعف مساعد", "text"],
                ["chiefComplaint", "الشكوى الرئيسية", "text"],
                ["notes", "ملاحظات", "text"],
              ].map(([key, label, type, options]: any) => (
                <label key={key}>
                  {label}
                  {type === "select" ? (
                    <select
                      disabled={!editing}
                      value={incidentDraft[key]}
                      onChange={(e) =>
                        setIncidentDraft({ ...incidentDraft, [key]: e.target.value })
                      }
                    >
                      {options.map((o: any) => (
                        <option key={o[0]} value={o[0]}>
                          {o[1]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      disabled={!editing}
                      type={type}
                      value={incidentDraft[key]}
                      onChange={(e) =>
                        setIncidentDraft({ ...incidentDraft, [key]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="check-grid modal-checks">
              {[["cancelled","بلاغ ملغي"],["patientDeceased","وفاة المستفيد"],["conflictRelated","مرتبط بالنزاع"],["oxygen","أكسجين"],["bvm","BVM"],["airway","مجرى هوائي"],["cpr","إنعاش CPR"],["aed","AED"],["drugs","أدوية"],["woundCare","عناية بالجروح"],["tourniquet","عاصبة"],["immobilization","تثبيت"],["cervicalCollar","طوق رقبة"],["glucoseCheck","فحص سكر"],["splinting","جبيرة"],["delivery","ولادة"]].map(([key,label])=>(
                <label className="check-card" key={key}><input disabled={!editing} type="checkbox" checked={incidentDraft[key]==="1"} onChange={e=>setIncidentDraft({...incidentDraft,[key]:e.target.checked?"1":""})}/><span>{label}</span></label>
              ))}
            </div>
            {selected.data_quality_status === "review" && <div className="quality-warning"><AlertTriangle /> <span><b>هذا السجل يحتاج مراجعة</b>{selected.data_quality_notes && <small>{selected.data_quality_notes}</small>}</span></div>}
            <div className="modal-actions">
              <button className="ghost" onClick={() => setSelected(null)}>
                إغلاق
              </button>
              {isAdmin && <button className="danger-button" onClick={deleteIncident} disabled={saving}><Trash2/> حذف البلاغ</button>}
              {editing ? <button className="primary" onClick={updateIncident} disabled={saving}><Save/> حفظ التعديل</button> : <button className="primary" onClick={() => setEditing(true)}><Pencil/> تعديل البلاغ</button>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Reports({
  dashboard,
  incidents,
  filters,
  setFilters,
  exportCsv,
}: {
  dashboard: Dashboard;
  incidents: Incident[];
  filters: any;
  setFilters: any;
  exportCsv: () => void;
}) {
  return (
    <div className="page-stack">
      <section className="reports-hero">
        <div>
          <div className="round-icon large">
            <FileBarChart />
          </div>
          <div>
            <h2>مركز التقارير</h2>
            <p>تقارير يومية وشهرية وموحّدة مبنية مباشرة على البلاغات</p>
          </div>
        </div>
        <button className="primary" onClick={exportCsv}>
          <Download /> تصدير Excel
        </button>
      </section>
      <Filters {...{ filters, setFilters }} />
      <section className="report-cards">
        {[
          {
            t: "التقرير التشغيلي",
            d: "البلاغات والاستجابة والحالات",
            i: Activity,
          },
          {
            t: "تقرير المستفيدين",
            d: "العمر والجنس ودرجة الأولوية",
            i: UsersRound,
          },
          { t: "تقرير المحطات", d: "مقارنة الأداء بين المحطات", i: MapPin },
          { t: "تقرير الأسطول", d: "المسافات والوقود والمركبات", i: Ambulance },
        ].map((r) => (
          <article key={r.t}>
            <div className="report-icon">
              <r.i />
            </div>
            <div>
              <b>{r.t}</b>
              <p>{r.d}</p>
            </div>
            <button onClick={() => window.print()}>
              <Download />
            </button>
          </article>
        ))}
      </section>
      <section className="panel table-panel">
        <PanelTitle
          icon={FileBarChart}
          title="ملخص المحطات"
          subtitle="قراءة تشغيلية للفترة المحددة"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المحطة</th>
                <th>عدد البلاغات</th>
                <th>المسافة (كم)</th>
                <th>متوسط الاستجابة</th>
                <th>النسبة من الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.stations.map((x) => (
                <tr key={x.name}>
                  <td>
                    <b>{x.name}</b>
                  </td>
                  <td>{x.incidents}</td>
                  <td>{x.distance || 0}</td>
                  <td>{x.response || 0} دقيقة</td>
                  <td>
                    <div className="progress">
                      <i
                        style={{
                          width: `${(x.incidents / (dashboard.summary.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!dashboard.stations.length && (
                <tr>
                  <td colSpan={5}>
                    <Empty />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function SettingsView() {
  return (
    <div className="settings-grid">
      {[
        { t: "المحطات", d: "إضافة المحطات وربطها بالمحافظات", i: MapPin },
        { t: "المركبات", d: "بيانات سيارات الإسعاف وحالتها", i: Ambulance },
        { t: "الطاقم", d: "المسعفون والمؤهلات والمحطات", i: UsersRound },
        {
          t: "المستخدمون والصلاحيات",
          d: "مدير النظام، موظف مركزي، ومدخل محطة",
          i: ShieldCheck,
        },
      ].map((x) => (
        <article className="panel setting-card" key={x.t}>
          <div className="round-icon">
            <x.i />
          </div>
          <div>
            <b>{x.t}</b>
            <p>{x.d}</p>
          </div>
          <button className="ghost">
            إدارة <ChevronLeft />
          </button>
        </article>
      ))}
    </div>
  );
}
function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <div className="section-heading">
        <div>
          <Icon />
        </div>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}
function PanelTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="panel-title">
      <div className="mini-icon">
        <Icon />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
function Empty() {
  return (
    <div className="empty">
      <ClipboardList />
      <b>لا توجد بيانات ضمن النطاق الحالي</b>
      <span>أضيفي بلاغًا جديدًا أو غيّري الفلاتر</span>
    </div>
  );
}

function NotificationPanel({
  items,
  close,
  reload,
}: {
  items: any[];
  close: () => void;
  reload: () => void;
}) {
  const mark = async (id?: number, all = false) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { id }),
    });
    reload();
  };
  return (
    <aside className="notifications-panel">
      <div className="notice-head">
        <div>
          <b>الإشعارات</b>
          <span>{items.filter((x) => !x.is_read).length} غير مقروء</span>
        </div>
        <button onClick={close}>
          <X />
        </button>
      </div>
      <button className="mark-all" onClick={() => mark(undefined, true)}>
        تحديد الكل كمقروء
      </button>
      <div className="notice-list">
        {items.map((n) => (
          <button
            key={n.id}
            className={n.is_read ? "read" : ""}
            onClick={() => mark(n.id)}
          >
            <span className={`notice-icon ${n.type}`}>
              <Bell />
            </span>
            <div>
              <b>{n.title}</b>
              <p>{n.message}</p>
              <small>{String(n.created_at || "").slice(0, 16)}</small>
            </div>
          </button>
        ))}
        {!items.length && <Empty />}
      </div>
    </aside>
  );
}

function Approvals({
  items,
  reload,
}: {
  items: Incident[];
  reload: () => void;
}) {
  const decide = async (id: number, decision: "approved" | "rejected") => {
    let reason = "";
    if (decision === "rejected") {
      reason = prompt("اكتبي سبب الرفض أو الملاحظة المطلوبة") || "";
      if (!reason) return;
    }
    const r = await fetch("/api/approvals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, decision, reason }),
    });
    const data = await r.json();
    if (!r.ok) {
      toast.error(data.error);
      return;
    }
    toast.success(
      decision === "approved"
        ? "تم اعتماد الإحصائية"
        : "تمت إعادة الإحصائية للتصحيح",
    );
    reload();
  };
  return (
    <div className="page-stack">
      <section className="approval-summary">
        <div className="round-icon large">
          <ClipboardCheck />
        </div>
        <div>
          <h2>قائمة الاعتماد</h2>
          <p>لن تظهر البلاغات في الرئيسية والتقارير قبل اعتمادها</p>
        </div>
        <strong>
          {items.length}
          <small>بانتظار المراجعة</small>
        </strong>
      </section>
      <section className="approval-list">
        {items.map((x) => (
          <article className="panel approval-card" key={String(x.id)}>
            <div className="approval-main">
              <span className={`priority p-${String(x.urgency).toLowerCase()}`}>
                {urgencyArabic[String(x.urgency)] || String(x.urgency)}
              </span>
              <div>
                <b>{String(x.incident_number)}</b>
                <p>
                  {String(x.case_type)} · {String(x.pickup_governorate)} ·{" "}
                  {String(x.station)}
                </p>
              </div>
            </div>
            <dl>
              <div>
                <dt>التاريخ</dt>
                <dd>
                  {String(x.call_date)} — {String(x.call_time)}
                </dd>
              </div>
              <div>
                <dt>المستفيد</dt>
                <dd>{String(x.beneficiary_name || "غير مسجل")}</dd>
              </div>
              <div>
                <dt>مدخل البيانات</dt>
                <dd>{String(x.created_by || "—")}</dd>
              </div>
            </dl>
            <div className="approval-actions">
              <button
                className="reject"
                onClick={() => decide(Number(x.id), "rejected")}
              >
                <XCircle /> رفض وإعادة
              </button>
              <button
                className="approve"
                onClick={() => decide(Number(x.id), "approved")}
              >
                <CheckCircle2 /> اعتماد
              </button>
            </div>
          </article>
        ))}
        {!items.length && (
          <section className="panel">
            <Empty />
          </section>
        )}
      </section>
    </div>
  );
}

function UsersView({ users, reload }: { users: any[]; reload: () => void }) {
  const [open, setOpen] = useState(false),
    [editingId, setEditingId] = useState<number | null>(null),
    [draft, setDraft] = useState({
      fullName: "",
      email: "",
      role: "station_user",
      station: "",
    });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/users", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...draft } : draft),
    });
    const d = await r.json();
    if (!r.ok) {
      toast.error(d.error);
      return;
    }
    toast.success(
      editingId ? "تم تحديث المستخدم والصلاحيات" : "تم إنشاء المستخدم",
    );
    setOpen(false);
    setEditingId(null);
    setDraft({ fullName: "", email: "", role: "station_user", station: "" });
    reload();
  };
  const edit = (u: any) => {
    setDraft({
      fullName: u.full_name || "",
      email: u.email || "",
      role: u.role || "viewer",
      station: u.station || "",
    });
    setEditingId(Number(u.id));
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggle = async (u: any) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: u.id, active: !u.active }),
    });
    reload();
  };
  const roleLabel: Record<string, string> = {
    admin: "مدير النظام",
    central_user: "موظف مركزي",
    station_user: "مدخل محطة",
    viewer: "مشاهد تقارير",
  };
  return (
    <div className="page-stack">
      <section className="toolbar panel">
        <div>
          <h2>المستخدمون والصلاحيات</h2>
          <p>يُنشئ مدير النظام الحساب ويحدد نطاق الوصول</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setEditingId(null);
            setDraft({
              fullName: "",
              email: "",
              role: "station_user",
              station: "",
            });
            setOpen((v) => !v);
          }}
        >
          <PlusCircle /> إضافة مستخدم
        </button>
      </section>
      {open && (
        <form className="panel user-form" onSubmit={save}>
          <div className="user-form-heading">
            <b>{editingId ? "تعديل المستخدم" : "إضافة مستخدم جديد"}</b>
            <span>
              {editingId
                ? "عدّلي بيانات الحساب وصلاحيته ونطاق عمله"
                : "أدخلي بيانات الحساب وحددي نطاق عمله"}
            </span>
          </div>
          <label>
            الاسم الكامل
            <input
              required
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
            />
          </label>
          <label>
            البريد الإلكتروني
            <input
              required
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </label>
          <label>
            الصلاحية
            <select
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            >
              <option value="station_user">مدخل محطة</option>
              <option value="central_user">موظف مركزي</option>
              <option value="viewer">مشاهد تقارير</option>
              <option value="admin">مدير النظام</option>
            </select>
          </label>
          <label>
            المحطة
            <select
              value={draft.station}
              onChange={(e) => setDraft({ ...draft, station: e.target.value })}
            >
              <option value="">كل المحطات</option>
              {stations.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <button className="primary">
            <Save /> {editingId ? "حفظ التعديلات" : "حفظ المستخدم"}
          </button>
          {editingId && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
            >
              <X /> إلغاء
            </button>
          )}
        </form>
      )}
      <section className="panel table-panel">
        <PanelTitle
          icon={UserCog}
          title="الحسابات المسجلة"
          subtitle={`${users.length} مستخدمًا`}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد</th>
                <th>الصلاحية</th>
                <th>نطاق العمل</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.full_name}</b>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="role-badge">
                      {roleLabel[u.role] || u.role}
                    </span>
                  </td>
                  <td>{u.station || "جميع المحطات"}</td>
                  <td>
                    <span className={u.active ? "state active" : "state"}>
                      {u.active ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="table-action edit"
                        onClick={() => edit(u)}
                      >
                        <UserCog /> تعديل
                      </button>
                      <button
                        className="table-action"
                        onClick={() => toggle(u)}
                      >
                        {u.active ? "إيقاف" : "تفعيل"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="permissions panel">
        <h3>مصفوفة الصلاحيات</h3>
        <div className="permission-grid">
          <b>الدور</b>
          <b>إدخال</b>
          <b>اعتماد</b>
          <b>تقارير</b>
          <b>إعدادات</b>
          {[
            ["مدير النظام", "✓", "✓", "✓", "✓"],
            ["موظف مركزي", "✓", "—", "✓", "—"],
            ["مدخل محطة", "✓", "—", "محطته", "—"],
            ["مشاهد تقارير", "—", "—", "✓", "—"],
          ].flatMap((r, i) =>
            r.map((c, j) => (
              <span key={`${i}-${j}`} className={c === "✓" ? "yes" : ""}>
                {c}
              </span>
            )),
          )}
        </div>
      </section>
    </div>
  );
}

function OperationalCapacity({ data }: { data: any }) {
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState(monthStart),
    [to, setTo] = useState(today);
  const [items, setItems] = useState<any[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [stationFilter, setStationFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>({
    staffId: "",
    stationId: "",
    shift: "A",
    dutyType: "دوام مركز",
    vehicleId: "",
    workLocation: "",
    attendanceStatus: "حاضر",
    notes: "",
  });
  const load = useCallback(async () => {
    const r = await fetch(`/api/operational-capacity?from=${from}&to=${to}`);
    if (r.ok) setItems((await r.json()).assignments);
  }, [from, to]);
  useEffect(() => {
    load();
  }, [load]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/operational-capacity", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, id: editingId, workDate: date }),
    });
    const result = await r.json();
    if (!r.ok) return toast.error(result.error || "تعذر حفظ التوزيع");
    toast.success(
      editingId ? "تم تعديل التكليف" : "تمت إضافة الموظف إلى القدرة التشغيلية",
    );
    setEditingId(null);
    setDraft({
      staffId: "",
      stationId: "",
      shift: "A",
      dutyType: "دوام مركز",
      vehicleId: "",
      workLocation: "",
      attendanceStatus: "حاضر",
      notes: "",
    });
    load();
  };
  const editAssignment = (x: any) => {
    setEditingId(x.id);
    setDate(x.work_date);
    setDraft({
      staffId: String(x.staff_id),
      stationId: String(x.station_id),
      shift: x.shift,
      dutyType: x.duty_type,
      vehicleId: x.vehicle_id ? String(x.vehicle_id) : "",
      workLocation: x.work_location || "",
      attendanceStatus: x.attendance_status,
      notes: x.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteAssignment = async (id: number) => {
    if (!confirm("هل تريدين حذف هذا التكليف؟")) return;
    const r = await fetch(`/api/operational-capacity?id=${id}`, {
      method: "DELETE",
    });
    const result = await r.json();
    if (!r.ok) return toast.error(result.error || "تعذر الحذف");
    toast.success("تم حذف التكليف");
    load();
  };
  const visibleItems = items.filter(
    (x) =>
      (!employeeFilter || String(x.staff_id) === employeeFilter) &&
      (!stationFilter || String(x.station_id) === stationFilter) &&
      (!shiftFilter || x.shift === shiftFilter),
  );
  const present = visibleItems.filter((x) => x.attendance_status === "حاضر");
  return (
    <div className="page-stack capacity-page">
      <section className="form-hero">
        <div className="round-icon large">
          <Gauge />
        </div>
        <div>
          <h2>القدرة التشغيلية اليومية</h2>
          <p>اختاري الموظف من الدليل وحددي مكان دوامه وورديته لذلك اليوم</p>
        </div>
        <label className="capacity-date">
          التاريخ
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </section>
      <section className="report-metrics capacity-metrics">
        <article>
          <UsersRound />
          <b>{new Set(present.map((x) => x.staff_id)).size}</b>
          <span>العاملون الفعليون</span>
        </article>
        <article>
          <Clock3 />
          <b>{visibleItems.filter((x) => x.shift === "A").length}</b>
          <span>وردية A</span>
        </article>
        <article>
          <Clock3 />
          <b>{visibleItems.filter((x) => x.shift === "B").length}</b>
          <span>وردية B</span>
        </article>
        <article>
          <Clock3 />
          <b>{visibleItems.filter((x) => x.shift === "C").length}</b>
          <span>وردية C</span>
        </article>
        <article>
          <Ambulance />
          <b>{new Set(visibleItems.map((x) => x.vehicle_id).filter(Boolean)).size}</b>
          <span>المركبات العاملة</span>
        </article>
      </section>
      <section className="panel capacity-range">
        <PanelTitle
          icon={Clock3}
          title="عرض جدول الدوام خلال فترة"
          subtitle="حددي الفترة والموظف والمركز والوردية لعرض التكليفات المطابقة"
        />
        <div className="capacity-range-fields">
          <label>
            من تاريخ
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            إلى تاريخ
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            الموظف
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="">جميع الموظفين</option>
              {(data.staff || []).map((x: any) => (
                <option key={x.id} value={x.id}>{x.full_name}</option>
              ))}
            </select>
          </label>
          <label>
            المركز
            <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}>
              <option value="">جميع المراكز</option>
              {(data.stations || []).map((x: any) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
          <label>
            الوردية
            <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
              <option value="">كل الورديات</option>
              {["A", "B", "C"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <button type="button" className="ghost capacity-clear" onClick={() => {
            setEmployeeFilter("");
            setStationFilter("");
            setShiftFilter("");
          }} disabled={!employeeFilter && !stationFilter && !shiftFilter}>
            <RefreshCw /> مسح الفلاتر
          </button>
        </div>
      </section>
      <form className="panel capacity-form" onSubmit={save}>
        <PanelTitle
          icon={UserRound}
          title={editingId ? "تعديل تكليف الموظف" : "إضافة موظف إلى جدول اليوم"}
          subtitle="بيانات الموظف الأساسية محفوظة مسبقًا في دليل الموظفين"
        />
        <div className="capacity-fields">
          <label>
            الموظف
            <select
              required
              value={draft.staffId}
              onChange={(e) => setDraft({ ...draft, staffId: e.target.value })}
            >
              <option value="">اختاري الموظف</option>
              {(data.staff || []).map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.full_name} — {x.cadre_type} — {x.job_title || "بدون وظيفة"}
                </option>
              ))}
            </select>
          </label>
          <label>
            المركز
            <select
              required
              value={draft.stationId}
              onChange={(e) =>
                setDraft({ ...draft, stationId: e.target.value })
              }
            >
              <option value="">اختاري المركز</option>
              {(data.stations || []).map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الوردية
            <select
              value={draft.shift}
              onChange={(e) => setDraft({ ...draft, shift: e.target.value })}
            >
              {["A", "B", "C"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            نوع المهمة
            <select
              value={draft.dutyType}
              onChange={(e) => setDraft({ ...draft, dutyType: e.target.value })}
            >
              {[
                "دوام مركز",
                "نقطة ميدانية",
                "تنسيق",
                "معبر رفح",
                "مهمة خاصة",
                "مساندة",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            المركبة
            <select
              value={draft.vehicleId}
              onChange={(e) =>
                setDraft({ ...draft, vehicleId: e.target.value })
              }
            >
              <option value="">دون مركبة</option>
              {(data.vehicles || []).map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.plate_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            مكان العمل
            <input
              value={draft.workLocation}
              onChange={(e) =>
                setDraft({ ...draft, workLocation: e.target.value })
              }
              placeholder="مثال: البريج أو السرايا"
            />
          </label>
          <label>
            الحالة
            <select
              value={draft.attendanceStatus}
              onChange={(e) =>
                setDraft({ ...draft, attendanceStatus: e.target.value })
              }
            >
              {["حاضر", "استدعاء", "غائب", "إجازة"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            ملاحظات
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
        </div>
        <div className="capacity-actions">
          <button className="primary">
            {editingId ? <Save /> : <PlusCircle />}{" "}
            {editingId ? "حفظ التعديل" : "إضافة للجدول"}
          </button>
          {editingId && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setEditingId(null);
                setDraft({
                  staffId: "",
                  stationId: "",
                  shift: "A",
                  dutyType: "دوام مركز",
                  vehicleId: "",
                  workLocation: "",
                  attendanceStatus: "حاضر",
                  notes: "",
                });
              }}
            >
              <X /> إلغاء
            </button>
          )}
        </div>
      </form>
      <section className="panel table-panel">
        <div className="capacity-table-heading">
          <PanelTitle
            icon={ClipboardList}
            title="جدول القدرة التشغيلية"
            subtitle={`${visibleItems.length} تكليفًا مطابقًا من أصل ${items.length} خلال الفترة المحددة`}
          />
          <button
            type="button"
            className="ghost capacity-print no-print"
            onClick={() => window.print()}
            title="طباعة جدول القدرة التشغيلية حسب الفلاتر الحالية"
          >
            <Printer />
            طباعة PDF
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الموظف</th>
                <th>التاريخ</th>
                <th>الكادر</th>
                <th>الوظيفة</th>
                <th>التفصيل</th>
                <th>المركز</th>
                <th>الوردية</th>
                <th>المهمة</th>
                <th>المركبة</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((x) => (
                <tr key={x.id}>
                  <td>
                    <b>{x.full_name}</b>
                  </td>
                  <td>{x.work_date}</td>
                  <td>{x.cadre_type}</td>
                  <td>{x.job_title || "—"}</td>
                  <td>{x.detail || "—"}</td>
                  <td>
                    {x.station_name}
                    <small className="cell-note">{x.work_location || ""}</small>
                  </td>
                  <td>
                    <span className="shift-badge">{x.shift}</span>
                  </td>
                  <td>{x.duty_type}</td>
                  <td>{x.vehicle_number || "—"}</td>
                  <td>
                    <span
                      className={
                        x.attendance_status === "حاضر"
                          ? "state active"
                          : "state"
                      }
                    >
                      {x.attendance_status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="table-icon-action"
                        onClick={() => editAssignment(x)}
                      >
                        <Pencil /> تعديل
                      </button>
                      <button
                        className="table-icon-action danger"
                        onClick={() => deleteAssignment(x.id)}
                      >
                        <Trash2 /> حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <Empty />}
        </div>
      </section>
    </div>
  );
}

function CoordinationView() {
  const [from, setFrom] = useState("2026-08-01"),
    [to, setTo] = useState(today),
    [agency, setAgency] = useState("all"),
    [data, setData] = useState<any>({
      records: [],
      summary: {},
      agencies: [],
      types: [],
      timeline: [],
    });
  const empty = {
    coordinationDate: today,
    coordinatingAgency: "WHO",
    vehicleCount: "",
    coordinationType: "نقل مرضى الى معبر رفح",
    resultDescription: "",
    ambulancePatients: "",
    ambulanceCompanions: "",
    busPatients: "",
    coordinationStatus: "نجح",
    participatingVehicles: "",
    notesPatients: "",
    notesCompanions: "",
    notesTotal: "",
    notes: "",
  };
  const [draft, setDraft] = useState<any>(empty);
  const load = useCallback(async () => {
    const r = await fetch(
      `/api/coordinations?from=${from}&to=${to}&agency=${encodeURIComponent(agency)}`,
    );
    if (r.ok) setData(await r.json());
  }, [from, to, agency]);
  useEffect(() => {
    load();
  }, [load]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/coordinations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await r.json();
    if (!r.ok) return toast.error(result.error || "تعذر حفظ التنسيق");
    toast.success("تم حفظ عملية التنسيق");
    setDraft({ ...empty, coordinationDate: today });
    load();
  };
  const s = data.summary || {};
  return (
    <div className="page-stack coordination-page">
      <section className="form-hero">
        <div className="round-icon large">
          <Route />
        </div>
        <div>
          <h2>تسجيل عمليات التنسيق</h2>
          <p>نموذج مطابق لحقول تقرير التنسيقات ويحدّث التقرير مباشرة</p>
        </div>
      </section>
      <form className="panel coordination-form" onSubmit={save}>
        <PanelTitle
          icon={Route}
          title="بيانات عملية التنسيق"
          subtitle="التاريخ والجهة وحركة المرضى والمركبات"
        />
        <div className="coordination-fields">
          <label>
            التاريخ
            <input
              required
              type="date"
              value={draft.coordinationDate}
              onChange={(e) =>
                setDraft({ ...draft, coordinationDate: e.target.value })
              }
            />
          </label>
          <label>
            الجهة المنسقة
            <select
              value={draft.coordinatingAgency}
              onChange={(e) =>
                setDraft({ ...draft, coordinatingAgency: e.target.value })
              }
            >
              {["WHO", "OCHA", "الصليب الأحمر", "وزارة الصحة", "جهة أخرى"].map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
          </label>
          <label>
            عدد السيارات
            <input
              type="number"
              min="0"
              value={draft.vehicleCount}
              onChange={(e) =>
                setDraft({ ...draft, vehicleCount: e.target.value })
              }
            />
          </label>
          <label>
            حالة التنسيق
            <select
              value={draft.coordinationStatus}
              onChange={(e) =>
                setDraft({ ...draft, coordinationStatus: e.target.value })
              }
            >
              <option>نجح</option>
              <option>فشل</option>
              <option>قيد المتابعة</option>
            </select>
          </label>
          <label className="span-2">
            طبيعة التنسيق
            <input
              required
              value={draft.coordinationType}
              onChange={(e) =>
                setDraft({ ...draft, coordinationType: e.target.value })
              }
            />
          </label>
          <label className="span-2">
            نتيجة التنسيق
            <input
              value={draft.resultDescription}
              onChange={(e) =>
                setDraft({ ...draft, resultDescription: e.target.value })
              }
            />
          </label>
          <label>
            مرضى بالإسعاف
            <input
              type="number"
              min="0"
              value={draft.ambulancePatients}
              onChange={(e) =>
                setDraft({ ...draft, ambulancePatients: e.target.value })
              }
            />
          </label>
          <label>
            مرافقون بالإسعاف
            <input
              type="number"
              min="0"
              value={draft.ambulanceCompanions}
              onChange={(e) =>
                setDraft({ ...draft, ambulanceCompanions: e.target.value })
              }
            />
          </label>
          <label>
            مرضى بالحافلة
            <input
              type="number"
              min="0"
              value={draft.busPatients}
              onChange={(e) =>
                setDraft({ ...draft, busPatients: e.target.value })
              }
            />
          </label>
          <label>
            الإجمالي بالملاحظات
            <input
              type="number"
              min="0"
              value={draft.notesTotal}
              onChange={(e) =>
                setDraft({ ...draft, notesTotal: e.target.value })
              }
            />
          </label>
          <label className="span-2">
            أرقام المركبات المشاركة
            <input
              value={draft.participatingVehicles}
              onChange={(e) =>
                setDraft({ ...draft, participatingVehicles: e.target.value })
              }
              placeholder="مثال: 260-261-2001"
            />
          </label>
          <label className="span-2">
            ملاحظات
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
        </div>
        <div className="capacity-actions">
          <button className="primary">
            <Save /> حفظ التنسيق
          </button>
        </div>
      </form>
      <section className="panel coordination-filter">
        <PanelTitle
          icon={Filter}
          title="عرض التنسيقات"
          subtitle="فلترة السجل حسب الفترة والجهة"
        />
        <div>
          <label>
            من
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            إلى
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            الجهة
            <select value={agency} onChange={(e) => setAgency(e.target.value)}>
              <option value="all">جميع الجهات</option>
              {data.agencies.map((x: any) => (
                <option key={x.name}>{x.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="report-metrics">
        <article>
          <Route />
          <b>{s.total || 0}</b>
          <span>عمليات التنسيق</span>
        </article>
        <article>
          <Ambulance />
          <b>{s.vehicles || 0}</b>
          <span>مشاركة مركبات</span>
        </article>
        <article>
          <UsersRound />
          <b>{s.patients || 0}</b>
          <span>مرضى بالإسعاف</span>
        </article>
        <article>
          <UserRound />
          <b>{s.companions || 0}</b>
          <span>مرافقون بالإسعاف</span>
        </article>
      </section>
      <section className="panel table-panel">
        <PanelTitle
          icon={ClipboardList}
          title="سجل التنسيقات"
          subtitle={`${data.records.length} سجلًا ضمن الفترة`}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الجهة</th>
                <th>طبيعة التنسيق</th>
                <th>السيارات</th>
                <th>المرضى</th>
                <th>المرافقون</th>
                <th>الحالة</th>
                <th>أرقام المركبات</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((x: any) => (
                <tr key={x.id}>
                  <td>{x.coordination_date}</td>
                  <td>
                    <b>{x.coordinating_agency}</b>
                  </td>
                  <td>{x.coordination_type}</td>
                  <td>{x.vehicle_count}</td>
                  <td>{x.ambulance_patients}</td>
                  <td>{x.ambulance_companions}</td>
                  <td>
                    <span
                      className={
                        x.coordination_status === "نجح"
                          ? "state active"
                          : "state"
                      }
                    >
                      {x.coordination_status}
                    </span>
                  </td>
                  <td>{x.participating_vehicles || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.records.length && <Empty />}
        </div>
      </section>
    </div>
  );
}

function SettingsView2({ data, reload }: { data: any; reload: () => void }) {
  const [tab, setTab] = useState("station"),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [editingId, setEditingId] = useState<number | null>(null);
  const [staffFilters, setStaffFilters] = useState({search:"",station:"all",category:"all",level:"all"});
  const [cleaningStaff, setCleaningStaff] = useState(false);
  const cleanDuplicateStaff = async () => {
    setCleaningStaff(true);
    try {
      const preview = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity: "deduplicateStaff", dryRun: true }),
      });
      const result = await preview.json();
      if (!preview.ok) return toast.error(result.error || "تعذر فحص التكرار");
      if (!result.duplicates) return toast.success("لا توجد سجلات موظفين متطابقة");
      if (!confirm(`وجدنا ${result.duplicates} سجلًا مكررًا مطابقًا بالكامل. ستُنقل التكليفات وسجلات المركبات إلى السجل الأصلي ثم تُحذف النسخ المكررة. هل تريدين المتابعة؟`)) return;
      const response = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity: "deduplicateStaff" }),
      });
      const cleaned = await response.json();
      if (!response.ok) return toast.error(cleaned.error || "تعذر تنظيف التكرار");
      toast.success(`تم حذف ${cleaned.removed} سجلًا مكررًا مع الحفاظ على الروابط`);
      reload();
    } catch {
      toast.error("تعذر إكمال فحص الموظفين");
    } finally {
      setCleaningStaff(false);
    }
  };
  const configs: any = {
    station: {
      title: "المحطات",
      icon: MapPin,
      fields: [
        ["code", "الرمز"],
        ["name", "اسم المحطة"],
        ["governorate", "المحافظة"],
      ],
      rows: data.stations,
    },
    vehicle: {
      title: "المركبات",
      icon: Ambulance,
      fields: [
        ["plateNumber", "رقم المركبة"],
        ["manufacturer", "الشركة المصنعة"],
        ["model", "الموديل"],
        ["ambulanceType", "نوع الإسعاف"],
        ["fuelType", "نوع الوقود"],
        ["stationId", "المحطة المسؤولة"],
        ["workLocation", "مكان العمل"],
        ["serviceStatus", "حالة الخدمة"],
        ["outOfServiceReason", "سبب الخروج عن الخدمة"],
      ],
      rows: data.vehicles,
    },
    staff: {
      title: "دليل الموظفين",
      icon: UsersRound,
      fields: [
        ["fullName", "الاسم الكامل"],
        ["cadreType", "الكادر"],
        ["jobTitle", "الوظيفة"],
        ["station", "المركز"],
        ["startYear", "سنة الالتحاق"],
        ["gender", "الجنس"],
        ["birthYear", "سنة الميلاد"],
        ["category", "الفئة"],
        ["emtLevel", "مستوى المسعف"],
        ["medicalQualification", "المؤهل الطبي"],
        ["ambulanceLicence", "رخصة الإسعاف"],
      ],
      rows: data.staff,
    },
  };
  const c = configs[tab];
  const staffRows = (data.staff || []).filter((r:any) => { let d:any={}; try { d=JSON.parse(r.detail||"{}"); } catch {} return (!staffFilters.search || `${r.full_name} ${d.station||""} ${r.job_title||""}`.toLowerCase().includes(staffFilters.search.toLowerCase())) && (staffFilters.station==="all" || d.station===staffFilters.station) && (staffFilters.category==="all" || (d.category||r.cadre_type)===staffFilters.category) && (staffFilters.level==="all" || (d.emtLevel||r.job_title)===staffFilters.level); });
  const staffDetail = (raw: any) => {
    if (!raw) return "—";
    try {
      const d = typeof raw === "string" ? JSON.parse(raw) : raw;
      return [d.station && `المركز: ${d.station}`, d.startYear && `الالتحاق: ${d.startYear}`, d.gender && `الجنس: ${d.gender === "Male" ? "ذكر" : d.gender === "Female" ? "أنثى" : d.gender}`, d.birthYear && `الميلاد: ${d.birthYear}`, d.medicalQualification && d.medicalQualification !== "None" && `المؤهل: ${d.medicalQualification}`, d.ambulanceLicence && `الرخصة: ${d.ambulanceLicence === "Yes" ? "نعم" : "لا"}`].filter(Boolean).join(" · ") || "—";
    } catch { return String(raw); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = tab === "staff" ? { ...draft, detail: JSON.stringify({station:draft.station||"",startYear:draft.startYear||"",gender:draft.gender||"",birthYear:draft.birthYear||"",category:draft.category||draft.cadreType||"",emtLevel:draft.emtLevel||draft.jobTitle||"",medicalQualification:draft.medicalQualification||"",ambulanceLicence:draft.ambulanceLicence||""}) } : draft;
    const r = await fetch("/api/settings", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity: tab, id: editingId, ...payload }),
    });
    if (!r.ok) {
      toast.error("تعذر حفظ الإعداد");
      return;
    }
    toast.success(editingId ? "تم تعديل المدخل" : "تم حفظ الإعداد");
    setDraft({});
    setEditingId(null);
    reload();
  };
  return (
    <div className="settings-page">
      <section className="settings-tabs">
        {Object.entries(configs).map(([k, v]: any) => {
          const I = v.icon;
          return (
            <button
              key={k}
              className={tab === k ? "active" : ""}
              onClick={() => {
                setTab(k);
                setDraft({});
                setEditingId(null);
              }}
            >
              <I />
              {v.title}
              <span>{v.rows?.length || 0}</span>
            </button>
          );
        })}
        <button
          className={tab === "general" ? "active" : ""}
          onClick={() => setTab("general")}
        >
          <Settings />
          إعدادات عامة
        </button>
      </section>
      {tab === "general" ? (
        <section className="panel general-settings">
          <PanelTitle
            icon={Settings}
            title="الإعدادات العامة"
            subtitle="خيارات العمل والاعتماد"
          />
          <div className="setting-switches">
            <label>
              <div>
                <b>إلزام اعتماد البلاغات</b>
                <span>لا تظهر الإحصائيات قبل مراجعة المدير</span>
              </div>
              <input type="checkbox" defaultChecked />
            </label>
            <label>
              <div>
                <b>إشعارات البلاغات الجديدة</b>
                <span>تنبيه المدير عند وجود إحصائية جديدة</span>
              </div>
              <input type="checkbox" defaultChecked />
            </label>
            <label>
              <div>
                <b>السماح بالتصدير</b>
                <span>إتاحة Excel والطباعة لمشاهدي التقارير</span>
              </div>
              <input type="checkbox" defaultChecked />
            </label>
          </div>
        </section>
      ) : (
        <>
          <form className={`panel settings-form ${tab === "staff" && editingId ? "staff-edit-modal" : ""}`} onSubmit={save}>
            <PanelTitle
              icon={c.icon}
              title={editingId ? `تعديل ${c.title}` : `إضافة إلى ${c.title}`}
              subtitle="تُستخدم هذه القائمة في نموذج البلاغ"
            />
            <div>
              {c.fields.map(([key, label]: string[]) => (
                <label key={key}>
                  {label}
                  {key === "stationId" ? (
                    <select value={draft.stationId||""} onChange={e=>setDraft({...draft,stationId:e.target.value})}><option value="">غير محددة / مركزي</option>{(data.stations||[]).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  ) : key === "fuelType" || key === "serviceStatus" ? (
                    <select value={draft[key] || ""} required={key==="serviceStatus"} onChange={e=>setDraft({...draft,[key]:e.target.value})}>
                      <option value="">اختاري...</option>
                      {(key === "fuelType" ? [["بنزين","بنزين"],["سولار","سولار"]] : [["active","داخل الخدمة"],["out_of_service","خارج الخدمة"]]).map(([value,label])=><option key={value} value={value}>{label}</option>)}
                    </select>
                  ) : key === "governorate" ? (
                    <select
                      required
                      value={draft[key] || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    >
                      <option value="">اختاري المحافظة</option>
                      {governors.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : key === "cadreType" ? (
                    <select
                      required
                      value={draft[key] || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    >
                      <option value="">اختاري نوع الكادر</option>
                      {["كادر", "عقد", "متطوع", "مستجيب", "مستجيب أول"].map(
                        (name) => (
                          <option key={name}>{name}</option>
                        ),
                      )}
                    </select>
                  ) : (
                    <input
                      required={["plateNumber","code","name","fullName"].includes(key)}
                      value={draft[key] || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
              <button className="primary">
                {editingId ? <Save /> : <PlusCircle />}{" "}
                {editingId ? "حفظ التعديل" : "إضافة"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setDraft({});
                  }}
                >
                  <X /> إلغاء
                </button>
              )}
            </div>
            {tab === "staff" && !editingId && <button type="button" className="ghost archive-staff-button" onClick={async()=>{const r=await fetch("/api/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"importStaffArchive"})});const v=await r.json();if(!r.ok)return toast.error(v.error||"تعذر استيراد الموظفين");toast.success(`تم استيراد ${v.added} موظفًا من الملف`);reload();}}><Upload/> استيراد جميع الموظفين من ملف EMS</button>}
          </form>
          {tab === "staff" && <div className="staff-maintenance"><button type="button" className="ghost" disabled={cleaningStaff} onClick={cleanDuplicateStaff}><UsersRound/> {cleaningStaff ? "جارٍ فحص التكرار…" : "فحص وتنظيف تكرار الموظفين"}</button><span>يحذف السجلات المتطابقة بالكامل فقط ويحافظ على التكليفات وسجلات المركبات.</span></div>}
          <section className="panel table-panel">
            <PanelTitle
              icon={c.icon}
              title={c.title}
              subtitle="القائمة المعتمدة في النظام"
            />
            {tab === "staff" && <div className="staff-directory-filters"><label className="staff-search"><Search/><input placeholder="بحث بالاسم أو المركز أو الوظيفة" value={staffFilters.search} onChange={e=>setStaffFilters({...staffFilters,search:e.target.value})}/></label><label>المركز<select value={staffFilters.station} onChange={e=>setStaffFilters({...staffFilters,station:e.target.value})}><option value="all">كل المراكز</option>{[...new Set((data.staff||[]).map((r:any)=>{try{return JSON.parse(r.detail||"{}").station}catch{return ""}}).filter(Boolean))].map((x:any)=><option key={x}>{x}</option>)}</select></label><label>الفئة<select value={staffFilters.category} onChange={e=>setStaffFilters({...staffFilters,category:e.target.value})}><option value="all">كل الفئات</option>{[...new Set((data.staff||[]).map((r:any)=>{try{const d=JSON.parse(r.detail||"{}");return d.category||r.cadre_type}catch{return r.cadre_type}}).filter(Boolean))].map((x:any)=><option key={x}>{x}</option>)}</select></label><label>مستوى المسعف<select value={staffFilters.level} onChange={e=>setStaffFilters({...staffFilters,level:e.target.value})}><option value="all">كل المستويات</option>{[...new Set((data.staff||[]).map((r:any)=>{try{const d=JSON.parse(r.detail||"{}");return d.emtLevel||r.job_title}catch{return r.job_title}}).filter(Boolean))].map((x:any)=><option key={x}>{x}</option>)}</select></label><button className="ghost" onClick={()=>setStaffFilters({search:"",station:"all",category:"all",level:"all"})}><RefreshCw/> مسح</button></div>}
            <div className="table-wrap employee-directory">
              <table>
                <thead>
                  <tr>
                    {(tab === "staff"
                      ? ["الاسم", "المركز", "سنة الالتحاق", "الجنس", "سنة الميلاد", "الفئة", "مستوى المسعف", "المؤهل الطبي", "رخصة الإسعاف"]
                      : tab === "station"
                        ? ["الرمز", "اسم المحطة", "المحافظة"]
                        : [
                            "رقم المركبة",
                            "الشركة المصنعة",
                            "الموديل",
                            "نوع الإسعاف",
                            "الوقود",
                            "المحطة",
                            "مكان العمل",
                            "سبب التوقف",
                          ]
                    ).map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === "staff" ? staffRows : (c.rows || [])).map((r: any) => (
                    <tr key={r.id}>
                      {(tab === "staff"
                        ? (()=>{let d:any={};try{d=JSON.parse(r.detail||"{}")}catch{} return [r.full_name,d.station,d.startYear,d.gender==="Male"?"ذكر":d.gender==="Female"?"أنثى":d.gender,d.birthYear,d.category||r.cadre_type,d.emtLevel||r.job_title,d.medicalQualification==="None"?"—":d.medicalQualification,d.ambulanceLicence==="Yes"?"نعم":d.ambulanceLicence==="No"?"لا":"—"]})()
                        : tab === "station"
                          ? [r.code, r.name, r.governorate]
                          : [
                              r.plate_number,
                              r.manufacturer,
                              r.model,
                              r.ambulance_type,
                              r.fuel_type,
                              data.stations?.find((s:any)=>s.id===r.station_id)?.name,
                              r.work_location,
                              r.out_of_service_reason,
                            ]
                      ).map((v: any, i: number) => (
                        <td key={i}>
                          {i === 0 ? <b>{v || "—"}</b> : v || "—"}
                        </td>
                      ))}
                      <td>
                        <span
                          className={`state ${r.active === 0 ? "" : "active"}`}
                        >
                          {tab === "vehicle" && r.service_status === "maintenance" ? "قيد الصيانة" : r.active === 0 ? "موقوف" : "نشط"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="employee-edit"
                          onClick={() => {
                            setEditingId(r.id);
                            setDraft(
                              tab === "staff"
                              ? {
                                    ...(()=>{let d:any={};try{d=JSON.parse(r.detail||"{}")}catch{} return {station:d.station||"",startYear:d.startYear||"",gender:d.gender||"",birthYear:d.birthYear||"",category:d.category||r.cadre_type||"",emtLevel:d.emtLevel||r.job_title||"",medicalQualification:d.medicalQualification||"",ambulanceLicence:d.ambulanceLicence||""}})(),
                                    fullName: r.full_name || "",
                                    cadreType: r.cadre_type || "",
                                    jobTitle: r.job_title || "",
                                    detail: r.detail || "",
                                  }
                                : tab === "station"
                                  ? {
                                      code: r.code || "",
                                      name: r.name || "",
                                      governorate: r.governorate || "",
                                    }
                                  : {
                                      plateNumber: r.plate_number || "",
                                      manufacturer: r.manufacturer || "",
                                      model: r.model || "",
                                      ambulanceType: r.ambulance_type || "",
                                      fuelType: r.fuel_type || "",
                                      stationId: String(r.station_id||""),
                                      workLocation: r.work_location || "",
                                      serviceStatus: r.service_status || (r.active ? "active" : "out_of_service"),
                                      outOfServiceReason: r.out_of_service_reason || "",
                                    },
                            );
                            requestAnimationFrame(()=>document.querySelector(".settings-form")?.scrollIntoView({behavior:"smooth",block:"center"}));
                          }}
                        >
                          <Pencil /> تعديل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(tab === "staff" ? staffRows : c.rows)?.length && <Empty />}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ReportsV2({
  dashboard,
  incidents,
  filters,
  setFilters,
  exportCsv,
  settingsData,
}: {
  dashboard: Dashboard;
  incidents: Incident[];
  filters: any;
  setFilters: any;
  exportCsv: () => void;
  settingsData: any;
}) {
  const reportIncidents = incidents.filter(
    (x) => x.approval_status === "approved",
  );
  const exportCoordination = async () => {
    const r = await fetch(
      `/api/coordinations?from=${filters.from}&to=${filters.to}`,
    );
    if (!r.ok) return toast.error("تعذر تجهيز ملف التنسيقات");
    const rows = (await r.json()).records;
    const columns = [
      "coordination_date",
      "coordinating_agency",
      "vehicle_count",
      "coordination_type",
      "result_description",
      "ambulance_patients",
      "ambulance_companions",
      "bus_patients",
      "coordination_status",
      "participating_vehicles",
    ];
    const csv = [
      columns.join(","),
      ...rows.map((x: any) =>
        columns
          .map((c) => `"${String(x[c] ?? "").replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coordination-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const [selected, setSelected] = useState<
    | "summary"
    | "cases"
    | "beneficiaries"
    | "missions"
    | "resources"
    | "interventions"
    | "fuel"
    | "movement"
    | "coordination"
    | null
  >(null);
  const reports = [
    {
      id: "summary",
      t: "ملخص الحالات",
      d: "الحالات المسجلة والمنقولة وغير المنقولة حسب المنطقة",
      i: Activity,
    },
    {
      id: "cases",
      t: "تفاصيل الحالات",
      d: "الفئة ونوع الحالة والمركز والوردية",
      i: Siren,
    },
    {
      id: "beneficiaries",
      t: "خصائص المستفيدين",
      d: "الإناث والذكور والأطفال والبالغون وكبار السن",
      i: UsersRound,
    },
    {
      id: "missions",
      t: "مهام المركبات",
      d: "المهام حسب المركبة والمركز والوردية",
      i: Ambulance,
    },
    {
      id: "resources",
      t: "تقرير الموارد",
      d: "المستفيدون والعاملون وسيارات الإسعاف حسب المنطقة",
      i: Gauge,
    },
    {
      id: "interventions",
      t: "التدخلات الطبية",
      d: "الإجراءات الطبية والبلاغات الملغاة والوفيات والارتباط بالنزاع",
      i: HeartPulse,
    },
    {
      id: "fuel",
      t: "تقرير وقود المركبات",
      d: "التعبئة والحركة والبلاغات حسب السيارة والفترة",
      i: Ambulance,
    },
    { id: "movement", t: "تقرير حركة السيارات", d: "سجل الحركة حسب المركبة والمحطة والسائق والفترة", i: Route },
    {
      id: "coordination",
      t: "عمليات التنسيق",
      d: "الجهة ونوع التنسيق والمرضى والمرافقون والنتيجة",
      i: Route,
    },
  ] as const;
  const current = reports.find((x) => x.id === selected);
  if (selected && current) {
    const Icon = current.i;
    return (
      <div className="page-stack">
        <section className="report-detail-head">
          <button className="ghost" onClick={() => setSelected(null)}>
            <ChevronLeft /> عودة للتقارير
          </button>
          <div>
            <div className="report-icon">
              <Icon />
            </div>
            <div>
              <h2>{current.t}</h2>
              <p>{current.d}</p>
            </div>
          </div>
          <div className="report-export">
            <button className="ghost" onClick={() => window.print()}>
              <FileBarChart /> تصدير PDF
            </button>
            <button
              className="primary"
              onClick={
                selected === "coordination" ? exportCoordination : selected === "fuel" ? () => document.getElementById("fuel-report-export")?.click() : selected === "movement" ? () => document.getElementById("movement-report-export")?.click() : exportCsv
              }
            >
              <Download /> تصدير Excel
            </button>
          </div>
        </section>
        <Filters {...{ filters, setFilters }} />
        <ReportContent
          type={selected}
          dashboard={dashboard}
          incidents={reportIncidents}
          settingsData={settingsData}
          filters={filters}
        />
      </div>
    );
  }
  return (
    <div className="page-stack">
      <section className="reports-hero">
        <div>
          <div className="round-icon large">
            <FileBarChart />
          </div>
          <div>
            <h2>مركز التقارير</h2>
            <p>اختاري التقرير لعرضه داخل النظام ثم صدّريه عند الحاجة</p>
          </div>
        </div>
      </section>
      <Filters {...{ filters, setFilters }} />
      <section className="report-cards interactive">
        {reports.map((r) => (
          <button
            className="report-card-button"
            key={r.id}
            onClick={() => setSelected(r.id)}
          >
            <div className="report-icon">
              <r.i />
            </div>
            <div>
              <b>{r.t}</b>
              <p>{r.d}</p>
            </div>
            <span>
              عرض التقرير <ChevronLeft />
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

function ReportContent({
  type,
  dashboard,
  incidents,
  settingsData,
  filters,
}: {
  type: string;
  dashboard: Dashboard;
  incidents: Incident[];
  settingsData: any;
  filters: any;
}) {
  const [coordination, setCoordination] = useState<any>({
    records: [],
    summary: {},
    agencies: [],
    types: [],
    timeline: [],
  });
  useEffect(() => {
    fetch(`/api/coordinations?from=${filters.from}&to=${filters.to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => v && setCoordination(v))
      .catch(() => {});
  }, [filters.from, filters.to]);
  if (type === "fuel") return <FuelReport from={filters.from} to={filters.to}/>;
  if (type === "movement") return <MovementReport from={filters.from} to={filters.to}/>;
  if (type === "interventions") {
    const interventionData = [["oxygen","أكسجين"],["bvm","BVM"],["airway","مجرى هوائي"],["cpr","إنعاش CPR"],["aed","AED"],["drugs","أدوية"],["wound_care","عناية بالجروح"],["tourniquet","عاصبة"],["immobilization","تثبيت"],["cervical_collar","طوق رقبة"],["glucose_check","فحص سكر"],["splinting","جبيرة"],["delivery","ولادة"]]
      .map(([key,name])=>({name,value:incidents.filter(x=>Boolean(x[key])).length}));
    return <div className="page-stack">
      <section className="report-metrics">
        {[["بلاغات ملغاة",incidents.filter(x=>Boolean(x.cancelled)).length],["حالات وفاة",incidents.filter(x=>Boolean(x.patient_deceased)).length],["مرتبطة بالنزاع",incidents.filter(x=>Boolean(x.conflict_related)).length],["إجمالي التدخلات",interventionData.reduce((s,x)=>s+x.value,0)]].map(([label,value])=><article key={label} className="panel"><b>{value}</b><span>{label}</span></article>)}
      </section>
      <section className="panel chart-report"><PanelTitle icon={HeartPulse} title="التدخلات الطبية المنفذة" subtitle="مستخرج مباشرة من حقول Data Sheet" />
        <ResponsiveContainer width="100%" height={380}><BarChart data={interventionData} layout="vertical" margin={{right:30,left:30}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="name" width={100}/><Tooltip/><Bar dataKey="value" name="عدد التدخلات" fill="#c4172c" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer>
      </section>
    </div>;
  }
  if (type === "resources")
    return (
      <section className="panel table-panel report-sheet">
        <PanelTitle
          icon={Gauge}
          title="الموارد حسب المنطقة"
          subtitle="مطابق لبنية Fact_Resources في ملف الإكسل"
        />
        <div className="inline-report-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboard.stations}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="incidents"
                name="المستفيدون"
                fill="#c4172c"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المنطقة / المحطة</th>
                <th>المستفيدون</th>
                <th>عدد العاملين</th>
                <th>عدد سيارات الإسعاف</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.stations.map((x) => (
                <tr key={x.name}>
                  <td>
                    <b>{x.name}</b>
                  </td>
                  <td>{x.incidents}</td>
                  <td>
                    {(settingsData.staff || []).filter(
                      (s: any) =>
                        Number(s.station_id) ===
                        Number(
                          (settingsData.stations || []).find(
                            (q: any) => q.name === x.name,
                          )?.id,
                        ),
                    ).length || "—"}
                  </td>
                  <td>
                    {(settingsData.vehicles || []).filter(
                      (v: any) =>
                        Number(v.station_id) ===
                        Number(
                          (settingsData.stations || []).find(
                            (q: any) => q.name === x.name,
                          )?.id,
                        ),
                    ).length || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  if (type === "missions") {
    const fleet = Object.values(
      incidents.reduce((a: any, x: any) => {
        const k = String(x.vehicle || "غير محدد");
        a[k] ??= { name: k, incidents: 0, distance: 0, fuel: 0 };
        a[k].incidents++;
        a[k].distance += Number(x.distance_km || 0);
        a[k].fuel += Number(x.fuel_liters || 0);
        return a;
      }, {}),
    ) as any[];
    return (
      <section className="panel table-panel report-sheet">
        <PanelTitle
          icon={Ambulance}
          title="مهام المركبات"
          subtitle="مطابق لبنية Fact_VehicleMissions في ملف الإكسل"
        />
        <div className="inline-report-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fleet}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="incidents"
                name="عدد المهام"
                fill="#c4172c"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المركبة</th>
                <th>عدد المهام</th>
                <th>الوردية</th>
                <th>المسافة</th>
                <th>الوقود</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((x) => (
                <tr key={x.name}>
                  <td>
                    <b>{x.name}</b>
                  </td>
                  <td>{x.incidents}</td>
                  <td>جميع الورديات</td>
                  <td>{x.distance.toFixed(1)} كم</td>
                  <td>{x.fuel.toFixed(1)} لتر</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  if (type === "beneficiaries") {
    const male = incidents.filter((x) => x.gender === "Male").length,
      female = incidents.filter((x) => x.gender === "Female").length,
      children = incidents.filter((x) => Number(x.age || 0) < 18).length,
      adults = incidents.filter(
        (x) => Number(x.age || 0) >= 18 && Number(x.age || 0) < 60,
      ).length,
      elderly = incidents.filter((x) => Number(x.age || 0) >= 60).length;
    return (
      <>
        <section className="report-metrics">
          <article>
            <UsersRound />
            <b>{incidents.length}</b>
            <span>إجمالي المستفيدين</span>
          </article>
          <article>
            <UserRound />
            <b>{male}</b>
            <span>ذكور</span>
          </article>
          <article>
            <UserRound />
            <b>{female}</b>
            <span>إناث</span>
          </article>
          <article>
            <HeartPulse />
            <b>{children}</b>
            <span>أقل من 18 عامًا</span>
          </article>
          <article>
            <UsersRound />
            <b>{adults}</b>
            <span>بالغون</span>
          </article>
          <article>
            <UserRound />
            <b>{elderly}</b>
            <span>كبار السن</span>
          </article>
        </section>
        <section className="panel chart-report">
          <PanelTitle
            icon={BarChart3}
            title="توزيع المستفيدين"
            subtitle="حسب المحافظة"
          />
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={dashboard.governorates}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#c4172c" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </>
    );
  }
  if (type === "cases")
    return (
      <section className="panel table-panel report-sheet">
        <PanelTitle
          icon={Siren}
          title="تفاصيل الحالات المصنفة"
          subtitle="الفئة ونوع الحالة وعدد الحالات ضمن الفترة"
        />
        <div className="inline-report-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dashboard.cases}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="value"
                name="عدد الحالات"
                fill="#c4172c"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>نوع الحالة</th>
                <th>الفئة</th>
                <th>العدد</th>
                <th>النسبة</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.cases.map((x) => (
                <tr key={x.name}>
                  <td>
                    <b>{x.name}</b>
                  </td>
                  <td>حسب التصنيف المسجل</td>
                  <td>{x.value}</td>
                  <td>
                    {Math.round(
                      (x.value / (dashboard.summary.total || 1)) * 100,
                    )}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  if (type === "coordination")
    return (
      <>
        <section className="report-metrics">
          <article>
            <Route />
            <b>{coordination.summary.total || 0}</b>
            <span>إجمالي التنسيقات</span>
          </article>
          <article>
            <Ambulance />
            <b>{coordination.summary.vehicles || 0}</b>
            <span>مشاركة مركبات</span>
          </article>
          <article>
            <UsersRound />
            <b>{coordination.summary.patients || 0}</b>
            <span>المرضى بالإسعاف</span>
          </article>
          <article>
            <CheckCircle2 />
            <b>{coordination.summary.successful || 0}</b>
            <span>تنسيقات ناجحة</span>
          </article>
        </section>
        <section className="report-chart-grid">
          <article className="panel chart-report">
            <PanelTitle
              icon={BarChart3}
              title="التنسيقات حسب الجهة"
              subtitle="عدد العمليات لكل جهة منسقة"
            />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={coordination.agencies}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#c4172c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>
          <article className="panel chart-report">
            <PanelTitle
              icon={Activity}
              title="اتجاه التنسيقات"
              subtitle="التوزيع اليومي خلال الفترة"
            />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={coordination.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#c4172c"
                  fill="#fff0f2"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </article>
        </section>
        <section className="panel table-panel">
          <PanelTitle
            icon={Route}
            title="تفاصيل عمليات التنسيق"
            subtitle="الجهة ونوع التنسيق والمرضى والمرافقون والنتيجة"
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الجهة</th>
                  <th>النوع</th>
                  <th>المركبات</th>
                  <th>المرضى</th>
                  <th>المرافقون</th>
                  <th>النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {coordination.records.map((x: any) => (
                  <tr key={x.id}>
                    <td>{x.coordination_date}</td>
                    <td>
                      <b>{x.coordinating_agency}</b>
                    </td>
                    <td>{x.coordination_type}</td>
                    <td>{x.vehicle_count}</td>
                    <td>{x.ambulance_patients}</td>
                    <td>{x.ambulance_companions}</td>
                    <td>{x.result_description || x.coordination_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!coordination.records.length && <Empty />}
          </div>
        </section>
      </>
    );
  const notTransported = incidents.filter(
    (x) => !x.dropoff_location && !x.dropoff_type,
  ).length;
  const served = Math.max(0, incidents.length - notTransported);
  return (
    <>
      <section className="report-metrics">
        <article>
          <Siren />
          <b>{dashboard.summary.total || 0}</b>
          <span>إجمالي الحالات المسجلة</span>
        </article>
        <article>
          <CheckCircle2 />
          <b>{served}</b>
          <span>الحالات المنقولة أو المخدومة</span>
        </article>
        <article>
          <XCircle />
          <b>{notTransported}</b>
          <span>الحالات التي لم تُنقل</span>
        </article>
        <article>
          <Ambulance />
          <b>{new Set(incidents.map((x) => x.vehicle).filter(Boolean)).size}</b>
          <span>عدد المركبات الفريدة</span>
        </article>
      </section>
      <section className="panel chart-report">
        <PanelTitle
          icon={Activity}
          title="اتجاه البلاغات"
          subtitle="خلال الفترة المحددة"
        />
        <ResponsiveContainer width="100%" height={330}>
          <AreaChart data={dashboard.timeline}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#c4172c"
              fill="#fff0f2"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>
      <section className="panel chart-report">
        <PanelTitle
          icon={BarChart3}
          title="ملخص الحالات"
          subtitle="توزيع الحالات حسب النوع ضمن الفترة المحددة"
        />
        <ResponsiveContainer width="100%" height={330}>
          <BarChart data={dashboard.cases}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="value"
              name="عدد الحالات"
              fill="#c4172c"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}

function FuelReport({from,to}:{from:string;to:string}) {
  const [data,setData]=useState<any>({vehicles:[],fuel:[],movements:[],incidents:[]});
  useEffect(()=>{fetch(`/api/fleet?${new URLSearchParams({from,to})}`).then(r=>r.ok?r.json():null).then(x=>x&&setData(x)).catch(()=>toast.error("تعذر تحميل تقرير الوقود"))},[from,to]);
  const rows=data.vehicles.map((v:any)=>{const fills=data.fuel.filter((x:any)=>x.vehicle_id===v.id),moves=data.movements.filter((x:any)=>x.vehicle_id===v.id),cases=data.incidents.filter((x:any)=>x.approval_status==="approved" && (x.vehicle_id===v.id || x.vehicle?.replace(/\s/g,"")===v.plate_number.replace(/\s/g,"")));return {plate:v.plate_number,location:v.station_name||v.work_location||"—",fuel:v.fuel_type||"—",fillCount:fills.length,liters:fills.reduce((s:number,x:any)=>s+Number(x.liters),0),moveKm:moves.reduce((s:number,x:any)=>s+(x.km_end==null?0:Number(x.km_end)-Number(x.km_start)),0),cases:cases.length,caseKm:cases.reduce((s:number,x:any)=>s+Number(x.distance_km||0),0)}}).filter((x:any)=>x.fillCount||x.moveKm||x.cases);
  const exportCsv=()=>{const csv=[["المركبة","المحطة","الوقود","مرات التعبئة","لتر معبأ","كم حركة","عدد البلاغات","كم بلاغات"],...rows.map((x:any)=>[x.plate,x.location,x.fuel,x.fillCount,x.liters,x.moveKm,x.cases,x.caseKm])].map(line=>line.map((v:any)=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));a.download=`fleet-report-${from}-${to}.csv`;a.click();URL.revokeObjectURL(a.href)};
  return <div className="page-stack"><button id="fuel-report-export" hidden onClick={exportCsv}/><section className="panel"><PanelTitle icon={BarChart3} title="لترات التعبئة حسب السيارة" subtitle="الكميات المُعبّأة، وليست قياسًا دقيقًا للاستهلاك"/><ResponsiveContainer width="100%" height={320}><BarChart data={rows.filter((x:any)=>x.liters).sort((a:any,b:any)=>b.liters-a.liters).slice(0,12)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="plate"/><YAxis/><Tooltip/><Bar dataKey="liters" name="لتر معبأ" fill="#c4172c" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></section><section className="panel table-panel"><PanelTitle icon={Ambulance} title="تقرير المركبات والبلاغات" subtitle={`${from} إلى ${to} — قارني مسافة الحركة مع مسافات البلاغات ولا تجمعيهما كمسافتين مستقلتين`}/><div className="table-wrap"><table><thead><tr><th>السيارة</th><th>المحطة</th><th>الوقود</th><th>التعبئات</th><th>لتر مُعبّأ</th><th>الحركة (كم)</th><th>البلاغات</th><th>البلاغات (كم)</th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.plate}><td>{x.plate}</td><td>{x.location}</td><td>{x.fuel}</td><td>{x.fillCount}</td><td>{x.liters.toFixed(1)}</td><td>{x.moveKm.toFixed(1)}</td><td>{x.cases}</td><td>{x.caseKm.toFixed(1)}</td></tr>)}</tbody></table>{rows.length===0&&<Empty/>}</div></section></div>;
}

function MovementReport({from,to}:{from:string;to:string}) {
  const [data,setData]=useState<any>({vehicles:[],movements:[]});
  const [options,setOptions]=useState({vehicle:"all",station:"all",driver:"all",linked:"all"});
  useEffect(()=>{fetch(`/api/fleet?${new URLSearchParams({from,to})}`).then(r=>r.ok?r.json():Promise.reject()).then(setData).catch(()=>toast.error("تعذر تحميل سجل الحركة"))},[from,to]);
  const vehicles=data.vehicles||[];
  const rows=(data.movements||[]).filter((m:any)=>{const v=vehicles.find((x:any)=>x.id===m.vehicle_id);return (options.vehicle==="all"||String(m.vehicle_id)===options.vehicle)&&(options.station==="all"||String(v?.station_id||"")===options.station)&&(options.driver==="all"||m.driver_name===options.driver)&&(options.linked==="all"||(options.linked==="yes"?Boolean(m.incident_number):!m.incident_number))});
  const distance=(m:any):any=>m.km_end==null?null:Number(m.km_end)-Number(m.km_start);
  const total=rows.reduce((sum:number,m:any)=>sum+Math.max(0,distance(m)||0),0);
  const exportRows=()=>{const table=[["م","التاريخ","السائق","المركبة","المحطة","وقت الخروج","وقت العودة","الوجهة","عداد البداية","عداد النهاية","المسافة كم","رقم البلاغ","ملاحظات"],...rows.map((m:any,i:number)=>[i+1,String(m.departed_at||"").slice(0,10),m.driver_name,m.plate_number,vehicles.find((v:any)=>v.id===m.vehicle_id)?.station_name||"",m.departed_at,m.returned_at,m.destination,m.km_start,m.km_end,distance(m),m.incident_number,m.notes])];const csv=table.map((line:any[])=>line.map((value:any)=>{let s=String(value??"");if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return `"${s.replaceAll('"','""')}"`}).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`movement-report-${from}-${to}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  return <div className="page-stack movement-report" dir="rtl"><button hidden id="movement-report-export" onClick={exportRows}/><section className="panel movement-options"><div className="filter-title"><span className="filter-mark"><SlidersHorizontal/></span><span><b>فلاتر سجل الحركة</b><small>{rows.length} حركة ضمن الفترة المختارة</small></span></div><div className="movement-option-fields"><label>المركبة<select value={options.vehicle} onChange={e=>setOptions({...options,vehicle:e.target.value})}><option value="all">جميع المركبات</option>{vehicles.map((v:any)=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></label><label>المحطة<select value={options.station} onChange={e=>setOptions({...options,station:e.target.value})}><option value="all">كل المحطات</option>{[...new Map(vehicles.filter((v:any)=>v.station_id).map((v:any)=>[v.station_id,v.station_name])).entries()].map(([id,name]:any)=><option key={id} value={id}>{name}</option>)}</select></label><label>السائق<select value={options.driver} onChange={e=>setOptions({...options,driver:e.target.value})}><option value="all">كل السائقين</option>{[...new Set((data.movements||[]).map((m:any)=>m.driver_name).filter(Boolean))].map((name:any)=><option key={name}>{name}</option>)}</select></label><label>ربط البلاغ<select value={options.linked} onChange={e=>setOptions({...options,linked:e.target.value})}><option value="all">الكل</option><option value="yes">مرتبطة ببلاغ</option><option value="no">دون بلاغ</option></select></label><button className="ghost" onClick={()=>setOptions({vehicle:"all",station:"all",driver:"all",linked:"all"})}><RefreshCw/> مسح</button></div></section><section className="panel movement-sheet"><div className="movement-letterhead"><b>جمعية الهلال الأحمر الفلسطيني</b><span>دائرة الإسعاف والطوارئ</span><h2>تقرير حركة سيارات الإسعاف</h2><p>من {from} إلى {to} · المركبة: {options.vehicle==="all"?"جميع المركبات":vehicles.find((v:any)=>String(v.id)===options.vehicle)?.plate_number} · عدد الحركات: {rows.length} · مجموع المسافة المسجلة: {total.toFixed(1)} كم</p></div><div className="table-wrap"><table><thead><tr>{["م","التاريخ","السائق","المركبة","المحطة","الخروج","العودة","الوجهة","عداد البداية","عداد النهاية","المسافة كم","البلاغ","ملاحظات"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((m:any,i:number)=><tr key={m.id}><td>{i+1}</td><td>{String(m.departed_at||"").slice(0,10)}</td><td>{m.driver_name||"—"}</td><td>{m.plate_number||"—"}</td><td>{vehicles.find((v:any)=>v.id===m.vehicle_id)?.station_name||"—"}</td><td>{m.departed_at||"—"}</td><td>{m.returned_at||"قيد الحركة"}</td><td>{m.destination||"—"}</td><td>{m.km_start??"—"}</td><td>{m.km_end??"—"}</td><td>{distance(m)==null?"—":distance(m).toFixed(1)}</td><td>{m.incident_number||"—"}</td><td>{m.notes||"—"}</td></tr>)}</tbody></table>{!rows.length&&<Empty/>}</div></section></div>;
}

function FleetView({staff,stationsData,onImported}:{staff:any[];stationsData:any[];onImported:()=>void}) {
  const [period,setPeriod]=useState({from:monthStart,to:today});
  const [data,setData]=useState<any>({vehicles:[],fuel:[],movements:[],incidents:[],importReview:[]});
  const [tab,setTab]=useState<"fill"|"movement">("fill");
  const [vehicleId,setVehicleId]=useState("");
  const [draft,setDraft]=useState<Record<string,string>>({filledAt:`${today}T09:00`,departedAt:`${today}T09:00`});
  const [busy,setBusy]=useState(false);
  const [importAttempted,setImportAttempted]=useState(false);
  const [vehicleFilters,setVehicleFilters]=useState({search:"",station:"all",fuel:"all",status:"all"});
  const [editVehicle,setEditVehicle]=useState<any>(null);
  const [newVehicle,setNewVehicle]=useState<any>(null);
  const fleetRows=(data.vehicles||[]).filter((v:any)=>(!vehicleFilters.search || `${v.plate_number} ${v.manufacturer||""} ${v.work_location||""}`.toLowerCase().includes(vehicleFilters.search.toLowerCase())) && (vehicleFilters.station==="all" || (vehicleFilters.station==="unassigned" ? !v.station_id : String(v.station_id||"")===vehicleFilters.station)) && (vehicleFilters.fuel==="all" || v.fuel_type===vehicleFilters.fuel) && (vehicleFilters.status==="all" || (v.service_status==="maintenance"?"maintenance":v.active?"active":"out_of_service")===vehicleFilters.status));
  const saveVehicle=async(e:React.FormEvent)=>{e.preventDefault();if(!editVehicle)return;setBusy(true);try{const r=await fetch("/api/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"vehicle",id:editVehicle.id,plateNumber:editVehicle.plate_number,manufacturer:editVehicle.manufacturer,model:editVehicle.model,ambulanceType:editVehicle.ambulance_type,fuelType:editVehicle.fuel_type,stationId:editVehicle.station_id,workLocation:editVehicle.work_location,serviceStatus:editVehicle.service_status,outOfServiceReason:editVehicle.out_of_service_reason})});const v=await r.json();if(!r.ok)throw Error(v.error||"تعذر تعديل المركبة");toast.success("تم حفظ بيانات المركبة");setEditVehicle(null);await load();onImported()}catch(err){toast.error(String(err).replace(/^Error: /,""))}finally{setBusy(false)}};
  const addVehicle=async(e:React.FormEvent)=>{e.preventDefault();if(!newVehicle)return;setBusy(true);try{const r=await fetch("/api/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"vehicle",...newVehicle})});const v=await r.json();if(!r.ok)throw Error(v.error||"تعذر إضافة المركبة");toast.success("تمت إضافة المركبة");setNewVehicle(null);await load();onImported()}catch(err){toast.error(String(err).replace(/^Error: /,""))}finally{setBusy(false)}};
  const importArchiveFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();const lines=text.split(/\r?\n/).filter(Boolean);const rows=lines.slice(1).map(line=>line.split(",")).filter(x=>x[0]).map(x=>({plate:x[0],manufacturer:x[1],model:x[2],fuelType:x[3],location:x[4],status:x[5]||"داخل الخدمة"}));const r=await fetch("/api/fleet",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"importArchive",rows})});const v=await r.json();if(!r.ok)throw Error(v.error||"تعذر استيراد الأرشيف");toast.success(`تم استيراد ${v.added||0} مركبة من الأرشيف`);await load();onImported()}catch(err){toast.error(String(err).replace(/^Error: /,""))}e.target.value=""};
  const selected=data.vehicles.find((v:any)=>String(v.id)===vehicleId);
  const linked=(data.incidents||[]).filter((i:any)=>i.vehicle_id===selected?.id || i.vehicle?.replace(/\s/g,"")===selected?.plate_number?.replace(/\s/g,""));
  const load=useCallback(async()=>{const q=new URLSearchParams(period).toString();const r=await fetch(`/api/fleet?${q}`);if(r.ok)setData(await r.json());else toast.error((await r.json()).error||"تعذر تحميل الأسطول");},[period]);
  useEffect(()=>{load()},[load]);
  const set=(k:string,v:string)=>setDraft(p=>({...p,[k]:v}));
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(!vehicleId)return toast.error("اختاري المركبة");setBusy(true);
    try {const r=await fetch("/api/fleet",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:tab,vehicleId:Number(vehicleId),...draft,fuelType:selected?.fuel_type})});const v=await r.json();if(!r.ok)throw Error(v.error);toast.success(tab==="fill"?"تم تسجيل التعبئة":"تم تسجيل الحركة");setDraft({filledAt:`${today}T09:00`,departedAt:`${today}T09:00`});await load();}catch(err){toast.error(String(err).replace(/^Error: /,""))}finally{setBusy(false)}};
  const importFleet=async()=>{setBusy(true);try {const r=await fetch("/api/fleet",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"import"})});const v=await r.json();if(!r.ok)throw Error(v.error);toast.success(`أضيفت ${v.added} مركبة؛ ${v.review} للمراجعة`);await load();onImported()}catch(err){toast.error(String(err).replace(/^Error: /,""))}finally{setBusy(false)}};
  useEffect(()=>{if(data.pendingImportCount>0 && !importAttempted && !busy){setImportAttempted(true);importFleet()}},[data.pendingImportCount,importAttempted,busy]);
  const fuelLiters=data.fuel.reduce((s:number,r:any)=>s+Number(r.liters||0),0);
  const kmTotal=data.movements.reduce((s:number,r:any)=>s+(r.km_end==null?0:Number(r.km_end)-Number(r.km_start)),0);
  const chart=data.vehicles.map((v:any)=>({name:v.plate_number,liters:data.fuel.filter((f:any)=>f.vehicle_id===v.id).reduce((s:number,f:any)=>s+Number(f.liters),0)})).filter((x:any)=>x.liters>0).sort((a:any,b:any)=>b.liters-a.liters).slice(0,10);
  const exportRows=()=>{const heads=["التاريخ","المركبة","نوع الوقود","الكمية (لتر)","عداد الكيلومترات","السائق","من عبأ","رقم البلاغ","رقم القسيمة"];
    const csv=[heads,...data.fuel.map((x:any)=>[x.filled_at,x.plate_number,x.fuel_type,x.liters,x.odometer_km,x.driver_name,x.filled_by_name,x.incident_number,x.voucher_number])].map(row=>row.map((v:any)=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));a.download=`fleet-fuel-${period.from}-${period.to}.csv`;a.click();URL.revokeObjectURL(a.href)};
  return <div className="page-stack fleet-page">
    <section className="panel fleet-head"><div><h2><Ambulance/> المركبات والوقود</h2><p>المركبة مرجع موحد للتعبئة والحركة والبلاغات. اللترات المعبأة لا تعني استهلاكًا فعليًا دون قياس مستوى الخزان.</p></div><div className="fleet-head-actions"><button className="primary" onClick={()=>setNewVehicle({plateNumber:"",manufacturer:"",model:"",ambulanceType:"",fuelType:"",stationId:"",workLocation:"",serviceStatus:"active"})}><PlusCircle/> إضافة مركبة</button><label className="archive-import ghost"><Upload/> استيراد الأرشيف<input type="file" accept=".csv,text/csv" onChange={importArchiveFile}/></label><button className="ghost" onClick={importFleet} disabled={busy}><PlusCircle/> استيراد سيارات سبتمبر</button></div></section>
    <section className="panel fleet-filters"><label>من تاريخ<input type="date" value={period.from} onChange={e=>setPeriod({...period,from:e.target.value})}/></label><label>إلى تاريخ<input type="date" value={period.to} onChange={e=>setPeriod({...period,to:e.target.value})}/></label><span>إجمالي الأسطول: {data.vehicles.length} مركبة</span><button className="ghost" onClick={load}><RefreshCw/> تحديث</button></section>
    <section className="fleet-metrics"><article><b>{data.fuel.length}</b><span>عمليات التعبئة</span></article><article><b>{fuelLiters.toFixed(1)}</b><span>لتر مُعبّأ</span></article><article><b>{data.movements.length}</b><span>حركات مسجلة</span></article><article><b>{kmTotal.toFixed(1)}</b><span>كم من سجلات الحركة</span></article></section>
    <section className="panel"><PanelTitle icon={PlusCircle} title="إضافة حركة أو تعبئة" subtitle="يرتبط السجل بمركبة من الإعدادات، ويمكن إسناده لبلاغ موجود"/>
      <div className="fleet-tabs"><button className={tab==="fill"?"active":""} onClick={()=>{setTab("fill");setDraft({filledAt:`${today}T09:00`})}}>تعبئة وقود</button><button className={tab==="movement"?"active":""} onClick={()=>{setTab("movement");setDraft({departedAt:`${today}T09:00`})}}>حركة سيارة</button></div>
      <form className="fleet-form" onSubmit={save}>
        <label>المركبة *<select value={vehicleId} required onChange={e=>{setVehicleId(e.target.value);setDraft(p=>({...p,incidentId:""}))}}><option value="">اختاري المركبة</option>{data.vehicles.filter((v:any)=>v.active!==0).map((v:any)=><option key={v.id} value={v.id}>{v.plate_number} — {v.fuel_type||"وقود غير محدد"}</option>)}</select></label>
        <label>البلاغ المرتبط (اختياري)<select value={draft.incidentId||""} onChange={e=>set("incidentId",e.target.value)}><option value="">لا يوجد</option>{linked.map((i:any)=><option key={i.id} value={i.id}>{i.incident_number} — {i.call_date}</option>)}</select></label>
        {tab==="fill"?<><label>تاريخ ووقت التعبئة *<input required type="datetime-local" value={draft.filledAt||""} onChange={e=>set("filledAt",e.target.value)}/></label><label>الكمية (لتر) *<input required type="number" step="0.01" min="0.01" value={draft.liters||""} onChange={e=>set("liters",e.target.value)}/></label><label>عداد الكيلومترات<input type="number" step="0.1" min="0" value={draft.odometerKm||""} onChange={e=>set("odometerKm",e.target.value)}/></label><label>من قام بالتعبئة *<input required value={draft.filledByName||""} onChange={e=>set("filledByName",e.target.value)}/></label><label>المُعبّئ من دليل الموظفين<select value={draft.filledByStaffId||""} onChange={e=>{const v=staff.find((x:any)=>String(x.id)===e.target.value);setDraft({...draft,filledByStaffId:e.target.value,filledByName:v?.full_name||draft.filledByName||""})}}><option value="">اسم غير مسجل بالدليل</option>{staff.map((s:any)=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label><label>مصدر الوقود<input value={draft.sourceName||""} onChange={e=>set("sourceName",e.target.value)}/></label><label>رقم القسيمة<input value={draft.voucherNumber||""} onChange={e=>set("voucherNumber",e.target.value)}/></label></>:<><label>تاريخ ووقت الخروج *<input required type="datetime-local" value={draft.departedAt||""} onChange={e=>set("departedAt",e.target.value)}/></label><label>تاريخ ووقت العودة<input type="datetime-local" value={draft.returnedAt||""} onChange={e=>set("returnedAt",e.target.value)}/></label><label>عداد البداية (كم) *<input required type="number" step="0.1" min="0" value={draft.kmStart||""} onChange={e=>set("kmStart",e.target.value)}/></label><label>عداد النهاية (كم)<input type="number" step="0.1" min="0" value={draft.kmEnd||""} onChange={e=>set("kmEnd",e.target.value)}/></label><label>الوجهة<input value={draft.destination||""} onChange={e=>set("destination",e.target.value)}/></label></>}
        <label>السائق من دليل الموظفين<select value={draft.driverStaffId||""} onChange={e=>{const v=staff.find((x:any)=>String(x.id)===e.target.value);setDraft({...draft,driverStaffId:e.target.value,driverName:v?.full_name||draft.driverName||""})}}><option value="">غير موجود بالدليل</option>{staff.map((s:any)=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label><label>اسم السائق<input value={draft.driverName||""} onChange={e=>set("driverName",e.target.value)}/></label><label>ملاحظات<input value={draft.notes||""} onChange={e=>set("notes",e.target.value)}/></label><button className="primary" disabled={busy}><Save/> حفظ {tab==="fill"?"التعبئة":"الحركة"}</button>
      </form></section>
    {data.importReview?.length>0&&<section className="panel fleet-review"><PanelTitle icon={AlertTriangle} title="سجلات ملف الأسطول التي تحتاج مراجعة" subtitle="لا تُستورد تلقائيًا بسبب تعارض في البيانات"/>{data.importReview.map((x:any)=><p key={x.plate}><b>{x.plate}</b> — {x.reason}</p>)}</section>}
    <section className="panel table-panel fleet-directory" dir="rtl">
      <div className="fleet-section-head"><PanelTitle icon={Ambulance} title="دليل المركبات" subtitle={`${fleetRows.length} من أصل ${data.vehicles.length} مركبة — التعديل متاح لمدير النظام`}/></div>
      <div className="fleet-table-filters">
        <label className="fleet-search-label"><Search/> <input aria-label="بحث برقم اللوحة أو النوع أو مكان العمل" placeholder="رقم اللوحة أو النوع أو مكان العمل" value={vehicleFilters.search} onChange={e=>setVehicleFilters({...vehicleFilters,search:e.target.value})}/></label>
        <label>المحطة<select value={vehicleFilters.station} onChange={e=>setVehicleFilters({...vehicleFilters,station:e.target.value})}><option value="all">كل المحطات</option>{stationsData.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}<option value="unassigned">غير محددة</option></select></label>
        <label>نوع الوقود<select value={vehicleFilters.fuel} onChange={e=>setVehicleFilters({...vehicleFilters,fuel:e.target.value})}><option value="all">جميع الأنواع</option><option value="بنزين">بنزين</option><option value="سولار">سولار</option></select></label>
        <label>حالة الخدمة<select value={vehicleFilters.status} onChange={e=>setVehicleFilters({...vehicleFilters,status:e.target.value})}><option value="all">كل الحالات</option><option value="active">داخل الخدمة</option><option value="maintenance">قيد الصيانة</option><option value="out_of_service">خارج الخدمة</option></select></label>
        <button className="ghost" onClick={()=>setVehicleFilters({search:"",station:"all",fuel:"all",status:"all"})}><RefreshCw/> مسح</button>
      </div>
      <div className="table-wrap"><table><thead><tr><th>المركبة</th><th>الوقود</th><th>المحطة / مكان العمل</th><th>الحالة</th><th>بلاغات الفترة</th><th>التعبئة (لتر)</th><th>الحركة (كم)</th>{data.canEditVehicles&&<th>إجراء</th>}</tr></thead><tbody>{fleetRows.map((v:any)=><tr key={v.id}><td><b>{v.plate_number}</b></td><td>{v.fuel_type||"—"}</td><td>{v.station_name||v.work_location||"—"}</td><td><span className={`fleet-state ${v.active?"active":"inactive"}`}>{v.service_status==="maintenance"?"قيد الصيانة":v.active?"داخل الخدمة":"خارج الخدمة"}</span></td><td>{data.incidents.filter((i:any)=>i.vehicle_id===v.id || i.vehicle?.replace(/\s/g,"")===v.plate_number.replace(/\s/g,"")).length}</td><td>{data.fuel.filter((f:any)=>f.vehicle_id===v.id).reduce((s:number,f:any)=>s+Number(f.liters),0).toFixed(1)}</td><td>{data.movements.filter((m:any)=>m.vehicle_id===v.id).reduce((s:number,m:any)=>s+(m.km_end==null?0:Number(m.km_end)-Number(m.km_start)),0).toFixed(1)}</td>{data.canEditVehicles&&<td><button className="employee-edit fleet-edit" aria-label={`تعديل المركبة ${v.plate_number}`} onClick={()=>setEditVehicle({...v,service_status:v.service_status|| (v.active?"active":"out_of_service")})}><Pencil/> تعديل</button></td>}</tr>)}</tbody></table>{!fleetRows.length&&<Empty/>}</div>
    </section>
    <section className="panel chart-report"><PanelTitle icon={BarChart3} title="التعبئة حسب المركبة" subtitle="أعلى عشر مركبات خلال الفترة، باللتر"/><ResponsiveContainer width="100%" height={290}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="liters" name="لتر مُعبّأ" fill="#c4172c" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></section>
    <section className="panel table-panel"><div className="fleet-section-head"><PanelTitle icon={Activity} title="سجل التعبئة" subtitle="السائق والمُعبّئ ورقم البلاغ والقسيمة"/><button className="ghost" onClick={exportRows}><Download/> Excel (CSV)</button></div><div className="table-wrap"><table><thead><tr><th>التاريخ</th><th>المركبة</th><th>لتر</th><th>السائق</th><th>من عبّأ</th><th>البلاغ</th><th>القسيمة</th></tr></thead><tbody>{data.fuel.map((f:any)=><tr key={f.id}><td>{f.filled_at}</td><td>{f.plate_number}</td><td>{f.liters}</td><td>{f.driver_name||"—"}</td><td>{f.filled_by_name}</td><td>{f.incident_number||"—"}</td><td>{f.voucher_number||"—"}</td></tr>)}</tbody></table>{!data.fuel.length&&<Empty/>}</div></section>
    <section className="panel table-panel"><PanelTitle icon={Route} title="سجل الحركة" subtitle="حركات المركبات داخل وخارج البلاغات — التقرير الكامل في مركز التقارير"/><div className="table-wrap"><table><thead><tr><th>المركبة</th><th>السائق</th><th>الخروج</th><th>العودة</th><th>عداد البداية</th><th>عداد النهاية</th><th>المسافة</th><th>البلاغ</th></tr></thead><tbody>{data.movements.map((m:any)=><tr key={m.id}><td>{m.plate_number}</td><td>{m.driver_name||"—"}</td><td>{m.departed_at}</td><td>{m.returned_at||"—"}</td><td>{m.km_start}</td><td>{m.km_end??"—"}</td><td>{m.km_end==null?"—":(m.km_end-m.km_start).toFixed(1)}</td><td>{m.incident_number||"—"}</td></tr>)}</tbody></table>{!data.movements.length&&<Empty/>}</div></section>
    {editVehicle&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditVehicle(null)}}><form className="incident-detail-modal fleet-edit-modal" dir="rtl" onSubmit={saveVehicle}><div className="modal-head"><div><h2>تعديل المركبة {editVehicle.plate_number}</h2><p>تنعكس التغييرات في دليل المركبات والتقارير المرتبطة بها</p></div><button type="button" className="ghost" onClick={()=>setEditVehicle(null)}>إغلاق</button></div><div className="incident-detail-grid">{[["رقم اللوحة","plate_number"],["الشركة المصنعة","manufacturer"],["الطراز","model"],["نوع المركبة","ambulance_type"],["مكان العمل","work_location"]].map(([title,key])=><label key={key}>{title}<input required={key==="plate_number"} value={editVehicle[key]||""} onChange={e=>setEditVehicle({...editVehicle,[key]:e.target.value})}/></label>)}<label>المحطة<select value={editVehicle.station_id||""} onChange={e=>setEditVehicle({...editVehicle,station_id:e.target.value})}><option value="">غير محددة</option>{stationsData.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>نوع الوقود<select value={editVehicle.fuel_type||""} onChange={e=>setEditVehicle({...editVehicle,fuel_type:e.target.value})}><option value="">غير محدد</option><option value="بنزين">بنزين</option><option value="سولار">سولار</option></select></label><label>حالة الخدمة<select disabled={editVehicle.service_status==="maintenance"} value={editVehicle.service_status||"active"} onChange={e=>setEditVehicle({...editVehicle,service_status:e.target.value})}><option value="active">داخل الخدمة</option><option value="out_of_service">خارج الخدمة</option>{editVehicle.service_status==="maintenance"&&<option value="maintenance">قيد الصيانة — تُغلق من طلب الصيانة</option>}</select></label><label>سبب الخروج من الخدمة<input value={editVehicle.out_of_service_reason||""} onChange={e=>setEditVehicle({...editVehicle,out_of_service_reason:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="ghost" onClick={()=>setEditVehicle(null)}>إلغاء</button><button className="primary" disabled={busy}><Save/> حفظ التعديلات</button></div></form></div>}
    {newVehicle&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setNewVehicle(null)}}><form className="incident-detail-modal fleet-edit-modal" dir="rtl" onSubmit={addVehicle}><div className="modal-head"><div><h2>إضافة مركبة جديدة</h2><p>أضيفي بيانات المركبة لتظهر في التعبئة والحركة والبلاغات</p></div><button type="button" className="ghost" onClick={()=>setNewVehicle(null)}>إغلاق</button></div><div className="incident-detail-grid">{[["رقم اللوحة","plateNumber"],["الشركة المصنعة","manufacturer"],["الطراز","model"],["نوع المركبة","ambulanceType"],["مكان العمل","workLocation"]].map(([title,key])=><label key={key}>{title}<input required={key==="plateNumber"} value={newVehicle[key]||""} onChange={e=>setNewVehicle({...newVehicle,[key]:e.target.value})}/></label>)}<label>المحطة<select value={newVehicle.stationId||""} onChange={e=>setNewVehicle({...newVehicle,stationId:e.target.value})}><option value="">غير محددة</option>{stationsData.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>نوع الوقود<select value={newVehicle.fuelType||""} onChange={e=>setNewVehicle({...newVehicle,fuelType:e.target.value})}><option value="">غير محدد</option><option value="بنزين">بنزين</option><option value="سولار">سولار</option></select></label></div><div className="modal-actions"><button type="button" className="ghost" onClick={()=>setNewVehicle(null)}>إلغاء</button><button className="primary" disabled={busy}><Save/> حفظ المركبة</button></div></form></div>}
  </div>;
}
