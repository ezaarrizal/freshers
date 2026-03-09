import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  tech_stack: string[];
  estimated_duration: string;
  created_at: string;
  creator_id: string;
  member_fee: number;
  profiles: { full_name: string; reputation_score: number };
  project_roles: { id: string; role_name: string; is_filled: boolean }[];
  project_members: { id: string }[];
}

const ALL_ROLES = [
  "Semua Role", "Frontend Developer", "Backend Developer", "UI/UX Designer",
  "Project Manager", "Mobile Developer", "AI/ML Engineer", "DevOps Engineer",
  "Data Analyst", "QA Engineer", "Graphic Designer", "Social Media Specialist",
  "Video Editor", "Content Writer", "Product Owner",
];

export default function BrowseProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("Semua Role");
  const [filterStatus, setFilterStatus] = useState("open");

  useEffect(() => {
    fetchProjects();
  }, [filterStatus]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        profiles(full_name, reputation_score),
        project_roles(id, role_name, is_filled),
        project_members(id)
      `)
      .eq("status", filterStatus)
      .neq("creator_id", user!.id)
      .order("created_at", { ascending: false });

    setProjects(data || []);
    setLoading(false);
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "Semua Role" ||
      p.project_roles.some(r => r.role_name === filterRole && !r.is_filled);
    return matchSearch && matchRole;
  });

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Browse Projects 🗂️</h1>
          <p style={s.sub}>Temukan project yang cocok dan mulai berkontribusi</p>
        </div>
        <Link to="/dashboard/projects/create" style={s.createBtn} className="create-btn">
          ➕ Buat Project
        </Link>
      </div>

      {/* FILTERS */}
      <div style={s.filterBar}>
        {/* Search */}
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input
            placeholder="Cari project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={s.searchInput}
            className="filter-input"
          />
        </div>

        {/* Status Filter */}
        <div style={s.filterGroup}>
          {["open", "in_progress"].map(st => (
            <button key={st} onClick={() => setFilterStatus(st)}
              style={{
                ...s.filterBtn,
                background: filterStatus === st ? "rgba(99,102,241,0.15)" : "transparent",
                borderColor: filterStatus === st ? "#6366f1" : "rgba(255,255,255,0.08)",
                color: filterStatus === st ? "#a78bfa" : "#94a3b8",
              }} className="filter-btn">
              {st === "open" ? "🟢 Open" : "🟡 In Progress"}
            </button>
          ))}
        </div>
      </div>

      {/* ROLE FILTER */}
      <div style={s.roleFilter}>
        {ALL_ROLES.map(role => (
          <button key={role} onClick={() => setFilterRole(role)}
            style={{
              ...s.rolePill,
              background: filterRole === role ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
              borderColor: filterRole === role ? "#6366f1" : "rgba(255,255,255,0.08)",
              color: filterRole === role ? "#a78bfa" : "#64748b",
            }} className="filter-btn">
            {role}
          </button>
        ))}
      </div>

      {/* RESULTS COUNT */}
      <p style={s.resultCount}>
        {loading ? "Memuat..." : `${filtered.length} project ditemukan`}
      </p>

      {/* PROJECT GRID */}
      {loading ? (
        <LoadingGrid />
      ) : filtered.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <div style={s.grid}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const openRoles = p.project_roles.filter(r => !r.is_filled);
  const filledRoles = p.project_roles.filter(r => r.is_filled);

  return (
    <div style={s.card} className="project-card">
      {/* Card Header */}
      <div style={s.cardHeader}>
        <div style={s.cardTitleRow}>
          <h3 style={s.cardTitle}>{p.title}</h3>
          <StatusBadge status={p.status} />
        </div>
        <div style={s.creatorRow}>
          <div style={s.creatorAvatar}>{p.profiles?.full_name?.[0] || "?"}</div>
          <span style={s.creatorName}>{p.profiles?.full_name}</span>
          <span style={s.repScore}>⭐ {p.profiles?.reputation_score || 0}</span>
        </div>
      </div>

      {/* Description */}
      <p style={s.desc}>{p.description}</p>

      {/* Tech Stack */}
      {p.tech_stack?.length > 0 && (
        <div style={s.techRow}>
          {p.tech_stack.slice(0, 4).map(t => (
            <span key={t} style={s.techBadge}>{t}</span>
          ))}
          {p.tech_stack.length > 4 && (
            <span style={s.techBadge}>+{p.tech_stack.length - 4}</span>
          )}
        </div>
      )}

      {/* Open Roles */}
      {openRoles.length > 0 && (
        <div style={s.rolesSection}>
          <div style={s.rolesSectionLabel}>Butuh:</div>
          <div style={s.rolesRow}>
            {openRoles.map(r => (
              <span key={r.id} style={s.openRoleBadge}>{r.role_name} ✦</span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={s.cardFooter}>
        <div style={s.footerLeft}>
          <div style={s.memberCount}>
            👥 {filledRoles.length}/{p.project_roles.length} slot terisi
          </div>
          {p.estimated_duration && (
            <div style={s.duration}>⏱️ {p.estimated_duration}</div>
          )}
        </div>
        <div style={s.footerRight}>
          <div style={s.feeTag}>🔒 Rp {p.member_fee?.toLocaleString("id-ID")}</div>
          <Link to={`/dashboard/projects/${p.id}`} style={s.detailBtn} className="detail-btn">
            Lihat Detail →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    open:        { label: "Open",        color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    completed:   { label: "Selesai",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  };
  const c = map[status] || map.open;
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      ● {c.label}
    </span>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "20px" }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "16px", height: "280px", animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px", background: "rgba(255,255,255,0.02)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔍</div>
      <h3 style={{ color: "#e2e8f0", marginBottom: "8px" }}>
        {search ? `Tidak ada project untuk "${search}"` : "Belum ada project"}
      </h3>
      <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
        {search ? "Coba kata kunci lain" : "Jadilah yang pertama membuat project!"}
      </p>
      <Link to="/dashboard/projects/create" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", padding: "12px 28px", borderRadius: "50px", fontWeight: 700, textDecoration: "none", fontSize: "0.95rem" }}>
        ➕ Buat Project Pertama
      </Link>
    </div>
  );
}

const css = `
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .filter-input:focus { outline: none; border-color: #6366f1 !important; }
  .filter-btn:hover { border-color: rgba(99,102,241,0.4) !important; color: #e2e8f0 !important; }
  .project-card:hover { border-color: rgba(99,102,241,0.35) !important; transform: translateY(-4px); }
  .detail-btn:hover { background: #4f46e5 !important; }
  .create-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5) !important; }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter',sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" },
  title: { fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", margin: "0 0 6px", letterSpacing: "-0.5px" },
  sub: { color: "#94a3b8", fontSize: "0.95rem", margin: 0 },
  createBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", padding: "12px 24px", borderRadius: "50px", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s", whiteSpace: "nowrap" },
  filterBar: { display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" },
  searchWrap: { flex: 1, minWidth: "200px", display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "0 16px", gap: "10px" },
  searchIcon: { fontSize: "1rem", flexShrink: 0 },
  searchInput: { flex: 1, background: "transparent", border: "none", color: "#e2e8f0", fontSize: "0.9rem", padding: "13px 0", fontFamily: "'Inter',sans-serif" },
  filterGroup: { display: "flex", gap: "8px" },
  filterBtn: { padding: "10px 18px", borderRadius: "50px", border: "1px solid", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" },
  roleFilter: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" },
  rolePill: { padding: "6px 14px", borderRadius: "50px", border: "1px solid", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" },
  resultCount: { color: "#64748b", fontSize: "0.85rem", marginBottom: "20px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "20px" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "24px", transition: "border-color 0.3s, transform 0.3s", display: "flex", flexDirection: "column", gap: "14px" },
  cardHeader: { display: "flex", flexDirection: "column", gap: "10px" },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" },
  cardTitle: { fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: 0, lineHeight: 1.3 },
  creatorRow: { display: "flex", alignItems: "center", gap: "8px" },
  creatorAvatar: { width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "white", flexShrink: 0 },
  creatorName: { fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500 },
  repScore: { fontSize: "0.78rem", color: "#64748b", marginLeft: "auto" },
  desc: { fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  techRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
  techBadge: { fontSize: "0.75rem", fontWeight: 600, padding: "3px 10px", borderRadius: "50px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" },
  rolesSection: { display: "flex", flexDirection: "column", gap: "8px" },
  rolesSectionLabel: { fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" },
  rolesRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
  openRoleBadge: { fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", border: "1px solid rgba(245,158,11,0.35)", color: "#f59e0b", background: "rgba(245,158,11,0.08)" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "auto" },
  footerLeft: { display: "flex", flexDirection: "column", gap: "4px" },
  memberCount: { fontSize: "0.8rem", color: "#64748b" },
  duration: { fontSize: "0.8rem", color: "#64748b" },
  footerRight: { display: "flex", alignItems: "center", gap: "10px" },
  feeTag: { fontSize: "0.78rem", fontWeight: 600, color: "#a78bfa", background: "rgba(99,102,241,0.1)", padding: "4px 10px", borderRadius: "50px" },
  detailBtn: { background: "#6366f1", color: "#fff", padding: "8px 16px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", transition: "background 0.2s", whiteSpace: "nowrap" },
};