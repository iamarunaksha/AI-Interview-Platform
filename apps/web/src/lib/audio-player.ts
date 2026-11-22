/**
 * Strip Markdown formatting (bold, headers, backticks, code blocks, lists)
 * so speech synthesis pronounces natural conversational sentences
 * without reading out punctuation characters ("asterisk", "backtick", etc.)
 */
function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // code fences
    .replace(/`([^`]+)`/g, "$1") // inline backticks
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italics
    .replace(/#+\s/g, "") // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
    .replace(/^[-*•]\s+/gm, "") // bullet points
    .replace(/[""]/g, '"') // smart quotes
    .replace(/['']/g, "'")
    .replace(/\n+/g, " ") // newlines to single space
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
  private hasReceivedPcmThisTurn = false;
  private nextPcmStartTime = 0;
  private lastSpokenText = "";
  private lastSpokenTimestamp = 0;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Pre-cache voices when browser loads them
        this.getNaturalVoice();
      };
    }
  }

  /**
   * Select a natural, human-like voice for the interviewer instead of default robotic synths.
   */
  private getNaturalVoice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prioritize natural/enhanced English voices
    const preferredNames = [
      "Google US English",
      "Google UK English Female",
      "Samantha",
      "Karen",
      "Serena",
      "Daniel",
      "Alex",
      "Ava",
      "Allison",
      "Microsoft Jenny Online",
      "Microsoft Guy Online",
      "Microsoft Aria Online",
    ];

    for (const name of preferredNames) {
      const match = voices.find(
        (v) =>
          v.name.toLowerCase().includes(name.toLowerCase()) ||
          v.voiceURI.toLowerCase().includes(name.toLowerCase()),
      );
      if (match) return match;
    }

    // Next preference: any English (US/GB) voice
    const englishVoice = voices.find(
      (v) => v.lang === "en-US" || v.lang === "en_US" || v.lang === "en-GB",
    );
    if (englishVoice) return englishVoice;

    // Fallback: any English voice
    const anyEnglish = voices.find((v) => v.lang.startsWith("en"));
    return anyEnglish ?? voices[0] ?? null;
  }

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
      this.hasReceivedPcmThisTurn = true;

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
   * Enforces deduplication and Markdown stripping to prevent robotic symbols.
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

    // If server already delivered real PCM audio chunks for this response,
    // skip text synthesis fallback to avoid double audio echo
    if (this.hasReceivedPcmThisTurn) {
      onEnd?.();
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      onEnd?.();
      return;
    }

    const spokenClean = stripMarkdownForSpeech(cleanText);
    if (!spokenClean) {
      onEnd?.();
      return;
    }

    const now = Date.now();
    // Prevent repeating the same question/text if already spoken in the last 4 seconds
    if (
      spokenClean === this.lastSpokenText &&
      now - this.lastSpokenTimestamp < 4000
    ) {
      onEnd?.();
      return;
    }

    this.lastSpokenText = spokenClean;
    this.lastSpokenTimestamp = now;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenClean);
      const voice = this.getNaturalVoice();
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = 0.98; // Natural, measured conversational pace
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

  resetTurnPcmStatus(): void {
    this.hasReceivedPcmThisTurn = false;
  }

  stopAll(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.nextPcmStartTime = 0;
    this.isSpeaking = false;
    this.hasReceivedPcmThisTurn = false;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const audioPlayer = new AudioPlayerPipeline();
