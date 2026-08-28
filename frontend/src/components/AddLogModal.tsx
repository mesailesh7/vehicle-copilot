"use client";

import React, { useState } from "react";
import { X, Calendar, Wrench, DollarSign, FileText, Layers, RefreshCw } from "lucide-react";
import { ServiceLogCreate } from "../types";

interface AddLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: number;
  onSubmit: (log: ServiceLogCreate) => Promise<void>;
}

const CATEGORIES = [
  "Oil Change",
  "Brakes",
  "Diagnostics",
  "Tires",
  "Transmission",
  "Engine",
  "Battery",
  "Suspension",
  "Other",
];

export default function AddLogModal({ isOpen, onClose, vehicleId, onSubmit }: AddLogModalProps) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [mileageAtService, setMileageAtService] = useState("");
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().substring(0, 16) // Format for datetime-local: YYYY-MM-DDTHH:mm
  );
  const [description, setDescription] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!mileageAtService || isNaN(Number(mileageAtService))) {
      setError("Please enter a valid mileage.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    const finalCategory = category === "Other" && customCategory.trim() ? customCategory.trim() : category;

    setLoading(true);
    try {
      await onSubmit({
        vehicle_id: vehicleId,
        service_date: serviceDate ? new Date(serviceDate).toISOString() : undefined,
        mileage_at_service: Number(mileageAtService),
        category: finalCategory,
        description: description.trim(),
        parts_replaced: partsReplaced.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        notes: notes.trim() || undefined,
      });
      // Reset form
      setMileageAtService("");
      setDescription("");
      setPartsReplaced("");
      setCost("");
      setNotes("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save maintenance record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Background backdrop blur */}
        <div 
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
          onClick={onClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
          <div className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out">
            <div className="flex h-full flex-col bg-slate-900 border-l border-slate-800 shadow-2xl text-slate-100">
              {/* Header */}
              <div className="px-6 py-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-cyan-400" />
                    New Service Log
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Document a service event to update your vehicle history.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Service Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                    Service Date
                  </label>
                  <input
                    type="datetime-local"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* Mileage */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-500" />
                    Mileage at Service (mi) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45000"
                    value={mileageAtService}
                    onChange={(e) => setMileageAtService(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-500" />
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {category === "Other" && (
                    <input
                      type="text"
                      required
                      placeholder="Specify custom category"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-500" />
                    Description / Service Performed *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full synthetic engine oil & filter change"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* Parts Replaced */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Parts Replaced
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fram CH11955 Oil Filter, Mobil1 0W-20"
                    value={partsReplaced}
                    onChange={(e) => setPartsReplaced(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-cyan-500" />
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 84.50"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Notes / Comments
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Additional details, fluid type used, or next recommended action..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition resize-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-800 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 font-medium py-2 rounded-lg transition text-sm text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded-lg transition text-sm flex items-center justify-center gap-1.5"
                  >
                    {loading ? "Saving..." : "Add Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
