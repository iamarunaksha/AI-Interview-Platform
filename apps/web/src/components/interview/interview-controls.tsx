"use client";

import React, { useState } from "react";

interface InterviewControlsProps {
  isMicActive: boolean;
  isSpeakerMuted: boolean;
  isAssistantSpeaking: boolean;
  isPaused: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onInterrupt: () => void;
  onTogglePause: () => void;
  onSendText: (text: string) => void;
}

export function InterviewControls({
  isMicActive,
  isSpeakerMuted,
  isAssistantSpeaking,
  isPaused,
  onToggleMic,
  onToggleSpeaker,
  onInterrupt,
  onTogglePause,
  onSendText,
}: InterviewControlsProps) {
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendText(textInput.trim());
    setTextInput("");
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left primary voice action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm cursor-pointer ${
              isMicActive
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
            }`}
          >
            {isMicActive ? (
              <>
                <svg
                  className="w-4 h-4 text-white animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <span>Mute Mic</span>
              </>
            ) : (
              <>
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
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
                <span>Unmute Mic</span>
              </>
            )}
          </button>

          {/* Interrupt Assistant button */}
          {isAssistantSpeaking && (
            <button
              onClick={onInterrupt}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer animate-pulse"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Interrupt</span>
            </button>
          )}

          {/* Pause / Resume */}
          <button
            onClick={onTogglePause}
            className="px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            {isPaused ? "Resume Interview" : "Pause"}
          </button>
        </div>

        {/* Right utility buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSpeaker}
            title={isSpeakerMuted ? "Unmute AI Voice" : "Mute AI Voice"}
            className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              isSpeakerMuted
                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700"
            }`}
          >
            {isSpeakerMuted ? (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showTextInput
                ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750"
            }`}
          >
            {showTextInput ? "Hide Keyboard Input" : "Type Response"}
          </button>
        </div>
      </div>

      {/* Expandable Text chat input */}
      {showTextInput && (
        <form
          onSubmit={handleTextSubmit}
          className="flex items-center gap-2 pt-2 border-t border-zinc-800/80"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your answer or question here..."
            className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
