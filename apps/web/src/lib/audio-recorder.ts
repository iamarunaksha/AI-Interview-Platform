/**
 * Browser Audio Recorder Pipeline.
 *
 * Captures microphone stream, computes real-time volume levels for visualizer,
 * and slices audio chunks for streaming over WebSocket.
 */
export class AudioRecorderPipeline {
  private static activeTracks = new Set<MediaStreamTrack>();

  /**
   * Release and terminate every active microphone track across all audio pipelines.
   * Guarantees microphone hardware recording indicator turns off immediately.
   */
  static stopAllActiveStreams(): void {
    for (const track of AudioRecorderPipeline.activeTracks) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
    AudioRecorderPipeline.activeTracks.clear();
  }

  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private animationFrameId: number | null = null;
  private isRecording = false;

  constructor(
    private readonly options?: {
      onVolumeChange?: (volume: number) => void;
      onAudioChunk?: (chunk: ArrayBuffer) => void;
    },
  ) {}

  async start(): Promise<void> {
    if (this.isRecording) return;

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error("Microphone access is not supported in this browser.");
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    for (const track of this.mediaStream.getTracks()) {
      AudioRecorderPipeline.activeTracks.add(track);
      track.onended = () => {
        AudioRecorderPipeline.activeTracks.delete(track);
      };
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.audioContext = new AudioContextClass();

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    // Track volume levels
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const updateVolume = () => {
      if (!this.analyser || !this.isRecording) return;
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));

      this.options?.onVolumeChange?.(normalizedVolume);
      this.animationFrameId = requestAnimationFrame(updateVolume);
    };

    // Use MediaRecorder to slice chunks periodically (every 250ms)
    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && this.isRecording) {
          const buffer = await e.data.arrayBuffer();
          this.options?.onAudioChunk?.(buffer);
        }
      };
      this.mediaRecorder.start(250);
    } catch (err) {
      console.warn("MediaRecorder chunking fallback:", err);
    }

    this.isRecording = true;
    updateVolume();
  }

  stop(): void {
    this.isRecording = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== "inactive") {
        try {
          this.mediaRecorder.stop();
        } catch {
          // ignore
        }
      }
      try {
        this.mediaRecorder.stream?.getTracks().forEach((track) => {
          track.stop();
          AudioRecorderPipeline.activeTracks.delete(track);
        });
      } catch {
        // ignore
      }
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
        AudioRecorderPipeline.activeTracks.delete(track);
      });
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyser = null;
    this.options?.onVolumeChange?.(0);
  }

  isActive(): boolean {
    return this.isRecording;
  }
}
