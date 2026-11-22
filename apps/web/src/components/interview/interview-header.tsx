"use client";

import React, { useEffect, useState } from "react";
import {
  InterviewStatus,
  InterviewDifficulty,
} from "@interviewai/shared-types";

interface InterviewHeaderProps {
  title: string;
  targetRole: string;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  startedAt?: string | null;
  onEndInterview: () => void;
  examinerMode?: boolean;
  onToggleExaminerMode?: () => void;
}

export function InterviewHeader({
  title,
  targetRole,
  difficulty,
  status,
  startedAt,
  onEndInterview,
  examinerMode = false,
  onToggleExaminerMode,
}: InterviewHeaderProps) {
  const getInitialElapsed = React.useCallback(() => {
    if (startedAt) {
      const parsed = new Date(startedAt).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        return Math.max(0, Math.floor((Date.now() - parsed) / 1000));
      }
    }
    return 0;
  }, [startedAt]);

  const [elapsedSeconds, setElapsedSeconds] = useState(getInitialElapsed);

  // Active running timer that ticks once per second when in progress
  useEffect(() => {
    if (
      status === InterviewStatus.COMPLETED ||
      status === InterviewStatus.PAUSED
    ) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (startedAt) {
          const parsed = new Date(startedAt).getTime();
          if (!isNaN(parsed) && parsed > 0) {
            return Math.max(0, Math.floor((Date.now() - parsed) / 1000));
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startedAt]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case InterviewStatus.IN_PROGRESS:
      case InterviewStatus.CREATED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Live Interview
          </span>
        );
      case InterviewStatus.PAUSED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            Paused
          </span>
        );
      case InterviewStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-700/50 text-zinc-300">
            Connecting...
          </span>
        );
    }
  };

  const getDifficultyBadge = () => {
    switch (difficulty) {
      case InterviewDifficulty.EASY:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case InterviewDifficulty.HARD:
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
          AI
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-zinc-400">
            Target Role:{" "}
            <span className="text-zinc-300 font-medium">{targetRole}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Difficulty pill */}
        <span
          className={`text-xs uppercase font-medium px-2.5 py-1 rounded-md border ${getDifficultyBadge()}`}
        >
          {difficulty}
        </span>

        {/* Timer */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-sm font-mono text-zinc-200">
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Examiner mode toggle (hidden by default for candidates) */}
        {onToggleExaminerMode && (
          <button
            onClick={onToggleExaminerMode}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              examinerMode
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-400 border-zinc-800"
            }`}
            title="Toggle Examiner Evaluation & Evidence Ledger"
          >
            {examinerMode ? "Examiner Mode: ON" : "Examiner Mode"}
          </button>
        )}

        {/* End interview button */}
        {status !== InterviewStatus.COMPLETED && (
          <button
            onClick={onEndInterview}
            className="text-xs font-semibold px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
          >
            End Interview
          </button>
        )}
      </div>
    </header>
  );
}
