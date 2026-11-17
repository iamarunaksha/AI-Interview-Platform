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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      await Promise.resolve();
      setUser(null);
      setCandidateProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const userProfile = await api.auth.me();
      setUser(userProfile);

      try {
        const candidateData = await api.candidates.getProfile();
        setCandidateProfile(candidateData);
      } catch {
        // Candidate profile might not exist yet or failed to load
      }
    } catch {
      // Invalid/expired token
      clearStoredTokens();
      setUser(null);
      setCandidateProfile(null);
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
        }
        return;
      }

      try {
        const userProfile = await api.auth.me();
        if (!active) return;
        setUser(userProfile);

        try {
          const candidateData = await api.candidates.getProfile();
          if (active) setCandidateProfile(candidateData);
        } catch {
          // ignore
        }
      } catch {
        clearStoredTokens();
        if (active) {
          setUser(null);
          setCandidateProfile(null);
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
      const profile = await api.candidates.getProfile();
      setCandidateProfile(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: RegisterRequest) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(dto);
      setUser(res.user);
      const profile = await api.candidates.getProfile();
      setCandidateProfile(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
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
