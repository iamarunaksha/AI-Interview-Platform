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
  );
}
