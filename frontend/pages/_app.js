import React from 'react';
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { authAPI, setAuthToken, loadStoredToken } from "../lib/api";
import "../styles/globals.css";

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
    sessionStorage.setItem("utm", JSON.stringify(utm));
  }
};

export const getSavedUTM = () => {
  try {
    return JSON.parse(sessionStorage.getItem("utm") || "{}");
  } catch { return {}; }
};

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredToken();
    if (stored) {
      setToken(stored);
      setAuthToken(stored); // sync to _memoryToken so axios interceptor sends it
      authAPI.me()
        .then((res) => setUser(res.data))
        .catch((err) => {
          if (err.response?.status === 401) {
            // Token is expired/invalid — clear everything cleanly
            setAuthToken(null);
            setToken(null);
            setUser(null);
          }
          // For network errors (no err.response), keep token — may be temporary
          // setUser stays null so user appears logged out until next successful /me
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (tok, userData) => {
    setAuthToken(tok);
    setToken(tok);
    setUser(userData);
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// PWA Install prompt
function PWAInstallBanner() {
  const [prompt, setPrompt] = React.useState(null);
  const [show, setShow] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    
    const alreadyDismissed = localStorage.getItem("pwa-dismissed");
    if (alreadyDismissed) return;

    // Android/Chrome install prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari - show manual instructions
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      setTimeout(() => setShow(true), 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-dismissed", "1");
  };

  if (!show || dismissed) return null;

  return (
    <div style={{position:"fixed",bottom:16,left:16,right:16,zIndex:9999,background:"#1A5C38",color:"white",borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 8px 30px rgba(0,0,0,0.35)",maxWidth:500,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <img src="/icons/icon-72x72.png" style={{width:44,height:44,borderRadius:10}} alt="Afrizone" />
        <div>
          <p style={{fontWeight:900,margin:0,fontSize:14}}>Install Afrizone App</p>
          {isIOS
            ? <p style={{margin:0,fontSize:11,opacity:0.85}}>Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong></p>
            : <p style={{margin:0,fontSize:11,opacity:0.85}}>Shop faster · Works offline · Free</p>
          }
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexShrink:0}}>
        <button onClick={dismiss} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"white",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12}}>Later</button>
        {!isIOS && (
          <button onClick={async () => { await prompt.prompt(); dismiss(); }} style={{background:"#FFD700",border:"none",color:"#1A5C38",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:900,fontSize:12}}>
            Install
          </button>
        )}
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Save UTM params when user first lands
    saveUTM();

    // Track page views on route change
    const handleRouteChange = (url) => {
      fbq("track", "PageView");
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router.events]);

  return (
    <AuthProvider>
      {/* Facebook Pixel */}
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
            <img height="1" width="1" style={{display:"none"}}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              alt="" />
          </noscript>
        </>
      )}
      <Component {...pageProps} />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </AuthProvider>
  );
}
