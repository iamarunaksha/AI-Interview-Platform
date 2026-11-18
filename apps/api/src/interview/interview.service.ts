import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsRelations } from 'typeorm';
import { InterviewSessionEntity } from './entities/interview-session.entity.js';
import { Question } from '../tracks/entities/question.entity.js';
import { ProviderRegistryService } from '../ai/provider-registry.service.js';
import { InterviewOrchestratorService } from './orchestrator/interview-orchestrator.service.js';
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
} from '@interviewai/shared-types';
import type { CreateInterviewSessionDto } from './dto/create-interview.dto.js';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);
  private readonly activeRealtimeSessions = new Map<string, IRealtimeSession>();
  private readonly sessionEventCallbacks = new Map<
    string,
    (event: ConversationEvent) => void
  >();

  constructor(
    @InjectRepository(InterviewSessionEntity)
    private readonly sessionRepo: Repository<InterviewSessionEntity>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly orchestrator: InterviewOrchestratorService,
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
      // Find an appropriate initial question based on domain & difficulty
      question = await this.questionRepo.findOne({
        where: {
          domain: dto.domain ?? ProfessionalDomain.SDE,
          difficulty: dto.difficulty ?? InterviewDifficulty.MEDIUM,
          isActive: true,
        },
        relations: { competency: true } as FindOptionsRelations<Question>,
      });
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
    });

    const saved = await this.sessionRepo.save(session);
    saved.currentQuestion = question;

    this.logger.log(
      `Created interview session ${saved.id} for user ${userId} (Role: ${saved.targetRole})`,
    );

    return this.mapToResponse(saved);
  }

  /**
   * Get an interview session by ID.
   */
  async getSession(sessionId: string): Promise<InterviewSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        currentQuestion: { competency: true },
      } as FindOptionsRelations<InterviewSessionEntity>,
    });

    if (!session) {
      throw new NotFoundException(`Interview session '${sessionId}' not found`);
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
  async startSession(sessionId: string): Promise<InterviewSessionResponse> {
    const session = await this.getSession(sessionId);
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
  async pauseSession(sessionId: string): Promise<InterviewSessionResponse> {
    const session = await this.getSession(sessionId);
    session.status = InterviewStatus.PAUSED;
    const updated = await this.sessionRepo.save(session);
    return this.mapToResponse(updated);
  }

  /**
   * End an interview session.
   */
  async endSession(sessionId: string): Promise<InterviewSessionResponse> {
    const session = await this.getSession(sessionId);
    session.status = InterviewStatus.COMPLETED;
    session.endedAt = new Date();
    const updated = await this.sessionRepo.save(session);

    await this.closeRealtimeBridge(sessionId);
    return this.mapToResponse(updated);
  }

  /**
   * Append a turn to the interview session's persistent transcript.
   */
  async appendTranscriptTurn(
    sessionId: string,
    turn: TranscriptTurn,
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    const existing = session.transcript || [];
    session.transcript = [...existing, turn];
    await this.sessionRepo.save(session);
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
    const realtimeSession = await provider.createSession({
      sessionId,
      systemInstruction,
    });

    // Wire internal transcript recording and orchestrator progression
    realtimeSession.onEvent((event: ConversationEvent) => {
      if (event.type === 'assistant.transcript.final') {
        void this.appendTranscriptTurn(sessionId, {
          id: `turn-ast-${Date.now()}`,
          role: MessageRole.ASSISTANT,
          text: event.text,
          timestamp: event.timestamp,
        });
      } else if (event.type === 'candidate.transcript.final') {
        void this.appendTranscriptTurn(sessionId, {
          id: `turn-cnd-${Date.now()}`,
          role: MessageRole.CANDIDATE,
          text: event.text,
          timestamp: event.timestamp,
        });

        // Trigger orchestrator stage & concept evaluation
        void this.orchestrator
          .processCandidateTurn(session, event.text)
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
      }

      onEvent(event);
    });

    this.activeRealtimeSessions.set(sessionId, realtimeSession);
    return realtimeSession;
  }

  /**
   * Forward client microphone PCM chunk to the AI real-time session.
   */
  async sendClientAudio(
    sessionId: string,
    chunk: Buffer | Uint8Array,
  ): Promise<void> {
    const bridge = this.activeRealtimeSessions.get(sessionId);
    if (bridge) {
      await bridge.sendAudio(chunk);
    }
  }

  /**
   * Forward client text (typing / chat) to the AI real-time session.
   */
  async sendClientText(sessionId: string, text: string): Promise<void> {
    const bridge = this.activeRealtimeSessions.get(sessionId);
    if (bridge) {
      // Record candidate turn immediately
      await this.appendTranscriptTurn(sessionId, {
        id: `turn-cnd-${Date.now()}`,
        role: MessageRole.CANDIDATE,
        text,
        timestamp: Date.now(),
      });

      // Advance orchestrator for text turn
      const session = await this.getSession(sessionId);
      const orchResult = await this.orchestrator.processCandidateTurn(
        session,
        text,
      );
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

      await bridge.sendText(text);
    }
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
   * Close and cleanup the active real-time bridge.
   */
  async closeRealtimeBridge(sessionId: string): Promise<void> {
    const bridge = this.activeRealtimeSessions.get(sessionId);
    if (bridge) {
      await bridge.close();
      this.activeRealtimeSessions.delete(sessionId);
      this.sessionEventCallbacks.delete(sessionId);
      this.logger.log(`Closed realtime bridge for session ${sessionId}`);
    }
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
    };
  }
}
