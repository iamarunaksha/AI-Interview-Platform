import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsRelations } from 'typeorm';
import { InterviewSessionEntity } from './entities/interview-session.entity.js';
import { Question } from '../tracks/entities/question.entity.js';
import { ProviderRegistryService } from '../ai/provider-registry.service.js';
import { InterviewOrchestratorService } from './orchestrator/interview-orchestrator.service.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import type { IRealtimeSession } from '../ai/interfaces/realtime-provider.interface.js';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewStatus,
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
  MessageRole,
  type ConversationEvent,
  type TranscriptTurn,
  type InterviewSessionResponse,
  type ProgrammingLanguage,
  type CodeExecutionResult,
  type VideoLayoutMode,
} from '@interviewai/shared-types';
import type { CreateInterviewSessionDto } from './dto/create-interview.dto.js';
import { CodingService } from '../coding/coding.service.js';
import { DeepgramAdapter } from '../ai/adapters/deepgram.adapter.js';

@Injectable()
export class InterviewService implements OnModuleDestroy {
  private readonly logger = new Logger(InterviewService.name);
  private readonly activeRealtimeSessions = new Map<string, IRealtimeSession>();
  private readonly sessionEventCallbacks = new Map<
    string,
    (event: ConversationEvent) => void
  >();
  private readonly sessionCodeMap = new Map<
    string,
    { code: string; language: string; lastRunSummary?: string }
  >();
  private readonly sessionVideoMap = new Map<
    string,
    { isCameraActive: boolean; layoutMode?: VideoLayoutMode }
  >();
  private readonly transcriptQueues = new Map<string, Promise<void>>();
  private readonly sessionTurnQueues = new Map<string, Promise<void>>();
  private readonly pendingTtsMap = new Map<string, Promise<void>>();
  private readonly sessionLanguageMap = new Map<string, string>();
  private readonly sessionLastAssistantQuestion = new Map<string, string>();
  private readonly candidateAudioBuffers = new Map<
    string,
    {
      chunks: Buffer[];
      silenceTimer: NodeJS.Timeout | null;
      lastProcessTime: number;
      isProcessing: boolean;
      hasVocalActivity: boolean;
    }
  >();
  private readonly recentProcessedTexts = new Map<
    string,
    { text: string; timestamp: number }
  >();

  constructor(
    @InjectRepository(InterviewSessionEntity)
    private readonly sessionRepo: Repository<InterviewSessionEntity>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly orchestrator: InterviewOrchestratorService,
    @Optional()
    private readonly evidenceService?: EvidenceService,
    @Optional()
    private readonly codingService?: CodingService,
    @Optional()
    private readonly deepgramAdapter?: DeepgramAdapter,
  ) {}

  /**
   * Create a new interview session.
   */
  async createSession(
    userId: string,
    dto: CreateInterviewSessionDto,
  ): Promise<InterviewSessionResponse> {
    let question: Question | null = null;

    if (dto.questionId) {
      question = await this.questionRepo.findOne({
        where: { id: dto.questionId },
        relations: { competency: true } as FindOptionsRelations<Question>,
      });
      if (!question) {
        throw new NotFoundException(`Question '${dto.questionId}' not found`);
      }
    } else {
      const targetDomain = dto.domain ?? ProfessionalDomain.SDE;
      // For SDE interviews (especially SDE 1 / Junior / FAANG), prioritize Data Structures & Algorithmic Problem Solving
      if (targetDomain === ProfessionalDomain.SDE) {
        question = await this.questionRepo.findOne({
          where: {
            domain: ProfessionalDomain.SDE,
            isActive: true,
            ...(dto.difficulty ? { difficulty: dto.difficulty } : {}),
            competency: { slug: 'sde_dsa_problem_solving' },
          },
          relations: { competency: true } as FindOptionsRelations<Question>,
        });
      }

      if (!question) {
        // Fallback to any active question matching domain & difficulty
        question = await this.questionRepo.findOne({
          where: {
            domain: targetDomain,
            difficulty: dto.difficulty ?? InterviewDifficulty.MEDIUM,
            isActive: true,
          },
          relations: { competency: true } as FindOptionsRelations<Question>,
        });
      }
    }

    const session = this.sessionRepo.create({
      candidateId: userId,
      domain: dto.domain ?? ProfessionalDomain.SDE,
      companyCategory: dto.companyCategory ?? CompanyCategory.PRODUCT_COMPANY,
      targetRole: dto.targetRole ?? 'Software Development Engineer',
      experienceLevel: dto.experienceLevel ?? ExperienceLevel.SDE_1,
      difficulty: dto.difficulty ?? InterviewDifficulty.MEDIUM,
      durationMinutes: dto.durationMinutes ?? 30,
      personality: dto.personality ?? InterviewerPersonality.PROFESSIONAL,
      mode: dto.mode ?? InterviewMode.PRACTICE,
      status: InterviewStatus.CREATED,
      currentStage: InterviewStage.GREETING,
      coveredConcepts: [],
      currentQuestionId: question?.id ?? null,
      transcript: [],
      resumeSummary: dto.resumeSummary ?? null,
    });

    const saved = await this.sessionRepo.save(session);
    saved.currentQuestion = question;

    this.logger.log(
      `Created interview session ${saved.id} for user ${userId} (Role: ${saved.targetRole})`,
    );

    return this.mapToResponse(saved);
  }

