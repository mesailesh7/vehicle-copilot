"use client";

import React, { useState } from "react";
import { Car, Plus, ChevronDown, Check, X, ShieldAlert } from "lucide-react";
import { Vehicle, VehicleCreate } from "../types";

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number) => void;
  onAddVehicle: (vehicle: VehicleCreate) => Promise<void>;
}

export default function VehicleSelector({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  onAddVehicle,
}: VehicleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Form State
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!make.trim() || !model.trim() || !year || !currentMileage) {
      setError("Please fill in all required fields.");
      return;
    }

    if (isNaN(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear() + 1) {
      setError("Please enter a valid year.");
      return;
    }

    if (isNaN(Number(currentMileage)) || Number(currentMileage) < 0) {
      setError("Please enter a valid mileage.");
      return;
    }

    setLoading(true);
    try {
      await onAddVehicle({
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        vin: vin.trim() || undefined,
        current_mileage: Number(currentMileage),
      });

      // Clear fields and close
      setMake("");
      setModel("");
      setYear("");
      setVin("");
      setCurrentMileage("");
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add vehicle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
      {/* Selector and Dropdown */}
      <div className="relative flex items-center gap-3">
        <div className="bg-cyan-500/10 p-2.5 rounded-lg border border-cyan-500/20">
          <Car className="w-6 h-6 text-cyan-400" />
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Vehicle</span>
          
          {vehicles.length === 0 ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-0.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              No vehicles found. Add one now <Plus className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="mt-0.5 flex items-center gap-1.5 text-base font-bold text-white hover:text-slate-200 transition focus:outline-none"
              >
                {activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : "Select Vehicle"}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                  <div className="absolute left-0 mt-2 w-64 bg-slate-950 border border-slate-800 rounded-lg shadow-xl py-1 z-20">
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          onSelectVehicle(v.id);
                          setIsOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between transition hover:bg-slate-900 ${
                          v.id === selectedVehicleId ? "text-cyan-400 font-semibold bg-slate-900/50" : "text-slate-300"
                        }`}
                      >
                        <span>
                          {v.year} {v.make} {v.model}
                        </span>
                        {v.id === selectedVehicleId && <Check className="w-4 h-4 text-cyan-400" />}
                      </button>
                    ))}
                    <div className="border-t border-slate-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setIsModalOpen(true);
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-2 text-sm text-left text-cyan-400 hover:bg-slate-900 font-medium flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Vehicle
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Vehicle Info Badge */}
      {activeVehicle && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-lg text-sm text-slate-300">
          <span className="font-semibold text-white">
            {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-cyan-400 font-mono">
            {activeVehicle.current_mileage.toLocaleString()} mi
          </span>
          {activeVehicle.vin && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">
                VIN: {activeVehicle.vin}
              </span>
            </>
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-400" />
                Add New Vehicle
              </h3>
              <button
                onClick={() => {
                  if (vehicles.length > 0) setIsModalOpen(false);
                }}
                disabled={vehicles.length === 0}
                className={`rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-850 transition ${
                  vehicles.length === 0 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {vehicles.length === 0 && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs p-3 rounded-lg flex gap-2 items-start">
                  <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Welcome to Vehicle Copilot!</span>
                    <p className="mt-0.5 text-slate-300">Please add your first vehicle to unlock the diagnostic history, manual uploading, and the AI copilot chat.</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RAV4"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    placeholder="e.g. 2022"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Mileage (mi) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45200"
                    value={currentMileage}
                    onChange={(e) => setCurrentMileage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  VIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2T3F1..."
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex gap-3">
                {vehicles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-350 font-medium py-2 rounded-lg transition text-sm text-center"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded-lg transition text-sm flex items-center justify-center gap-1.5"
                >
                  {loading ? "Adding..." : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
