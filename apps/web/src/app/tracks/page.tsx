"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "../../lib/api-client";
import {
  ProfessionalDomain,
  InterviewDifficulty,
  EvaluationRating,
  type CompetencyResponse,
  type QuestionResponse,
} from "@interviewai/shared-types";

export default function TracksPage() {
  const [selectedDomain, setSelectedDomain] = useState<ProfessionalDomain>(
    ProfessionalDomain.SDE,
  );
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [competencies, setCompetencies] = useState<CompetencyResponse[]>([]);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const loadTrackData = async () => {
      setIsLoading(true);
      try {
        const [comps, qs] = await Promise.all([
          api.tracks.getCompetencies(selectedDomain),
          api.tracks.getQuestions({ domain: selectedDomain }),
        ]);
        if (active) {
          setCompetencies(comps);
          setQuestions(qs);
          if (qs.length > 0) {
            setExpandedQuestionId(qs[0].id);
          }
        }
      } catch {
        // Fallback or network error
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadTrackData();
    return () => {
      active = false;
    };
  }, [selectedDomain]);

  const filteredQuestions = questions.filter((q) => {
    if (difficultyFilter === "all") return true;
    return q.difficulty === difficultyFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Curriculum &amp; Evaluation Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            Interview Tracks &amp; Question Bank
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Explore the structured competency frameworks, multi-branching
            probing questions, and four-level evaluation rubrics powering our AI
            interviewer.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors"
        >
          Launch Track Practice &rarr;
        </Link>
      </div>

      {/* Domain Selector Tabs */}
      <div className="flex items-center gap-3 my-8">
        <button
          type="button"
          onClick={() => setSelectedDomain(ProfessionalDomain.SDE)}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            selectedDomain === ProfessionalDomain.SDE
              ? "bg-blue-600 text-white shadow-sm"
              : "border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          Software Development (SDE)
        </button>

        <button
          type="button"
          onClick={() => setSelectedDomain(ProfessionalDomain.SAP)}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            selectedDomain === ProfessionalDomain.SAP
              ? "bg-blue-600 text-white shadow-sm"
              : "border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          SAP Consulting &amp; Engineering
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Competency Framework */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider mb-1">
              Core Competency Matrix
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Dimensions evaluated during assessment interviews
            </p>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {competencies.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-white">
                        {comp.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium border border-blue-200/60 dark:border-blue-800/60">
                        {comp.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {comp.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Question Bank & Intelligent Probing Nodes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
                  Technical Question Bank
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Showing {filteredQuestions.length} production interview nodes
                </p>
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs">
                {["all", "easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficultyFilter(d)}
                    className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                      difficultyFilter === d
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                  />
                ))}
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No questions found for this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((q) => {
                  const isExpanded = expandedQuestionId === q.id;
                  return (
                    <div
                      key={q.id}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all"
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedQuestionId(isExpanded ? null : q.id)
                        }
                        className="w-full p-4 text-left flex items-start justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                q.difficulty === InterviewDifficulty.HARD
                                  ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900"
                                  : q.difficulty === InterviewDifficulty.MEDIUM
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                                    : "bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900"
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {q.competency?.name ?? "General"}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">
                            {q.title}
                          </h3>
                        </div>

                        <span className="text-zinc-400 text-xs mt-1">
                          {isExpanded ? "▲ Hide" : "▼ Inspect"}
                        </span>
                      </button>

                      {/* Expanded Question Graph Details */}
                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-4 text-xs">
                          {/* Stem */}
                          <div className="p-3.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 mt-3">
                            <span className="block font-semibold text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                              Interviewer Question Stem:
                            </span>
                            <p className="text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                              &ldquo;{q.stem}&rdquo;
                            </p>
                          </div>

                          {/* Expected Technical Concepts */}
                          <div>
                            <span className="block font-semibold text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                              Expected Technical Concepts:
                            </span>
                            <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
                              {q.expectedConcepts.map((concept, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <span className="text-emerald-500 font-bold">
                                    ✓
                                  </span>
                                  <span>{concept}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Common Misconceptions */}
                          {q.commonMisconceptions.length > 0 && (
                            <div>
                              <span className="block font-semibold text-[11px] uppercase tracking-wider text-red-500 mb-2">
                                Common Misconceptions / Anti-Patterns to Avoid:
                              </span>
                              <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
                                {q.commonMisconceptions.map((misc, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="text-red-500 font-bold">
                                      ✕
                                    </span>
                                    <span>{misc}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* AI Probing Follow-up Questions */}
                          {q.probingQuestions.length > 0 && (
                            <div>
                              <span className="block font-semibold text-[11px] uppercase tracking-wider text-indigo-500 mb-2">
                                AI Adaptive Probing Branches:
                              </span>
                              <div className="space-y-2">
                                {q.probingQuestions.map((probe) => (
                                  <div
                                    key={probe.id}
                                    className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40"
                                  >
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">
                                      Trigger: {probe.triggerCondition}
                                    </span>
                                    <p className="text-zinc-800 dark:text-zinc-200 italic">
                                      &ldquo;{probe.probeText}&rdquo;
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 4-Point Evaluation Rubric Guide */}
                          {q.rubricGuide.length > 0 && (
                            <div>
                              <span className="block font-semibold text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                                4-Point Evaluation Rubric Scoring Guide:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.rubricGuide.map((rubric) => {
                                  const ratingLabels: Record<number, string> = {
                                    [EvaluationRating.POOR]: "1 - Poor",
                                    [EvaluationRating.DEVELOPING]:
                                      "2 - Developing",
                                    [EvaluationRating.PROFICIENT]:
                                      "3 - Proficient",
                                    [EvaluationRating.STRONG]: "4 - Strong",
                                  };
                                  return (
                                    <div
                                      key={rubric.rating}
                                      className="p-2.5 rounded-lg bg-zinc-100/60 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800"
                                    >
                                      <span className="font-bold text-[11px] text-zinc-800 dark:text-zinc-200">
                                        {ratingLabels[rubric.rating] ??
                                          `Rating ${rubric.rating}`}
                                      </span>
                                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">
                                        {rubric.description}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
