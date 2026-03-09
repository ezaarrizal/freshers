import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

const ALL_ROLES = [
  "Frontend Developer","Backend Developer","UI/UX Designer","Project Manager",
  "Mobile Developer","AI/ML Engineer","DevOps Engineer","Data Analyst",
  "QA Engineer","Technical Writer","Graphic Designer","Social Media Specialist",
  "Video Editor","Content Writer","Product Owner",
];

const DURATION_OPTIONS = ["1 Minggu","2 Minggu","1 Bulan","2 Bulan","3 Bulan","6 Bulan"];

const CREATOR_FEE = 50000;

interface RoleSlot {
  name: string;
  slot: number;
}

export default function CreateProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    tech_stack: [] as string[],
    techInput: "",
    estimated_duration: "",
    roles: [] as RoleSlot[],
  });

  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user!.id)
      .single();
    setBalance(data?.wallet_balance || 0);
  };

  const addTech = () => {
    const t = form.techInput.trim();
    if (t && !form.tech_stack.includes(t)) {
      setForm(prev => ({ ...prev, tech_stack: [...prev.tech_stack, t], techInput: "" }));
    }
  };

  const removeTech = (t: string) => {
    setForm(prev => ({ ...prev, tech_stack: prev.tech_stack.filter(x => x !== t) }));
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.find(r => r.name === role)
        ? prev.roles.filter(r => r.name !== role)
        : [...prev.roles, { name: role, slot: 1 }],
    }));
  };

  const updateSlot = (roleName: string, slot: number) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.map(r => r.name === roleName ? { ...r, slot } : r),
    }));
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!form.title || !form.description) { setError("Judul dan deskripsi wajib diisi!"); return; }
      setError(""); setStep(2);
    } else if (step === 2) {
      if (form.roles.length === 0) { setError("Pilih minimal 1 role!"); return; }
      setError("");
      await fetchBalance();
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (balance !== null && balance < CREATOR_FEE) {
      setError(`Saldo tidak cukup! Kamu butuh minimal Rp ${CREATOR_FEE.toLocaleString("id-ID")}`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Buat project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: form.title,
          description: form.description,
          tech_stack: form.tech_stack,
          estimated_duration: form.estimated_duration,
          creator_id: user!.id,
          status: "open",
          creator_fee: CREATOR_FEE,
          member_fee: 25000,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Insert roles — expand berdasarkan slot count
      const rolesPayload = form.roles.flatMap(role =>
        Array.from({ length: role.slot }, (_, i) => ({
          project_id: project.id,
          role_name: role.name,
          slot_count: role.slot,
          slot_index: i + 1,
          is_filled: false,
        }))
      );
      await supabase.from("project_roles").insert(rolesPayload);

      // 3. Potong saldo creator
      await supabase
        .from("profiles")
        .update({ wallet_balance: (balance || 0) - CREATOR_FEE })
        .eq("id", user!.id);

      // 4. Catat transaksi
      await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "lock",
        amount: CREATOR_FEE,
        project_id: project.id,
      });

      navigate(`/dashboard/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan. Coba lagi!");
      setLoading(false);
    }
  };

  const totalPeople = form.roles.reduce((acc, r) => acc + r.slot, 0);

  return (
    <div style={s.page}>
      <style>{css}</style>

      <Link to="/dashboard/projects" style={s.backBtn}>← Kembali</Link>

      <h1 style={s.title}>Buat Project Baru ➕</h1>
      <p style={s.sub}>Ceritain ideamu dan cari tim yang tepat</p>

      {/* Progress Steps */}
      <div style={s.stepsBar}>
        {["Info Project","Role & Tim","Konfirmasi"].map((label, i) => {
          const num = i + 1;
          const active = step === num;
          const done = step > num;
          return (
            <div key={label} style={s.stepItem}>
              <div style={{
                ...s.stepCircle,
                background: done ? "#6366f1" : active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                borderColor: done || active ? "#6366f1" : "rgba(255,255,255,0.1)",
                color: done ? "#fff" : active ? "#a78bfa" : "#64748b",
              }}>
                {done ? "✓" : num}
              </div>
              <span style={{ fontSize: "0.82rem", color: active ? "#a78bfa" : "#64748b", fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {error && <div style={s.errorBox}>⚠️ {error}</div>}

      <div style={s.card}>

        {/* ── STEP 1 — Info ── */}
        {step === 1 && (
          <div style={s.formBody}>
            <h2 style={s.cardTitle}>Info Project</h2>

            <Field label="Judul Project *">
              <input className="cp-input" style={s.input}
                placeholder="contoh: E-Commerce UMKM Local"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </Field>

            <Field label="Deskripsi *">
              <textarea className="cp-input" style={{ ...s.input, height: "120px", resize: "none" }}
                placeholder="Jelaskan ide project kamu, tujuan, dan apa yang ingin dicapai..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </Field>

            <Field label="Tech Stack / Tools">
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input className="cp-input" style={{ ...s.input, flex: 1 }}
                  placeholder="Tambah tech (contoh: React, Figma...)"
                  value={form.techInput}
                  onChange={e => setForm({ ...form, techInput: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addTech()} />
                <button onClick={addTech} style={s.addBtn} className="add-btn">+ Tambah</button>
              </div>
              {form.tech_stack.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {form.tech_stack.map(t => (
                    <span key={t} style={s.techChip}>
                      {t}
                      <button onClick={() => removeTech(t)} style={s.chipRemove}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Estimasi Durasi">
              <div style={s.durationGrid}>
                {DURATION_OPTIONS.map(d => (
                  <button key={d} onClick={() => setForm({ ...form, estimated_duration: d })}
                    style={{
                      ...s.durationBtn,
                      background: form.estimated_duration === d ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                      borderColor: form.estimated_duration === d ? "#6366f1" : "rgba(255,255,255,0.08)",
                      color: form.estimated_duration === d ? "#a78bfa" : "#94a3b8",
                    }} className="duration-btn">
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* ── STEP 2 — Roles ── */}
        {step === 2 && (
          <div style={s.formBody}>
            <h2 style={s.cardTitle}>Role yang Dibutuhkan</h2>
            <p style={s.cardSub}>Pilih role lalu tentukan berapa orang yang dibutuhkan</p>

            {/* Role Selection Grid */}
            <div style={s.rolesGrid}>
              {ALL_ROLES.map(role => {
                const selected = form.roles.find(r => r.name === role);
                return (
                  <button key={role} onClick={() => toggleRole(role)}
                    style={{
                      ...s.roleBtn,
                      background: selected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                      borderColor: selected ? "#6366f1" : "rgba(255,255,255,0.08)",
                      color: selected ? "#a78bfa" : "#94a3b8",
                    }} className="role-btn">
                    {selected ? "✓ " : ""}{role}
                  </button>
                );
              })}
            </div>

            {/* Slot Count per Role */}
            {form.roles.length > 0 && (
              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0" }}>
                  Berapa orang dibutuhkan per role?
                </label>
                {form.roles.map(role => (
                  <div key={role.name} style={s.slotRow}>
                    <span style={s.slotRoleName}>{role.name}</span>
                    <div style={s.slotControls}>
                      <button
                        onClick={() => updateSlot(role.name, Math.max(1, role.slot - 1))}
                        style={s.slotBtn}>−
                      </button>
                      <span style={s.slotNum}>{role.slot}</span>
                      <button
                        onClick={() => updateSlot(role.name, Math.min(10, role.slot + 1))}
                        style={s.slotBtn}>+
                      </button>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>orang</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", marginTop: "16px" }}>
              {form.roles.length} role dipilih • {totalPeople} orang total
            </p>
          </div>
        )}

        {/* ── STEP 3 — Konfirmasi ── */}
        {step === 3 && (
          <div style={s.formBody}>
            <h2 style={s.cardTitle}>Konfirmasi & Bayar</h2>
            <p style={s.cardSub}>Review project kamu sebelum dipublish</p>

            {/* Summary */}
            <div style={s.summaryCard}>
              <SummaryRow label="Judul" value={form.title} />
              <SummaryRow label="Durasi" value={form.estimated_duration || "Tidak ditentukan"} />
              <SummaryRow label="Tech Stack" value={form.tech_stack.join(", ") || "-"} />
              <SummaryRow label="Total Role" value={`${form.roles.length} role`} />
              <SummaryRow label="Total Anggota" value={`${totalPeople} orang`} />
              <div style={s.summaryDivider} />
              <div style={s.summaryRoles}>
                {form.roles.map(r => (
                  <span key={r.name} style={s.summaryRole}>
                    {r.name} ×{r.slot}
                  </span>
                ))}
              </div>
            </div>

            {/* Fee Box */}
            <div style={s.feeBox}>
              <div style={s.feeRow}>
                <span style={{ color: "#94a3b8" }}>Commitment Fee (Creator)</span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>Rp {CREATOR_FEE.toLocaleString("id-ID")}</span>
              </div>
              <div style={s.feeRow}>
                <span style={{ color: "#94a3b8" }}>Saldo Wallet</span>
                <span style={{ color: balance !== null && balance >= CREATOR_FEE ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                  Rp {(balance || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div style={s.summaryDivider} />
              <div style={s.feeRow}>
                <span style={{ color: "#94a3b8" }}>Sisa Saldo</span>
                <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: "1.1rem" }}>
                  Rp {Math.max(0, (balance || 0) - CREATOR_FEE).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {balance !== null && balance < CREATOR_FEE && (
              <div style={s.insufficientBox}>
                ⚠️ Saldo tidak cukup!{" "}
                <Link to="/dashboard/wallet" style={{ color: "#f59e0b", fontWeight: 700 }}>
                  Top Up sekarang →
                </Link>
              </div>
            )}

            <p style={{ color: "#64748b", fontSize: "0.82rem", textAlign: "center", lineHeight: 1.6 }}>
              🔒 Dana akan dikunci dan dikembalikan otomatis saat project selesai
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={s.btnRow}>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} style={s.backBtnCard}>
              ← Kembali
            </button>
          )}
          {step < 3 ? (
            <button onClick={handleNext} style={s.nextBtn} className="next-btn">
              Lanjut →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || (balance !== null && balance < CREATOR_FEE)}
              style={{ ...s.nextBtn, opacity: loading || (balance !== null && balance < CREATOR_FEE) ? 0.6 : 1 }}
              className="next-btn">
              {loading ? "Membuat Project..." : "🚀 Publish Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "10px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "12px" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .cp-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .add-btn:hover { background: #4f46e5 !important; }
  .duration-btn:hover { border-color: rgba(99,102,241,0.4) !important; color: #e2e8f0 !important; }
  .role-btn:hover { border-color: rgba(99,102,241,0.4) !important; color: #e2e8f0 !important; }
  .next-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5) !important; }
  .next-btn:disabled { cursor: not-allowed; }
`;

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: "680px", margin: "0 auto", fontFamily: "'Inter',sans-serif" },
  backBtn: { display: "inline-block", color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem", marginBottom: "20px", fontWeight: 500 },
  title: { fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px", letterSpacing: "-0.5px" },
  sub: { color: "#94a3b8", fontSize: "0.95rem", marginBottom: "32px" },
  stepsBar: { display: "flex", gap: "8px", marginBottom: "28px", justifyContent: "center" },
  stepItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flex: 1 },
  stepCircle: { width: "36px", height: "36px", borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, transition: "all 0.3s" },
  errorBox: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.9rem" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "32px" },
  formBody: { marginBottom: "24px" },
  cardTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "8px", marginTop: 0 },
  cardSub: { color: "#94a3b8", fontSize: "0.9rem", marginBottom: "24px" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "13px 16px", fontSize: "0.95rem", color: "#e2e8f0", fontFamily: "'Inter',sans-serif", transition: "border-color 0.2s" },
  addBtn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: "10px", padding: "0 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem", fontFamily: "'Inter',sans-serif", transition: "background 0.2s", whiteSpace: "nowrap" },
  techChip: { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa", padding: "4px 12px", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 600 },
  chipRemove: { background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" },
  durationGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" },
  durationBtn: { border: "1px solid", borderRadius: "10px", padding: "10px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif" },
  rolesGrid: { display: "flex", flexWrap: "wrap", gap: "10px" },
  roleBtn: { border: "1px solid", borderRadius: "50px", padding: "8px 18px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter',sans-serif" },
  slotRow: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", padding: "12px 16px" },
  slotRoleName: { color: "#a78bfa", fontWeight: 600, fontSize: "0.9rem" },
  slotControls: { display: "flex", alignItems: "center", gap: "12px" },
  slotBtn: { width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 700 },
  slotNum: { color: "#e2e8f0", fontWeight: 700, minWidth: "20px", textAlign: "center", fontSize: "1rem" },
  summaryCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "20px", marginBottom: "16px" },
  summaryDivider: { height: "1px", background: "rgba(255,255,255,0.06)", margin: "16px 0" },
  summaryRoles: { display: "flex", flexWrap: "wrap", gap: "8px" },
  summaryRole: { fontSize: "0.78rem", fontWeight: 600, padding: "4px 12px", borderRadius: "50px", background: "rgba(99,102,241,0.12)", color: "#a78bfa" },
  feeBox: { background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(167,139,250,0.05))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "14px", padding: "20px", marginBottom: "16px" },
  feeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.92rem", marginBottom: "12px" },
  insufficientBox: { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "14px 20px", borderRadius: "12px", marginBottom: "16px", fontSize: "0.9rem", textAlign: "center" },
  btnRow: { display: "flex", gap: "12px", justifyContent: "flex-end" },
  backBtnCard: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50px", padding: "12px 24px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", fontFamily: "'Inter',sans-serif" },
  nextBtn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: "50px", padding: "12px 32px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", fontFamily: "'Inter',sans-serif", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" },
};
