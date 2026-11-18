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

  constructor(readonly sessionId: string) {
    // Emit session.ready after tick
    setTimeout(() => {
      this.emit({ type: 'session.ready', timestamp: Date.now() });
    }, 10);
  }

  async sendAudio(_pcmChunk: Buffer | Uint8Array): Promise<void> {
    // In mock mode, acknowledge speech
    this.emit({ type: 'candidate.speech.started', timestamp: Date.now() });
    setTimeout(() => {
      this.emit({
        type: 'candidate.transcript.final',
        text: 'I would use a distributed token bucket in Redis.',
        timestamp: Date.now(),
      });
      this.emit({ type: 'candidate.speech.ended', timestamp: Date.now() });
      this.emit({ type: 'assistant.response.started', timestamp: Date.now() });
      this.emit({
        type: 'assistant.transcript.final',
        text: 'Good. How do you prevent race conditions when multiple instances request tokens simultaneously?',
        timestamp: Date.now(),
      });
      this.emit({ type: 'turn.completed', timestamp: Date.now() });
    }, 50);
  }

  async sendText(text: string): Promise<void> {
    this.emit({ type: 'assistant.response.started', timestamp: Date.now() });
    this.emit({
      type: 'assistant.transcript.final',
      text: `Acknowledged: ${text}`,
      timestamp: Date.now(),
    });
    this.emit({ type: 'turn.completed', timestamp: Date.now() });
  }

  async interrupt(): Promise<void> {
    this.emit({ type: 'assistant.interrupted', timestamp: Date.now() });
  }

  async close(): Promise<void> {
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
