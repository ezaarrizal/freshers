import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ALL_ROLES = [
  "Frontend Developer","Backend Developer","UI/UX Designer","Project Manager",
  "Mobile Developer","AI/ML Engineer","DevOps Engineer","Data Analyst",
  "QA Engineer","Technical Writer","Graphic Designer",
  "Social Media Specialist","Video Editor","Content Writer","Product Owner",
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    bio: "",
    portfolio_url: "",
    role_tags: [] as string[],
  });

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      role_tags: prev.role_tags.includes(role)
        ? prev.role_tags.filter(r => r !== role)
        : prev.role_tags.length < 3
          ? [...prev.role_tags, role]
          : prev.role_tags,
    }));
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          bio: form.bio,
          portfolio_url: form.portfolio_url,
          role_tags: form.role_tags,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>
      <div style={styles.glow} />

      <div style={styles.card}>
        <Link to="/" style={styles.logoWrap}>
          <span style={styles.logoMain}>fresh</span>
          <span style={styles.logoAccent}>ers</span>
        </Link>

        {/* Progress */}
        <div style={styles.progressWrap}>
          {[1,2].map(s => (
            <div key={s} style={{
              ...styles.progressDot,
              background: step >= s ? "#6366f1" : "rgba(255,255,255,0.1)",
              transform: step === s ? "scale(1.2)" : "scale(1)",
            }} />
          ))}
        </div>

        {step === 1 ? (
          <>
            <h1 style={styles.title}>Buat Akun Freshers 🚀</h1>
            <p style={styles.subtitle}>Step 1 dari 2 — Info dasar kamu</p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Nama Lengkap</label>
                <input className="auth-input" style={styles.input} placeholder="John Doe"
                  value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input className="auth-input" style={styles.input} type="email" placeholder="kamu@email.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input className="auth-input" style={styles.input} type="password" placeholder="Min. 8 karakter"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Bio Singkat</label>
                <textarea className="auth-input" style={{...styles.input, resize:"none", height:"80px"}}
                  placeholder="Ceritain dirimu singkat..."
                  value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Link Portfolio <span style={{color:"#64748b"}}>(opsional)</span></label>
                <input className="auth-input" style={styles.input} placeholder="github.com/username"
                  value={form.portfolio_url} onChange={e => setForm({...form, portfolio_url: e.target.value})} />
              </div>

              <button className="auth-btn" style={styles.submitBtn}
                onClick={() => {
                  if (!form.full_name || !form.email || !form.password) {
                    setError("Nama, email, dan password wajib diisi!");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}>
                Lanjut →
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Pilih Role Kamu 🎯</h1>
            <p style={styles.subtitle}>Step 2 dari 2 — Pilih maksimal 3 role</p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.rolesGrid}>
              {ALL_ROLES.map(role => {
                const selected = form.role_tags.includes(role);
                return (
                  <button key={role} onClick={() => toggleRole(role)}
                    style={{
                      ...styles.rolePill,
                      background: selected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                      borderColor: selected ? "#6366f1" : "rgba(255,255,255,0.08)",
                      color: selected ? "#a78bfa" : "#94a3b8",
                    }}>
                    {selected ? "✓ " : ""}{role}
                  </button>
                );
              })}
            </div>

            <p style={{ textAlign:"center", color:"#64748b", fontSize:"0.82rem", margin:"16px 0" }}>
              {form.role_tags.length}/3 role dipilih
            </p>

            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={() => setStep(1)}
                style={{...styles.submitBtn, background:"rgba(255,255,255,0.06)", flex:1, boxShadow:"none"}}>
                ← Kembali
              </button>
              <button className="auth-btn"
                style={{...styles.submitBtn, flex:2, opacity: loading ? 0.7 : 1}}
                disabled={loading || form.role_tags.length === 0}
                onClick={handleRegister}>
                {loading ? "Mendaftar..." : "Daftar Sekarang 🚀"}
              </button>
            </div>
          </>
        )}

        <p style={styles.switchText}>
          Sudah punya akun?{" "}
          <Link to="/login" style={styles.switchLink}>Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .auth-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .auth-btn:hover:not(:disabled) { transform: translateY(-2px); }
  .auth-btn:disabled { cursor: not-allowed; }
`;

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight:"100vh", background:"#0f0f1a", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", fontFamily:"'Inter',sans-serif", position:"relative", overflow:"hidden" },
  glow: { position:"absolute", width:"600px", height:"600px", background:"radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" },
  card: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"24px", padding:"48px 40px", width:"100%", maxWidth:"480px", position:"relative", zIndex:1 },
  logoWrap: { display:"block", textDecoration:"none", marginBottom:"24px", textAlign:"center" },
  logoMain: { fontSize:"1.8rem", fontWeight:800, background:"linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  logoAccent: { fontSize:"1.8rem", fontWeight:800, background:"linear-gradient(135deg,#f59e0b,#f97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  progressWrap: { display:"flex", justifyContent:"center", gap:"8px", marginBottom:"28px" },
  progressDot: { width:"10px", height:"10px", borderRadius:"50%", transition:"all 0.3s" },
  title: { fontSize:"1.6rem", fontWeight:800, color:"#e2e8f0", marginBottom:"8px", textAlign:"center", letterSpacing:"-0.5px" },
  subtitle: { fontSize:"0.95rem", color:"#94a3b8", textAlign:"center", marginBottom:"28px" },
  errorBox: { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", padding:"12px 16px", borderRadius:"12px", fontSize:"0.9rem", marginBottom:"20px", textAlign:"center" },
  form: { display:"flex", flexDirection:"column", gap:"18px" },
  field: { display:"flex", flexDirection:"column", gap:"8px" },
  label: { fontSize:"0.9rem", fontWeight:600, color:"#e2e8f0" },
  input: { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", padding:"14px 16px", fontSize:"0.95rem", color:"#e2e8f0", transition:"border-color 0.2s, box-shadow 0.2s", width:"100%", fontFamily:"'Inter',sans-serif" },
  rolesGrid: { display:"flex", flexWrap:"wrap", gap:"10px", justifyContent:"center", marginBottom:"8px" },
  rolePill: { border:"1px solid", borderRadius:"50px", padding:"8px 18px", fontSize:"0.85rem", fontWeight:600, cursor:"pointer", transition:"all 0.2s", fontFamily:"'Inter',sans-serif" },
  submitBtn: { background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff", border:"none", borderRadius:"50px", padding:"16px", fontSize:"1rem", fontWeight:700, cursor:"pointer", transition:"transform 0.2s, box-shadow 0.2s", boxShadow:"0 8px 32px rgba(99,102,241,0.4)", marginTop:"8px", width:"100%" },
  switchText: { textAlign:"center", color:"#94a3b8", fontSize:"0.9rem", marginTop:"24px" },
  switchLink: { color:"#a78bfa", textDecoration:"none", fontWeight:600 },
};