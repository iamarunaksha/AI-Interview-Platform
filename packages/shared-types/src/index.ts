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
