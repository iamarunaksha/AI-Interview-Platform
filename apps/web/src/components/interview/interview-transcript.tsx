"use client";

import React, { useEffect, useRef } from "react";
import { MessageRole, type TranscriptTurn } from "@interviewai/shared-types";

interface InterviewTranscriptProps {
  transcript: TranscriptTurn[];
  streamingDelta?: string | null;
  streamingRole?: MessageRole | null;
}

export function InterviewTranscript({
  transcript,
  streamingDelta,
  streamingRole,
}: InterviewTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, streamingDelta]);

  return (
    <div className="flex flex-col h-[400px] bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Live Conversation Transcript
        </span>
        <span className="text-xs text-zinc-500">
          {transcript.length} {transcript.length === 1 ? "turn" : "turns"}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth"
      >
        {transcript.length === 0 && !streamingDelta ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-10">
            <svg
              className="w-10 h-10 mb-2 opacity-50 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">
              Conversation will appear here as you speak.
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Speak clearly into your microphone or type in the message box
              below.
            </p>
          </div>
        ) : (
          transcript.map((turn) => {
            const isAssistant = turn.role === MessageRole.ASSISTANT;
            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span
                    className={`text-[11px] font-semibold uppercase ${
                      isAssistant ? "text-indigo-400" : "text-emerald-400"
                    }`}
                  >
                    {isAssistant ? "AI Interviewer" : "You (Candidate)"}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(turn.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isAssistant
                      ? "bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 rounded-tl-sm"
                      : "bg-emerald-600/20 text-emerald-100 border border-emerald-500/30 rounded-tr-sm"
                  }`}
                >
                  {turn.text}
                </div>
              </div>
            );
          })
        )}

        {/* Live streaming delta indicator */}
        {streamingDelta && (
          <div
            className={`flex flex-col ${
              streamingRole === MessageRole.CANDIDATE
                ? "items-end"
                : "items-start"
            }`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[11px] font-semibold uppercase text-indigo-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                AI Interviewer (Speaking)
              </span>
            </div>
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-zinc-800/90 text-zinc-200 border border-indigo-500/40 rounded-tl-sm animate-pulse">
              {streamingDelta}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
