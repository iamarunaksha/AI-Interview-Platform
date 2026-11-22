"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  api,
  getStoredAccessToken,
  clearStoredTokens,
} from "../lib/api-client";
import type {
  UserProfile,
  CandidateProfileResponse,
  LoginRequest,
  RegisterRequest,
  UpdateCandidateProfileRequest,
} from "@interviewai/shared-types";

interface AuthContextType {
  user: UserProfile | null;
  candidateProfile: CandidateProfileResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (dto: LoginRequest) => Promise<void>;
  register: (dto: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateCandidateProfile: (
    dto: UpdateCandidateProfileRequest,
  ) => Promise<CandidateProfileResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = "interviewai_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(USER_CACHE_KEY);
        if (cached) return JSON.parse(cached) as UserProfile;
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem(USER_CACHE_KEY);
    }
    return true;
  });

  const refreshProfile = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      await Promise.resolve();
      setUser(null);
      setCandidateProfile(null);
      setIsLoading(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(USER_CACHE_KEY);
      }
      return;
    }

    try {
      const userProfile = await api.auth.me();
      setUser(userProfile);
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userProfile));
      }

      try {
        const candidateData = await api.candidates.getProfile();
        setCandidateProfile(candidateData);
      } catch {
        // Candidate profile might not exist yet or failed to load
      }
    } catch (err) {
      // Only clear if explicitly 401 Unauthorized
      if (err instanceof Error && err.message.includes("401")) {
        clearStoredTokens();
        if (typeof window !== "undefined") {
          localStorage.removeItem(USER_CACHE_KEY);
        }
        setUser(null);
        setCandidateProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchInitialAuth = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        if (active) {
          setUser(null);
          setCandidateProfile(null);
          setIsLoading(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem(USER_CACHE_KEY);
          }
        }
        return;
      }

      try {
        const userProfile = await api.auth.me();
        if (!active) return;
        setUser(userProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userProfile));
        }

        try {
          const candidateData = await api.candidates.getProfile();
          if (active) setCandidateProfile(candidateData);
        } catch {
          // ignore
        }
      } catch (err) {
        // Only clear if explicitly 401 Unauthorized, never on transient network errors
        if (err instanceof Error && err.message.includes("401")) {
          clearStoredTokens();
          if (typeof window !== "undefined") {
            localStorage.removeItem(USER_CACHE_KEY);
          }
          if (active) {
            setUser(null);
            setCandidateProfile(null);
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchInitialAuth();

    return () => {
      active = false;
    };
  }, []);

  const login = async (dto: LoginRequest) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(dto);
      setUser(res.user);
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
      }
      try {
        const profile = await api.candidates.getProfile();
        setCandidateProfile(profile);
      } catch {
        // ignore
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: RegisterRequest) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(dto);
      setUser(res.user);
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
      }
      try {
        const profile = await api.candidates.getProfile();
        setCandidateProfile(profile);
      } catch {
        // ignore
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_CACHE_KEY);
    }
    setUser(null);
    setCandidateProfile(null);
  };

  const updateCandidateProfile = async (
    dto: UpdateCandidateProfileRequest,
  ): Promise<CandidateProfileResponse> => {
    const updated = await api.candidates.updateProfile(dto);
    setCandidateProfile(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        candidateProfile,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
        updateCandidateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
