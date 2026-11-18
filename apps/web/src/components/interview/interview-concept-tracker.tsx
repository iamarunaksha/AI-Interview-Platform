"use client";

import React from "react";
import type { ProbingQuestion } from "@interviewai/shared-types";

interface InterviewConceptTrackerProps {
  coveredConcepts: string[];
  remainingConcepts: string[];
  activeProbingQuestion?: ProbingQuestion | null;
}

export function InterviewConceptTracker({
  coveredConcepts,
  remainingConcepts,
  activeProbingQuestion,
}: InterviewConceptTrackerProps) {
  const total = coveredConcepts.length + remainingConcepts.length;
  const coveragePercent =
    total > 0 ? Math.round((coveredConcepts.length / total) * 100) : 0;

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Technical Concept Ledger
        </span>
        <span className="text-xs font-mono text-zinc-300">
          {coveredConcepts.length}/{total} Covered ({coveragePercent}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${coveragePercent}%` }}
        />
      </div>

      {/* Concept badges */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {coveredConcepts.map((concept) => (
          <span
            key={concept}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          >
            <svg
              className="w-3 h-3 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{concept}</span>
          </span>
        ))}

        {remainingConcepts.map((concept) => (
          <span
            key={concept}
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
          >
            {concept}
          </span>
        ))}

        {total === 0 && (
          <span className="text-xs text-zinc-500 italic">
            Concepts will be identified once problem is introduced.
          </span>
        )}
      </div>

      {/* Active probing focus callout */}
      {activeProbingQuestion && (
        <div className="mt-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200">
          <span className="font-semibold text-indigo-400 uppercase tracking-wider block text-[10px] mb-0.5">
            Active Probing Target ({activeProbingQuestion.targetConcept})
          </span>
          <p className="italic text-zinc-300">
            &quot;{activeProbingQuestion.probeText}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
