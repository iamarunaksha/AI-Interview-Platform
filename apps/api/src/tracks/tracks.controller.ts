import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TracksService } from './tracks.service.js';
import { QueryQuestionsDto } from './dto/query-questions.dto.js';
import { PlanInterviewDto } from './dto/plan-interview.dto.js';
import {
  ProfessionalDomain,
  type CompetencyResponse,
  type QuestionResponse,
  type InterviewPlanResponse,
} from '@interviewai/shared-types';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  /**
   * List competencies, optionally filtered by domain (e.g. ?domain=sde).
   */
  @Get('competencies')
  async getCompetencies(
    @Query('domain') domain?: ProfessionalDomain,
  ): Promise<CompetencyResponse[]> {
    return this.tracksService.getCompetencies(domain);
  }

  /**
   * Search question bank by domain, category, level, difficulty, or competency.
   */
  @Get('questions')
  async getQuestions(
    @Query() query: QueryQuestionsDto,
  ): Promise<QuestionResponse[]> {
    return this.tracksService.getQuestions(query);
  }

  /**
   * Get single question detail with probing questions and rubric guide.
   */
  @Get('questions/:id')
  async getQuestionById(@Param('id') id: string): Promise<QuestionResponse> {
    return this.tracksService.getQuestionById(id);
  }

  /**
   * Plan an interview session trajectory and competency question matrix.
   */
  @Post('plan-interview')
  @HttpCode(HttpStatus.OK)
  async planInterview(
    @Body() dto: PlanInterviewDto,
  ): Promise<InterviewPlanResponse> {
    return this.tracksService.planInterview(dto);
  }
}
