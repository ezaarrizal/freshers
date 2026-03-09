import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Profile {
  id: string;
  full_name: string;
  bio: string;
  role_tags: string[];
  portfolio_url: string;
  wallet_balance: number;
  reputation_score: number;
  avatar_url: string;
}

interface CompletedProject {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  created_at: string;
}

const ALL_ROLES = [
  "Frontend Developer","Backend Developer","UI/UX Designer","Project Manager",
  "Mobile Developer","AI/ML Engineer","DevOps Engineer","Data Analyst",
  "QA Engineer","Technical Writer","Graphic Designer","Social Media Specialist",
  "Video Editor","Content Writer","Product Owner",
];

const repLevel = (score: number) => {
  if (score >= 100) return { label: "Legend", color: "#f59e0b", icon: "👑" };
  if (score >= 50)  return { label: "Expert",  color: "#a78bfa", icon: "⚡" };
  if (score >= 20)  return { label: "Rising",  color: "#4ade80", icon: "🌱" };
  return { label: "Newbie", color: "#64748b", icon: "🐣" };
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "edit">("overview");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    portfolio_url: "",
    role_tags: [] as string[],
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();

    const { data: createdCompleted } = await supabase
      .from("projects")
      .select("id, title, description, tech_stack, created_at")
      .eq("creator_id", user!.id)
      .eq("status", "completed");

    const { data: joinedCompleted } = await supabase
      .from("project_members")
      .select("projects(id, title, description, tech_stack, created_at)")
      .eq("user_id", user!.id)
      .eq("status", "completed");

    if (profileData) {
      setProfile(profileData);
      setForm({
        full_name: profileData.full_name || "",
        bio: profileData.bio || "",
        portfolio_url: profileData.portfolio_url || "",
        role_tags: profileData.role_tags || [],
      });
    }

    const joinedProjects = (joinedCompleted || [])
      .map((m: any) => Array.isArray(m.projects) ? m.projects[0] : m.projects)
      .filter(Boolean);

    const allCompleted = [...(createdCompleted || []), ...joinedProjects];
    const unique = allCompleted.filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    );
    setCompletedProjects(unique);
    setLoading(false);
  };

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      role_tags: prev.role_tags.includes(role)
        ? prev.role_tags.filter((r) => r !== role)
        : prev.role_tags.length < 3
        ? [...prev.role_tags, role]
        : prev.role_tags,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        bio: form.bio,
        portfolio_url: form.portfolio_url,
        role_tags: form.role_tags,
      })
      .eq("id", user!.id);

    if (!error) {
      setSuccessMsg("Profil berhasil diperbarui! ✅");
      fetchData();
      setActiveTab("overview");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div style={{ color: "#6366f1", fontWeight: 600 }}>Memuat profil...</div>
      </div>
    );

  const score = profile?.reputation_score ?? 0;
  const level = repLevel(score);
  const walletBalance = profile?.wallet_balance ?? 0;
  const roleTags = profile?.role_tags ?? [];

  return (
    <div style={s.page}>
      <style>{css}</style>

      {successMsg && <div style={s.successBox}>✅ {successMsg}</div>}

      {/* PROFILE HERO */}
      <div style={s.heroCard}>
        <div style={s.heroGlow} />

        <div style={s.heroContent}>
          {/* Avatar */}
          <div style={s.avatarWrap}>
            <div style={s.avatar}>
              {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div
              style={{
                ...s.levelBadge,
                background: `${level.color}20`,
                color: level.color,
                borderColor: `${level.color}40`,
              }}
            >
              {level.icon} {level.label}
            </div>
          </div>

          {/* Info */}
          <div style={s.heroInfo}>
            <h1 style={s.heroName}>{profile?.full_name ?? "-"}</h1>
            <p style={s.heroEmail}>{user?.email}</p>
            {profile?.bio && <p style={s.heroBio}>{profile.bio}</p>}

            {roleTags.length > 0 && (
              <div style={s.roleRow}>
                {roleTags.map((r) => (
                  <span key={r} style={s.rolePill}>
                    {r}
                  </span>
                ))}
              </div>
            )}

            {profile?.portfolio_url && (
              <a
                href={
                  profile.portfolio_url.startsWith("http")
                    ? profile.portfolio_url
                    : `https://${profile.portfolio_url}`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={s.portfolioLink}
              >
                🔗 {profile.portfolio_url}
              </a>
            )}
          </div>

          {/* Stats */}
          <div style={s.heroStats}>
            {(
              [
                { icon: "⭐", value: String(score), label: "Reputasi" },
                {
                  icon: "✅",
                  value: String(completedProjects.length),
                  label: "Selesai",
                },
                {
                  icon: "💰",
                  value: `Rp ${(walletBalance / 1000).toFixed(0)}k`,
                  label: "Saldo",
                },
              ] as { icon: string; value: string; label: string }[]
            ).map((stat) => (
              <div key={stat.label} style={s.heroStat}>
                <div style={s.heroStatIcon}>{stat.icon}</div>
                <div style={s.heroStatValue}>{stat.value}</div>
                <div style={s.heroStatLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Button */}
        <button
          onClick={() =>
            setActiveTab(activeTab === "edit" ? "overview" : "edit")
          }
          style={s.editBtn}
          className="edit-btn"
        >
          {activeTab === "edit" ? "✕ Batal" : "✏️ Edit Profil"}
        </button>
      </div>

      {/* REPUTATION BAR */}
      <div style={s.repCard}>
        <div style={s.repHeader}>
          <span style={s.repLabel}>Progress Reputasi</span>
          <span style={{ color: level.color, fontWeight: 700, fontSize: "0.9rem" }}>
            {level.icon} {level.label} — {score} poin
          </span>
        </div>
        <div style={s.repBarBg}>
          <div
            style={{
              ...s.repBarFill,
              width: `${Math.min((score % 50) / 50 * 100, 100)}%`,
              background: `linear-gradient(90deg, ${level.color}, ${level.color}aa)`,
            }}
          />
        </div>
        <div style={s.repMilestones}>
          {[
            { label: "🐣 Newbie", min: 0 },
            { label: "🌱 Rising", min: 20 },
            { label: "⚡ Expert", min: 50 },
            { label: "👑 Legend", min: 100 },
          ].map((m) => (
            <span
              key={m.label}
              style={{
                fontSize: "0.75rem",
                color: score >= m.min ? "#e2e8f0" : "#475569",
                fontWeight: score >= m.min ? 600 : 400,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <p style={s.repHint}>
          💡 Selesaikan project untuk mendapatkan +10 poin reputasi
        </p>
      </div>

      {/* EDIT FORM */}
      {activeTab === "edit" && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>✏️ Edit Profil</h2>

          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Nama Lengkap</label>
              <input
                className="profile-input"
                style={s.input}
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                placeholder="Nama lengkap kamu"
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Link Portfolio</label>
              <input
                className="profile-input"
                style={s.input}
                value={form.portfolio_url}
                onChange={(e) =>
                  setForm({ ...form, portfolio_url: e.target.value })
                }
                placeholder="github.com/username"
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Bio</label>
            <textarea
              className="profile-input"
              style={{ ...s.input, height: "100px", resize: "none" }}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Ceritain dirimu singkat..."
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Role (maks. 3)</label>
            <div style={s.rolesGrid}>
              {ALL_ROLES.map((role) => {
                const selected = form.role_tags.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className="role-btn"
                    style={{
                      ...s.roleBtn,
                      background: selected
                        ? "rgba(99,102,241,0.2)"
                        : "rgba(255,255,255,0.04)",
                      borderColor: selected
                        ? "#6366f1"
                        : "rgba(255,255,255,0.08)",
                      color: selected ? "#a78bfa" : "#94a3b8",
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {role}
                  </button>
                );
              })}
            </div>
            <p style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "10px" }}>
              {form.role_tags.length}/3 role dipilih
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            <button
              onClick={() => setActiveTab("overview")}
              style={s.cancelBtn}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
              className="save-profile-btn"
            >
              {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED PROJECTS / PORTFOLIO */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>🏆 Portfolio Project</h2>
        {completedProjects.length === 0 ? (
          <div style={s.emptyPortfolio}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📁</div>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Belum ada project selesai
            </p>
            <p
              style={{
                color: "#475569",
                fontSize: "0.85rem",
                marginTop: "6px",
              }}
            >
              Selesaikan project untuk membangun portofolio!
            </p>
          </div>
        ) : (
          <div style={s.projectsGrid}>
            {completedProjects.map((p) => (
              <div key={p.id} style={s.projectCard} className="portfolio-card">
                <div style={s.projectCardHeader}>
                  <div style={s.completedBadge}>✅ Selesai</div>
                  <span style={s.projectDate}>
                    {new Date(p.created_at).toLocaleDateString("id-ID", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3 style={s.projectCardTitle}>{p.title}</h3>
                <p style={s.projectCardDesc}>{p.description}</p>
                {(p.tech_stack?.length ?? 0) > 0 && (
                  <div style={s.techRow}>
                    {p.tech_stack.slice(0, 3).map((t) => (
                      <span key={t} style={s.techBadge}>
                        {t}
                      </span>
                    ))}
                    {p.tech_stack.length > 3 && (
                      <span style={s.techBadge}>
                        +{p.tech_stack.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .profile-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .role-btn:hover { border-color: rgba(99,102,241,0.4) !important; color: #e2e8f0 !important; }
  .edit-btn:hover { background: rgba(99,102,241,0.2) !important; color: #a78bfa !important; }
  .save-profile-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .portfolio-card:hover { border-color: rgba(99,102,241,0.35) !important; transform: translateY(-3px); }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "900px", margin: "0 auto", fontFamily: "'Inter',sans-serif", display: "flex", flexDirection: "column", gap: "20px" },
  successBox: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "14px 20px", borderRadius: "12px", fontWeight: 600 },
  heroCard: { position: "relative", background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(167,139,250,0.06))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "20px", padding: "32px", overflow: "hidden" },
  heroGlow: { position: "absolute", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", top: "-100px", right: "-100px", pointerEvents: "none" },
  heroContent: { display: "flex", gap: "28px", alignItems: "flex-start", flexWrap: "wrap", position: "relative", zIndex: 1 },
  avatarWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flexShrink: 0 },
  avatar: { width: "88px", height: "88px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", fontWeight: 800, color: "white", border: "3px solid rgba(99,102,241,0.4)" },
  levelBadge: { fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: "50px", border: "1px solid", whiteSpace: "nowrap" },
  heroInfo: { flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "10px" },
  heroName: { fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", margin: 0, letterSpacing: "-0.5px" },
  heroEmail: { fontSize: "0.9rem", color: "#64748b", margin: 0 },
  heroBio: { fontSize: "0.95rem", color: "#94a3b8", margin: 0, lineHeight: 1.6 },
  roleRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  rolePill: { fontSize: "0.82rem", fontWeight: 600, padding: "4px 14px", borderRadius: "50px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa" },
  portfolioLink: { color: "#6366f1", fontSize: "0.88rem", fontWeight: 600, textDecoration: "none" },
  heroStats: { display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 },
  heroStat: { textAlign: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "12px 20px", minWidth: "80px" },
  heroStatIcon: { fontSize: "1.2rem", marginBottom: "4px" },
  heroStatValue: { fontSize: "1.2rem", fontWeight: 800, color: "#e2e8f0" },
  heroStatLabel: { fontSize: "0.72rem", color: "#64748b", fontWeight: 500 },
  editBtn: { position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "8px 18px", borderRadius: "50px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.2s", zIndex: 2 },
  repCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "12px" },
  repHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  repLabel: { fontSize: "0.88rem", fontWeight: 600, color: "#94a3b8" },
  repBarBg: { height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "50px", overflow: "hidden" },
  repBarFill: { height: "100%", borderRadius: "50px", transition: "width 0.5s ease" },
  repMilestones: { display: "flex", justifyContent: "space-between" },
  repHint: { color: "#475569", fontSize: "0.82rem", margin: 0 },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "28px" },
  cardTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 20px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" },
  label: { fontSize: "0.88rem", fontWeight: 600, color: "#e2e8f0" },
  input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", fontSize: "0.9rem", color: "#e2e8f0", fontFamily: "'Inter',sans-serif", transition: "border-color 0.2s", width: "100%" },
  rolesGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  roleBtn: { border: "1px solid", borderRadius: "50px", padding: "6px 16px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif" },
  cancelBtn: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: "50px", padding: "10px 24px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  saveBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: "50px", padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "transform 0.2s", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" },
  emptyPortfolio: { textAlign: "center", padding: "40px 24px" },
  projectsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: "16px" },
  projectCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", transition: "border-color 0.3s, transform 0.3s", display: "flex", flexDirection: "column", gap: "10px" },
  projectCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  completedBadge: { fontSize: "0.75rem", fontWeight: 600, padding: "3px 10px", borderRadius: "50px", background: "rgba(74,222,128,0.12)", color: "#4ade80" },
  projectDate: { fontSize: "0.78rem", color: "#64748b" },
  projectCardTitle: { fontSize: "0.95rem", fontWeight: 700, color: "#e2e8f0", margin: 0 },
  projectCardDesc: { fontSize: "0.85rem", color: "#94a3b8", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  techRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
  techBadge: { fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "50px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" },
};
