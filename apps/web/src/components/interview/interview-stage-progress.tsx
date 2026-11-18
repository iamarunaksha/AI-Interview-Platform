"use client";

import React from "react";
import { InterviewStage } from "@interviewai/shared-types";

interface InterviewStageProgressProps {
  currentStage: InterviewStage;
  stageTurnCount?: number;
}

const STAGES = [
  {
    stage: InterviewStage.GREETING,
    label: "1. Greeting",
    desc: "Expectations",
  },
  {
    stage: InterviewStage.PROBLEM_FRAMING,
    label: "2. Framing",
    desc: "Scope & Context",
  },
  {
    stage: InterviewStage.PROBING,
    label: "3. Probing",
    desc: "Core Mechanics",
  },
  {
    stage: InterviewStage.DEEP_DIVE,
    label: "4. Deep Dive",
    desc: "Scale & Resilience",
  },
  { stage: InterviewStage.WRAP_UP, label: "5. Wrap-Up", desc: "Q&A & Summary" },
];

export function InterviewStageProgress({
  currentStage,
  stageTurnCount = 0,
}: InterviewStageProgressProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.stage === currentStage);

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Interview Progression (FSM)
        </span>
        <span className="text-xs text-indigo-400 font-medium">
          Turns in stage: {stageTurnCount}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {STAGES.map((s, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = s.stage === currentStage;

          let stepStyle = "bg-zinc-950/60 border-zinc-800 text-zinc-500";
          if (isCompleted) {
            stepStyle =
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
          } else if (isCurrent) {
            stepStyle =
              "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/30";
          }

          return (
            <div
              key={s.stage}
              className={`flex flex-col p-2.5 rounded-xl border text-center transition-all ${stepStyle}`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {isCompleted ? (
                  <svg
                    className="w-3.5 h-3.5 text-emerald-400"
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
                ) : isCurrent ? (
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700"></span>
                )}
                <span className="text-xs font-semibold leading-none">
                  {s.label}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 leading-tight hidden sm:block">
                {s.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
