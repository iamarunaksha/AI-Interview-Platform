/**
 * Downsample audio buffer to 16,000 Hz and convert to 16-bit linear PCM (Int16Array).
 * Ensures 100% compatibility with Deepgram Nova-2 streaming STT without container headers.
 */
function downsampleAndConvertToInt16(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000,
): Int16Array {
  if (inputSampleRate === outputSampleRate) {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return result;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    const avg = count > 0 ? accum / count : 0;
    const s = Math.max(-1, Math.min(1, avg));
    result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Browser Audio Recorder Pipeline.
 *
 * Captures microphone stream via Web Audio API, resamples to 16kHz mono linear16 PCM,
 * computes real-time volume levels for visualizer, and streams pure PCM chunks over WebSocket.
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
  private processor: ScriptProcessorNode | null = null;
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
    const inputSampleRate = this.audioContext.sampleRate;

    // Buffer size 4096 gives ~85ms chunks at 48kHz, or ~256ms at 16kHz
    const bufferSize = 4096;
    const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    this.processor = processor;

    processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = downsampleAndConvertToInt16(input, inputSampleRate, 16000);
      if (pcm16.length > 0) {
        // Compute volume level for UI visualizer
        let sumSquares = 0;
        for (let i = 0; i < pcm16.length; i++) {
          const norm = pcm16[i] / 32768.0;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / pcm16.length);
        const volume = Math.min(100, Math.round(rms * 250));
        this.options?.onVolumeChange?.(volume);

        // Deliver raw 16kHz 16-bit linear PCM chunk
        this.options?.onAudioChunk?.(pcm16.buffer as ArrayBuffer);
      }
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);

    this.isRecording = true;
  }

  stop(): void {
    this.isRecording = false;

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {
        // ignore
      }
      this.processor = null;
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

    this.options?.onVolumeChange?.(0);
  }

  isActive(): boolean {
    return this.isRecording;
  }
}
