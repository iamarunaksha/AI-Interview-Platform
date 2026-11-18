// ============================================================
// Shared Types for AI Interview Platform
// ============================================================
// These types are shared between the frontend (Next.js) and
// backend (NestJS). When you change a type here, TypeScript
// will flag any mismatches in both apps at compile time.
// ============================================================

// ---- Enums ----
// Using string enums so values are readable in JSON, logs, and DB.

/** User account status */
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

/** Professional domain the candidate is preparing for */
export enum ProfessionalDomain {
  SDE = "sde",
  SAP = "sap",
}

/** Company category within a domain */
export enum CompanyCategory {
  FAANG_STYLE = "faang_style",
  PRODUCT_COMPANY = "product_company",
  SERVICE_COMPANY = "service_company",
  SAP_PRODUCT = "sap_product",
  SAP_CONSULTING = "sap_consulting",
  SAP_CUSTOMER = "sap_customer",
}

/** SDE experience levels */
export enum ExperienceLevel {
  FRESHER = "fresher",
  SDE_1 = "sde_1",
  SDE_2 = "sde_2",
  SENIOR = "senior",
  STAFF = "staff",
}

/** Interview difficulty */
export enum InterviewDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

/** Interview session status */
export enum InterviewStatus {
  CREATED = "created",
  IN_PROGRESS = "in_progress",
  PAUSED = "paused",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  ERROR = "error",
}

/** Interview mode determines behavior policies */
export enum InterviewMode {
  PRACTICE = "practice",
  ASSESSMENT = "assessment",
  LEARNING = "learning",
}

/** Interviewer communication style (not evaluation standards) */
export enum InterviewerPersonality {
  PROFESSIONAL = "professional",
  FRIENDLY = "friendly",
  STRICT = "strict",
}

/** Who sent a message in the interview */
export enum MessageRole {
  ASSISTANT = "assistant",
  CANDIDATE = "candidate",
  SYSTEM = "system",
}

/** Evaluation score on the 1-4 scale + not assessed */
export enum EvaluationRating {
  POOR = 1,
  DEVELOPING = 2,
  PROFICIENT = 3,
  STRONG = 4,
  NOT_ASSESSED = -1,
}

// ---- API Response Types ----

/**
 * Health check response returned by the backend /health endpoint.
 */
export interface SystemHealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  service: string;
  database: {
    status: "connected" | "disconnected";
    databaseName?: string;
    version?: string;
  };
  domains: ProfessionalDomain[];
  defaultUserStatus: UserStatus;
}

