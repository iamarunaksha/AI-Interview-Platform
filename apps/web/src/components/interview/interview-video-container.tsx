"use client";

import React, { useState } from "react";
import {
  type InterviewerPersonality,
  type CompanyCategory,
  type VideoQualityMetrics,
  InterviewStage,
  VideoLayoutMode,
} from "@interviewai/shared-types";
import { InterviewAiAvatar } from "./interview-ai-avatar";
import { InterviewVideoFeed } from "./interview-video-feed";

interface InterviewVideoContainerProps {
  isAssistantSpeaking: boolean;
  stage?: InterviewStage;
  personality?: InterviewerPersonality;
  companyCategory?: CompanyCategory;
  targetRole?: string;
  candidateName?: string;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  layoutMode: VideoLayoutMode;
  onChangeLayoutMode: (mode: VideoLayoutMode) => void;
  onMetricsUpdate?: (metrics: VideoQualityMetrics) => void;
}

export function InterviewVideoContainer({
  isAssistantSpeaking,
  stage,
  personality,
  companyCategory,
  targetRole,
  candidateName,
  isCameraActive,
  onToggleCamera,
  layoutMode,
  onChangeLayoutMode,
  onMetricsUpdate,
}: InterviewVideoContainerProps) {
  const [hasDismissedConsent, setHasDismissedConsent] = useState(false);

  return (
    <div className="space-y-4">
      {/* Privacy & Recording Consent Notice (Section 10 Compliance) */}
      {!hasDismissedConsent && (
        <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span>
              <strong className="text-zinc-200">Privacy First: </strong>
              Video is rendered locally in your browser. It is never analyzed
              for emotions or facial expressions.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHasDismissedConsent(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[11px] font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      )}

      {/* Unified Persistent Container - Video Feed NEVER Unmounts on Layout Switch */}
      <div
        className={
          layoutMode === VideoLayoutMode.PIP
            ? "relative"
            : layoutMode === VideoLayoutMode.GRID
              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
              : layoutMode === VideoLayoutMode.SPEAKER
                ? "grid grid-cols-1 md:grid-cols-12 gap-4"
                : "flex flex-col gap-4"
        }
      >
        <div
          className={
            layoutMode === VideoLayoutMode.PIP
              ? "w-full"
              : layoutMode === VideoLayoutMode.SPEAKER
                ? `transition-all ${
                    isAssistantSpeaking
                      ? "md:col-span-8 order-1"
                      : "md:col-span-4 order-2"
                  }`
                : ""
          }
        >
          <InterviewAiAvatar
            isAssistantSpeaking={isAssistantSpeaking}
            stage={stage}
            personality={personality}
            companyCategory={companyCategory}
            targetRole={targetRole}
            isCompact={
              layoutMode === VideoLayoutMode.SIDEBAR ||
              (layoutMode === VideoLayoutMode.SPEAKER && !isAssistantSpeaking)
            }
          />
        </div>

        <div
          className={
            layoutMode === VideoLayoutMode.PIP
              ? "absolute bottom-4 right-4 z-20 w-56 sm:w-64 shadow-2xl rounded-2xl overflow-hidden border-2 border-indigo-500/60 transition-transform transform hover:scale-105"
              : layoutMode === VideoLayoutMode.SPEAKER
                ? `transition-all ${
                    !isAssistantSpeaking
                      ? "md:col-span-8 order-1"
                      : "md:col-span-4 order-2"
                  }`
                : ""
          }
        >
          <InterviewVideoFeed
            isCameraActive={isCameraActive}
            onToggleCamera={onToggleCamera}
            layoutMode={layoutMode}
            onChangeLayoutMode={onChangeLayoutMode}
            onMetricsUpdate={onMetricsUpdate}
            candidateName={candidateName}
            isCompact={
              layoutMode === VideoLayoutMode.PIP ||
              layoutMode === VideoLayoutMode.SIDEBAR ||
              (layoutMode === VideoLayoutMode.SPEAKER && isAssistantSpeaking)
            }
          />
        </div>
      </div>
    </div>
  );
}
