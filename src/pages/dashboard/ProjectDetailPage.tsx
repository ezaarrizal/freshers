import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import VoteSystem from "../../components/VoteSystem";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  tech_stack: string[];
  estimated_duration: string;
  creator_id: string;
  member_fee: number;
  creator_fee: number;
  created_at: string;
  profiles: { full_name: string; reputation_score: number };
  project_roles: { id: string; role_name: string; is_filled: boolean; filled_by: string | null }[];
  project_members: {
    id: string; role: string; status: string;
    user_id: string;
    profiles: { full_name: string };
  }[];
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [selectedRole, setSelectedRole] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    const { data: proj } = await supabase
      .from("projects")
      .select(`
        *,
        profiles(full_name, reputation_score),
        project_roles(id, role_name, is_filled, filled_by),
        project_members(id, role, status, profiles(full_name))
      `)
      .eq("id", id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user!.id)
      .single();

    if (proj) {
      setProject(proj);
      setIsCreator(proj.creator_id === user!.id);
      const isMember = proj.project_members?.some(
        (m: any) => m.profiles?.full_name && proj.project_members.find(
          (pm: any) => pm.id === m.id
        )
      );
      // Cek apakah user sudah jadi member
      const { data: myMembership } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();

      setAlreadyMember(!!myMembership);
    }

    setBalance(profile?.wallet_balance || 0);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!selectedRole) { setError("Pilih role dulu!"); return; }
    if (balance < (project?.member_fee || 25000)) {
      setError("Saldo tidak cukup! Top up dulu ya.");
      return;
    }

    setJoining(true);
    setError("");

    try {
      const fee = project!.member_fee;

      // 1. Insert member
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: id,
          user_id: user!.id,
          role: selectedRole,
          status: "pending",
        });

      if (memberError) throw memberError;

      // 2. Potong saldo
      await supabase
        .from("profiles")
        .update({ wallet_balance: balance - fee })
        .eq("id", user!.id);

      // 3. Catat transaksi
      await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "lock",
        amount: fee,
        project_id: id,
      });

      setSuccess("Berhasil apply! Menunggu persetujuan creator 🎉");
      setAlreadyMember(true);
      setBalance(prev => prev - fee);
      fetchAll();
    } catch (err: any) {
      setError(err.message || "Gagal join. Coba lagi!");
    }

    setJoining(false);
  };

  const handleMarkComplete = async () => {
    if (!confirm("Tandai project ini sebagai selesai? Dana semua member akan dikembalikan.")) return;

    // 1. Update status project
    await supabase
      .from("projects")
      .update({ status: "completed" })
      .eq("id", id);

    // 2. Kembalikan dana semua active member
    const activeMembers = project!.project_members.filter(m => m.status === "active");
    for (const member of activeMembers) {
      const { data: mp } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("id", member.id)
        .single();

      if (mp) {
        // Ambil balance member
        const { data: memberProfile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", (mp as any).user_id)
          .single();

        // Kembalikan fee
        await supabase
          .from("profiles")
          .update({ wallet_balance: (memberProfile?.wallet_balance || 0) + project!.member_fee })
          .eq("id", (mp as any).user_id);

        await supabase.from("transactions").insert({
          user_id: (mp as any).user_id,
          type: "unlock",
          amount: project!.member_fee,
          project_id: id,
        });
      }
    }

    // 3. Kembalikan fee creator
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", project!.creator_id)
      .single();

    await supabase
      .from("profiles")
      .update({ wallet_balance: (creatorProfile?.wallet_balance || 0) + project!.creator_fee })
      .eq("id", project!.creator_id);

    await supabase.from("transactions").insert({
      user_id: project!.creator_id,
      type: "unlock",
      amount: project!.creator_fee,
      project_id: id,
    });

    // 4. Update reputasi semua member
    await supabase.rpc("increment_reputation", { user_id: project!.creator_id, amount: 10 });

    setSuccess("Project berhasil diselesaikan! Dana dikembalikan ke semua member 🎉");
    fetchAll();
  };

  const handleApproveMember = async (memberId: string, userId: string, roleId: string) => {
    // Update status member jadi active
    await supabase
      .from("project_members")
      .update({ status: "active" })
      .eq("id", memberId);

    // Tandai role sebagai filled
    await supabase
      .from("project_roles")
      .update({ is_filled: true, filled_by: userId })
      .eq("id", roleId);

    fetchAll();
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ color: "#6366f1", fontWeight: 600 }}>Memuat project...</div>
    </div>
  );

  if (!project) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>😕</div>
      <h3 style={{ color: "#e2e8f0" }}>Project tidak ditemukan</h3>
      <Link to="/dashboard/projects" style={{ color: "#a78bfa" }}>← Kembali ke Browse</Link>
    </div>
  );

  const openRoles = project.project_roles.filter(r => !r.is_filled);
  const filledRoles = project.project_roles.filter(r => r.is_filled);
  const pendingMembers = project.project_members.filter(m => m.status === "pending");
  const activeMembers = project.project_members.filter(m => m.status === "active");

  return (
    <div style={s.page}>
      <style>{css}</style>

      <Link to="/dashboard/projects" style={s.backBtn}>← Kembali ke Browse</Link>

      {success && <div style={s.successBox}>✅ {success}</div>}
      {error && <div style={s.errorBox}>⚠️ {error}</div>}

      <div style={s.layout}>
        {/* LEFT — Main Info */}
        <div style={s.mainCol}>

          {/* Project Header */}
          <div style={s.headerCard}>
            <div style={s.headerTop}>
              <StatusBadge status={project.status} />
              {project.estimated_duration && (
                <span style={s.duration}>⏱️ {project.estimated_duration}</span>
              )}
            </div>
            <h1 style={s.projectTitle}>{project.title}</h1>
            <div style={s.creatorRow}>
              <div style={s.avatar}>{project.profiles?.full_name?.[0]}</div>
              <span style={s.creatorName}>oleh {project.profiles?.full_name}</span>
              <span style={s.repBadge}>⭐ {project.profiles?.reputation_score || 0} rep</span>
            </div>
            <p style={s.desc}>{project.description}</p>

            {/* Tech Stack */}
            {project.tech_stack?.length > 0 && (
              <div style={s.techRow}>
                {project.tech_stack.map(t => (
                  <span key={t} style={s.techBadge}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Open Roles */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>🎯 Role yang Dibutuhkan</h2>
            {openRoles.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Semua role sudah terisi!</p>
            ) : (
              <div style={s.rolesGrid}>
                {openRoles.map(r => (
                  <div key={r.id} style={s.roleItem}>
                    <span style={s.openRoleBadge}>{r.role_name}</span>
                    <span style={s.roleStat}>Tersedia</span>
                  </div>
                ))}
              </div>
            )}

            {filledRoles.length > 0 && (
              <>
                <div style={s.divider} />
                <h3 style={s.subTitle}>✅ Role Terisi</h3>
                <div style={s.rolesGrid}>
                  {filledRoles.map(r => (
                    <div key={r.id} style={s.roleItem}>
                      <span style={s.filledRoleBadge}>{r.role_name}</span>
                      <span style={s.roleStat}>Terisi</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Active Members */}
          {activeMembers.length > 0 && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>👥 Anggota Tim</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {activeMembers.map(m => (
                  <div key={m.id} style={s.memberRow}>
                    <div style={s.memberAvatar}>{m.profiles?.full_name?.[0]}</div>
                    <div>
                      <div style={s.memberName}>{m.profiles?.full_name}</div>
                      <div style={s.memberRole}>{m.role}</div>
                    </div>
                    <span style={s.activeBadge}>Active</span>
                  </div>
                ))}

                {(isCreator || alreadyMember) && project.status !== "completed" && (
                  <VoteSystem
                    projectId={project.id}
                    creatorId={project.creator_id}
                    members={project.project_members}
                    onVoteComplete={fetchAll}
                  />
                )}

                {/* Creator */}
                <div style={s.memberRow}>
                  <div style={{ ...s.memberAvatar, background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
                    {project.profiles?.full_name?.[0]}
                  </div>
                  <div>
                    <div style={s.memberName}>{project.profiles?.full_name}</div>
                    <div style={s.memberRole}>Project Creator</div>
                  </div>
                  <span style={{ ...s.activeBadge, background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                    Creator
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pending Members — hanya creator yang lihat */}
          {isCreator && pendingMembers.length > 0 && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>⏳ Menunggu Persetujuan</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {pendingMembers.map(m => {
                  const matchingRole = project.project_roles.find(
                    r => r.role_name === m.role && !r.is_filled
                  );
                  return (
                    <div key={m.id} style={s.pendingRow}>
                      <div style={s.memberAvatar}>{m.profiles?.full_name?.[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={s.memberName}>{m.profiles?.full_name}</div>
                        <div style={s.memberRole}>Apply sebagai: {m.role}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {matchingRole && (
                          <button
                            onClick={() => handleApproveMember(m.id, matchingRole.filled_by || "", matchingRole.id)}
                            style={s.approveBtn} className="approve-btn">
                            ✓ Approve
                          </button>
                        )}
                        <button style={s.rejectBtn} className="reject-btn">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Sidebar */}
        <div style={s.sideCol}>

          {/* Join Card */}
          {!isCreator && project.status === "open" && (
            <div style={s.joinCard}>
              <h2 style={s.cardTitle}>🚀 Gabung Project</h2>

              {alreadyMember ? (
                <div style={s.alreadyMember}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✅</div>
                  <p style={{ color: "#4ade80", fontWeight: 600, margin: 0 }}>Kamu sudah apply!</p>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "6px" }}>
                    Menunggu persetujuan creator
                  </p>

                <Link
                    to={`/dashboard/projects/${project.id}/kanban`}
                    style={{
                        display: "block", textAlign: "center",
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        color: "#a78bfa", padding: "12px",
                        borderRadius: "12px", textDecoration: "none",
                        fontWeight: 600, fontSize: "0.9rem",
                        marginBottom: "12px", transition: "background 0.2s",
                    }}>
                        📋 Buka Kanban Board
                </Link>
                </div>
              ) : (
                <>
                  <div style={s.feeInfo}>
                    <span style={{ color: "#94a3b8", fontSize: "0.88rem" }}>Commitment fee</span>
                    <span style={{ color: "#a78bfa", fontWeight: 800, fontSize: "1.3rem" }}>
                      Rp {project.member_fee.toLocaleString("id-ID")}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
                      Dikembalikan saat project selesai
                    </span>
                  </div>

                  <div style={s.balanceInfo}>
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Saldo kamu</span>
                    <span style={{
                      fontWeight: 700,
                      color: balance >= project.member_fee ? "#4ade80" : "#f87171"
                    }}>
                      Rp {balance.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {openRoles.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <label style={s.label}>Pilih Role</label>
                      <select
                        value={selectedRole}
                        onChange={e => setSelectedRole(e.target.value)}
                        style={s.select}
                        className="join-select">
                        <option value="">-- Pilih role --</option>
                        {openRoles.map(r => (
                          <option key={r.id} value={r.role_name}>{r.role_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {balance < project.member_fee && (
                    <Link to="/dashboard/wallet" style={s.topupLink}>
                      ⚠️ Saldo kurang → Top Up dulu
                    </Link>
                  )}

                  <button
                    onClick={handleJoin}
                    disabled={joining || balance < project.member_fee || !selectedRole}
                    style={{
                      ...s.joinBtn,
                      opacity: joining || balance < project.member_fee || !selectedRole ? 0.6 : 1,
                    }}
                    className="join-btn">
                    {joining ? "Memproses..." : "🤝 Join Project"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Creator Actions */}
          {isCreator && (
            <div style={s.joinCard}>
              <h2 style={s.cardTitle}>⚙️ Kelola Project</h2>
              <div style={s.statsRow}>
                <div style={s.statItem}>
                  <div style={s.statNum}>{openRoles.length}</div>
                  <div style={s.statLbl}>Role Terbuka</div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statNum}>{activeMembers.length}</div>
                  <div style={s.statLbl}>Anggota</div>
                </div>
                <div style={s.statItem}>
                  <div style={s.statNum}>{pendingMembers.length}</div>
                  <div style={s.statLbl}>Pending</div>
                </div>
              </div>
              <Link
                to={`/dashboard/projects/${project.id}/kanban`}
                style={{
                    display: "block", textAlign: "center",
                    background: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    color: "#a78bfa", padding: "12px",
                    borderRadius: "12px", textDecoration: "none",
                    fontWeight: 600, fontSize: "0.9rem",
                    marginBottom: "12px", transition: "background 0.2s",
                }}>
                    📋 Buka Kanban Board
             </Link>

              {project.status !== "completed" && (
                <button onClick={handleMarkComplete} style={s.completeBtn} className="complete-btn">
                  ✅ Tandai Selesai
                </button>
              )}

              {project.status === "completed" && (
                <div style={{ textAlign: "center", color: "#4ade80", fontWeight: 600, padding: "16px 0" }}>
                  🎉 Project Selesai!
                </div>
              )}
            </div>
          )}

          {/* Project Info */}
          <div style={s.infoCard}>
            <h3 style={s.cardTitle}>📊 Info Project</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <InfoRow label="Status" value={project.status} />
              <InfoRow label="Dibuat" value={new Date(project.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
              <InfoRow label="Durasi" value={project.estimated_duration || "-"} />
              <InfoRow label="Total Role" value={`${project.project_roles.length} role`} />
              <InfoRow label="Member Fee" value={`Rp ${project.member_fee.toLocaleString("id-ID")}`} />
            </div>
          </div>
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
  return <span style={{ fontSize: "0.82rem", fontWeight: 600, padding: "6px 14px", borderRadius: "50px", background: c.bg, color: c.color }}>● {c.label}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const css = `
  .join-select:focus { outline: none; border-color: #6366f1 !important; }
  .join-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5) !important; }
  .join-btn:disabled { cursor: not-allowed; }
  .approve-btn:hover { background: #059669 !important; }
  .reject-btn:hover { background: #dc2626 !important; }
  .complete-btn:hover { transform: translateY(-2px); }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "1100px", margin: "0 auto", fontFamily: "'Inter',sans-serif" },
  backBtn: { display: "inline-block", color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem", marginBottom: "20px", fontWeight: 500 },
  successBox: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", fontWeight: 600 },
  errorBox: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px" },
  layout: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" },
  mainCol: { display: "flex", flexDirection: "column", gap: "20px" },
  sideCol: { display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "24px" },
  headerCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "16px" },
  headerTop: { display: "flex", alignItems: "center", gap: "12px" },
  projectTitle: { fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.2 },
  creatorRow: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: { width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "white" },
  creatorName: { fontSize: "0.9rem", color: "#94a3b8" },
  repBadge: { fontSize: "0.8rem", color: "#64748b", marginLeft: "auto" },
  desc: { fontSize: "0.95rem", color: "#94a3b8", lineHeight: 1.7, margin: 0 },
  techRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  techBadge: { fontSize: "0.8rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" },
  duration: { fontSize: "0.82rem", color: "#64748b", background: "rgba(255,255,255,0.04)", padding: "4px 12px", borderRadius: "50px", border: "1px solid rgba(255,255,255,0.06)" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px" },
  cardTitle: { fontSize: "1.05rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 16px" },
  subTitle: { fontSize: "0.9rem", fontWeight: 600, color: "#64748b", margin: "0 0 12px" },
  divider: { height: "1px", background: "rgba(255,255,255,0.06)", margin: "16px 0" },
  rolesGrid: { display: "flex", flexDirection: "column", gap: "10px" },
  roleItem: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  openRoleBadge: { fontSize: "0.85rem", fontWeight: 600, padding: "6px 16px", borderRadius: "50px", border: "1px solid rgba(245,158,11,0.35)", color: "#f59e0b", background: "rgba(245,158,11,0.08)" },
  filledRoleBadge: { fontSize: "0.85rem", fontWeight: 600, padding: "6px 16px", borderRadius: "50px", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80", background: "rgba(74,222,128,0.08)" },
  roleStat: { fontSize: "0.78rem", color: "#64748b" },
  memberRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" },
  pendingRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "12px" },
  memberAvatar: { width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "white", flexShrink: 0 },
  memberName: { fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0" },
  memberRole: { fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" },
  activeBadge: { marginLeft: "auto", fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: "rgba(74,222,128,0.12)", color: "#4ade80" },
  approveBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", transition: "background 0.2s" },
  rejectBtn: { background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", transition: "background 0.2s" },
  joinCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px" },
  feeInfo: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "20px", background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(167,139,250,0.05))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", marginBottom: "16px", textAlign: "center" },
  balanceInfo: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", marginBottom: "16px", fontSize: "0.88rem" },
  label: { display: "block", fontSize: "0.88rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "8px" },
  select: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", fontSize: "0.9rem", color: "#e2e8f0", fontFamily: "'Inter',sans-serif", cursor: "pointer" },
  topupLink: { display: "block", textAlign: "center", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", padding: "10px", borderRadius: "10px", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, marginBottom: "12px" },
  joinBtn: { width: "100%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: "50px", padding: "14px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", fontFamily: "'Inter',sans-serif" },
  alreadyMember: { textAlign: "center", padding: "20px 0" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" },
  statItem: { textAlign: "center", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px" },
  statNum: { fontSize: "1.5rem", fontWeight: 800, color: "#6366f1" },
  statLbl: { fontSize: "0.72rem", color: "#64748b", marginTop: "4px" },
  completeBtn: { width: "100%", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: "50px", padding: "14px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "transform 0.2s", fontFamily: "'Inter',sans-serif" },
  infoCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "20px" },
};