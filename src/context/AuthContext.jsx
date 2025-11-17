import React, { createContext, useContext, useEffect, useState } from "react";
import api, { BACKEND_URL } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // URL'deki ?token=... parametresini al ve temizle
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (token) {
      localStorage.setItem("auth_token", token);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Token varsa backend'den kimliğini doğrula
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setChecking(false);
      setUser(null);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/api/auth/me");
        if (data?.authenticated) setUser(data.user);
        else setUser(null);
      } catch {
        setUser(null);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, checking, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
