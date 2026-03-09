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

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("afrizone_token");
    if (token) {
      authAPI.me()
        .then((res) => setUser(res.data))
        .catch(() => {
          Cookies.remove("afrizone_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    // Use secure cookie settings for production
    const isProduction = window.location.protocol === "https:";
    Cookies.set("afrizone_token", token, {
      expires: 7,
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction,
    });
    setUser(userData);
  };

  const logout = () => {
    Cookies.remove("afrizone_token");
    Cookies.remove("token"); // remove old cookie too
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

  React.useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  return (
    <div style={{position:"fixed",bottom:16,left:16,right:16,zIndex:9999,background:"#1A5C38",color:"white",borderRadius:16,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 8px 30px rgba(0,0,0,0.3)",maxWidth:480,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28}}>🛍️</span>
        <div>
          <p style={{fontWeight:900,margin:0,fontSize:14}}>Install Afrizone App</p>
          <p style={{margin:0,fontSize:12,opacity:0.8}}>Shop faster, works offline</p>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={() => setShow(false)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12}}>Later</button>
        <button onClick={async () => { await prompt.prompt(); setShow(false); }} style={{background:"#FFD700",border:"none",color:"#1A5C38",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontWeight:900,fontSize:12}}>Install</button>
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