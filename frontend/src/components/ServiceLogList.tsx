"use client";

import React, { useState } from "react";
import { Wrench, Calendar, Tag, DollarSign, Layers, Plus, Search, HelpCircle, FileText, Ban } from "lucide-react";
import { ServiceLog } from "../types";

interface ServiceLogListProps {
  logs: ServiceLog[];
  onOpenAddModal: () => void;
  isLoading: boolean;
}

export default function ServiceLogList({ logs, onOpenAddModal, isLoading }: ServiceLogListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Get unique categories for filter
  const categories = ["All", ...Array.from(new Set(logs.map((log) => log.category)))];

  const getCategoryBadgeStyle = (category: string) => {
    switch (category.toLowerCase()) {
      case "oil change":
        return "text-amber-400 bg-amber-400/10 border-amber-400/25";
      case "brakes":
        return "text-red-400 bg-red-400/10 border-red-400/25";
      case "diagnostics":
        return "text-purple-400 bg-purple-400/10 border-purple-400/25";
      case "tires":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/25";
      case "transmission":
        return "text-blue-400 bg-blue-400/10 border-blue-400/25";
      case "engine":
        return "text-orange-400 bg-orange-400/10 border-orange-400/25";
      case "battery":
        return "text-pink-400 bg-pink-400/10 border-pink-400/25";
      case "suspension":
        return "text-indigo-400 bg-indigo-400/10 border-indigo-400/25";
      default:
        return "text-slate-400 bg-slate-400/10 border-slate-400/25";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cost);
  };

  // Filter & Search Logs
  const filteredLogs = logs
    .filter((log) => {
      const matchesCategory = selectedCategory === "All" || log.category === selectedCategory;
      const matchesSearch =
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.parts_replaced && log.parts_replaced.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header Panel */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Service History</h2>
          <span className="bg-slate-800 text-slate-350 text-xs px-2 py-0.5 rounded-full font-mono">
            {logs.length}
          </span>
        </div>
        <button
          onClick={onOpenAddModal}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Log
        </button>
      </div>

      {/* Filter and Search Bar */}
      {logs.length > 0 && (
        <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search description or parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-650 focus:outline-none focus:border-cyan-650 transition"
            />
          </div>

          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-650 transition"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {isLoading ? (
          // Skeleton Loader
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4 rounded-lg space-y-3 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="h-4 bg-slate-800 rounded w-2/5"></div>
                <div className="h-5 bg-slate-800 rounded w-16"></div>
              </div>
              <div className="h-3 bg-slate-800 rounded w-full"></div>
              <div className="h-3 bg-slate-800 rounded w-4/5"></div>
              <div className="flex gap-4 pt-1">
                <div className="h-3 bg-slate-800 rounded w-20"></div>
                <div className="h-3 bg-slate-800 rounded w-24"></div>
              </div>
            </div>
          ))
        ) : filteredLogs.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
            <Ban className="w-10 h-10 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-350">No logs found</h3>
            <p className="text-xs text-slate-550 max-w-xs mt-1">
              {logs.length === 0
                ? "This vehicle has no registered service events. Log a service now."
                : "No logs matched your active search or category filters."}
            </p>
            {logs.length === 0 && (
              <button
                onClick={onOpenAddModal}
                className="mt-4 bg-slate-800 hover:bg-slate-750 border border-slate-750 text-cyan-400 text-xs font-semibold py-2 px-4 rounded-lg transition"
              >
                Log First Service
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-950/40 hover:bg-slate-950/70 border border-slate-850 hover:border-slate-800/80 p-4 rounded-lg transition duration-200 group flex flex-col gap-2.5 text-slate-300"
            >
              {/* Header: Date and Badge */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatDate(log.service_date)}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-wider ${getCategoryBadgeStyle(
                    log.category
                  )}`}
                >
                  {log.category}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {log.description}
                </h4>
              </div>

              {/* Parts Replaced */}
              {log.parts_replaced && (
                <div className="text-xs flex gap-1.5 items-start">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider mt-0.5">Parts:</span>
                  <span className="text-slate-400 bg-slate-900/60 border border-slate-850 px-2 py-0.5 rounded">
                    {log.parts_replaced}
                  </span>
                </div>
              )}

              {/* Cost & Mileage Footer */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-slate-850/60 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-650" />
                  <span>Mileage: </span>
                  <span className="font-semibold text-slate-300 font-mono">
                    {log.mileage_at_service.toLocaleString()} mi
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-650" />
                  <span>Cost: </span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {formatCost(log.cost)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {log.notes && (
                <div className="mt-1 p-2 bg-slate-900/40 border border-slate-900 rounded text-xs text-slate-400 italic">
                  <FileText className="w-3 h-3 text-slate-600 inline mr-1 -mt-0.5" />
                  {log.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
