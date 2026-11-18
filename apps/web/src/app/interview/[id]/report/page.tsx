"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/auth-context";
import { api } from "../../../../lib/api-client";
import {
  EvaluationRating,
  type ComprehensiveInterviewReport,
  type DetailedReportEvidence,
} from "@interviewai/shared-types";

interface PageParams {
  params: Promise<{ id: string }>;
}

export default function InterviewReportPage({ params }: PageParams) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [report, setReport] = useState<ComprehensiveInterviewReport | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let active = true;
    params.then((p) => {
      if (active) setSessionId(p.id);
    });
    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.reports.getReport(sessionId);
        if (isMounted) {
          setReport(data);
          if (data && data.competencyScores.length > 0) {
            setSelectedCompetencyId(data.competencyScores[0].competencyId);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load interview report.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleRegenerateReport = async () => {
    if (!sessionId) return;
    try {
      setIsGenerating(true);
      setError(null);
      const updated = await api.reports.generateReport(sessionId);
      setReport(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to regenerate interview report.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = async () => {
    if (!report) return;
    const text = `Interview Report: ${report.targetRole} (${report.domain.toUpperCase()})
Candidate: ${report.candidateName}
Overall Score: ${report.overallScore ?? "N/A"}/4.0 (${getRatingLabel(report.overallRating)})
Date: ${new Date(report.generatedAt).toLocaleDateString()}

Summary:
${report.summary}

Top Strengths:
${report.strengths.map((s) => `• ${s}`).join("\n")}

Key Areas for Growth:
${report.weaknesses.map((w) => `• ${w}`).join("\n")}

Actionable Recommendations:
${report.recommendations.map((r) => `• ${r}`).join("\n")}`;

    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${report.sessionId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRatingBadge = (rating: EvaluationRating) => {
    switch (rating) {
      case EvaluationRating.STRONG:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ★ Strong Hire
          </span>
        );
      case EvaluationRating.PROFICIENT:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            ✓ Hire / Proficient
          </span>
        );
      case EvaluationRating.DEVELOPING:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            ⚡ Developing / Borderline
          </span>
        );
      case EvaluationRating.POOR:
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            ✕ Needs Improvement
          </span>
        );
    }
  };

  const getRatingLabel = (rating: EvaluationRating) => {
    switch (rating) {
      case EvaluationRating.STRONG:
        return "Strong Hire";
      case EvaluationRating.PROFICIENT:
        return "Hire / Proficient";
      case EvaluationRating.DEVELOPING:
        return "Developing";
      case EvaluationRating.POOR:
      default:
        return "Needs Improvement";
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 animate-pulse">
            Loading comprehensive assessment report...
          </p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 shadow-sm">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Interview Report Not Available Yet
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-2 mb-6">
            {error ||
              "This interview session has not been evaluated or recorded yet. Complete the interview room turns to generate the final assessment report."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleRegenerateReport}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isGenerating
                ? "Generating Assessment..."
                : "Generate Report Now"}
            </button>
            <Link
              href={`/interview/${sessionId}`}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-colors"
            >
              Go to Live Interview Room
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter evidence for the active tab/competency if selected
  const activeCompetency = report.competencyScores.find(
    (cs) => cs.competencyId === selectedCompetencyId,
  );
  const activeEvidence: DetailedReportEvidence[] = selectedCompetencyId
    ? report.detailedEvidence.filter(
        (ev) =>
          ev.competencyId === selectedCompetencyId ||
          activeCompetency?.evidenceRefs?.includes(ev.id),
      )
    : report.detailedEvidence;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 py-10 print:py-0 print:bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 print:p-0 print:max-w-none">
        {/* Navigation & Action Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Candidate Dashboard</span>
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link
              href={`/interview/${sessionId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <span>Live Room / Scorecard</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <span>{copySuccess ? "✓ Copied!" : "📋 Copy Summary"}</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <span>💾 Export JSON</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>🖨️ Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-sm print:border-none print:shadow-none print:p-0">
          {/* Header Banner */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[11px] font-semibold uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                    {report.domain.toUpperCase()} Track
                  </span>
                  <span className="text-zinc-400 text-xs">•</span>
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    {report.experienceLevel.toUpperCase()}
                  </span>
                  <span className="text-zinc-400 text-xs">•</span>
                  <span className="text-xs text-zinc-400">
                    Difficulty: {report.difficulty.toUpperCase()}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  {report.targetRole} Assessment Report
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Candidate:{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {report.candidateName}
                  </strong>{" "}
                  ({report.candidateEmail}) • Interview Date:{" "}
                  {new Date(report.generatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Overall Score Badge */}
              <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shrink-0">
                <div className="text-center">
                  <span className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Overall Score
                  </span>
                  <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white">
                      {report.overallScore !== null
                        ? report.overallScore.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-sm font-semibold text-zinc-400">
                      / 4.0
                    </span>
                  </div>
                </div>
                <div className="h-10 w-px bg-zinc-200 dark:bg-zinc-800" />
                <div>
                  <span className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Recommendation
                  </span>
                  {getRatingBadge(report.overallRating)}
                </div>
              </div>
            </div>

            {/* Session Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
              <div>
                <span className="text-zinc-400 block">Session Duration</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                  {report.actualDurationSeconds
                    ? `${Math.floor(report.actualDurationSeconds / 60)}m ${report.actualDurationSeconds % 60}s`
                    : `${report.durationMinutes} mins`}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Dialogue Turns</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                  {report.transcriptLength} conversational turns
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Evidence Records</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                  {report.detailedEvidence.length} technical assertions
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Evaluation Engine</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block truncate">
                  {report.evaluatorModel} ({report.evaluatorProvider})
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Executive Assessment Summary
            </h2>
            <div className="bg-zinc-50/80 dark:bg-zinc-950/60 rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80 text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
              {report.summary}
            </div>
          </div>

          {/* Section 2: Competency Breakdown & Evidence */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Competency Rubric Breakdown
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Standardized 4-tier rubric evaluation with cited evidence
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {report.competencyScores.map((cs) => {
                const scorePercentage = cs.score ? (cs.score / 4) * 100 : 0;
                const isSelected = selectedCompetencyId === cs.competencyId;
                const evidenceCount = cs.evidenceRefs?.length || 0;

                return (
                  <div
                    key={cs.competencyId}
                    className={`rounded-2xl border transition-all p-5 ${
                      isSelected
                        ? "border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                            {cs.competencyName}
                          </h3>
                          {getRatingBadge(cs.rating)}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                          {cs.justification}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0">
                        <span className="text-xl font-bold text-zinc-900 dark:text-white">
                          {cs.score !== null ? cs.score.toFixed(1) : "—"}
                          <span className="text-xs text-zinc-400 font-normal">
                            {" "}
                            / 4.0
                          </span>
                        </span>
                        <button
                          onClick={() =>
                            setSelectedCompetencyId(
                              isSelected ? null : cs.competencyId,
                            )
                          }
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline print:hidden"
                        >
                          {isSelected
                            ? "Hide Evidence"
                            : `View Evidence (${evidenceCount})`}
                        </button>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${scorePercentage}%` }}
                      />
                    </div>

                    {/* Linked Evidence Section */}
                    {isSelected && (
                      <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Recorded Turn Evidence for {cs.competencyName}
                        </span>

                        {activeEvidence.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">
                            No direct dialogue quotes were cited for this
                            competency.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {activeEvidence.map((ev) => (
                              <div
                                key={ev.id}
                                className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs space-y-2"
                              >
                                <div>
                                  <span className="font-semibold text-zinc-500 block">
                                    Question:
                                  </span>
                                  <p className="text-zinc-800 dark:text-zinc-200 italic mt-0.5">
                                    &ldquo;{ev.questionAsked}&rdquo;
                                  </p>
                                </div>

                                <div>
                                  <span className="font-semibold text-zinc-500 block">
                                    Candidate Response:
                                  </span>
                                  <p className="text-zinc-700 dark:text-zinc-300 mt-0.5">
                                    &ldquo;{ev.candidateAnswer}&rdquo;
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {ev.correctConcepts.map((c) => (
                                    <span
                                      key={c}
                                      className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20"
                                    >
                                      ✓ {c}
                                    </span>
                                  ))}
                                  {ev.missingConcepts.map((m) => (
                                    <span
                                      key={m}
                                      className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20"
                                    >
                                      Missing: {m}
                                    </span>
                                  ))}
                                  {ev.incorrectConcepts.map((ic) => (
                                    <span
                                      key={ic}
                                      className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-semibold border border-rose-500/20"
                                    >
                                      ✕ {ic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Strengths & Growth Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Strengths */}
            <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🌟</span>
                <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                  Key Technical Strengths
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {report.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Areas */}
            <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🎯</span>
                <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                  Target Technical Gaps
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {report.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">⚡</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 4: Factual Audit (Incorrect Statements) */}
          {report.incorrectStatements &&
            report.incorrectStatements.length > 0 && (
              <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl p-6 mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">⚠️</span>
                  <h3 className="font-bold text-sm text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                    Technical Accuracy & Factual Audit
                  </h3>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-400 mb-3">
                  The independent evaluator identified the following inaccurate
                  or misleading technical statements during the interview:
                </p>
                <ul className="space-y-2 text-xs text-rose-900 dark:text-rose-200">
                  {report.incorrectStatements.map((stmt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold">✕</span>
                      <span>{stmt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Section 5: Recommendations & Next Steps */}
          <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">
              Strategic Next Steps & Action Plan
            </h2>
            <div className="space-y-3 mb-6">
              {report.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center shrink-0 font-bold">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-500">
                  Suggested Difficulty for Next Session:
                </span>{" "}
                <strong className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 ml-1">
                  {report.suggestedNextDifficulty}
                </strong>
              </div>

              <div className="flex items-center gap-3 print:hidden">
                <Link
                  href="/interview/new"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                >
                  Start Next Practice Session →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
