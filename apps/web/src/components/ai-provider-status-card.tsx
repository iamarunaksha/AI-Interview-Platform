"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api-client";
import type {
  AiSystemStatusResponse,
  TestGenerateResponse,
} from "@interviewai/shared-types";

export function AiProviderStatusCard() {
  const [status, setStatus] = useState<AiSystemStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prompt, setPrompt] = useState(
    "How would you optimize database read throughput under high load?",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResult, setTestResult] = useState<TestGenerateResponse | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await api.ai.getStatus();
        if (active) setStatus(res);
      } catch {
        // backend might be unreachable
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchStatus();
    return () => {
      active = false;
    };
  }, []);

  const handleTestGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setTestResult(null);

    try {
      const res = await api.ai.testGenerate({ prompt });
      setTestResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTestResult({
          provider: "error",
          model: "n/a",
          output: `Generation failed: ${err.message}`,
          latencyMs: 0,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <div>
          <h2 className="font-bold text-base text-zinc-900 dark:text-white">
            AI Provider Engine Status
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Architecture layer powering real-time conversation &amp; evaluation
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Adapter Layer Active
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Providers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Active LLM
              </span>
              <span className="font-bold text-xs text-zinc-900 dark:text-white capitalize mt-0.5 block">
                {status?.activeProviders.llm ?? "mock"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Realtime Voice
              </span>
              <span className="font-bold text-xs text-zinc-900 dark:text-white capitalize mt-0.5 block">
                {status?.activeProviders.realtime ?? "mock"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Speech-to-Text
              </span>
              <span className="font-bold text-xs text-zinc-900 dark:text-white capitalize mt-0.5 block">
                {status?.activeProviders.stt ?? "gemini"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Evaluator
              </span>
              <span className="font-bold text-xs text-zinc-900 dark:text-white capitalize mt-0.5 block">
                {status?.activeProviders.evaluation ?? "mock"}
              </span>
            </div>
          </div>

          {/* Test Generation Sandbox */}
          <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800 text-xs">
            <span className="block font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Test AI Generation &amp; Benchmark Latency
            </span>
            <form onSubmit={handleTestGenerate} className="space-y-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask technical question..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  {isGenerating ? "Generating..." : "Run Test Generation"}
                </button>
              </div>
            </form>

            {testResult && (
              <div className="mt-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>
                    Provider:{" "}
                    <strong className="text-zinc-800 dark:text-zinc-200 capitalize">
                      {testResult.provider} ({testResult.model})
                    </strong>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {testResult.latencyMs}ms
                  </span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 italic text-xs leading-relaxed">
                  &ldquo;{testResult.output}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
