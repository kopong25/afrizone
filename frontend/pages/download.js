// pages/download.js
// Android: place your APK at /public/afrizone.apk
// iOS icons: /public/icon-192.png, /public/icon-512.png, /public/apple-touch-icon.png

import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const androidSteps = [
  { num: "01", title: "Tap Download APK", body: "Your browser saves the file to your Downloads folder automatically." },
  { num: "02", title: "Allow unknown sources", body: "Settings → Apps → Special app access → Install unknown apps → enable your browser (e.g. Chrome)." },
  { num: "03", title: "Open the file", body: 'Open your Downloads folder, tap "afrizone.apk" and hit Install when prompted.' },
  { num: "04", title: "Start shopping", body: "Open Afrizone from your home screen, sign in and enjoy." },
];

const iosSteps = [
  { num: "01", title: "Open Safari", body: "Visit afrizoneshop.com in Safari. This will not work in Chrome or Firefox on iPhone — must be Safari." },
  { num: "02", title: "Tap the Share button", body: "Tap the share icon at the bottom of your screen — a box with an arrow pointing up." },
  { num: "03", title: "Add to Home Screen", body: 'Scroll down in the share menu and tap "Add to Home Screen", then tap Add in the top right.' },
  { num: "04", title: "Open from home screen", body: "Afrizone appears on your home screen like a native app. Tap to open full-screen anytime." },
];

const faqs = [
  { q: "Is the Android APK safe to install?", a: "Yes. This is the official Afrizone app published directly by us. Android shows a warning for any app outside the Play Store — this is normal and safe to proceed." },
  { q: "Why does iOS use a different method?", a: "Apple does not support APK files — iPhones use a completely different system. The PWA method gives you the same full app experience through Safari without needing the App Store." },
  { q: "Will I get updates automatically?", a: "On Android, you'll be notified inside the app when a new version is available — just download and install the new APK over the old one. On iOS, updates happen automatically every time you open the app." },
  { q: "Why isn't Afrizone on the App Store or Play Store?", a: "Direct distribution lets us ship updates faster and avoid platform fees, which means better prices for our customers." },
  { q: "Does the iOS version work like a real app?", a: "Yes. Once added to your home screen, Afrizone opens full-screen with no browser bar — just like a native app. Browse, shop, and checkout normally." },
];

