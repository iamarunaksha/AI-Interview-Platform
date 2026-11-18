"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  type CameraDevice,
  type VideoQualityMetrics,
  VideoLayoutMode,
} from "@interviewai/shared-types";
import { VideoStreamPipeline } from "@/lib/video-stream";

interface InterviewVideoFeedProps {
  isCameraActive: boolean;
  onToggleCamera: () => void;
  layoutMode: VideoLayoutMode;
  onChangeLayoutMode?: (mode: VideoLayoutMode) => void;
  onMetricsUpdate?: (metrics: VideoQualityMetrics) => void;
  candidateName?: string;
  isCompact?: boolean;
}

export function InterviewVideoFeed({
  isCameraActive,
  onToggleCamera,
  layoutMode,
  onChangeLayoutMode,
  onMetricsUpdate,
  candidateName = "Candidate",
  isCompact = false,
}: InterviewVideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipelineRef = useRef<VideoStreamPipeline | null>(null);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isMirrored, setIsMirrored] = useState(true);
  const [metrics, setMetrics] = useState<VideoQualityMetrics | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Fetch available cameras on mount
  useEffect(() => {
    VideoStreamPipeline.getAvailableCameras().then((devices) => {
      setCameras(devices);
      if (devices.length > 0) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    });
  }, []);

  // Initialize or teardown camera stream based on isCameraActive
  useEffect(() => {
    if (!isCameraActive) {
      if (pipelineRef.current) {
        pipelineRef.current.stop();
        pipelineRef.current = null;
      }
      return;
    }

    if (!videoRef.current) return;

    const pipeline = new VideoStreamPipeline({
      deviceId: selectedDeviceId || undefined,
      onMetricsUpdate: (m) => {
        setMetrics(m);
        onMetricsUpdate?.(m);
      },
      onError: (err) => {
        setCameraError(err.message);
      },
    });

    pipelineRef.current = pipeline;

    pipeline.start(videoRef.current).catch((err) => {
      console.warn("Camera start failed:", err);
      setCameraError("Camera permission denied or device busy");
    });

    return () => {
      pipeline.stop();
    };
  }, [isCameraActive, selectedDeviceId, onMetricsUpdate]);

  const activeMetrics = isCameraActive ? metrics : null;

  // Handle switching camera device
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (pipelineRef.current) {
      await pipelineRef.current.switchDevice(deviceId);
    }
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col justify-between shadow-xl transition-all ${
        isCompact ? "min-h-[220px]" : "min-h-[300px]"
      }`}
    >
      {/* Top Overlay: Candidate Info & Quality Badges */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/60 text-xs font-semibold text-zinc-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isCameraActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
              }`}
            />
            <span>{candidateName} (You)</span>
          </div>

          {activeMetrics && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900/80 border border-zinc-700/60 text-zinc-300">
              {activeMetrics.width}x{activeMetrics.height} HD
            </span>
          )}
        </div>

        {/* Stream Visibility / Lighting Indicator */}
        {activeMetrics && (
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                activeMetrics.brightnessLevel === "optimal"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : activeMetrics.brightnessLevel === "low"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}
              title="Privacy-preserving local lighting indicator"
            >
              Lighting: {activeMetrics.brightnessLevel}
            </span>
          </div>
        )}
      </div>

      {/* Main Video Viewport or Camera Off Silhouette */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-zinc-900 overflow-hidden">
        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isMirrored ? "scale-x-[-1]" : ""
            }`}
          />
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 text-zinc-400">
            <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl text-zinc-500 shadow-inner">
              👤
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Camera is Turned Off
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Microphone audio remains active for the interview.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleCamera}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Turn On Camera
            </button>
          </div>
        )}

        {/* Error Notification Overlay */}
        {cameraError && isCameraActive && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center space-y-2 z-20">
            <span className="text-2xl">⚠️</span>
            <p className="text-xs font-medium text-rose-300">{cameraError}</p>
            <p className="text-[11px] text-zinc-400">
              Please grant camera permissions in your browser or select another
              device.
            </p>
            <button
              type="button"
              onClick={onToggleCamera}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg border border-zinc-700"
            >
              Continue in Audio-Only Mode
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Camera Mute/Unmute Button */}
          <button
            type="button"
            onClick={onToggleCamera}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
              isCameraActive
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700"
                : "bg-rose-600 hover:bg-rose-500 text-white"
            }`}
            title={isCameraActive ? "Turn off camera" : "Turn on camera"}
          >
            <span>{isCameraActive ? "📹" : "🚫"}</span>
            <span>{isCameraActive ? "Stop Video" : "Start Video"}</span>
          </button>

          {/* Mirror Flip Toggle */}
          {isCameraActive && (
            <button
              type="button"
              onClick={() => setIsMirrored((m) => !m)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
              title="Flip video mirror horizontally"
            >
              ⇄ Mirror
            </button>
          )}

          {/* Device Selection Dropdown (if multiple cameras available) */}
          {cameras.length > 1 && isCameraActive && (
            <select
              value={selectedDeviceId}
              onChange={(e) => void handleDeviceChange(e.target.value)}
              className="bg-zinc-800/80 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Layout Switcher (Grid vs PiP vs Speaker View) */}
        {onChangeLayoutMode && (
          <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md p-0.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => onChangeLayoutMode(VideoLayoutMode.GRID)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                layoutMode === VideoLayoutMode.GRID
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Grid layout: Side-by-side video view"
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => onChangeLayoutMode(VideoLayoutMode.PIP)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                layoutMode === VideoLayoutMode.PIP
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Picture-in-Picture: Candidate video in corner"
            >
              PiP
            </button>
            <button
              type="button"
              onClick={() => onChangeLayoutMode(VideoLayoutMode.SPEAKER)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                layoutMode === VideoLayoutMode.SPEAKER
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Speaker focus: Highlights whoever is speaking"
            >
              Speaker
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
