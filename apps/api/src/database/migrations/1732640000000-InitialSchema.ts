import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1732640000000 implements MigrationInterface {
  name = 'InitialSchema1732640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "candidate_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "domain" character varying(50),
        "companyCategory" character varying(50),
        "targetRole" character varying(100),
        "experienceLevel" character varying(50),
        "preferredDifficulty" character varying(20) NOT NULL DEFAULT 'medium',
        "preferredDurationMinutes" integer NOT NULL DEFAULT 45,
        "preferredPersonality" character varying(30) NOT NULL DEFAULT 'professional',
        "preferredMode" character varying(30) NOT NULL DEFAULT 'practice',
        "resumeUrl" character varying(500),
        "resumeFileName" character varying(255),
        "resumeSummary" text,
        "isOnboarded" boolean NOT NULL DEFAULT false,
        "preferences" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_candidate_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_candidate_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_candidate_profiles_userId" ON "candidate_profiles" ("userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "competencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "domain" character varying(50) NOT NULL,
        "name" character varying(150) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "category" character varying(100) NOT NULL,
        "description" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competencies_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_competencies_slug" ON "competencies" ("slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "questions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "competencyId" uuid NOT NULL,
        "domain" character varying(50) NOT NULL,
        "companyCategories" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "experienceLevels" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "difficulty" character varying(20) NOT NULL DEFAULT 'medium',
        "title" character varying(255) NOT NULL,
        "stem" text NOT NULL,
        "contextPrompt" text,
        "expectedConcepts" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "commonMisconceptions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "probingQuestions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "rubricGuide" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_questions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_questions_competencyId" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_questions_competencyId" ON "questions" ("competencyId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_questions_domain" ON "questions" ("domain")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_questions_difficulty" ON "questions" ("difficulty")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "interview_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidateId" uuid NOT NULL,
        "domain" character varying(50) NOT NULL DEFAULT 'sde',
        "companyCategory" character varying(50) NOT NULL DEFAULT 'product_company',
        "targetRole" character varying(100) NOT NULL DEFAULT 'Software Development Engineer',
        "experienceLevel" character varying(50) NOT NULL DEFAULT 'sde_1',
        "difficulty" character varying(50) NOT NULL DEFAULT 'medium',
        "durationMinutes" integer NOT NULL DEFAULT 30,
        "personality" character varying(50) NOT NULL DEFAULT 'professional',
        "mode" character varying(50) NOT NULL DEFAULT 'practice',
        "status" character varying(50) NOT NULL DEFAULT 'created',
        "currentStage" character varying(50) NOT NULL DEFAULT 'greeting',
        "coveredConcepts" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "currentQuestionId" uuid,
        "transcript" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "startedAt" TIMESTAMPTZ,
        "endedAt" TIMESTAMPTZ,
        "resumeSummary" text,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interview_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_interview_sessions_candidateId" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_interview_sessions_currentQuestionId" FOREIGN KEY ("currentQuestionId") REFERENCES "questions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_interview_sessions_candidateId" ON "interview_sessions" ("candidateId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_interview_sessions_status" ON "interview_sessions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_interview_sessions_currentQuestionId" ON "interview_sessions" ("currentQuestionId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "evidence_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "competencyId" uuid,
        "turnId" character varying(100),
        "questionAsked" text NOT NULL,
        "candidateAnswer" text NOT NULL,
        "technicalClaims" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "correctConcepts" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "incorrectConcepts" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "missingConcepts" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "reasoningQuality" character varying(50) NOT NULL DEFAULT 'fair',
        "practicalExperience" boolean NOT NULL DEFAULT false,
        "confidence" double precision NOT NULL DEFAULT 0.85,
        "notes" text NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_evidence_records_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_evidence_records_sessionId" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_evidence_records_competencyId" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_evidence_records_sessionId" ON "evidence_records" ("sessionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_evidence_records_competencyId" ON "evidence_records" ("competencyId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "evaluations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "overallScore" double precision,
        "overallRating" integer NOT NULL DEFAULT 0,
        "summary" text NOT NULL,
        "strengths" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "weaknesses" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "incorrectStatements" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "areasNotAssessed" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "recommendations" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "suggestedNextDifficulty" character varying(50) NOT NULL DEFAULT 'medium',
        "evaluatorModel" character varying(100) NOT NULL DEFAULT 'gemini-2.0-flash',
        "evaluatorProvider" character varying(50) NOT NULL DEFAULT 'gemini',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_evaluations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_evaluations_sessionId" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_evaluations_sessionId" ON "evaluations" ("sessionId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "competency_scores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "evaluationId" uuid NOT NULL,
        "competencyId" uuid NOT NULL,
        "score" double precision,
        "rating" integer NOT NULL DEFAULT 0,
        "justification" text NOT NULL,
        "evidenceRefs" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "sufficientEvidence" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competency_scores_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_competency_scores_evaluationId" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_competency_scores_competencyId" FOREIGN KEY ("competencyId") REFERENCES "competencies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_competency_scores_evaluationId" ON "competency_scores" ("evaluationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_competency_scores_competencyId" ON "competency_scores" ("competencyId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "interview_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "evaluationId" uuid NOT NULL,
        "reportData" jsonb NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'generated',
        "generatedAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interview_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_interview_reports_sessionId" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_interview_reports_evaluationId" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_interview_reports_sessionId" ON "interview_reports" ("sessionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_interview_reports_evaluationId" ON "interview_reports" ("evaluationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "interview_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "competency_scores"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "evaluations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "evidence_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "interview_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "competencies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "candidate_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