export default function DownloadPage() {
  const [tab, setTab] = useState("android");
  const [openFaq, setOpenFaq] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) setTab("ios");
  }, []);

  // ✅ "Continue as Guest" — skips the wall and sends user to homepage
  const handleSkip = () => {
    localStorage.setItem("pwa-skipped", "1");
    router.push("/");
  };

  const steps = tab === "android" ? androidSteps : iosSteps;

  return (
    <>
      <Head>
        <title>Download Afrizone App</title>
        <meta name="description" content="Download the Afrizone app on Android or iPhone. No app store required." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,800;1,9..144,300&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --clay: #C5531A; --clay-light: #E8723A; --clay-pale: #FDE8D8;
          --earth: #1A1208; --sand: #F5EDD8; --sand-dark: #EAD9B8;
          --cream: #FDFAF4; --text: #1A1208; --text-muted: #7A6A52;
          --ios: #1A73C8; --ios-pale: #E3EFFC;
          --green: #1A5C38;
        }
        body { background: var(--cream); color: var(--text); font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }

        nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 40px; border-bottom: 1px solid var(--sand-dark); position: sticky; top: 0; background: var(--cream); z-index: 100; }
        .nav-logo { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 800; color: var(--clay); letter-spacing: -0.5px; }
        .nav-skip { font-size: 13px; color: var(--text-muted); background: none; border: none; cursor: pointer; text-decoration: underline; font-family: 'DM Sans', sans-serif; padding: 6px; }
        .nav-skip:hover { color: var(--text); }

        .hero { max-width: 1100px; margin: 0 auto; padding: 72px 40px 56px; display: grid; grid-template-columns: 1fr 460px; gap: 60px; align-items: center; }
        .hero-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--clay); margin-bottom: 20px; }
        .hero-title { font-family: 'Fraunces', serif; font-size: clamp(44px, 5.5vw, 70px); font-weight: 800; line-height: 1.0; letter-spacing: -2px; color: var(--earth); margin-bottom: 18px; }
        .hero-title em { font-style: italic; font-weight: 300; color: var(--clay); }
        .hero-sub { font-size: 16px; color: var(--text-muted); line-height: 1.7; max-width: 400px; margin-bottom: 32px; }

        .device-tabs { display: flex; gap: 8px; margin-bottom: 28px; }
        .dtab { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; border: 1.5px solid var(--sand-dark); background: transparent; color: var(--text-muted); transition: all .18s; }
        .dtab:hover { border-color: var(--clay); color: var(--text); }
        .dtab.active-android { background: var(--clay); color: #fff; border-color: var(--clay); }
        .dtab.active-ios { background: var(--ios); color: #fff; border-color: var(--ios); }

        .dl-btn { display: inline-flex; align-items: center; gap: 12px; color: #fff; border: none; cursor: pointer; padding: 18px 32px; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 500; text-decoration: none; transition: background .2s, transform .15s; }
        .dl-btn.android { background: var(--clay); }
        .dl-btn.android:hover { background: var(--clay-light); transform: translateY(-2px); }
        .dl-btn.ios { background: var(--ios); }
        .dl-btn.ios:hover { background: #1565B8; transform: translateY(-2px); }
        .dl-btn:active { transform: translateY(0) !important; }
        .dl-meta { margin-top: 14px; font-size: 12px; color: var(--text-muted); }

        .safari-hint { display: inline-flex; align-items: center; gap: 8px; background: var(--ios-pale); color: var(--ios); padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 24px; border: 1px solid rgba(26,115,200,.15); }

        /* ✅ CTA block — Sign Up / Continue as Guest */
        .cta-block {
          margin-top: 32px;
          padding: 24px;
          background: #f0faf4;
          border: 1.5px solid #bbdecb;
          border-radius: 12px;
          max-width: 420px;
        }
        .cta-block p { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.6; }
        .cta-block p strong { color: var(--green); }
        .cta-btns { display: flex; flex-direction: column; gap: 10px; }
        .btn-signup {
          display: block; text-align: center; background: var(--green); color: #fff;
          padding: 14px; border-radius: 8px; font-weight: 700; font-size: 15px;
          text-decoration: none; font-family: 'DM Sans', sans-serif;
          transition: background .2s;
        }
        .btn-signup:hover { background: #155030; }
        .btn-login {
          display: block; text-align: center; background: #fff; color: var(--green);
          padding: 13px; border-radius: 8px; font-weight: 600; font-size: 15px;
          text-decoration: none; font-family: 'DM Sans', sans-serif;
          border: 1.5px solid #bbdecb; transition: border-color .2s;
        }
        .btn-login:hover { border-color: var(--green); }
        .btn-guest {
          background: none; border: none; color: var(--text-muted); font-size: 13px;
          cursor: pointer; text-decoration: underline; font-family: 'DM Sans', sans-serif;
          text-align: center; padding: 4px; margin-top: 4px;
        }
        .btn-guest:hover { color: var(--text); }

        .phones-wrap { display: flex; justify-content: center; align-items: flex-end; gap: 24px; }
        .phone-col { display: flex; flex-direction: column; align-items: center; }
        .phone { border-radius: 30px; position: relative; overflow: hidden; transition: transform .3s, box-shadow .3s, opacity .3s; }
        .phone.android-phone { width: 180px; height: 360px; border: 7px solid var(--earth); box-shadow: 0 32px 64px rgba(197,83,26,.25); }
        .phone.ios-phone { width: 162px; height: 330px; border-radius: 38px; border: 6px solid #1A1A2E; box-shadow: 0 32px 64px rgba(26,115,200,.2); }
        .phone.dimmed { opacity: .22; transform: scale(.93); }
        .phone-screen { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
        .android-screen { background: linear-gradient(160deg, #C5531A 0%, #E8723A 40%, #F5EDD8 100%); }
        .ios-screen { background: linear-gradient(160deg, #1A73C8 0%, #4A9EE8 45%, #E3EFFC 100%); }
        .phone-logo { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -1px; }
        .phone-tagline { font-size: 10px; color: rgba(255,255,255,.7); text-align: center; padding: 0 16px; }
        .phone-notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 64px; height: 22px; background: var(--earth); border-radius: 0 0 14px 14px; z-index: 2; }
        .phone-pill { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 48px; height: 10px; background: #1A1A2E; border-radius: 5px; z-index: 2; }
        .phone-label { font-size: 12px; color: var(--text-muted); margin-top: 10px; font-weight: 500; }

        .steps-section { background: var(--earth); padding: 72px 40px; }
        .section-inner { max-width: 1100px; margin: 0 auto; }
        .section-label-light { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--clay-light); margin-bottom: 16px; }
        .section-label-dark { font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--clay); margin-bottom: 16px; }
        .section-title-light { font-family: 'Fraunces', serif; font-size: clamp(26px, 3.5vw, 40px); font-weight: 600; color: #fff; line-height: 1.15; letter-spacing: -1px; margin-bottom: 40px; }
        .section-title-dark { font-family: 'Fraunces', serif; font-size: clamp(26px, 3.5vw, 40px); font-weight: 600; color: var(--earth); line-height: 1.15; letter-spacing: -1px; margin-bottom: 40px; }

        .steps-tabs { display: flex; gap: 8px; margin-bottom: 36px; }
        .stab { padding: 8px 18px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; border: 1px solid rgba(255,255,255,.15); color: rgba(255,255,255,.45); background: transparent; transition: all .18s; }
        .stab:hover { color: #fff; border-color: rgba(255,255,255,.4); }
        .stab.stab-android.active { background: var(--clay); color: #fff; border-color: var(--clay); }
        .stab.stab-ios.active { background: var(--ios); color: #fff; border-color: var(--ios); }

        .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
        .step { background: rgba(255,255,255,.04); padding: 32px 24px; border: 1px solid rgba(255,255,255,.07); transition: background .2s; }
        .step:hover { background: rgba(255,255,255,.07); }
        .step-num { font-family: 'Fraunces', serif; font-size: 44px; font-weight: 800; line-height: 1; margin-bottom: 18px; opacity: .6; }
        .step-num.and { color: var(--clay); }
        .step-num.ios { color: #4A9EE8; }
        .step-title { font-size: 14px; font-weight: 500; color: #fff; margin-bottom: 8px; }
        .step-body { font-size: 13px; color: rgba(255,255,255,.5); line-height: 1.7; }

        .faq-section { padding: 72px 40px; background: var(--sand); }
        .faq-grid { display: grid; grid-template-columns: 260px 1fr; gap: 80px; max-width: 1100px; margin: 0 auto; }
        .faq-list { display: flex; flex-direction: column; }
        .faq-item { border-top: 1px solid var(--sand-dark); }
        .faq-item:last-child { border-bottom: 1px solid var(--sand-dark); }
        .faq-q { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; cursor: pointer; font-size: 15px; font-weight: 500; color: var(--earth); gap: 16px; user-select: none; transition: color .15s; }
        .faq-q:hover { color: var(--clay); }
        .faq-icon { font-size: 20px; color: var(--clay); transition: transform .2s; flex-shrink: 0; }
        .faq-icon.open { transform: rotate(45deg); }
        .faq-a { font-size: 14px; color: var(--text-muted); line-height: 1.7; padding-bottom: 20px; max-width: 520px; }

        footer { padding: 28px 40px; border-top: 1px solid var(--sand-dark); display: flex; justify-content: space-between; align-items: center; background: var(--cream); }
        .footer-logo { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 800; color: var(--clay); }
        .footer-text { font-size: 12px; color: var(--text-muted); }

        @media (max-width: 900px) {
          nav { padding: 16px 20px; }
          .hero { grid-template-columns: 1fr; padding: 48px 20px 40px; gap: 40px; }
          .phones-wrap { order: -1; }
          .steps-grid { grid-template-columns: 1fr 1fr; }
          .steps-section, .faq-section { padding: 56px 20px; }
          .faq-grid { grid-template-columns: 1fr; gap: 28px; }
          footer { padding: 24px 20px; flex-direction: column; gap: 8px; text-align: center; }
        }
        @media (max-width: 560px) {
          .steps-grid { grid-template-columns: 1fr; }
          .hero-title { font-size: 40px; }
          .phones-wrap { gap: 14px; }
          .phone.android-phone { width: 150px; height: 300px; }
          .phone.ios-phone { width: 134px; height: 272px; }
          .cta-block { max-width: 100%; }
        }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .hero-eyebrow { animation: fadeUp .5s ease both; }
        .hero-title    { animation: fadeUp .5s .07s ease both; }
        .hero-sub      { animation: fadeUp .5s .14s ease both; }
        .device-tabs   { animation: fadeUp .5s .2s ease both; }
        .dl-area       { animation: fadeUp .5s .26s ease both; }
        .phones-wrap   { animation: fadeUp .6s .1s ease both; }
      `}</style>

      <nav>
        <span className="nav-logo">Afrizone</span>
        {/* ✅ Always visible skip link in nav */}
        <button className="nav-skip" onClick={handleSkip}>
          Continue as Guest →
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div>
          <p className="hero-eyebrow">Get the App</p>
          <h1 className="hero-title">
            Shop Africa<br />
            <em>anywhere,<br />anytime</em>
          </h1>
          <p className="hero-sub">
            Available on Android and iPhone. No app store required — install directly in seconds.
          </p>

          <div className="device-tabs">
            <button className={`dtab ${tab === "android" ? "active-android" : ""}`} onClick={() => { setTab("android"); setDownloaded(false); }}>
              🤖 Android
            </button>
            <button className={`dtab ${tab === "ios" ? "active-ios" : ""}`} onClick={() => { setTab("ios"); setDownloaded(false); }}>
              🍎 iPhone / iPad
            </button>
          </div>

          <div className="dl-area">
            {tab === "android" ? (
              <>
                <a href="/afrizone.apk" download className="dl-btn android" onClick={() => setDownloaded(true)}>
                  <span>↓</span>
                  {downloaded ? "Downloading…" : "Download APK"}
                </a>
                <p className="dl-meta">Android 8.0+ · ~15 MB · Free</p>
              </>
            ) : (
              <>
                <div className="safari-hint">⚠️ Open this page in Safari — Chrome won't work on iPhone</div>
                <br />
                <a href="https://afrizoneshop.com" target="_blank" rel="noopener noreferrer" className="dl-btn ios">
                  <span>↗</span> Open in Safari to Install
                </a>
                <p className="dl-meta">iOS 14+ · No download needed · Free</p>
              </>
            )}

            {/* ✅ Sign Up / Login / Guest CTA block */}
            <div className="cta-block">
              <p>
                <strong>Already installed?</strong> Create your free account to track orders, save favourites and get exclusive deals.
              </p>
              <div className="cta-btns">
                <a href="/register" className="btn-signup">Create Free Account →</a>
                <a href="/login" className="btn-login">I already have an account</a>
                <button className="btn-guest" onClick={handleSkip}>
                  Continue as Guest — browse without signing up
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="phones-wrap">
          <div className="phone-col">
            <div className={`phone android-phone ${tab === "ios" ? "dimmed" : ""}`}>
              <div className="phone-notch" />
              <div className="phone-screen android-screen">
                <div className="phone-logo">Afrizone</div>
                <div className="phone-tagline">Africa's marketplace</div>
              </div>
            </div>
            <p className="phone-label">Android</p>
          </div>
          <div className="phone-col">
            <div className={`phone ios-phone ${tab === "android" ? "dimmed" : ""}`}>
              <div className="phone-pill" />
              <div className="phone-screen ios-screen">
                <div className="phone-logo">Afrizone</div>
                <div className="phone-tagline">Africa's marketplace</div>
              </div>
            </div>
            <p className="phone-label">iPhone</p>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="steps-section">
        <div className="section-inner">
          <p className="section-label-light">How to install</p>
          <h2 className="section-title-light">
            {tab === "android" ? "Install on Android in 4 steps" : "Install on iPhone in 4 steps"}
          </h2>
          <div className="steps-tabs">
            <button className={`stab stab-android ${tab === "android" ? "active" : ""}`} onClick={() => setTab("android")}>🤖 Android</button>
            <button className={`stab stab-ios ${tab === "ios" ? "active" : ""}`} onClick={() => setTab("ios")}>🍎 iPhone</button>
          </div>
          <div className="steps-grid">
            {steps.map((s) => (
              <div className="step" key={s.num}>
                <div className={`step-num ${tab === "ios" ? "ios" : "and"}`}>{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-body">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="faq-grid">
          <div>
            <p className="section-label-dark">Questions</p>
            <h2 className="section-title-dark">Common questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div className="faq-item" key={i}>
                <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span>
                  <span className={`faq-icon${openFaq === i ? " open" : ""}`}>+</span>
                </div>
                {openFaq === i && <p className="faq-a">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <span className="footer-logo">Afrizone</span>
        <span className="footer-text">© {new Date().getFullYear()} Afrizone · afrizoneshop.com</span>
      </footer>
    </>
  );
}