/**
 * Browser Audio Player Pipeline.
 *
 * Plays incoming audio chunks via Web Audio API with sequential time-scheduling.
 * Provides fallback to Web Speech API synthesis for simulated or text-only turns
 * with strict deduplication to prevent repetitive speech loops.
 */
export class AudioPlayerPipeline {
  private audioContext: AudioContext | null = null;
  private isMuted = false;
  private isSpeaking = false;
  private nextPcmStartTime = 0;
  private lastSpokenText = "";
  private lastSpokenTimestamp = 0;

  constructor() {}

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  /**
   * Play 16-bit PCM mono audio chunk (e.g. from Gemini or Deepgram)
   * Scheduled sequentially on the Web Audio timeline to prevent overlapping metallic stutter.
   */
  async playPcmChunk(
    pcmData: Uint8Array | ArrayBuffer,
    sampleRate = 24000,
  ): Promise<void> {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const buffer =
        pcmData instanceof ArrayBuffer
          ? pcmData
          : pcmData.buffer.slice(
              pcmData.byteOffset,
              pcmData.byteOffset + pcmData.byteLength,
            );

      const int16 = new Int16Array(buffer);
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      // Schedule sequentially: if nextPcmStartTime is in the past, start now; otherwise queue right after previous chunk
      const startTime = Math.max(now, this.nextPcmStartTime);
      source.start(startTime);
      this.nextPcmStartTime = startTime + audioBuffer.duration;
      this.isSpeaking = true;

      source.onended = () => {
        if (ctx.currentTime >= this.nextPcmStartTime - 0.05) {
          this.isSpeaking = false;
        }
      };
    } catch (err) {
      console.warn("PCM audio decode/playback error:", err);
    }
  }

  /**
   * Speak text response via browser Web Speech API (fallback TTS).
   * Enforces deduplication to prevent repeated questions and audio distortion.
   */
  speakText(text: string, onEnd?: () => void): void {
    if (
      this.isMuted ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      onEnd?.();
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      onEnd?.();
      return;
    }

    const now = Date.now();
    // Prevent repeating the same question/text if already spoken in the last 4 seconds
    if (
      cleanText === this.lastSpokenText &&
      now - this.lastSpokenTimestamp < 4000
    ) {
      onEnd?.();
      return;
    }

    this.lastSpokenText = cleanText;
    this.lastSpokenTimestamp = now;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
      };
      utterance.onend = () => {
        this.isSpeaking = false;
        onEnd?.();
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("SpeechSynthesis error:", err);
      this.isSpeaking = false;
      onEnd?.();
    }
  }

  stopAll(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.nextPcmStartTime = 0;
    this.isSpeaking = false;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const audioPlayer = new AudioPlayerPipeline();
