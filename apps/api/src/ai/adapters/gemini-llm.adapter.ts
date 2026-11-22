import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { ILlmProvider } from '../interfaces/llm-provider.interface.js';
import type {
  IEvaluationProvider,
  EvaluationSessionInput,
} from '../interfaces/evaluation-provider.interface.js';
import { MockAiAdapter } from './mock-ai.adapter.js';
import {
  type ChatMessage,
  type LlmGenerateOptions,
  type LlmGenerateResult,
  type InterviewReport,
  InterviewDifficulty,
  EvaluationRating,
} from '@interviewai/shared-types';

/**
 * GeminiLlmAdapter — production adapter using Google Gemini 2.0 Flash.
 *
 * Implements:
 * - ILlmProvider
 * - IEvaluationProvider
 *
 * Encapsulates the Google Gen AI SDK entirely. If no GEMINI_API_KEY is configured,
 * it safely falls back to MockAiAdapter and outputs actionable guidance.
 */
@Injectable()
export class GeminiLlmAdapter implements ILlmProvider, IEvaluationProvider {
  private readonly logger = new Logger(GeminiLlmAdapter.name);
  private readonly client: GoogleGenAI | null = null;
  private readonly fallbackMock: MockAiAdapter;
  private readonly fallbackModels = [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
  ];

  readonly name = 'gemini';
  readonly modelName: string;
  readonly isConfigured: boolean;

  constructor(configService: ConfigService) {
    this.fallbackMock = new MockAiAdapter();
    const apiKey = configService.get<string>('GEMINI_API_KEY', '').trim();
    this.modelName = configService.get<string>(
      'GEMINI_MODEL',
      'gemini-3.1-flash-lite',
    );

    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
      this.isConfigured = true;
      this.logger.log(
        `✅ Gemini provider initialized with model ${this.modelName}`,
      );
    } else {
      this.client = null;
      this.isConfigured = false;
      this.logger.warn(
        `⚠️ GEMINI_API_KEY not configured. Gemini adapter operating in simulated fallback mode.`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client || !this.isConfigured) return false;
    try {
      const res = await this.executeWithModelFallback(async (model) =>
        this.client!.models.generateContent({
          model,
          contents: 'ping',
        }),
      );
      return !!res.text;
    } catch (err) {
      this.logger.error(`Gemini connection test failed:`, err);
      return false;
    }
  }

