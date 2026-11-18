"use client";

import React from "react";
import {
  type InterviewerPersonality,
  CompanyCategory,
  InterviewStage,
} from "@interviewai/shared-types";

interface InterviewAiAvatarProps {
  isAssistantSpeaking: boolean;
  stage?: InterviewStage;
  personality?: InterviewerPersonality;
  companyCategory?: CompanyCategory;
  targetRole?: string;
  isCompact?: boolean;
}

export function InterviewAiAvatar({
  isAssistantSpeaking,
  stage = InterviewStage.PROBING,
  personality,
  companyCategory,
  targetRole = "Senior Engineer",
  isCompact = false,
}: InterviewAiAvatarProps) {
  // Determine interviewer name and avatar title based on company style
  const getInterviewerTitle = () => {
    switch (companyCategory) {
      case CompanyCategory.FAANG_STYLE:
        return "Principal Architect (FAANG Bar Raiser)";
      case CompanyCategory.PRODUCT_COMPANY:
        return "Staff Engineer & Tech Lead";
      case CompanyCategory.SERVICE_COMPANY:
        return "Senior Technical Consultant";
      case CompanyCategory.SAP_PRODUCT:
      case CompanyCategory.SAP_CONSULTING:
      case CompanyCategory.SAP_CUSTOMER:
        return "Lead Enterprise SAP Architect";
      default:
        return "Lead Technical Interviewer";
    }
  };

  const getStatusText = () => {
    if (isAssistantSpeaking) return "Speaking...";
    if (stage === InterviewStage.GREETING) return "Welcoming candidate";
    if (stage === InterviewStage.PROBLEM_FRAMING)
      return "Framing technical problem";
    if (stage === InterviewStage.DEEP_DIVE) return "Stress testing edge cases";
    if (stage === InterviewStage.WRAP_UP) return "Concluding interview";
    return "Listening actively...";
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border transition-all ${
        isAssistantSpeaking
          ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-gradient-to-b from-zinc-900 to-zinc-950"
          : "border-zinc-800 bg-zinc-900/90"
      } ${isCompact ? "p-3" : "p-5"}`}
    >
      {/* Background Ambience Glow */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
          isAssistantSpeaking
            ? "bg-emerald-500/20 opacity-100"
            : "bg-indigo-500/10 opacity-50"
        }`}
      />

      <div className="relative flex flex-col items-center justify-center text-center space-y-4">
        {/* Avatar Visual Presence with Reactive Soundwave Rings */}
        <div className="relative flex items-center justify-center mt-2">
          {/* Outer Pulsing Wave Ring */}
          {isAssistantSpeaking && (
            <>
              <div className="absolute -inset-4 rounded-full border border-emerald-400/30 animate-ping opacity-75" />
              <div className="absolute -inset-2 rounded-full border-2 border-emerald-500/40 animate-pulse" />
            </>
          )}

          {/* Core Avatar Frame */}
          <div
            className={`relative rounded-full flex items-center justify-center shadow-inner transition-all ${
              isCompact ? "w-16 h-16" : "w-24 h-24"
            } ${
              isAssistantSpeaking
                ? "bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 ring-4 ring-emerald-400/40"
                : "bg-gradient-to-tr from-indigo-900 via-zinc-800 to-zinc-900 ring-2 ring-zinc-700"
            }`}
          >
            {/* Holographic Avatar Graphic / Icon */}
            <div className="text-3xl select-none">
              {isAssistantSpeaking ? "🗣️" : "🤖"}
            </div>

            {/* Speaking Audio Waveform Bars Indicator */}
            {isAssistantSpeaking && (
              <div className="absolute -bottom-2 flex items-center gap-0.5 px-2 py-0.5 bg-zinc-950/90 border border-emerald-500/40 rounded-full shadow-lg">
                <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
              </div>
            )}
          </div>
        </div>

        {/* Interviewer Metadata */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="font-bold text-sm sm:text-base text-zinc-100">
              AI Technical Interviewer
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              AI Powered
            </span>
          </div>

          <p className="text-xs text-zinc-400 font-medium">
            {getInterviewerTitle()}
          </p>
          <p className="text-[11px] text-zinc-500">
            Interviewing for:{" "}
            <span className="text-zinc-300">{targetRole}</span>
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isAssistantSpeaking
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isAssistantSpeaking
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-zinc-500"
              }`}
            />
            <span>{getStatusText()}</span>
          </div>

          {personality && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 capitalize">
              {personality} Style
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
