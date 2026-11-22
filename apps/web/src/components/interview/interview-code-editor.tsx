"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  type CodingProblem,
  type CodeExecutionResult,
  type TestCaseResult,
  ProgrammingLanguage,
  CodeExecutionStatus,
  InterviewDifficulty,
} from "@interviewai/shared-types";
import { api } from "@/lib/api-client";

// Dynamically import Monaco Editor to avoid SSR hydration issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[400px] flex items-center justify-center bg-zinc-900/60 rounded-xl border border-zinc-800 text-zinc-400 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Loading code editor...
      </div>
    </div>
  ),
});

interface InterviewCodeEditorProps {
  sessionId?: string;
  onCodeChange?: (code: string, language: ProgrammingLanguage) => void;
  onCodeRun?: (
    code: string,
    language: ProgrammingLanguage,
    problemId?: string,
  ) => void;
  latestExecutionResult?: CodeExecutionResult | null;
  isExecuting?: boolean;
  onRequestHint?: () => void;
}

export function InterviewCodeEditor({
  onCodeChange,
  onCodeRun,
  latestExecutionResult: externalExecutionResult,
  isExecuting: externalIsExecuting,
  onRequestHint,
}: InterviewCodeEditorProps) {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string>("two-sum");
  const [language, setLanguage] = useState<ProgrammingLanguage>(
    ProgrammingLanguage.TYPESCRIPT,
  );
  const [code, setCode] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(14);
  const [activeTab, setActiveTab] = useState<"description" | "results">(
    "description",
  );
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number>(0);
  const [isLocalExecuting, setIsLocalExecuting] = useState(false);
  const [localExecutionResult, setLocalExecutionResult] =
    useState<CodeExecutionResult | null>(null);
  const [activeTabSub, setActiveTabSub] = useState<"all" | "details">("all");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = externalIsExecuting || isLocalExecuting;
  const executionResult = externalExecutionResult ?? localExecutionResult;

  // Fetch coding problems on mount
  useEffect(() => {
    let mounted = true;
    api.coding
      .listProblems()
      .then((data) => {
        if (mounted && data.length > 0) {
          setProblems(data);
          const initialProb = data[0];
          setSelectedProblemId(initialProb.id);
          setCode(initialProb.starterCode[language] || "");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch coding problems:", err);
      });
    return () => {
      mounted = false;
    };
  }, [language]);

  const currentProblem =
    problems.find((p) => p.id === selectedProblemId) || problems[0];

  // Handle problem switch
  const handleProblemChange = (probId: string) => {
    setSelectedProblemId(probId);
    const prob = problems.find((p) => p.id === probId);
    if (prob) {
      const newCode = prob.starterCode[language] || "";
      setCode(newCode);
      onCodeChange?.(newCode, language);
    }
  };

  // Handle language switch
  const handleLanguageChange = (newLang: ProgrammingLanguage) => {
    setLanguage(newLang);
    if (currentProblem) {
      const newCode = currentProblem.starterCode[newLang] || "";
      setCode(newCode);
      onCodeChange?.(newCode, newLang);
    }
  };

  // Reset starter code
  const handleResetCode = () => {
    if (!currentProblem) return;
    const starter = currentProblem.starterCode[language] || "";
    setCode(starter);
    onCodeChange?.(starter, language);
  };

  // Debounced code change handler
  const handleEditorChange = (value?: string) => {
    const val = value ?? "";
    setCode(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onCodeChange?.(val, language);
    }, 300);
  };

  // Run tests
  const handleRunCode = useCallback(async () => {
    if (isRunning) return;
    setActiveTab("results");

    if (onCodeRun) {
      onCodeRun(code, language, currentProblem?.id);
    } else {
      // REST API fallback
      setIsLocalExecuting(true);
      try {
        const res = await api.coding.execute(
          { code, language },
          currentProblem?.id,
        );
        setLocalExecutionResult(res);
      } catch (err) {
        console.error("Code execution failed:", err);
      } finally {
        setIsLocalExecuting(false);
      }
    }
  }, [isRunning, onCodeRun, code, language, currentProblem]);

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to execute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleRunCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunCode]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-zinc-900/90 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {/* Problem Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">
              Problem:
            </span>
            <select
              value={selectedProblemId}
              onChange={(e) => handleProblemChange(e.target.value)}
              className="bg-zinc-800 hover:bg-zinc-700/80 text-zinc-100 text-xs font-medium rounded-lg px-3 py-1.5 border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              {problems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.difficulty.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">
              Language:
            </span>
            <select
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as ProgrammingLanguage)
              }
              className="bg-zinc-800 hover:bg-zinc-700/80 text-zinc-100 text-xs font-medium rounded-lg px-3 py-1.5 border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value={ProgrammingLanguage.TYPESCRIPT}>TypeScript</option>
              <option value={ProgrammingLanguage.JAVASCRIPT}>JavaScript</option>
              <option value={ProgrammingLanguage.PYTHON}>Python 3</option>
            </select>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Font Size Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60 text-xs text-zinc-300">
            <span>Font:</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-100"
              title="Decrease font size"
            >
              -
            </button>
            <span className="w-5 text-center font-mono">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(20, s + 1))}
              className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-100"
              title="Increase font size"
            >
              +
            </button>
          </div>

          {/* Reset Starter Code */}
          <button
            type="button"
            onClick={handleResetCode}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg border border-zinc-700/60 transition-colors"
            title="Reset code to initial starter template"
          >
            Reset
          </button>

          {/* Ask for Hint (Sakshaat AI Feature) */}
          {onRequestHint && (
            <button
              type="button"
              onClick={onRequestHint}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg border border-indigo-500/30 transition-colors"
              title="Request a Socratic hint from the AI interviewer"
            >
              💡 Ask for Hint
            </button>
          )}

          {/* Run Tests Button */}
          <button
            type="button"
            onClick={() => void handleRunCode()}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/40 disabled:text-zinc-400 rounded-lg shadow-sm transition-all transform active:scale-95"
            title="Execute test suite in isolated sandbox (Cmd+Enter)"
          >
            {isRunning ? (
              <>
                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <span>▶ Run Tests</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-700/60 text-[10px] rounded text-emerald-100">
                  ⌘↵
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Editor, Right Problem & Results */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Code Editor Pane (7 cols) */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 text-[11px] text-zinc-400">
            <span className="font-mono">
              solution.
              {language === ProgrammingLanguage.PYTHON
                ? "py"
                : language === ProgrammingLanguage.TYPESCRIPT
                  ? "ts"
                  : "js"}
            </span>
            <span className="text-zinc-500">
              Auto-saved & synced with interviewer
            </span>
          </div>
          <div className="flex-1 min-h-[460px]">
            <MonacoEditor
              height="100%"
              language={
                language === ProgrammingLanguage.PYTHON
                  ? "python"
                  : "typescript"
              }
              theme="vs-dark"
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        </div>

        {/* Right Pane: Problem Description & Test Execution Suite (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-900/40">
          {/* Tabs: Description vs Test Results */}
          <div className="flex items-center border-b border-zinc-800 bg-zinc-900/80 px-4">
            <button
              type="button"
              onClick={() => setActiveTab("description")}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "description"
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Problem Description
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("results")}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "results"
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>Test Results</span>
              {executionResult && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    executionResult.status === CodeExecutionStatus.PASSED
                      ? "bg-emerald-400"
                      : "bg-rose-400"
                  }`}
                />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 max-h-[560px]">
            {activeTab === "description" && currentProblem && (
              <div className="space-y-4 text-xs text-zinc-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-100">
                    {currentProblem.title}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      currentProblem.difficulty === InterviewDifficulty.EASY
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : currentProblem.difficulty ===
                            InterviewDifficulty.MEDIUM
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {currentProblem.difficulty}
                  </span>
                </div>

                <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {currentProblem.description}
                </div>

                {/* Examples */}
                <div className="space-y-2.5 pt-2">
                  <span className="font-semibold text-zinc-200 text-xs">
                    Examples:
                  </span>
                  {currentProblem.examples?.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5 font-mono text-[11px]"
                    >
                      <div className="text-zinc-400">
                        <strong className="text-zinc-300 font-sans">
                          Input:{" "}
                        </strong>
                        {ex.input}
                      </div>
                      <div className="text-emerald-400">
                        <strong className="text-zinc-300 font-sans">
                          Output:{" "}
                        </strong>
                        {ex.output}
                      </div>
                      {ex.explanation && (
                        <div className="text-zinc-500 text-[10px] font-sans">
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                {currentProblem.constraints &&
                  currentProblem.constraints.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="font-semibold text-zinc-200 text-xs">
                        Constraints:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-zinc-400 font-mono text-[11px]">
                        {currentProblem.constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {activeTab === "results" && (
              <div className="space-y-4">
                {isRunning ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-400 space-y-3">
                    <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium">
                      Executing sandbox environment against test cases...
                    </p>
                  </div>
                ) : !executionResult ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-500 space-y-2">
                    <div className="text-2xl">⚡</div>
                    <p className="text-xs">
                      Click{" "}
                      <strong className="text-zinc-300">
                        &ldquo;Run Tests&rdquo;
                      </strong>{" "}
                      to execute your code in the isolated sandbox.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Overall Status Banner */}
                    <div
                      className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        executionResult.status === CodeExecutionStatus.PASSED
                          ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                          : executionResult.status ===
                              CodeExecutionStatus.TIMED_OUT
                            ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                            : "bg-rose-950/30 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <span>
                            {executionResult.status ===
                            CodeExecutionStatus.PASSED
                              ? "✅ All Test Cases Passed"
                              : executionResult.status ===
                                  CodeExecutionStatus.TIMED_OUT
                                ? "⏱️ Execution Timed Out"
                                : "❌ Test Suite Failed"}
                          </span>
                        </div>
                        <div className="text-[11px] opacity-80">
                          {executionResult.passedTests} of{" "}
                          {executionResult.totalTests} tests passing (
                          {executionResult.runtimeMs}ms)
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900/60 border border-current">
                        {executionResult.status}
                      </span>
                    </div>

                    {/* AI Interviewer Live Notification Notice */}
                    {executionResult.interviewerContextNote && (
                      <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                        <span className="text-sm">🤖</span>
                        <div>
                          <span className="font-semibold">
                            Interviewer Context:{" "}
                          </span>
                          <span>
                            The AI interviewer has received your test outcomes
                            for targeted follow-up.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Overall Error Message or Compilation Error */}
                    {executionResult.compilerOutput && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 font-mono text-[11px] text-rose-300 whitespace-pre-wrap">
                        {executionResult.compilerOutput}
                      </div>
                    )}

                    {/* Test Case Breakdown Tabs */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">
                          Test Cases:
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveTabSub("all")}
                            className={`px-2 py-1 text-[10px] rounded font-medium ${
                              activeTabSub === "all"
                                ? "bg-zinc-800 text-zinc-100"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            Summary
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTabSub("details")}
                            className={`px-2 py-1 text-[10px] rounded font-medium ${
                              activeTabSub === "details"
                                ? "bg-zinc-800 text-zinc-100"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            Details
                          </button>
                        </div>
                      </div>

                      {/* Test Case Buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {executionResult.results?.map(
                          (tc: TestCaseResult, idx: number) => (
                            <button
                              key={tc.id || idx}
                              type="button"
                              onClick={() => {
                                setSelectedTestCaseIndex(idx);
                                setActiveTabSub("details");
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-all ${
                                selectedTestCaseIndex === idx &&
                                activeTabSub === "details"
                                  ? "ring-2 ring-indigo-500"
                                  : ""
                              } ${
                                tc.passed
                                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40"
                                  : "bg-rose-950/20 border-rose-500/30 text-rose-400 hover:bg-rose-950/40"
                              }`}
                            >
                              <span>{tc.passed ? "✓" : "✗"}</span>
                              <span>Case {idx + 1}</span>
                            </button>
                          ),
                        )}
                      </div>

                      {/* Selected Test Case Details Card */}
                      {executionResult.results &&
                        executionResult.results[selectedTestCaseIndex] && (
                          <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-2.5 font-mono text-[11px]">
                            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                              <span className="font-semibold text-zinc-300 font-sans">
                                Test Case #{selectedTestCaseIndex + 1}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  executionResult.results[selectedTestCaseIndex]
                                    .passed
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {executionResult.results[selectedTestCaseIndex]
                                  .passed
                                  ? "Passed"
                                  : "Failed"}{" "}
                                (
                                {
                                  executionResult.results[selectedTestCaseIndex]
                                    .executionTimeMs
                                }
                                ms)
                              </span>
                            </div>

                            <div>
                              <span className="text-zinc-500 block text-[10px] font-sans">
                                Input Arguments:
                              </span>
                              <div className="p-2 bg-zinc-950 rounded-lg text-zinc-300 mt-0.5">
                                {JSON.stringify(
                                  executionResult.results[selectedTestCaseIndex]
                                    .input,
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-500 block text-[10px] font-sans">
                                  Expected:
                                </span>
                                <div className="p-2 bg-zinc-950 rounded-lg text-emerald-400 mt-0.5">
                                  {JSON.stringify(
                                    executionResult.results[
                                      selectedTestCaseIndex
                                    ].expectedOutput,
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px] font-sans">
                                  Actual:
                                </span>
                                <div
                                  className={`p-2 bg-zinc-950 rounded-lg mt-0.5 ${
                                    executionResult.results[
                                      selectedTestCaseIndex
                                    ].passed
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                  }`}
                                >
                                  {JSON.stringify(
                                    executionResult.results[
                                      selectedTestCaseIndex
                                    ].actualOutput,
                                  )}
                                </div>
                              </div>
                            </div>

                            {executionResult.results[selectedTestCaseIndex]
                              .error && (
                              <div>
                                <span className="text-rose-400 block text-[10px] font-sans">
                                  Error Trace:
                                </span>
                                <div className="p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-rose-300 mt-0.5 whitespace-pre-wrap">
                                  {
                                    executionResult.results[
                                      selectedTestCaseIndex
                                    ].error
                                  }
                                </div>
                              </div>
                            )}

                            {executionResult.results[selectedTestCaseIndex]
                              .stdout && (
                              <div>
                                <span className="text-zinc-500 block text-[10px] font-sans">
                                  Standard Output (stdout):
                                </span>
                                <div className="p-2 bg-zinc-950 rounded-lg text-zinc-400 mt-0.5 whitespace-pre-wrap">
                                  {
                                    executionResult.results[
                                      selectedTestCaseIndex
                                    ].stdout
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