  private async executeWithModelFallback<T>(
    operation: (model: string) => Promise<T>,
  ): Promise<T> {
    const candidateModels = Array.from(
      new Set([this.modelName, ...this.fallbackModels]),
    );

    let lastError: unknown;
    for (const model of candidateModels) {
      try {
        return await operation(model);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Gemini model '${model}' attempt failed (${msg.slice(0, 120)}), trying fallback...`,
        );
      }
    }
    throw lastError;
  }

  // ── ILlmProvider implementation ──────────────────────────

  async generateText(
    prompt: string,
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult> {
    if (!this.client) {
      return this.fallbackMock.generateText(prompt, options);
    }

    try {
      const response = await this.executeWithModelFallback(async (model) =>
        this.client!.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: options?.systemInstruction,
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens,
            responseMimeType: options?.responseMimeType,
            stopSequences: options?.stopSequences,
          },
        }),
      );

      return {
        text: response.text ?? '',
        modelName: this.modelName,
        finishReason: response.candidates?.[0]?.finishReason ?? 'STOP',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount,
          completionTokens: response.usageMetadata?.candidatesTokenCount,
          totalTokens: response.usageMetadata?.totalTokenCount,
        },
      };
    } catch (err) {
      this.logger.error(
        `Gemini generateText error, falling back to mock:`,
        err,
      );
      return this.fallbackMock.generateText(prompt, options);
    }
  }

  async generateChat(
    messages: ChatMessage[],
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult> {
    if (!this.client) {
      return this.fallbackMock.generateChat(messages, options);
    }

    // Convert canonical ChatMessages to Gemini contents array
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const effectiveSystemInstruction =
      options?.systemInstruction ?? systemMessage;

    try {
      const response = await this.executeWithModelFallback(async (model) =>
        this.client!.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: effectiveSystemInstruction,
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens,
            responseMimeType: options?.responseMimeType,
          },
        }),
      );

      return {
        text: response.text ?? '',
        modelName: this.modelName,
        finishReason: response.candidates?.[0]?.finishReason ?? 'STOP',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount,
          completionTokens: response.usageMetadata?.candidatesTokenCount,
          totalTokens: response.usageMetadata?.totalTokenCount,
        },
      };
    } catch (err) {
      this.logger.error(
        `Gemini generateChat error, falling back to mock:`,
        err,
      );
      return this.fallbackMock.generateChat(messages, options);
    }
  }

  async *streamChat(
    messages: ChatMessage[],
    options?: LlmGenerateOptions,
  ): AsyncIterable<string> {
    if (!this.client) {
      yield* this.fallbackMock.streamChat(messages, options);
      return;
    }

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemMessage = messages.find((m) => m.role === 'system')?.content;

    try {
      const stream = await this.client.models.generateContentStream({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: options?.systemInstruction ?? systemMessage,
          temperature: options?.temperature ?? 0.7,
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (err) {
      this.logger.error(
        `Gemini streamChat error, falling back to mock stream:`,
        err,
      );
      yield* this.fallbackMock.streamChat(messages, options);
    }
  }

  // ── IEvaluationProvider implementation ───────────────────

  async evaluateSession(
    input: EvaluationSessionInput,
  ): Promise<InterviewReport> {
    if (!this.client) {
      return this.fallbackMock.evaluateSession(input);
    }

    const prompt = `You are an expert technical interviewer evaluating a candidate for the role of ${input.targetRole} (${input.experienceLevel}) in the ${input.domain} domain.

Analyze the transcript and demonstrated competencies below. Generate an objective, rigorous 4-point rubric evaluation report.
Rating scale: 1=POOR, 2=DEVELOPING, 3=PROFICIENT, 4=STRONG.

Transcript:
${input.transcript.map((t) => `[${t.role.toUpperCase()}]: ${t.text}`).join('\n')}

Competencies evaluated:
${input.competencies.map((c) => `- ${c.name}: ${c.description}`).join('\n')}

Return ONLY valid JSON matching this schema:
{
  "overallScore": number,
  "overallRating": 1 | 2 | 3 | 4,
  "summary": "detailed assessment paragraph",
  "competencyScores": [
    {
      "competencyId": "id",
      "competencyName": "name",
      "score": number,
      "rating": 1 | 2 | 3 | 4,
      "justification": "evidence-based explanation",
      "sufficientEvidence": boolean
    }
  ],
  "strengths": ["point 1", "point 2"],
  "weaknesses": ["point 1", "point 2"],
  "incorrectStatements": [],
  "areasNotAssessed": [],
  "recommendations": ["study item 1", "study item 2"],
  "suggestedNextDifficulty": "easy" | "medium" | "hard"
}`;

    try {
      const response = await this.executeWithModelFallback(async (model) =>
        this.client!.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2, // low temperature for objective evaluation
          },
        }),
      );

      const parsed = JSON.parse(response.text ?? '{}');
      return {
        id: `eval-${Date.now()}`,
        sessionId: input.sessionId,
        overallScore: parsed.overallScore ?? 3.0,
        overallRating: parsed.overallRating ?? EvaluationRating.PROFICIENT,
        summary: parsed.summary ?? 'Evaluation completed.',
        competencyScores: parsed.competencyScores ?? [],
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        incorrectStatements: parsed.incorrectStatements ?? [],
        areasNotAssessed: parsed.areasNotAssessed ?? [],
        recommendations: parsed.recommendations ?? [],
        suggestedNextDifficulty:
          parsed.suggestedNextDifficulty ?? InterviewDifficulty.MEDIUM,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`Gemini evaluation failed, falling back to mock:`, err);
      return this.fallbackMock.evaluateSession(input);
    }
  }
}
