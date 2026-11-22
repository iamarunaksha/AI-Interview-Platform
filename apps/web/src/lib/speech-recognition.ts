/**
 * Browser Speech Recognition Pipeline.
 *
 * Captures live spoken audio from the microphone using Web Speech API (webkitSpeechRecognition)
 * and streams real-time interim and final transcripts without requiring external API keys.
 * Calibrated for high-fidelity technical vocabulary and Indian English ("en-IN").
 */

export interface SpeechRecognitionCallbacks {
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export type SpeechAccentLocale = "en-IN" | "en-US" | "en-GB";

/**
 * Phonetic normalizer for technical interview vocabulary.
 * Corrects common STT misinterpretations of developer terms across accents (particularly Indian English).
 */
export function normalizeTechnicalSpeech(raw: string): string {
  if (!raw) return "";

  let cleaned = raw;

  const replacements: Array<[RegExp, string]> = [
    // Phrasing idioms & greetings
    [/\b(we can|i am ready we can|let us|let's) diving\b/gi, "$1 dive in"],
    [/\bwe can diving\b/gi, "we can dive in"],
    [/\blet diving\b/gi, "let's dive in"],
    [/\bdiving in\b/gi, "dive in"],
    [/\bready we can dive\b/gi, "ready, we can dive in"],
    [/\byes i am ready\b/gi, "Yes, I am ready"],

    // Hints & requests
    [
      /\b(ask for hint|can i get a hint|give me a hint|need a hint|i am stuck|i'm stuck)\b/gi,
      "Could you give me a hint?",
    ],

    // Data structures & algorithms
    [/\b(to sum|too sum|two some)\b/gi, "Two Sum"],
    [/\b(rash map|as map|has map|ash map)\b/gi, "hash map"],
    [/\b(link list|linkedlist|ling list)\b/gi, "linked list"],
    [/\bdoubly link list\b/gi, "doubly linked list"],
    [/\b(dummy note|dummy mode)\b/gi, "dummy node"],
    [/\bsentinel (note|mode)\b/gi, "sentinel node"],
    [/\b(big of|big o)\s*(\d+|n|one)\b/gi, "O($2)"],
    [/\b(order of one|o of one|o one)\b/gi, "O(1)"],
    [/\b(order of n|o of n|o n)\b/gi, "O(N)"],
    [/\b(o of log n|order of log n)\b/gi, "O(log N)"],
    [/\b(o of n square|order of n square)\b/gi, "O(N²)"],
    [/\bl r u\b/gi, "LRU"],
    [/\bb plus tree\b/gi, "B+ Tree"],
    [/\bb tree\b/gi, "B-Tree"],
    [/\b(d s a)\b/gi, "DSA"],
    [/\b(b s t)\b/gi, "BST"],
    [/\b(b f s)\b/gi, "BFS"],
    [/\b(d f s)\b/gi, "DFS"],
    [/\b(merge k|merge case|merge key)\b/gi, "Merge K"],
    [/\b(course schedule|core schedule)\b/gi, "Course Schedule"],
    [/\b(topological sort|topologic sort)\b/gi, "topological sort"],
    [/\b(indegree|in degree)\b/gi, "in-degree"],
    [/\b(slide window|sliding window)\b/gi, "sliding window"],
    [/\b(sub string|substrings)\b/gi, "substring"],
    [/\b(parentheses|parenthesis|bracket matching)\b/gi, "parentheses"],
    [/\b(lowest common ancestor|l c a)\b/gi, "Lowest Common Ancestor"],

    // SAP & Enterprise concepts
    [/\b(acdoca|ac doca|ac docka)\b/gi, "ACDOCA"],
    [/\b(clean core|clean-core)\b/gi, "Clean Core"],
    [/\b(steampunk|steam punk)\b/gi, "Steampunk"],
    [/\b(bdef|b def)\b/gi, "BDEF"],
    [/\b(abap rap|r a p)\b/gi, "ABAP RAP"],
    [/\b(cpi|c p i)\b/gi, "CPI"],
    [/\b(fubr|f u b r)\b/gi, "FUBR"],
  ];

  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  return cleaned;
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
  private latestInterimTranscript = "";
  private silenceTimer: NodeJS.Timeout | null = null;
  private isMuted = false;
  private currentLang: SpeechAccentLocale = "en-IN";

  constructor(
    callbacks: SpeechRecognitionCallbacks = {},
    initialLang: SpeechAccentLocale = "en-IN",
  ) {
    this.callbacks = callbacks;
    this.currentLang = initialLang;
    this.initRecognition();
  }

  /**
   * Set acoustic language / accent calibration at runtime.
   */
  setLanguage(lang: SpeechAccentLocale): void {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isListening) {
        try {
          this.recognition.stop();
        } catch {
          // Restarted automatically on onend
        }
      }
    }
  }

  getLanguage(): SpeechAccentLocale {
    return this.currentLang;
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
      // Default to Indian English ("en-IN") for sub-continental phonetic calibration
      this.recognition.lang = this.currentLang;
      this.recognition.maxAlternatives = 3;

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

        if (finalSegment.trim()) {
          this.finalTranscriptBuffer = (
            this.finalTranscriptBuffer +
            " " +
            finalSegment.trim()
          ).trim();
          this.latestInterimTranscript = "";
        } else if (interim.trim()) {
          this.latestInterimTranscript = interim.trim();
        }

        const currentCombined = (
          this.finalTranscriptBuffer +
          " " +
          this.latestInterimTranscript
        ).trim();

        if (currentCombined) {
          const normalized = normalizeTechnicalSpeech(currentCombined);
          this.callbacks.onInterimTranscript?.(normalized);

          // Reset silence timer: when candidate pauses for 1400ms after speaking, deliver turn
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            this.flushFinalTranscript();
          }, 1400);
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
        // Deliver any pending spoken words before triggering onEnd
        this.flushFinalTranscript();
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
    this.latestInterimTranscript = "";
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
    const raw = (
      this.finalTranscriptBuffer +
      " " +
      this.latestInterimTranscript
    ).trim();
    if (raw.length > 0) {
      const normalized = normalizeTechnicalSpeech(raw);
      this.finalTranscriptBuffer = "";
      this.latestInterimTranscript = "";
      this.callbacks.onFinalTranscript?.(normalized);
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
