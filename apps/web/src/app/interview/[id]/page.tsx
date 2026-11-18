"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { interviewSocket } from "@/lib/socket-client";
import { AudioRecorderPipeline } from "@/lib/audio-recorder";
import { audioPlayer } from "@/lib/audio-player";
import { InterviewHeader } from "@/components/interview/interview-header";
import { InterviewQuestionCard } from "@/components/interview/interview-question-card";
import { InterviewAudioVisualizer } from "@/components/interview/interview-audio-visualizer";
import { InterviewTranscript } from "@/components/interview/interview-transcript";
import { InterviewControls } from "@/components/interview/interview-controls";
import {
  InterviewStatus,
  MessageRole,
  type InterviewSessionResponse,
  type TranscriptTurn,
  type ConversationEvent,
} from "@interviewai/shared-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InterviewRoomPage({ params }: PageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<InterviewSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime conversation state
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [streamingDelta, setStreamingDelta] = useState<string | null>(null);
  const [streamingRole, setStreamingRole] = useState<MessageRole | null>(null);

  // Audio state
  const [micVolume, setMicVolume] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for recorders to avoid stale closures
  const recorderRef = useRef<AudioRecorderPipeline | null>(null);

  // Socket event handler
  const handleSocketEvent = React.useCallback((event: ConversationEvent) => {
    switch (event.type) {
      case "candidate.speech.started":
        setStreamingRole(MessageRole.CANDIDATE);
        break;

      case "candidate.transcript.final":
        setStreamingDelta(null);
        setTranscript((prev) => [
          ...prev,
          {
            id: `turn-cnd-${Date.now()}`,
            role: MessageRole.CANDIDATE,
            text: event.text,
            timestamp: event.timestamp,
          },
        ]);
        break;

      case "assistant.response.started":
        setIsAssistantSpeaking(true);
        setStreamingRole(MessageRole.ASSISTANT);
        setStreamingDelta("");
        break;

      case "assistant.transcript.delta":
        setStreamingDelta((prev) => (prev ? prev + event.text : event.text));
        break;

      case "assistant.transcript.final":
        setStreamingDelta(null);
        setTranscript((prev) => [
          ...prev,
          {
            id: `turn-ast-${Date.now()}`,
            role: MessageRole.ASSISTANT,
            text: event.text,
            timestamp: event.timestamp,
          },
        ]);
        // Speak out loud via browser speech synthesis fallback
        audioPlayer.speakText(event.text, () => {
          setIsAssistantSpeaking(false);
        });
        break;

      case "assistant.audio.chunk":
        setIsAssistantSpeaking(true);
        void audioPlayer.playPcmChunk(event.audio);
        break;

      case "assistant.interrupted":
        audioPlayer.stopAll();
        setIsAssistantSpeaking(false);
        setStreamingDelta(null);
        break;

      case "turn.completed":
        setStreamingDelta(null);
        break;

      case "interview.status":
        setIsPaused(event.status === InterviewStatus.PAUSED);
        setSession((prev) => (prev ? { ...prev, status: event.status } : null));
        break;

      case "session.ended":
        audioPlayer.stopAll();
        recorderRef.current?.stop();
        setIsMicActive(false);
        setIsAssistantSpeaking(false);
        setSession((prev) =>
          prev ? { ...prev, status: InterviewStatus.COMPLETED } : null,
        );
        break;
    }
  }, []);

  // Unpack params
  useEffect(() => {
    let active = true;
    params.then((p) => {
      if (active) setSessionId(p.id);
    });
    return () => {
      active = false;
    };
  }, [params]);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    api.interviews
      .get(sessionId)
      .then((data) => {
        if (active) {
          setSession(data);
          setTranscript(data.transcript || []);
          setIsPaused(data.status === InterviewStatus.PAUSED);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load interview",
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  // Socket & Audio connection lifecycle
  useEffect(() => {
    if (!sessionId || !session) return;

    // Instantiate recorder
    const recorder = new AudioRecorderPipeline({
      onVolumeChange: (vol) => setMicVolume(vol),
      onAudioChunk: (chunk) => interviewSocket.sendAudioChunk(chunk),
    });
    recorderRef.current = recorder;

    // Connect to WebSocket gateway
    interviewSocket.connect(sessionId, {
      onReady: () => {
        // Attempt mic auto-start if in progress
        if (
          session.status === InterviewStatus.IN_PROGRESS ||
          session.status === InterviewStatus.CREATED
        ) {
          recorder
            .start()
            .then(() => setIsMicActive(true))
            .catch(() => {
              // User can manually click Unmute Mic
            });
        }
      },
      onEvent: (event: ConversationEvent) => {
        handleSocketEvent(event);
      },
      onError: (err) => {
        console.error("WebSocket interview error:", err);
      },
      onDisconnect: () => {
        console.log("WebSocket disconnected from interview room");
      },
    });

    return () => {
      recorder.stop();
      audioPlayer.stopAll();
      interviewSocket.disconnect();
    };
  }, [sessionId, session, handleSocketEvent]);

  const handleToggleMic = async () => {
    if (!recorderRef.current) return;
    if (isMicActive) {
      recorderRef.current.stop();
      setIsMicActive(false);
    } else {
      try {
        await recorderRef.current.start();
        setIsMicActive(true);
      } catch (err) {
        alert(
          err instanceof Error
            ? err.message
            : "Could not access microphone. Please verify browser permissions.",
        );
      }
    }
  };

  const handleToggleSpeaker = () => {
    const nextMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextMuted);
    audioPlayer.setMuted(nextMuted);
  };

  const handleInterrupt = () => {
    interviewSocket.interrupt();
    audioPlayer.stopAll();
    setIsAssistantSpeaking(false);
    setStreamingDelta(null);
  };

  const handleTogglePause = () => {
    interviewSocket.pause();
    setIsPaused(!isPaused);
  };

  const handleSendText = (text: string) => {
    interviewSocket.sendTextMessage(text);
    setTranscript((prev) => [
      ...prev,
      {
        id: `turn-cnd-${Date.now()}`,
        role: MessageRole.CANDIDATE,
        text,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;
    const confirm = window.confirm(
      "Are you sure you want to conclude this interview? The session transcript will be saved for evaluation.",
    );
    if (!confirm) return;

    try {
      interviewSocket.endInterview("candidate_ended");
      await api.interviews.end(sessionId);
      setSession((prev) =>
        prev ? { ...prev, status: InterviewStatus.COMPLETED } : null,
      );
    } catch (err) {
      console.error("Failed to end interview:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
        <p className="text-sm">
          Initializing interview room & AI connection...
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full">
          <h2 className="text-lg font-bold text-rose-400 mb-2">
            Error Loading Session
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {error || "Session not found."}
          </p>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <InterviewHeader
        title={`${session.targetRole} Interview`}
        targetRole={session.targetRole}
        difficulty={session.difficulty}
        status={session.status}
        startedAt={session.startedAt}
        onEndInterview={handleEndInterview}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question stem & Audio Visualizer (5 cols) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          <InterviewQuestionCard question={session.currentQuestion ?? null} />

          <InterviewAudioVisualizer
            micVolume={micVolume}
            isAssistantSpeaking={isAssistantSpeaking}
            isMicActive={isMicActive}
          />

          {session.status === InterviewStatus.COMPLETED && (
            <div className="p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-center space-y-3">
              <div className="text-sm font-semibold text-indigo-300">
                🎉 Interview Session Concluded
              </div>
              <p className="text-xs text-zinc-400">
                Your full transcript has been recorded. You can review the
                transcript or start another mock session.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Live Transcript & Voice Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <InterviewTranscript
            transcript={transcript}
            streamingDelta={streamingDelta}
            streamingRole={streamingRole}
          />

          <InterviewControls
            isMicActive={isMicActive}
            isSpeakerMuted={isSpeakerMuted}
            isAssistantSpeaking={isAssistantSpeaking}
            isPaused={isPaused}
            onToggleMic={handleToggleMic}
            onToggleSpeaker={handleToggleSpeaker}
            onInterrupt={handleInterrupt}
            onTogglePause={handleTogglePause}
            onSendText={handleSendText}
          />
        </div>
      </main>
    </div>
  );
}
