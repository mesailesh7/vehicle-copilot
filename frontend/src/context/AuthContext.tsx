"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: number;
  username: string;
  role: "technician" | "service_advisor" | "owner";
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  setRoleDemo: (role: "technician" | "service_advisor" | "owner") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) {
      const decoded = parseJwt(savedToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setToken(savedToken);
        setUser({
          id: Number(decoded.sub),
          username: decoded.username,
          role: decoded.role,
        });
      } else {
        localStorage.removeItem("auth_token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch("http://localhost:8000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }

    const data = await response.json();
    localStorage.setItem("auth_token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    router.push("/");
  };

  const signup = async (username: string, password: string, role: string) => {
    const response = await fetch("http://localhost:8000/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Signup failed" }));
      throw new Error(err.detail || "Signup failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const setRoleDemo = (role: "technician" | "service_advisor" | "owner") => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  const value: AuthContextType = {
    token,
    user,
    isAuthenticated: !!token,
    loading,
    login,
    signup,
    logout,
    setRoleDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
