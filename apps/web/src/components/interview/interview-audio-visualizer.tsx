"use client";

import React from "react";

interface InterviewAudioVisualizerProps {
  micVolume: number; // 0 - 100
  isAssistantSpeaking: boolean;
  isMicActive: boolean;
  processingStage?:
    | "idle"
    | "listening"
    | "transcribing"
    | "thinking"
    | "speaking";
}

export function InterviewAudioVisualizer({
  micVolume,
  isAssistantSpeaking,
  isMicActive,
  processingStage = "idle",
}: InterviewAudioVisualizerProps) {
  // Generate 16 bars for the waveform display
  const barCount = 16;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
      <div className="flex items-center gap-1.5 h-16 w-full max-w-sm justify-center">
        {bars.map((barIndex) => {
          let heightPercent = 15;

          if (isAssistantSpeaking) {
            // Pure sine wave pattern for AI voice activity
            const phase = (barIndex / barCount) * Math.PI;
            heightPercent = 30 + Math.sin(phase) * 60;
          } else if (isMicActive && micVolume > 5) {
            // Dynamic heights mapped to microphone RMS volume with variation
            const factor = Math.sin((barIndex / barCount) * Math.PI);
            heightPercent = Math.max(
              12,
              Math.min(95, micVolume * factor * 1.2),
            );
          }

          return (
            <div
              key={barIndex}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isAssistantSpeaking
                  ? "bg-gradient-to-t from-indigo-500 to-purple-400"
                  : isMicActive && micVolume > 10
                    ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                    : "bg-zinc-700/60"
              }`}
              style={{
                height: `${heightPercent}%`,
              }}
            />
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {isAssistantSpeaking || processingStage === "speaking" ? (
          <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
            AI Interviewer is speaking...
          </span>
        ) : processingStage === "transcribing" ? (
          <span className="flex items-center gap-1.5 text-amber-300 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            Transcribing your speech...
          </span>
        ) : processingStage === "thinking" ? (
          <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
            AI Interviewer is thinking...
          </span>
        ) : (isMicActive && micVolume > 10) || processingStage === "listening" ? (
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Listening to your answer...
          </span>
        ) : isMicActive ? (
          <span className="text-zinc-400">
            Microphone active (Speak anytime)
          </span>
        ) : (
          <span className="text-zinc-500">Microphone muted</span>
        )}
      </div>
    </div>
  );
}
