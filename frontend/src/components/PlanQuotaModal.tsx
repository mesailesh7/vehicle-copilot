"use client";

import React from "react";
import { X, Sparkles, ArrowRight, ShieldAlert, Check } from "lucide-react";

interface PlanQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToBilling: () => void;
  message?: string;
}

export default function PlanQuotaModal({
  isOpen,
  onClose,
  onGoToBilling,
  message = "You have reached the maximum vehicle profile capacity for your current workshop plan.",
}: PlanQuotaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl text-slate-950 shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Workshop Fleet Quota Reached</h3>
            <span className="text-[10px] uppercase font-bold text-amber-400 font-mono">Plan Capacity Limit</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {message}
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Upgrading your plan unlocks:
          </span>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Up to 50 or Unlimited Vehicle Workspaces</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Additional Technician & Advisor Team Seats</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Vector PDF Manual RAG & Shop Fixes Knowledge Base</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToBilling();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition shadow-lg shadow-cyan-600/10 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade Tier</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
