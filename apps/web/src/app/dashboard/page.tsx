"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import { AiProviderStatusCard } from "../../components/ai-provider-status-card";
import { api } from "../../lib/api-client";
import {
  EvaluationRating,
  type CandidateDashboardMetrics,
} from "@interviewai/shared-types";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    candidateProfile,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [metrics, setMetrics] = useState<CandidateDashboardMetrics | null>(
    null,
  );
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    const loadDashboard = async () => {
      try {
        setLoadingMetrics(true);
        const data = await api.reports.getDashboardMetrics();
        if (isMounted) {
          setMetrics(data);
        }
      } catch {
        // Keep default null state if network/unauthenticated
      } finally {
        if (isMounted) {
          setLoadingMetrics(false);
        }
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (authLoading) {
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

  const getRatingBadge = (rating: EvaluationRating | null) => {
    if (!rating) {
      return (
        <span className="text-zinc-400 text-xs italic">Pending Evaluation</span>
      );
    }
    switch (rating) {
      case EvaluationRating.STRONG:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ★ Strong Hire
          </span>
        );
      case EvaluationRating.PROFICIENT:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            ✓ Proficient
          </span>
        );
      case EvaluationRating.DEVELOPING:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            ⚡ Developing
          </span>
        );
      case EvaluationRating.POOR:
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            ✕ Needs Improvement
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 text-white shadow-sm">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3">
            Candidate Analytics & Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-blue-100 text-sm mt-2 leading-relaxed">
            Your personalized AI technical interview track is configured and
            ready. Practice realistic voice & video sessions with adaptive
            follow-ups, real-time evidence recording, and independent rubric
            evaluations.
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
              Question Bank & Tracks
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

      {/* KPI Performance Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Total Sessions
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
              {metrics ? metrics.totalInterviews : 0}
            </span>
            <span className="text-xs text-zinc-400">interviews</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Completed
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics ? metrics.completedInterviews : 0}
            </span>
            <span className="text-xs text-zinc-400">evaluated</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Average Score
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {metrics?.averageScore !== null &&
              metrics?.averageScore !== undefined
                ? metrics.averageScore.toFixed(1)
                : "—"}
            </span>
            <span className="text-xs text-zinc-400 font-medium">/ 4.0</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Highest Score
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {metrics?.highestScore !== null &&
              metrics?.highestScore !== undefined
                ? metrics.highestScore.toFixed(1)
                : "—"}
            </span>
            <span className="text-xs text-zinc-400 font-medium">/ 4.0</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Competency Mastery Overview */}
          {metrics && metrics.competencyPerformance.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
                <div>
                  <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                    Competency Performance Breakdown
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Aggregated proficiency scores across all evaluated loops
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {metrics.competencyPerformance.length} Competencies Scored
                </span>
              </div>

              <div className="space-y-4">
                {metrics.competencyPerformance.map((comp) => {
                  const pct = (comp.averageScore / 4) * 100;
                  return (
                    <div key={comp.competencyId} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {comp.competencyName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">
                            ({comp.evaluationsCount} evaluations)
                          </span>
                          <strong className="text-zinc-900 dark:text-white font-bold">
                            {comp.averageScore.toFixed(1)} / 4.0
                          </strong>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Sessions List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
              <div>
                <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                  Interview Session History
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Complete transcripts, recorded evidence ledger, and rubrics
                </p>
              </div>
              <Link
                href="/interview/new"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                + New Practice Session
              </Link>
            </div>

            {loadingMetrics ? (
              <div className="py-8 text-center text-xs text-zinc-400 animate-pulse">
                Loading session records...
              </div>
            ) : !metrics || metrics.recentSessions.length === 0 ? (
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
                  href="/interview/new"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Start Your First Interview
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">
                          {sess.targetRole}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {sess.domain}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                          {sess.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>
                          {new Date(sess.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          {sess.actualDurationSeconds
                            ? `${Math.floor(sess.actualDurationSeconds / 60)} mins`
                            : `${sess.durationMinutes} mins`}
                        </span>
                        <span>•</span>
                        <span className="capitalize font-medium text-zinc-500">
                          {sess.status.toLowerCase().replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {sess.overallScore !== null ? (
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="font-extrabold text-base text-zinc-900 dark:text-white">
                              {sess.overallScore.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              /4.0
                            </span>
                          </div>
                        ) : null}
                        <div>{getRatingBadge(sess.overallRating)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sess.hasReport && (
                          <Link
                            href={`/interview/${sess.id}/report`}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-colors"
                          >
                            View Report
                          </Link>
                        )}
                        <Link
                          href={`/interview/${sess.id}`}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
                        >
                          Room
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Track Profile */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
              <div>
                <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                  Active Interview Track Settings
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Your baseline configuration for practice interview generation
                </p>
              </div>
              <Link
                href="/onboarding"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Edit Track Settings
              </Link>
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
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Recommended Next Step */}
          {metrics && (
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-2xl p-6 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-3">
                AI Next Recommendation
              </span>
              <h3 className="font-bold text-base mb-1">Target Focus Track</h3>
              <p className="text-xs text-blue-100 leading-relaxed mb-4">
                Based on your aggregate evaluation scores, focus on mastering
                these high-impact concepts:
              </p>

              <div className="space-y-2 mb-6">
                {metrics.recommendedNextStep.recommendedTopics.map(
                  (topic, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium flex items-center gap-2"
                    >
                      <span>⚡</span>
                      <span>{topic}</span>
                    </div>
                  ),
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span>Suggested Difficulty:</span>
                <strong className="uppercase font-bold text-emerald-300">
                  {metrics.recommendedNextStep.suggestedDifficulty}
                </strong>
              </div>

              <Link
                href="/interview/new"
                className="mt-4 w-full block text-center py-2.5 rounded-xl bg-white text-zinc-900 hover:bg-blue-50 font-semibold text-xs transition-colors shadow-sm"
              >
                Launch Recommended Practice
              </Link>
            </div>
          )}

          {/* AI Provider Status Card */}
          <AiProviderStatusCard />

          {/* Account Overview */}
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
