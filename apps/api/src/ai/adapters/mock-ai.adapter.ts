import { Injectable, Logger } from '@nestjs/common';
import type { ILlmProvider } from '../interfaces/llm-provider.interface.js';
import type {
  IRealtimeVoiceProvider,
  IRealtimeSession,
  RealtimeSessionConfig,
} from '../interfaces/realtime-provider.interface.js';
import type {
  IEvaluationProvider,
  EvaluationSessionInput,
} from '../interfaces/evaluation-provider.interface.js';
import {
  type ChatMessage,
  type LlmGenerateOptions,
  type LlmGenerateResult,
  type ConversationEvent,
  type InterviewReport,
  InterviewDifficulty,
  EvaluationRating,
} from '@interviewai/shared-types';

/**
 * MockAiAdapter — high-fidelity local simulator for development & testing.
 *
 * Implements:
 * - ILlmProvider
 * - IRealtimeVoiceProvider
 * - IEvaluationProvider
 *
 * Guarantees the platform is 100% testable and runnable offline
 * without requiring live API keys or incurring provider costs.
 */
@Injectable()
export class MockAiAdapter
  implements ILlmProvider, IRealtimeVoiceProvider, IEvaluationProvider
{
  private readonly logger = new Logger(MockAiAdapter.name);

  readonly name = 'mock';
  readonly modelName = 'mock-v1';
  readonly isConfigured = true;

  async testConnection(): Promise<boolean> {
    return true;
  }

  // ── ILlmProvider implementation ──────────────────────────

  async generateText(
    prompt: string,
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult> {
    this.logger.debug(
      `[MockLLM] generateText called with prompt length: ${prompt.length}`,
    );

    // If options specify JSON output, return a valid JSON string
    if (options?.responseMimeType === 'application/json') {
      return {
        text: JSON.stringify({
          acknowledged: true,
          mode: 'mock',
          analysis: 'Mock response generated successfully',
          followUpQuestion:
            'How would you scale this design to 10 million daily active users?',
        }),
        finishReason: 'STOP',
        modelName: this.modelName,
        usage: { promptTokens: 25, completionTokens: 40, totalTokens: 65 },
      };
    }

    return {
      text: `[Mock AI Response]: Based on your answer regarding architectural trade-offs, that demonstrates a solid grasp of concurrency. Could you explain what happens if the network partitions between your nodes?`,
      finishReason: 'STOP',
      modelName: this.modelName,
      usage: { promptTokens: 30, completionTokens: 35, totalTokens: 65 },
    };
  }

  async generateChat(
    messages: ChatMessage[],
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult> {
    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return this.generateText(lastUserMessage, options);
  }

  async *streamChat(
    _messages: ChatMessage[],
    _options?: LlmGenerateOptions,
  ): AsyncIterable<string> {
    const tokens = [
      'That ',
      'is ',
      'a ',
      'very ',
      'good ',
      'point ',
      'about ',
      'distributed ',
      'locking. ',
      'How ',
      'would ',
      'you ',
      'handle ',
      'clock ',
      'skew?',
    ];

    for (const token of tokens) {
      await new Promise((r) => setTimeout(r, 20));
      yield token;
    }
  }

  // ── IRealtimeVoiceProvider implementation ────────────────

  async createSession(
    config: RealtimeSessionConfig,
  ): Promise<IRealtimeSession> {
    this.logger.debug(
      `[MockRealtime] Creating mock session for ${config.sessionId}`,
    );
    return new MockRealtimeSession(config.sessionId);
  }

  // ── IEvaluationProvider implementation ───────────────────

  async evaluateSession(
    input: EvaluationSessionInput,
  ): Promise<InterviewReport> {
    this.logger.debug(`[MockEvaluation] Evaluating session ${input.sessionId}`);

    const competencyScores = input.competencies.map((comp) => ({
      competencyId: comp.id,
      competencyName: comp.name,
      score: 3,
      rating: EvaluationRating.PROFICIENT,
      justification: `Demonstrated clear understanding of core concepts in ${comp.name} during the session discussion.`,
      sufficientEvidence: true,
    }));

    return {
      id: `eval-${Date.now()}`,
      sessionId: input.sessionId,
      overallScore: 3.2,
      overallRating: EvaluationRating.PROFICIENT,
      summary: `Candidate demonstrated solid technical fundamentals and structured reasoning appropriate for ${input.targetRole} (${input.experienceLevel}). Handled follow-up edge cases well.`,
      competencyScores,
      strengths: [
        'Clear articulation of concurrency trade-offs',
        'Structured thought process when clarifying constraints',
        'Accurate analysis of data structure complexity',
      ],
      weaknesses: [
        'Could go deeper into network failure modes and recovery procedures',
        'Opportunity to provide more concrete metrics on capacity sizing',
      ],
      incorrectStatements: [],
      areasNotAssessed: ['Database failover multi-region replication'],
      recommendations: [
        'Practice designing distributed consensus algorithms (Raft/Paxos)',
        'Review read-repair and hint-handoff patterns in partitioned databases',
      ],
      suggestedNextDifficulty: InterviewDifficulty.HARD,
      generatedAt: new Date().toISOString(),
    };
  }
}

class MockRealtimeSession implements IRealtimeSession {
  private eventHandlers: Array<(event: ConversationEvent) => void> = [];
  private isCandidateSpeaking = false;
  private isAssistantSpeaking = false;
  private audioSilenceTimer: NodeJS.Timeout | null = null;
  private turnCount = 0;
  private lastTurnTimestamp = 0;

  private readonly questions = [
    'Could you walk me through your high-level architecture and how requests flow through the system?',
    'Good. How do you handle cache invalidation and ensure strong data consistency under partition failures?',
    'Interesting. How do you prevent race conditions when multiple concurrent nodes attempt to mutate the state?',
    'How would you monitor and measure p99 latency spikes and handle circuit breaker fallbacks in production?',
    'That was a thorough technical breakdown. Let us explore edge cases and how your service fails over under region outages.',
  ];

  constructor(readonly sessionId: string) {
    // Emit session.ready after tick
    setTimeout(() => {
      this.emit({ type: 'session.ready', timestamp: Date.now() });
    }, 10);
  }

  async sendAudio(_pcmChunk: Buffer | Uint8Array): Promise<void> {
    const now = Date.now();
    // Ignore incoming audio if assistant is speaking or turn was finalized recently to avoid acoustic echo loops
    if (this.isAssistantSpeaking || now - this.lastTurnTimestamp < 1500) {
      return;
    }

    if (!this.isCandidateSpeaking) {
      this.isCandidateSpeaking = true;
      this.emit({ type: 'candidate.speech.started', timestamp: now });
    }

    // Reset silence timer on every chunk (simulating voice activity detection)
    if (this.audioSilenceTimer) {
      clearTimeout(this.audioSilenceTimer);
    }

    // When candidate pauses for 800ms, finalize turn
    this.audioSilenceTimer = setTimeout(() => {
      this.finalizeCandidateTurn();
    }, 800);
  }

  private finalizeCandidateTurn() {
    if (!this.isCandidateSpeaking) return;
    this.isCandidateSpeaking = false;
    const now = Date.now();
    this.lastTurnTimestamp = now;

    this.emit({
      type: 'candidate.transcript.final',
      text: 'In our architecture, we use distributed token bucket rate limiting in Redis with write-through caching and master-replica failover to keep p99 latency low.',
      timestamp: now,
    });
    this.emit({ type: 'candidate.speech.ended', timestamp: now });

    // Assistant responds after short pause
    setTimeout(() => {
      this.isAssistantSpeaking = true;
      this.emit({ type: 'assistant.response.started', timestamp: Date.now() });

      const nextQuestion =
        this.questions[this.turnCount % this.questions.length];
      this.turnCount++;

      this.emit({
        type: 'assistant.transcript.final',
        text: nextQuestion,
        timestamp: Date.now(),
      });
      this.emit({ type: 'turn.completed', timestamp: Date.now() });

      // Assistant finishes speaking after simulated duration
      setTimeout(() => {
        this.isAssistantSpeaking = false;
      }, 2500);
    }, 400);
  }

  async sendText(text: string): Promise<void> {
    const now = Date.now();
    this.lastTurnTimestamp = now;
    this.isAssistantSpeaking = true;
    this.emit({ type: 'assistant.response.started', timestamp: now });

    const nextQuestion = this.questions[this.turnCount % this.questions.length];
    this.turnCount++;

    this.emit({
      type: 'assistant.transcript.final',
      text: `Acknowledged: "${text.slice(0, 40)}...". ${nextQuestion}`,
      timestamp: Date.now(),
    });
    this.emit({ type: 'turn.completed', timestamp: Date.now() });

    setTimeout(() => {
      this.isAssistantSpeaking = false;
    }, 2000);
  }

  async interrupt(): Promise<void> {
    if (this.audioSilenceTimer) {
      clearTimeout(this.audioSilenceTimer);
      this.audioSilenceTimer = null;
    }
    this.isCandidateSpeaking = false;
    this.isAssistantSpeaking = false;
    this.emit({ type: 'assistant.interrupted', timestamp: Date.now() });
  }

  async close(): Promise<void> {
    if (this.audioSilenceTimer) {
      clearTimeout(this.audioSilenceTimer);
      this.audioSilenceTimer = null;
    }
    this.isCandidateSpeaking = false;
    this.isAssistantSpeaking = false;
    this.emit({
      type: 'session.ended',
      reason: 'client_requested',
      timestamp: Date.now(),
    });
  }

  onEvent(handler: (event: ConversationEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  private emit(event: ConversationEvent) {
    for (const h of this.eventHandlers) {
      try {
        h(event);
      } catch (err) {
        console.error('Error in mock event handler:', err);
      }
    }
  }
}
