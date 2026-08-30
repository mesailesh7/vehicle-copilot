"use client";

import React, { useState, useEffect } from "react";
import { Search, Tag, BookOpen, AlertTriangle, User, FileText, CheckCircle, Clock, Plus, HelpCircle, X } from "lucide-react";
import { Vehicle } from "../types";

interface FixItem {
  id: number;
  dtc_code: string;
  make: string;
  model: string;
  year: number;
  reported_symptom: string;
  root_cause: string;
  confirmed_fix: string;
  created_at: string;
}

export default function KnowledgeBase() {
  const [fixes, setFixes] = useState<FixItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Standalone Add Fix Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dtcCode, setDtcCode] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [symptom, setSymptom] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [confirmedFix, setConfirmedFix] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    fetchFixes();
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchFixes(search);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const fetchFixes = async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const url = query
        ? `http://localhost:8000/api/v1/inspections/knowledge-base/?q=${encodeURIComponent(query)}`
        : "http://localhost:8000/api/v1/inspections/knowledge-base/";
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch past repairs feed.");
      }
      const data = await response.json();
      setFixes(data);
    } catch (err: any) {
      setError(err.message || "Could not retrieve knowledge base fixes.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtcCode.trim() || !make.trim() || !model.trim() || !year || !symptom.trim() || !rootCause.trim() || !confirmedFix.trim()) return;

    setAddLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/inspections/resolve-and-learn/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dtc_code: dtcCode.toUpperCase().trim(),
          make: make.trim(),
          model: model.trim(),
          year: Number(year),
          reported_symptom: symptom.trim(),
          root_cause: rootCause.trim(),
          confirmed_fix: confirmedFix.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit standalone fix.");
      }

      setAddSuccess(true);
      fetchFixes(search);
      setTimeout(() => {
        setIsAddOpen(false);
        setAddSuccess(false);
        // Clear inputs
        setDtcCode("");
        setMake("");
        setModel("");
        setYear("");
        setSymptom("");
        setRootCause("");
        setConfirmedFix("");
      }, 1500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Shop Knowledge Base</h2>
          <span className="bg-slate-800 text-slate-350 text-xs px-2 py-0.5 rounded-full font-mono">
            {fixes.length} fixes
          </span>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Repair
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800/80">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by code, symptoms, fix, make or model (semantic vectors search)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-650 focus:outline-none focus:border-cyan-650 transition"
          />
        </div>
      </div>

      {/* Repairs List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading && fixes.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-950/40 border border-slate-850 p-4 rounded-lg space-y-3 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-800 rounded w-5/6" />
            </div>
          ))
        ) : fixes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
            <HelpCircle className="w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-350">No shop fixes documented</h3>
            <p className="text-xs text-slate-550 max-w-xs mt-1">
              There are no matching repair records indexed for the given query. Start logging repair summaries.
            </p>
          </div>
        ) : (
          fixes.map((fix) => (
            <div
              key={fix.id}
              className="bg-slate-950/40 hover:bg-slate-950/75 border border-slate-850 hover:border-slate-800 p-4 rounded-lg transition duration-150 flex flex-col gap-3 text-slate-300 group"
            >
              {/* Badge Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-400 font-mono uppercase">
                    DTC {fix.dtc_code}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {fix.year} {fix.make} {fix.model}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(fix.created_at)}
                </div>
              </div>

              {/* Grid content fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-t border-slate-850/60 pt-2">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                    Reported Symptom
                  </span>
                  <p className="text-slate-300">{fix.reported_symptom}</p>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                    Root Cause
                  </span>
                  <p className="text-slate-300">{fix.root_cause}</p>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1 text-emerald-400">
                    Confirmed Fix
                  </span>
                  <p className="text-emerald-300 font-medium">{fix.confirmed_fix}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Standalone Modal for logging manual repair */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Submit Fix Report
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1 text-slate-450 hover:text-white hover:bg-slate-850 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-lg flex flex-col items-center justify-center text-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <div>
                    <span className="font-bold">Fix Submitted!</span>
                    <p className="mt-1 text-slate-300">Successfully added to shop database and search vector indexes.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        DTC Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. P0442"
                        value={dtcCode}
                        onChange={(e) => setDtcCode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Vehicle Year *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 2018"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Make *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ford"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Model *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. F-150"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Reported Symptom *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Check engine light, EVAP system code"
                      value={symptom}
                      onChange={(e) => setSymptom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Root Cause *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Microcrack on plastic EVAP purge valve housing"
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Confirmed Fix *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Replaced EVAP canister purge solenoid valve assembly."
                      value={confirmedFix}
                      onChange={(e) => setConfirmedFix(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-350 font-medium py-2 rounded-lg transition text-sm text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded-lg transition text-sm flex items-center justify-center"
                    >
                      {addLoading ? "Submitting..." : "Submit Fix"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
