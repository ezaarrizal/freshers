import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  estimated_duration: string;
  created_at: string;
  member_fee: number;
  project_roles: { id: string; is_filled: boolean }[];
  project_members: { id: string; status: string }[];
}

interface MembershipProject {
  id: string;
  title: string;
  description: string;
  status: string;
  estimated_duration: string;
  profiles: { full_name: string } | { full_name: string }[];
  project_roles: { id: string; is_filled: boolean }[];
}

interface Membership {
  id: string;
  role: string;
  status: string;
  joined_at: string;
  projects: MembershipProject | MembershipProject[];
}

type TabType = "created" | "joined";

export default function MyProjectsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("created");
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [joinedProjects, setJoinedProjects] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);

    const { data: created } = await supabase
      .from("projects")
      .select(`
        id, title, description, status, estimated_duration, created_at, member_fee,
        project_roles(id, is_filled),
        project_members(id, status)
      `)
      .eq("creator_id", user!.id)
      .order("created_at", { ascending: false });

    const { data: joined } = await supabase
      .from("project_members")
      .select(`
        id, role, status, joined_at,
        projects(
          id, title, description, status, estimated_duration,
          profiles(full_name),
          project_roles(id, is_filled)
        )
      `)
      .eq("user_id", user!.id)
      .order("joined_at", { ascending: false });

    setCreatedProjects(created || []);
    setJoinedProjects(joined || []);
    setLoading(false);
  };

  const totalCreated = createdProjects.length;
  const totalJoined = joinedProjects.length;
  const totalActive = [
    ...createdProjects.filter(p => p.status === "in_progress" || p.status === "open"),
    ...joinedProjects.filter(m => m.status === "active"),
  ].length;
  const totalCompleted = [
    ...createdProjects.filter(p => p.status === "completed"),
    ...joinedProjects.filter(m => m.status === "completed"),
  ].length;

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Projects 📋</h1>
          <p style={s.sub}>Semua project yang kamu buat dan ikuti</p>
        </div>
        <Link to="/dashboard/projects/create" style={s.createBtn} className="create-btn">
          ➕ Buat Project
        </Link>
      </div>

      {/* SUMMARY STATS */}
      <div style={s.statsGrid}>
        {[
          { icon: "📁", label: "Dibuat", value: totalCreated, color: "#6366f1" },
          { icon: "🤝", label: "Diikuti", value: totalJoined, color: "#f59e0b" },
          { icon: "⚡", label: "Aktif", value: totalActive, color: "#10b981" },
          { icon: "✅", label: "Selesai", value: totalCompleted, color: "#a78bfa" },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ ...s.statIcon, background: `${stat.color}18`, color: stat.color }}>
              {stat.icon}
            </div>
            <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={s.tabs}>
        {([
          { key: "created", label: "📁 Project Saya", count: totalCreated },
          { key: "joined",  label: "🤝 Project Diikuti", count: totalJoined },
        ] as { key: TabType; label: string; count: number }[]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              ...s.tab,
              background: activeTab === tab.key ? "rgba(99,102,241,0.15)" : "transparent",
              borderColor: activeTab === tab.key ? "#6366f1" : "rgba(255,255,255,0.08)",
              color: activeTab === tab.key ? "#a78bfa" : "#94a3b8",
            }} className="tab-btn">
            {tab.label}
            <span style={{
              ...s.tabCount,
              background: activeTab === tab.key ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
              color: activeTab === tab.key ? "#a78bfa" : "#64748b",
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === "created" ? (
        <CreatedTab projects={createdProjects} />
      ) : (
        <JoinedTab memberships={joinedProjects} />
      )}
    </div>
  );
}

