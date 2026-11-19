"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth-context";
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewerPersonality,
  InterviewMode,
  type CandidateProfileResponse,
} from "@interviewai/shared-types";

export default function OnboardingPage() {
  const { candidateProfile, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-zinc-500 text-sm animate-pulse">
          Loading onboarding preferences...
        </div>
      </div>
    );
  }

  return (
    <OnboardingWizard
      key={candidateProfile?.id ?? "guest"}
      initialProfile={candidateProfile}
      isAuthenticated={isAuthenticated}
    />
  );
}

function OnboardingWizard({
  initialProfile,
  isAuthenticated,
}: {
  initialProfile: CandidateProfileResponse | null;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const { updateCandidateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state initialized from initialProfile
  const [domain, setDomain] = useState<ProfessionalDomain>(
    initialProfile?.domain ?? ProfessionalDomain.SDE,
  );
  const [companyCategory, setCompanyCategory] = useState<CompanyCategory>(
    initialProfile?.companyCategory ?? CompanyCategory.FAANG_STYLE,
  );
  const [targetRole, setTargetRole] = useState<string>(
    initialProfile?.targetRole ?? "Backend Engineer",
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initialProfile?.experienceLevel ?? ExperienceLevel.SDE_1,
  );
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>(
    initialProfile?.preferredDifficulty ?? InterviewDifficulty.MEDIUM,
  );
  const [duration, setDuration] = useState<number>(
    initialProfile?.preferredDurationMinutes ?? 45,
  );
  const [personality, setPersonality] = useState<InterviewerPersonality>(
    initialProfile?.preferredPersonality ?? InterviewerPersonality.PROFESSIONAL,
  );
  const [mode, setMode] = useState<InterviewMode>(
    initialProfile?.preferredMode ?? InterviewMode.PRACTICE,
  );

  // Adjust defaults when domain changes
  const handleDomainChange = (newDomain: ProfessionalDomain) => {
    setDomain(newDomain);
    if (newDomain === ProfessionalDomain.SAP) {
      setCompanyCategory(CompanyCategory.SAP_CONSULTING);
      setTargetRole("SAP TM");
    } else {
      setCompanyCategory(CompanyCategory.FAANG_STYLE);
      setTargetRole("Backend Engineer");
    }
  };

  const handleFinishOnboarding = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      if (isAuthenticated) {
        await updateCandidateProfile({
          domain,
          companyCategory,
          targetRole,
          experienceLevel,
          preferredDifficulty: difficulty,
          preferredDurationMinutes: duration,
          preferredPersonality: personality,
          preferredMode: mode,
        });
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const totalSteps = 7;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Progress header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          <span>Candidate Onboarding</span>
          <span>
            Step {step} of {totalSteps}
          </span>
        </div>
        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 rounded-full"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>
            You are configuring an interview track as guest. Sign in to save
            your progress permanently.
          </span>
          <button
            onClick={() => router.push("/login")}
            className="ml-4 font-semibold underline hover:text-amber-900"
          >
            Sign in
          </button>
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs">
          {saveError}
        </div>
      )}

      {/* Step Content Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 min-h-[420px] flex flex-col justify-between">
        <div>
          {/* STEP 1: Professional Domain */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Select your Professional Domain
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Choose the technical path you are preparing for. Question banks,
                rubrics, and interviewer behaviors adapt dynamically.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleDomainChange(ProfessionalDomain.SDE)}
                  className={`p-6 rounded-xl border text-left transition-all ${
                    domain === ProfessionalDomain.SDE
                      ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center mb-3">
                    &lt;/&gt;
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    Software Development (SDE)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Data structures, algorithms, system design, CS fundamentals,
                    problem solving, and production engineering.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDomainChange(ProfessionalDomain.SAP)}
                  className={`p-6 rounded-xl border text-left transition-all ${
                    domain === ProfessionalDomain.SAP
                      ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center mb-3">
                    SAP
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    SAP Consulting & Engineering
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    Module specializations (TM, FICO, MM, SD, EWM, ABAP),
                    business processes, integration, and enterprise
                    configurations.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Company Category */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Select Company Category
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Interview rubrics vary significantly based on company profile
                and hiring standards.
              </p>

              <div className="space-y-3">
                {domain === ProfessionalDomain.SDE ? (
                  <>
                    {[
                      {
                        cat: CompanyCategory.FAANG_STYLE,
                        title: "Tier 1 / FAANG-Style Product Companies",
                        desc: "Rigorous algorithmic problem solving, deep computer science fundamentals, scalability, and system design.",
                      },
                      {
                        cat: CompanyCategory.PRODUCT_COMPANY,
                        title: "High-Growth Product Companies / Scale-Ups",
                        desc: "Practical engineering scenarios, system design, architecture trade-offs, debugging, and clean code.",
                      },
                      {
                        cat: CompanyCategory.SERVICE_COMPANY,
                        title: "IT Services & Consulting Enterprises",
                        desc: "Core programming fundamentals, OOP, SQL/DBMS, OS, networking, client communication, and troubleshooting.",
                      },
                    ].map((item) => (
                      <button
                        key={item.cat}
                        type="button"
                        onClick={() => setCompanyCategory(item.cat)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          companyCategory === item.cat
                            ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      {
                        cat: CompanyCategory.SAP_PRODUCT,
                        title: "SAP Product Engineering",
                        desc: "Platform architecture, core product development, extension framework, and SAP BTP.",
                      },
                      {
                        cat: CompanyCategory.SAP_CONSULTING,
                        title: "SAP Implementation Consulting Partners",
                        desc: "Implementation lifecycle, client requirements mapping, business blueprinting, configuration, and troubleshooting.",
                      },
                      {
                        cat: CompanyCategory.SAP_CUSTOMER,
                        title: "SAP Enterprise Customer / End-User",
                        desc: "Business process ownership, production support, incident resolution, optimization, and reporting.",
                      },
                    ].map((item) => (
                      <button
                        key={item.cat}
                        type="button"
                        onClick={() => setCompanyCategory(item.cat)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          companyCategory === item.cat
                            ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Role / Specialization */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Select Role / Specialization
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Choose your specific target focus area.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(domain === ProfessionalDomain.SDE
                  ? [
                      "Backend Engineer",
                      "Full-Stack Engineer",
                      "Frontend Engineer",
                      "Distributed Systems Engineer",
                      "Platform / DevOps Engineer",
                      "Data Engineer",
                    ]
                  : [
                      "SAP TM (Transportation Management)",
                      "SAP FICO (Financials & Controlling)",
                      "SAP MM (Materials Management)",
                      "SAP SD (Sales & Distribution)",
                      "SAP EWM (Extended Warehouse)",
                      "SAP ABAP / BTP Developer",
                    ]
                ).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setTargetRole(role)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      targetRole === role
                        ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-medium text-xs text-zinc-900 dark:text-white">
                      {role}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Experience Level */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Select Experience Level
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                The expected depth, evaluation standards, and interview depth
                scale with experience.
              </p>

              <div className="space-y-3">
                {[
                  {
                    level: ExperienceLevel.FRESHER,
                    title: "Graduate / Entry Level (0-1 yrs)",
                    desc: "Focus on problem-solving aptitude, core fundamentals, and clarity of thoughts.",
                  },
                  {
                    level: ExperienceLevel.SDE_1,
                    title: "Junior / SDE I (1-3 yrs)",
                    desc: "Focus on clean coding, standard DSA, component-level design, and debugging.",
                  },
                  {
                    level: ExperienceLevel.SDE_2,
                    title: "Mid-Level / SDE II (3-6 yrs)",
                    desc: "Focus on high/low-level system design, edge cases, distributed systems, and architectural trade-offs.",
                  },
                  {
                    level: ExperienceLevel.SENIOR,
                    title: "Senior Engineer (6-10 yrs)",
                    desc: "Focus on large-scale architecture, operational excellence, mentorship, and failure handling.",
                  },
                  {
                    level: ExperienceLevel.STAFF,
                    title: "Staff / Principal Engineer (10+ yrs)",
                    desc: "Cross-domain systems, enterprise vision, high-concurrency paradigms, and strategic technical trade-offs.",
                  },
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setExperienceLevel(item.level)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      experienceLevel === item.level
                        ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Difficulty & Duration */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Difficulty & Duration
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Configure session length and initial question complexity.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Interview Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        val: InterviewDifficulty.EASY,
                        label: "Easy",
                        sub: "Gentle ramp-up",
                      },
                      {
                        val: InterviewDifficulty.MEDIUM,
                        label: "Medium",
                        sub: "Industry standard",
                      },
                      {
                        val: InterviewDifficulty.HARD,
                        label: "Hard",
                        sub: "Deep pressure testing",
                      },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setDifficulty(item.val)}
                        className={`p-3.5 rounded-xl border text-center transition-all ${
                          difficulty === item.val
                            ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {item.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Session Duration
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { minutes: 15, label: "15 min", sub: "Quick screen" },
                      { minutes: 30, label: "30 min", sub: "Standard" },
                      { minutes: 45, label: "45 min", sub: "Comprehensive" },
                      { minutes: 60, label: "60 min", sub: "Full loop" },
                    ].map((item) => (
                      <button
                        key={item.minutes}
                        type="button"
                        onClick={() => setDuration(item.minutes)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          duration === item.minutes
                            ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {item.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Personality & Policy */}
          {step === 6 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Interviewer Personality & Mode
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Personality alters communication tone; interview mode sets
                feedback policies.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Interviewer Personality
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        val: InterviewerPersonality.PROFESSIONAL,
                        title: "Professional",
                        desc: "Objective, polite, structured corporate style",
                      },
                      {
                        val: InterviewerPersonality.FRIENDLY,
                        title: "Friendly",
                        desc: "Encouraging, conversational, supportive tone",
                      },
                      {
                        val: InterviewerPersonality.STRICT,
                        title: "Strict",
                        desc: "Direct, challenges weak assumptions, probes deeply",
                      },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setPersonality(item.val)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          personality === item.val
                            ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    Interview Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        val: InterviewMode.PRACTICE,
                        title: "Practice Mode",
                        desc: "Helpful guidance, hints when stuck, immediate feedback",
                      },
                      {
                        val: InterviewMode.ASSESSMENT,
                        title: "Assessment Mode",
                        desc: "Realistic test simulation: no hints, evaluation generated at end",
                      },
                      {
                        val: InterviewMode.LEARNING,
                        title: "Learning Mode",
                        desc: "Detailed explanations after each question and trade-off",
                      },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setMode(item.val)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          mode === item.val
                            ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Hardware Verification & Summary */}
          {step === 7 && (
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Hardware Check & Ready to Launch
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Test your camera and microphone. Voice and video interviews
                require both.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Media Preview Box */}
                <Step7HardwarePreview />

                {/* Track Summary */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950 text-xs space-y-2.5">
                  <h3 className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Track Configuration Summary
                  </h3>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Domain</span>
                    <span className="font-medium text-zinc-900 dark:text-white uppercase">
                      {domain}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Role</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {targetRole}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Experience</span>
                    <span className="font-medium text-zinc-900 dark:text-white uppercase">
                      {experienceLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500">Difficulty / Time</span>
                    <span className="font-medium text-zinc-900 dark:text-white capitalize">
                      {difficulty} ({duration}m)
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Personality / Mode</span>
                    <span className="font-medium text-zinc-900 dark:text-white capitalize">
                      {personality} ({mode})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-zinc-700 rounded-lg transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleFinishOnboarding}
              className="px-6 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving Configuration..." : "Complete Setup & Launch"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step7HardwarePreview() {
  const [isActive, setIsActive] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopHardwareCheck = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setMicVolume(0);
  }, []);

  const startHardwareCheck = useCallback(async () => {
    stopHardwareCheck();
    setMediaError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMediaError(
        "Webcam and microphone access is not supported by this browser.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Attach video stream to video element
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.playsInline = true;
        videoEl.setAttribute("muted", "");
        videoEl.setAttribute("playsinline", "");
        videoEl.setAttribute("autoplay", "");
        videoEl.srcObject = stream;
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch((err) => console.warn("Video play error:", err));
        };
        if (videoEl.readyState >= 1) {
          videoEl.play().catch(() => {});
        }
      }

      // Audio volume monitoring via AnalyserNode
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVolume = () => {
              if (!audioContextRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              // Normalize volume 0 to 100
              const vol = Math.min(100, Math.round((average / 128) * 100 * 2));
              setMicVolume(vol);
              animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
          }
        } catch {
          // Audio analyzer is an optional enhancement
        }
      }

      setIsActive(true);
    } catch (err: unknown) {
      console.warn("Hardware check error:", err);
      const isNotAllowed =
        err instanceof DOMException && err.name === "NotAllowedError";
      setMediaError(
        isNotAllowed
          ? "Camera or microphone permission was denied. Please allow access in browser settings to test your hardware."
          : "Could not access camera or microphone. Please check your connections.",
      );
      setIsActive(false);
    }
  }, [stopHardwareCheck]);

  // Clean up hardware on unmount
  useEffect(() => {
    return () => {
      stopHardwareCheck();
    };
  }, [stopHardwareCheck]);

  // Auto-initiate check on mount asynchronously to prevent cascading renders
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        void startHardwareCheck();
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [startHardwareCheck]);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between min-h-[260px]">
      {/* Video Viewport Container */}
      <div className="relative w-full h-48 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
            isActive ? "opacity-100" : "opacity-0 absolute"
          }`}
        />

        {!isActive && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-2">
            <span className="text-3xl">📹</span>
            <p className="text-xs font-semibold text-zinc-300">
              Camera Preview Paused
            </p>
            <p className="text-[11px] text-zinc-500">
              Click below to grant camera &amp; mic access.
            </p>
            <button
              type="button"
              onClick={startHardwareCheck}
              className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              Test Camera &amp; Mic
            </button>
          </div>
        )}

        {isActive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>HD Video Feed Active</span>
          </div>
        )}
      </div>

      {/* Hardware Status & Microphone VU Meter */}
      <div className="mt-3 space-y-2">
        {isActive ? (
          <>
            <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Camera &amp; Microphone Connected
                </span>
              </div>
              <button
                type="button"
                onClick={stopHardwareCheck}
                className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline transition-colors"
              >
                Turn Off Hardware
              </button>
            </div>

            {/* Microphone Live VU Meter */}
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  🎙️ Microphone Input Level:
                </span>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    micVolume > 15
                      ? "text-emerald-500"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {micVolume > 15 ? "Speaking Detected" : "Quiet / Ready"}
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    micVolume > 60
                      ? "bg-amber-500"
                      : micVolume > 15
                        ? "bg-emerald-500"
                        : "bg-emerald-600/40"
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, micVolume))}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Hardware verification pending</span>
            <button
              type="button"
              onClick={startHardwareCheck}
              className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
            >
              Start Hardware Test
            </button>
          </div>
        )}

        {mediaError && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center px-1">
            {mediaError}
          </p>
        )}
      </div>
    </div>
  );
}
