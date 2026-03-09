import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Transaction {
  id: string;
  type: "topup" | "lock" | "unlock" | "withdraw" | "forfeit";
  amount: number;
  project_id: string | null;
  created_at: string;
  projects?: { title: string };
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
}

const TOPUP_OPTIONS = [25000, 50000, 100000, 200000];
const BANKS = [
  "BCA", "BNI", "BRI", "Mandiri", "CIMB Niaga",
  "Danamon", "Permata", "BTN", "BSI", "Jenius/SMBC",
  "GoPay", "OVO", "Dana", "ShopeePay",
];

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mayar-webhook`;

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState(50000);
  const [customAmount, setCustomAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"topup" | "withdraw" | "history">("topup");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // QR State
  const [qrLoading, setQrLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrAmount, setQrAmount] = useState(0);
  const [qrRef, setQrRef] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"waiting" | "paid">("waiting");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Withdrawal form
  const [wdForm, setWdForm] = useState({ amount: "", bank_name: "", account_number: "", account_name: "" });
  const [wdLoading, setWdLoading] = useState(false);

  useEffect(() => {
    if (user) fetchData();
    return () => stopPolling();
  }, [user]);

  const fetchData = async () => {
    const { data: pd } = await supabase
      .from("profiles").select("wallet_balance").eq("id", user!.id).single();
    const { data: txs } = await supabase
      .from("transactions").select("*, projects(title)").eq("user_id", user!.id)
      .order("created_at", { ascending: false }).limit(30);
    const { data: wds } = await supabase
      .from("withdrawal_requests").select("*").eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    const locked = (txs || []).reduce((acc: number, tx: Transaction) => {
      if (tx.type === "lock") return acc + tx.amount;
      if (tx.type === "unlock") return acc - tx.amount;
      return acc;
    }, 0);

    setBalance(pd?.wallet_balance || 0);
    setLockedBalance(Math.max(0, locked));
    setTransactions(txs || []);
    setWithdrawals(wds || []);
    setLoading(false);
  };

  const getTopupAmount = () => customAmount ? parseInt(customAmount) || 0 : topupAmount;

  const handleGenerateQR = async () => {
    const amount = getTopupAmount();
    if (!amount || amount < 10000) { setErrorMsg("Minimal top up Rp 10.000 (batas minimum Mayar)"); return; }
    setQrLoading(true);
    setErrorMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${EDGE_URL}/generate-qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ amount, userId: user!.id }),
      });
      const data = await res.json();
      if (data.success && data.qrUrl) {
        setQrUrl(data.qrUrl);
        setQrAmount(data.amount);
        setQrRef(data.ref);
        setPaymentStatus("waiting");
        setShowQrModal(true);
        startPolling(data.ref);
      } else {
        setErrorMsg(data.error || "Gagal generate QR. Coba lagi!");
      }
    } catch (err) {
      setErrorMsg("Koneksi gagal. Coba lagi!");
    }
    setQrLoading(false);
  };

  const startPolling = (ref: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${EDGE_URL}/check-payment?ref=${ref}&userId=${user!.id}`,
          { headers: { "Authorization": `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`, "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.paid) {
          stopPolling();
          setPaymentStatus("paid");
          await fetchData();
          setTimeout(() => {
            setShowQrModal(false);
            setQrUrl(null);
            setQrRef(null);
            setPaymentStatus("waiting");
            setSuccessMsg(`✅ Top up Rp ${qrAmount.toLocaleString("id-ID")} berhasil!`);
            setTimeout(() => setSuccessMsg(""), 5000);
          }, 2000);
        }
      } catch (err) { console.error("Polling error:", err); }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const handleCloseQrModal = () => {
    stopPolling();
    setShowQrModal(false);
    setQrUrl(null);
    setQrRef(null);
    setPaymentStatus("waiting");
  };

  const handleSimulateTopUp = async () => {
    const amount = getTopupAmount();
    if (!amount || amount < 100) return;
    await supabase.from("profiles").update({ wallet_balance: balance + amount }).eq("id", user!.id);
    await supabase.from("transactions").insert({ user_id: user!.id, type: "topup", amount, mayar_ref: `DEMO-${Date.now()}` });
    setBalance(prev => prev + amount);
    setSuccessMsg(`✅ Demo: Rp ${amount.toLocaleString("id-ID")} ditambahkan!`);
    setCustomAmount("");
    setTimeout(() => setSuccessMsg(""), 4000);
    fetchData();
  };

  const handleWithdrawRequest = async () => {
    setErrorMsg("");
    const amount = parseInt(wdForm.amount);
    if (!amount || amount < 10000) { setErrorMsg("Minimal withdrawal Rp 10.000"); return; }
    if (amount > balance) { setErrorMsg("Saldo tidak mencukupi!"); return; }
    if (!wdForm.bank_name) { setErrorMsg("Pilih bank/e-wallet dulu!"); return; }
    if (!wdForm.account_number) { setErrorMsg("Masukkan nomor rekening!"); return; }
    if (!wdForm.account_name) { setErrorMsg("Masukkan nama pemilik rekening!"); return; }

    // Cek apakah ada request pending
    const hasPending = withdrawals.some(w => w.status === "pending");
    if (hasPending) { setErrorMsg("Kamu masih punya request withdrawal yang sedang diproses!"); return; }

    setWdLoading(true);

    // Langsung kurangi saldo (hold)
    await supabase.from("profiles")
      .update({ wallet_balance: balance - amount })
      .eq("id", user!.id);

    // Buat withdrawal request
    await supabase.from("withdrawal_requests").insert({
      user_id: user!.id,
      amount,
      bank_name: wdForm.bank_name,
      account_number: wdForm.account_number,
      account_name: wdForm.account_name,
      status: "pending",
    });

    // Catat di transactions
    await supabase.from("transactions").insert({
      user_id: user!.id,
      type: "withdraw",
      amount,
    });

    setBalance(prev => prev - amount);
    setSuccessMsg("✅ Request withdrawal berhasil dikirim! Admin akan memproses dalam 1x24 jam.");
    setWdForm({ amount: "", bank_name: "", account_number: "", account_name: "" });
    setWdLoading(false);
    setActiveTab("history");
    setTimeout(() => setSuccessMsg(""), 6000);
    fetchData();
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ color: "#6366f1", fontWeight: 600 }}>Memuat wallet...</div>
    </div>
  );

  const selectedAmount = getTopupAmount();
  const pendingWithdrawal = withdrawals.find(w => w.status === "pending");

  return (
    <div style={s.page}>
      <style>{css}</style>

      <h1 style={s.pageTitle}>Wallet 💰</h1>
      <p style={s.pageSub}>Saldo digunakan sebagai commitment fee project</p>

      {successMsg && <div style={s.successBox}>{successMsg}</div>}
      {errorMsg && <div style={s.errorBox}>⚠️ {errorMsg}</div>}

      {/* BALANCE CARDS */}
      <div style={s.balanceGrid}>
        <div style={s.balanceCard}>
          <div style={s.balanceGlow} />
          <div style={s.balanceLabel}>Saldo Tersedia</div>
          <div style={s.balanceAmount}>Rp {balance.toLocaleString("id-ID")}</div>
          <div style={s.balanceSub}>Siap digunakan</div>
        </div>
        <div style={{ ...s.balanceCard, background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.05))", borderColor: "rgba(245,158,11,0.2)" }}>
          <div style={{ ...s.balanceGlow, background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)" }} />
          <div style={{ ...s.balanceLabel, color: "#f59e0b" }}>Saldo Terkunci</div>
          <div style={{ ...s.balanceAmount, fontSize: "1.8rem" }}>Rp {lockedBalance.toLocaleString("id-ID")}</div>
          <div style={{ ...s.balanceSub, color: "#f59e0b" }}>Di project aktif</div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={s.howItWorks}>
        <div style={s.howTitle}>🔄 Cara Kerja Saldo</div>
        <div style={s.howSteps}>
          {[
            { icon: "⬆️", label: "Top Up", desc: "Isi saldo via QRIS" },
            { icon: "🔒", label: "Dikunci", desc: "Saat join/buat project" },
            { icon: "✅", label: "Selesai", desc: "Saldo kembali otomatis" },
            { icon: "💸", label: "Hangus", desc: "Jika di-kick tim" },
          ].map((step, i) => (
            <div key={i} style={s.howStep}>
              <div style={s.howStepIcon}>{step.icon}</div>
              <div style={s.howStepLabel}>{step.label}</div>
              <div style={s.howStepDesc}>{step.desc}</div>
              {i < 3 && <div style={s.howArrow}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* FEE INFO */}
      <div style={s.feeInfo}>
        <div style={s.feeItem}><span style={s.feeIcon}>👑</span><div><div style={s.feeLabel}>Buat Project</div><div style={s.feeAmount}>Rp 50.000</div></div></div>
        <div style={s.feeDivider} />
        <div style={s.feeItem}><span style={s.feeIcon}>🤝</span><div><div style={s.feeLabel}>Join Project</div><div style={s.feeAmount}>Rp 25.000</div></div></div>
        <div style={s.feeDivider} />
        <div style={s.feeItem}><span style={s.feeIcon}>🔓</span><div><div style={s.feeLabel}>Refund Otomatis</div><div style={{ ...s.feeAmount, color: "#4ade80" }}>100%</div></div></div>
      </div>

      {/* TABS */}
      <div style={s.tabs}>
        {([
          { key: "topup",    label: "⬆️ Top Up"   },
          { key: "withdraw", label: "⬇️ Withdraw"  },
          { key: "history",  label: "📜 Riwayat"   },
        ] as { key: typeof activeTab; label: string }[]).map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setErrorMsg(""); }}
            style={{
              ...s.tab,
              background: activeTab === tab.key ? "rgba(99,102,241,0.15)" : "transparent",
              color: activeTab === tab.key ? "#a78bfa" : "#94a3b8",
              borderColor: activeTab === tab.key ? "rgba(99,102,241,0.4)" : "transparent",
            }}>
            {tab.label}
            {tab.key === "withdraw" && pendingWithdrawal && (
              <span style={s.pendingDot} />
            )}
          </button>
        ))}
      </div>

      {/* ── TOP UP ── */}
      {activeTab === "topup" && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Top Up via QRIS</h2>
          <p style={s.cardSub}>Pilih nominal → Generate QR → Scan pakai aplikasi apapun yang support QRIS</p>

          <div style={s.presetGrid}>
            {TOPUP_OPTIONS.map(opt => (
              <button key={opt} onClick={() => { setTopupAmount(opt); setCustomAmount(""); }}
                className="preset-btn"
                style={{
                  ...s.presetBtn,
                  background: topupAmount === opt && !customAmount ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                  borderColor: topupAmount === opt && !customAmount ? "#6366f1" : "rgba(255,255,255,0.08)",
                  color: topupAmount === opt && !customAmount ? "#a78bfa" : "#94a3b8",
                }}>
                Rp {opt.toLocaleString("id-ID")}
              </button>
            ))}
          </div>

          <div style={s.customWrap}>
            <label style={s.label}>Atau masukkan nominal lain</label>
            <div style={s.inputWrap}>
              <span style={s.inputPrefix}>Rp</span>
              <input type="number" placeholder="Minimal 10.000" value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setTopupAmount(0); }}
                style={s.input} className="wallet-input" min={10000} />
            </div>
          </div>

          <div style={s.summaryBox}>
            <div style={s.summaryRow}>
              <span style={{ color: "#94a3b8" }}>Nominal top up</span>
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Rp {selectedAmount.toLocaleString("id-ID")}</span>
            </div>
            <div style={s.summaryRow}>
              <span style={{ color: "#94a3b8" }}>Saldo setelah top up</span>
              <span style={{ fontWeight: 700, color: "#4ade80" }}>Rp {(balance + selectedAmount).toLocaleString("id-ID")}</span>
            </div>
          </div>

          <button onClick={handleGenerateQR} disabled={qrLoading || !selectedAmount}
            style={{ ...s.qrBtn, opacity: qrLoading || !selectedAmount ? 0.7 : 1 }} className="qr-btn">
            {qrLoading ? "⏳ Membuat QR Code..." : `📱 Generate QR Code — Rp ${selectedAmount.toLocaleString("id-ID")}`}
          </button>

          <div style={s.orDivider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>atau untuk demo/testing</span>
            <div style={s.dividerLine} />
          </div>

          <button onClick={handleSimulateTopUp} style={s.demoBtn} className="demo-btn">
            🧪 Simulasi Top Up (Demo)
          </button>

          <p style={s.disclaimer}>🔒 Scan dengan GoPay, OVO, Dana, ShopeePay, atau m-Banking apapun yang support QRIS.</p>
        </div>
      )}

      {/* ── WITHDRAW ── */}
      {activeTab === "withdraw" && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Tarik Saldo ⬇️</h2>
          <p style={s.cardSub}>Saldo akan ditransfer ke rekening kamu dalam 1x24 jam setelah disetujui admin</p>

          {pendingWithdrawal && (
            <div style={s.pendingBox}>
              <div style={s.pendingBoxTitle}>⏳ Ada request withdrawal yang sedang diproses</div>
              <div style={s.pendingBoxDetail}>
                <span>Rp {pendingWithdrawal.amount.toLocaleString("id-ID")}</span>
                <span>→</span>
                <span>{pendingWithdrawal.bank_name} {pendingWithdrawal.account_number}</span>
                <span>a/n {pendingWithdrawal.account_name}</span>
              </div>
              <div style={s.pendingBoxNote}>Kamu tidak bisa mengajukan request baru sebelum yang ini selesai.</div>
            </div>
          )}

          {!pendingWithdrawal && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Amount */}
              <div style={s.field}>
                <label style={s.label}>Jumlah Penarikan</label>
                <div style={s.inputWrap}>
                  <span style={s.inputPrefix}>Rp</span>
                  <input type="number" placeholder={`Maks. ${balance.toLocaleString("id-ID")}`}
                    value={wdForm.amount}
                    onChange={e => setWdForm({ ...wdForm, amount: e.target.value })}
                    style={s.input} className="wallet-input" max={balance} min={10000} />
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  {[50000, 100000, 200000].map(amt => (
                    <button key={amt} onClick={() => setWdForm({ ...wdForm, amount: String(Math.min(amt, balance)) })}
                      style={s.quickBtn} className="preset-btn">
                      Rp {(amt / 1000).toFixed(0)}rb
                    </button>
                  ))}
                  <button onClick={() => setWdForm({ ...wdForm, amount: String(balance) })}
                    style={{ ...s.quickBtn, color: "#4ade80", borderColor: "rgba(74,222,128,0.3)" }} className="preset-btn">
                    Semua
                  </button>
                </div>
              </div>

              {/* Bank */}
              <div style={s.field}>
                <label style={s.label}>Bank / E-Wallet</label>
                <select value={wdForm.bank_name} onChange={e => setWdForm({ ...wdForm, bank_name: e.target.value })}
                  style={s.select} className="wallet-input">
                  <option value="">— Pilih bank —</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Account number */}
              <div style={s.field}>
                <label style={s.label}>Nomor Rekening / Akun</label>
                <input type="text" placeholder="Contoh: 1234567890"
                  value={wdForm.account_number}
                  onChange={e => setWdForm({ ...wdForm, account_number: e.target.value })}
                  style={{ ...s.input, border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "13px 16px" }}
                  className="wallet-input" />
              </div>

              {/* Account name */}
              <div style={s.field}>
                <label style={s.label}>Nama Pemilik Rekening</label>
                <input type="text" placeholder="Nama sesuai rekening"
                  value={wdForm.account_name}
                  onChange={e => setWdForm({ ...wdForm, account_name: e.target.value })}
                  style={{ ...s.input, border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "13px 16px" }}
                  className="wallet-input" />
              </div>

              {/* Summary */}
              {wdForm.amount && parseInt(wdForm.amount) > 0 && (
                <div style={s.summaryBox}>
                  <div style={s.summaryRow}>
                    <span style={{ color: "#94a3b8" }}>Jumlah tarik</span>
                    <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Rp {parseInt(wdForm.amount).toLocaleString("id-ID")}</span>
                  </div>
                  <div style={s.summaryRow}>
                    <span style={{ color: "#94a3b8" }}>Sisa saldo</span>
                    <span style={{ fontWeight: 700, color: parseInt(wdForm.amount) > balance ? "#f87171" : "#4ade80" }}>
                      Rp {Math.max(0, balance - parseInt(wdForm.amount || "0")).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}

              <button onClick={handleWithdrawRequest} disabled={wdLoading}
                style={{ ...s.wdBtn, opacity: wdLoading ? 0.7 : 1 }} className="wd-btn">
                {wdLoading ? "Memproses..." : "⬇️ Ajukan Withdrawal"}
              </button>

              <p style={s.disclaimer}>⏱️ Diproses admin dalam 1x24 jam. Saldo langsung dikurangi saat request dikirim.</p>
            </div>
          )}

          {/* Riwayat withdrawal */}
          {withdrawals.length > 0 && (
            <div style={{ marginTop: "32px" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "12px" }}>Riwayat Withdrawal</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {withdrawals.map(wd => (
                  <div key={wd.id} style={s.wdRow}>
                    <div style={s.wdLeft}>
                      <div style={s.wdBank}>🏦 {wd.bank_name}</div>
                      <div style={s.wdDetail}>{wd.account_number} · a/n {wd.account_name}</div>
                      <div style={s.wdDate}>{new Date(wd.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                      {wd.admin_note && <div style={s.wdNote}>📝 {wd.admin_note}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <span style={{ fontWeight: 800, color: "#f87171" }}>-Rp {wd.amount.toLocaleString("id-ID")}</span>
                      <WdStatus status={wd.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === "history" && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Riwayat Transaksi</h2>
          {transactions.length === 0 ? (
            <div style={s.emptyHistory}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📭</div>
              <p style={{ color: "#94a3b8" }}>Belum ada transaksi</p>
            </div>
          ) : (
            <div style={s.txList}>
              {transactions.map(tx => <TxRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </div>
      )}

      {/* ── QR MODAL ── */}
      {showQrModal && qrUrl && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) handleCloseQrModal(); }}>
          <div style={s.qrModal}>
            <div style={s.qrModalHeader}>
              <h2 style={s.qrModalTitle}>📱 Scan & Bayar</h2>
              <button onClick={handleCloseQrModal} style={s.closeBtn}>×</button>
            </div>
            <div style={s.qrModalBody}>
              <div style={s.qrAmountBadge}>Rp {qrAmount.toLocaleString("id-ID")}</div>
              <div style={s.qrImageWrap}>
                <img src={qrUrl} alt="QR Code" style={s.qrImage} />
              </div>
              {paymentStatus === "waiting" ? (
                <div style={s.waitingBox}>
                  <div style={s.pulsingDot} />
                  <span style={{ color: "#94a3b8", fontSize: "0.88rem" }}>Menunggu pembayaran... terdeteksi otomatis</span>
                </div>
              ) : (
                <div style={s.paidBox}>✅ Pembayaran terdeteksi! Saldo diperbarui...</div>
              )}
              <div style={s.qrInstructions}>
                {["Buka aplikasi pembayaran kamu", "Pilih Scan QR / QRIS", "Arahkan ke QR di atas", "Konfirmasi pembayaran", "Saldo otomatis bertambah ✨"].map((step, i) => (
                  <div key={i} style={s.qrStep}>
                    <span style={s.qrStepNum}>{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <div style={s.appsList}>
                {["GoPay", "OVO", "Dana", "ShopeePay", "m-BCA", "m-Banking"].map(app => (
                  <span key={app} style={s.appBadge}>{app}</span>
                ))}
              </div>
            </div>
            <div style={s.qrModalFooter}>
              <button onClick={handleCloseQrModal} style={s.cancelBtn}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WdStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: "⏳ Menunggu",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    approved: { label: "✅ Disetujui", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    rejected: { label: "❌ Ditolak",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  };
  const c = map[status] || map.pending;
  return <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: c.bg, color: c.color }}>{c.label}</span>;
}

function TxRow({ tx }: { tx: Transaction }) {
  const config: Record<string, { label: string; sign: string; color: string; icon: string }> = {
    topup:    { label: "Top Up",                  sign: "+", color: "#4ade80", icon: "⬆️" },
    lock:     { label: "Commitment Dikunci",       sign: "-", color: "#f59e0b", icon: "🔒" },
    unlock:   { label: "Commitment Dikembalikan",  sign: "+", color: "#4ade80", icon: "🔓" },
    withdraw: { label: "Withdraw",                 sign: "-", color: "#f87171", icon: "⬇️" },
    forfeit:  { label: "Dana Hangus (Kick)",       sign: "-", color: "#f87171", icon: "💸" },
  };
  const c = config[tx.type] || config.topup;
  return (
    <div style={s.txRow}>
      <div style={s.txLeft}>
        <div style={s.txIcon}>{c.icon}</div>
        <div>
          <div style={s.txLabel}>{c.label}</div>
          {tx.projects?.title && <div style={s.txProject}>📋 {tx.projects.title}</div>}
          <div style={s.txDate}>{new Date(tx.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>
      <div style={{ ...s.txAmount, color: c.color }}>{c.sign}Rp {tx.amount.toLocaleString("id-ID")}</div>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .preset-btn:hover { border-color: #6366f1 !important; color: #a78bfa !important; }
  .wallet-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .qr-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5) !important; }
  .qr-btn:disabled { cursor: not-allowed; }
  .demo-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .wd-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .wd-btn:disabled { cursor: not-allowed; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "680px", margin: "0 auto", fontFamily: "'Inter', sans-serif" },
  pageTitle: { fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.5px", margin: "0 0 8px" },
  pageSub: { color: "#94a3b8", marginBottom: "28px", fontSize: "0.95rem" },
  successBox: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", fontWeight: 600, fontSize: "0.9rem" },
  errorBox: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.9rem" },
  balanceGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  balanceCard: { position: "relative", background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.08))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "20px", padding: "24px", overflow: "hidden" },
  balanceGlow: { position: "absolute", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", top: "-40px", right: "-40px", pointerEvents: "none" },
  balanceLabel: { fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" },
  balanceAmount: { fontSize: "1.6rem", fontWeight: 900, color: "#e2e8f0", letterSpacing: "-0.5px", marginBottom: "6px", position: "relative", zIndex: 1 },
  balanceSub: { fontSize: "0.78rem", color: "#6366f1", fontWeight: 600 },
  howItWorks: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "20px", marginBottom: "16px" },
  howTitle: { fontSize: "0.88rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "16px" },
  howSteps: { display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" },
  howStep: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flex: 1, position: "relative", minWidth: "60px" },
  howStepIcon: { fontSize: "1.4rem" },
  howStepLabel: { fontSize: "0.78rem", fontWeight: 700, color: "#e2e8f0" },
  howStepDesc: { fontSize: "0.68rem", color: "#64748b", textAlign: "center" },
  howArrow: { position: "absolute", right: "-10px", top: "12px", color: "#334155", fontSize: "1rem", fontWeight: 700 },
  feeInfo: { display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "16px 20px", marginBottom: "24px", gap: "16px", alignItems: "center" },
  feeItem: { display: "flex", alignItems: "center", gap: "10px", flex: 1 },
  feeIcon: { fontSize: "1.3rem" },
  feeLabel: { fontSize: "0.75rem", color: "#64748b", fontWeight: 500 },
  feeAmount: { fontSize: "0.9rem", fontWeight: 800, color: "#e2e8f0" },
  feeDivider: { width: "1px", height: "36px", background: "rgba(255,255,255,0.06)" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: { padding: "10px 20px", borderRadius: "50px", border: "1px solid", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter', sans-serif", position: "relative" },
  pendingDot: { position: "absolute", top: "6px", right: "6px", width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "32px" },
  cardTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "8px", marginTop: 0 },
  cardSub: { color: "#94a3b8", fontSize: "0.9rem", marginBottom: "28px" },
  presetGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" },
  presetBtn: { border: "1px solid", borderRadius: "12px", padding: "16px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter', sans-serif" },
  customWrap: { marginBottom: "24px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0" },
  inputWrap: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden" },
  inputPrefix: { padding: "14px 16px", color: "#64748b", fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.08)", fontSize: "0.95rem" },
  input: { flex: 1, background: "transparent", border: "none", padding: "14px 16px", fontSize: "0.95rem", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" },
  select: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "13px 16px", fontSize: "0.95rem", color: "#e2e8f0", fontFamily: "'Inter', sans-serif", cursor: "pointer" },
  quickBtn: { border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 12px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter', sans-serif", background: "rgba(255,255,255,0.04)", color: "#94a3b8" },
  summaryBox: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "20px", marginBottom: "4px", display: "flex", flexDirection: "column", gap: "12px" },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.92rem" },
  qrBtn: { width: "100%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: "50px", padding: "16px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 8px 32px rgba(99,102,241,0.4)", fontFamily: "'Inter', sans-serif" },
  orDivider: { display: "flex", alignItems: "center", gap: "16px", margin: "20px 0" },
  dividerLine: { flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" },
  dividerText: { fontSize: "0.8rem", color: "#475569", whiteSpace: "nowrap" },
  demoBtn: { width: "100%", background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50px", padding: "14px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", transition: "background 0.2s", fontFamily: "'Inter', sans-serif" },
  wdBtn: { width: "100%", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", border: "none", borderRadius: "50px", padding: "16px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", transition: "transform 0.2s", boxShadow: "0 8px 32px rgba(239,68,68,0.3)", fontFamily: "'Inter', sans-serif" },
  pendingBox: { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "14px", padding: "20px", marginBottom: "8px" },
  pendingBoxTitle: { fontSize: "0.95rem", fontWeight: 700, color: "#f59e0b", marginBottom: "10px" },
  pendingBoxDetail: { display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.88rem", color: "#e2e8f0", marginBottom: "8px" },
  pendingBoxNote: { fontSize: "0.8rem", color: "#94a3b8" },
  wdRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" },
  wdLeft: { display: "flex", flexDirection: "column", gap: "3px" },
  wdBank: { fontSize: "0.92rem", fontWeight: 600, color: "#e2e8f0" },
  wdDetail: { fontSize: "0.8rem", color: "#94a3b8" },
  wdDate: { fontSize: "0.75rem", color: "#64748b" },
  wdNote: { fontSize: "0.78rem", color: "#f59e0b", marginTop: "4px" },
  disclaimer: { textAlign: "center", color: "#64748b", fontSize: "0.82rem", marginTop: "4px", lineHeight: 1.6 },
  emptyHistory: { textAlign: "center", padding: "48px 24px" },
  txList: { display: "flex", flexDirection: "column", gap: "12px" },
  txRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" },
  txLeft: { display: "flex", alignItems: "center", gap: "14px" },
  txIcon: { fontSize: "1.5rem", width: "40px", textAlign: "center" },
  txLabel: { fontSize: "0.92rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "3px" },
  txProject: { fontSize: "0.8rem", color: "#94a3b8", marginBottom: "3px" },
  txDate: { fontSize: "0.78rem", color: "#64748b" },
  txAmount: { fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.3px" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" },
  qrModal: { background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", width: "100%", maxWidth: "400px", overflow: "hidden" },
  qrModalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  qrModalTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0", margin: 0 },
  closeBtn: { background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" },
  qrModalBody: { padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" },
  qrAmountBadge: { background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(167,139,250,0.1))", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa", padding: "10px 28px", borderRadius: "50px", fontSize: "1.3rem", fontWeight: 800 },
  qrImageWrap: { background: "#fff", borderRadius: "16px", padding: "16px" },
  qrImage: { width: "200px", height: "200px", display: "block" },
  waitingBox: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "10px", padding: "10px 16px", width: "100%" },
  pulsingDot: { width: "10px", height: "10px", borderRadius: "50%", background: "#6366f1", animation: "pulse 1.5s infinite", flexShrink: 0 },
  paidBox: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", borderRadius: "10px", padding: "10px 16px", fontWeight: 600, fontSize: "0.88rem", width: "100%", textAlign: "center" },
  qrInstructions: { width: "100%", display: "flex", flexDirection: "column", gap: "8px" },
  qrStep: { display: "flex", alignItems: "center", gap: "12px", fontSize: "0.85rem", color: "#94a3b8" },
  qrStepNum: { width: "22px", height: "22px", borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0 },
  appsList: { display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" },
  appBadge: { fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "50px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" },
  qrModalFooter: { padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  cancelBtn: { width: "100%", background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: "50px", padding: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
};
