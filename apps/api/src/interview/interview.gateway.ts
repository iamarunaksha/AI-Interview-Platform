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
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InterviewService } from './interview.service.js';
import type { ConversationEvent } from '@interviewai/shared-types';

@WebSocketGateway({
  cors: {
    origin: '*',
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

  constructor(private readonly interviewService: InterviewService) {}

  afterInit() {
    this.logger.log('🚀 Interview WebSocket Gateway initialized on /interview');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const sessionId = this.socketSessionMap.get(client.id);
    if (sessionId) {
      this.socketSessionMap.delete(client.id);
    }
  }

  /**
   * Client joins an active interview session room.
   */
  @SubscribeMessage('session.join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const { sessionId } = data;
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
      await client.join(sessionId);
      this.socketSessionMap.set(client.id, sessionId);
      this.logger.log(
        `Client ${client.id} joined room for session ${sessionId}`,
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
}
