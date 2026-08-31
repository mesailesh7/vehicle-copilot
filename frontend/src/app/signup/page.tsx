"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Car, Lock, User, AlertCircle, Building2, KeyRound, Sparkles, Check } from "lucide-react";
import { UserRole } from "../../types";

function SignupContent() {
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"new_shop" | "invite">("new_shop");

  // New Shop fields
  const [shopName, setShopName] = useState("");
  const [planTier, setPlanTier] = useState("pro");

  // Join Invite fields
  const [inviteCode, setInviteCode] = useState("");

  // Common User fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase());
      setMode("invite");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "new_shop") {
        if (!shopName.trim()) {
          throw new Error("Please provide a Workshop Name.");
        }
        await signup({
          username,
          password,
          shopName: shopName.trim(),
          planTier,
          role: "owner",
        });
      } else {
        if (!inviteCode.trim()) {
          throw new Error("Please enter your workshop invitation code.");
        }
        await signup({
          username,
          password,
          inviteCode: inviteCode.trim().toUpperCase(),
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-2xl text-slate-950 shadow-lg shadow-cyan-500/10">
            <Car className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 justify-center">
              VEHICLE<span className="text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded text-xs font-mono">COPILOT</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Multi-Tenant Workshop Registration</p>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("new_shop")}
            className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === "new_shop" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>New Workshop</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("invite")}
            className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === "invite" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join via Invite</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Account registered successfully! Redirecting to login...</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === "new_shop" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                  Workshop / Shop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Apex Performance Auto"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  Initial Plan Tier
                </label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="starter">Starter Workshop ($49/mo - 15 Vehicles, 3 Seats)</option>
                  <option value="pro">Pro Workshop ($149/mo - 50 Vehicles, 10 Seats, Manual RAG)</option>
                  <option value="enterprise">Enterprise Fleet ($299/mo - Unlimited Vehicles & Seats)</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
                Workshop Invitation Code
              </label>
              <input
                type="text"
                required
                placeholder="TECH-XXXXXX or ADV-XXXXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm font-mono uppercase text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">Provided by your shop manager or administrator.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-500" />
              Username
            </label>
            <input
              type="text"
              required
              placeholder="alex_technician"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-500" />
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-cyan-500/10 flex justify-center items-center"
          >
            {loading ? "Registering..." : mode === "new_shop" ? "Create Workshop Account" : "Join Workshop"}
          </button>
        </form>

        {/* Login redirection */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-850">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-cyan-500 border-r-slate-800 border-b-slate-800 border-l-slate-800" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
