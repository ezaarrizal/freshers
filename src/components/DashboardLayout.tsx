import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { path: "/dashboard",          icon: "⚡", label: "Overview" },
  { path: "/dashboard/projects", icon: "🗂️", label: "Browse Projects" },
  { path: "/dashboard/my-projects", icon: "📋", label: "My Projects" },
  { path: "/dashboard/wallet",   icon: "💰", label: "Wallet" },
  { path: "/dashboard/profile",  icon: "👤", label: "Profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div style={s.wrapper}>
      <style>{css}</style>

      {/* SIDEBAR */}
      <aside style={{ ...s.sidebar, width: collapsed ? "72px" : "240px" }}>
        {/* Logo */}
        <div style={s.logoArea}>
          {!collapsed && (
            <Link to="/" style={{ textDecoration: "none" }}>
              <span style={s.logoMain}>fresh</span>
              <span style={s.logoAccent}>ers</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={s.collapseBtn}>
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{
                ...s.navItem,
                background: active ? "rgba(99,102,241,0.15)" : "transparent",
                borderColor: active ? "rgba(99,102,241,0.4)" : "transparent",
                color: active ? "#a78bfa" : "#94a3b8",
                justifyContent: collapsed ? "center" : "flex-start",
              }} className="nav-item">
                <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                {!collapsed && <span style={s.navLabel}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={s.userArea}>
          {!collapsed && (
            <div style={s.userInfo}>
              <div style={s.userAvatar}>
                {user?.email?.[0].toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={s.userName}>{user?.user_metadata?.full_name || "Freshers User"}</div>
                <div style={s.userEmail}>{user?.email}</div>
              </div>
            </div>
          )}
          <button onClick={handleSignOut} style={{
            ...s.signOutBtn,
            justifyContent: collapsed ? "center" : "flex-start",
          }} className="nav-item">
            <span>🚪</span>
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        {children}
      </main>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', sans-serif; background: #0f0f1a; color: #e2e8f0; }
  .nav-item:hover { background: rgba(255,255,255,0.05) !important; color: #e2e8f0 !important; border-color: rgba(255,255,255,0.08) !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
`;

const s: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", minHeight: "100vh", background: "#0f0f1a", fontFamily: "'Inter', sans-serif" },
  sidebar: { display: "flex", flexDirection: "column", background: "#1a1a2e", borderRight: "1px solid rgba(255,255,255,0.06)", transition: "width 0.3s ease", overflow: "hidden", position: "sticky", top: 0, height: "100vh", flexShrink: 0 },
  logoArea: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", minHeight: "72px" },
  logoMain: { fontSize: "1.4rem", fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  logoAccent: { fontSize: "1.4rem", fontWeight: 800, background: "linear-gradient(135deg,#f59e0b,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  collapseBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", width: "28px", height: "28px", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  nav: { display: "flex", flexDirection: "column", gap: "4px", padding: "16px 8px", flex: 1 },
  navItem: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500, transition: "all 0.2s", border: "1px solid transparent", whiteSpace: "nowrap" },
  navLabel: { fontSize: "0.9rem", fontWeight: 500 },
  userArea: { padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  userInfo: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", marginBottom: "4px" },
  userAvatar: { width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userEmail: { fontSize: "0.75rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  signOutBtn: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "12px", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.9rem", width: "100%", transition: "all 0.2s" },
  main: { flex: 1, overflow: "auto", padding: "32px" },
};