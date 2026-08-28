"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Car, Wrench, UploadCloud, AlertTriangle, ShieldAlert, Cpu, Layers } from "lucide-react";
import { Vehicle, VehicleCreate, ServiceLog, ServiceLogCreate } from "../types";
import { getVehicles, createVehicle, getLogs, createLog } from "../utils/api";
import VehicleSelector from "../components/VehicleSelector";
import ServiceLogList from "../components/ServiceLogList";
import AddLogModal from "../components/AddLogModal";
import CopilotChat from "../components/CopilotChat";
import ManualUploader from "../components/ManualUploader";

type TabType = "chat" | "history" | "uploader";

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  // Loading and Error States
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  // Fetch Vehicles on mount
  useEffect(() => {
    fetchVehiclesData();
  }, []);

  // Fetch logs whenever selected vehicle changes
  useEffect(() => {
    if (selectedVehicleId !== null) {
      fetchLogsData(selectedVehicleId);
    } else {
      setLogs([]);
    }
  }, [selectedVehicleId]);

  const fetchVehiclesData = async () => {
    setLoadingVehicles(true);
    setApiError("");
    try {
      const data = await getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        // Try to load last selected vehicle from localStorage, default to first vehicle
        const savedId = localStorage.getItem("selectedVehicleId");
        const exists = savedId && data.some((v) => v.id === Number(savedId));
        setSelectedVehicleId(exists ? Number(savedId) : data[0].id);
      }
    } catch (err: any) {
      setApiError("Could not connect to FastAPI server. Ensure it is running at http://localhost:8000");
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchLogsData = async (vehicleId: number) => {
    setLoadingLogs(true);
    try {
      const data = await getLogs(vehicleId);
      setLogs(data);
    } catch (err: any) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSelectVehicle = (id: number) => {
    setSelectedVehicleId(id);
    localStorage.setItem("selectedVehicleId", id.toString());
  };

  const handleAddVehicle = async (newVehicle: VehicleCreate) => {
    try {
      const created = await createVehicle(newVehicle);
      setVehicles((prev) => [...prev, created]);
      setSelectedVehicleId(created.id);
      localStorage.setItem("selectedVehicleId", created.id.toString());
    } catch (err: any) {
      throw new Error(err.message || "Failed to add new vehicle.");
    }
  };

  const handleAddLog = async (newLog: ServiceLogCreate) => {
    try {
      const created = await createLog(newLog);
      setLogs((prev) => [created, ...prev]);
      
      // Update local vehicle mileage if log mileage is higher
      if (selectedVehicleId) {
        setVehicles((prevVehicles) =>
          prevVehicles.map((v) => {
            if (v.id === selectedVehicleId && created.mileage_at_service > v.current_mileage) {
              return { ...v, current_mileage: created.mileage_at_service };
            }
            return v;
          })
        );
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to add service record.");
    }
  };

  const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl text-slate-950 shadow-lg shadow-cyan-500/10">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              VEHICLE<span className="text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded text-xs font-mono">COPILOT</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Predictive Fleet Diagnostics & AI Ingestion</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/20" />
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">System Ready</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto gap-5 overflow-hidden">
        
        {/* Backend offline error banner */}
        {apiError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex gap-3 items-center">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="text-xs md:text-sm">
              <span className="font-bold">Offline Connection Alert:</span> {apiError}
            </div>
            <button 
              onClick={fetchVehiclesData} 
              className="ml-auto bg-slate-900 hover:bg-slate-850 text-xs font-bold text-slate-350 px-3 py-1.5 border border-slate-800 rounded-lg transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Vehicle Selection Header */}
        <VehicleSelector
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
          onAddVehicle={handleAddVehicle}
        />

        {loadingVehicles ? (
          // Full Screen Skeleton Loader
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-cyan-500 border-r-slate-900 border-b-slate-900 border-l-slate-900" />
              <p className="text-xs text-slate-400">Verifying telemetry links...</p>
            </div>
          </div>
        ) : vehicles.length === 0 ? (
          // Onboarding Panel when no vehicle exists
          <div className="flex-1 flex flex-col items-center justify-center border border-slate-850 bg-slate-900/20 rounded-2xl p-8 max-w-lg mx-auto text-center my-10">
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-5 rounded-full text-cyan-400 mb-5">
              <Car className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-white">Create Your Vehicle Workspace</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Before we can build your maintenance records or boot the AI diagnostic copilot, please define your active vehicle profile.
            </p>
            {/* The selector has the Add Modal button, but let's place a quick action button here */}
            <div className="mt-6">
              <span className="text-xs text-slate-500">Add a vehicle in the selector header above to get started.</span>
            </div>
          </div>
        ) : selectedVehicleId === null ? (
          // Selecting vehicle fallback
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-400">Please select an active vehicle to initialize workspace panels.</p>
          </div>
        ) : (
          /* Active Vehicle Workspace Panels */
          <div className="flex-1 flex flex-col overflow-hidden gap-5">
            
            {/* Quick stats ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Service Events</p>
                  <p className="text-lg font-bold text-white font-mono mt-0.5">{logs.length}</p>
                </div>
                <Wrench className="w-4 h-4 text-cyan-500/60" />
              </div>
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Investment</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(totalCost)}
                  </p>
                </div>
                <span className="text-emerald-500/60 font-bold text-xs">$</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Odometer</p>
                  <p className="text-lg font-bold text-white font-mono mt-0.5">
                    {(vehicles.find((v) => v.id === selectedVehicleId)?.current_mileage || 0).toLocaleString()} mi
                  </p>
                </div>
                <Layers className="w-4 h-4 text-indigo-500/60" />
              </div>
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LLM Manual Context</p>
                  <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">Enabled</p>
                </div>
                <Cpu className="w-4 h-4 text-cyan-500/60" />
              </div>
            </div>

            {/* Desktop 3-Panel Layout */}
            <div className="hidden lg:grid lg:grid-cols-12 flex-1 gap-5 min-h-[500px] overflow-hidden">
              {/* Left Panel: Logs List */}
              <div className="lg:col-span-4 h-full overflow-hidden">
                <ServiceLogList
                  logs={logs}
                  onOpenAddModal={() => setIsAddLogOpen(true)}
                  isLoading={loadingLogs}
                />
              </div>

              {/* Center Panel: Copilot Chat */}
              <div className="lg:col-span-5 h-full overflow-hidden">
                <CopilotChat vehicleId={selectedVehicleId} />
              </div>

              {/* Right Panel: Uploader & Context Info */}
              <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
                <ManualUploader vehicleId={selectedVehicleId} />
                
                {/* Visual quick info widget */}
                <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-cyan-500" />
                    Interactive Prompts
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Try asking questions like:
                  </p>
                  <ul className="text-[11px] text-slate-350 list-disc list-inside space-y-1.5 pl-0.5">
                    <li>"What is the engine coolant capacity?"</li>
                    <li>"How do I reset my maintenance oil light?"</li>
                    <li>"When were my brake pads serviced?"</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tablet & Mobile Tabbed Responsive Layout */}
            <div className="lg:hidden flex flex-col flex-1 gap-4 overflow-hidden min-h-[450px]">
              {/* Tabs list */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 shrink-0">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "chat"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-450 hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Copilot
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "history"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-455 hover:text-slate-200"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  History
                </button>
                <button
                  onClick={() => setActiveTab("uploader")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "uploader"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-455 hover:text-slate-200"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Manuals
                </button>
              </div>

              {/* Tab views */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === "chat" && (
                  <div className="flex-1 h-full overflow-hidden">
                    <CopilotChat vehicleId={selectedVehicleId} />
                  </div>
                )}
                {activeTab === "history" && (
                  <div className="flex-1 h-full overflow-hidden">
                    <ServiceLogList
                      logs={logs}
                      onOpenAddModal={() => setIsAddLogOpen(true)}
                      isLoading={loadingLogs}
                    />
                  </div>
                )}
                {activeTab === "uploader" && (
                  <div className="space-y-4 overflow-y-auto">
                    <ManualUploader vehicleId={selectedVehicleId} />
                    
                    <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-cyan-500" />
                        In-Car Diagnostics
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        To enable deep technical queries, drag-and-drop your vehicle's factory manual (PDF) into the area above. The document uploader will parse the technical text, vectorize pages, and query it directly to deliver hyper-specific specifications.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Log creation modal sheet */}
            <AddLogModal
              isOpen={isAddLogOpen}
              onClose={() => setIsAddLogOpen(false)}
              vehicleId={selectedVehicleId}
              onSubmit={handleAddLog}
            />
          </div>
        )}
      </main>
    </div>
  );
}
