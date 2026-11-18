"use client";

import React from "react";
import Link from "next/link";
import {
  type InterviewReport,
  EvaluationRating,
} from "@interviewai/shared-types";

interface InterviewEvaluationCardProps {
  report: InterviewReport | null;
  isEvaluating: boolean;
  onEvaluate: () => Promise<void>;
  isSessionConcluded: boolean;
}

export function InterviewEvaluationCard({
  report,
  isEvaluating,
  onEvaluate,
  isSessionConcluded,
}: InterviewEvaluationCardProps) {
  const getRatingBadge = (rating: EvaluationRating) => {
    switch (rating) {
      case EvaluationRating.STRONG:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/25">
            ★ STRONG HIRE
          </span>
        );
      case EvaluationRating.PROFICIENT:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 ring-1 ring-cyan-500/25">
            ✓ PROFICIENT / HIRE
          </span>
        );
      case EvaluationRating.DEVELOPING:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 ring-1 ring-amber-500/25">
            ⚡ DEVELOPING
          </span>
        );
      case EvaluationRating.POOR:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 ring-1 ring-rose-500/25">
            ✕ NEEDS IMPROVEMENT
          </span>
        );
    }
  };

  const getScoreWidth = (score: number | null) => {
    if (score === null || isNaN(score)) return "0%";
    const pct = Math.min(100, Math.max(0, (score / 4) * 100));
    return `${pct}%`;
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl backdrop-blur-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
              ⚖
            </span>
            <h3 className="text-base font-bold text-zinc-100">
              Independent Rubric Evaluation
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Grounded in multi-turn transcript claims & verifiable evidence
            records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {report && (
            <Link
              href={`/interview/${report.sessionId}/report`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2 text-xs font-semibold text-zinc-200 shadow-sm transition-all hover:bg-zinc-700 hover:text-white"
            >
              <span>📄</span>
              <span>Full Executive Report</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => void onEvaluate()}
            disabled={isEvaluating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Evaluating Rubrics...
              </>
            ) : report ? (
              "Re-evaluate Session"
            ) : (
              "Generate Evaluation Report"
            )}
          </button>
        </div>
      </div>

      {!report ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center space-y-3">
          <p className="text-sm font-medium text-zinc-300">
            {isSessionConcluded
              ? "Interview session completed. Click 'Generate Evaluation Report' to run the independent rubric engine."
              : "Evaluation can be run at any time to generate an interim or final rubric scorecard."}
          </p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            The independent evaluation engine synthesizes transcript turns,
            verifiable claims, and competency rubrics without interviewer bias.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Overall Score
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-zinc-100">
                  {report.overallScore !== null
                    ? report.overallScore.toFixed(1)
                    : "—"}
                </span>
                <span className="text-sm font-medium text-zinc-500">/ 4.0</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Assessment Rating
              </span>
              <div className="mt-1.5">
                {getRatingBadge(report.overallRating)}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Evaluator Model
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                {report.evaluatorModel || "gemini-2.0-flash"}
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Executive Evaluation Summary
            </h4>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs leading-relaxed text-zinc-300">
              {report.summary}
            </div>
          </div>

          {/* Competency Scores Breakdown */}
          {report.competencyScores.length > 0 && (
            <div>
              <h4 className="mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Competency Rubric Breakdown
              </h4>
              <div className="space-y-3">
                {report.competencyScores.map((cs, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">
                          {cs.competencyName}
                        </span>
                        {cs.evidenceRefs && cs.evidenceRefs.length > 0 && (
                          <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-400 font-mono">
                            {cs.evidenceRefs.length} cited evidence
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-300">
                          {cs.score !== null ? cs.score.toFixed(1) : "—"} / 4.0
                        </span>
                        {getRatingBadge(cs.rating)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                        style={{ width: getScoreWidth(cs.score) }}
                      />
                    </div>

                    <p className="text-xs text-zinc-400 leading-normal">
                      {cs.justification}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.strengths.length > 0 && (
              <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-4">
                <h4 className="mb-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>✓</span> Demonstrated Strengths
                </h4>
                <ul className="list-inside list-disc space-y-1.5 text-xs text-zinc-300">
                  {report.strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.weaknesses.length > 0 && (
              <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
                <h4 className="mb-2 text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>⚠</span> Identified Growth Areas
                </h4>
                <ul className="list-inside list-disc space-y-1.5 text-xs text-zinc-300">
                  {report.weaknesses.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actionable Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="rounded-xl border border-indigo-900/30 bg-indigo-950/10 p-4">
              <h4 className="mb-2 text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <span>🎯</span> Recommended Next Steps & Practice Topics
              </h4>
              <ul className="list-inside list-disc space-y-1.5 text-xs text-zinc-300">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
