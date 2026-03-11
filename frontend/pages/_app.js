import React from 'react';
import { createContext, useContext, useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import Cookies from "js-cookie";
import { authAPI } from "../lib/api";
import "../styles/globals.css";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// Store token in BOTH localStorage (mobile) and cookie (desktop)
function saveToken(token) {
  try { localStorage.setItem("afrizone_token", token); } catch {}
  try {
    const isProduction = window.location.protocol === "https:";
    Cookies.set("afrizone_token", token, {
      expires: 7,
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction,
    });
  } catch {}
}

function getToken() {
  try {
    return localStorage.getItem("afrizone_token") || Cookies.get("afrizone_token") || null;
  } catch {
    return Cookies.get("afrizone_token") || null;
  }
}

function clearToken() {
  try { localStorage.removeItem("afrizone_token"); } catch {}
  try { Cookies.remove("afrizone_token"); } catch {}
  try { Cookies.remove("token"); } catch {}
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // CRITICAL: Re-save to localStorage immediately so axios interceptor
      // can find it for all subsequent API calls (fixes iOS Safari cookie blocking)
      try { localStorage.setItem("afrizone_token", token); } catch {}
      authAPI.me()
        .then((res) => setUser(res.data))
        .catch(() => {
          clearToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    saveToken(token);
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
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
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </AuthProvider>
  );
}