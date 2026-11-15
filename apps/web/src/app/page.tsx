import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewerPersonality,
} from '@interviewai/shared-types';

export default function Home() {
  const domains = [
    {
      id: ProfessionalDomain.SDE,
      title: 'Software Development Engineering',
      desc: 'FAANG-style, Product companies, and Service-based tracks with adaptive DSA, System Design, and CS Fundamentals.',
      badge: 'Available',
    },
    {
      id: ProfessionalDomain.SAP,
      title: 'SAP Consulting & Architecture',
      desc: 'Specialized tracks covering TM, FICO, MM, SD, EWM, and ABAP for Product companies, Partners, and Customers.',
      badge: 'Available',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            AI
          </div>
          <span className="font-semibold text-lg tracking-tight">InterviewAI Platform</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            System Operational
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
          <span>Voice &amp; Video Technical Interviews</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Master Technical Interviews with an{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Adaptive AI Interviewer
          </span>
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Practice realistic, voice-first technical interviews. Our AI doesn&apos;t just read questions — it understands your explanations, challenges edge cases, probes deeper, and evaluates your competencies with independent human-grade rubrics.
        </p>

        {/* Domain Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          {domains.map((d) => (
            <div
              key={d.id}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
                  Track: {d.id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                  {d.badge}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">{d.title}</h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>

        {/* Feature Highlights from Shared Types */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 w-full text-left">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Engineered Capabilities
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">Company Categories</span>
              <span className="font-semibold text-indigo-300">
                {Object.keys(CompanyCategory).length} Presets
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">Experience Levels</span>
              <span className="font-semibold text-indigo-300">
                {Object.keys(ExperienceLevel).length} Tiers (Fresher → Staff)
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">Interviewer Persona</span>
              <span className="font-semibold text-indigo-300">
                {Object.keys(InterviewerPersonality).length} Styles (Strict, Friendly, Pro)
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block mb-1">Architecture</span>
              <span className="font-semibold text-indigo-300">Provider-Agnostic AI</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        AI Interview Platform — Production Engineering Roadmap
      </footer>
    </div>
  );
}
