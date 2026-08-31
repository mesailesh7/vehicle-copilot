"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Cpu, Sparkles, Plus, CheckCircle, HelpCircle, Activity, Thermometer, Gauge, AlertTriangle, FileText, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Vehicle } from "../types";
import { API_BASE_URL, getAuthHeaders } from "../utils/api";

interface DtcScannerProps {
  vehicle: Vehicle;
}

export default function DtcScanner({ vehicle }: DtcScannerProps) {
  const [dtcCode, setDtcCode] = useState("");
  const [rpm, setRpm] = useState("");
  const [coolantTemp, setCoolantTemp] = useState("");
  const [fuelTrim, setFuelTrim] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState("");

  // Scan & Analysis states
  const [activeScanId, setActiveScanId] = useState<number | null>(null);
  const [analysisText, setAnalysisText] = useState("");

  // Resolution modal state
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [symptom, setSymptom] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [confirmedFix, setConfirmedFix] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState(false);

  // Dynamic DTC Severity Badge calculation
  useEffect(() => {
    const code = dtcCode.toUpperCase().trim();
    if (!code) {
      setSeverity("");
      return;
    }
    if (code.startsWith("P03") || code.startsWith("P02") || code.startsWith("P00")) {
      setSeverity("Critical Engine Fault");
    } else if (code.startsWith("P04") || code.startsWith("P01") || code.startsWith("P05")) {
      setSeverity("Emissions Warning");
    } else if (code.startsWith("B") || code.startsWith("C") || code.startsWith("U")) {
      setSeverity("Body/Chassis/Network");
    } else {
      setSeverity("General Diagnostics Alert");
    }
  }, [dtcCode]);

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "Critical Engine Fault":
        return "text-red-400 bg-red-950/40 border border-red-500/30";
      case "Emissions Warning":
        return "text-amber-400 bg-amber-950/40 border border-amber-500/30";
      case "Body/Chassis/Network":
        return "text-indigo-400 bg-indigo-950/40 border border-indigo-500/30";
      default:
        return "text-cyan-400 bg-cyan-950/40 border border-cyan-500/30";
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtcCode.trim()) return;

    setError("");
    setLoading(true);
    setAnalysisText("");
    setActiveScanId(null);

    try {
      // 1. Submit DTC Scan
      const scanRes = await fetch(`${API_BASE_URL}/inspections/dtc-scan/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          dtc_code: dtcCode.toUpperCase().trim(),
          rpm: rpm ? Number(rpm) : null,
          coolant_temp: coolantTemp ? Number(coolantTemp) : null,
          fuel_trim: fuelTrim ? Number(fuelTrim) : null,
        }),
      });

      if (!scanRes.ok) {
        const errData = await scanRes.json().catch(() => ({ detail: "Failed to log DTC code." }));
        throw new Error(errData.detail || "Failed to log DTC code.");
      }

      const scan = await scanRes.json();
      setActiveScanId(scan.id);

      // 2. Query Copilot analysis
      const analysisRes = await fetch(`${API_BASE_URL}/inspections/dtc-scan/${scan.id}/analyze/`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!analysisRes.ok) {
        const errData = await analysisRes.json().catch(() => ({ detail: "Failed to compile Master Tech diagnostics roadmap." }));
        throw new Error(errData.detail || "Failed to compile Master Tech diagnostics roadmap.");
      }

      const analysis = await analysisRes.json();
      setAnalysisText(analysis.analysis);
    } catch (err: any) {
      setError(err.message || "An unexpected diagnostics error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim() || !rootCause.trim() || !confirmedFix.trim()) return;

    setResolveLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/resolve-and-learn/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          scan_id: activeScanId,
          dtc_code: dtcCode.toUpperCase().trim(),
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          reported_symptom: symptom.trim(),
          root_cause: rootCause.trim(),
          confirmed_fix: confirmedFix.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Failed to index fix report." }));
        throw new Error(errData.detail || "Failed to index fix report.");
      }

      setResolveSuccess(true);
      setTimeout(() => {
        setIsResolveOpen(false);
        setResolveSuccess(false);
        // Reset states
        setDtcCode("");
        setRpm("");
        setCoolantTemp("");
        setFuelTrim("");
        setAnalysisText("");
        setActiveScanId(null);
        setSymptom("");
        setRootCause("");
        setConfirmedFix("");
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setResolveLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-lg font-bold text-white">OBD-II DTC Inspection</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900 px-2 py-1 rounded border border-slate-850">
          <Cpu className="w-3.5 h-3.5 text-cyan-500" />
          <span>Scanner Center</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* OBD-II input Form */}
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DTC input */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                DTC Fault Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. P0300"
                  value={dtcCode}
                  onChange={(e) => setDtcCode(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 transition font-mono uppercase"
                />
              </div>
              {severity && (
                <div className={`mt-2 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityStyle(severity)}`}>
                  {severity}
                </div>
              )}
            </div>

            {/* Freeze Frame inputs */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Freeze Frame Diagnostics
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <Gauge className="absolute left-2 top-2.5 w-3.5 h-3.5 text-slate-550" />
                  <input
                    type="number"
                    placeholder="RPM"
                    value={rpm}
                    onChange={(e) => setRpm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div className="relative">
                  <Thermometer className="absolute left-2 top-2.5 w-3.5 h-3.5 text-slate-550" />
                  <input
                    type="number"
                    placeholder="Temp °C"
                    value={coolantTemp}
                    onChange={(e) => setCoolantTemp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div className="relative">
                  <Activity className="absolute left-2 top-2.5 w-3.5 h-3.5 text-slate-550" />
                  <input
                    type="number"
                    placeholder="Trim %"
                    value={fuelTrim}
                    onChange={(e) => setFuelTrim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !dtcCode.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-550 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/5"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Analyzing Freeze Frame Data..." : "Analyze with Copilot"}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* AI Diagnostics Analysis display */}
        {loading && (
          <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-lg space-y-3 animate-pulse">
            <div className="h-4 bg-slate-850 rounded w-1/3" />
            <div className="h-3 bg-slate-850 rounded w-full" />
            <div className="h-3 bg-slate-850 rounded w-4/5" />
            <div className="h-3 bg-slate-850 rounded w-5/6" />
          </div>
        )}

        {analysisText && (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <h3 className="text-xs font-bold uppercase text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Pinpoint Diagnostics Roadmap
                </h3>
                <button
                  onClick={() => setIsResolveOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Mark Resolved
                </button>
              </div>

              <div className="prose prose-invert prose-xs text-slate-350 max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:p-3 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-800">
                <ReactMarkdown>{analysisText}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resolution Submission Modal */}
      {isResolveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Resolve Repair & Index Fix
              </h3>
              <button
                onClick={() => setIsResolveOpen(false)}
                className="rounded-lg p-1 text-slate-450 hover:text-white hover:bg-slate-850 transition"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
              {resolveSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-lg flex flex-col items-center justify-center text-center gap-2">
                  <Check className="w-8 h-8 bg-emerald-950 p-1.5 rounded-full border border-emerald-800" />
                  <div>
                    <span className="font-bold">Fix Logged & Vectorized!</span>
                    <p className="mt-1 text-slate-300">This repair is now live in the Shop Knowledge Base index.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-950 px-3 py-2 rounded border border-slate-850 text-xs text-slate-300 space-y-1">
                    <p><strong>DTC Code:</strong> {dtcCode.toUpperCase()}</p>
                    <p><strong>Vehicle:</strong> {vehicle.year} {vehicle.make} {vehicle.model}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Reported Symptom *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rough idle, flashing check engine light"
                      value={symptom}
                      onChange={(e) => setSymptom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Root Cause *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Failed cylinder 3 ignition coil pack"
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Confirmed Fix *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Replaced ignition coil on cyl 3 and spark plugs. Cleared DTC codes."
                      value={confirmedFix}
                      onChange={(e) => setConfirmedFix(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500 transition resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsResolveOpen(false)}
                      className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-350 font-medium py-2 rounded-lg transition text-sm text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resolveLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition text-sm flex items-center justify-center gap-1.5"
                    >
                      {resolveLoading ? "Indexing..." : "Submit Fix"}
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
