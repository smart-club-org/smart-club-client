// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiGet("/auth/me");
        if (!mounted) return;
        if (res.ok && res.data) {
          setUser(res.data);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const login = (userObj) => setUser(userObj);

  const doLogin = async (credentials) => {
    const res = await apiPost("/auth/login", credentials);
    if (!res.ok) {
      const reason = res.data?.error ?? `HTTP ${res.status}`;
      throw new Error(reason);
    }
    setUser(res.data);
    return res.data;
  };

  const register = async (payload) => {
    const res = await apiPost("/auth/register", payload);
    if (!res.ok) {
      const reason = res.data?.error ?? `HTTP ${res.status}`;
      throw new Error(reason);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await apiPost("/auth/logout", {});
    } catch (e) {
      console.warn("Logout request failed", e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, doLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
