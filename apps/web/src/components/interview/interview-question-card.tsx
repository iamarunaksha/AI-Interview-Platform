"use client";

import React, { useState } from "react";
import type { QuestionResponse } from "@interviewai/shared-types";

interface InterviewQuestionCardProps {
  question: QuestionResponse | null;
  allowHints?: boolean;
}

export function InterviewQuestionCard({
  question,
  allowHints = false,
}: InterviewQuestionCardProps) {
  const [showHints, setShowHints] = useState(false);

  if (!question) {
    return (
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-center">
        <p className="text-zinc-400 text-sm">
          No specific question loaded. The AI interviewer will introduce the
          problem.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {question.competency?.name || "Core Technical Competency"}
        </span>
        {allowHints && (
          <button
            type="button"
            onClick={() => setShowHints(!showHints)}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
          >
            {showHints ? "Hide Interview Hints" : "Show Interview Hints"}
          </button>
        )}
      </div>

      <h2 className="text-lg font-semibold text-zinc-100 mb-2">
        {question.title}
      </h2>

      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line mb-4">
        {question.stem}
      </p>

      {allowHints && showHints && (
        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Key Concepts to Cover
            </span>
            <div className="flex flex-wrap gap-1.5">
              {question.expectedConcepts.map((concept, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>

          {question.commonMisconceptions?.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider block mb-1">
                Common Pitfalls to Avoid
              </span>
              <ul className="text-xs text-zinc-400 list-disc list-inside space-y-0.5">
                {question.commonMisconceptions.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