// ── CREATED TAB ──────────────────────────────────────
function CreatedTab({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return <EmptyState type="created" />;

  return (
    <div style={s.grid}>
      {projects.map(p => {
        const openRoles = p.project_roles.filter(r => !r.is_filled).length;
        const totalRoles = p.project_roles.length;
        const activeMembers = p.project_members.filter(m => m.status === "active").length;
        const pendingMembers = p.project_members.filter(m => m.status === "pending").length;

        return (
          <div key={p.id} style={s.card} className="project-card">
            {/* Card Top */}
            <div style={s.cardTop}>
              <div style={s.cardTitleRow}>
                <h3 style={s.cardTitle}>{p.title}</h3>
                <StatusBadge status={p.status} />
              </div>
              <p style={s.cardDesc}>{p.description}</p>
            </div>

            {/* Progress Bar */}
            <div style={s.progressSection}>
              <div style={s.progressLabel}>
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>Slot Terisi</span>
                <span style={{ color: "#e2e8f0", fontSize: "0.8rem", fontWeight: 600 }}>
                  {totalRoles - openRoles}/{totalRoles}
                </span>
              </div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: totalRoles > 0
                    ? `${((totalRoles - openRoles) / totalRoles) * 100}%`
                    : "0%",
                }} />
              </div>
            </div>

            {/* Meta */}
            <div style={s.metaRow}>
              <span style={s.metaItem}>👥 {activeMembers} anggota</span>
              {pendingMembers > 0 && (
                <span style={{ ...s.metaItem, color: "#f59e0b" }}>
                  ⏳ {pendingMembers} pending
                </span>
              )}
              {p.estimated_duration && (
                <span style={s.metaItem}>⏱️ {p.estimated_duration}</span>
              )}
            </div>

            {/* Footer */}
            <div style={s.cardFooter}>
              <span style={s.dateText}>
                {new Date(p.created_at).toLocaleDateString("id-ID", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {pendingMembers > 0 && (
                  <Link to={`/dashboard/projects/${p.id}`} style={s.reviewBtn} className="review-btn">
                    ⏳ Review ({pendingMembers})
                  </Link>
                )}
                <Link to={`/dashboard/projects/${p.id}`} style={s.detailBtn} className="detail-btn">
                  Kelola →
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── JOINED TAB ────────────────────────────────────────
function JoinedTab({ memberships }: { memberships: Membership[] }) {
  if (memberships.length === 0) return <EmptyState type="joined" />;

  return (
    <div style={s.grid}>
      {memberships.map(m => {
        // Normalize: ambil object pertama kalau array
        const p = Array.isArray(m.projects) ? m.projects[0] : m.projects;
        if (!p) return null;

        // Normalize profiles juga
        const creatorName = Array.isArray(p.profiles)
          ? p.profiles[0]?.full_name
          : p.profiles?.full_name;

        const openRoles = p.project_roles?.filter(r => !r.is_filled).length || 0;
        const totalRoles = p.project_roles?.length || 0;

        return (
          <div key={m.id} style={s.card} className="project-card">
            <div style={s.cardTop}>
              <div style={s.cardTitleRow}>
                <h3 style={s.cardTitle}>{p.title}</h3>
                <ProjectStatusBadge status={p.status} />
              </div>
              <div style={s.creatorRow}>
                <div style={s.miniAvatar}>{creatorName?.[0]}</div>
                <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
                  oleh {creatorName}
                </span>
              </div>
              <p style={s.cardDesc}>{p.description}</p>
            </div>

            <div style={s.myRoleSection}>
              <span style={s.myRoleLabel}>Role kamu:</span>
              <span style={s.myRoleBadge}>{m.role}</span>
              <MemberStatusBadge status={m.status} />
            </div>

            <div style={s.progressSection}>
              <div style={s.progressLabel}>
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>Slot Terisi</span>
                <span style={{ color: "#e2e8f0", fontSize: "0.8rem", fontWeight: 600 }}>
                  {totalRoles - openRoles}/{totalRoles}
                </span>
              </div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  background: "linear-gradient(90deg, #f59e0b, #f97316)",
                  width: totalRoles > 0
                    ? `${((totalRoles - openRoles) / totalRoles) * 100}%`
                    : "0%",
                }} />
              </div>
            </div>

            <div style={s.cardFooter}>
              <span style={s.dateText}>
                Bergabung {new Date(m.joined_at).toLocaleDateString("id-ID", {
                  day: "numeric", month: "short", year: "numeric"
                })}
              </span>
              <Link to={`/dashboard/projects/${p.id}`} style={s.detailBtn} className="detail-btn">
                Lihat Project →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
// ── BADGES ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    open:        { label: "Open",        color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    completed:   { label: "Selesai",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    cancelled:   { label: "Dibatalkan",  color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  };
  const c = map[status] || map.open;
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      ● {c.label}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

function MemberStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: "Menunggu",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    approved:  { label: "Disetujui", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    active:    { label: "Aktif",     color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    completed: { label: "Selesai",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    left:      { label: "Keluar",    color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "50px", background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// ── EMPTY & LOADING ───────────────────────────────────
function EmptyState({ type }: { type: "created" | "joined" }) {
  return (
    <div style={s.emptyState}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
        {type === "created" ? "📁" : "🤝"}
      </div>
      <h3 style={{ color: "#e2e8f0", marginBottom: "8px", marginTop: 0 }}>
        {type === "created" ? "Belum ada project" : "Belum ikut project"}
      </h3>
      <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "0.95rem" }}>
        {type === "created"
          ? "Mulai bagikan idemu dan cari tim yang tepat!"
          : "Browse project dan mulai berkontribusi!"}
      </p>
      <Link
        to={type === "created" ? "/dashboard/projects/create" : "/dashboard/projects"}
        style={s.emptyBtn}>
        {type === "created" ? "➕ Buat Project Pertama" : "🔍 Browse Projects"}
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={s.grid}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: "rgba(255,255,255,0.03)",
          borderRadius: "16px",
          height: "260px",
          animation: "shimmer 1.5s infinite",
        }} />
      ))}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────
const css = `
  @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
  .tab-btn:hover { border-color: rgba(99,102,241,0.3) !important; color: #e2e8f0 !important; }
  .project-card:hover { border-color: rgba(99,102,241,0.35) !important; transform: translateY(-4px); }
  .detail-btn:hover { background: #4f46e5 !important; }
  .review-btn:hover { background: rgba(245,158,11,0.2) !important; }
  .create-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5) !important; }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter',sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" },
  title: { fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", margin: "0 0 6px", letterSpacing: "-0.5px" },
  sub: { color: "#94a3b8", fontSize: "0.95rem", margin: 0 },
  createBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", padding: "12px 24px", borderRadius: "50px", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s", whiteSpace: "nowrap" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" },
  statCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  statIcon: { width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" },
  statValue: { fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.5px" },
  statLabel: { fontSize: "0.82rem", color: "#64748b", fontWeight: 500 },
  tabs: { display: "flex", gap: "8px", marginBottom: "24px" },
  tab: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "50px", border: "1px solid", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif" },
  tabCount: { fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "50px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "20px" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", transition: "border-color 0.3s, transform 0.3s" },
  cardTop: { display: "flex", flexDirection: "column", gap: "10px" },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" },
  cardTitle: { fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: 0, lineHeight: 1.3 },
  cardDesc: { fontSize: "0.87rem", color: "#94a3b8", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  creatorRow: { display: "flex", alignItems: "center", gap: "8px" },
  miniAvatar: { width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: "white", flexShrink: 0 },
  progressSection: { display: "flex", flexDirection: "column", gap: "6px" },
  progressLabel: { display: "flex", justifyContent: "space-between" },
  progressBar: { height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "50px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#6366f1,#a78bfa)", borderRadius: "50px", transition: "width 0.5s ease" },
  metaRow: { display: "flex", flexWrap: "wrap", gap: "12px" },
  metaItem: { fontSize: "0.8rem", color: "#64748b", fontWeight: 500 },
  myRoleSection: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  myRoleLabel: { fontSize: "0.8rem", color: "#64748b", fontWeight: 500 },
  myRoleBadge: { fontSize: "0.8rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: "rgba(99,102,241,0.12)", color: "#a78bfa", border: "1px solid rgba(99,102,241,0.2)" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "auto" },
  dateText: { fontSize: "0.78rem", color: "#64748b" },
  detailBtn: { background: "#6366f1", color: "#fff", padding: "8px 16px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", transition: "background 0.2s", whiteSpace: "nowrap" },
  reviewBtn: { background: "rgba(245,158,11,0.1)", color: "#f59e0b", padding: "8px 14px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", border: "1px solid rgba(245,158,11,0.25)", transition: "background 0.2s", whiteSpace: "nowrap" },
  emptyState: { textAlign: "center", padding: "80px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px" },
  emptyBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", padding: "12px 28px", borderRadius: "50px", fontWeight: 700, textDecoration: "none", fontSize: "0.95rem", display: "inline-block" },
};