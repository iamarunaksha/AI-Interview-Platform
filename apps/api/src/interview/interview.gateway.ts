import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InterviewService } from './interview.service.js';
import { AuthService } from '../auth/auth.service.js';
import type {
  ConversationEvent,
  ProgrammingLanguage,
  VideoLayoutMode,
  UserProfile,
} from '@interviewai/shared-types';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/interview',
})
export class InterviewGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InterviewGateway.name);
  private readonly socketSessionMap = new Map<string, string>();

  constructor(
    private readonly interviewService: InterviewService,
    @Optional() private readonly authService?: AuthService,
  ) {}

  afterInit() {
    this.logger.log('🚀 Interview WebSocket Gateway initialized on /interview');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (token && this.authService) {
        const user = await this.authService.verifyAccessToken(token);
        client.data.user = user;
        this.logger.log(
          `Client ${client.id} authenticated as ${user.email} (${user.id})`,
        );
      }
    } catch (err) {
      this.logger.debug(
        `Client ${client.id} connected without valid auth token: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const sessionId = this.socketSessionMap.get(client.id);
    if (sessionId) {
      this.socketSessionMap.delete(client.id);
      // Clean up realtime bridge only if no remaining sockets are connected to this session
      const remainingSockets = Array.from(
        this.socketSessionMap.values(),
      ).includes(sessionId);
      if (!remainingSockets) {
        await this.interviewService
          .closeRealtimeBridge(sessionId)
          .catch((err) => {
            this.logger.warn(
              `Error closing realtime bridge on disconnect for session ${sessionId}: ${err}`,
            );
          });
      }
    }
  }

  /**
   * Client joins an active interview session room.
   */
  @SubscribeMessage('session.join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; token?: string },
  ) {
    const { sessionId, token } = data;
    if (!sessionId) {
      client.emit('session.error', {
        type: 'session.error',
        code: 'MISSING_SESSION_ID',
        message: 'sessionId is required to join',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      // 1. Authenticate user if not already set on client
      let user: UserProfile | undefined = client.data?.user;
      if (!user && this.authService) {
        const candidateToken =
          token ||
          (client.handshake.auth?.token as string | undefined) ||
          client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
        if (candidateToken) {
          try {
            user = await this.authService.verifyAccessToken(candidateToken);
            client.data.user = user;
          } catch {
            // Token invalid or expired
          }
        }
      }

      // 2. Validate session existence & access control
      const session = await this.interviewService.getSession(sessionId);
      if (!session) {
        client.emit('session.error', {
          type: 'session.error',
          code: 'SESSION_NOT_FOUND',
          message: `Interview session ${sessionId} not found`,
          timestamp: Date.now(),
        });
        return;
      }

      // If user is authenticated and session belongs to a candidate, verify ownership
      if (user && session.candidateId && session.candidateId !== user.id) {
        this.logger.warn(
          `Unauthorized join attempt: User ${user.id} tried to join session ${sessionId} owned by ${session.candidateId}`,
        );
        client.emit('session.error', {
          type: 'session.error',
          code: 'UNAUTHORIZED_SESSION_ACCESS',
          message: 'You are not authorized to join this interview session',
          timestamp: Date.now(),
        });
        return;
      }

      await client.join(sessionId);
      this.socketSessionMap.set(client.id, sessionId);
      this.logger.log(
        `Client ${client.id} joined room for session ${sessionId} (User: ${user?.email ?? 'anonymous'})`,
      );

      // Ensure session is marked in progress
      await this.interviewService.startSession(sessionId).catch(() => {
        // If already started or completed, keep going
      });

      // Bind realtime bridge for this session
      await this.interviewService.createRealtimeBridge(
        sessionId,
        (event: ConversationEvent) => {
          // Emit specifically typed event as well as generic conversation.event
          client.emit(event.type, event);
          client.emit('conversation.event', event);
        },
      );
    } catch (err) {
      this.logger.error(`Error joining session ${sessionId}:`, err);
      client.emit('session.error', {
        type: 'session.error',
        code: 'JOIN_FAILED',
        message: err instanceof Error ? err.message : 'Failed to join session',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle incoming streaming audio chunks from candidate microphone.
   */
  @SubscribeMessage('audio.chunk')
  async handleAudioChunk(
    @ConnectedSocket() client: Socket,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @MessageBody() payload: any,
  ) {
    let sessionId = this.socketSessionMap.get(client.id);
    let chunkData: Buffer | Uint8Array;

    if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
      chunkData = payload;
    } else if (payload && payload.chunk) {
      sessionId = payload.sessionId || sessionId;
      if (typeof payload.chunk === 'string') {
        chunkData = Buffer.from(payload.chunk, 'base64');
      } else {
        chunkData = Buffer.from(payload.chunk);
      }
    } else {
      return;
    }

    if (!sessionId) return;

    await this.interviewService.sendClientAudio(sessionId, chunkData);
  }

  /**
   * Handle candidate text message input.
   */
  @SubscribeMessage('message.send')
  async handleTextMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId?: string; text: string },
  ) {
    const sessionId = data.sessionId || this.socketSessionMap.get(client.id);
    if (!sessionId || !data.text) return;

    this.logger.debug(
      `Received text message in session ${sessionId}: "${data.text}"`,
    );
    await this.interviewService.sendClientText(sessionId, data.text);
  }

  /**
   * Handle candidate interruption signal.
   */
  @SubscribeMessage('interview.interrupt')
  async handleInterrupt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { sessionId?: string },
  ) {
    const sessionId = data?.sessionId || this.socketSessionMap.get(client.id);
    if (!sessionId) return;

    await this.interviewService.interruptAssistant(sessionId);
    client.emit('assistant.interrupted', {
      type: 'assistant.interrupted',
      timestamp: Date.now(),
    });
  }

  /**
   * Pause the interview.
   */
  @SubscribeMessage('interview.pause')
  async handlePause(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { sessionId?: string },
  ) {
    const sessionId = data?.sessionId || this.socketSessionMap.get(client.id);
    if (!sessionId) return;

    const updated = await this.interviewService.pauseSession(sessionId);
    client.emit('interview.status', {
      type: 'interview.status',
      status: updated.status,
      timestamp: Date.now(),
    });
  }

  /**
   * Explicitly end the interview session.
   */
  @SubscribeMessage('interview.end')
  async handleEndInterview(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { sessionId?: string; reason?: string },
  ) {
    const sessionId = data?.sessionId || this.socketSessionMap.get(client.id);
    if (!sessionId) return;

    const updated = await this.interviewService.endSession(sessionId);
    const endEvent: ConversationEvent = {
      type: 'session.ended',
      reason: data?.reason || 'candidate_ended',
      timestamp: Date.now(),
    };
    client.emit('session.ended', endEvent);
    client.emit('conversation.event', endEvent);
    client.emit('interview.status', {
      type: 'interview.status',
      status: updated.status,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle candidate code editor content updates.
   */
  @SubscribeMessage('code.change')
  handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId?: string; code: string; language: string },
  ) {
    const sessionId = data.sessionId || this.socketSessionMap.get(client.id);
    if (!sessionId || data.code === undefined) return;

    this.interviewService.updateSessionCode(
      sessionId,
      data.code,
      data.language || 'typescript',
    );
  }

  /**
   * Handle candidate code execution request in the sandbox.
   */
  @SubscribeMessage('code.run')
  async handleCodeRun(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId?: string;
      code: string;
      language: ProgrammingLanguage;
      problemId?: string;
    },
  ) {
    const sessionId = data.sessionId || this.socketSessionMap.get(client.id);
    if (!sessionId || !data.code) return;

    client.emit('code.status', {
      status: 'running',
      message: 'Running code in sandbox against test suites...',
      timestamp: Date.now(),
    });

    try {
      const result = await this.interviewService.executeSessionCode(sessionId, {
        code: data.code,
        language: data.language,
        problemId: data.problemId,
      });

      client.emit('code.result', result);
    } catch (err) {
      client.emit('code.status', {
        status: 'error',
        message:
          err instanceof Error ? err.message : 'Execution failed in sandbox',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle candidate video camera toggle and layout adjustments.
   */
  @SubscribeMessage('video.toggle')
  handleVideoToggle(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sessionId?: string;
      isCameraActive: boolean;
      layoutMode?: VideoLayoutMode;
    },
  ) {
    const sessionId = data?.sessionId || this.socketSessionMap.get(client.id);
    if (!sessionId) return;

    this.interviewService.updateSessionVideoState(
      sessionId,
      data.isCameraActive,
      data.layoutMode,
    );

    const event: ConversationEvent = {
      type: 'video.state',
      isCameraActive: data.isCameraActive,
      layoutMode: data.layoutMode,
      timestamp: Date.now(),
    };
    client.emit('video.state', event);
    client.emit('conversation.event', event);
  }
}
