"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles,
  Car,
  Wrench,
  UploadCloud,
  AlertTriangle,
  ShieldAlert,
  Cpu,
  Layers,
  LogOut,
  Activity,
  BookOpen,
  Settings,
  DollarSign,
  Users,
  Lock,
  Plus
} from "lucide-react";
import { Vehicle, VehicleCreate, ServiceLog, ServiceLogCreate } from "../types";
import { getVehicles, createVehicle, getLogs, createLog } from "../utils/api";
import VehicleSelector from "../components/VehicleSelector";
import ServiceLogList from "../components/ServiceLogList";
import AddLogModal from "../components/AddLogModal";
import CopilotChat from "../components/CopilotChat";
import ManualUploader from "../components/ManualUploader";
import DtcScanner from "../components/DtcScanner";
import KnowledgeBase from "../components/KnowledgeBase";
import RoleSwitcher from "../components/RoleSwitcher";

type TabType = "chat" | "diagnostics" | "history" | "knowledge-base" | "uploader" | "management";

export default function Dashboard() {
  const { isAuthenticated, user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  // Loading and Error States
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  // Billing seats state for Owner view
  const [allocatedSeats, setAllocatedSeats] = useState(4);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch Vehicles on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchVehiclesData();
    }
  }, [isAuthenticated]);

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
  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-cyan-500 border-r-slate-900 border-b-slate-900 border-l-slate-900" />
          <p className="text-xs text-slate-400">Verifying session link...</p>
        </div>
      </div>
    );
  }

  // Helper check for role restrictions
  const isServiceAdvisor = user.role === "service_advisor";
  const isOwner = user.role === "owner";

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

        {/* Demo switcher and auth trigger controls */}
        <div className="flex items-center gap-4">
          <RoleSwitcher />
          
          <button
            onClick={logout}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-850 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Primary Dashboard Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-900 p-4 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Workshop Hub</span>
            </div>
            
            <nav className="space-y-1">
              {/* AI Copilot */}
              <button
                onClick={() => setActiveTab("chat")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "chat" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Copilot Chat</span>
              </button>

              {/* DTC Scanner */}
              <button
                onClick={() => {
                  if (!isServiceAdvisor) setActiveTab("diagnostics");
                }}
                disabled={isServiceAdvisor}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  isServiceAdvisor ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  activeTab === "diagnostics" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4" />
                  <span>DTC OBD-II Scanner</span>
                </div>
                {isServiceAdvisor && <Lock className="w-3.5 h-3.5 text-slate-550" />}
              </button>

              {/* Service Logs */}
              <button
                onClick={() => setActiveTab("history")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "history" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Service History</span>
              </button>

              {/* Shop Knowledge Base */}
              <button
                onClick={() => setActiveTab("knowledge-base")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "knowledge-base" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Shop Knowledge Base</span>
              </button>

              {/* Owner's Manuals PDF */}
              <button
                onClick={() => {
                  if (!isServiceAdvisor) setActiveTab("uploader");
                }}
                disabled={isServiceAdvisor}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  isServiceAdvisor ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  activeTab === "uploader" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="w-4 h-4" />
                  <span>Document Indexer</span>
                </div>
                {isServiceAdvisor && <Lock className="w-3.5 h-3.5 text-slate-550" />}
              </button>

              {/* Shop Management (Owner Only) */}
              <button
                onClick={() => {
                  if (isOwner) setActiveTab("management");
                }}
                disabled={!isOwner}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  !isOwner ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  activeTab === "management" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>Shop Management</span>
                </div>
                {!isOwner && <Lock className="w-3.5 h-3.5 text-slate-550" />}
              </button>
            </nav>
          </div>

          {/* User profile identifier */}
          <div className="border-t border-slate-850 pt-4 px-2 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Logged user</span>
            <p className="text-xs font-bold text-white truncate">{user.username}</p>
            <span className="text-[10px] text-cyan-400 font-mono capitalize">{user.role}</span>
          </div>
        </aside>

        {/* Central Dashboard Panel */}
        <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto gap-5 overflow-hidden">
          
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

          {/* Vehicle Context Switcher */}
          <VehicleSelector
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={handleSelectVehicle}
            onAddVehicle={handleAddVehicle}
          />

          {loadingVehicles ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-cyan-500 border-r-slate-900 border-b-slate-900 border-l-slate-900" />
                <p className="text-xs text-slate-400">Verifying telemetry links...</p>
              </div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-slate-850 bg-slate-900/20 rounded-2xl p-8 max-w-lg mx-auto text-center my-10">
              <div className="bg-cyan-500/10 border border-cyan-500/20 p-5 rounded-full text-cyan-400 mb-5">
                <Car className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-bold text-white">Create Your Vehicle Workspace</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Before we can build your maintenance records or boot the AI diagnostic copilot, please define your active vehicle profile.
              </p>
              <div className="mt-6">
                <span className="text-xs text-slate-500">Add a vehicle in the selector header above to get started.</span>
              </div>
            </div>
          ) : selectedVehicleId === null ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-slate-400">Please select an active vehicle to initialize workspace panels.</p>
            </div>
          ) : (
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
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Copilot AI Diagnostics</p>
                    <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">Active</p>
                  </div>
                  <Cpu className="w-4 h-4 text-cyan-500/60" />
                </div>
              </div>

              {/* View routing based on Sidebar active tab */}
              <div className="flex-1 min-h-[400px] overflow-hidden">
                {activeTab === "chat" && (
                  <div className="h-full overflow-hidden">
                    <CopilotChat vehicleId={selectedVehicleId} />
                  </div>
                )}

                {activeTab === "diagnostics" && !isServiceAdvisor && (
                  <div className="h-full overflow-hidden">
                    <DtcScanner vehicle={activeVehicle!} />
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="h-full overflow-hidden">
                    <ServiceLogList
                      logs={logs}
                      onOpenAddModal={() => setIsAddLogOpen(true)}
                      isLoading={loadingLogs}
                    />
                  </div>
                )}

                {activeTab === "knowledge-base" && (
                  <div className="h-full overflow-hidden">
                    <KnowledgeBase />
                  </div>
                )}

                {activeTab === "uploader" && !isServiceAdvisor && (
                  <div className="space-y-4 overflow-y-auto h-full pr-1 custom-scrollbar">
                    <ManualUploader vehicleId={selectedVehicleId} />
                    <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-cyan-500" />
                        Automotive Knowledge Loading
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        To enable deep technical queries, upload your vehicle's factory manual (PDF) here. The PDF loader will parse and partition the documents, generate embeddings using text-embedding-3-small, and push them to the local Qdrant collection index.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "management" && isOwner && (
                  <div className="space-y-6 overflow-y-auto h-full pr-1 custom-scrollbar">
                    
                    {/* Metrics row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Subscription Status */}
                      <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                        <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Subscription Status</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-bold text-white">Workshop Premium Plan</p>
                          <span className="text-[10px] font-bold text-emerald-450 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Renews on September 15, 2026</p>
                      </div>

                      {/* Allocated seats */}
                      <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                        <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Billed Active Seats</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-bold text-white">{allocatedSeats} / 10 seats</p>
                          <button
                            onClick={() => setAllocatedSeats((s) => Math.min(s + 1, 10))}
                            className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300 p-1.5 rounded transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">Charges will automatically scale on billing cycle.</p>
                      </div>

                      {/* Estimated Billing amount */}
                      <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                        <h4 className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Monthly SaaS Total</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-bold text-emerald-400 font-mono">
                            ${(allocatedSeats * 29).toFixed(2)}
                          </p>
                          <span className="text-[10px] text-slate-500 font-bold">$29.00 / seat</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Next invoice amount including active seats.</p>
                      </div>
                    </div>

                    {/* Shop settings card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-cyan-400" />
                        Workshop & Seat Billing Settings
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Manage active staff members, invite technicians or advisors to access fleet diagnostic tools, and adjust diagnostic severity warning thresholds.
                      </p>
                      <div className="border-t border-slate-850 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">Invite Staff Member</span>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              placeholder="colleague@workshop.com"
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={() => setAllocatedSeats((s) => Math.min(s + 1, 10))}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition"
                            >
                              Send Invite
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block font-mono">Current Shop Plan</span>
                          <div className="flex items-center justify-between text-xs text-slate-350 p-2 bg-slate-950 border border-slate-850 rounded">
                            <span>SaaS Core Diagnostics</span>
                            <span className="font-bold text-white">4 Active Users</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
    </div>
  );
}