  /**
   * Get an interview session by ID, optionally validating candidate ownership.
   */
  async getSession(
    sessionId: string,
    userId?: string,
  ): Promise<InterviewSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        currentQuestion: { competency: true },
      } as FindOptionsRelations<InterviewSessionEntity>,
    });

    if (!session) {
      throw new NotFoundException(`Interview session '${sessionId}' not found`);
    }

    if (userId && session.candidateId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this interview session',
      );
    }

    return session;
  }

  /**
   * List all interview sessions for a candidate.
   */
  async listSessions(userId: string): Promise<InterviewSessionResponse[]> {
    const sessions = await this.sessionRepo.find({
      where: { candidateId: userId },
      order: { createdAt: 'DESC' },
      relations: {
        currentQuestion: { competency: true },
      } as FindOptionsRelations<InterviewSessionEntity>,
    });

    return sessions.map((s) => this.mapToResponse(s));
  }

  /**
   * Start an interview session.
   */
  async startSession(
    sessionId: string,
    userId?: string,
  ): Promise<InterviewSessionResponse> {
    const session = await this.getSession(sessionId, userId);
    if (session.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot start an already completed interview.',
      );
    }

    session.status = InterviewStatus.IN_PROGRESS;
    session.startedAt = session.startedAt ?? new Date();
    const updated = await this.sessionRepo.save(session);
    return this.mapToResponse(updated);
  }

  /**
   * Pause an interview session.
   */
  async pauseSession(
    sessionId: string,
    userId?: string,
  ): Promise<InterviewSessionResponse> {
    const session = await this.getSession(sessionId, userId);
    session.status = InterviewStatus.PAUSED;
    const updated = await this.sessionRepo.save(session);
    return this.mapToResponse(updated);
  }

  /**
   * End an interview session.
   */
  async endSession(
    sessionId: string,
    userId?: string,
  ): Promise<InterviewSessionResponse> {
    const session = await this.getSession(sessionId, userId);
    session.status = InterviewStatus.COMPLETED;
    session.endedAt = new Date();
    const updated = await this.sessionRepo.save(session);

    await this.closeRealtimeBridge(sessionId);
    return this.mapToResponse(updated);
  }

  /**
   * Append a turn to the interview session's persistent transcript.
   * Serializes database writes per-session via a promise chain to eliminate race conditions,
   * and deduplicates consecutive identical turns within 2 seconds.
   */
  async appendTranscriptTurn(
    sessionId: string,
    turn: TranscriptTurn,
  ): Promise<void> {
    const previous = this.transcriptQueues.get(sessionId) || Promise.resolve();

    const next = previous
      .then(async () => {
        const session = await this.getSession(sessionId);
        const existing = session.transcript || [];

        // Deduplicate if identical turn was just appended
        if (existing.length > 0) {
          const last = existing[existing.length - 1];
          if (
            last.role === turn.role &&
            last.text.trim() === turn.text.trim() &&
            Math.abs(last.timestamp - turn.timestamp) < 2000
          ) {
            return;
          }
        }

        session.transcript = [...existing, turn];
        await this.sessionRepo.save(session);
      })
      .catch((err) => {
        this.logger.error(
          `Failed to append transcript turn for session ${sessionId}:`,
          err,
        );
      });

    this.transcriptQueues.set(sessionId, next);
    await next;
  }

  /**
   * Establish a realtime AI bridge for an interview session.
   */
  async createRealtimeBridge(
    sessionId: string,
    onEvent: (event: ConversationEvent) => void,
  ): Promise<IRealtimeSession> {
    // Return existing bridge if already active
    const existing = this.activeRealtimeSessions.get(sessionId);
    if (existing) {
      this.sessionEventCallbacks.set(sessionId, onEvent);
      existing.onEvent(onEvent);
      return existing;
    }

    const session = await this.getSession(sessionId);
    const state = this.orchestrator.initSession(session);
    const systemInstruction = this.orchestrator.getInitialInstruction(session);

    this.sessionEventCallbacks.set(sessionId, onEvent);

    // Emit initial orchestrator state
    onEvent({
      type: 'orchestrator.state',
      state,
      timestamp: Date.now(),
    });

    const provider = this.providerRegistry.getActiveRealtimeProvider();
    const llmProvider = this.providerRegistry.getActiveLlmProvider();
    const realtimeSession = await provider.createSession({
      sessionId,
      systemInstruction,
      session,
      llmProvider,
    });

    // If newly joined session with no prior assistant greeting, deliver initial greeting
    const existingAssistantTurns = (session.transcript || []).filter(
      (t) => t.role === MessageRole.ASSISTANT,
    );
    if (existingAssistantTurns.length === 0) {
      const isSap =
        session.domain === ProfessionalDomain.SAP ||
        session.currentQuestion?.domain === ProfessionalDomain.SAP;

      const isDsa =
        !isSap &&
        (session.currentQuestion?.competency?.slug?.includes('dsa') ||
          session.targetRole?.toLowerCase().includes('sde') ||
          session.targetRole?.toLowerCase().includes('software') ||
          Boolean(
            session.currentQuestion?.title?.toLowerCase().includes('two sum') ||
            session.currentQuestion?.title?.toLowerCase().includes('tree') ||
            session.currentQuestion?.title
              ?.toLowerCase()
              .includes('parenthes') ||
            session.currentQuestion?.title
              ?.toLowerCase()
              .includes('substring') ||
            session.currentQuestion?.title?.toLowerCase().includes('lru') ||
            session.currentQuestion?.title?.toLowerCase().includes('ancestor'),
          ));

      const durationMinutes = session.durationMinutes || 30;
      const greetingText = isSap
        ? `Hello! Welcome to your technical interview today. My name is Alex, Lead SAP Solutions Architect. Today we'll be walking through an enterprise architecture and modernization scenario for the role of ${session.targetRole}, focusing on S/4HANA core business processes, Clean Core extensibility, and cloud integration. How are you doing today? Whenever you're ready, let me know and we will begin.`
        : isDsa
          ? `Hello! Welcome to your technical interview today. My name is Alex from the engineering team. Today's session is a ${durationMinutes}-minute Data Structures & Algorithms round for the role of ${session.targetRole}. We'll collaborate in the code editor, and I want to see how you break down problems, consider trade-offs, and write clean, working code. How are you doing today? Whenever you're ready, let me know and we'll dive right in.`
          : `Hello! Welcome to your technical interview today. My name is Alex from the engineering team. Today's session is a ${durationMinutes}-minute technical architecture and system design round for the role of ${session.targetRole}. How are you doing today? Whenever you're ready, let me know and we'll dive in.`;

      setTimeout(async () => {
        this.sessionLastAssistantQuestion.set(sessionId, greetingText);
        let audioBuf: Buffer | null = null;
        if (this.deepgramAdapter?.isConfigured) {
          try {
            audioBuf = await this.deepgramAdapter.synthesizeSpeech(greetingText);
          } catch (err) {
            this.logger.warn(
              `Deepgram greeting synthesis notice: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        const turn = {
          id: `turn-ast-${Date.now()}`,
          role: MessageRole.ASSISTANT,
          text: greetingText,
          timestamp: Date.now(),
        };
        void this.appendTranscriptTurn(sessionId, turn);
        onEvent({
          type: 'assistant.transcript.final',
          text: greetingText,
          timestamp: Date.now(),
        });
        if (audioBuf && audioBuf.length > 0) {
          onEvent({
            type: 'assistant.audio.chunk',
            audio: new Uint8Array(audioBuf),
            timestamp: Date.now(),
          });
        }
        onEvent({
          type: 'turn.completed',
          timestamp: Date.now(),
        });
      }, 500);
    }

    // Wire internal transcript recording, TTS sequencing, and orchestrator progression
    realtimeSession.onEvent((event: ConversationEvent) => {
      if (event.type === 'assistant.transcript.final') {
        this.sessionLastAssistantQuestion.set(sessionId, event.text);
        void this.appendTranscriptTurn(sessionId, {
          id: `turn-ast-${Date.now()}`,
          role: MessageRole.ASSISTANT,
          text: event.text,
          timestamp: event.timestamp,
        });

        onEvent(event);

        // Synthesize assistant voice using Deepgram and track pending promise
        // so turn.completed waits until audio delivery completes.
        if (this.deepgramAdapter?.isConfigured) {
          const ttsPromise = this.deepgramAdapter
            .synthesizeSpeech(event.text)
            .then((audioBuf) => {
              if (audioBuf && audioBuf.length > 0) {
                onEvent({
                  type: 'assistant.audio.chunk',
                  audio: new Uint8Array(audioBuf),
                  timestamp: Date.now(),
                });
              }
            })
            .catch((err) => {
              this.logger.warn(`Deepgram turn synthesis notice: ${err}`);
            })
            .finally(() => {
              if (this.pendingTtsMap.get(sessionId) === ttsPromise) {
                this.pendingTtsMap.delete(sessionId);
              }
            });
          this.pendingTtsMap.set(sessionId, ttsPromise);
        }
        return;
      }

      if (event.type === 'turn.completed') {
        const pendingTts = this.pendingTtsMap.get(sessionId);
        if (pendingTts) {
          void pendingTts.finally(() => {
            onEvent(event);
          });
          return;
        }
      }

      if (event.type === 'candidate.transcript.final') {
        void this.appendTranscriptTurn(sessionId, {
          id: `turn-cnd-${Date.now()}`,
          role: MessageRole.CANDIDATE,
          text: event.text,
          timestamp: event.timestamp,
        });

        // Trigger orchestrator stage & concept evaluation
        const currentCode = this.getSessionCode(session.id);
        void this.orchestrator
          .processCandidateTurn(session, event.text, currentCode)
          .then((orchResult) => {
            if (orchResult.transition) {
              onEvent({
                type: 'orchestrator.transition',
                transition: orchResult.transition,
                timestamp: Date.now(),
              });
            }
            onEvent({
              type: 'orchestrator.state',
              state: orchResult.state,
              timestamp: Date.now(),
            });
          });

        // Trigger background evidence extraction
        const lastAsked =
          this.sessionLastAssistantQuestion.get(sessionId) ||
          session.currentQuestion?.stem ||
          'Interview question';
        if (
          this.evidenceService &&
          event.text.trim().length >= 10 &&
          session.currentStage !== InterviewStage.GREETING
        ) {
          void this.evidenceService
            .extractAndSaveEvidence({
              sessionId,
              turnId: `turn-cnd-${Date.now()}`,
              questionAsked: lastAsked,
              candidateAnswer: event.text,
              competencyId: session.currentQuestion?.competencyId,
              expectedConcepts: session.currentQuestion?.expectedConcepts,
              commonMisconceptions:
                session.currentQuestion?.commonMisconceptions,
            })
            .then((saved) => {
              const resp = this.evidenceService?.mapToResponse(saved);
              if (resp) {
                onEvent({
                  type: 'evidence.recorded',
                  evidence: resp,
                  timestamp: Date.now(),
                });
              }
            })
            .catch((err) => {
              this.logger.warn(`Background evidence extraction failed: ${err}`);
            });
        }
      }

      onEvent(event);
    });

    this.activeRealtimeSessions.set(sessionId, realtimeSession);
    return realtimeSession;
  }

  /**
   * Update candidate speech accent/language preference (e.g. 'en-IN', 'en-US', 'en-GB').
   */
  setSessionLanguage(sessionId: string, language: string): void {
    if (language?.trim()) {
      this.sessionLanguageMap.set(sessionId, language.trim());
    }
  }

  private async processAudioBufferWithDeepgram(
    sessionId: string,
    accumulated: Buffer,
  ): Promise<void> {
    if (!this.deepgramAdapter?.isConfigured) return;
    const language = this.sessionLanguageMap.get(sessionId) || 'en-IN';
    const transcript = await this.deepgramAdapter.transcribeAudio(
      accumulated,
      'audio/raw',
      { language },
    );
    const clean = transcript.trim();
    if (clean.length > 0) {
      this.logger.log(
        `[Deepgram STT (${language})] Transcribed candidate speech: "${clean}" for session ${sessionId}`,
      );
      const callback = this.sessionEventCallbacks.get(sessionId);
      if (callback) {
        callback({
          type: 'candidate.transcript.final',
          text: clean,
          timestamp: Date.now(),
        });
      }
      // Enqueued onto per-session turn queue so STT immediately unlocks for subsequent speech
      void this.sendClientText(sessionId, clean);
    }
  }

  /**
   * Serialize per-session turns (voice transcripts, typed inputs, code execution)
   * so consecutive turns cannot overtake each other or emit out-of-order replies.
   */
  private enqueueSessionTurn(
    sessionId: string,
    task: () => Promise<void>,
  ): Promise<void> {
    const previous = this.sessionTurnQueues.get(sessionId) || Promise.resolve();
    const next = previous
      .then(task)
      .catch((err) => {
        this.logger.warn(
          `Serialized turn notice for session ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    this.sessionTurnQueues.set(sessionId, next);
    return next;
  }
  async sendClientAudio(
    sessionId: string,
    chunk: Buffer | Uint8Array,
  ): Promise<void> {
    const bridge = this.activeRealtimeSessions.get(sessionId);
    if (bridge) {
      await bridge.sendAudio(chunk);
    }

    if (!this.deepgramAdapter || !this.deepgramAdapter.isConfigured) {
      return;
    }

    const chunkBuf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    let sessionBuffer = this.candidateAudioBuffers.get(sessionId);
    if (!sessionBuffer) {
      sessionBuffer = {
        chunks: [],
        silenceTimer: null,
        lastProcessTime: 0,
        isProcessing: false,
        hasVocalActivity: false,
      };
      this.candidateAudioBuffers.set(sessionId, sessionBuffer);
    }

    sessionBuffer.chunks.push(chunkBuf);

    // Compute RMS audio volume of 16-bit linear PCM chunk
    const numSamples = Math.floor(chunkBuf.length / 2);
    if (numSamples > 0) {
      let sumSquares = 0;
      for (let i = 0; i < chunkBuf.length - 1; i += 2) {
        const sample = chunkBuf.readInt16LE(i) / 32768.0;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / numSamples);
      if (rms > 0.01) {
        sessionBuffer.hasVocalActivity = true;
      }
    }

    // Reset silence timer on every incoming chunk
    if (sessionBuffer.silenceTimer) {
      clearTimeout(sessionBuffer.silenceTimer);
    }

    // After 850ms of silence, process accumulated candidate speech
    const scheduleFlush = (delayMs: number) => {
      sessionBuffer!.silenceTimer = setTimeout(async () => {
        const current = this.candidateAudioBuffers.get(sessionId);
        if (!current || current.chunks.length === 0) return;

        if (current.isProcessing) {
          scheduleFlush(250);
          return;
        }

        const accumulated = Buffer.concat(current.chunks);
        current.chunks = [];
        const hadSpeech = current.hasVocalActivity;
        current.hasVocalActivity = false;

        // 16kHz 16-bit mono = 32,000 bytes/sec. Minimum 0.25s of audio (8,000 bytes) with speech energy.
        if (!hadSpeech || accumulated.length < 8000) return;

        current.isProcessing = true;
        try {
          await this.processAudioBufferWithDeepgram(sessionId, accumulated);
        } catch (err) {
          this.logger.warn(
            `Deepgram STT transcription notice for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        } finally {
          current.isProcessing = false;
        }
      }, delayMs);
    };
    scheduleFlush(850);

    // If accumulated buffer exceeds ~10 seconds of speech (320,000 bytes), flush immediately
    const totalBytes = sessionBuffer.chunks.reduce(
      (acc, c) => acc + c.length,
      0,
    );
    if (totalBytes >= 320000 && !sessionBuffer.isProcessing) {
      if (sessionBuffer.silenceTimer) {
        clearTimeout(sessionBuffer.silenceTimer);
        sessionBuffer.silenceTimer = null;
      }
      const accumulated = Buffer.concat(sessionBuffer.chunks);
      sessionBuffer.chunks = [];
      const hadSpeech = sessionBuffer.hasVocalActivity;
      sessionBuffer.hasVocalActivity = false;

      if (hadSpeech && accumulated.length >= 8000) {
        sessionBuffer.isProcessing = true;
        void (async () => {
          try {
            await this.processAudioBufferWithDeepgram(sessionId, accumulated);
          } catch (err) {
            this.logger.warn(
              `Deepgram STT transcription notice for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          } finally {
            sessionBuffer.isProcessing = false;
          }
        })();
      }
    }
  }

  /**
   * Forward client text (typing / chat / transcribed speech) to the AI real-time session,
   * serialized per session to eliminate overlapping responses and guardrail races.
   */
  async sendClientText(sessionId: string, text: string): Promise<void> {
    const cleanText = text.trim();
    if (!cleanText) return;

    await this.enqueueSessionTurn(sessionId, async () => {
      // Deduplicate rapid repeat submissions (e.g. if both STT and typed submit fire within 3s)
      const lastProcessed = this.recentProcessedTexts.get(sessionId);
      const now = Date.now();
      if (
        lastProcessed &&
        lastProcessed.text.toLowerCase().trim() === cleanText.toLowerCase() &&
        now - lastProcessed.timestamp < 3000
      ) {
        this.logger.debug(`Skipping duplicate transcript turn: "${cleanText}"`);
        return;
      }
      this.recentProcessedTexts.set(sessionId, {
        text: cleanText,
        timestamp: now,
      });

      // ── STRICT INTERVIEW GUARDRAILS CHECK ──────────────────────────────
      // 1. Refuse direct answers / full solutions requested by candidate.
      // 2. Reject out-of-context prompts (weather, sports, politics, jailbreak).
      const guardrail = this.orchestrator.checkGuardrails(cleanText);
      if (guardrail.triggered && guardrail.response) {
        const reply = guardrail.response;
        this.logger.log(
          `[Interview Guardrail] Triggered '${guardrail.type}' in session ${sessionId}`,
        );

        await this.appendTranscriptTurn(sessionId, {
          id: `turn-cnd-${Date.now()}`,
          role: MessageRole.CANDIDATE,
          text: cleanText,
          timestamp: Date.now(),
        });

        await this.appendTranscriptTurn(sessionId, {
          id: `turn-ast-${Date.now()}`,
          role: MessageRole.ASSISTANT,
          text: reply,
          timestamp: Date.now(),
        });

        this.sessionLastAssistantQuestion.set(sessionId, reply);

        const callback = this.sessionEventCallbacks.get(sessionId);
        if (callback) {
          callback({
            type: 'assistant.transcript.final',
            text: reply,
            timestamp: Date.now(),
          });

          if (this.deepgramAdapter?.isConfigured) {
            try {
              const audioBuf =
                await this.deepgramAdapter.synthesizeSpeech(reply);
              if (audioBuf && audioBuf.length > 0) {
                callback({
                  type: 'assistant.audio.chunk',
                  audio: new Uint8Array(audioBuf),
                  timestamp: Date.now(),
                });
              }
            } catch (err) {
              this.logger.warn(
                `Deepgram guardrail speech notice: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }

          callback({
            type: 'turn.completed',
            timestamp: Date.now(),
          });
        }
        return;
      }

      let bridge = this.activeRealtimeSessions.get(sessionId);
      if (!bridge) {
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 400));
          bridge = this.activeRealtimeSessions.get(sessionId);
          if (bridge) break;
        }
      }

      if (bridge) {
        await this.appendTranscriptTurn(sessionId, {
          id: `turn-cnd-${Date.now()}`,
          role: MessageRole.CANDIDATE,
          text: cleanText,
          timestamp: Date.now(),
        });

        // Advance orchestrator & retrieve live stage + code + concept context
        const session = await this.getSession(sessionId);
        const currentCode = this.getSessionCode(sessionId);
        const orchResult = await this.orchestrator.processCandidateTurn(
          session,
          cleanText,
          currentCode,
        );

        // Push updated orchestrator systemInstruction into active AI bridge before generating
        bridge.updateSystemInstruction?.(orchResult.systemInstruction);

        const callback = this.sessionEventCallbacks.get(sessionId);
        if (callback) {
          if (orchResult.transition) {
            callback({
              type: 'orchestrator.transition',
              transition: orchResult.transition,
              timestamp: Date.now(),
            });
          }
          callback({
            type: 'orchestrator.state',
            state: orchResult.state,
            timestamp: Date.now(),
          });
        }

        // Trigger background evidence extraction paired with the actual preceding interviewer question
        const lastAsked =
          this.sessionLastAssistantQuestion.get(sessionId) ||
          session.currentQuestion?.stem ||
          'Interview question';
        if (
          this.evidenceService &&
          cleanText.length >= 10 &&
          orchResult.state.stage !== InterviewStage.GREETING &&
          session.currentStage !== InterviewStage.GREETING
        ) {
          void this.evidenceService
            .extractAndSaveEvidence({
              sessionId,
              turnId: `turn-cnd-${Date.now()}`,
              questionAsked: lastAsked,
              candidateAnswer: cleanText,
              competencyId: session.currentQuestion?.competencyId,
              expectedConcepts: session.currentQuestion?.expectedConcepts,
              commonMisconceptions:
                session.currentQuestion?.commonMisconceptions,
            })
            .then((saved) => {
              const resp = this.evidenceService?.mapToResponse(saved);
              if (resp && callback) {
                callback({
                  type: 'evidence.recorded',
                  evidence: resp,
                  timestamp: Date.now(),
                });
              }
            })
            .catch((err) => {
              this.logger.warn(`Background evidence extraction failed: ${err}`);
            });
        }

        await bridge.sendText(cleanText);
      }
    });
  }

  /**
   * Signal an interruption to stop the assistant speaking.
   */
  async interruptAssistant(sessionId: string): Promise<void> {
    const bridge = this.activeRealtimeSessions.get(sessionId);
    if (bridge) {
      await bridge.interrupt();
    }
  }

  /**
   * Close and cleanup the active real-time bridge and all associated session state.
   */
  async closeRealtimeBridge(sessionId: string): Promise<void> {
    const bridge = this.activeRealtimeSessions.get(sessionId);
    if (bridge) {
      await bridge.close();
      this.activeRealtimeSessions.delete(sessionId);
      this.sessionEventCallbacks.delete(sessionId);
      this.logger.log(`Closed realtime bridge for session ${sessionId}`);
    }

    // Clean up audio buffers, code, video, transcript queue, and orchestrator state
    const audioBuf = this.candidateAudioBuffers.get(sessionId);
    if (audioBuf?.silenceTimer) {
      clearTimeout(audioBuf.silenceTimer);
    }
    this.candidateAudioBuffers.delete(sessionId);
    this.recentProcessedTexts.delete(sessionId);

    this.sessionCodeMap.delete(sessionId);
    this.sessionVideoMap.delete(sessionId);
    this.transcriptQueues.delete(sessionId);
    this.sessionTurnQueues.delete(sessionId);
    this.pendingTtsMap.delete(sessionId);
    this.sessionLanguageMap.delete(sessionId);
    this.sessionLastAssistantQuestion.delete(sessionId);
    this.orchestrator.clearSession(sessionId);
  }

  /**
   * Graceful shutdown hook: cleanly closes all open realtime sessions on process termination.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      'Gracefully closing all active realtime bridges on shutdown...',
    );
    for (const [sessionId, bridge] of this.activeRealtimeSessions.entries()) {
      try {
        await bridge.close();
      } catch (err) {
        this.logger.warn(
          `Error closing bridge on destroy for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    for (const [, audioBuf] of this.candidateAudioBuffers.entries()) {
      if (audioBuf.silenceTimer) {
        clearTimeout(audioBuf.silenceTimer);
      }
    }
    this.candidateAudioBuffers.clear();
    this.recentProcessedTexts.clear();
    this.activeRealtimeSessions.clear();
    this.sessionEventCallbacks.clear();
    this.sessionCodeMap.clear();
    this.sessionVideoMap.clear();
    this.transcriptQueues.clear();
    this.sessionTurnQueues.clear();
    this.pendingTtsMap.clear();
    this.sessionLanguageMap.clear();
    this.sessionLastAssistantQuestion.clear();
  }

  /**
   * Get the orchestrator state for a session.
   */
  getOrchestratorState(sessionId: string) {
    return this.orchestrator.getState(sessionId);
  }

  /**
   * Map entity to clean response object.
   */
  mapToResponse(session: InterviewSessionEntity): InterviewSessionResponse {
    return {
      id: session.id,
      candidateId: session.candidateId,
      domain: session.domain,
      companyCategory: session.companyCategory,
      targetRole: session.targetRole,
      experienceLevel: session.experienceLevel,
      difficulty: session.difficulty,
      durationMinutes: session.durationMinutes,
      personality: session.personality,
      mode: session.mode,
      status: session.status,
      currentStage: session.currentStage || InterviewStage.GREETING,
      coveredConcepts: session.coveredConcepts || [],
      currentQuestion: session.currentQuestion
        ? {
            id: session.currentQuestion.id,
            competencyId: session.currentQuestion.competencyId,
            competency: session.currentQuestion.competency
              ? {
                  id: session.currentQuestion.competency.id,
                  domain: session.currentQuestion.competency.domain,
                  name: session.currentQuestion.competency.name,
                  slug: session.currentQuestion.competency.slug,
                  category: session.currentQuestion.competency.category,
                  description: session.currentQuestion.competency.description,
                  isActive: session.currentQuestion.competency.isActive,
                }
              : undefined,
            domain: session.currentQuestion.domain,
            companyCategories: session.currentQuestion.companyCategories,
            experienceLevels: session.currentQuestion.experienceLevels,
            difficulty: session.currentQuestion.difficulty,
            title: session.currentQuestion.title,
            stem: session.currentQuestion.stem,
            contextPrompt: session.currentQuestion.contextPrompt,
            expectedConcepts: session.currentQuestion.expectedConcepts,
            commonMisconceptions: session.currentQuestion.commonMisconceptions,
            probingQuestions: session.currentQuestion.probingQuestions,
            rubricGuide: session.currentQuestion.rubricGuide,
            isActive: session.currentQuestion.isActive,
            createdAt: session.currentQuestion.createdAt.toISOString(),
            updatedAt: session.currentQuestion.updatedAt.toISOString(),
          }
        : null,
      transcript: session.transcript || [],
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      resumeSummary: session.resumeSummary ?? null,
    };
  }

  /**
   * Update active code editor state for a session.
   */
  updateSessionCode(sessionId: string, code: string, language: string): void {
    const existing = this.sessionCodeMap.get(sessionId);
    this.sessionCodeMap.set(sessionId, {
      code,
      language,
      lastRunSummary: existing?.lastRunSummary,
    });
  }

  /**
   * Retrieve active code editor state for a session.
   */
  getSessionCode(
    sessionId: string,
  ): { code: string; language: string; lastRunSummary?: string } | undefined {
    return this.sessionCodeMap.get(sessionId);
  }

  /**
   * Execute code in sandbox and inform the live interviewer bridge of results
   * cleanly through the serialized session turn queue without polluting candidate transcript history.
   */
  async executeSessionCode(
    sessionId: string,
    data: {
      code: string;
      language: ProgrammingLanguage;
      problemId?: string;
    },
  ): Promise<CodeExecutionResult> {
    this.updateSessionCode(sessionId, data.code, data.language);

    if (!this.codingService) {
      throw new Error('CodingService is not available in InterviewService');
    }

    const result = await this.codingService.runCode(data, data.problemId);
    const existing = this.sessionCodeMap.get(sessionId);
    this.sessionCodeMap.set(sessionId, {
      code: data.code,
      language: data.language,
      lastRunSummary: result.interviewerContextNote,
    });

    // Notify active AI interviewer session sequentially with full updated systemInstruction
    const bridge = this.activeRealtimeSessions.get(sessionId);
    if (bridge && result.interviewerContextNote) {
      void this.enqueueSessionTurn(sessionId, async () => {
        const activeBridge = this.activeRealtimeSessions.get(sessionId);
        if (!activeBridge) return;
        const session = await this.getSession(sessionId);
        const codeState = this.getSessionCode(sessionId) ?? existing;
        const systemInstruction = this.orchestrator.buildCurrentInstruction(
          session,
          codeState,
        );
        activeBridge.updateSystemInstruction?.(systemInstruction);

        if (typeof activeBridge.sendSystemEvent === 'function') {
          await activeBridge.sendSystemEvent(
            `I just ran the tests in the code editor. Sandbox result: ${result.interviewerContextNote}`,
          );
        } else {
          await activeBridge.sendText(
            `[Sandbox Result: ${result.interviewerContextNote}]`,
          );
        }
      });
    }

    return result;
  }

  /**
   * Update active video stream state for a session.
   */
  updateSessionVideoState(
    sessionId: string,
    isCameraActive: boolean,
    layoutMode?: VideoLayoutMode,
  ): void {
    this.sessionVideoMap.set(sessionId, { isCameraActive, layoutMode });
    this.logger.log(
      `Session ${sessionId} video state updated: camera=${isCameraActive}, layout=${layoutMode || 'default'}`,
    );
  }

  /**
   * Retrieve active video stream state for a session.
   */
  getSessionVideoState(
    sessionId: string,
  ): { isCameraActive: boolean; layoutMode?: VideoLayoutMode } | undefined {
    return this.sessionVideoMap.get(sessionId);
  }
}
