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
  CreditCard,
  Users,
  Lock,
  Building2,
  ChevronRight,
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
import BillingDashboard from "../components/BillingDashboard";
import TeamManagement from "../components/TeamManagement";
import PlanQuotaModal from "../components/PlanQuotaModal";

type TabType = "chat" | "diagnostics" | "history" | "knowledge-base" | "uploader" | "team" | "billing";

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

  // Quota upgrade modal
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaModalMessage, setQuotaModalMessage] = useState("");

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch Vehicles on mount or auth change
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
      } else {
        setSelectedVehicleId(null);
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
      const errorMsg = err.message || "Failed to add new vehicle.";
      if (errorMsg.toLowerCase().includes("limit") || errorMsg.toLowerCase().includes("upgrade")) {
        setQuotaModalMessage(errorMsg);
        setIsQuotaModalOpen(true);
      }
      throw new Error(errorMsg);
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

  // Role permissions helpers
  const isServiceAdvisor = user.role === "service_advisor";
  const isOwner = user.role === "owner";
  const isAdmin = user.role === "admin";
  const isManager = user.role === "manager";

  const canManageTeam = isOwner || isAdmin || isManager;
  const canManageBilling = isOwner || isAdmin;
  const canAccessDiagnostics = !isServiceAdvisor;
  const canAccessUploader = !isServiceAdvisor;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Header bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl text-slate-950 shadow-lg shadow-cyan-500/10">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                VEHICLE<span className="text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded text-xs font-mono">COPILOT</span>
              </h1>
              
              {/* Tenant Workshop Badge */}
              {user.tenant_name && (
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-300">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  <span className="font-bold text-white">{user.tenant_name}</span>
                  <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                    {user.tenant_plan || "PRO"}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Multi-Tenant Diagnostic & Workshop Intelligence</p>
          </div>
        </div>

        {/* Demo switcher and auth trigger controls */}
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          
          <button
            onClick={logout}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
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
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "chat" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Copilot Chat</span>
              </button>

              {/* DTC Scanner */}
              <button
                onClick={() => {
                  if (canAccessDiagnostics) setActiveTab("diagnostics");
                }}
                disabled={!canAccessDiagnostics}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  !canAccessDiagnostics ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  activeTab === "diagnostics" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4" />
                  <span>DTC OBD-II Scanner</span>
                </div>
                {!canAccessDiagnostics && <Lock className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {/* Service Logs */}
              <button
                onClick={() => setActiveTab("history")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "history" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Service History</span>
              </button>

              {/* Shop Knowledge Base */}
              <button
                onClick={() => setActiveTab("knowledge-base")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "knowledge-base" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Shop Knowledge Base</span>
              </button>

              {/* Document Indexer */}
              <button
                onClick={() => {
                  if (canAccessUploader) setActiveTab("uploader");
                }}
                disabled={!canAccessUploader}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  !canAccessUploader ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  activeTab === "uploader" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="w-4 h-4" />
                  <span>Document Indexer</span>
                </div>
                {!canAccessUploader && <Lock className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {/* Team & Staff (Managers, Admins, Owners) */}
              <button
                onClick={() => {
                  if (canManageTeam) setActiveTab("team");
                }}
                disabled={!canManageTeam}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  !canManageTeam ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  activeTab === "team" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>Team & Staff</span>
                </div>
                {!canManageTeam && <Lock className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {/* Stripe Billing & Subscriptions (Owners & Admins) */}
              <button
                onClick={() => {
                  if (canManageBilling) setActiveTab("billing");
                }}
                disabled={!canManageBilling}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  !canManageBilling ? "opacity-35 cursor-not-allowed" : ""
                } ${
                  activeTab === "billing" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Billing & Stripe</span>
                </div>
                {!canManageBilling && <Lock className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            </nav>
          </div>

          {/* User profile identifier */}
          <div className="border-t border-slate-850 pt-4 px-2 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Logged User</span>
            <p className="text-xs font-bold text-white truncate">{user.username}</p>
            <span className="text-[10px] text-cyan-400 font-mono capitalize block">{user.role}</span>
          </div>
        </aside>

        {/* Central Dashboard Panel */}
        <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto gap-5 overflow-hidden">
          
          {apiError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex gap-3 items-center">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-xs md:text-sm">
                <span className="font-bold">Connection Alert:</span> {apiError}
              </div>
              <button 
                onClick={fetchVehiclesData} 
                className="ml-auto bg-slate-900 hover:bg-slate-850 text-xs font-bold text-slate-350 px-3 py-1.5 border border-slate-800 rounded-lg transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* View: Team Management */}
          {activeTab === "team" && canManageTeam && (
            <div className="flex-1 overflow-hidden">
              <TeamManagement />
            </div>
          )}

          {/* View: Billing & Stripe */}
          {activeTab === "billing" && canManageBilling && (
            <div className="flex-1 overflow-hidden">
              <BillingDashboard />
            </div>
          )}

          {/* Views requiring vehicle workspace context */}
          {activeTab !== "team" && activeTab !== "billing" && (
            <>
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
                    <p className="text-xs text-slate-400">Loading workshop vehicles...</p>
                  </div>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-slate-850 bg-slate-900/20 rounded-3xl p-8 max-w-lg mx-auto text-center my-10">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 p-5 rounded-full text-cyan-400 mb-5">
                    <Car className="w-10 h-10" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Create Your Vehicle Workspace</h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Before we can build maintenance records or boot the AI diagnostic copilot, please define your active vehicle profile in the selector header above.
                  </p>
                </div>
              ) : selectedVehicleId === null ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-slate-400">Please select an active vehicle to initialize workspace panels.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden gap-5">
                  
                  {/* Quick stats ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Service Events</p>
                        <p className="text-lg font-bold text-white font-mono mt-0.5">{logs.length}</p>
                      </div>
                      <Wrench className="w-4 h-4 text-cyan-500/60" />
                    </div>
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Investment</p>
                        <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(totalCost)}
                        </p>
                      </div>
                      <span className="text-emerald-500/60 font-bold text-xs">$</span>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Odometer</p>
                        <p className="text-lg font-bold text-white font-mono mt-0.5">
                          {(vehicles.find((v) => v.id === selectedVehicleId)?.current_mileage || 0).toLocaleString()} mi
                        </p>
                      </div>
                      <Layers className="w-4 h-4 text-indigo-500/60" />
                    </div>
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Copilot AI RAG</p>
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

                    {activeTab === "diagnostics" && canAccessDiagnostics && (
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

                    {activeTab === "uploader" && canAccessUploader && (
                      <div className="space-y-4 overflow-y-auto h-full pr-1 custom-scrollbar">
                        <ManualUploader vehicleId={selectedVehicleId} />
                        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-cyan-500" />
                            Multi-Tenant Vector Ingestion
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Upload factory service manuals (PDF) to build deep vehicle-specific AI retrieval for your workshop. Embeddings are partition-scoped to your workshop tenant.
                          </p>
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
            </>
          )}

          {/* Quota Upgrade Modal */}
          <PlanQuotaModal
            isOpen={isQuotaModalOpen}
            onClose={() => setIsQuotaModalOpen(false)}
            onGoToBilling={() => setActiveTab("billing")}
            message={quotaModalMessage}
          />
        </main>
      </div>
    </div>
  );
}