/**
 * Standard API error response.
 * Every error from our API follows this shape.
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Paginated list response using cursor-based pagination.
 *
 * Why cursor-based instead of offset-based?
 * - Offset pagination breaks when items are inserted/deleted between pages
 * - Cursor pagination is stable: "give me items after this ID"
 * - Better performance on large tables (no OFFSET scan)
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

// ---- Auth Types ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
}

// ---- Candidate Profile & Onboarding Types ----

export interface CandidateProfileResponse {
  id: string;
  userId: string;
  domain: ProfessionalDomain | null;
  companyCategory: CompanyCategory | null;
  targetRole: string | null;
  experienceLevel: ExperienceLevel | null;
  preferredDifficulty: InterviewDifficulty;
  preferredDurationMinutes: number;
  preferredPersonality: InterviewerPersonality;
  preferredMode: InterviewMode;
  resumeUrl: string | null;
  resumeFileName: string | null;
  isOnboarded: boolean;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCandidateProfileRequest {
  domain?: ProfessionalDomain;
  companyCategory?: CompanyCategory;
  targetRole?: string;
  experienceLevel?: ExperienceLevel;
  preferredDifficulty?: InterviewDifficulty;
  preferredDurationMinutes?: number;
  preferredPersonality?: InterviewerPersonality;
  preferredMode?: InterviewMode;
  preferences?: Record<string, unknown>;
}

// ---- Interview Configuration Types ----

export interface InterviewConfig {
  domainId: string;
  companyCategoryId: string;
  companyProfileId?: string;
  roleId: string;
  experienceLevelId: string;
  difficulty: InterviewDifficulty;
  durationMinutes: number;
  personality: InterviewerPersonality;
  mode: InterviewMode;
}

export interface InterviewSession {
  id: string;
  candidateId: string;
  config: InterviewConfig;
  status: InterviewStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface TranscriptTurn {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

export interface CreateInterviewSessionRequest {
  domain?: ProfessionalDomain;
  companyCategory?: CompanyCategory;
  targetRole?: string;
  experienceLevel?: ExperienceLevel;
  difficulty?: InterviewDifficulty;
  durationMinutes?: number;
  personality?: InterviewerPersonality;
  mode?: InterviewMode;
  questionId?: string;
}

export interface InterviewSessionResponse {
  id: string;
  candidateId: string;
  domain: ProfessionalDomain;
  companyCategory: CompanyCategory;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  difficulty: InterviewDifficulty;
  durationMinutes: number;
  personality: InterviewerPersonality;
  mode: InterviewMode;
  status: InterviewStatus;
  currentQuestion?: QuestionResponse | null;
  transcript: TranscriptTurn[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Conversation Event Types ----
// These are the canonical events that flow over WebSocket.
// Every AI provider adapter normalizes its events into these.

export type ConversationEvent =
  | { type: "session.ready"; timestamp: number }
  | { type: "candidate.speech.started"; timestamp: number }
  | { type: "candidate.speech.ended"; timestamp: number }
  | { type: "candidate.transcript.partial"; text: string; timestamp: number }
  | { type: "candidate.transcript.final"; text: string; timestamp: number }
  | { type: "assistant.response.started"; timestamp: number }
  | { type: "assistant.transcript.delta"; text: string; timestamp: number }
  | { type: "assistant.transcript.final"; text: string; timestamp: number }
  | { type: "assistant.audio.chunk"; audio: Uint8Array; timestamp: number }
  | { type: "assistant.audio.ended"; timestamp: number }
  | { type: "assistant.interrupted"; timestamp: number }
  | { type: "turn.completed"; timestamp: number }
  | { type: "interview.status"; status: InterviewStatus; timestamp: number }
  | { type: "session.error"; code: string; message: string; timestamp: number }
  | { type: "session.ended"; reason: string; timestamp: number };

// ---- Evidence Types ----

export interface EvidenceRecord {
  id: string;
  sessionId: string;
  competencyId: string;
  questionAsked: string;
  candidateAnswer: string;
  technicalClaims: string[];
  correctConcepts: string[];
  incorrectConcepts: string[];
  missingConcepts: string[];
  reasoningQuality: "poor" | "fair" | "good" | "excellent";
  practicalExperience: boolean;
  confidence: number;
  notes: string;
}

// ---- Evaluation Types ----

export interface CompetencyScore {
  competencyId: string;
  competencyName: string;
  score: number | null;
  rating: EvaluationRating;
  justification: string;
  sufficientEvidence: boolean;
}

export interface InterviewReport {
  id: string;
  sessionId: string;
  overallScore: number | null;
  overallRating: EvaluationRating;
  summary: string;
  competencyScores: CompetencyScore[];
  strengths: string[];
  weaknesses: string[];
  incorrectStatements: string[];
  areasNotAssessed: string[];
  recommendations: string[];
  suggestedNextDifficulty: InterviewDifficulty;
  generatedAt: string;
}

// ---- Competency & Question Bank Types ----

export interface CompetencyResponse {
  id: string;
  domain: ProfessionalDomain;
  name: string;
  slug: string;
  category: string;
  description: string;
  isActive: boolean;
}

export interface ProbingQuestion {
  id: string;
  probeText: string;
  targetConcept: string;
  triggerCondition:
    | "missing_concept"
    | "superficial_explanation"
    | "incorrect_claim"
    | "deep_dive";
}

export interface RubricLevelGuide {
  rating: EvaluationRating;
  description: string;
  keyIndicators: string[];
}

export interface QuestionResponse {
  id: string;
  competencyId: string;
  competency?: CompetencyResponse;
  domain: ProfessionalDomain;
  companyCategories: CompanyCategory[];
  experienceLevels: ExperienceLevel[];
  difficulty: InterviewDifficulty;
  title: string;
  stem: string;
  contextPrompt: string;
  expectedConcepts: string[];
  commonMisconceptions: string[];
  probingQuestions: ProbingQuestion[];
  rubricGuide: RubricLevelGuide[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPlanResponse {
  sessionTrack: {
    domain: ProfessionalDomain;
    companyCategory: CompanyCategory;
    targetRole: string;
    experienceLevel: ExperienceLevel;
    difficulty: InterviewDifficulty;
    durationMinutes: number;
  };
  competencies: CompetencyResponse[];
  questions: QuestionResponse[];
  estimatedQuestionsCount: number;
}

// ---- AI Provider Abstraction Contracts ----

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  responseMimeType?: "text/plain" | "application/json";
  stopSequences?: string[];
}

export interface LlmGenerateResult {
  text: string;
  finishReason?: string;
  modelName: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AiProviderInfo {
  name: string;
  role: "llm" | "realtime" | "stt" | "tts" | "evaluation";
  isConfigured: boolean;
  isAvailable: boolean;
  modelName: string;
  details?: string;
}

export interface AiSystemStatusResponse {
  activeProviders: {
    llm: string;
    realtime: string;
    stt: string;
    tts: string;
    evaluation: string;
  };
  providers: AiProviderInfo[];
}

export interface TestGenerateRequest {
  prompt: string;
  provider?: string;
  systemInstruction?: string;
}

export interface TestGenerateResponse {
  provider: string;
  model: string;
  output: string;
  latencyMs: number;
}
