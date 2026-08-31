"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Clock,
  ShieldCheck,
  Briefcase,
  Wrench,
  FileText,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { Member, TenantInvite, UserRole } from "../types";
import {
  getTenantMembers,
  removeTenantMember,
  getInvites,
  createInviteCode,
  revokeInvite,
} from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function TeamManagement() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<TenantInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Invite generation state
  const [inviteRole, setInviteRole] = useState<UserRole>("technician");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [lastGeneratedInvite, setLastGeneratedInvite] = useState<TenantInvite | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";
  const canInvite = user?.role === "owner" || user?.role === "admin" || user?.role === "manager";

  const loadTeamData = async () => {
    setLoading(true);
    setError("");
    try {
      const [membersData, invitesData] = await Promise.all([
        getTenantMembers(),
        canInvite ? getInvites().catch(() => []) : Promise.resolve([]),
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err: any) {
      setError(err.message || "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [user]);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingInvite(true);
    setError("");
    setSuccessMessage("");
    try {
      const newInvite = await createInviteCode(inviteRole, expiresInDays);
      setLastGeneratedInvite(newInvite);
      setInvites((prev) => [newInvite, ...prev]);
      setSuccessMessage(`Generated invite code ${newInvite.code} for role ${newInvite.role.toUpperCase()}`);
    } catch (err: any) {
      setError(err.message || "Failed to generate invite code.");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteLink = `${origin}/signup?invite=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRevokeInvite = async (inviteId: number) => {
    try {
      await revokeInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (lastGeneratedInvite?.id === inviteId) {
        setLastGeneratedInvite(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to revoke invite.");
    }
  };

  const handleRemoveMember = async (memberId: number, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from this workshop?`)) return;
    try {
      await removeTenantMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSuccessMessage(`Removed ${username} from workshop.`);
    } catch (err: any) {
      setError(err.message || "Failed to remove member.");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "owner":
        return {
          label: "Shop Owner",
          icon: UserCheck,
          style: "bg-emerald-950/40 text-emerald-400 border-emerald-800/40",
        };
      case "admin":
        return {
          label: "Administrator",
          icon: ShieldCheck,
          style: "bg-purple-950/40 text-purple-400 border-purple-800/40",
        };
      case "manager":
        return {
          label: "Shop Manager",
          icon: Briefcase,
          style: "bg-blue-950/40 text-blue-400 border-blue-800/40",
        };
      case "technician":
        return {
          label: "Technician",
          icon: Wrench,
          style: "bg-cyan-950/40 text-cyan-400 border-cyan-800/40",
        };
      case "service_advisor":
        return {
          label: "Service Advisor",
          icon: FileText,
          style: "bg-amber-950/40 text-amber-400 border-amber-800/40",
        };
      default:
        return {
          label: role,
          icon: Users,
          style: "bg-slate-900 text-slate-400 border-slate-800",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-cyan-500 border-r-slate-800 border-b-slate-800 border-l-slate-800" />
        <p className="text-xs text-slate-400">Loading workshop staff roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-y-auto h-full pr-1 custom-scrollbar pb-10">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black tracking-tight text-white">Workshop Staff & Invitation System</h2>
          </div>
          <p className="text-xs text-slate-400">
            Managers and Admins can send invitation codes or links to onboard Technicians and Advisors into this workshop.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
            {members.length} Active Staff Members
          </span>
        </div>
      </div>

      {/* Alert Toasts */}
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

      {/* Invite Code Generator Panel (Managers, Admins, Owners) */}
      {canInvite && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Generate New Staff Invite Code
              </h3>
              <p className="text-xs text-slate-400">
                Create a secure one-time invite code or shareable registration link for a technician or advisor.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerateInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Assigned Workshop Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="technician">Technician (Diagnostics, Copilot, Manuals)</option>
                <option value="service_advisor">Service Advisor (Service Logs & History)</option>
                <option value="manager">Shop Manager (Team Management & Invites)</option>
                {isOwnerOrAdmin && <option value="admin">Administrator (Full Ops Access)</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Code Expiration
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              >
                <option value={3}>Expires in 3 Days</option>
                <option value={7}>Expires in 7 Days (Default)</option>
                <option value={14}>Expires in 14 Days</option>
                <option value={30}>Expires in 30 Days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={generatingInvite}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-lg shadow-cyan-600/10 flex items-center justify-center gap-2"
            >
              {generatingInvite ? (
                <span>Generating...</span>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Generate Invite Code</span>
                </>
              )}
            </button>
          </form>

          {/* Active Generated Invite Result Banner */}
          {lastGeneratedInvite && !lastGeneratedInvite.is_used && (
            <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 mt-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Invite Code Ready for {lastGeneratedInvite.role.toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Expires: {new Date(lastGeneratedInvite.expires_at || "").toLocaleDateString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Code badge */}
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-base font-mono font-black text-white tracking-widest flex items-center justify-between w-full sm:w-auto">
                  <span>{lastGeneratedInvite.code}</span>
                  <button
                    onClick={() => handleCopyCode(lastGeneratedInvite.code)}
                    className="ml-3 text-cyan-400 hover:text-cyan-300 text-xs font-sans font-bold flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* 1-click Link button */}
                <button
                  onClick={() => handleCopyLink(lastGeneratedInvite.code)}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copiedLink ? "Invite Link Copied!" : "Copy Direct Invite Link"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Staff Roster Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Active Workshop Staff Roster
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined Date</th>
                {isOwnerOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {members.map((m) => {
                const badge = getRoleBadge(m.role);
                const IconComponent = badge.icon;
                const isSelf = m.id === user?.id;

                return (
                  <tr key={m.id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs">
                          {m.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            {m.username}
                            {isSelf && (
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                                You
                              </span>
                            )}
                          </p>
                          {m.email && <p className="text-[11px] text-slate-500">{m.email}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badge.style}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "Active"}
                    </td>

                    {isOwnerOrAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        {!isSelf && m.role !== "owner" && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.username)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending & Historical Invites List */}
      {canInvite && invites.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Pending & Issued Invitation Codes
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Invite Code</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                      {inv.code}
                    </td>

                    <td className="py-3 px-4 capitalize text-slate-300">
                      {inv.role}
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">
                      {inv.is_used ? (
                        <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                          Used / Claimed
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
                          Active & Ready
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {!inv.is_used && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyLink(inv.code)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copy link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                            title="Revoke code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
