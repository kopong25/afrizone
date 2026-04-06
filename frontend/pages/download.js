// pages/download.js — Temu-style minimal install wall
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function DownloadPage() {
  const [tab, setTab] = useState("android");
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) setTab("ios");
  }, []);

  const handleSkip = () => {
    localStorage.setItem("pwa-skipped", "1");
    router.push("/");
  };

  return (
    <>
      <Head>
        <title>Get the Afrizone App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f7f7f7;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          -webkit-font-smoothing: antialiased;
        }

        .card {
          background: #fff;
          border-radius: 20px;
          padding: 36px 28px 28px;
          width: 100%;
          max-width: 360px;
          text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }

        .app-icon {
          width: 88px;
          height: 88px;
          background: #1A5C38;
          border-radius: 22px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          box-shadow: 0 4px 16px rgba(26,92,56,0.3);
        }

        .app-name {
          font-size: 24px;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }

        .app-tagline {
          font-size: 14px;
          color: #888;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .rating-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 20px;
        }
        .stars { color: #f5a623; font-size: 14px; letter-spacing: 1px; }
        .rating-text { font-size: 12px; color: #aaa; }

        .features {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 28px;
        }
        .feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .feature-icon { font-size: 22px; }
        .feature-label { font-size: 11px; color: #aaa; }

        .btn-install {
          display: block;
          width: 100%;
          background: #1A5C38;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 12px;
          transition: background 0.2s;
          font-family: inherit;
        }
        .btn-install:hover { background: #155030; }
        .btn-install:active { transform: scale(0.98); }

        .btn-login {
          display: block;
          width: 100%;
          background: #f0faf4;
          color: #1A5C38;
          border: 1.5px solid #c3dece;
          border-radius: 12px;
          padding: 14px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 20px;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .btn-login:hover { border-color: #1A5C38; }

        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: #ccc;
          font-size: 12px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #eee;
        }

        .btn-guest {
          background: none;
          border: none;
          color: #aaa;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          padding: 4px;
          text-decoration: underline;
          display: block;
          width: 100%;
        }
        .btn-guest:hover { color: #666; }

        /* iOS bottom-sheet guide */
        .overlay-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 99;
        }
        .ios-guide {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: #fff;
          border-radius: 20px 20px 0 0;
          padding: 24px 20px 40px;
          box-shadow: 0 -4px 30px rgba(0,0,0,0.15);
          z-index: 100;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .ios-guide-handle {
          width: 40px; height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          margin: 0 auto 20px;
        }
        .ios-guide h3 {
          font-size: 17px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 20px;
          text-align: center;
        }
        .ios-step {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid #f5f5f5;
        }
        .ios-step:last-child { border-bottom: none; }
        .ios-step-icon {
          width: 40px; height: 40px;
          background: #f0faf4;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .ios-step-text { font-size: 14px; color: #333; line-height: 1.4; text-align: left; }
        .ios-step-text strong { color: #1a1a1a; }
        .btn-got-it {
          width: 100%;
          background: #1A5C38;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 15px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 20px;
          font-family: inherit;
        }
      `}</style>

      <div className="card">
        {/* App Icon */}
        <div className="app-icon">🌍</div>

        <h1 className="app-name">Afrizone</h1>
        <p className="app-tagline">Pan-African Marketplace<br />Shop · Sell · Discover</p>

        <div className="rating-row">
          <span className="stars">★★★★★</span>
          <span className="rating-text">4.8 · Free</span>
        </div>

        <div className="features">
          <div className="feature">
            <span className="feature-icon">🛍️</span>
            <span className="feature-label">Shop</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🚚</span>
            <span className="feature-label">Delivery</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span className="feature-label">Secure</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📦</span>
            <span className="feature-label">Track</span>
          </div>
        </div>

        {/* Primary CTA */}
        {tab === "android" ? (
          <a href="/afrizone.apk" download className="btn-install">
            ↓ &nbsp;Install Free — Android
          </a>
        ) : (
          <button className="btn-install" onClick={() => setShowIOSGuide(true)}>
            ↓ &nbsp;Install Free — iPhone
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

      {/* iOS bottom-sheet — slides up when tapped */}
      {showIOSGuide && (
        <>
          <div className="overlay-bg" onClick={() => setShowIOSGuide(false)} />
          <div className="ios-guide">
            <div className="ios-guide-handle" />
            <h3>Add to Home Screen</h3>
            <div className="ios-step">
              <div className="ios-step-icon">🌐</div>
              <p className="ios-step-text">Open this page in <strong>Safari</strong> (not Chrome)</p>
            </div>
            <div className="ios-step">
              <div className="ios-step-icon">⬆️</div>
              <p className="ios-step-text">Tap the <strong>Share</strong> button at the bottom</p>
            </div>
            <div className="ios-step">
              <div className="ios-step-icon">➕</div>
              <p className="ios-step-text">Tap <strong>"Add to Home Screen"</strong> → <strong>Add</strong></p>
            </div>
            <div className="ios-step">
              <div className="ios-step-icon">🎉</div>
              <p className="ios-step-text">Open <strong>Afrizone</strong> from your home screen</p>
            </div>
            <button className="btn-got-it" onClick={() => setShowIOSGuide(false)}>Got it</button>
          </div>
        </>
      )}
    </>
  );
}