import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Profile {
  full_name: string;
  wallet_balance: number;
  reputation_score: number;
  role_tags: string[];
}

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [joinedProjects, setJoinedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();

    // Fetch projects yang dibuat user
    const { data: createdProjects } = await supabase
      .from("projects")
      .select("id, title, status, created_at")
      .eq("creator_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(3);

    // Fetch projects yang diikuti user
    const { data: memberships } = await supabase
      .from("project_members")
      .select("*, projects(title, status)")
      .eq("user_id", user!.id)
      .limit(3);

    setProfile(profileData);
    setMyProjects(createdProjects || []);
    setJoinedProjects(memberships || []);
    setLoading(false);
  };

  if (loading) return <LoadingState />;

  const firstName = profile?.full_name?.split(" ")[0] || "Fresher";

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div>
          <h1 style={s.greeting}>Halo, {firstName}! 👋</h1>
          <p style={s.subGreeting}>Selamat datang di Freshers. Yuk mulai kolaborasi!</p>
        </div>
        <Link to="/dashboard/projects" style={s.ctaBtn} className="cta-btn">
          🔍 Browse Projects
        </Link>
      </div>

      {/* STATS CARDS */}
      <div style={s.statsGrid}>
        <StatCard
          icon="💰"
          label="Wallet Balance"
          value={`Rp ${(profile?.wallet_balance || 0).toLocaleString("id-ID")}`}
          sub="Saldo tersedia"
          accent="#6366f1"
          link="/dashboard/wallet"
          linkLabel="Top Up →"
        />
        <StatCard
          icon="📋"
          label="Project Dibuat"
          value={String(myProjects.length)}
          sub="Total project kamu"
          accent="#f59e0b"
          link="/dashboard/my-projects"
          linkLabel="Lihat semua →"
        />
        <StatCard
          icon="🤝"
          label="Project Diikuti"
          value={String(joinedProjects.length)}
          sub="Aktif sebagai member"
          accent="#10b981"
          link="/dashboard/my-projects"
          linkLabel="Lihat semua →"
        />
        <StatCard
          icon="⭐"
          label="Reputasi"
          value={String(profile?.reputation_score || 0)}
          sub="Poin reputasi"
          accent="#a78bfa"
          link="/dashboard/profile"
          linkLabel="Lihat profil →"
        />
      </div>

      {/* ROLE TAGS */}
      {profile?.role_tags && profile.role_tags.length > 0 && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Role Kamu</h2>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {profile.role_tags.map(role => (
              <span key={role} style={s.rolePill}>{role}</span>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div style={s.actionsGrid}>
          <ActionCard icon="➕" title="Buat Project Baru" desc="Punya ide? Cari tim sekarang!" link="/dashboard/projects/create" color="#6366f1" />
          <ActionCard icon="🔍" title="Browse Projects" desc="Temukan project yang cocok" link="/dashboard/projects" color="#f59e0b" />
          <ActionCard icon="💸" title="Top Up Wallet" desc="Isi saldo untuk mulai gabung" link="/dashboard/wallet" color="#10b981" />
          <ActionCard icon="👤" title="Lengkapi Profil" desc="Biar makin mudah ditemukan" link="/dashboard/profile" color="#a78bfa" />
        </div>
      </div>

      {/* RECENT PROJECTS */}
      {myProjects.length > 0 && (
        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ ...s.sectionTitle, marginBottom: 0 }}>Project Terbaru</h2>
            <Link to="/dashboard/my-projects" style={s.seeAll}>Lihat semua →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {myProjects.map(p => (
              <div key={p.id} style={s.projectRow}>
                <div>
                  <div style={s.projectRowTitle}>{p.title}</div>
                  <div style={s.projectRowDate}>
                    {new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {myProjects.length === 0 && joinedProjects.length === 0 && (
        <div style={s.emptyState}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚀</div>
          <h3 style={{ color: "#e2e8f0", marginBottom: "8px" }}>Belum ada aktivitas</h3>
          <p style={{ color: "#94a3b8", marginBottom: "24px" }}>Mulai dengan membuat project atau bergabung dengan tim!</p>
          <Link to="/dashboard/projects" style={s.ctaBtn} className="cta-btn">
            Explore Projects
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent, link, linkLabel }: any) {
  return (
    <Link to={link} style={{ textDecoration: "none" }} className="stat-card">
      <div style={{ ...s.statCard, "--accent": accent } as any}>
        <div style={{ ...s.statIcon, background: `${accent}20`, color: accent }}>{icon}</div>
        <div style={s.statLabel}>{label}</div>
        <div style={{ ...s.statValue, color: accent }}>{value}</div>
        <div style={s.statSub}>{sub}</div>
        <div style={{ ...s.statLink, color: accent }}>{linkLabel}</div>
      </div>
    </Link>
  );
}

function ActionCard({ icon, title, desc, link, color }: any) {
  return (
    <Link to={link} style={{ textDecoration: "none" }} className="action-card">
      <div style={s.actionCard}>
        <div style={{ ...s.actionIcon, background: `${color}20`, color }}>{icon}</div>
        <div>
          <div style={s.actionTitle}>{title}</div>
          <div style={s.actionDesc}>{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    open:        { label: "Open",        color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    completed:   { label: "Selesai",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    cancelled:   { label: "Dibatalkan",  color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  };
  const { label, color, bg } = map[status] || map.open;
  return <span style={{ fontSize: "0.78rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: bg, color }}>{label}</span>;
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ color: "#6366f1", fontSize: "1.1rem", fontWeight: 600 }}>Memuat data...</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "1000px", margin: "0 auto", fontFamily: "'Inter', sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" },
  greeting: { fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.5px", margin: 0 },
  subGreeting: { color: "#94a3b8", marginTop: "6px", fontSize: "0.95rem" },
  ctaBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", padding: "12px 24px", borderRadius: "50px", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", display: "inline-block" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" },
  statCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", transition: "transform 0.2s, border-color 0.2s", cursor: "pointer" },
  statIcon: { width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", marginBottom: "16px" },
  statLabel: { fontSize: "0.82rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  statValue: { fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" },
  statSub: { fontSize: "0.82rem", color: "#94a3b8", marginBottom: "12px" },
  statLink: { fontSize: "0.82rem", fontWeight: 600 },
  section: { marginBottom: "32px" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "16px", marginTop: 0 },
  rolePill: { background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a78bfa", padding: "6px 16px", borderRadius: "50px", fontSize: "0.85rem", fontWeight: 600 },
  actionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" },
  actionCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", transition: "transform 0.2s, border-color 0.2s", cursor: "pointer" },
  actionIcon: { width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 },
  actionTitle: { fontSize: "0.92rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "4px" },
  actionDesc: { fontSize: "0.8rem", color: "#64748b" },
  projectRow: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  projectRowTitle: { fontSize: "0.95rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "4px" },
  projectRowDate: { fontSize: "0.8rem", color: "#64748b" },
  seeAll: { color: "#a78bfa", textDecoration: "none", fontSize: "0.88rem", fontWeight: 600 },
  emptyState: { textAlign: "center", padding: "60px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px" },
};