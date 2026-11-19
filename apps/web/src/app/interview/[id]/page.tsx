"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { interviewSocket } from "@/lib/socket-client";
import { AudioRecorderPipeline } from "@/lib/audio-recorder";
import { audioPlayer } from "@/lib/audio-player";
import { SpeechRecognitionPipeline } from "@/lib/speech-recognition";
import { InterviewHeader } from "@/components/interview/interview-header";
import { InterviewStageProgress } from "@/components/interview/interview-stage-progress";
import { InterviewConceptTracker } from "@/components/interview/interview-concept-tracker";
import { InterviewQuestionCard } from "@/components/interview/interview-question-card";
import { InterviewAudioVisualizer } from "@/components/interview/interview-audio-visualizer";
import { InterviewTranscript } from "@/components/interview/interview-transcript";
import { InterviewControls } from "@/components/interview/interview-controls";
import { InterviewEvidencePanel } from "@/components/interview/interview-evidence-panel";
import { InterviewEvaluationCard } from "@/components/interview/interview-evaluation-card";
import { InterviewCodeEditor } from "@/components/interview/interview-code-editor";
import { InterviewVideoContainer } from "@/components/interview/interview-video-container";
import { InterviewVideoFeed } from "@/components/interview/interview-video-feed";
import {
  InterviewStatus,
  InterviewStage,
  MessageRole,
  VideoLayoutMode,
  type InterviewSessionResponse,
  type TranscriptTurn,
  type ConversationEvent,
  type OrchestratorState,
  type EvidenceRecord,
  type InterviewReport,
  type CodeExecutionResult,
  type ProgrammingLanguage,
} from "@interviewai/shared-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InterviewRoomPage({ params }: PageProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<InterviewSessionResponse | null>(null);
  const [orchestratorState, setOrchestratorState] =
    useState<OrchestratorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime conversation state
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [streamingDelta, setStreamingDelta] = useState<string | null>(null);
  const [streamingRole, setStreamingRole] = useState<MessageRole | null>(null);
  const [interimCandidateSpeech, setInterimCandidateSpeech] = useState<
    string | null
  >(null);

  // Examiner / Auditor Mode Toggle (default: false for distraction-free candidate experience)
  const [examinerMode, setExaminerMode] = useState(false);

  // Evidence Collection State
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [isExtractingEvidence, setIsExtractingEvidence] = useState(false);

  // Independent Evaluation State
  const [evaluationReport, setEvaluationReport] =
    useState<InterviewReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // View mode and video state
  const [viewMode, setViewMode] = useState<
    "voice" | "video" | "coding" | "split"
  >("voice");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [videoLayoutMode, setVideoLayoutMode] = useState<VideoLayoutMode>(
    VideoLayoutMode.GRID,
  );
  const [codeExecutionResult, setCodeExecutionResult] =
    useState<CodeExecutionResult | null>(null);
  const [isExecutingCode, setIsExecutingCode] = useState(false);

  // Audio state
  const [micVolume, setMicVolume] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const isAssistantSpeakingRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for recorders to avoid stale closures
  const recorderRef = useRef<AudioRecorderPipeline | null>(null);
  const speechRecognizerRef = useRef<SpeechRecognitionPipeline | null>(null);

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
        isAssistantSpeakingRef.current = true;
        setStreamingRole(MessageRole.ASSISTANT);
        setStreamingDelta("");
        break;

      case "assistant.transcript.delta":
        setStreamingDelta((prev) => (prev ? prev + event.text : event.text));
        break;

      case "assistant.transcript.final":
        setStreamingDelta(null);
        setTranscript((prev) => {
          const lastTurn = prev[prev.length - 1];
          // Deduplicate if identical to immediately preceding assistant message
          if (
            lastTurn &&
            lastTurn.role === MessageRole.ASSISTANT &&
            lastTurn.text.trim() === event.text.trim()
          ) {
            return prev;
          }
          return [
            ...prev,
            {
              id: `turn-ast-${Date.now()}`,
              role: MessageRole.ASSISTANT,
              text: event.text,
              timestamp: event.timestamp,
            },
          ];
        });
        // Speak out loud via browser speech synthesis fallback
        audioPlayer.speakText(event.text, () => {
          setIsAssistantSpeaking(false);
          isAssistantSpeakingRef.current = false;
        });
        break;

      case "assistant.audio.chunk":
        setIsAssistantSpeaking(true);
        isAssistantSpeakingRef.current = true;
        void audioPlayer.playPcmChunk(event.audio);
        break;

      case "assistant.interrupted":
        audioPlayer.stopAll();
        setIsAssistantSpeaking(false);
        isAssistantSpeakingRef.current = false;
        setStreamingDelta(null);
        break;

      case "turn.completed":
        setStreamingDelta(null);
        break;

      case "interview.status":
        setIsPaused(event.status === InterviewStatus.PAUSED);
        setSession((prev) => (prev ? { ...prev, status: event.status } : null));
        break;

      case "orchestrator.state":
        setOrchestratorState(event.state);
        break;

      case "orchestrator.transition":
        setOrchestratorState((prev) =>
          prev
            ? {
                ...prev,
                stage: event.transition.toStage,
                stageTurnCount: 0,
                stageStartedAt: event.transition.timestamp,
              }
            : null,
        );
        break;

      case "evidence.recorded":
        setEvidence((prev) => {
          if (prev.some((e) => e.id === event.evidence.id)) return prev;
          return [...prev, event.evidence];
        });
        break;

      case "video.state":
        if (event.isCameraActive !== undefined) {
          setIsCameraActive(event.isCameraActive);
        }
        if (event.layoutMode) {
          setVideoLayoutMode(event.layoutMode);
        }
        break;

      case "session.ended":
        audioPlayer.stopAll();
        recorderRef.current?.stop();
        setIsMicActive(false);
        setIsAssistantSpeaking(false);
        isAssistantSpeakingRef.current = false;
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
          // Fetch existing evidence records
          api.interviews
            .getEvidence(sessionId)
            .then((evs) => {
              if (active) setEvidence(evs);
            })
            .catch(() => {});
          // Fetch existing evaluation report
          api.interviews
            .getEvaluation(sessionId)
            .then((rep) => {
              if (active && rep) setEvaluationReport(rep);
            })
            .catch(() => {});
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
  const sessionStatusRef = useRef(session?.status);
  useEffect(() => {
    sessionStatusRef.current = session?.status;
  }, [session?.status]);

  useEffect(() => {
    isAssistantSpeakingRef.current = isAssistantSpeaking;
    speechRecognizerRef.current?.setAssistantSpeaking(isAssistantSpeaking);
  }, [isAssistantSpeaking]);

  const handleSendText = useCallback((text: string) => {
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
  }, []);

  useEffect(() => {
    if (!sessionId || !session) return;

    // Instantiate audio recorder for live volume visualizer
    const recorder = new AudioRecorderPipeline({
      onVolumeChange: (vol) => setMicVolume(vol),
      onAudioChunk: (chunk) => {
        // Suppress acoustic echo: do not send audio chunks while assistant is speaking
        if (isAssistantSpeakingRef.current) return;
        interviewSocket.sendAudioChunk(chunk);
      },
    });
    recorderRef.current = recorder;

    // Instantiate native speech recognizer for transcribing candidate's actual voice
    const recognizer = new SpeechRecognitionPipeline({
      onInterimTranscript: (text) => {
        setInterimCandidateSpeech(text);
      },
      onFinalTranscript: (text) => {
        setInterimCandidateSpeech(null);
        if (text.trim()) {
          handleSendText(text.trim());
        }
      },
      onError: (err) => {
        console.warn("Speech recognition notice:", err);
      },
    });
    speechRecognizerRef.current = recognizer;

    // Connect to WebSocket gateway
    interviewSocket.connect(sessionId, {
      onReady: () => {
        // Attempt mic auto-start if in progress
        const currentStatus = sessionStatusRef.current;
        if (
          currentStatus === InterviewStatus.IN_PROGRESS ||
          currentStatus === InterviewStatus.CREATED
        ) {
          recorder
            .start()
            .then(() => {
              setIsMicActive(true);
              recognizer.start();
            })
            .catch(() => {
              // User can manually click Unmute Mic
            });
        }
      },
      onEvent: (event: ConversationEvent) => {
        handleSocketEvent(event);
      },
      onCodeResult: (result: CodeExecutionResult) => {
        setCodeExecutionResult(result);
        setIsExecutingCode(false);
      },
      onCodeStatus: (status: { status: string; message?: string }) => {
        if (status.status === "running") {
          setIsExecutingCode(true);
        } else {
          setIsExecutingCode(false);
        }
      },
      onError: (err) => {
        console.error("WebSocket interview error:", err);
      },
      onDisconnect: () => {
        console.log("WebSocket disconnected from interview room");
      },
    });

    return () => {
      recognizer.stop();
      recorder.stop();
      audioPlayer.stopAll();
      interviewSocket.disconnect();
    };
    // Only connect when sessionId or initial presence of session is ready; avoid bouncing socket on status updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, Boolean(session), handleSocketEvent]);

  const handleToggleMic = async () => {
    if (!recorderRef.current) return;
    if (isMicActive) {
      recorderRef.current.stop();
      speechRecognizerRef.current?.stop();
      setIsMicActive(false);
      setInterimCandidateSpeech(null);
    } else {
      try {
        await recorderRef.current.start();
        speechRecognizerRef.current?.start();
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

  const handleCodeChange = (code: string, language: ProgrammingLanguage) => {
    interviewSocket.sendCodeChange(code, language);
  };

  const handleCodeRun = (
    code: string,
    language: ProgrammingLanguage,
    problemId?: string,
  ) => {
    setIsExecutingCode(true);
    interviewSocket.runCode(code, language, problemId);
  };

  const handleToggleCamera = () => {
    const nextState = !isCameraActive;
    setIsCameraActive(nextState);
    interviewSocket.sendVideoToggle(nextState, videoLayoutMode);
  };

  const handleChangeVideoLayout = (mode: VideoLayoutMode) => {
    setVideoLayoutMode(mode);
    interviewSocket.sendVideoToggle(isCameraActive, mode);
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
      router.push(`/interview/${sessionId}/report`);
    } catch (err) {
      console.error("Failed to end interview:", err);
    }
  };

  const handleBatchExtract = async () => {
    if (!sessionId) return;
    setIsExtractingEvidence(true);
    try {
      const records = await api.interviews.batchExtractEvidence(sessionId);
      if (records.length > 0) {
        setEvidence((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const newRecords = records.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newRecords];
        });
      }
    } catch (err) {
      console.error("Batch evidence extraction failed:", err);
    } finally {
      setIsExtractingEvidence(false);
    }
  };

  const handleEvaluate = async () => {
    if (!sessionId) return;
    setIsEvaluating(true);
    try {
      const rep = await api.interviews.runEvaluation(sessionId);
      setEvaluationReport(rep);
    } catch (err) {
      console.error("Evaluation generation failed:", err);
    } finally {
      setIsEvaluating(false);
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
        examinerMode={examinerMode}
        onToggleExaminerMode={() => setExaminerMode(!examinerMode)}
      />

      {/* Stage Progression Stepper */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        <InterviewStageProgress
          currentStage={
            orchestratorState?.stage ??
            session.currentStage ??
            InterviewStage.GREETING
          }
          stageTurnCount={orchestratorState?.stageTurnCount ?? 0}
        />
      </div>

      {/* Mode Switcher: Voice vs Video vs Coding vs Split */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("voice")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "voice"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>🎙️</span>
            <span>Voice</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("video")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "video"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>📹</span>
            <span>Video Room</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("coding")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "coding"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>💻</span>
            <span>Code Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "split"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>⚡</span>
            <span>Split View</span>
          </button>
        </div>

        {/* Live Controls: Camera Toggle & Audio State Pill */}
        <div className="flex items-center gap-2">
          {/* Quick Camera Toggle */}
          <button
            type="button"
            onClick={handleToggleCamera}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              isCameraActive
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/60"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title={isCameraActive ? "Turn off camera" : "Turn on camera"}
          >
            <span>{isCameraActive ? "📹" : "🚫"}</span>
            <span>{isCameraActive ? "Camera On" : "Camera Off"}</span>
          </button>

          {/* Live Audio State Pill */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800/80">
            <span
              className={`w-2 h-2 rounded-full ${
                isMicActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span>{isMicActive ? "Audio Live" : "Mic Muted"}</span>
            {isAssistantSpeaking && (
              <span className="text-indigo-400 text-[11px] font-medium flex items-center gap-1">
                <span className="animate-spin">🌀</span> AI Speaking
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* VIEW MODE: VOICE & DISCUSSION */}
        {viewMode === "voice" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Question stem & Audio Visualizer (5 cols) */}
            <div className="lg:col-span-5 space-y-6 flex flex-col">
              <InterviewQuestionCard
                question={session.currentQuestion ?? null}
              />

              <InterviewConceptTracker
                coveredConcepts={
                  orchestratorState?.coveredConcepts ??
                  session.coveredConcepts ??
                  []
                }
                remainingConcepts={
                  orchestratorState?.remainingConcepts ??
                  session.currentQuestion?.expectedConcepts ??
                  []
                }
                activeProbingQuestion={
                  orchestratorState?.activeProbingQuestion ?? null
                }
              />

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
                    transcript or view your evaluation report.
                  </p>
                  <Link
                    href={`/interview/${session.id}/report`}
                    className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    View Official Report
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
                interimCandidateSpeech={interimCandidateSpeech}
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

              {examinerMode && (
                <InterviewEvidencePanel
                  evidence={evidence}
                  onBatchExtract={handleBatchExtract}
                  isExtracting={isExtractingEvidence}
                />
              )}
            </div>
          </div>
        )}

        {/* VIEW MODE: VIDEO INTERVIEW ROOM */}
        {viewMode === "video" && (
          <div className="space-y-6">
            <InterviewVideoContainer
              isAssistantSpeaking={isAssistantSpeaking}
              stage={
                orchestratorState?.stage ??
                session.currentStage ??
                InterviewStage.GREETING
              }
              personality={session.personality}
              companyCategory={session.companyCategory}
              targetRole={session.targetRole}
              candidateName="Candidate"
              isCameraActive={isCameraActive}
              onToggleCamera={handleToggleCamera}
              layoutMode={videoLayoutMode}
              onChangeLayoutMode={handleChangeVideoLayout}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-6 flex flex-col">
                <InterviewQuestionCard
                  question={session.currentQuestion ?? null}
                />
                <InterviewConceptTracker
                  coveredConcepts={
                    orchestratorState?.coveredConcepts ??
                    session.coveredConcepts ??
                    []
                  }
                  remainingConcepts={
                    orchestratorState?.remainingConcepts ??
                    session.currentQuestion?.expectedConcepts ??
                    []
                  }
                  activeProbingQuestion={
                    orchestratorState?.activeProbingQuestion ?? null
                  }
                />
                <InterviewAudioVisualizer
                  micVolume={micVolume}
                  isAssistantSpeaking={isAssistantSpeaking}
                  isMicActive={isMicActive}
                />
              </div>

              <div className="lg:col-span-7 flex flex-col gap-4">
                <InterviewTranscript
                  transcript={transcript}
                  streamingDelta={streamingDelta}
                  streamingRole={streamingRole}
                  interimCandidateSpeech={interimCandidateSpeech}
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
                {examinerMode && (
                  <InterviewEvidencePanel
                    evidence={evidence}
                    onBatchExtract={handleBatchExtract}
                    isExtracting={isExtractingEvidence}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE: CODING ENVIRONMENT */}
        {viewMode === "coding" && (
          <div className="space-y-4">
            {/* Compact Audio Strip in Coding Mode */}
            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <InterviewAudioVisualizer
                  micVolume={micVolume}
                  isAssistantSpeaking={isAssistantSpeaking}
                  isMicActive={isMicActive}
                />
              </div>

              <div className="flex-1 max-w-md">
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
            </div>

            {/* Full-Width Code Editor */}
            <div className="min-h-[580px]">
              <InterviewCodeEditor
                sessionId={session.id}
                onCodeChange={handleCodeChange}
                onCodeRun={handleCodeRun}
                latestExecutionResult={codeExecutionResult}
                isExecuting={isExecutingCode}
              />
            </div>
          </div>
        )}

        {/* VIEW MODE: SPLIT VIEW */}
        {viewMode === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Monaco Code Editor (7 cols) */}
            <div className="lg:col-span-7 flex flex-col min-h-[580px]">
              <InterviewCodeEditor
                sessionId={session.id}
                onCodeChange={handleCodeChange}
                onCodeRun={handleCodeRun}
                latestExecutionResult={codeExecutionResult}
                isExecuting={isExecutingCode}
              />
            </div>

            {/* Right Column: Audio & Transcript (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {isCameraActive && (
                <div className="h-44 rounded-2xl overflow-hidden border border-zinc-800">
                  <InterviewVideoFeed
                    isCameraActive={isCameraActive}
                    onToggleCamera={handleToggleCamera}
                    layoutMode={videoLayoutMode}
                    candidateName="Candidate"
                    isCompact={true}
                  />
                </div>
              )}

              <InterviewAudioVisualizer
                micVolume={micVolume}
                isAssistantSpeaking={isAssistantSpeaking}
                isMicActive={isMicActive}
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

              <InterviewTranscript
                transcript={transcript}
                streamingDelta={streamingDelta}
                streamingRole={streamingRole}
                interimCandidateSpeech={interimCandidateSpeech}
              />

              {examinerMode && (
                <InterviewEvidencePanel
                  evidence={evidence}
                  onBatchExtract={handleBatchExtract}
                  isExtracting={isExtractingEvidence}
                />
              )}
            </div>
          </div>
        )}

        {/* Full-Width Bottom Section: Independent Rubric Evaluation (Only in Examiner Mode or when Concluded) */}
        {(examinerMode || session.status === InterviewStatus.COMPLETED) && (
          <div className="w-full">
            <InterviewEvaluationCard
              report={evaluationReport}
              isEvaluating={isEvaluating}
              onEvaluate={handleEvaluate}
              isSessionConcluded={session.status === InterviewStatus.COMPLETED}
            />
          </div>
        )}
      </main>
    </div>
  );
}
