import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competency } from './entities/competency.entity.js';
import { Question } from './entities/question.entity.js';
import { QueryQuestionsDto } from './dto/query-questions.dto.js';
import { PlanInterviewDto } from './dto/plan-interview.dto.js';
import {
  INITIAL_COMPETENCIES,
  INITIAL_QUESTIONS,
} from './seeds/question-bank.seed.js';
import {
  ProfessionalDomain,
  InterviewDifficulty,
  type CompetencyResponse,
  type QuestionResponse,
  type InterviewPlanResponse,
} from '@interviewai/shared-types';

@Injectable()
export class TracksService implements OnModuleInit {
  constructor(
    @InjectRepository(Competency)
    private readonly competencyRepo: Repository<Competency>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  /**
   * Automatically seed initial question bank on startup if empty.
   */
  async onModuleInit() {
    await this.ensureSeeded();
  }

  async ensureSeeded(): Promise<void> {
    const competencyCount = await this.competencyRepo.count();
    if (competencyCount === 0) {
      console.log(
        '🌱 Seeding initial technical competencies and question bank...',
      );

      const competencyMap = new Map<string, Competency>();

      for (const compData of INITIAL_COMPETENCIES) {
        let competency = await this.competencyRepo.findOne({
          where: { slug: compData.slug },
        });
        if (!competency) {
          competency = this.competencyRepo.create(compData);
          competency = await this.competencyRepo.save(competency);
        }
        competencyMap.set(compData.slug, competency);
      }

      for (const qData of INITIAL_QUESTIONS) {
        const competency = competencyMap.get(qData.competencySlug);
        if (competency) {
          const existing = await this.questionRepo.findOne({
            where: { title: qData.title },
          });
          if (!existing) {
            const question = this.questionRepo.create({
              competencyId: competency.id,
              domain: qData.domain,
              companyCategories: qData.companyCategories,
              experienceLevels: qData.experienceLevels,
              difficulty: qData.difficulty,
              title: qData.title,
              stem: qData.stem,
              contextPrompt: qData.contextPrompt,
              expectedConcepts: qData.expectedConcepts,
              commonMisconceptions: qData.commonMisconceptions,
              probingQuestions: qData.probingQuestions,
              rubricGuide: qData.rubricGuide,
              isActive: true,
            });
            await this.questionRepo.save(question);
          }
        }
      }

      console.log('✅ Technical question bank seeding completed successfully.');
    }
  }

  /**
   * Retrieve active competencies, optionally filtered by domain.
   */
  async getCompetencies(
    domain?: ProfessionalDomain,
  ): Promise<CompetencyResponse[]> {
    const where = domain ? { domain, isActive: true } : { isActive: true };
    const competencies = await this.competencyRepo.find({
      where,
      order: { name: 'ASC' },
    });
    return competencies.map((c) => this.toCompetencyResponse(c));
  }

  /**
   * Query questions matching domain, category, level, or difficulty filters.
   */
  async getQuestions(query: QueryQuestionsDto): Promise<QuestionResponse[]> {
    const queryBuilder = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.competency', 'c')
      .where('q.isActive = :isActive', { isActive: true });

    if (query.domain) {
      queryBuilder.andWhere('q.domain = :domain', { domain: query.domain });
    }

    if (query.difficulty) {
      queryBuilder.andWhere('q.difficulty = :difficulty', {
        difficulty: query.difficulty,
      });
    }

    if (query.competencySlug) {
      queryBuilder.andWhere('c.slug = :slug', { slug: query.competencySlug });
    }

    const questions = await queryBuilder.getMany();

    // In-memory filter for JSON arrays (companyCategories, experienceLevels)
    let filtered = questions;
    if (query.companyCategory) {
      filtered = filtered.filter((q) =>
        q.companyCategories.includes(query.companyCategory!),
      );
    }
    if (query.experienceLevel) {
      filtered = filtered.filter((q) =>
        q.experienceLevels.includes(query.experienceLevel!),
      );
    }

    return filtered.map((q) => this.toQuestionResponse(q));
  }

  /**
   * Retrieve a single question by ID.
   */
  async getQuestionById(id: string): Promise<QuestionResponse> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: { competency: true },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return this.toQuestionResponse(question);
  }

  /**
   * Adaptive Interview Planner:
   * Dynamically constructs the question trajectory and competency matrix
   * based on the candidate's track, target role, experience, and duration.
   */
  async planInterview(dto: PlanInterviewDto): Promise<InterviewPlanResponse> {
    const duration = dto.durationMinutes ?? 45;
    const targetDifficulty = dto.difficulty ?? InterviewDifficulty.MEDIUM;

    // Estimate question count based on duration:
    // 15m: 1-2 questions | 30m: 2-3 questions | 45m: 3-4 questions | 60m: 4-5 questions
    const questionCount = Math.max(1, Math.min(5, Math.round(duration / 15)));

    // Fetch relevant competencies for domain
    const competencies = await this.getCompetencies(dto.domain);

    // Fetch matching questions for this track
    const allQuestions = await this.getQuestions({
      domain: dto.domain,
      companyCategory: dto.companyCategory,
      experienceLevel: dto.experienceLevel,
    });

    // Sort questions: prioritize target difficulty first, then adjacent difficulties
    const sortedQuestions = [...allQuestions].sort((a, b) => {
      if (
        a.difficulty === targetDifficulty &&
        b.difficulty !== targetDifficulty
      )
        return -1;
      if (
        b.difficulty === targetDifficulty &&
        a.difficulty !== targetDifficulty
      )
        return 1;
      return 0;
    });

    // Pick diverse questions across distinct competencies
    const selectedQuestions: QuestionResponse[] = [];
    const usedCompetencies = new Set<string>();

    for (const q of sortedQuestions) {
      if (selectedQuestions.length >= questionCount) break;
      if (!usedCompetencies.has(q.competencyId)) {
        selectedQuestions.push(q);
        usedCompetencies.add(q.competencyId);
      }
    }

    // If we still need more questions, fill in remaining available questions
    if (selectedQuestions.length < questionCount) {
      for (const q of sortedQuestions) {
        if (selectedQuestions.length >= questionCount) break;
        if (!selectedQuestions.some((sq) => sq.id === q.id)) {
          selectedQuestions.push(q);
        }
      }
    }

    return {
      sessionTrack: {
        domain: dto.domain,
        companyCategory: dto.companyCategory,
        targetRole: dto.targetRole,
        experienceLevel: dto.experienceLevel,
        difficulty: targetDifficulty,
        durationMinutes: duration,
      },
      competencies,
      questions: selectedQuestions,
      estimatedQuestionsCount: selectedQuestions.length,
    };
  }

  private toCompetencyResponse(entity: Competency): CompetencyResponse {
    return {
      id: entity.id,
      domain: entity.domain,
      name: entity.name,
      slug: entity.slug,
      category: entity.category,
      description: entity.description,
      isActive: entity.isActive,
    };
  }

  private toQuestionResponse(entity: Question): QuestionResponse {
    return {
      id: entity.id,
      competencyId: entity.competencyId,
      competency: entity.competency
        ? this.toCompetencyResponse(entity.competency)
        : undefined,
      domain: entity.domain,
      companyCategories: entity.companyCategories,
      experienceLevels: entity.experienceLevels,
      difficulty: entity.difficulty,
      title: entity.title,
      stem: entity.stem,
      contextPrompt: entity.contextPrompt,
      expectedConcepts: entity.expectedConcepts,
      commonMisconceptions: entity.commonMisconceptions,
      probingQuestions: entity.probingQuestions,
      rubricGuide: entity.rubricGuide,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
