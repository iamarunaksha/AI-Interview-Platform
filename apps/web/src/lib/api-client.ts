import {
  type SystemHealthResponse,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  type UserProfile,
  type CandidateProfileResponse,
  type UpdateCandidateProfileRequest,
  type CompetencyResponse,
  type QuestionResponse,
  type InterviewPlanResponse,
  type ProfessionalDomain,
  type CompanyCategory,
  type ExperienceLevel,
  type InterviewDifficulty,
  type AiSystemStatusResponse,
  type TestGenerateRequest,
  type TestGenerateResponse,
  type CreateInterviewSessionRequest,
  type InterviewSessionResponse,
  type TranscriptTurn,
  type OrchestratorState,
  type EvidenceRecord,
  type InterviewReport,
  type ComprehensiveInterviewReport,
  type CandidateDashboardMetrics,
  type CodingProblem,
  type CodeExecutionResult,
  type CodeRunRequest,
} from "@interviewai/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const ACCESS_TOKEN_KEY = "interviewai_access_token";
const REFRESH_TOKEN_KEY = "interviewai_refresh_token";

// In-flight refresh promise singleton to prevent 401 refresh stampedes
let activeRefreshPromise: Promise<string | null> | null = null;

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredTokens(
  accessToken: string,
  refreshToken: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessTokenDeduped(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) {
        clearStoredTokens();
        return null;
      }

      const data = (await refreshRes.json()) as { accessToken: string };
      if (data?.accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      clearStoredTokens();
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredAccessToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Enterprise token refresh: on 401 unauthorized, await deduplicated refresh promise
  if (res.status === 401 && !endpoint.includes("/auth/")) {
    const newToken = await refreshAccessTokenDeduped();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!res.ok) {
    let errorDetails: string = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (Array.isArray(errJson.message)) {
        errorDetails = errJson.message.join(", ");
      } else if (errJson.message) {
        errorDetails = errJson.message;
      }
    } catch {
      // JSON parse failed, keep default message
    }
    throw new Error(errorDetails);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: async (): Promise<SystemHealthResponse | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      return (await res.json()) as SystemHealthResponse;
    } catch {
      return null;
    }
  },

  auth: {
    register: async (dto: RegisterRequest): Promise<AuthResponse> => {
      const data = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      setStoredTokens(data.accessToken, data.refreshToken);
      return data;
    },

    login: async (dto: LoginRequest): Promise<AuthResponse> => {
      const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      setStoredTokens(data.accessToken, data.refreshToken);
      return data;
    },

    me: async (): Promise<UserProfile> => {
      return apiFetch<UserProfile>("/api/auth/me");
    },

    logout: () => {
      clearStoredTokens();
    },
  },

  candidates: {
    getProfile: async (): Promise<CandidateProfileResponse> => {
      return apiFetch<CandidateProfileResponse>("/api/candidates/profile");
    },

    updateProfile: async (
      dto: UpdateCandidateProfileRequest,
    ): Promise<CandidateProfileResponse> => {
      return apiFetch<CandidateProfileResponse>("/api/candidates/profile", {
        method: "PUT",
        body: JSON.stringify(dto),
      });
    },
  },

  tracks: {
    getCompetencies: async (
      domain?: ProfessionalDomain,
    ): Promise<CompetencyResponse[]> => {
      const qs = domain ? `?domain=${domain}` : "";
      return apiFetch<CompetencyResponse[]>(`/api/tracks/competencies${qs}`);
    },

    getQuestions: async (params?: {
      domain?: ProfessionalDomain;
      companyCategory?: CompanyCategory;
      difficulty?: InterviewDifficulty;
      experienceLevel?: ExperienceLevel;
    }): Promise<QuestionResponse[]> => {
      const searchParams = new URLSearchParams();
      if (params?.domain) searchParams.set("domain", params.domain);
      if (params?.companyCategory)
        searchParams.set("companyCategory", params.companyCategory);
      if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
      if (params?.experienceLevel)
        searchParams.set("experienceLevel", params.experienceLevel);
      const query = searchParams.toString()
        ? `?${searchParams.toString()}`
        : "";
      return apiFetch<QuestionResponse[]>(`/api/tracks/questions${query}`);
    },

    getQuestion: async (id: string): Promise<QuestionResponse> => {
      return apiFetch<QuestionResponse>(`/api/tracks/questions/${id}`);
    },

    planInterview: async (dto: {
      domain: ProfessionalDomain;
      companyCategory: CompanyCategory;
      targetRole: string;
      experienceLevel: ExperienceLevel;
      difficulty?: InterviewDifficulty;
      durationMinutes?: number;
    }): Promise<InterviewPlanResponse> => {
      return apiFetch<InterviewPlanResponse>("/api/tracks/plan-interview", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },
  },

  ai: {
    getStatus: async (): Promise<AiSystemStatusResponse> => {
      return apiFetch<AiSystemStatusResponse>("/api/ai/providers");
    },
    testGenerate: async (
      dto: TestGenerateRequest,
    ): Promise<TestGenerateResponse> => {
      return apiFetch<TestGenerateResponse>("/api/ai/test-generate", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },
  },

  interviews: {
    create: async (
      dto: CreateInterviewSessionRequest,
    ): Promise<InterviewSessionResponse> => {
      return apiFetch<InterviewSessionResponse>("/api/interviews", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    list: async (): Promise<InterviewSessionResponse[]> => {
      return apiFetch<InterviewSessionResponse[]>("/api/interviews");
    },

    get: async (id: string): Promise<InterviewSessionResponse> => {
      return apiFetch<InterviewSessionResponse>(`/api/interviews/${id}`);
    },

    start: async (id: string): Promise<InterviewSessionResponse> => {
      return apiFetch<InterviewSessionResponse>(`/api/interviews/${id}/start`, {
        method: "POST",
      });
    },

    end: async (id: string): Promise<InterviewSessionResponse> => {
      return apiFetch<InterviewSessionResponse>(`/api/interviews/${id}/end`, {
        method: "POST",
      });
    },

    getTranscript: async (id: string): Promise<TranscriptTurn[]> => {
      return apiFetch<TranscriptTurn[]>(`/api/interviews/${id}/transcript`);
    },

    getOrchestratorState: async (
      id: string,
    ): Promise<OrchestratorState | null> => {
      return apiFetch<OrchestratorState | null>(
        `/api/interviews/${id}/orchestrator`,
      );
    },

    getEvidence: async (id: string): Promise<EvidenceRecord[]> => {
      return apiFetch<EvidenceRecord[]>(`/api/interviews/${id}/evidence`);
    },

    extractEvidence: async (
      id: string,
      dto: {
        questionAsked: string;
        candidateAnswer: string;
        competencyId?: string;
      },
    ): Promise<EvidenceRecord> => {
      return apiFetch<EvidenceRecord>(
        `/api/interviews/${id}/evidence/extract`,
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
      );
    },

    batchExtractEvidence: async (id: string): Promise<EvidenceRecord[]> => {
      return apiFetch<EvidenceRecord[]>(
        `/api/interviews/${id}/evidence/batch-extract`,
        {
          method: "POST",
        },
      );
    },

    getEvaluation: async (id: string): Promise<InterviewReport | null> => {
      try {
        return await apiFetch<InterviewReport>(
          `/api/interviews/${id}/evaluation`,
        );
      } catch {
        return null;
      }
    },

    runEvaluation: async (
      id: string,
      provider?: string,
    ): Promise<InterviewReport> => {
      const url = provider
        ? `/api/interviews/${id}/evaluation?provider=${encodeURIComponent(provider)}`
        : `/api/interviews/${id}/evaluation`;
      return apiFetch<InterviewReport>(url, {
        method: "POST",
      });
    },

    getReport: async (
      id: string,
    ): Promise<ComprehensiveInterviewReport | null> => {
      try {
        return await apiFetch<ComprehensiveInterviewReport>(
          `/api/interviews/${id}/report`,
        );
      } catch {
        return null;
      }
    },

    generateReport: async (
      id: string,
    ): Promise<ComprehensiveInterviewReport> => {
      return apiFetch<ComprehensiveInterviewReport>(
        `/api/interviews/${id}/report`,
        {
          method: "POST",
        },
      );
    },
  },

  reports: {
    getReport: async (
      sessionId: string,
    ): Promise<ComprehensiveInterviewReport | null> => {
      try {
        return await apiFetch<ComprehensiveInterviewReport>(
          `/api/interviews/${sessionId}/report`,
        );
      } catch {
        return null;
      }
    },

    generateReport: async (
      sessionId: string,
    ): Promise<ComprehensiveInterviewReport> => {
      return apiFetch<ComprehensiveInterviewReport>(
        `/api/interviews/${sessionId}/report`,
        {
          method: "POST",
        },
      );
    },

    getDashboardMetrics: async (): Promise<CandidateDashboardMetrics> => {
      return apiFetch<CandidateDashboardMetrics>("/api/reports/dashboard");
    },
  },

  coding: {
    listProblems: async (): Promise<CodingProblem[]> => {
      return apiFetch<CodingProblem[]>("/api/coding/problems");
    },

    getProblem: async (problemId: string): Promise<CodingProblem> => {
      return apiFetch<CodingProblem>(`/api/coding/problems/${problemId}`);
    },

    execute: async (
      request: CodeRunRequest,
      problemId?: string,
    ): Promise<CodeExecutionResult> => {
      const qs = problemId ? `?problemId=${encodeURIComponent(problemId)}` : "";
      return apiFetch<CodeExecutionResult>(`/api/coding/execute${qs}`, {
        method: "POST",
        body: JSON.stringify(request),
      });
    },
  },
};

/** Backwards-compatible export for existing components */
export const getSystemHealth = api.health;
