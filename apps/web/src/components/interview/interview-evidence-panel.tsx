"use client";

import React, { useState } from "react";
import {
  type EvidenceRecord,
  ReasoningQuality,
} from "@interviewai/shared-types";

interface InterviewEvidencePanelProps {
  evidence: EvidenceRecord[];
  onBatchExtract?: () => Promise<void>;
  isExtracting?: boolean;
}

export function InterviewEvidencePanel({
  evidence,
  onBatchExtract,
  isExtracting = false,
}: InterviewEvidencePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getQualityBadge = (quality: ReasoningQuality) => {
    switch (quality) {
      case ReasoningQuality.EXCELLENT:
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
            ★ Excellent
          </span>
        );
      case ReasoningQuality.GOOD:
        return (
          <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 ring-1 ring-cyan-500/20">
            ✓ Good
          </span>
        );
      case ReasoningQuality.FAIR:
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/20">
            ⚡ Fair
          </span>
        );
      case ReasoningQuality.POOR:
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/20">
            ⚠ Needs Improvement
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Evidence Collection Engine
            </h3>
            <p className="text-xs text-zinc-400">
              {evidence.length}{" "}
              {evidence.length === 1 ? "evidence turn" : "evidence turns"} mined
            </p>
          </div>
        </div>

        {onBatchExtract && (
          <button
            type="button"
            onClick={() => void onBatchExtract()}
            disabled={isExtracting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {isExtracting ? (
              <>
                <svg
                  className="h-3.5 w-3.5 animate-spin"
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
                Mining Evidence...
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync Transcript
              </>
            )}
          </button>
        )}
      </div>

      {evidence.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center">
          <p className="text-xs text-zinc-500">
            No technical evidence extracted yet. When the candidate explains
            concepts or architecture, factual claims and concept classifications
            will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {evidence.map((record) => {
            const isExpanded = expandedId === record.id;
            return (
              <div
                key={record.id}
                className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40 transition-colors"
              >
                <div
                  className="flex cursor-pointer items-center justify-between p-3.5 hover:bg-zinc-800/20"
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <div className="flex-1 pr-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {getQualityBadge(record.reasoningQuality)}

                      {record.practicalExperience ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-400 ring-1 ring-violet-500/20">
                          ⚡ Production Experience
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          Theoretical
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-500">
                        {Math.round(record.confidence * 100)}% confidence
                      </span>
                    </div>

                    <p className="line-clamp-1 text-xs font-medium text-zinc-200">
                      Q: {record.questionAsked}
                    </p>
                  </div>

                  <svg
                    className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                    <div>
                      <h4 className="mb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                        Candidate Answer
                      </h4>
                      <blockquote className="rounded bg-zinc-950/60 p-2.5 text-xs text-zinc-300 italic border-l-2 border-indigo-500">
                        &quot;{record.candidateAnswer}&quot;
                      </blockquote>
                    </div>

                    {record.technicalClaims.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                          Technical Claims Extracted
                        </h4>
                        <ul className="list-inside list-disc space-y-1 text-xs text-zinc-300">
                          {record.technicalClaims.map((claim, idx) => (
                            <li key={idx}>{claim}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h4 className="mb-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                        Concepts Ledger
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {record.correctConcepts.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded bg-emerald-950/50 px-2 py-0.5 text-[11px] text-emerald-300 ring-1 ring-emerald-800/50"
                          >
                            ✓ {c}
                          </span>
                        ))}
                        {record.incorrectConcepts.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded bg-rose-950/50 px-2 py-0.5 text-[11px] text-rose-300 ring-1 ring-rose-800/50"
                          >
                            ✕ {c}
                          </span>
                        ))}
                        {record.missingConcepts.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded bg-amber-950/30 px-2 py-0.5 text-[11px] text-amber-400/80 ring-1 ring-amber-800/30"
                          >
                            - {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {record.notes && (
                      <div>
                        <h4 className="mb-0.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                          Evaluator Notes
                        </h4>
                        <p className="text-xs text-zinc-400">{record.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
