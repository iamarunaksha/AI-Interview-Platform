/**
 * Candidate Video Stream Pipeline
 * Handles camera acquisition, device enumeration, stream metrics, and safe teardown.
 * Privacy-preserving: only computes stream resolution and brightness estimate (no facial/emotion tracking).
 */

import {
  type CameraDevice,
  type VideoQualityMetrics,
} from "@interviewai/shared-types";

export interface VideoStreamConfig {
  deviceId?: string;
  width?: number;
  height?: number;
  onMetricsUpdate?: (metrics: VideoQualityMetrics) => void;
  onError?: (error: Error) => void;
}

export class VideoStreamPipeline {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private config: VideoStreamConfig;
  private isMuted = false;

  constructor(config: VideoStreamConfig = {}) {
    this.config = config;
  }

  /**
   * Enumerate available video input devices (webcams).
   */
  static async getAvailableCameras(): Promise<CameraDevice[]> {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Start camera feed and bind to an HTMLVideoElement.
   */
  async start(videoEl: HTMLVideoElement): Promise<MediaStream> {
    this.videoElement = videoEl;

    // If stream is already live, attach without re-requesting getUserMedia
    if (
      this.stream &&
      this.stream.getVideoTracks().some((t) => t.readyState === "live")
    ) {
      this.attach(videoEl);
      if (!this.metricsTimer) {
        this.startMetricsEvaluation();
      }
      return this.stream;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        "getUserMedia is not supported on this browser or environment",
      );
    }

    const constraints: MediaStreamConstraints = {
      audio: false, // Audio is managed separately by AudioRecorderPipeline
      video: this.config.deviceId
        ? { deviceId: { exact: this.config.deviceId } }
        : {
            width: { ideal: this.config.width || 1280 },
            height: { ideal: this.config.height || 720 },
            facingMode: "user",
          },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play().catch(() => {
        // Autoplay may need user gesture
      });

      this.startMetricsEvaluation();
      return this.stream;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to access camera");
      this.config.onError?.(error);
      throw error;
    }
  }

  /**
   * Re-attach the active stream to an HTMLVideoElement.
   */
  attach(videoEl: HTMLVideoElement): void {
    this.videoElement = videoEl;
    if (this.stream) {
      if (videoEl.srcObject !== this.stream) {
        videoEl.srcObject = this.stream;
      }
      videoEl.play().catch(() => {
        // Autoplay may need user gesture
      });
    }
  }

  /**
   * Switch active camera device.
   */
  async switchDevice(deviceId: string): Promise<void> {
    this.config.deviceId = deviceId;
    if (this.videoElement) {
      this.stop();
      await this.start(this.videoElement);
    }
  }

  /**
   * Toggle camera mute state without disconnecting the pipeline.
   */
  setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (this.stream) {
      for (const track of this.stream.getVideoTracks()) {
        track.enabled = !muted;
      }
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Privacy-preserving periodic quality & brightness assessment.
   */
  private startMetricsEvaluation(): void {
    if (typeof document === "undefined") return;

    this.canvasElement = document.createElement("canvas");
    this.canvasElement.width = 64;
    this.canvasElement.height = 36;
    const ctx = this.canvasElement.getContext("2d", {
      willReadFrequently: true,
    });

    this.metricsTimer = setInterval(() => {
      if (!this.stream || !this.videoElement || this.isMuted) return;

      const track = this.stream.getVideoTracks()[0];
      if (!track || track.readyState !== "live") return;

      const settings = track.getSettings();
      const width = settings.width || this.videoElement.videoWidth || 1280;
      const height = settings.height || this.videoElement.videoHeight || 720;
      const frameRate = settings.frameRate || 30;

      let brightnessLevel: "optimal" | "low" | "high" = "optimal";

      if (ctx && this.videoElement.readyState >= 2) {
        try {
          ctx.drawImage(this.videoElement, 0, 0, 64, 36);
          const imgData = ctx.getImageData(0, 0, 64, 36);
          let sum = 0;
          for (let i = 0; i < imgData.data.length; i += 4) {
            // Perceived luminance formula (ITU-R BT.709)
            const r = imgData.data[i];
            const g = imgData.data[i + 1];
            const b = imgData.data[i + 2];
            sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          }
          const avgLuminance = sum / (64 * 36);

          if (avgLuminance < 45) {
            brightnessLevel = "low";
          } else if (avgLuminance > 220) {
            brightnessLevel = "high";
          } else {
            brightnessLevel = "optimal";
          }
        } catch {
          // Canvas read safety
        }
      }

      this.config.onMetricsUpdate?.({
        width,
        height,
        frameRate,
        brightnessLevel,
        isStreamActive: track.enabled,
      });
    }, 2000);
  }

  /**
   * Teardown and release camera hardware locks.
   */
  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.canvasElement = null;
  }
}
