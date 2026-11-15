"use client";

import { useEffect, useState } from "react";
import { type SystemHealthResponse } from "@interviewai/shared-types";
import { getSystemHealth } from "@/lib/api-client";

export function SystemHealthIndicator() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        const data = await getSystemHealth();
        if (mounted) {
          setHealth(data);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setHealth(null);
          setLoading(false);
        }
      }
    }

    checkHealth();
    // Poll every 10 seconds for real-time connection status
    const interval = setInterval(checkHealth, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {/* Top Header Pill */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Checking System Health...</span>
          </div>
        ) : health?.database.status === "connected" ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Backend &amp; {health.database.version ?? "PostgreSQL"} Connected
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Backend Offline / Connecting</span>
          </div>
        )}
      </div>

      {/* Infrastructure Status Card (Rendered via portal or embedded in hero) */}
      <div className="mt-10 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left w-full max-w-2xl shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Phase 1: End-to-End Infrastructure Status
          </span>
          <span className="text-[11px] font-mono text-indigo-400">
            {health?.timestamp
              ? new Date(health.timestamp).toLocaleTimeString()
              : loading
                ? "Pinging API..."
                : "Awaiting Connection"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60">
            <span className="text-slate-500 block text-[11px] mb-1">
              Frontend (Next.js 16)
            </span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Operational
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60">
            <span className="text-slate-500 block text-[11px] mb-1">
              Backend (NestJS 12)
            </span>
            <span
              className={`font-semibold flex items-center gap-1.5 ${health?.status === "ok" ? "text-emerald-400" : "text-amber-400"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${health?.status === "ok" ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              {health?.status === "ok"
                ? "Connected (Port 4000)"
                : "Standby / Offline"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60">
            <span className="text-slate-500 block text-[11px] mb-1">
              Database (Supabase)
            </span>
            <span
              className={`font-semibold flex items-center gap-1.5 ${health?.database.status === "connected" ? "text-emerald-400" : "text-amber-400"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${health?.database.status === "connected" ? "bg-emerald-400" : "bg-amber-400"}`}
              />
              {health?.database.status === "connected"
                ? (health.database.version ?? "PostgreSQL")
                : "Disconnected"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
