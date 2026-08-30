"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ChevronDown, Check, UserCheck, ShieldAlert, Wrench, FileText } from "lucide-react";

export default function RoleSwitcher() {
  const { user, setRoleDemo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const roles = [
    { value: "technician", label: "Technician", icon: Wrench, color: "text-cyan-400 border-cyan-800/40 bg-cyan-950/40" },
    { value: "service_advisor", label: "Service Advisor", icon: FileText, color: "text-amber-400 border-amber-800/40 bg-amber-950/40" },
    { value: "owner", label: "Shop Owner", icon: UserCheck, color: "text-emerald-400 border-emerald-800/40 bg-emerald-950/40" },
  ] as const;

  const current = roles.find((r) => r.value === user.role) || roles[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold font-mono transition focus:outline-none ${current.color}`}
      >
        <current.icon className="w-3.5 h-3.5" />
        <span>ROLE: {current.label.toUpperCase()}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-lg shadow-xl py-1.5 z-50">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-850 mb-1 pb-1">
              Demo Switcher
            </div>
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setRoleDemo(r.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between transition hover:bg-slate-900 ${
                  user.role === r.value ? "text-white font-bold bg-slate-900/60" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <r.icon className="w-3.5 h-3.5" />
                  <span>{r.label}</span>
                </div>
                {user.role === r.value && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
