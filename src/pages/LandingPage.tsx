import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#0f0f1a", color: "#e2e8f0", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        :root {
          --primary: #6366f1; --primary-dark: #4f46e5;
          --dark: #0f0f1a; --dark-2: #1a1a2e;
          --text: #e2e8f0; --text-muted: #94a3b8;
          --card-bg: rgba(255,255,255,0.04);
          --card-border: rgba(255,255,255,0.08);
          --radius: 16px;
        }
        .nav-link { color: #94a3b8; text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #e2e8f0; }
        .nav-cta { background: #6366f1; color: #fff !important; padding: 10px 22px; border-radius: 50px; font-weight: 600; }
        .nav-cta:hover { background: #4f46e5; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .badge-dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; animation: pulse 2s infinite; }
        .gradient-text { background: linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #f59e0b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .logo-text { background: linear-gradient(135deg, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .logo-accent { background: linear-gradient(135deg, #f59e0b, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .stat-num { background: linear-gradient(135deg, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; padding: 16px 36px; border-radius: 50px; font-size: 1rem; font-weight: 700; text-decoration: none; border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 8px 32px rgba(99,102,241,0.4); display: inline-block; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.55); }
        .btn-secondary { background: transparent; color: #e2e8f0; padding: 16px 36px; border-radius: 50px; font-size: 1rem; font-weight: 600; text-decoration: none; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: border-color 0.2s, background 0.2s; display: inline-block; }
        .btn-secondary:hover { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.05); }
        .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; transition: border-color 0.3s, transform 0.3s; }
        .card:hover { border-color: rgba(99,102,241,0.4); transform: translateY(-4px); }
        .role-pill { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 50px; padding: 10px 22px; font-size: 0.9rem; font-weight: 600; transition: border-color 0.3s, background 0.3s; }
        .role-pill:hover { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.08); }
        .feature-tag { display: inline-block; margin-top: 16px; background: rgba(99,102,241,0.12); color: #a78bfa; font-size: 0.75rem; font-weight: 600; padding: 4px 12px; border-radius: 50px; }
        .join-btn { background: #6366f1; color: #fff; border: none; padding: 8px 18px; border-radius: 50px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .join-btn:hover { background: #4f46e5; }
        .section-label { text-align: center; font-size: 0.8rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #6366f1; margin-bottom: 16px; }
        footer a { color: #94a3b8; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
        footer a:hover { color: #e2e8f0; }
        @media (max-width: 600px) {
          .hide-mobile { display: none !important; }
          .commitment-box { padding: 36px 24px !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(20px)", background: "rgba(15,15,26,0.85)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.5px" }}>
          <span className="logo-text">fresh</span><span className="logo-accent">ers</span>
        </div>
        <ul className="hide-mobile" style={{ display: "flex", gap: 32, listStyle: "none" }}>
          <li><a href="#how" className="nav-link">Cara Kerja</a></li>
          <li><a href="#features" className="nav-link">Fitur</a></li>
          <li><a href="#projects" className="nav-link">Projects</a></li>
          <li><a href="/register" className="nav-link nav-cta">Mulai Sekarang</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 700, height: 700, background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", top: "20%", right: "10%", pointerEvents: "none" }} />

        <div className="fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa", padding: "8px 18px", borderRadius: 50, fontSize: "0.85rem", fontWeight: 600, marginBottom: 28, position: "relative", zIndex: 1 }}>
          <div className="badge-dot" /> Platform #1 untuk Fresh Graduate Indonesia
        </div>

        <h1 className="fade-up" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 24, position: "relative", zIndex: 1, animationDelay: "0.1s" }}>
          Bangun Karir dengan<br />
          <span className="gradient-text">Kolaborasi Nyata</span>
        </h1>

        <p className="fade-up" style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)", color: "#94a3b8", maxWidth: 560, margin: "0 auto 40px", position: "relative", zIndex: 1, lineHeight: 1.7, animationDelay: "0.2s" }}>
          Bukan lagi nunggu pengalaman sendirian. Temukan tim, jalankan project nyata,
          dan bangun portofolio yang bikin HRD melirik dua kali.
        </p>

        <div className="fade-up" style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1, animationDelay: "0.3s" }}>
          <a href="/register" className="btn-primary">🚀 Mulai Gratis</a>
          <a href="#projects" className="btn-secondary">Lihat Projects →</a>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 60, flexWrap: "wrap", marginTop: 80, position: "relative", zIndex: 1 }}>
          {[["500+", "Fresh Graduate"], ["120+", "Project Aktif"], ["80%", "Project Selesai"], ["15+", "Role Tersedia"]].map(([num, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div className="stat-num" style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-1px" }}>{num}</div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "100px 24px" }}>
        <div className="section-label">Cara Kerja</div>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>Simple. Terstruktur. Serius.</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", maxWidth: 520, margin: "0 auto 64px", lineHeight: 1.7 }}>Dari ide jadi portofolio nyata dalam 4 langkah mudah.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, maxWidth: 900, margin: "0 auto" }}>
          {[
            ["01", "Buat atau Temukan Project", "Punya ide? Buka project dan tentukan role yang dibutuhkan. Atau browse project yang sesuai skill kamu."],
            ["02", "Apply & Deposit Komitmen", "Tertarik dengan project? Apply ke role yang tersedia. Deposit komitmen kecil via Mayar sebagai bukti keseriusanmu."],
            ["03", "Kolaborasi & Bangun", "Kerja bareng tim lintas role. Gunakan dashboard project untuk tracking progress secara transparan."],
            ["04", "Selesai & Panen Hasilnya", "Project selesai? Deposit kembali ke kantong, portofolio bertambah, dan reputasi kamu naik."],
          ].map(([num, title, desc]) => (
            <div key={num} className="card" style={{ padding: "32px 28px" }}>
              <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #6366f1, #4f46e5)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", marginBottom: 20, boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}>{num}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section style={{ padding: "100px 24px", background: "linear-gradient(180deg, transparent, rgba(99,102,241,0.04), transparent)" }}>
        <div className="section-label">Ekosistem</div>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>Semua Role, Satu Platform</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", maxWidth: 520, margin: "0 auto 64px", lineHeight: 1.7 }}>Apapun background kamu, ada tempat di Freshers.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", maxWidth: 700, margin: "0 auto" }}>
          {["⚡ Frontend Developer", "🔧 Backend Developer", "🎨 UI/UX Designer", "📋 Project Manager", "📱 Mobile Developer", "🤖 AI/ML Engineer", "☁️ DevOps Engineer", "📊 Data Analyst", "🔍 QA Engineer", "✍️ Technical Writer", "📣 Growth Hacker", "🎯 Product Owner", "🎨 Graphic Designer", "📱 Social Media Spesialist", "Dan masih banyak role"].map(role => (
            <div key={role} className="role-pill">{role}</div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "100px 24px" }}>
        <div className="section-label">Fitur Unggulan</div>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16, lineHeight: 1.2 }}>Dirancang untuk<br />Fresh Graduate Serius</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", maxWidth: 520, margin: "0 auto 64px", lineHeight: 1.7 }}>Setiap fitur ada alasannya — untuk memastikan project benar-benar selesai.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
          {[
            ["🛡️", "Escrow Komitmen", "Setiap member deposit komitmen saat bergabung project. Kalau selesai, dana kembali penuh. Kalau kabur di tengah jalan — konsekuensinya nyata.", "Powered by Mayar"],
            ["📋", "Project Dashboard", "Kanban board, task assignment, dan progress tracking dalam satu tempat. Semua transparan untuk seluruh anggota tim.", "Real-time"],
            ["🎯", "Role-based Matching", "Leader tentukan role yang dibutuhkan, sistem bantu menemukan kandidat yang tepat berdasarkan skill dan pengalaman.", "Smart Filter"],
            ["🏆", "Reputation System", "Setiap project yang selesai membangun reputasi kamu. Track record yang bisa ditunjukkan ke recruiter dan klien.", "Verified Projects"],
            ["👥", "Open Project Feed", "Browse semua project yang sedang mencari anggota. Filter by role, tech stack, durasi, dan tingkat komitmen.", "Live Updates"],
            ["📁", "Portfolio Builder", "Otomatis generate portfolio page dari project yang sudah kamu selesaikan. Share link ke HRD dengan satu klik.", "Coming Soon"],
          ].map(([icon, title, desc, tag]) => (
            <div key={title} className="card" style={{ padding: "36px 32px" }}>
              <div style={{ fontSize: "2.2rem", marginBottom: 20 }}>{icon}</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>{title}</h3>
              <p style={{ fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.7 }}>{desc}</p>
              <span className="feature-tag">{tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PROJECT PREVIEW */}
      <section id="projects" style={{ padding: "100px 24px" }}>
        <div className="section-label">Explore</div>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>Project Aktif Sekarang</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", maxWidth: 520, margin: "0 auto 64px", lineHeight: 1.7 }}>Temukan project yang cocok dan mulai berkontribusi hari ini.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20, maxWidth: 1000, margin: "0 auto" }}>
          {[
            { title: "E-Commerce UMKM Local", desc: "Platform marketplace khusus UMKM lokal dengan fitur live streaming dan pembayaran terintegrasi.", stack: ["React", "Node.js"], needed: ["Backend ✦", "UI/UX ✦"], members: ["A","B"], total: "2/4" },
            { title: "AI Study Buddy App", desc: "Aplikasi belajar berbasis AI yang personalize materi sesuai kelemahan dan kecepatan belajar user.", stack: ["Flutter", "Python"], needed: ["Mobile Dev ✦", "PM ✦"], members: ["C","D","E"], total: "3/5" },
            { title: "Dashboard Analytics SaaS", desc: "SaaS tool untuk UMKM melacak performa bisnis dengan visualisasi data yang mudah dipahami.", stack: ["Vue.js", "PostgreSQL"], needed: ["Data Analyst ✦", "Backend ✦"], members: ["F"], total: "1/4" },
          ].map(p => (
            <div key={p.title} className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{p.title}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: 50, background: "rgba(34,197,94,0.15)", color: "#4ade80", whiteSpace: "nowrap" }}>● Open</div>
              </div>
              <p style={{ fontSize: "0.87rem", color: "#94a3b8", marginBottom: 20, lineHeight: 1.6 }}>{p.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {p.stack.map(s => <span key={s} style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: 50, border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>{s}</span>)}
                {p.needed.map(n => <span key={n} style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 12px", borderRadius: 50, border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b", background: "rgba(245,158,11,0.08)" }}>{n}</span>)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "#94a3b8" }}>
                  <div style={{ display: "flex" }}>
                    {p.members.map(m => <div key={m} style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid #0f0f1a", marginRight: -8, background: "linear-gradient(135deg, #6366f1, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>{m}</div>)}
                  </div>
                  <span style={{ marginLeft: 12 }}>{p.total} member</span>
                </div>
                <button className="join-btn">Join →</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMITMENT */}
      <section style={{ padding: "100px 24px", background: "#1a1a2e" }}>
        <div className="commitment-box" style={{ maxWidth: 700, margin: "0 auto", background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(167,139,250,0.05))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 24, padding: "56px 48px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 800, marginBottom: 16 }}>
            Komitmen Bukan Sekadar{" "}
            <span style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Janji</span>
          </h2>
          <p style={{ color: "#94a3b8", lineHeight: 1.7, marginBottom: 36 }}>
            Sistem escrow kami memastikan semua anggota tim punya skin in the game. Bukan hukuman — tapi bukti bahwa kamu serius membangun karir.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
            {["💰 Deposit", "🔨 Kerjakan", "✅ Selesai", "🎉 Dana Kembali"].map((step, i, arr) => (
              <>
                <div key={step} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 20px", fontSize: "0.85rem", fontWeight: 600 }}>{step}</div>
                {i < arr.length - 1 && <span key={`arrow-${i}`} style={{ color: "#94a3b8" }}>→</span>}
              </>
            ))}
          </div>
          <a href="#" className="btn-primary">Pelajari Lebih Lanjut</a>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "120px 24px" }}>
        <div style={{ maxWidth: 650, margin: "0 auto", position: "relative" }}>
          <div style={{ position: "absolute", width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 20, lineHeight: 1.1, position: "relative", zIndex: 1 }}>
            Siap Bangun{" "}
            <span style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Karir Impian</span>?
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.05rem", marginBottom: 40, lineHeight: 1.7, position: "relative", zIndex: 1 }}>
            Bergabunglah dengan ratusan fresh graduate yang sudah membuktikan bahwa pengalaman bisa dibangun, bukan ditunggu.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <a href="/register" className="btn-primary">🚀 Daftar Gratis Sekarang</a>
            <a href="#" className="btn-secondary">Lihat Semua Project →</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: 40, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>
          <span className="logo-text">fresh</span><span className="logo-accent">ers</span>
        </div>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>© 2026 Freshers. Build Together, Grow Together.</p>
        <div style={{ display: "flex", gap: 24 }}>
          {["Tentang", "Blog", "Kontak"].map(l => <a key={l} href="#">{l}</a>)}
        </div>
      </footer>
    </div>
  );
}
