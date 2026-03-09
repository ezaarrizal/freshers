import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const ADMIN_IDS = ["44c597d7-b8ff-4bfd-a1ea-4f83066fbea1"];

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  wallet_balance: number;
  reputation_score: number;
  created_at: string;
  active_projects: number;
  total_topup: number;
}

interface ProjectRow {
  id: string;
  title: string;
  status: string;
  creator_name: string;
  active_members: number;
  total_dana_terkunci: number;
  created_at: string;
}

interface TxRow {
  id: string;
  type: string;
  amount: number;
  user_name: string;
  user_email: string;
  project_title: string;
  mayar_ref: string;
  created_at: string;
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  profiles?: { full_name: string; wallet_balance: number };
}

interface Stats {
  total_users: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_balance_in_platform: number;
  total_topup_ever: number;
  total_dana_hangus: number;
  total_dana_terkunci: number;
  total_transaksi_topup: number;
  total_active_members: number;
}

type Tab = "stats" | "withdrawals" | "users" | "projects" | "transactions";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("withdrawals");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Adjust balance modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "subtract">("subtract");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Withdrawal action modal
  const [showWdModal, setShowWdModal] = useState(false);
  const [selectedWd, setSelectedWd] = useState<WithdrawalRow | null>(null);
  const [wdAction, setWdAction] = useState<"approved" | "rejected">("approved");
  const [wdNote, setWdNote] = useState("");
  const [wdLoading, setWdLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!ADMIN_IDS.includes(user.id)) { navigate("/dashboard"); return; }
    setAuthorized(true);
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [statsRes, usersRes, projectsRes, txRes, wdRes] = await Promise.all([
      supabase.from("platform_stats").select("*").single(),
      supabase.from("admin_users").select("*").limit(100),
      supabase.from("admin_projects").select("*").limit(100),
      supabase.from("admin_transactions").select("*").limit(100),
      supabase.from("withdrawal_requests")
        .select("*, profiles(full_name, wallet_balance)")
        .order("created_at", { ascending: false }),
    ]);
    if (statsRes.data) setStats(statsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (txRes.data) setTransactions(txRes.data);
    if (wdRes.data) setWithdrawals(wdRes.data);
    setLoading(false);
  };

  const handleAdjust = async () => {
    if (!selectedUser || !adjustAmount) return;
    const amount = parseInt(adjustAmount);
    if (!amount || amount <= 0) { setErrorMsg("Masukkan jumlah yang valid"); return; }
    const newBalance = adjustType === "add"
      ? selectedUser.wallet_balance + amount
      : selectedUser.wallet_balance - amount;
    if (newBalance < 0) { setErrorMsg("Saldo tidak boleh minus!"); return; }
    setAdjustLoading(true);
    await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", selectedUser.id);
    await supabase.from("transactions").insert({
      user_id: selectedUser.id,
      type: adjustType === "add" ? "topup" : "withdraw",
      amount,
      mayar_ref: `ADMIN-${adjustType.toUpperCase()}-${Date.now()}`,
    });
    setSuccessMsg(`✅ Saldo ${selectedUser.full_name} berhasil ${adjustType === "add" ? "ditambah" : "dikurangi"} Rp ${amount.toLocaleString("id-ID")}`);
    setShowAdjust(false);
    setAdjustAmount("");
    setSelectedUser(null);
    setAdjustLoading(false);
    setTimeout(() => setSuccessMsg(""), 5000);
    fetchAll();
  };

  const handleWithdrawalAction = async () => {
    if (!selectedWd) return;
    setWdLoading(true);
    setErrorMsg("");

    // Update status withdrawal
    await supabase.from("withdrawal_requests")
      .update({ status: wdAction, admin_note: wdNote || null })
      .eq("id", selectedWd.id);

    if (wdAction === "rejected") {
      // Kembalikan saldo user kalau ditolak
      const currentBalance = selectedWd.profiles?.wallet_balance || 0;
      await supabase.from("profiles")
        .update({ wallet_balance: currentBalance + selectedWd.amount })
        .eq("id", selectedWd.user_id);

      // Catat di transactions sebagai refund
      await supabase.from("transactions").insert({
        user_id: selectedWd.user_id,
        type: "topup",
        amount: selectedWd.amount,
        mayar_ref: `ADMIN-REFUND-${Date.now()}`,
      });
    }

    setSuccessMsg(
      wdAction === "approved"
        ? `✅ Withdrawal Rp ${selectedWd.amount.toLocaleString("id-ID")} a/n ${selectedWd.account_name} disetujui! Jangan lupa transfer manual dari Mayar.`
        : `✅ Withdrawal ditolak. Saldo Rp ${selectedWd.amount.toLocaleString("id-ID")} dikembalikan ke user.`
    );
    setShowWdModal(false);
    setSelectedWd(null);
    setWdNote("");
    setWdLoading(false);
    setTimeout(() => setSuccessMsg(""), 8000);
    fetchAll();
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");

  if (!authorized) return null;
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", fontFamily: "'DM Mono', monospace", color: "#00ff88" }}>
      Loading admin panel...
    </div>
  );

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.header}>
        <div>
          <div style={s.headerBadge}>⚡ ADMIN PANEL</div>
          <h1 style={s.headerTitle}>Freshers Control Center</h1>
        </div>
        <button onClick={fetchAll} style={s.refreshBtn} className="action-btn">🔄 Refresh</button>
      </div>

      {successMsg && <div style={s.successBox}>{successMsg}</div>}
      {errorMsg && <div style={s.errorBox}>⚠️ {errorMsg}</div>}

      {/* TABS */}
      <div style={s.tabs}>
        {([
          { key: "withdrawals",  label: "💸 Withdrawal",  badge: pendingWithdrawals.length },
          { key: "stats",        label: "📊 Statistik",   badge: 0 },
          { key: "users",        label: "👥 Users",        badge: 0 },
          { key: "projects",     label: "📋 Projects",     badge: 0 },
          { key: "transactions", label: "🧾 Transaksi",    badge: 0 },
        ] as { key: Tab; label: string; badge: number }[]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              ...s.tab,
              background: activeTab === tab.key ? "#00ff88" : "transparent",
              color: activeTab === tab.key ? "#0a0a0a" : "#00ff88",
              position: "relative",
            }} className="tab-btn">
            {tab.label}
            {tab.badge > 0 && (
              <span style={s.tabBadge}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── WITHDRAWALS ── */}
      {activeTab === "withdrawals" && (
        <div style={s.tableWrap}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>💸 Withdrawal Requests</span>
            <span style={s.tableSubtitle}>
              {pendingWithdrawals.length > 0
                ? `⚠️ ${pendingWithdrawals.length} request menunggu persetujuan`
                : "Tidak ada request pending"}
            </span>
          </div>
          {withdrawals.length === 0 ? (
            <div style={s.empty}>Belum ada withdrawal request</div>
          ) : (
            <div style={s.table}>
              <div style={s.thead}>
                <div style={{ ...s.th, flex: 2 }}>User</div>
                <div style={{ ...s.th, flex: 1 }}>Jumlah</div>
                <div style={{ ...s.th, flex: 2 }}>Rekening</div>
                <div style={{ ...s.th, flex: 1 }}>Status</div>
                <div style={{ ...s.th, flex: 1 }}>Tanggal</div>
                <div style={{ ...s.th, flex: 1 }}>Aksi</div>
              </div>
              {withdrawals.map(wd => (
                <div key={wd.id} style={s.trow} className="trow">
                  <div style={{ ...s.td, flex: 2 }}>
                    <div style={{ fontWeight: 700, color: "#00ff88", fontSize: "0.88rem" }}>{wd.profiles?.full_name}</div>
                    <div style={{ color: "#555", fontSize: "0.75rem" }}>Saldo: Rp {(wd.profiles?.wallet_balance || 0).toLocaleString("id-ID")}</div>
                  </div>
                  <div style={{ ...s.td, flex: 1, fontWeight: 800, color: "#ffaa00" }}>
                    Rp {wd.amount.toLocaleString("id-ID")}
                  </div>
                  <div style={{ ...s.td, flex: 2 }}>
                    <div style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>{wd.bank_name} · {wd.account_number}</div>
                    <div style={{ fontSize: "0.78rem", color: "#555" }}>a/n {wd.account_name}</div>
                    {wd.admin_note && <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: "2px" }}>📝 {wd.admin_note}</div>}
                  </div>
                  <div style={{ ...s.td, flex: 1 }}><WdStatusBadge status={wd.status} /></div>
                  <div style={{ ...s.td, flex: 1, color: "#555", fontSize: "0.78rem" }}>
                    {new Date(wd.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </div>
                  <div style={{ ...s.td, flex: 1 }}>
                    {wd.status === "pending" && (
                      <button onClick={() => { setSelectedWd(wd); setWdAction("approved"); setWdNote(""); setShowWdModal(true); }}
                        style={s.processBtn} className="action-btn">
                        Proses
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATS ── */}
      {activeTab === "stats" && stats && (
        <div style={s.statsGrid}>
          {[
            { label: "Total Users",       value: stats.total_users,                                                          icon: "👥", color: "#00ff88" },
            { label: "Total Projects",    value: stats.total_projects,                                                       icon: "📋", color: "#00d4ff" },
            { label: "Project Aktif",     value: stats.active_projects,                                                      icon: "🔥", color: "#ffaa00" },
            { label: "Project Selesai",   value: stats.completed_projects,                                                   icon: "✅", color: "#00ff88" },
            { label: "Member Aktif",      value: stats.total_active_members,                                                 icon: "🤝", color: "#00d4ff" },
            { label: "Total Top Up",      value: `Rp ${stats.total_topup_ever.toLocaleString("id-ID")}`,                    icon: "⬆️", color: "#00ff88", big: true },
            { label: "Saldo di Platform", value: `Rp ${stats.total_balance_in_platform.toLocaleString("id-ID")}`,           icon: "💰", color: "#ffaa00", big: true },
            { label: "Dana Terkunci",     value: `Rp ${stats.total_dana_terkunci.toLocaleString("id-ID")}`,                 icon: "🔒", color: "#00d4ff", big: true },
            { label: "Dana Hangus",       value: `Rp ${stats.total_dana_hangus.toLocaleString("id-ID")}`,                   icon: "💸", color: "#ff4444", big: true },
            { label: "Jumlah Top Up",     value: `${stats.total_transaksi_topup}x`,                                         icon: "🔢", color: "#00ff88" },
          ].map((stat, i) => (
            <div key={i} style={s.statCard}>
              <div style={s.statIcon}>{stat.icon}</div>
              <div style={{ ...s.statValue, color: stat.color, fontSize: stat.big ? "1.3rem" : "2rem" }}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── USERS ── */}
      {activeTab === "users" && (
        <div style={s.tableWrap}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>👥 Semua User ({users.length})</span>
            <span style={s.tableSubtitle}>Klik "Kelola" untuk tambah/kurangi saldo manual</span>
          </div>
          <div style={s.table}>
            <div style={s.thead}>
              <div style={{ ...s.th, flex: 2 }}>Nama</div>
              <div style={{ ...s.th, flex: 2 }}>Email</div>
              <div style={{ ...s.th, flex: 1 }}>Saldo</div>
              <div style={{ ...s.th, flex: 1 }}>Total Top Up</div>
              <div style={{ ...s.th, flex: 1 }}>Project</div>
              <div style={{ ...s.th, flex: 1 }}>Reputasi</div>
              <div style={{ ...s.th, flex: 1 }}>Aksi</div>
            </div>
            {users.map(u => (
              <div key={u.id} style={s.trow} className="trow">
                <div style={{ ...s.td, flex: 2, fontWeight: 700, color: "#00ff88" }}>{u.full_name}</div>
                <div style={{ ...s.td, flex: 2, color: "#555", fontSize: "0.82rem" }}>{u.email}</div>
                <div style={{ ...s.td, flex: 1, color: "#ffaa00", fontWeight: 700 }}>Rp {u.wallet_balance.toLocaleString("id-ID")}</div>
                <div style={{ ...s.td, flex: 1, color: "#444", fontSize: "0.82rem" }}>Rp {(u.total_topup || 0).toLocaleString("id-ID")}</div>
                <div style={{ ...s.td, flex: 1, color: "#00d4ff" }}>{u.active_projects}</div>
                <div style={{ ...s.td, flex: 1 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: "4px", background: u.reputation_score >= 80 ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)", color: u.reputation_score >= 80 ? "#00ff88" : "#ff4444" }}>
                    {u.reputation_score}
                  </span>
                </div>
                <div style={{ ...s.td, flex: 1 }}>
                  <button onClick={() => { setSelectedUser(u); setAdjustType("subtract"); setAdjustAmount(""); setShowAdjust(true); setErrorMsg(""); }}
                    style={s.manageBtn} className="action-btn">
                    💰 Kelola
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROJECTS ── */}
      {activeTab === "projects" && (
        <div style={s.tableWrap}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>📋 Semua Project ({projects.length})</span>
          </div>
          <div style={s.table}>
            <div style={s.thead}>
              <div style={{ ...s.th, flex: 3 }}>Judul</div>
              <div style={{ ...s.th, flex: 1 }}>Status</div>
              <div style={{ ...s.th, flex: 2 }}>Creator</div>
              <div style={{ ...s.th, flex: 1 }}>Member</div>
              <div style={{ ...s.th, flex: 1 }}>Dana Terkunci</div>
              <div style={{ ...s.th, flex: 1 }}>Dibuat</div>
            </div>
            {projects.map(p => (
              <div key={p.id} style={s.trow} className="trow">
                <div style={{ ...s.td, flex: 3, fontWeight: 600, color: "#e2e8f0" }}>{p.title}</div>
                <div style={{ ...s.td, flex: 1 }}><StatusBadge status={p.status} /></div>
                <div style={{ ...s.td, flex: 2, color: "#555", fontSize: "0.85rem" }}>{p.creator_name}</div>
                <div style={{ ...s.td, flex: 1, color: "#00d4ff" }}>{p.active_members}</div>
                <div style={{ ...s.td, flex: 1, color: "#ffaa00", fontSize: "0.85rem" }}>Rp {(p.total_dana_terkunci || 0).toLocaleString("id-ID")}</div>
                <div style={{ ...s.td, flex: 1, color: "#444", fontSize: "0.8rem" }}>
                  {new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {activeTab === "transactions" && (
        <div style={s.tableWrap}>
          <div style={s.tableHeader}>
            <span style={s.tableTitle}>🧾 Semua Transaksi ({transactions.length})</span>
          </div>
          <div style={s.table}>
            <div style={s.thead}>
              <div style={{ ...s.th, flex: 1 }}>Tipe</div>
              <div style={{ ...s.th, flex: 2 }}>User</div>
              <div style={{ ...s.th, flex: 1 }}>Jumlah</div>
              <div style={{ ...s.th, flex: 2 }}>Project</div>
              <div style={{ ...s.th, flex: 2 }}>Ref</div>
              <div style={{ ...s.th, flex: 1 }}>Waktu</div>
            </div>
            {transactions.map(tx => {
              const isPos = ["topup", "unlock"].includes(tx.type);
              return (
                <div key={tx.id} style={s.trow} className="trow">
                  <div style={{ ...s.td, flex: 1 }}><TxBadge type={tx.type} /></div>
                  <div style={{ ...s.td, flex: 2 }}>
                    <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.88rem" }}>{tx.user_name}</div>
                    <div style={{ color: "#444", fontSize: "0.75rem" }}>{tx.user_email}</div>
                  </div>
                  <div style={{ ...s.td, flex: 1, fontWeight: 700, color: isPos ? "#00ff88" : "#ff4444" }}>
                    {isPos ? "+" : "-"}Rp {tx.amount.toLocaleString("id-ID")}
                  </div>
                  <div style={{ ...s.td, flex: 2, color: "#555", fontSize: "0.82rem" }}>{tx.project_title || "—"}</div>
                  <div style={{ ...s.td, flex: 2, color: "#333", fontSize: "0.75rem", fontFamily: "'DM Mono', monospace" }}>
                    {tx.mayar_ref ? tx.mayar_ref.substring(0, 22) + "..." : "—"}
                  </div>
                  <div style={{ ...s.td, flex: 1, color: "#444", fontSize: "0.78rem" }}>
                    {new Date(tx.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WITHDRAWAL ACTION MODAL ── */}
      {showWdModal && selectedWd && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowWdModal(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>💸 Proses Withdrawal</h2>
              <button onClick={() => setShowWdModal(false)} style={s.closeBtn}>×</button>
            </div>
            <div style={s.modalBody}>
              {/* Detail request */}
              <div style={s.wdDetail}>
                <div style={s.wdDetailRow}>
                  <span style={s.wdDetailLabel}>User</span>
                  <span style={s.wdDetailValue}>{selectedWd.profiles?.full_name}</span>
                </div>
                <div style={s.wdDetailRow}>
                  <span style={s.wdDetailLabel}>Jumlah</span>
                  <span style={{ ...s.wdDetailValue, color: "#ffaa00", fontWeight: 800 }}>Rp {selectedWd.amount.toLocaleString("id-ID")}</span>
                </div>
                <div style={s.wdDetailRow}>
                  <span style={s.wdDetailLabel}>Bank</span>
                  <span style={s.wdDetailValue}>{selectedWd.bank_name}</span>
                </div>
                <div style={s.wdDetailRow}>
                  <span style={s.wdDetailLabel}>No. Rekening</span>
                  <span style={{ ...s.wdDetailValue, fontFamily: "'DM Mono', monospace" }}>{selectedWd.account_number}</span>
                </div>
                <div style={s.wdDetailRow}>
                  <span style={s.wdDetailLabel}>Atas Nama</span>
                  <span style={s.wdDetailValue}>{selectedWd.account_name}</span>
                </div>
              </div>

              {/* Action toggle */}
              <div style={s.toggleWrap}>
                <button onClick={() => setWdAction("approved")}
                  style={{ ...s.toggleBtn, background: wdAction === "approved" ? "rgba(0,255,136,0.1)" : "transparent", color: wdAction === "approved" ? "#00ff88" : "#555", borderColor: wdAction === "approved" ? "#00ff88" : "#333" }}>
                  ✅ Setujui
                </button>
                <button onClick={() => setWdAction("rejected")}
                  style={{ ...s.toggleBtn, background: wdAction === "rejected" ? "rgba(255,68,68,0.1)" : "transparent", color: wdAction === "rejected" ? "#ff4444" : "#555", borderColor: wdAction === "rejected" ? "#ff4444" : "#333" }}>
                  ❌ Tolak
                </button>
              </div>

              {wdAction === "approved" && (
                <div style={s.approveNote}>
                  ⚠️ Pastikan kamu sudah transfer Rp {selectedWd.amount.toLocaleString("id-ID")} ke rekening {selectedWd.bank_name} {selectedWd.account_number} a/n {selectedWd.account_name} dari dashboard Mayar sebelum menekan Setujui!
                </div>
              )}

              {wdAction === "rejected" && (
                <div style={s.rejectNote}>
                  ℹ️ Saldo Rp {selectedWd.amount.toLocaleString("id-ID")} akan otomatis dikembalikan ke user.
                </div>
              )}

              {/* Note */}
              <div style={s.field}>
                <label style={s.label}>Catatan untuk user (opsional)</label>
                <input type="text"
                  placeholder={wdAction === "approved" ? "Contoh: Transfer sudah dikirim" : "Contoh: Data rekening tidak valid"}
                  value={wdNote} onChange={e => setWdNote(e.target.value)}
                  style={s.input} className="admin-input" />
              </div>

              <button onClick={handleWithdrawalAction} disabled={wdLoading}
                style={{
                  ...s.confirmBtn,
                  background: wdAction === "approved" ? "linear-gradient(135deg,#00ff88,#00cc66)" : "linear-gradient(135deg,#ff4444,#cc0000)",
                  opacity: wdLoading ? 0.7 : 1,
                }} className="action-btn">
                {wdLoading ? "Memproses..." : wdAction === "approved" ? "✅ Konfirmasi Setujui" : "❌ Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADJUST BALANCE MODAL ── */}
      {showAdjust && selectedUser && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowAdjust(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>💰 Kelola Saldo Manual</h2>
              <button onClick={() => setShowAdjust(false)} style={s.closeBtn}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.userInfo}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0" }}>{selectedUser.full_name}</div>
                <div style={{ fontSize: "0.82rem", color: "#555" }}>{selectedUser.email}</div>
                <div style={{ fontSize: "0.88rem", color: "#888", marginTop: "8px" }}>
                  Saldo: <strong style={{ color: "#ffaa00" }}>Rp {selectedUser.wallet_balance.toLocaleString("id-ID")}</strong>
                </div>
              </div>
              <div style={s.toggleWrap}>
                <button onClick={() => setAdjustType("subtract")}
                  style={{ ...s.toggleBtn, background: adjustType === "subtract" ? "rgba(255,68,68,0.2)" : "transparent", color: adjustType === "subtract" ? "#ff4444" : "#555", borderColor: adjustType === "subtract" ? "#ff4444" : "#333" }}>
                  ⬇️ Kurangi
                </button>
                <button onClick={() => setAdjustType("add")}
                  style={{ ...s.toggleBtn, background: adjustType === "add" ? "rgba(0,255,136,0.1)" : "transparent", color: adjustType === "add" ? "#00ff88" : "#555", borderColor: adjustType === "add" ? "#00ff88" : "#333" }}>
                  ⬆️ Tambah
                </button>
              </div>
              <div style={s.field}>
                <label style={s.label}>Jumlah (Rp)</label>
                <input type="number" placeholder="Contoh: 50000" value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  style={s.input} className="admin-input" />
              </div>
              {adjustAmount && parseInt(adjustAmount) > 0 && (
                <div style={s.previewBox}>
                  <div style={s.previewRow}>
                    <span style={{ color: "#555" }}>Saldo sekarang</span>
                    <span>Rp {selectedUser.wallet_balance.toLocaleString("id-ID")}</span>
                  </div>
                  <div style={{ ...s.previewRow, borderTop: "1px solid #1a1a1a", paddingTop: "10px", marginTop: "4px" }}>
                    <span style={{ fontWeight: 700 }}>Saldo akhir</span>
                    <span style={{ fontWeight: 800, color: "#ffaa00" }}>
                      Rp {Math.max(0, (adjustType === "add"
                        ? selectedUser.wallet_balance + parseInt(adjustAmount)
                        : selectedUser.wallet_balance - parseInt(adjustAmount)
                      )).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}
              {errorMsg && <div style={s.errorBox}>{errorMsg}</div>}
              <button onClick={handleAdjust} disabled={adjustLoading}
                style={{ ...s.confirmBtn, background: adjustType === "add" ? "linear-gradient(135deg,#00ff88,#00cc66)" : "linear-gradient(135deg,#ff4444,#cc0000)", opacity: adjustLoading ? 0.7 : 1 }}
                className="action-btn">
                {adjustLoading ? "Memproses..." : adjustType === "add" ? "✅ Tambah Saldo" : "✅ Kurangi Saldo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WdStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: "⏳ Pending",   color: "#ffaa00", bg: "rgba(255,170,0,0.1)"   },
    approved: { label: "✅ Disetujui", color: "#00ff88", bg: "rgba(0,255,136,0.1)"   },
    rejected: { label: "❌ Ditolak",   color: "#ff4444", bg: "rgba(255,68,68,0.1)"   },
  };
  const c = map[status] || map.pending;
  return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "4px", background: c.bg, color: c.color }}>{c.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    open:      { label: "Open",    color: "#00ff88", bg: "rgba(0,255,136,0.1)"  },
    ongoing:   { label: "Ongoing", color: "#00d4ff", bg: "rgba(0,212,255,0.1)"  },
    completed: { label: "Selesai", color: "#ffaa00", bg: "rgba(255,170,0,0.1)"  },
    cancelled: { label: "Batal",   color: "#ff4444", bg: "rgba(255,68,68,0.1)"  },
  };
  const c = map[status] || map.open;
  return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "4px", background: c.bg, color: c.color }}>{c.label}</span>;
}

function TxBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    topup:    { label: "TOP UP",   color: "#00ff88" },
    lock:     { label: "LOCK",     color: "#ffaa00" },
    unlock:   { label: "UNLOCK",   color: "#00d4ff" },
    withdraw: { label: "WITHDRAW", color: "#ff4444" },
    forfeit:  { label: "HANGUS",   color: "#ff4444" },
  };
  const c = map[type] || { label: type.toUpperCase(), color: "#555" };
  return <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "3px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", color: c.color, letterSpacing: "1px", fontFamily: "'DM Mono', monospace" }}>{c.label}</span>;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800;900&display=swap');
  .tab-btn:hover { opacity: 0.8; }
  .trow:hover { background: rgba(0,255,136,0.02) !important; }
  .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .admin-input:focus { outline: none; border-color: #00ff88 !important; box-shadow: 0 0 0 3px rgba(0,255,136,0.1); }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "1200px", margin: "0 auto", fontFamily: "'DM Mono', monospace", paddingBottom: "80px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" },
  headerBadge: { fontSize: "0.72rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" },
  headerTitle: { fontSize: "2rem", fontWeight: 900, color: "#e2e8f0", margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: "-1px" },
  refreshBtn: { background: "transparent", border: "1px solid #222", color: "#555", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", transition: "all 0.2s" },
  successBox: { background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", padding: "14px 20px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.88rem", animation: "fadeIn 0.3s ease", lineHeight: 1.6 },
  errorBox: { background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", color: "#ff4444", padding: "14px 20px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.88rem" },
  tabs: { display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" },
  tab: { padding: "10px 20px", border: "1px solid #1a1a1a", borderRadius: "8px", fontWeight: 500, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" },
  tabBadge: { position: "absolute", top: "-6px", right: "-6px", background: "#ff4444", color: "#fff", fontSize: "0.65rem", fontWeight: 800, width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" },
  statCard: { background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "8px" },
  statIcon: { fontSize: "1.5rem" },
  statValue: { fontWeight: 900, letterSpacing: "-0.5px", fontFamily: "'Syne', sans-serif" },
  statLabel: { fontSize: "0.75rem", color: "#444", letterSpacing: "0.5px" },
  tableWrap: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" },
  tableHeader: { padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: "4px" },
  tableTitle: { fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", fontFamily: "'Syne', sans-serif" },
  tableSubtitle: { fontSize: "0.78rem", color: "#555" },
  table: { display: "flex", flexDirection: "column" },
  thead: { display: "flex", padding: "12px 24px", borderBottom: "1px solid #111", background: "#111" },
  th: { fontSize: "0.7rem", fontWeight: 500, color: "#333", letterSpacing: "1px", textTransform: "uppercase" },
  trow: { display: "flex", padding: "14px 24px", borderBottom: "1px solid #0f0f0f", transition: "background 0.15s", alignItems: "center" },
  td: { fontSize: "0.88rem", color: "#e2e8f0", paddingRight: "16px" },
  empty: { padding: "48px 24px", textAlign: "center", color: "#333", fontSize: "0.88rem" },
  processBtn: { background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.2)", color: "#ffaa00", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Mono', monospace", transition: "all 0.2s", whiteSpace: "nowrap" },
  manageBtn: { background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Mono', monospace", transition: "all 0.2s", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" },
  modal: { background: "#111", border: "1px solid #222", borderRadius: "16px", width: "100%", maxWidth: "480px", overflow: "hidden", animation: "fadeIn 0.25s ease" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1a1a1a" },
  modalTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'Syne', sans-serif" },
  closeBtn: { background: "#1a1a1a", border: "none", color: "#555", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" },
  modalBody: { padding: "24px", display: "flex", flexDirection: "column", gap: "18px" },
  wdDetail: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  wdDetailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.88rem" },
  wdDetailLabel: { color: "#444" },
  wdDetailValue: { color: "#e2e8f0", fontWeight: 600 },
  approveNote: { background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: "8px", padding: "12px 16px", fontSize: "0.82rem", color: "#ffaa00", lineHeight: 1.6 },
  rejectNote: { background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "8px", padding: "12px 16px", fontSize: "0.82rem", color: "#00d4ff", lineHeight: 1.6 },
  userInfo: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "16px" },
  toggleWrap: { display: "flex", gap: "10px" },
  toggleBtn: { flex: 1, border: "1px solid", borderRadius: "8px", padding: "10px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.2s", fontWeight: 500 },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "0.78rem", color: "#555", letterSpacing: "0.5px" },
  input: { background: "#0d0d0d", border: "1px solid #222", borderRadius: "8px", padding: "13px 16px", fontSize: "0.95rem", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", transition: "border-color 0.2s" },
  previewBox: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  previewRow: { display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#e2e8f0" },
  confirmBtn: { width: "100%", border: "none", borderRadius: "10px", padding: "14px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono', monospace", color: "#0a0a0a", transition: "all 0.2s" },
};
