import type {
  InterviewReport,
  ProfessionalDomain,
  ExperienceLevel,
} from '@interviewai/shared-types';

export interface EvaluationSessionInput {
  sessionId: string;
  domain: ProfessionalDomain;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  transcript: Array<{
    role: 'assistant' | 'candidate' | 'system';
    text: string;
    timestamp: number;
  }>;
  evidence: Array<{
    competencyId: string;
    questionAsked: string;
    candidateAnswer: string;
    technicalClaims?: string[];
  }>;
  competencies: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export interface IEvaluationProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  testConnection(): Promise<boolean>;

  evaluateSession(input: EvaluationSessionInput): Promise<InterviewReport>;
}
