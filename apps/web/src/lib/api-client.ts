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
} from "@interviewai/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const ACCESS_TOKEN_KEY = "interviewai_access_token";
const REFRESH_TOKEN_KEY = "interviewai_refresh_token";

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

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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
};

/** Backwards-compatible export for existing components */
export const getSystemHealth = api.health;
