"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { AiProviderStatusCard } from "../../components/ai-provider-status-card";

export default function DashboardPage() {
  const router = useRouter();
  const { user, candidateProfile, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-zinc-500 text-sm animate-pulse">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 text-white mb-8 shadow-sm">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3">
            Candidate Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-blue-100 text-sm mt-2 leading-relaxed">
            Your personalized AI technical interview track is configured and
            ready. Practice realistic voice & video sessions with adaptive
            follow-ups and comprehensive rubric evaluations.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/interview/new"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <span>🎙️</span>
              <span>Start Voice Interview</span>
            </Link>
            <Link
              href="/tracks"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors"
            >
              Question Bank
            </Link>
            <Link
              href="/onboarding"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors"
            >
              Modify Track Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Track Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
              <div>
                <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                  Active Interview Track
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Your current assessment rubric and target expectations
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {candidateProfile?.isOnboarded
                  ? "Onboarded & Ready"
                  : "Setup Incomplete"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
                <span className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Domain
                </span>
                <span className="block font-semibold text-sm text-zinc-900 dark:text-white mt-1 uppercase">
                  {candidateProfile?.domain ?? "Not set"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
                <span className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Target Role
                </span>
                <span className="block font-semibold text-sm text-zinc-900 dark:text-white mt-1 truncate">
                  {candidateProfile?.targetRole ?? "Not set"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
                <span className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Experience Level
                </span>
                <span className="block font-semibold text-sm text-zinc-900 dark:text-white mt-1 uppercase">
                  {candidateProfile?.experienceLevel ?? "Not set"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
                <span className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Target Tier
                </span>
                <span className="block font-semibold text-sm text-zinc-900 dark:text-white mt-1 capitalize truncate">
                  {candidateProfile?.companyCategory?.replace("_", " ") ??
                    "Not set"}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Interview Difficulty:</span>{" "}
                <strong className="text-zinc-900 dark:text-white capitalize">
                  {candidateProfile?.preferredDifficulty ?? "medium"}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500">Session Duration:</span>{" "}
                <strong className="text-zinc-900 dark:text-white">
                  {candidateProfile?.preferredDurationMinutes ?? 45} mins
                </strong>
              </div>
              <div>
                <span className="text-zinc-500">Personality Style:</span>{" "}
                <strong className="text-zinc-900 dark:text-white capitalize">
                  {candidateProfile?.preferredPersonality ?? "professional"}
                </strong>
              </div>
            </div>
          </div>

          {/* AI Provider Status & Benchmark */}
          <AiProviderStatusCard />

          {/* Past Sessions List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="font-bold text-base text-zinc-900 dark:text-white mb-2">
              Recent Interview Sessions
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
              Full transcripts, recorded evidence ledger, and rubrics from
              completed loops.
            </p>

            <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                No interview sessions recorded yet
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Launch your first practice interview to generate evidence and
                obtain detailed competency scoring.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Configure & Start First Interview
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar / Quick Tips */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">
              Interview Tips & Best Practices
            </h2>
            <ul className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>
                  <strong>Think aloud:</strong> The AI interviewer evaluates
                  your problem-solving process and reasoning steps, not just
                  final answers.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>
                  <strong>Clarify assumptions:</strong> State your trade-offs,
                  constraints, and why you pick a specific data structure or
                  architectural pattern.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>
                  <strong>Handle follow-ups:</strong> The interviewer adapts
                  questions based on what you say — expect edge cases, scaling
                  questions, and failure modes.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="font-bold text-sm text-zinc-900 dark:text-white mb-1">
              Account Overview
            </h2>
            <div className="mt-3 text-xs space-y-2">
              <div className="flex justify-between text-zinc-500">
                <span>Account Status</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                  {user.status}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Member Since</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Domain</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                  {candidateProfile?.domain ?? "Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
