import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewGateway } from './interview.gateway.js';
import type { InterviewService } from './interview.service.js';
import type { Socket } from 'socket.io';
import { InterviewStatus } from '@interviewai/shared-types';

describe('InterviewGateway', () => {
  let gateway: InterviewGateway;
  let mockInterviewService: Partial<InterviewService>;
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-client-1',
      join: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
    };

    mockInterviewService = {
      startSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        status: InterviewStatus.IN_PROGRESS,
      } as any),
      createRealtimeBridge: vi
        .fn()
        .mockImplementation((_sessionId, onEvent) => {
          onEvent({
            type: 'assistant.transcript.delta',
            text: 'Hello candidate!',
            timestamp: Date.now(),
          });
          return Promise.resolve({} as any);
        }),
      sendClientAudio: vi.fn().mockResolvedValue(undefined),
      sendClientText: vi.fn().mockResolvedValue(undefined),
      interruptAssistant: vi.fn().mockResolvedValue(undefined),
      pauseSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        status: InterviewStatus.PAUSED,
      } as any),
      endSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        status: InterviewStatus.COMPLETED,
      } as any),
    };

    gateway = new InterviewGateway(mockInterviewService as InterviewService);
  });

  it('should join an interview room and emit session.ready', async () => {
    await gateway.handleJoinSession(mockSocket as Socket, {
      sessionId: 'session-123',
    });

    expect(mockSocket.join).toHaveBeenCalledWith('session-123');
    expect(mockInterviewService.startSession).toHaveBeenCalledWith(
      'session-123',
    );
    expect(mockInterviewService.createRealtimeBridge).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'session.ready',
      expect.objectContaining({ type: 'session.ready' }),
    );
  });

  it('should forward audio chunks to interview service', async () => {
    // Join first to set map
    await gateway.handleJoinSession(mockSocket as Socket, {
      sessionId: 'session-123',
    });

    const chunk = Buffer.from([1, 2, 3, 4]);
    await gateway.handleAudioChunk(mockSocket as Socket, chunk);

    expect(mockInterviewService.sendClientAudio).toHaveBeenCalledWith(
      'session-123',
      chunk,
    );
  });

  it('should forward text messages to interview service', async () => {
    await gateway.handleJoinSession(mockSocket as Socket, {
      sessionId: 'session-123',
    });

    await gateway.handleTextMessage(mockSocket as Socket, {
      sessionId: 'session-123',
      text: 'Hello AI interviewer',
    });

    expect(mockInterviewService.sendClientText).toHaveBeenCalledWith(
      'session-123',
      'Hello AI interviewer',
    );
  });

  it('should handle interrupt and pause signals', async () => {
    await gateway.handleJoinSession(mockSocket as Socket, {
      sessionId: 'session-123',
    });

    await gateway.handleInterrupt(mockSocket as Socket, {
      sessionId: 'session-123',
    });
    expect(mockInterviewService.interruptAssistant).toHaveBeenCalledWith(
      'session-123',
    );

    await gateway.handlePause(mockSocket as Socket, {
      sessionId: 'session-123',
    });
    expect(mockInterviewService.pauseSession).toHaveBeenCalledWith(
      'session-123',
    );
  });

  it('should handle ending interview and emit session.ended', async () => {
    await gateway.handleJoinSession(mockSocket as Socket, {
      sessionId: 'session-123',
    });

    await gateway.handleEndInterview(mockSocket as Socket, {
      sessionId: 'session-123',
    });

    expect(mockInterviewService.endSession).toHaveBeenCalledWith('session-123');
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'session.ended',
      expect.objectContaining({ type: 'session.ended' }),
    );
  });
});
