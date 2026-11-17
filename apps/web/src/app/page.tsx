import Link from "next/link";
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewerPersonality,
} from "@interviewai/shared-types";
import { SystemHealthIndicator } from "@/components/system-health-indicator";

export default function Home() {
  const domains = [
    {
      id: ProfessionalDomain.SDE,
      title: "Software Development Engineering (SDE)",
      desc: "FAANG-style, product companies, and service-based tracks with adaptive DSA, system design, concurrency, and CS fundamentals.",
      badge: "Available Now",
    },
    {
      id: ProfessionalDomain.SAP,
      title: "SAP Consulting & Engineering",
      desc: "Specialized tracks covering SAP TM, FICO, MM, SD, EWM, and ABAP across product engineering, consulting partners, and enterprise customers.",
      badge: "Available Now",
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto w-full px-6 pt-16 pb-12 flex flex-col items-center text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-8 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>Voice &amp; Video Realtime Technical Interviews</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.15] text-zinc-900 dark:text-white">
          Master Technical Interviews with an{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
            Adaptive AI Interviewer
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          Practice realistic, voice-first technical interviews. Our AI
          doesn&apos;t just read questions — it understands your explanations,
          challenges edge cases, probes deeper, and evaluates competencies with
          independent human-grade rubrics.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/onboarding"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-blue-500/20 transition-all"
          >
            Configure Your Track &rarr;
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition-colors"
          >
            Create Free Account
          </Link>
        </div>

        {/* Live Client Health Checker Component */}
        <div className="mt-10">
          <SystemHealthIndicator />
        </div>

        {/* Domain Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          {domains.map((d) => (
            <div
              key={d.id}
              className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                  Track: {d.id}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  {d.badge}
                </span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {d.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {d.desc}
              </p>
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <Link
                  href="/onboarding"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Configure track &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Highlights from Shared Types */}
        <div className="mt-10 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full text-left shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            Domain &amp; Rubric Specifications (From Shared Types)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="text-zinc-500 block mb-1">
                Company Categories
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {Object.keys(CompanyCategory).length} Presets (FAANG, Product,
                Service, SAP)
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="text-zinc-500 block mb-1">
                Experience Levels
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {Object.keys(ExperienceLevel).length} Tiers (Fresher &rarr;
                Staff)
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="text-zinc-500 block mb-1">
                Interviewer Persona
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {Object.keys(InterviewerPersonality).length} Styles (Strict,
                Friendly, Pro)
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800">
              <span className="text-zinc-500 block mb-1">AI Pipeline</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Provider-Agnostic Adapters
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        AI Interview Platform — Production Engineering Roadmap
      </footer>
    </div>
  );
}
