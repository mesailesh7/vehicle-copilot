"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Car,
  Users,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronRight,
  Check,
} from "lucide-react";
import { PlanInfo, SubscriptionInfo } from "../types";
import {
  getPlans,
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  simulateSubscriptionUpgrade,
} from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function BillingDashboard() {
  const { user, refreshUserProfile } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";

  const loadBillingData = async () => {
    setLoading(true);
    setError("");
    try {
      const [plansData, subData] = await Promise.all([
        getPlans(),
        getSubscription().catch(() => null),
      ]);
      setPlans(plansData.plans);
      setSubscription(subData);
    } catch (err: any) {
      setError(err.message || "Failed to load billing details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();

    // Check URL parameters for Stripe success / cancel toasts
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("billing_success")) {
        setSuccessMessage("Your subscription has been successfully updated via Stripe!");
      } else if (params.get("billing_canceled")) {
        setError("Stripe checkout was canceled. No charges were made.");
      }
    }
  }, []);

  const handleStripeCheckout = async (planTier: string) => {
    setActionLoading(planTier);
    setError("");
    setSuccessMessage("");
    try {
      const result = await createCheckoutSession(planTier);
      if (result.url) {
        if (result.is_simulated) {
          // If in offline / test simulator mode, auto upgrade and refresh
          await simulateSubscriptionUpgrade(planTier);
          setSuccessMessage(`[Simulator Mode] Successfully updated workshop subscription to ${planTier.toUpperCase()} plan!`);
          await loadBillingData();
          await refreshUserProfile();
        } else {
          // Real Stripe Checkout redirect
          window.location.href = result.url;
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate Stripe checkout.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPortal = async () => {
    setActionLoading("portal");
    setError("");
    try {
      const result = await createPortalSession();
      if (result.url) {
        if (result.is_simulated) {
          setSuccessMessage("[Simulator Mode] Stripe Billing Customer Portal is available in Live Mode.");
        } else {
          window.location.href = result.url;
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to open Stripe Customer Portal.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFastSimulate = async (planTier: string) => {
    setActionLoading(`sim_${planTier}`);
    setError("");
    try {
      await simulateSubscriptionUpgrade(planTier);
      setSuccessMessage(`Instant demo upgrade to ${planTier.toUpperCase()} plan completed!`);
      await loadBillingData();
      await refreshUserProfile();
    } catch (err: any) {
      setError(err.message || "Failed to switch plan tier.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-cyan-500 border-r-slate-800 border-b-slate-800 border-l-slate-800" />
        <p className="text-xs text-slate-400">Loading workshop subscription & billing matrix...</p>
      </div>
    );
  }

  const currentTier = subscription?.plan_tier || "starter";
  const vehicleCount = subscription?.vehicle_count || 0;
  const maxVehicles = subscription?.max_vehicles || 15;
  const memberCount = subscription?.member_count || 1;
  const maxMembers = subscription?.max_members || 3;

  const vehiclePercent = Math.min(Math.round((vehicleCount / maxVehicles) * 100), 100);
  const memberPercent = Math.min(Math.round((memberCount / maxMembers) * 100), 100);

  return (
    <div className="space-y-8 overflow-y-auto h-full pr-1 custom-scrollbar pb-10">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black tracking-tight text-white">Workshop Subscription & Stripe Billing</h2>
          </div>
          <p className="text-xs text-slate-400">
            Manage your shop's active fleet diagnostic tier, staff seat allocations, and Stripe invoices.
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            onClick={handleOpenPortal}
            disabled={actionLoading === "portal"}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition border border-slate-700 shadow-md shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Stripe Customer Portal</span>
          </button>
        )}
      </div>

      {/* Alert Banners */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <p className="text-xs font-medium">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Subscription Overview & Resource Quotas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Active Plan Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Plan</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 uppercase font-mono">
              {subscription?.subscription_status || "Active"}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-black text-white">{subscription?.plan_name || "Pro Workshop"}</h3>
            <p className="text-2xl font-black text-cyan-400 font-mono mt-1">
              ${subscription?.plan_price_monthly || 149}
              <span className="text-xs text-slate-400 font-normal"> / month</span>
            </p>
          </div>

          <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Auto-renews monthly via Stripe</span>
          </div>
        </div>

        {/* Vehicles Quota Meter */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Car className="w-4 h-4 text-cyan-400" />
                <span>Vehicle Fleet Quota</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                {vehicleCount} / {maxVehicles >= 9999 ? "∞" : maxVehicles}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Total active vehicle profiles registered in shop.</p>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  vehiclePercent > 85 ? "bg-amber-500" : "bg-cyan-500"
                }`}
                style={{ width: `${maxVehicles >= 9999 ? 15 : vehiclePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-right font-mono">
              {maxVehicles >= 9999 ? "Unlimited Capacity" : `${maxVehicles - vehicleCount} vehicle slots remaining`}
            </p>
          </div>
        </div>

        {/* Team Seats Meter */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Team Seats Quota</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                {memberCount} / {maxMembers >= 9999 ? "∞" : maxMembers}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Technicians, managers, and service advisors.</p>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  memberPercent > 85 ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{ width: `${maxMembers >= 9999 ? 15 : memberPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 text-right font-mono">
              {maxMembers >= 9999 ? "Unlimited Seats" : `${maxMembers - memberCount} staff seats remaining`}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Tier Selection Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Available Workshop Tiers
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Scale your vehicle diagnostics, PDF manual knowledge base, and technician staff capacity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const isPro = plan.id === "pro";
            const isEnterprise = plan.id === "enterprise";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl ${
                  isCurrent
                    ? "bg-slate-900 border-2 border-cyan-500/80 shadow-cyan-500/10"
                    : isPro
                    ? "bg-slate-900/90 border border-slate-750 hover:border-cyan-500/50"
                    : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 right-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-black text-white">{plan.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white font-mono">${plan.price_monthly}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>

                  {/* Quota Highlights */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl text-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Vehicles</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {plan.max_vehicles >= 9999 ? "Unlimited" : plan.max_vehicles}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Staff Seats</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {plan.max_members >= 9999 ? "Unlimited" : plan.max_members}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Included Capabilities
                    </span>
                    <ul className="space-y-2">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Call to action button */}
                <div className="pt-6 mt-6 border-t border-slate-800 space-y-2">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 flex items-center justify-center gap-1.5 cursor-default"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Current Active Plan</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStripeCheckout(plan.id)}
                      disabled={actionLoading !== null || !isOwnerOrAdmin}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white transition shadow-lg shadow-cyan-600/10 flex items-center justify-center gap-2"
                    >
                      {actionLoading === plan.id ? (
                        <span>Processing...</span>
                      ) : (
                        <>
                          <span>Subscribe via Stripe</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Fast Simulator Mode Button for development */}
                  {!isCurrent && isOwnerOrAdmin && (
                    <button
                      onClick={() => handleFastSimulate(plan.id)}
                      disabled={actionLoading !== null}
                      className="w-full py-1.5 px-3 rounded-lg text-[10px] font-mono text-slate-400 hover:text-cyan-300 hover:bg-slate-850 transition flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Instant Test Simulator Switch</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
