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

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </AuthProvider>
  );
}
