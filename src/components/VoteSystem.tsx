import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profiles: { full_name: string } | { full_name: string }[];
}

interface Vote {
  id: string;
  target_user_id: string;
  voter_id: string;
  vote: "kick" | "keep";
  reason: string;
}

interface VoteSystemProps {
  projectId: string;
  creatorId: string;
  members: Member[];
  onVoteComplete?: () => void;
}

export default function VoteSystem({ projectId, creatorId, members, onVoteComplete }: VoteSystemProps) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [voteType, setVoteType] = useState<"kick" | "keep">("kick");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const activeMembers = members.filter(m => m.status === "active");

  useEffect(() => {
    fetchVotes();
  }, [projectId]);

  const fetchVotes = async () => {
    const { data } = await supabase
      .from("member_votes")
      .select("*")
      .eq("project_id", projectId);
    setVotes(data || []);
    setLoading(false);
  };

  const getMemberName = (member: Member): string => {
    const p = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    return (p as any)?.full_name || "Unknown";
  };

  const getVotesForMember = (userId: string) => {
    const memberVotes = votes.filter(v => v.target_user_id === userId);
    const kickVotes = memberVotes.filter(v => v.vote === "kick").length;
    const keepVotes = memberVotes.filter(v => v.vote === "keep").length;
    const myVote = votes.find(v => v.target_user_id === userId && v.voter_id === user!.id);
    return { kickVotes, keepVotes, total: memberVotes.length, myVote };
  };

  const canVote = (targetUserId: string) => {
    // Tidak bisa vote diri sendiri
    if (targetUserId === user!.id) return false;
    // Harus jadi member atau creator
    const isMemberOrCreator = activeMembers.some(m => m.user_id === user!.id) || user!.id === creatorId;
    return isMemberOrCreator;
  };

  const openVoteModal = (member: Member) => {
    setSelectedMember(member);
    setVoteType("kick");
    setReason("");
    setShowVoteModal(true);
  };

  const handleVote = async () => {
    if (!selectedMember || !reason.trim()) return;
    setSubmitting(true);

    // Upsert vote (update kalau sudah pernah vote)
    const { error } = await supabase
      .from("member_votes")
      .upsert({
        project_id: projectId,
        target_user_id: selectedMember.user_id,
        voter_id: user!.id,
        vote: voteType,
        reason: reason.trim(),
      }, {
        onConflict: "project_id,target_user_id,voter_id",
      });

    if (!error) {
      // Cek apakah mayoritas vote kick (lebih dari 50% active members)
      await fetchVotes();
      const { kickVotes } = getVotesForMember(selectedMember.user_id);
      const threshold = Math.ceil(activeMembers.length / 2);

      if (kickVotes + 1 >= threshold) {
        // Auto kick member
        await handleAutoKick(selectedMember);
      }

      setSuccessMsg(`Vote berhasil dikirim! Terima kasih atas feedback kamu.`);
      setShowVoteModal(false);
      setReason("");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchVotes();
      onVoteComplete?.();
    }

    setSubmitting(false);
  };

  const handleAutoKick = async (member: Member) => {
    // Update status member jadi 'left'
    await supabase
      .from("project_members")
      .update({ status: "left" })
      .eq("project_id", projectId)
      .eq("user_id", member.user_id);

    // Dana hangus — tidak dikembalikan
    await supabase.from("transactions").insert({
      user_id: member.user_id,
      type: "forfeit",
      amount: 25000,
      project_id: projectId,
    });

    // Buka kembali slot role
    await supabase
      .from("project_roles")
      .update({ is_filled: false, filled_by: null })
      .eq("project_id", projectId)
      .eq("role_name", member.role)
      .eq("is_filled", true)
      .limit(1);
  };

  const handleCreatorKick = async (member: Member) => {
    if (!confirm(`Kick ${getMemberName(member)} dari project? Dana commitment mereka akan hangus.`)) return;
    await handleAutoKick(member);
    setSuccessMsg(`${getMemberName(member)} telah dikeluarkan dari project.`);
    setTimeout(() => setSuccessMsg(""), 4000);
    fetchVotes();
    onVoteComplete?.();
  };

  if (loading) return null;
  if (activeMembers.length === 0) return null;

  // Filter members — jangan tampilkan diri sendiri sebagai target vote
  const votableMembers = activeMembers.filter(m => m.user_id !== user!.id);

  if (votableMembers.length === 0) return null;

  return (
    <div style={s.container}>
      <style>{css}</style>

      <div style={s.header}>
        <h2 style={s.title}>🗳️ Feedback & Accountability</h2>
        <p style={s.subtitle}>
          Vote untuk anggota yang tidak aktif. Jika mayoritas vote kick, anggota akan dikeluarkan dan dana hangus.
        </p>
      </div>

      {successMsg && (
        <div style={s.successBox}>✅ {successMsg}</div>
      )}

      <div style={s.membersList}>
        {votableMembers.map(member => {
          const name = getMemberName(member);
          const { kickVotes, keepVotes, total, myVote } = getVotesForMember(member.user_id);
          const threshold = Math.ceil(activeMembers.length / 2);
          const kickPct = total > 0 ? Math.round((kickVotes / activeMembers.length) * 100) : 0;
          const isAtRisk = kickVotes >= Math.floor(threshold * 0.7);

          return (
            <div key={member.id} style={{
              ...s.memberCard,
              borderColor: isAtRisk ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.08)",
            }}>
              <div style={s.memberTop}>
                <div style={s.memberLeft}>
                  <div style={{
                    ...s.avatar,
                    background: isAtRisk
                      ? "linear-gradient(135deg,#ef4444,#dc2626)"
                      : "linear-gradient(135deg,#6366f1,#a78bfa)",
                  }}>
                    {name[0]}
                  </div>
                  <div>
                    <div style={s.memberName}>{name}</div>
                    <div style={s.memberRole}>{member.role}</div>
                  </div>
                </div>

                <div style={s.memberActions}>
                  {/* Vote stats */}
                  {total > 0 && (
                    <div style={s.voteStats}>
                      <span style={{ color: "#f87171", fontSize: "0.82rem", fontWeight: 600 }}>
                        👎 {kickVotes} kick
                      </span>
                      <span style={{ color: "#4ade80", fontSize: "0.82rem", fontWeight: 600 }}>
                        👍 {keepVotes} keep
                      </span>
                    </div>
                  )}

                  {/* My vote badge */}
                  {myVote && (
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px",
                      borderRadius: "50px",
                      background: myVote.vote === "kick" ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)",
                      color: myVote.vote === "kick" ? "#f87171" : "#4ade80",
                    }}>
                      Kamu: {myVote.vote === "kick" ? "👎 Kick" : "👍 Keep"}
                    </span>
                  )}

                  {/* Vote button */}
                  {canVote(member.user_id) && (
                    <button onClick={() => openVoteModal(member)} style={s.voteBtn} className="vote-btn">
                      🗳️ Vote
                    </button>
                  )}

                  {/* Creator kick button */}
                  {user!.id === creatorId && member.user_id !== creatorId && (
                    <button onClick={() => handleCreatorKick(member)} style={s.kickBtn} className="kick-btn">
                      ✕ Kick
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar kick votes */}
              {total > 0 && (
                <div style={s.voteProgress}>
                  <div style={s.voteProgressBg}>
                    <div style={{
                      ...s.voteProgressFill,
                      width: `${kickPct}%`,
                      background: isAtRisk
                        ? "linear-gradient(90deg,#ef4444,#dc2626)"
                        : "linear-gradient(90deg,#f59e0b,#f97316)",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {kickVotes}/{threshold} kick votes untuk auto-kick
                  </span>
                </div>
              )}

              {/* Risk warning */}
              {isAtRisk && (
                <div style={s.riskWarning}>
                  ⚠️ Anggota ini berisiko dikeluarkan ({kickVotes}/{threshold} vote kick)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* VOTE MODAL */}
      {showVoteModal && selectedMember && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowVoteModal(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>🗳️ Vote Anggota</h3>
              <button onClick={() => setShowVoteModal(false)} style={s.closeBtn}>×</button>
            </div>

            <div style={s.modalBody}>
              {/* Target member */}
              <div style={s.targetCard}>
                <div style={s.avatar}>{getMemberName(selectedMember)[0]}</div>
                <div>
                  <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{getMemberName(selectedMember)}</div>
                  <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{selectedMember.role}</div>
                </div>
              </div>

              {/* Vote type */}
              <div style={s.field}>
                <label style={s.label}>Vote kamu</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button onClick={() => setVoteType("kick")}
                    style={{
                      ...s.voteTypeBtn,
                      background: voteType === "kick" ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)",
                      borderColor: voteType === "kick" ? "#f87171" : "rgba(255,255,255,0.08)",
                      color: voteType === "kick" ? "#f87171" : "#94a3b8",
                    }}>
                    👎 Kick<br />
                    <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Tidak aktif / menghambat</span>
                  </button>
                  <button onClick={() => setVoteType("keep")}
                    style={{
                      ...s.voteTypeBtn,
                      background: voteType === "keep" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
                      borderColor: voteType === "keep" ? "#4ade80" : "rgba(255,255,255,0.08)",
                      color: voteType === "keep" ? "#4ade80" : "#94a3b8",
                    }}>
                    👍 Keep<br />
                    <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Masih aktif berkontribusi</span>
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div style={s.field}>
                <label style={s.label}>Alasan *</label>
                <textarea
                  style={s.textarea}
                  className="vote-input"
                  placeholder={voteType === "kick"
                    ? "Jelaskan kenapa anggota ini perlu dikeluarkan..."
                    : "Jelaskan kenapa anggota ini layak dipertahankan..."}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <p style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>
                ⚠️ Vote bersifat anonim antar member. Jika mayoritas ({Math.ceil(activeMembers.length / 2)} dari {activeMembers.length} orang) vote kick, anggota akan otomatis dikeluarkan dan dana hangus.
              </p>
            </div>

            <div style={s.modalFooter}>
              <button onClick={() => setShowVoteModal(false)} style={s.cancelBtn}>Batal</button>
              <button
                onClick={handleVote}
                disabled={submitting || !reason.trim()}
                style={{
                  ...s.submitVoteBtn,
                  background: voteType === "kick"
                    ? "linear-gradient(135deg,#ef4444,#dc2626)"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  opacity: submitting || !reason.trim() ? 0.6 : 1,
                }}
                className="submit-vote-btn">
                {submitting ? "Mengirim..." : voteType === "kick" ? "👎 Kirim Vote Kick" : "👍 Kirim Vote Keep"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
  .vote-btn:hover { background: rgba(99,102,241,0.2) !important; color: #a78bfa !important; }
  .kick-btn:hover { background: rgba(239,68,68,0.2) !important; color: #f87171 !important; }
  .vote-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .submit-vote-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .submit-vote-btn:disabled { cursor: not-allowed; }
`;

const s: Record<string, React.CSSProperties> = {
  container: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", marginTop: "20px" },
  header: { marginBottom: "20px" },
  title: { fontSize: "1.05rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" },
  subtitle: { fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5, margin: 0 },
  successBox: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "0.88rem", fontWeight: 600 },
  membersList: { display: "flex", flexDirection: "column", gap: "12px" },
  memberCard: { background: "rgba(255,255,255,0.03)", border: "1px solid", borderRadius: "14px", padding: "16px", transition: "border-color 0.3s" },
  memberTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  memberLeft: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "white", flexShrink: 0 },
  memberName: { fontSize: "0.92rem", fontWeight: 600, color: "#e2e8f0" },
  memberRole: { fontSize: "0.8rem", color: "#64748b", marginTop: "2px" },
  memberActions: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  voteStats: { display: "flex", gap: "12px" },
  voteBtn: { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#94a3b8", padding: "6px 14px", borderRadius: "50px", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", transition: "all 0.2s" },
  kickBtn: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#94a3b8", padding: "6px 14px", borderRadius: "50px", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", transition: "all 0.2s" },
  voteProgress: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" },
  voteProgressBg: { height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "50px", overflow: "hidden" },
  voteProgressFill: { height: "100%", borderRadius: "50px", transition: "width 0.5s ease" },
  riskWarning: { marginTop: "10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", padding: "8px 12px", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" },
  modal: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", width: "100%", maxWidth: "480px", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  modalTitle: { fontSize: "1.05rem", fontWeight: 700, color: "#e2e8f0", margin: 0 },
  closeBtn: { background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: "30px", height: "30px", borderRadius: "8px", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" },
  modalBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  targetCard: { display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.04)", padding: "12px 16px", borderRadius: "12px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "0.88rem", fontWeight: 600, color: "#e2e8f0" },
  voteTypeBtn: { border: "1px solid", borderRadius: "12px", padding: "14px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", textAlign: "center", lineHeight: 1.5 },
  textarea: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", fontSize: "0.9rem", color: "#e2e8f0", fontFamily: "'Inter',sans-serif", resize: "none", transition: "border-color 0.2s" },
  cancelBtn: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: "50px", padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  submitVoteBtn: { color: "#fff", border: "none", borderRadius: "50px", padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "transform 0.2s" },
};
