import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Boxes, ScanLine, Warehouse, Ruler, IndianRupee,
  AlertTriangle, TrendingUp, TrendingDown, Minus, Scissors, PackageCheck,
  ShoppingCart, Plus, Trash2, ChevronRight, ChevronDown, CheckCircle2, Search,
  LogOut, User, Lock, MapPin, Receipt, Settings, UserPlus, KeyRound, Ban, RotateCcw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import logoLT from "./Logo_LT.jpg";
/* ================= CONFIG ================= */
/* const API_BASE = "http://127.0.0.1:8000/api"; */
const API_BASE = "https://laxmi-server.onrender.com/api";

/* ================= DESIGN TOKENS ================= */
const C = {
  bg: "#F3EEE3", card: "#FFFDF8", indigo: "#2B3A55", indigoDeep: "#1D2A40",
  madder: "#A63D40", turmeric: "#D9A441", charcoal: "#2A2723", slate: "#6E6759",
  line: "#E4DCC8", teal: "#1F6E56", teal_bg: "#E4F0EB",
};
const serif = "'Georgia', 'Iowan Old Style', serif";
const sans = "'Segoe UI', system-ui, sans-serif";
const mono = "'Consolas', 'SF Mono', monospace";
const money = n => `₹${Math.round(n).toLocaleString("en-IN")}`;
const roleMap = { ADMIN: "Admin", BILLING: "Billing", WAREHOUSE: "Warehouse", PACKAGING: "Packaging" };
const roleMapReverse = { Admin: "ADMIN", Billing: "BILLING", Warehouse: "WAREHOUSE", Packaging: "PACKAGING" };
const roleIcons = { Admin: LayoutDashboard, Billing: ScanLine, Warehouse: Warehouse, Packaging: PackageCheck };

/* ================= SMALL UI ATOMS ================= */
function Tag({ children }) {
  return <span style={{ fontFamily: mono, fontSize: 10.5, padding: "3px 7px", border: `1px solid ${C.line}`, borderRadius: 4, background: "#FBF8F1", color: C.slate, whiteSpace: "nowrap" }}>{children}</span>;
}
function Pill({ color, bg, children }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, color, background: bg }}>{children}</span>;
}
function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, ...style }}>{children}</div>;
}
function ArrowTone({ tone }) {
  if (tone === "up") return <TrendingUp size={14} color={C.teal} />;
  if (tone === "down") return <TrendingDown size={14} color={C.madder} />;
  return <Minus size={14} color={C.slate} />;
}
function Header({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ fontFamily: serif, fontSize: 25, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>{subtitle}</div>
      </div>
      {right}
    </div>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: C.indigo, letterSpacing: 0.2 }}>{children}</div>;
}
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F6E4E3", color: C.madder, padding: "10px 14px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
      <span>{message}</span>
      <button onClick={onDismiss} style={{ border: "none", background: "none", color: C.madder, fontWeight: 700 }}>✕</button>
    </div>
  );
}
function Spinner() {
  return <div style={{ padding: 30, textAlign: "center", color: C.slate, fontSize: 13 }}>Loading…</div>;
}

/* ================= API HELPER =================
   Every network call in the app funnels through here so token attachment,
   base URL, and error shape are handled in exactly one place. */
function useApi(token, onAuthError) {
  return useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Token ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) onAuthError?.();
      throw new Error(body.detail || "You don't have permission to do that.");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || JSON.stringify(body) || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }, [token, onAuthError]);
}

/* ================= STAFF DIRECTORY (login screen only shows names; backend checks real creds) ================= */
const LOGIN_DIRECTORY = {
  Admin: [{ name: "Suresh Gupta", username: "suresh.gupta", title: "Owner / Admin" }],
  Billing: [
    { name: "Ramesh Yadav", username: "ramesh.yadav", title: "Counter 1" },
    { name: "Sita Devi", username: "sita.devi", title: "Counter 2" },
  ],
  Warehouse: [{ name: "Anil Kumar", username: "anil.kumar", title: "Warehouse in-charge" }],
  Packaging: [{ name: "Priya Singh", username: "priya.singh", title: "Packing desk" }],
};

/* ================= LOGIN PAGE ================= */
function LoginPage({ onLogin }) {
  const [role, setRole] = useState(null);
  const [staff, setStaff] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!staff) { setError("Select your name first"); return; }
    if (pin.length !== 4) { setError("Enter your 4-digit PIN"); return; }
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: staff.username, pin }),
      });
      if (!res.ok) {
        setError("Wrong name or PIN — try again.");
        setBusy(false);
        return;
      }
      const data = await res.json();
      const friendlyRole = roleMap[data.role] || data.role;
      onLogin(friendlyRole, data.full_name, data.token);
    } catch (e) {
      setError("Could not reach the server. Is Django running?");
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.indigo, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, padding: 20 }}>
      <div style={{ width: 380, background: C.card, borderRadius: 14, padding: 30, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img 
            src={logoLT} 
            alt="Laxmi Textiles Logo" 
            style={{ 
              width: 280, 
              height: 280, 
              objectFit: "contain", 
              margin: "0 auto 12px auto", 
              display: "block" 
            }} 
          />
          {/*<div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.indigo }}>Laxmi Textiles</div>*/}
          <div style={{ fontSize: 11.5, color: C.slate, letterSpacing: 0.5, marginTop: 0.5,fontWeight: 'bold' }}>STORE MANAGEMENT SYSTEM</div>
        </div>

        {!role && (
          <>
            <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 1 }}>Select your role to continue</div>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.keys(LOGIN_DIRECTORY).map(r => {
                const Icon = roleIcons[r];
                return (
                  <button key={r} onClick={() => setRole(r)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 9,
                    border: `1px solid ${C.line}`, background: "#FBF8F1", fontSize: 14, fontWeight: 600, color: C.charcoal, textAlign: "left"
                  }}>
                    <Icon size={17} color={C.indigo} />{r}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {role && (
          <>
            <button onClick={() => { setRole(null); setStaff(null); setPin(""); }} style={{ border: "none", background: "none", color: C.slate, fontSize: 12, marginBottom: 14, padding: 0 }}>
              ← Change role
            </button>
            <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 8 }}>Who's logging in? ({role})</div>
            <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
              {LOGIN_DIRECTORY[role].map(s => (
                <button key={s.name} onClick={() => setStaff(s)} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 8,
                  border: `1px solid ${staff?.name === s.name ? C.indigo : C.line}`, background: staff?.name === s.name ? "#E9ECF2" : "#FBF8F1",
                  fontSize: 13, textAlign: "left"
                }}>
                  <User size={14} color={C.indigo} />
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: C.slate, fontSize: 11.5 }}>· {s.title}</span>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 6 }}>4-digit PIN</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 12px", marginBottom: 10 }}>
              <Lock size={14} color={C.slate} />
              <input value={pin} maxLength={4} inputMode="numeric" onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••" style={{ border: "none", outline: "none", flex: 1, fontSize: 16, letterSpacing: 4 }} />
            </div>
            {error && <div style={{ fontSize: 12, color: C.madder, marginBottom: 8 }}>{error}</div>}
            <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "11px 0", border: "none", borderRadius: 8, background: C.indigo, color: "#fff", fontWeight: 700, fontSize: 14, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Checking…" : "Log in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= NAV ================= */
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 8, border: "none",
      background: active ? "rgba(255,255,255,0.12)" : "transparent", color: "#F3EEE3", fontSize: 13.5, fontWeight: active ? 700 : 400, textAlign: "left"
    }}>
      <Icon size={16} />{label}
    </button>
  );
}

