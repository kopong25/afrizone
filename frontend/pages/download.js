// pages/download.js — One-tap install with iOS animated guide
import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export default function DownloadPage() {
  const [platform, setPlatform] = useState("android");
  const [installReady, setInstallReady] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSOverlay, setShowIOSOverlay] = useState(false);
  const deferredPrompt = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");

    // Capture native Android PWA install prompt
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallReady(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (installReady && deferredPrompt.current) {
      setInstalling(true);
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      setInstalling(false);
      if (outcome === "accepted") setInstalled(true);
    } else {
      // Direct APK download — one tap, browser handles it
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
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 24px 20px;
          -webkit-font-smoothing: antialiased;
        }
        body::before {
          content: '';
          position: fixed; top: 10%; left: 50%;
          transform: translateX(-50%);
          width: 340px; height: 340px;
          background: radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .card {
          position: relative; background: #fff; border-radius: 28px;
          padding: 36px 28px 32px; width: 100%; max-width: 360px;
          text-align: center; box-shadow: 0 24px 80px rgba(0,0,0,0.35); z-index: 1;
        }
        .app-icon {
          width: 86px; height: 86px;
          background: linear-gradient(145deg, #1a7a48, #0f4f2e);
          border-radius: 22px; margin: 0 auto 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 38px; box-shadow: 0 8px 28px rgba(26,92,56,0.45);
        }
        .app-name { font-size: 26px; font-weight: 800; color: #0f1a14; letter-spacing: -0.6px; margin-bottom: 4px; }
        .app-tagline { font-size: 13px; color: #8a9a8e; line-height: 1.5; margin-bottom: 18px; }
        .rating-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 22px; }
        .stars { color: #f5a623; font-size: 13px; letter-spacing: 2px; }
        .rating-text { font-size: 12px; color: #b0bab4; font-weight: 600; }
        .features { display: flex; justify-content: center; gap: 8px; margin-bottom: 28px; flex-wrap: wrap; }
        .feature { display: flex; align-items: center; gap: 5px; background: #f3faf6; border: 1px solid #d4eedd; border-radius: 20px; padding: 5px 11px; }
        .feature-icon { font-size: 13px; }
        .feature-label { font-size: 11px; color: #2d6e4a; font-weight: 600; }
        .btn-install {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; width: 100%;
          background: linear-gradient(160deg, #22c55e, #16a34a);
          color: #fff; border: none; border-radius: 14px;
          padding: 17px 20px; font-size: 16px; font-weight: 700;
          font-family: inherit; cursor: pointer; text-decoration: none;
          margin-bottom: 12px; box-shadow: 0 6px 24px rgba(22,163,74,0.4);
          transition: all 0.18s ease; letter-spacing: -0.2px;
        }
        .btn-install:hover { background: linear-gradient(160deg, #16a34a, #15803d); transform: translateY(-1px); box-shadow: 0 10px 30px rgba(22,163,74,0.45); }
        .btn-install:active { transform: scale(0.98); }
        .btn-install:disabled { background: linear-gradient(160deg, #86efac, #4ade80); cursor: not-allowed; }
        .btn-install .dl-icon { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 8px; flex-shrink: 0; }
        .btn-installed { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #f0fdf4; border: 2px solid #86efac; color: #16a34a; border-radius: 14px; padding: 16px; font-size: 15px; font-weight: 700; font-family: inherit; margin-bottom: 12px; }
        .btn-login { display: flex; align-items: center; justify-content: center; width: 100%; background: #fff; color: #1a5c38; border: 1.5px solid #d4eedd; border-radius: 14px; padding: 15px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; margin-bottom: 20px; font-family: inherit; transition: border-color 0.18s, background 0.18s; }
        .btn-login:hover { border-color: #22c55e; background: #f0fdf4; }
        .divider { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: #ddd; font-size: 11px; font-weight: 600; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #f0f0f0; }
        .btn-guest { background: none; border: none; color: #b0bab4; font-size: 13px; cursor: pointer; font-family: inherit; padding: 4px 8px; text-decoration: underline; text-underline-offset: 3px; display: block; width: 100%; transition: color 0.15s; }
        .btn-guest:hover { color: #6b7280; }
        @keyframes progress { from { width: 0% } to { width: 90% } }
        .progress-bar-wrap { height: 3px; background: #dcfce7; border-radius: 99px; overflow: hidden; margin-bottom: 8px; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); border-radius: 99px; animation: progress 3s ease-out forwards; }
        .progress-label { font-size: 11px; color: #16a34a; font-weight: 600; margin-bottom: 10px; text-align: center; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
        .dl-arrow { width: 16px; height: 16px; stroke: #fff; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }

        /* ── iOS Overlay ── */
        .overlay-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 99; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
        .ios-sheet {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #fff; border-radius: 24px 24px 0 0;
          padding: 20px 24px 48px; z-index: 100; text-align: center;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.25);
          animation: slideUp 0.38s cubic-bezier(0.34,1.4,0.64,1);
        }
        @keyframes slideUp { from { transform: translateY(110%); } to { transform: translateY(0); } }
        .ios-sheet-handle { width: 40px; height: 4px; background: #e0e0e0; border-radius: 2px; margin: 0 auto 20px; }
        .ios-sheet-icon { font-size: 44px; margin-bottom: 10px; }
        .ios-sheet-title { font-size: 21px; font-weight: 800; color: #0f1a14; margin-bottom: 4px; letter-spacing: -0.4px; }
        .ios-sheet-sub { font-size: 13px; color: #8a9a8e; margin-bottom: 24px; }
        .ios-steps-list { text-align: left; margin-bottom: 20px; }
        .ios-step-item { display: flex; align-items: flex-start; gap: 14px; }
        .ios-step-circle { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; box-shadow: 0 3px 10px rgba(22,163,74,0.4); }
        .ios-step-content { display: flex; flex-direction: column; gap: 2px; padding-bottom: 2px; }
        .ios-step-content strong { font-size: 14px; color: #0f1a14; font-weight: 700; }
        .ios-step-content span { font-size: 12px; color: #8a9a8e; line-height: 1.4; }
        .ios-step-connector { width: 1.5px; height: 16px; background: #d4eedd; margin: 4px 0 4px 14px; }
        .safari-bar-hint { background: #f3faf6; border: 1.5px solid #d4eedd; border-radius: 14px; padding: 12px 14px; margin-bottom: 20px; }
        .safari-bar-mock { display: flex; align-items: center; justify-content: space-between; background: #e8e8ed; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; }
        .safari-bar-url { font-size: 13px; color: #3c3c43; font-weight: 500; }
        .safari-share-btn { width: 34px; height: 34px; background: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #007aff; box-shadow: 0 1px 4px rgba(0,0,0,0.15); animation: pulse-share 1.4s ease-in-out infinite; }
        @keyframes pulse-share { 0%, 100% { box-shadow: 0 0 0 0 rgba(0,122,255,0.5); } 50% { box-shadow: 0 0 0 8px rgba(0,122,255,0); } }
        .tap-arrow-wrap { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .tap-arrow { font-size: 20px; animation: bounce-finger 1s ease-in-out infinite; }
        @keyframes bounce-finger { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .tap-label { font-size: 12px; color: #16a34a; font-weight: 700; }
        .btn-got-it { width: 100%; background: linear-gradient(160deg, #22c55e, #16a34a); color: #fff; border: none; border-radius: 14px; padding: 16px; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; box-shadow: 0 6px 20px rgba(22,163,74,0.4); }
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

        {installing && (
          <>
            <div className="progress-bar-wrap"><div className="progress-bar" /></div>
            <div className="progress-label">Installing Afrizone…</div>
          </>
        )}

        {installed ? (
          <div className="btn-installed"><span>✅</span> Afrizone Installed</div>
        ) : platform === "android" ? (
          <button className="btn-install" onClick={handleAndroidInstall} disabled={installing}>
            <span className="dl-icon">
              {installing ? <span className="spinner" /> : (
                <svg className="dl-arrow" viewBox="0 0 24 24">
                  <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
              )}
            </span>
            {installing ? "Installing…" : "Install Free — Android"}
          </button>
        ) : (
          // iOS: opens the animated step-by-step overlay
          <button className="btn-install" onClick={() => setShowIOSOverlay(true)}>
            <span className="dl-icon">
              <svg className="dl-arrow" viewBox="0 0 24 24">
                <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
            </span>
            Install Free — iPhone
          </button>
        )}

        <a href="/login" className="btn-login">Log in to my account</a>
        <div className="divider">or</div>
        <button className="btn-guest" onClick={handleSkip}>Continue as Guest</button>
      </div>

      {/* ── iOS Install Guide — slides up on button tap ── */}
      {showIOSOverlay && (
        <>
          <div className="overlay-bg" onClick={() => setShowIOSOverlay(false)} />
          <div className="ios-sheet">
            <div className="ios-sheet-handle" />
            <div className="ios-sheet-icon">📲</div>
            <h2 className="ios-sheet-title">Install Afrizone</h2>
            <p className="ios-sheet-sub">3 quick steps — takes 10 seconds</p>

            <div className="ios-steps-list">
              <div className="ios-step-item">
                <div className="ios-step-circle">1</div>
                <div className="ios-step-content">
                  <strong>Tap the Share button ⬆</strong>
                  <span>At the bottom centre of your Safari browser</span>
                </div>
              </div>
              <div className="ios-step-connector" />
              <div className="ios-step-item">
                <div className="ios-step-circle">2</div>
                <div className="ios-step-content">
                  <strong>Tap "Add to Home Screen"</strong>
                  <span>Scroll down in the share menu to find it</span>
                </div>
              </div>
              <div className="ios-step-connector" />
              <div className="ios-step-item">
                <div className="ios-step-circle">3</div>
                <div className="ios-step-content">
                  <strong>Tap "Add" to confirm</strong>
                  <span>Afrizone will appear on your home screen instantly</span>
                </div>
              </div>
            </div>

            {/* Animated Safari toolbar mockup showing which button to tap */}
            <div className="safari-bar-hint">
              <div className="safari-bar-mock">
                <span className="safari-bar-url">afrizone.com</span>
                <div className="safari-share-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    width="18" height="18">
                    <path d="M8 6H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2" />
                    <path d="M12 2v12m0-12l-3 3m3-3l3 3" />
                  </svg>
                </div>
              </div>
              <div className="tap-arrow-wrap">
                <div className="tap-arrow">☝️</div>
                <div className="tap-label">Tap this Share button first</div>
              </div>
            </div>

            <button className="btn-got-it" onClick={() => setShowIOSOverlay(false)}>
              Got it — I'm ready!
            </button>
          </div>
        </>
      )}
    </>
  );
}