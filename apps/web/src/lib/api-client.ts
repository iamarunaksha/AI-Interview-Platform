import { type SystemHealthResponse } from "@interviewai/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Client-side and server-side fetcher for backend health status.
 *
 * Pattern: Typed API client using canonical contracts from @interviewai/shared-types.
 * Handles timeouts, network disconnections, and structured fallback errors cleanly.
 */
export async function getSystemHealth(): Promise<SystemHealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      cache: "no-store", // Always fetch fresh status
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!res.ok) {
      return null;
    }

    const data: SystemHealthResponse = await res.json();
    return data;
  } catch {
    // Network unreachable, backend down, or timeout
    return null;
  }
}