/* ================= MAIN APP ================= */
export default function App() {
  // Token persists across refresh via localStorage — without this, refreshing
  // the page silently logged everyone out, which is unacceptable at a POS counter.
  const [token, setToken] = useState(() => localStorage.getItem("lt_token") || null);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("lt_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState(() => (localStorage.getItem("lt_token") ? "main" : "login"));
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [globalError, setGlobalError] = useState("");

  function notify(msg) { setToast(msg); setTimeout(() => setToast(null), 2400); }

  const handleAuthError = useCallback(() => {
    logout();
    setGlobalError("Your session expired — please log in again.");
  }, []);
  const api = useApi(token, handleAuthError);

  function login(role, name, tok) {
    localStorage.setItem("lt_token", tok);
    localStorage.setItem("lt_user", JSON.stringify({ role, name }));
    setToken(tok);
    setUser({ role, name });
    setView("main");
    setTab(role === "Admin" ? "dashboard" : role === "Billing" ? "billing" : role === "Warehouse" ? "warehouse" : "packaging");
  }
  function logout() {
    localStorage.removeItem("lt_token");
    localStorage.removeItem("lt_user");
    setToken(null);
    setUser(null);
    setView("login");
  }

  if (view === "login" || !user) return <LoginPage onLogin={login} />;

  const NAV = {
    Admin: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "stock", label: "Stock register", icon: Boxes },
      { id: "manage", label: "Manage staff & catalog", icon: Settings },
      { id: "standards", label: "Standards & automation", icon: Ruler },
    ],
    Billing: [
      { id: "billing", label: "Bill customer", icon: ScanLine },
      { id: "today", label: "Today's bills", icon: Receipt },
    ],
    Warehouse: [
      { id: "warehouse", label: "Receive & manage", icon: Warehouse },
      { id: "find", label: "Find item", icon: MapPin },
    ],
    Packaging: [{ id: "packaging", label: "Pack orders", icon: PackageCheck }],
  };

  return (
    <div style={{ fontFamily: sans, background: C.bg, minHeight: "100vh", color: C.charcoal, display: "flex" }}>
      <style>{`
        * { box-sizing: border-box; }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: inherit; }
        table { border-collapse: collapse; width: 100%; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 4px; }
        .navbtn:hover { background: rgba(255,255,255,0.08); }
        .rowhover:hover { background: #FBF6EA; }
      `}</style>

      <div style={{ width: 232, background: C.indigo, color: "#F3EEE3", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "0 8px 16px 8px" }}>
          <img 
            src={logoLT} 
            alt="Laxmi Textiles Logo" 
            style={{ 
              width: 150, 
              height: 150, 
              objectFit: "contain", 
              margin: "0 auto 12px auto", 
              display: "block" 
            }} 
          />
          {/*<div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700 }}>Laxmi Textiles</div>*/}
          <div style={{ fontSize: 10.5, opacity: 0.65, marginTop: 2, letterSpacing: 0.4 }}>INVENTORY LEDGER</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.18)", borderRadius: 8, padding: "9px 10px", marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.turmeric, color: C.indigoDeep, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
            {user.name.split(" ").map(w => w[0]).join("")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{user.role}</div>
          </div>
          <button onClick={logout} title="Log out" style={{ border: "none", background: "none", color: "#F3EEE3", opacity: 0.8 }}><LogOut size={15} /></button>
        </div>

        {NAV[user.role].map(n => <NavItem key={n.id} icon={n.icon} label={n.label} active={tab === n.id} onClick={() => setTab(n.id)} />)}

        <div style={{ marginTop: "auto", fontSize: 10, opacity: 0.5, padding: 8, lineHeight: 1.5 }}>
          Ledger is source of truth.<br />Balances reconciled nightly.
        </div>
      </div>

      <div style={{ flex: 1, padding: "26px 30px", maxWidth: 1320 }}>
        {globalError && <ErrorBanner message={globalError} onDismiss={() => setGlobalError("")} />}
        {tab === "dashboard" && <Dashboard api={api} notify={notify} setGlobalError={setGlobalError} />}
        {tab === "stock" && <StockRegister api={api} setGlobalError={setGlobalError} />}
        {tab === "manage" && <ManagePage api={api} notify={notify} setGlobalError={setGlobalError} />}
        {tab === "standards" && <Standards api={api} notify={notify} setGlobalError={setGlobalError} />}
        {tab === "billing" && <Billing api={api} notify={notify} setGlobalError={setGlobalError} />}
        {tab === "today" && <TodaysBills api={api} user={user} setGlobalError={setGlobalError} />}
        {tab === "warehouse" && <WarehouseView api={api} notify={notify} setGlobalError={setGlobalError} />}
        {tab === "find" && <FindItem api={api} setGlobalError={setGlobalError} />}
        {tab === "packaging" && <PackagingView />}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: C.indigoDeep, color: "#fff", padding: "12px 18px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          <CheckCircle2 size={16} color={C.turmeric} />{toast}
        </div>
      )}
    </div>
  );
}

