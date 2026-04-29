import React from 'react';
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { authAPI, setAuthToken, loadStoredToken } from "../lib/api";
import "../styles/globals.css";

// ── Google Analytics ───────────────────────────────────────────
const GA_ID = "G-2ESGNVEKP9";

// ── Microsoft Clarity ──────────────────────────────────────────
const CLARITY_ID = "wfgva6b7d2";

// ── Facebook Pixel ─────────────────────────────────────────────
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "PLACEHOLDER";

export const fbq = (...args) => {
  if (typeof window !== "undefined" && window.fbq) window.fbq(...args);
};

// ── UTM Tracking ───────────────────────────────────────────────
export const getUTM = () => {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    source:   p.get("utm_source")   || "",
    medium:   p.get("utm_medium")   || "",
    campaign: p.get("utm_campaign") || "",
    content:  p.get("utm_content")  || "",
    term:     p.get("utm_term")     || "",
  };
};

export const saveUTM = () => {
  const utm = getUTM();
  if (utm.source && typeof window !== "undefined") {
    try { sessionStorage.setItem("utm", JSON.stringify(utm)); } catch {}
  }
};

export const getSavedUTM = () => {
  try {
    return JSON.parse(sessionStorage.getItem("utm") || "{}");
  } catch { return {}; }
};

// ── Cookie helpers (survives Edge Tracking Prevention) ─────────
// These are the canonical read/write functions for the auth token.
// localStorage and sessionStorage are used as secondary fallbacks only.

const TOKEN_COOKIE = "afrizone_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function writeCookieToken(tok: string) {
  try {
    document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(tok)}; path=/; max-age=${TOKEN_MAX_AGE}; SameSite=Lax`;
  } catch {}
}

function readCookieToken(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)afrizone_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

function clearCookieToken() {
  try {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
}

// Reads token from cookie first, then falls back to lib/api's loadStoredToken
// (which checks localStorage). This order is important — cookies survive
// Edge's Tracking Prevention; localStorage does not when navigating cross-page.
function resolveStoredToken(): string | null {
  const cookieTok = readCookieToken();
  if (cookieTok) return cookieTok;
  try { return loadStoredToken(); } catch { return null; }
}

// ── Pages that skip the install wall ───────────────────────────
const WALL_BYPASS_PAGES = [
  "/download",
  "/install",
  "/login",
  "/register",
  "/reset-password",
];

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prefer cookie token so Edge Tracking Prevention doesn't break auth
    const stored = resolveStoredToken();
    if (stored) {
      setToken(stored);
      setAuthToken(stored);
      // Also backfill the cookie in case it was only in localStorage
      writeCookieToken(stored);
      authAPI.me()
        .then((res) => setUser(res.data))
        .catch((err) => {
          if (err.response?.status === 401) {
            // Token is invalid/expired — clear everything
            clearCookieToken();
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (tok: string, userData: any) => {
    setAuthToken(tok);
    setToken(tok);
    setUser(userData);
    // Write to cookie — this is the primary storage, safe from Edge Tracking Prevention
    writeCookieToken(tok);
    // Also write to sessionStorage as secondary fallback
    try { sessionStorage.setItem("az_tok", tok); } catch {}
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    clearCookieToken();
    try { sessionStorage.removeItem("az_tok"); } catch {}
    try { localStorage.removeItem("afrizone_token"); } catch {}
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── PWA Install Wall (Temu-style) ──────────────────────────────
function useMobileInstallWall() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    const skipped = localStorage.getItem("pwa-skipped");
    if (skipped) return;

    const path = router.pathname;
    const isBypassPage = WALL_BYPASS_PAGES.some((p) => path.startsWith(p));
    if (isBypassPage) return;

    router.replace("/download");
  }, [router.pathname]);
}

// ── Soft install banner ────────────────────────────────────────
function PWAInstallBanner() {
  const [prompt, setPrompt] = React.useState(null);
  const [show, setShow] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const skipped = localStorage.getItem("pwa-skipped");
    if (!skipped) return;

    const bannerDismissed = localStorage.getItem("pwa-banner-dismissed");
    if (bannerDismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      setTimeout(() => setShow(true), 5000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 9999,
      background: "#1A5C38", color: "white", borderRadius: 16,
      padding: "14px 16px", display: "flex", alignItems: "center",
      justifyContent: "space-between", boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
      maxWidth: 500, margin: "0 auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/icons/icon-72x72.png" style={{ width: 44, height: 44, borderRadius: 10 }} alt="Afrizone" />
        <div>
          <p style={{ fontWeight: 900, margin: 0, fontSize: 14 }}>Install Afrizone App</p>
          {isIOS
            ? <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong></p>
            : <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Shop faster · Works offline · Free</p>
          }
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={dismiss} style={{
          background: "rgba(255,255,255,0.15)", border: "none", color: "white",
          padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12,
        }}>Later</button>
        {!isIOS && prompt && (
          <button onClick={async () => { await prompt.prompt(); dismiss(); }} style={{
            background: "#FFD700", border: "none", color: "#1A5C38",
            padding: "6px 14px", borderRadius: 8, cursor: "pointer",
            fontWeight: 900, fontSize: 12,
          }}>
            Install
          </button>
        )}
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useMobileInstallWall();

  useEffect(() => {
    saveUTM();

    const handleRouteChange = (url) => {
      fbq("track", "PageView");
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_ID, { page_path: url });
      }
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);

  return (
    <AuthProvider>

      {/* ── Google Analytics ── */}
      <Script
        src={"https://www.googletagmanager.com/gtag/js?id=" + GA_ID}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { page_path: window.location.pathname });
        `}
      </Script>

      {/* ── Microsoft Clarity ── */}
      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `}
      </Script>

      {/* ── Facebook Pixel ── */}
      {FB_PIXEL_ID && FB_PIXEL_ID !== "PLACEHOLDER" && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img height="1" width="1" style={{ display: "none" }}
              src={"https://www.facebook.com/tr?id=" + FB_PIXEL_ID + "&ev=PageView&noscript=1"}
              alt="" />
          </noscript>
        </>
      )}

      <Component {...pageProps} />
      <PWAInstallBanner />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </AuthProvider>
  );
}