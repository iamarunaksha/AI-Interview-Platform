"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewMode,
  InterviewerPersonality,
  SAP_TRACK_ROLES,
  type QuestionResponse,
} from "@interviewai/shared-types";

export default function NewInterviewPage() {
  const router = useRouter();

  const [domain, setDomain] = useState<ProfessionalDomain>(
    ProfessionalDomain.SDE,
  );
  const [companyCategory, setCompanyCategory] = useState<CompanyCategory>(
    CompanyCategory.PRODUCT_COMPANY,
  );
  const [targetRole, setTargetRole] = useState("Software Development Engineer");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    ExperienceLevel.SDE_1,
  );
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>(
    InterviewDifficulty.MEDIUM,
  );
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [personality, setPersonality] = useState<InterviewerPersonality>(
    InterviewerPersonality.PROFESSIONAL,
  );
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.PRACTICE);
  const [resumeSummary, setResumeSummary] = useState("");

  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available questions matching current selections
  useEffect(() => {
    let active = true;

    api.tracks
      .getQuestions({ domain, difficulty, experienceLevel })
      .then((data) => {
        if (active) {
          // Prioritize DSA questions first for SDE candidates
          const sorted = [...data].sort((a, b) => {
            const aIsDsa =
              a.competency?.slug === "sde_dsa_problem_solving" ||
              a.competency?.name?.toLowerCase().includes("data structures");
            const bIsDsa =
              b.competency?.slug === "sde_dsa_problem_solving" ||
              b.competency?.name?.toLowerCase().includes("data structures");
            if (aIsDsa && !bIsDsa) return -1;
            if (!aIsDsa && bIsDsa) return 1;
            return 0;
          });
          setQuestions(sorted);
          if (sorted.length > 0) {
            setSelectedQuestionId(sorted[0].id);
          } else {
            setSelectedQuestionId("");
          }
          setLoadingQuestions(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load questions:", err);
          setLoadingQuestions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [domain, difficulty, experienceLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await api.interviews.create({
        domain,
        companyCategory,
        targetRole,
        experienceLevel,
        difficulty,
        durationMinutes,
        personality,
        mode,
        questionId: selectedQuestionId || undefined,
        resumeSummary: resumeSummary.trim() || undefined,
      });

      router.push(`/interview/${session.id}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to create interview session",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Navigation breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6">
          <Link href="/dashboard" className="hover:text-zinc-200">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Start Interview</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Configure Your AI Voice Interview
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5">
              Customize your domain, technical difficulty, and interview
              persona. The AI interviewer will calibrate its line of questioning
              dynamically.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Domain Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Professional Domain
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDomain(ProfessionalDomain.SDE);
                    setCompanyCategory(CompanyCategory.PRODUCT_COMPANY);
                    setTargetRole("Software Development Engineer");
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    domain === ProfessionalDomain.SDE
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-semibold text-sm">
                    Software Engineering (SDE)
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    System Design, Concurrency, Architecture, Microservices
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDomain(ProfessionalDomain.SAP);
                    setCompanyCategory(CompanyCategory.SAP_CONSULTING);
                    setTargetRole(SAP_TRACK_ROLES[0].title);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    domain === ProfessionalDomain.SAP
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="font-semibold text-sm">
                    SAP Enterprise Ecosystem
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    S/4HANA Clean Core, RAP/CDS, BTP, TM, FICO
                  </div>
                </button>
              </div>
            </div>

            {/* Target Role & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Target Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                {/* SAP Quick Select Role Pills */}
                {domain === ProfessionalDomain.SAP && (
                  <div className="mt-2.5">
                    <span className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">
                      Quick Select SAP Specialization:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SAP_TRACK_ROLES.map((r) => (
                        <button
                          key={r.slug}
                          type="button"
                          onClick={() => {
                            setTargetRole(r.title);
                            setDifficulty(r.defaultDifficulty);
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            targetRole === r.title
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-medium"
                              : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
                          }`}
                        >
                          {r.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) =>
                    setExperienceLevel(e.target.value as ExperienceLevel)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={ExperienceLevel.FRESHER}>
                    Fresher / Associate (0-1 yrs)
                  </option>
                  <option value={ExperienceLevel.SDE_1}>
                    Junior / Specialist (1-3 yrs)
                  </option>
                  <option value={ExperienceLevel.SDE_2}>
                    Mid-Level / Senior Consultant (3-6 yrs)
                  </option>
                  <option value={ExperienceLevel.SENIOR}>
                    Lead / Solution Architect (6-10 yrs)
                  </option>
                  <option value={ExperienceLevel.STAFF}>
                    Principal / Enterprise Architect (10+ yrs)
                  </option>
                </select>
              </div>
            </div>

            {/* Company Category & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Company Category
                </label>
                <select
                  value={companyCategory}
                  onChange={(e) =>
                    setCompanyCategory(e.target.value as CompanyCategory)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {domain === ProfessionalDomain.SAP ? (
                    <>
                      <option value={CompanyCategory.SAP_CONSULTING}>
                        SAP Consulting / Global SI Partner
                      </option>
                      <option value={CompanyCategory.SAP_PRODUCT}>
                        SAP Product Engineering
                      </option>
                      <option value={CompanyCategory.SAP_CUSTOMER}>
                        SAP Enterprise Customer / End-User
                      </option>
                    </>
                  ) : (
                    <>
                      <option value={CompanyCategory.PRODUCT_COMPANY}>
                        Tier-1 Product / Unicorn
                      </option>
                      <option value={CompanyCategory.FAANG_STYLE}>
                        FAANG / Big Tech
                      </option>
                      <option value={CompanyCategory.SERVICE_COMPANY}>
                        Enterprise IT Services
                      </option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Interview Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as InterviewMode)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={InterviewMode.PRACTICE}>
                    Practice (Hints available)
                  </option>
                  <option value={InterviewMode.ASSESSMENT}>
                    Formal Assessment (Strict time limit)
                  </option>
                  <option value={InterviewMode.LEARNING}>
                    Learning & Coaching (Real-time tips)
                  </option>
                </select>
              </div>
            </div>

            {/* Difficulty & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as InterviewDifficulty)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={InterviewDifficulty.EASY}>Easy</option>
                  <option value={InterviewDifficulty.MEDIUM}>
                    Medium (Standard)
                  </option>
                  <option value={InterviewDifficulty.HARD}>
                    Hard (Rigorous)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={15}>15 Minutes (Express)</option>
                  <option value={30}>30 Minutes (Standard)</option>
                  <option value={45}>45 Minutes (Full Deep Dive)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Interviewer Persona
                </label>
                <select
                  value={personality}
                  onChange={(e) =>
                    setPersonality(e.target.value as InterviewerPersonality)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={InterviewerPersonality.PROFESSIONAL}>
                    Professional & Direct
                  </option>
                  <option value={InterviewerPersonality.FRIENDLY}>
                    Friendly & Encouraging
                  </option>
                  <option value={InterviewerPersonality.STRICT}>
                    Strict & Deep Probing
                  </option>
                </select>
              </div>
            </div>

            {/* Target Question selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Initial Focus Problem
              </label>
              {loadingQuestions ? (
                <div className="text-xs text-zinc-500 py-3">
                  Loading available questions...
                </div>
              ) : questions.length === 0 ? (
                <div className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                  Adaptive AI Selection: The interviewer will generate the
                  initial problem dynamically.
                </div>
              ) : (
                <select
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.competency?.name || "General"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Resume & Project Context (Sakshaat AI Grilling Mode) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Resume &amp; Project Background (Optional)
                </label>
                <span className="text-[11px] text-indigo-400 font-medium">
                  ✦ Sakshaat Project Grilling
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                Paste your key projects, tech stack, or resume summary. The AI
                interviewer will weave in targeted cross-questions about your
                actual project architecture.
              </p>
              <textarea
                value={resumeSummary}
                onChange={(e) => setResumeSummary(e.target.value)}
                rows={3}
                placeholder="e.g. Built a real-time event processing pipeline with Apache Kafka, Go, and PostgreSQL. Architected microservices with Redis caching and Docker on AWS..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
              >
                {isSubmitting ? "Entering Room..." : "Launch Voice Interview →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
