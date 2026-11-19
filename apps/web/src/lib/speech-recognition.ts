/**
 * Browser Speech Recognition Pipeline.
 *
 * Captures live spoken audio from the microphone using Web Speech API (webkitSpeechRecognition)
 * and streams real-time interim and final transcripts without requiring external API keys.
 */

export interface SpeechRecognitionCallbacks {
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultList {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultList;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export class SpeechRecognitionPipeline {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private shouldRestart = false;
  private callbacks: SpeechRecognitionCallbacks = {};
  private finalTranscriptBuffer = "";
  private silenceTimer: NodeJS.Timeout | null = null;
  private isMuted = false;

  constructor(callbacks: SpeechRecognitionCallbacks = {}) {
    this.callbacks = callbacks;
    this.initRecognition();
  }

  private initRecognition(): void {
    if (typeof window === "undefined") return;

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      this.callbacks.onError?.(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
      );
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onStart?.();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (this.isMuted) return;

        let interim = "";
        let finalSegment = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            finalSegment += text + " ";
          } else {
            interim += text;
          }
        }

        if (interim.trim()) {
          const combined = (
            this.finalTranscriptBuffer +
            " " +
            interim.trim()
          ).trim();
          this.callbacks.onInterimTranscript?.(combined);
        }

        if (finalSegment.trim()) {
          this.finalTranscriptBuffer = (
            this.finalTranscriptBuffer +
            " " +
            finalSegment.trim()
          ).trim();
          this.callbacks.onInterimTranscript?.(this.finalTranscriptBuffer);

          // Reset silence timer: when user pauses for 1200ms after final segment, deliver turn
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            this.flushFinalTranscript();
          }, 1200);
        }
      };

      this.recognition.onerror = (event: { error: string }) => {
        // "no-speech" or "aborted" are normal during natural pauses
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        console.warn("SpeechRecognition error:", event.error);
        if (event.error === "not-allowed") {
          this.callbacks.onError?.(
            "Microphone permission denied for speech recognition.",
          );
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.callbacks.onEnd?.();
        // If still supposed to be listening and not explicitly stopped, restart automatically
        if (this.shouldRestart && !this.isMuted && this.recognition) {
          try {
            this.recognition.start();
          } catch {
            // Ignore if already active
          }
        }
      };
    } catch (err) {
      console.warn("SpeechRecognition init error:", err);
    }
  }

  start(): void {
    if (!this.recognition) return;
    this.shouldRestart = true;
    this.isMuted = false;
    this.finalTranscriptBuffer = "";
    if (!this.isListening) {
      try {
        this.recognition.start();
      } catch {
        // Already started
      }
    }
  }

  stop(): void {
    this.shouldRestart = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.flushFinalTranscript();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }

  /**
   * Pause listening while the AI assistant is speaking to prevent acoustic feedback loop.
   */
  setAssistantSpeaking(speaking: boolean): void {
    this.isMuted = speaking;
    if (speaking) {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      this.flushFinalTranscript();
    }
  }

  private flushFinalTranscript(): void {
    const text = this.finalTranscriptBuffer.trim();
    if (text.length > 0) {
      this.finalTranscriptBuffer = "";
      this.callbacks.onFinalTranscript?.(text);
      this.callbacks.onInterimTranscript?.("");
    }
  }

  isSupported(): boolean {
    const win =
      typeof window !== "undefined"
        ? (window as unknown as {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
          })
        : null;
    return !!(win?.SpeechRecognition || win?.webkitSpeechRecognition);
  }
}
