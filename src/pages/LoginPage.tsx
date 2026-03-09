import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email atau password salah. Coba lagi ya!");
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>

      {/* Background glow */}
      <div style={styles.glow} />

      {/* Card */}
      <div style={styles.card}>
        {/* Logo */}
        <Link to="/" style={styles.logoWrap}>
          <span style={styles.logoMain}>fresh</span>
          <span style={styles.logoAccent}>ers</span>
        </Link>

        <h1 style={styles.title}>Selamat Datang Kembali 👋</h1>
        <p style={styles.subtitle}>Masuk ke akun Freshers kamu</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="kamu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
              className="auth-input"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={styles.input}
              className="auth-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            className="auth-btn"
          >
            {loading ? "Masuk..." : "Masuk →"}
          </button>
        </form>

        <p style={styles.switchText}>
          Belum punya akun?{" "}
          <Link to="/register" style={styles.switchLink}>Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
}

const css = `
  .auth-input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5) !important; }
  .auth-btn:disabled { cursor: not-allowed; }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f0f1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "'Inter', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: "600px", height: "600px",
    background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
    top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "24px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "440px",
    position: "relative",
    zIndex: 1,
  },
  logoWrap: {
    display: "block",
    textDecoration: "none",
    marginBottom: "32px",
    textAlign: "center",
  },
  logoMain: {
    fontSize: "1.8rem", fontWeight: 800,
    background: "linear-gradient(135deg, #6366f1, #a78bfa)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  logoAccent: {
    fontSize: "1.8rem", fontWeight: 800,
    background: "linear-gradient(135deg, #f59e0b, #f97316)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  title: {
    fontSize: "1.6rem", fontWeight: 800,
    color: "#e2e8f0", marginBottom: "8px",
    textAlign: "center", letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "0.95rem", color: "#94a3b8",
    textAlign: "center", marginBottom: "32px",
  },
  errorBox: {
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#f87171",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "0.9rem",
    marginBottom: "20px",
    textAlign: "center",
  },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0" },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "0.95rem",
    color: "#e2e8f0",
    transition: "border-color 0.2s, box-shadow 0.2s",
    width: "100%",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#fff",
    border: "none",
    borderRadius: "50px",
    padding: "16px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
    marginTop: "8px",
  },
  switchText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "0.9rem",
    marginTop: "24px",
  },
  switchLink: {
    color: "#a78bfa",
    textDecoration: "none",
    fontWeight: 600,
  },
};