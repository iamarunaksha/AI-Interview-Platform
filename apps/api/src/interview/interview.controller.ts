import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InterviewService } from './interview.service.js';
import { CreateInterviewSessionDto } from './dto/create-interview.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type {
  InterviewSessionResponse,
  TranscriptTurn,
  UserProfile,
} from '@interviewai/shared-types';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  /**
   * Create a new interview session.
   */
  @Post()
  async createSession(
    @Req() req: { user: UserProfile },
    @Body() dto: CreateInterviewSessionDto,
  ): Promise<InterviewSessionResponse> {
    return this.interviewService.createSession(req.user.id, dto);
  }

  /**
   * List the current candidate's interview sessions.
   */
  @Get()
  async listSessions(
    @Req() req: { user: UserProfile },
  ): Promise<InterviewSessionResponse[]> {
    return this.interviewService.listSessions(req.user.id);
  }

  /**
   * Get details of a specific interview session.
   */
  @Get(':id')
  async getSession(@Param('id') id: string): Promise<InterviewSessionResponse> {
    const session = await this.interviewService.getSession(id);
    return this.interviewService.mapToResponse(session);
  }

  /**
   * Start or resume an interview session.
   */
  @Post(':id/start')
  async startSession(
    @Param('id') id: string,
  ): Promise<InterviewSessionResponse> {
    return this.interviewService.startSession(id);
  }

  /**
   * Complete an interview session.
   */
  @Post(':id/end')
  async endSession(@Param('id') id: string): Promise<InterviewSessionResponse> {
    return this.interviewService.endSession(id);
  }

  /**
   * Get the recorded transcript for an interview session.
   */
  @Get(':id/transcript')
  async getTranscript(@Param('id') id: string): Promise<TranscriptTurn[]> {
    const session = await this.interviewService.getSession(id);
    return session.transcript || [];
  }
}
