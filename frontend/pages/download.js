// pages/download.js — One-tap install (Temu/Alibaba style)
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export default function DownloadPage() {
  const [platform, setPlatform] = useState("android"); // "android" | "ios"
  const [installReady, setInstallReady] = useState(false); // PWA prompt available
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const deferredPrompt = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) {
      setPlatform("ios");
    }

    // Capture the native PWA install prompt (Android Chrome / Edge)
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallReady(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Detect if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── Android: one-tap PWA install, fallback to APK download ──
  const handleAndroidInstall = async () => {
    if (installReady && deferredPrompt.current) {
      // Native one-tap prompt
      setInstalling(true);
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      setInstalling(false);
      if (outcome === "accepted") setInstalled(true);
    } else {
      // Fallback: direct APK download — browser handles it instantly
      const a = document.createElement("a");
      a.href = "/afrizone.apk";
      a.download = "afrizone.apk";
      a.click();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("pwa-skipped", "1");
    router.push("/");
  };

  return (
    <>
      <Head>
        <title>Get the Afrizone App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Sora', -apple-system, sans-serif;
          background: #0d1a12;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        /* ── Ambient glow behind card ── */
        body::before {
          content: '';
          position: fixed;
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          width: 340px;
          height: 340px;
          background: radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .card {
          position: relative;
          background: #ffffff;
          border-radius: 28px;
          padding: 36px 28px 32px;
          width: 100%;
          max-width: 360px;
          text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06);
          z-index: 1;
        }

        /* ── Icon ── */
        .app-icon {
          width: 86px;
          height: 86px;
          background: linear-gradient(145deg, #1a7a48, #0f4f2e);
          border-radius: 22px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          box-shadow: 0 8px 28px rgba(26,92,56,0.45);
        }

        .app-name {
          font-size: 26px;
          font-weight: 800;
          color: #0f1a14;
          letter-spacing: -0.6px;
          margin-bottom: 4px;
        }
        .app-tagline {
          font-size: 13px;
          color: #8a9a8e;
          line-height: 1.5;
          margin-bottom: 18px;
        }

        /* ── Rating ── */
        .rating-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 22px;
        }
        .stars { color: #f5a623; font-size: 13px; letter-spacing: 2px; }
        .rating-text { font-size: 12px; color: #b0bab4; font-weight: 600; }

        /* ── Feature pills ── */
        .features {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .feature {
          display: flex;
          align-items: center;
          gap: 5px;
          background: #f3faf6;
          border: 1px solid #d4eedd;
          border-radius: 20px;
          padding: 5px 11px;
        }
        .feature-icon { font-size: 13px; }
        .feature-label { font-size: 11px; color: #2d6e4a; font-weight: 600; }

        /* ── Primary install button ── */
        .btn-install {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          background: linear-gradient(160deg, #22c55e, #16a34a);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 17px 20px;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 12px;
          box-shadow: 0 6px 24px rgba(22,163,74,0.4);
          transition: all 0.18s ease;
          letter-spacing: -0.2px;
        }
        .btn-install:hover { background: linear-gradient(160deg, #16a34a, #15803d); transform: translateY(-1px); box-shadow: 0 10px 30px rgba(22,163,74,0.45); }
        .btn-install:active { transform: scale(0.98) translateY(0); }
        .btn-install:disabled { background: linear-gradient(160deg, #86efac, #4ade80); box-shadow: none; cursor: not-allowed; }

        .btn-install .dl-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: rgba(255,255,255,0.2);
          border-radius: 8px;
          flex-shrink: 0;
        }

        /* ── Installed state ── */
        .btn-installed {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: #f0fdf4;
          border: 2px solid #86efac;
          color: #16a34a;
          border-radius: 14px;
          padding: 16px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          margin-bottom: 12px;
        }

        /* ── Login button ── */
        .btn-login {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: #fff;
          color: #1a5c38;
          border: 1.5px solid #d4eedd;
          border-radius: 14px;
          padding: 15px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 20px;
          font-family: inherit;
          transition: border-color 0.18s, background 0.18s;
        }
        .btn-login:hover { border-color: #22c55e; background: #f0fdf4; }

        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: #ddd;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #f0f0f0; }

        .btn-guest {
          background: none;
          border: none;
          color: #b0bab4;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          padding: 4px 8px;
          text-decoration: underline;
          text-underline-offset: 3px;
          display: block;
          width: 100%;
          transition: color 0.15s;
        }
        .btn-guest:hover { color: #6b7280; }

        /* ── iOS one-tap banner ── */
        .ios-banner {
          margin-bottom: 12px;
          background: #fffbeb;
          border: 1.5px solid #fcd34d;
          border-radius: 14px;
          padding: 14px 16px;
          text-align: left;
        }
        .ios-banner-title {
          font-size: 13px;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ios-steps {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .ios-step-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #78350f;
          line-height: 1.4;
        }
        .ios-step-num {
          width: 18px;
          height: 18px;
          background: #fcd34d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: #78350f;
          flex-shrink: 0;
        }

        /* ── Spinner ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Progress bar during install ── */
        @keyframes progress { from { width: 0% } to { width: 90% } }
        .progress-bar-wrap {
          height: 3px;
          background: #dcfce7;
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          border-radius: 99px;
          animation: progress 3s ease-out forwards;
        }
        .progress-label {
          font-size: 11px;
          color: #16a34a;
          font-weight: 600;
          margin-bottom: 10px;
          text-align: center;
        }

        /* ── Download arrow SVG icon ── */
        .dl-arrow {
          width: 16px;
          height: 16px;
          stroke: #fff;
          fill: none;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}</style>

      <div className="card">
        <div className="app-icon">🌍</div>
        <h1 className="app-name">Afrizone</h1>
        <p className="app-tagline">Pan-African Marketplace<br />Shop · Sell · Discover</p>

        <div className="rating-row">
          <span className="stars">★★★★★</span>
          <span className="rating-text">4.8 · Free</span>
        </div>

        <div className="features">
          <div className="feature"><span className="feature-icon">🛍️</span><span className="feature-label">Shop</span></div>
          <div className="feature"><span className="feature-icon">🚚</span><span className="feature-label">Fast Delivery</span></div>
          <div className="feature"><span className="feature-icon">🔒</span><span className="feature-label">Secure Pay</span></div>
          <div className="feature"><span className="feature-icon">📦</span><span className="feature-label">Live Track</span></div>
        </div>

        {/* ── Installing progress ── */}
        {installing && (
          <>
            <div className="progress-bar-wrap"><div className="progress-bar" /></div>
            <div className="progress-label">Installing Afrizone…</div>
          </>
        )}

        {/* ── iOS: inline steps (no bottom sheet) ── */}
        {platform === "ios" && !installed && (
          <div className="ios-banner">
            <div className="ios-banner-title">
              <span>📲</span> Add to Home Screen
            </div>
            <div className="ios-steps">
              <div className="ios-step-row"><div className="ios-step-num">1</div>Open in <strong>&nbsp;Safari&nbsp;</strong> if not already</div>
              <div className="ios-step-row"><div className="ios-step-num">2</div>Tap&nbsp;<strong>⬆ Share</strong>&nbsp;at the bottom</div>
              <div className="ios-step-row"><div className="ios-step-num">3</div>Tap&nbsp;<strong>"Add to Home Screen"</strong>&nbsp;→ Add</div>
            </div>
          </div>
        )}

        {/* ── Primary CTA ── */}
        {installed ? (
          <div className="btn-installed">
            <span>✅</span> Afrizone Installed
          </div>
        ) : platform === "android" ? (
          <button
            className="btn-install"
            onClick={handleAndroidInstall}
            disabled={installing}
          >
            <span className="dl-icon">
              {installing ? (
                <span className="spinner" />
              ) : (
                <svg className="dl-arrow" viewBox="0 0 24 24">
                  <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
              )}
            </span>
            {installing ? "Installing…" : "Install Free — Android"}
          </button>
        ) : (
          // iOS — the button opens Share sheet hint inline above; nothing to tap here
          // But we still show it as visual affordance — tapping scrolls them to the steps
          <button
            className="btn-install"
            onClick={() => {
              document.querySelector(".ios-banner")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span className="dl-icon">
              <svg className="dl-arrow" viewBox="0 0 24 24">
                <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
            </span>
            Install Free — iPhone
          </button>
        )}

        <a href="/login" className="btn-login">
          Log in to my account
        </a>

        <div className="divider">or</div>

        <button className="btn-guest" onClick={handleSkip}>
          Continue as Guest
        </button>
      </div>
    </>
  );
}