/* ================= DASHBOARD ================= */
function Dashboard({ api, notify, setGlobalError }) {
  const [summary, setSummary] = useState(null);
  const [skus, setSkus] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api("/dashboard/summary/"),
      api("/skus/"),
      api("/skus/alerts/"),
      api("/dashboard/trend/"),
    ]).then(([s, sk, al, tr]) => {
      if (cancelled) return;
      setSummary(s); setSkus(sk); setAlerts(al); setTrend(tr);
    }).catch(e => setGlobalError(e.message)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [api, setGlobalError]);

  const categoryData = useMemo(() => {
    const map = {};
    skus.forEach(p => { map[p.item_type] = (map[p.item_type] || 0) + p.base_price * p.physical_stock; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [skus]);

  const tierPie = useMemo(() => {
    const map = { fast: 0, medium: 0, slow: 0, dead: 0 };
    skus.forEach(p => { if (map[p.movement_tier] !== undefined) map[p.movement_tier]++; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [skus]);
  const pieColors = { fast: C.teal, medium: C.turmeric, slow: "#B5591A", dead: C.madder };

  if (loading) return <Spinner />;

  return (
    <div>
      <Header title="Today at Laxmi Textiles" subtitle="Live data from the backend — owner overview of inventory, profit, and where attention is needed" />

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginTop: 18 }}>
          <KPI label="Today's revenue" value={money(summary.today_revenue)} icon={<IndianRupee size={16} />} accent={C.teal} sub={`${summary.today_bill_count} bills`} />
          <KPI label="Inventory value (cost)" value={money(summary.inventory_value)} icon={<Boxes size={16} />} />
          <KPI label="Gross margin potential" value={money(summary.gross_margin_potential)} icon={<TrendingUp size={16} />} accent={C.teal} />
          <KPI label="GMROI" value={summary.gmroi} icon={<Boxes size={16} />} sub="profit per ₹1 invested" />
          <KPI label="Dead stock value" value={money(summary.dead_stock_value)} icon={<AlertTriangle size={16} />} accent={C.madder} warn={summary.dead_stock_value > 0} />
          <KPI label="Below safety stock" value={summary.low_stock_count} icon={<AlertTriangle size={16} />} accent={C.turmeric} warn={summary.low_stock_count > 0} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 18 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Sales trend — last 7 days</SectionTitle>
          <div style={{ height: 200, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.slate }} />
                <YAxis tick={{ fontSize: 11, fill: C.slate }} />
                <Tooltip formatter={v => money(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
                <Line type="monotone" dataKey="sales" stroke={C.indigo} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 10.5, color: C.slate, marginTop: 4 }}>Real revenue by day, from Bill records — run simulate_activity for demo history.</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Movement mix</SectionTitle>
          <div style={{ height: 150, marginTop: 6 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierPie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62} paddingAngle={3}>
                  {tierPie.map((e, i) => <Cell key={i} fill={pieColors[e.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {tierPie.map(e => (
              <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.slate }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: pieColors[e.name] }} /> {e.name} ({e.value})
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ padding: 18, marginTop: 16 }}>
        <SectionTitle>Category value</SectionTitle>
        <div style={{ height: 190, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ left: -10 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.slate }} interval={0} angle={-20} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11, fill: C.slate }} />
              <Tooltip formatter={v => money(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
              <Bar dataKey="value" fill={C.indigo} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card style={{ padding: 18, marginTop: 16 }}>
        <SectionTitle>Profit opportunities — action feed</SectionTitle>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {alerts.length === 0 && <div style={{ fontSize: 13, color: C.slate }}>No urgent actions right now.</div>}
          {alerts.slice(0, 10).map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: a.kind === "reorder" ? "#FBF3E4" : "#F6E4E3", fontSize: 12.5 }}>
              <AlertTriangle size={15} color={a.kind === "reorder" ? C.turmeric : C.madder} />
              <span style={{ flex: 1 }}>{a.text}</span>
              <Tag>{a.sku}</Tag>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
function KPI({ label, value, icon, accent = C.indigo, sub, warn }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: warn ? C.madder : accent, marginBottom: 8 }}>
        {icon}<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.2 }}>{label.toUpperCase()}</span>
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, fontFamily: serif }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.slate, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

/* ================= STOCK REGISTER ================= */
function StockRegister({ api, setGlobalError }) {
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [expType, setExpType] = useState({});
  const [expBrand, setExpBrand] = useState({});

  useEffect(() => {
    let cancelled = false;
    api("/skus/").then(d => !cancelled && setSkus(d)).catch(e => setGlobalError(e.message)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [api, setGlobalError]);

  const grouped = useMemo(() => {
    const byType = {};
    skus.forEach(p => {
      if (!(p.brand_name + p.item_type + p.color + p.sku_code).toLowerCase().includes(q.toLowerCase())) return;
      byType[p.item_type] = byType[p.item_type] || {};
      byType[p.item_type][p.brand_name] = byType[p.item_type][p.brand_name] || [];
      byType[p.item_type][p.brand_name].push(p);
    });
    return byType;
  }, [skus, q]);

  if (loading) return <Spinner />;

  return (
    <div>
      <Header title="Stock register" subtitle="Grouped by item type → company → colour, live from the database" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 12px", maxWidth: 340 }}>
        <Search size={15} color={C.slate} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search brand, type, colour, SKU..." style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, flex: 1, color: C.charcoal }} />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {Object.entries(grouped).map(([type, brands]) => {
          const allItems = Object.values(brands).flat();
          const typeOpen = expType[type] !== false;
          const typeValue = allItems.reduce((s, p) => s + (p.cost_price || 0) * p.physical_stock, 0);
          return (
            <Card key={type} style={{ overflow: "hidden" }}>
              <button onClick={() => setExpType({ ...expType, [type]: !typeOpen })} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px",
                background: C.indigo, color: "#F3EEE3", border: "none", fontSize: 14, fontWeight: 700
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {typeOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {type}
                </span>
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>{allItems.length} SKUs{typeValue ? ` · ${money(typeValue)} cost value` : ""}</span>
              </button>

              {typeOpen && Object.entries(brands).map(([brand, items]) => {
                const key = `${type}__${brand}`;
                const open = expBrand[key] !== false;
                return (
                  <div key={key} style={{ borderTop: `1px solid ${C.line}` }}>
                    <button onClick={() => setExpBrand({ ...expBrand, [key]: !open })} style={{
                      width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px",
                      background: "#FBF6EA", border: "none", fontSize: 13, fontWeight: 700, color: C.charcoal
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {brand}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 400, color: C.slate }}>{items.length} colours</span>
                    </button>
                    {open && (
                      <table>
                        <thead>
                          <tr style={{ textAlign: "left" }}>
                            {["SKU", "Colour", "Rack", "Stock", "ATP", "Movement", "Price → suggested"].map(h => (
                              <th key={h} style={{ padding: "8px 20px", fontSize: 10.5, color: C.slate, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>{h.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(p => {
                            const meta = tierMeta[p.movement_tier] || tierMeta.dead;
                            const suggested = p.suggested_price ?? p.dynamic_price;
                            const tone = suggested > p.dynamic_price ? "up" : suggested < p.dynamic_price ? "down" : "flat";
                            return (
                              <tr key={p.id} className="rowhover" style={{ borderBottom: `1px solid ${C.line}` }}>
                                <td style={{ padding: "9px 20px" }}><Tag>{p.sku_code}</Tag></td>
                                <td style={{ padding: "9px 20px", fontSize: 12.5 }}>{p.color}</td>
                                <td style={{ padding: "9px 20px", fontSize: 11.5, color: C.slate }}>{p.rack}</td>
                                <td style={{ padding: "9px 20px", fontSize: 12.5 }}>{p.physical_stock} {p.unit_type}</td>
                                <td style={{ padding: "9px 20px", fontSize: 12.5, fontWeight: 700, color: p.atp <= 6 ? C.madder : C.charcoal }}>{p.atp}</td>
                                <td style={{ padding: "9px 20px" }}><Pill color={meta.color} bg={meta.bg}>{meta.label}{p.movement_score_value !== undefined ? ` · ${p.movement_score_value}` : ""}</Pill></td>
                                <td style={{ padding: "9px 20px", fontSize: 12.5 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700 }}>{money(p.dynamic_price)} <ArrowTone tone={tone} /> {money(suggested)}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
const tierMeta = {
  fast: { label: "Fast", color: C.teal, bg: C.teal_bg },
  medium: { label: "Medium", color: "#8A6D1F", bg: "#F7F0DD" },
  slow: { label: "Slow", color: "#B5591A", bg: "#FBE9DC" },
  dead: { label: "Dead", color: C.madder, bg: "#F6E4E3" },
  unknown: { label: "Unknown", color: C.slate, bg: "#EEE" },
};

/* ================= BILLING ================= */
function Billing({ api, notify, setGlobalError }) {
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selType, setSelType] = useState(null);
  const [selBrand, setSelBrand] = useState(null);
  const [qty, setQty] = useState({});
  const [cart, setCart] = useState([]);
  const [closing, setClosing] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api("/skus/").then(setSkus).catch(e => setGlobalError(e.message)).finally(() => setLoading(false));
  }, [api, setGlobalError]);
  useEffect(() => { reload(); }, [reload]);

  const types = [...new Set(skus.map(p => p.item_type))];
  const brands = selType ? [...new Set(skus.filter(p => p.item_type === selType).map(p => p.brand_name))] : [];
  const colours = selType && selBrand ? skus.filter(p => p.item_type === selType && p.brand_name === selBrand) : [];

  function addToCart(p) {
    const isMetre = p.unit_type === "metre";
    const q = parseFloat(qty[p.id] || "1");
    if (!q || q <= 0) return;
    if (q > p.atp) { notify(`Only ${p.atp} ${p.unit_type} available.`); return; }
    setCart(prev => {
      const found = prev.find(c => c.id === p.id);
      if (found) return prev.map(c => c.id === p.id ? { ...c, qty: +(c.qty + q).toFixed(2) } : c);
      return [...prev, { id: p.id, name: `${p.brand_name} — ${p.color}`, unit_type: p.unit_type, price: p.dynamic_price, qty: q }];
    });
    setQty({ ...qty, [p.id]: "" });
  }
  function removeFromCart(id) { setCart(prev => prev.filter(c => c.id !== id)); }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const taxable = subtotal / 1.05;
  const gst = subtotal - taxable;

  async function closeBill() {
    if (cart.length === 0) return;
    setClosing(true);
    try {
      await api("/billing/checkout/", {
        method: "POST",
        body: JSON.stringify({
          channel: "IN_STORE",
          payment_mode: "UPI",
          items: cart.map(c => ({ sku: c.id, quantity: c.qty, unit_price: c.price })),
        }),
      });
      notify(`Bill closed — ${money(subtotal)}`);
      setCart([]);
      reload(); // pull fresh stock levels after the sale
    } catch (e) {
      setGlobalError(e.message);
    }
    setClosing(false);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <Header title="Bill customer" subtitle="Choose item type → company → colour. Fabric items support meter-wise quantity." />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 18 }}>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {types.map(t => (
              <button key={t} onClick={() => { setSelType(t); setSelBrand(null); }} style={{
                padding: "8px 14px", borderRadius: 20, border: `1px solid ${selType === t ? C.indigo : C.line}`,
                background: selType === t ? C.indigo : C.card, color: selType === t ? "#fff" : C.charcoal, fontSize: 12.5, fontWeight: 600
              }}>{t}</button>
            ))}
          </div>

          {selType && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {brands.map(b => (
                <button key={b} onClick={() => setSelBrand(b)} style={{
                  padding: "7px 12px", borderRadius: 20, border: `1px solid ${selBrand === b ? C.turmeric : C.line}`,
                  background: selBrand === b ? "#FBF3E4" : C.card, color: C.charcoal, fontSize: 12, fontWeight: 600
                }}>{b}</button>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12 }}>
            {colours.map(p => {
              const isMetre = p.unit_type === "metre";
              return (
                <Card key={p.id} style={{ padding: 14, opacity: p.atp <= 0 ? 0.5 : 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.color}</div>
                  <div style={{ fontSize: 11, color: C.slate, marginBottom: 8 }}>{p.atp <= 0 ? "Out of stock" : `${p.atp} ${p.unit_type} left`}</div>
                  <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{money(p.dynamic_price)} <span style={{ fontSize: 11, fontFamily: sans, fontWeight: 400, color: C.slate }}>/{isMetre ? "m" : p.unit_type}</span></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" step={isMetre ? "0.25" : "1"} min="0" placeholder={isMetre ? "metres" : "qty"}
                      value={qty[p.id] || ""} onChange={e => setQty({ ...qty, [p.id]: e.target.value })}
                      disabled={p.atp <= 0}
                      style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 12.5 }} />
                    <button onClick={() => addToCart(p)} disabled={p.atp <= 0} style={{
                      padding: "7px 10px", borderRadius: 6, border: "none", background: C.teal, color: "#fff", fontSize: 12
                    }}><Plus size={13} /></button>
                  </div>
                </Card>
              );
            })}
            {!selType && <div style={{ fontSize: 13, color: C.slate }}>Pick an item type above to begin.</div>}
            {selType && !selBrand && <div style={{ fontSize: 13, color: C.slate }}>Pick a company/brand above.</div>}
          </div>
        </div>

        <Card style={{ padding: 16, alignSelf: "start", position: "sticky", top: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ShoppingCart size={16} color={C.indigo} /><SectionTitle>Current bill</SectionTitle>
          </div>
          {cart.length === 0 && <div style={{ fontSize: 13, color: C.slate }}>Cart is empty — add items on the left.</div>}
          <div style={{ display: "grid", gap: 8 }}>
            {cart.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                <div>{c.name} <span style={{ color: C.slate }}>× {c.qty}{c.unit_type === "metre" ? "m" : ""}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {money(c.price * c.qty)}
                  <button onClick={() => removeFromCart(c.id)} style={{ border: "none", background: "none", color: C.madder }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <>
              <div style={{ borderTop: `1px dashed ${C.line}`, margin: "12px 0" }} />
              <div style={{ fontSize: 12, color: C.slate, display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span>Taxable value</span><span>{money(taxable)}</span></div>
              <div style={{ fontSize: 12, color: C.slate, display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>GST (5%)</span><span>{money(gst)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                <span>Total</span><span>{money(subtotal)}</span>
              </div>
              <button onClick={closeBill} disabled={closing} style={{ width: "100%", padding: "12px 0", border: "none", borderRadius: 8, background: C.indigo, color: "#fff", fontWeight: 700, fontSize: 14, opacity: closing ? 0.7 : 1 }}>
                {closing ? "Closing…" : "Close bill"}
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function TodaysBills({ api, user, setGlobalError }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/billing/today/").then(setBills).catch(e => setGlobalError(e.message)).finally(() => setLoading(false));
  }, [api, setGlobalError]);
  if (loading) return <Spinner />;
  const total = bills.reduce((s, b) => s + parseFloat(b.total_amount), 0);
  return (
    <div>
      <Header title="Today's bills" subtitle={`Session summary for ${user.name}`} right={<Pill color={C.teal} bg={C.teal_bg}>{bills.length} bills · {money(total)}</Pill>} />
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {bills.length === 0 && <div style={{ fontSize: 13, color: C.slate }}>No bills closed yet today.</div>}
        {bills.map(b => (
          <Card key={b.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{b.bill_number}</span>
              <span style={{ fontSize: 12, color: C.slate }}>{new Date(b.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {b.items.map(it => (
              <div key={it.sku} style={{ fontSize: 12, color: C.slate, display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                <span>{it.sku_code} × {it.quantity}</span><span>{money(it.quantity * it.unit_price)}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
              <span>Total</span><span>{money(b.total_amount)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================= WAREHOUSE ================= */
function WarehouseView({ api, notify, setGlobalError }) {
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiveQty, setReceiveQty] = useState({});
  const [cutQty, setCutQty] = useState({});
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    api("/skus/").then(setSkus).catch(e => setGlobalError(e.message)).finally(() => setLoading(false));
  }, [api, setGlobalError]);
  useEffect(() => { reload(); }, [reload]);

  async function move(sku, eventType, qtyMap, setQtyMap) {
    const q = parseFloat(qtyMap[sku] || "0");
    if (!q) return;
    setBusyId(sku);
    try {
      await api("/stock/movement/", {
        method: "POST",
        body: JSON.stringify({ sku, event_type: eventType, quantity: q }),
      });
      notify(eventType === "PURCHASE_RECEIVE" ? `Received ${q} — ledger updated` : `Cut ${q}m — remnant tracked`);
      setQtyMap({ ...qtyMap, [sku]: "" });
      reload();
    } catch (e) {
      setGlobalError(e.message);
    }
    setBusyId(null);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <Header title="Receive & manage stock" subtitle="Every entry writes an immutable ledger record — nothing overwrites stock directly" />
      <Card style={{ marginTop: 16, overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "#FBF6EA", textAlign: "left" }}>
              {["SKU", "Product", "Rack", "Stock", "Receive stock", "Cut from roll"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontSize: 11, color: C.slate, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skus.map(p => (
              <tr key={p.id} className="rowhover" style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: "10px 14px" }}><Tag>{p.sku_code}</Tag></td>
                <td style={{ padding: "10px 14px", fontSize: 13 }}>{p.brand_name} — {p.item_type} · {p.color}</td>
                <td style={{ padding: "10px 14px", fontSize: 11.5, color: C.slate }}>{p.rack}</td>
                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700 }}>{p.physical_stock} {p.unit_type}</td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" placeholder="Qty" value={receiveQty[p.id] || ""} onChange={e => setReceiveQty({ ...receiveQty, [p.id]: e.target.value })}
                      style={{ width: 64, padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 12 }} />
                    <button onClick={() => move(p.id, "PURCHASE_RECEIVE", receiveQty, setReceiveQty)} disabled={busyId === p.id} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 700 }}>
                      <Plus size={12} style={{ verticalAlign: -2 }} /> Receive
                    </button>
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {p.unit_type === "metre" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" placeholder="m" value={cutQty[p.id] || ""} onChange={e => setCutQty({ ...cutQty, [p.id]: e.target.value })}
                        style={{ width: 56, padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 12 }} />
                      <button onClick={() => move(p.id, "CUT_FROM_ROLL", cutQty, setCutQty)} disabled={busyId === p.id} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.indigo}`, background: "transparent", color: C.indigo, fontSize: 12, fontWeight: 700 }}>
                        <Scissors size={12} style={{ verticalAlign: -2 }} /> Cut
                      </button>
                    </div>
                  ) : <span style={{ fontSize: 11, color: C.slate }}>Not applicable</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function FindItem({ api, setGlobalError }) {
  const [skus, setSkus] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => { api("/skus/").then(setSkus).catch(e => setGlobalError(e.message)); }, [api, setGlobalError]);
  const results = q ? skus.filter(p => (p.brand_name + p.item_type + p.color + p.sku_code).toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <div>
      <Header title="Find item" subtitle="Search by brand, type, colour, or SKU to locate rack position" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 14px", maxWidth: 400 }}>
        <Search size={16} color={C.slate} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Type to search..." style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, flex: 1 }} autoFocus />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {results.map(p => (
          <Card key={p.id} style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.brand_name} — {p.item_type} · {p.color}</div>
              <Tag>{p.sku_code}</Tag>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: C.indigo, fontSize: 15 }}><MapPin size={14} />{p.rack}</div>
              <div style={{ fontSize: 11.5, color: C.slate }}>{p.physical_stock} {p.unit_type} in stock</div>
            </div>
          </Card>
        ))}
        {q && results.length === 0 && <div style={{ fontSize: 13, color: C.slate }}>No matches.</div>}
      </div>
    </div>
  );
}

function PackagingView() {
  const orders = [
    { id: "LT-10451", items: ["Raymond Navy Suiting — 3m", "Nalli Silk Saree — Maroon"], packed: 2, total: 2 },
    { id: "LT-10452", items: ["Meena Bazaar Dupatta — Pink"], packed: 0, total: 1 },
  ];
  return (
    <div>
      <Header title="Pack orders" subtitle="Scan every item before marking an order packed — prevents wrong dispatches" />
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {orders.map(o => (
          <Card key={o.id} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Order {o.id}</div>
              <Pill color={o.packed === o.total ? C.teal : C.turmeric} bg={o.packed === o.total ? C.teal_bg : "#FBF3E4"}>{o.packed}/{o.total} scanned</Pill>
            </div>
            {o.items.map((it, i) => <div key={i} style={{ fontSize: 13, color: C.slate, padding: "4px 0" }}>• {it}</div>)}
            <button disabled={o.packed !== o.total} style={{
              marginTop: 10, padding: "9px 16px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 700,
              background: o.packed === o.total ? C.indigo : "#DDD6C4", color: o.packed === o.total ? "#fff" : "#8A8470"
            }}>Mark packed</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================= ADMIN: MANAGE STAFF & CATALOG (new) ================= */
function ManagePage({ api, notify, setGlobalError }) {
  const [sub, setSub] = useState("staff");
  return (
    <div>
      <Header title="Manage staff & catalog" subtitle="Create, edit, and deactivate accounts and stock resources — Admin only" />
      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button onClick={() => setSub("staff")} style={{
          padding: "8px 16px", borderRadius: 20, border: `1px solid ${sub === "staff" ? C.indigo : C.line}`,
          background: sub === "staff" ? C.indigo : C.card, color: sub === "staff" ? "#fff" : C.charcoal, fontSize: 12.5, fontWeight: 600
        }}>Staff accounts</button>
        <button onClick={() => setSub("catalog")} style={{
          padding: "8px 16px", borderRadius: 20, border: `1px solid ${sub === "catalog" ? C.indigo : C.line}`,
          background: sub === "catalog" ? C.indigo : C.card, color: sub === "catalog" ? "#fff" : C.charcoal, fontSize: 12.5, fontWeight: 600
        }}>Catalog & resources</button>
      </div>
      {sub === "staff" ? <StaffManager api={api} notify={notify} setGlobalError={setGlobalError} /> : <CatalogManager api={api} notify={notify} setGlobalError={setGlobalError} />}
    </div>
  );
}

function StaffManager({ api, notify, setGlobalError }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", role: "BILLING", pin: "" });
  const [pinResetId, setPinResetId] = useState(null);
  const [newPin, setNewPin] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    api("/admin/staff/").then(setStaff).catch(e => setGlobalError(e.message)).finally(() => setLoading(false));
  }, [api, setGlobalError]);
  useEffect(() => { reload(); }, [reload]);

  async function createStaff() {
    if (!form.username || !form.full_name || form.pin.length < 4) { notify("Fill in all fields (PIN needs 4+ digits)."); return; }
    try {
      await api("/admin/staff/", { method: "POST", body: JSON.stringify(form) });
      notify(`${form.full_name} added as ${roleMap[form.role]}.`);
      setForm({ username: "", full_name: "", role: "BILLING", pin: "" });
      setShowAdd(false);
      reload();
    } catch (e) { setGlobalError(e.message); }
  }
  async function toggleActive(person) {
    try {
      if (person.is_active) {
        await api(`/admin/staff/${person.id}/`, { method: "DELETE" });
        notify(`${person.full_name} deactivated.`);
      } else {
        await api(`/admin/staff/${person.id}/reactivate/`, { method: "POST" });
        notify(`${person.full_name} reactivated.`);
      }
      reload();
    } catch (e) { setGlobalError(e.message); }
  }
  async function resetPin() {
    if (newPin.length < 4) { notify("PIN needs at least 4 digits."); return; }
    try {
      await api(`/admin/staff/${pinResetId}/reset_pin/`, { method: "POST", body: JSON.stringify({ pin: newPin }) });
      notify("PIN reset successfully.");
      setPinResetId(null); setNewPin("");
    } catch (e) { setGlobalError(e.message); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: C.indigo, color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
          <UserPlus size={14} /> Add staff member
        </button>
      </div>

      {showAdd && (
        <Card style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <LabeledInput label="Username" value={form.username} onChange={v => setForm({ ...form, username: v })} placeholder="ramesh.yadav" />
            <LabeledInput label="Full name" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} placeholder="Ramesh Yadav" />
            <label style={{ fontSize: 11, color: C.slate }}>Role
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ display: "block", width: "100%", marginTop: 3, padding: "7px 9px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}>
                <option value="ADMIN">Admin</option>
                <option value="BILLING">Billing</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="PACKAGING">Packaging</option>
              </select>
            </label>
            <LabeledInput label="Initial PIN" value={form.pin} onChange={v => setForm({ ...form, pin: v.replace(/\D/g, "") })} placeholder="1006" />
            <button onClick={createStaff} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: C.teal, color: "#fff", fontSize: 12.5, fontWeight: 700, height: 34 }}>Create</button>
          </div>
        </Card>
      )}

      <Card style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr style={{ background: "#FBF6EA", textAlign: "left" }}>
              {["Name", "Username", "Role", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: C.slate, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(p => (
              <tr key={p.id} className="rowhover" style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{p.full_name}</td>
                <td style={{ padding: "10px 16px" }}><Tag>{p.username}</Tag></td>
                <td style={{ padding: "10px 16px" }}><Pill color={C.indigo} bg="#E9ECF2">{roleMap[p.role] || p.role}</Pill></td>
                <td style={{ padding: "10px 16px" }}>
                  <Pill color={p.is_active ? C.teal : C.madder} bg={p.is_active ? C.teal_bg : "#F6E4E3"}>{p.is_active ? "Active" : "Deactivated"}</Pill>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setPinResetId(p.id)} title="Reset PIN" style={{ border: "none", background: "none", color: C.indigo, display: "flex", alignItems: "center", gap: 4, fontSize: 11.5 }}>
                      <KeyRound size={13} /> Reset PIN
                    </button>
                    <button onClick={() => toggleActive(p)} title={p.is_active ? "Deactivate" : "Reactivate"} style={{ border: "none", background: "none", color: p.is_active ? C.madder : C.teal, display: "flex", alignItems: "center", gap: 4, fontSize: 11.5 }}>
                      {p.is_active ? <><Ban size={13} /> Deactivate</> : <><RotateCcw size={13} /> Reactivate</>}
                    </button>
                  </div>
                  {pinResetId === p.id && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="New PIN" style={{ width: 80, padding: "5px 7px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 12 }} />
                      <button onClick={resetPin} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: C.indigo, color: "#fff", fontSize: 11 }}>Save</button>
                      <button onClick={() => { setPinResetId(null); setNewPin(""); }} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.line}`, background: "transparent", fontSize: 11 }}>Cancel</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CatalogManager({ api, notify, setGlobalError }) {
  const [skus, setSkus] = useState([]);
  const [brands, setBrands] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddSku, setShowAddSku] = useState(false);
  const [skuForm, setSkuForm] = useState({ brand_id: "", color: "", unit_type: "piece", cost_price: "", mrp: "", base_price: "", rack: "", opening_stock: "0" });

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([api("/skus/"), api("/brands/"), api("/item-types/")])
      .then(([sk, br, it]) => { setSkus(sk); setBrands(br); setItemTypes(it); })
      .catch(e => setGlobalError(e.message))
      .finally(() => setLoading(false));
  }, [api, setGlobalError]);
  useEffect(() => { reload(); }, [reload]);

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({ cost_price: p.cost_price, mrp: p.mrp, base_price: p.base_price, dynamic_price: p.dynamic_price, rack: p.rack, safety_stock_threshold: p.safety_stock_threshold || 6 });
  }
  async function saveEdit(id) {
    try {
      await api(`/admin/skus/${id}/`, { method: "PATCH", body: JSON.stringify(editForm) });
      notify("SKU updated.");
      setEditingId(null);
      reload();
    } catch (e) { setGlobalError(e.message); }
  }
  async function deactivateSku(id) {
    try {
      await api(`/admin/skus/${id}/`, { method: "DELETE" });
      notify("SKU deactivated.");
      reload();
    } catch (e) { setGlobalError(e.message); }
  }
  async function createSku() {
    if (!skuForm.brand_id || !skuForm.color || !skuForm.cost_price || !skuForm.mrp || !skuForm.base_price) {
      notify("Fill in brand, colour, and all three prices."); return;
    }
    try {
      await api("/admin/skus/", { method: "POST", body: JSON.stringify(skuForm) });
      notify(`${skuForm.color} added.`);
      setSkuForm({ brand_id: "", color: "", unit_type: "piece", cost_price: "", mrp: "", base_price: "", rack: "", opening_stock: "0" });
      setShowAddSku(false);
      reload();
    } catch (e) { setGlobalError(e.message); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setShowAddSku(!showAddSku)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: C.indigo, color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
          <Plus size={14} /> Add colour under a brand
        </button>
      </div>

      {showAddSku && (
        <Card style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: C.slate }}>Brand
              <select value={skuForm.brand_id} onChange={e => setSkuForm({ ...skuForm, brand_id: e.target.value })} style={{ display: "block", width: "100%", marginTop: 3, padding: "7px 9px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}>
                <option value="">Select brand…</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name} ({b.item_type_name})</option>)}
              </select>
            </label>
            <LabeledInput label="Colour" value={skuForm.color} onChange={v => setSkuForm({ ...skuForm, color: v })} placeholder="Teal" />
            <label style={{ fontSize: 11, color: C.slate }}>Unit type
              <select value={skuForm.unit_type} onChange={e => setSkuForm({ ...skuForm, unit_type: e.target.value })} style={{ display: "block", width: "100%", marginTop: 3, padding: "7px 9px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13 }}>
                <option value="piece">Piece</option>
                <option value="metre">Metre</option>
                <option value="set">Set</option>
                <option value="dozen">Dozen</option>
                <option value="kg">Kg</option>
              </select>
            </label>
            <LabeledInput label="Rack" value={skuForm.rack} onChange={v => setSkuForm({ ...skuForm, rack: v })} placeholder="A-1" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 8, alignItems: "end" }}>
            <LabeledInput label="Cost price" value={skuForm.cost_price} onChange={v => setSkuForm({ ...skuForm, cost_price: v })} placeholder="260" />
            <LabeledInput label="MRP" value={skuForm.mrp} onChange={v => setSkuForm({ ...skuForm, mrp: v })} placeholder="750" />
            <LabeledInput label="Selling price" value={skuForm.base_price} onChange={v => setSkuForm({ ...skuForm, base_price: v })} placeholder="599" />
            <LabeledInput label="Opening stock" value={skuForm.opening_stock} onChange={v => setSkuForm({ ...skuForm, opening_stock: v })} placeholder="24" />
            <button onClick={createSku} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: C.teal, color: "#fff", fontSize: 12.5, fontWeight: 700, height: 34 }}>Create</button>
          </div>
        </Card>
      )}

      <Card style={{ overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ background: "#FBF6EA", textAlign: "left" }}>
              {["SKU", "Brand · Colour", "Cost", "MRP", "Selling", "Rack", "Safety stock", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontSize: 10.5, color: C.slate, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skus.map(p => {
              const editing = editingId === p.id;
              return (
                <tr key={p.id} className="rowhover" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td style={{ padding: "9px 14px" }}><Tag>{p.sku_code}</Tag></td>
                  <td style={{ padding: "9px 14px", fontSize: 12.5 }}>{p.brand_name} — {p.color}</td>
                  {editing ? (
                    <>
                      <td style={{ padding: "6px 14px" }}><MiniInput value={editForm.cost_price} onChange={v => setEditForm({ ...editForm, cost_price: v })} /></td>
                      <td style={{ padding: "6px 14px" }}><MiniInput value={editForm.mrp} onChange={v => setEditForm({ ...editForm, mrp: v })} /></td>
                      <td style={{ padding: "6px 14px" }}><MiniInput value={editForm.base_price} onChange={v => setEditForm({ ...editForm, base_price: v })} /></td>
                      <td style={{ padding: "6px 14px" }}><MiniInput value={editForm.rack} onChange={v => setEditForm({ ...editForm, rack: v })} /></td>
                      <td style={{ padding: "6px 14px" }}><MiniInput value={editForm.safety_stock_threshold} onChange={v => setEditForm({ ...editForm, safety_stock_threshold: v })} /></td>
                      <td style={{ padding: "9px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => saveEdit(p.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: C.teal, color: "#fff", fontSize: 11 }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.line}`, background: "transparent", fontSize: 11 }}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "9px 14px", fontSize: 12.5 }}>{p.cost_price ? money(p.cost_price) : "—"}</td>
                      <td style={{ padding: "9px 14px", fontSize: 12.5 }}>{p.mrp ? money(p.mrp) : "—"}</td>
                      <td style={{ padding: "9px 14px", fontSize: 12.5, fontWeight: 700 }}>{money(p.dynamic_price)}</td>
                      <td style={{ padding: "9px 14px", fontSize: 11.5, color: C.slate }}>{p.rack}</td>
                      <td style={{ padding: "9px 14px", fontSize: 11.5, color: C.slate }}>{p.safety_stock_threshold ?? "—"}</td>
                      <td style={{ padding: "9px 14px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => startEdit(p)} style={{ border: "none", background: "none", color: C.indigo, fontSize: 11.5 }}>Edit</button>
                          <button onClick={() => deactivateSku(p.id)} style={{ border: "none", background: "none", color: C.madder, fontSize: 11.5 }}>Deactivate</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <div style={{ fontSize: 11, color: C.slate, marginTop: 8 }}>
        Deactivating hides a SKU from billing/warehouse without deleting its sales history — stock quantity itself only ever changes through the ledger (Warehouse's Receive/Cut actions), never edited here directly.
      </div>
    </div>
  );
}
function MiniInput({ value, onChange }) {
  return <input value={value ?? ""} onChange={e => onChange(e.target.value)} style={{ width: 70, padding: "5px 7px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 12 }} />;
}

/* ================= STANDARDS & AUTOMATION ================= */
function Standards({ api, notify, setGlobalError }) {
  const [brand, setBrand] = useState("Raymond");
  const [fabric, setFabric] = useState("Cotton");
  const [color, setColor] = useState("Navy");
  const [batch, setBatch] = useState("1024");
  const [liveRunning, setLiveRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const skuCode = `${short(brand)}-${short(fabric)}-${short(color)}-B${batch}`;

  useEffect(() => {
    if (!api) return;
    api("/admin/demo/").then(d => setLiveRunning(d.live_running)).catch(() => {});
  }, [api]);

  async function runAction(action, extra = {}) {
    setBusy(true);
    try {
      const res = await api("/admin/demo/", { method: "POST", body: JSON.stringify({ action, ...extra }) });
      notify(res.detail);
      if ("live_running" in res) setLiveRunning(res.live_running);
    } catch (e) { setGlobalError(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <Header title="Standards & automation" subtitle="Rules that keep data consistent, and what the system does automatically without asking" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle>SKU naming standard</SectionTitle>
          <div style={{ fontSize: 12.5, color: C.slate, margin: "8px 0 14px" }}>
            Every SKU follows: <code style={{ fontFamily: mono }}>BRAND-FABRIC-COLOUR-BATCH</code>. Try it below.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <LabeledInput label="Brand" value={brand} onChange={setBrand} />
            <LabeledInput label="Fabric" value={fabric} onChange={setFabric} />
            <LabeledInput label="Colour" value={color} onChange={setColor} />
            <LabeledInput label="Batch no." value={batch} onChange={setBatch} />
          </div>
          <div style={{ padding: "12px 14px", background: "#FBF6EA", borderRadius: 8, border: `1px dashed ${C.line}` }}>
            <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>GENERATED SKU / BARCODE SEED</div>
            <Tag>{skuCode}</Tag>
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <SectionTitle>Unit-of-measure standard</SectionTitle>
          <div style={{ fontSize: 12.5, color: C.slate, margin: "8px 0 12px" }}>Every SKU is tagged with exactly one type — never mixed within a SKU.</div>
          <div style={{ display: "grid", gap: 6 }}>
            {[
              ["metre", "Piece goods cut from a roll — suiting, shirting"],
              ["piece", "Stitched/finished items — kurta, saree, dupatta"],
              ["set", "Multi-part items sold together — bedsheet sets"],
              ["dozen / gross", "Haberdashery — buttons, hooks, lace by count"],
              ["kg", "Raw yarn, thread cones sold by weight"],
            ].map(([u, d]) => (
              <div key={u} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 12.5 }}>
                <Tag>{u}</Tag><span style={{ color: C.slate }}>{d}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card style={{ padding: 18, marginTop: 16 }}>
        <SectionTitle>What the system automates (no manual step needed)</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginTop: 12 }}>
          {[
            ["Ledger entry on every movement", "Sale, receive, cut, damage, return — each writes an immutable record; stock balance is never edited directly."],
            ["ATP recalculation", "Available-to-promise updates instantly across counter, warehouse, and online on every transaction."],
            ["Movement scoring", "Every SKU is re-scored (fast/medium/slow/dead) from velocity, sell-through, recency, and turnover — no manual tagging."],
            ["Price suggestions", "Fast movers with low stock get a markup nudge; slow/dead stock gets a discount suggestion — owner approves or overrides."],
            ["Reorder alerts", "Triggered automatically when ATP drops below the safety stock threshold."],
            ["Remnant tracking", "Cutting from a roll auto-creates a trackable remnant instead of silently losing the leftover length."],
            ["GST auto-split", "Every bill separates taxable value and GST automatically — no manual tax calculation at the counter."],
            ["Role-based data hiding", "Cost price and margins are never shown to billing/warehouse/packaging screens — enforced by the backend serializer, not just the UI."],
            ["Staff & catalog management", "Admin can add/deactivate staff, reset PINs, add new brand colours, and edit price/rack fields — all from the Manage page, without touching the database directly."],
          ].map(([t, d]) => (
            <div key={t} style={{ padding: 12, borderRadius: 8, background: "#FBF6EA", border: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <ChevronRight size={13} color={C.turmeric} />{t}
              </div>
              <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 18, marginTop: 16, border: `1px solid ${C.turmeric}` }}>
        <SectionTitle>Presentation / demo controls</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.slate, margin: "8px 0 14px" }}>
          No terminal or CLI needed — these buttons call the backend directly, so they work on any host, including free tiers with no shell access.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => runAction("seed")} disabled={busy} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.indigo}`, background: "transparent", color: C.indigo, fontSize: 12.5, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
            Seed catalog + staff (safe to re-run)
          </button>
          <button onClick={() => runAction("backfill", { days: 14 })} disabled={busy} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: C.indigo, color: "#fff", fontSize: 12.5, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
            Backfill 14 days of sales
          </button>
          {!liveRunning ? (
            <button onClick={() => runAction("live_start", { interval: 5 })} disabled={busy} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: C.teal, color: "#fff", fontSize: 12.5, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
              ▶ Start live ticker
            </button>
          ) : (
            <button onClick={() => runAction("live_stop")} disabled={busy} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: C.madder, color: "#fff", fontSize: 12.5, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
              ■ Stop live ticker
            </button>
          )}
          <Pill color={liveRunning ? C.teal : C.slate} bg={liveRunning ? C.teal_bg : "#EEE"}>{liveRunning ? "● Live — writing sales every few seconds" : "○ Not running"}</Pill>
        </div>
      </Card>
    </div>
  );
}
function short(s, n = 3) { return s.replace(/[^A-Za-z]/g, "").slice(0, n).toUpperCase(); }
function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <label style={{ fontSize: 11, color: C.slate }}>
      {label}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
        display: "block", width: "100%", marginTop: 3, padding: "7px 9px", borderRadius: 6, border: `1px solid ${C.line}`, fontSize: 13
      }} />
    </label>
  );
}
