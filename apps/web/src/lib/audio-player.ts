/**
 * Browser Audio Player Pipeline.
 *
 * Plays incoming audio chunks via Web Audio API.
 * Provides fallback to Web Speech API synthesis for simulated or text-only turns.
 */
export class AudioPlayerPipeline {
  private audioContext: AudioContext | null = null;
  private isMuted = false;
  private isSpeaking = false;

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
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.warn("PCM audio decode/playback error:", err);
    }
  }

  /**
   * Speak text response via browser Web Speech API (fallback TTS)
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

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
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
    this.isSpeaking = false;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const audioPlayer = new AudioPlayerPipeline();
