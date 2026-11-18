import { Injectable, Logger } from '@nestjs/common';
import * as vm from 'node:vm';
import { spawn } from 'node:child_process';
import {
  ProgrammingLanguage,
  CodeExecutionStatus,
  type TestCase,
  type TestCaseResult,
  type CodeExecutionResult,
} from '@interviewai/shared-types';

@Injectable()
export class CodingSandboxService {
  private readonly logger = new Logger(CodingSandboxService.name);

  // Maximum runtime execution time per test case (ms)
  private readonly EXECUTION_TIMEOUT_MS = 2500;
  // Maximum stdout capture size per execution (bytes)
  private readonly MAX_OUTPUT_BYTES = 16 * 1024;

  /**
   * Execute code in an isolated, secure sandbox against test cases.
   */
  async execute(params: {
    code: string;
    language: ProgrammingLanguage;
    testCases: TestCase[];
    entryFunction?: string;
  }): Promise<CodeExecutionResult> {
    const { code, language, testCases, entryFunction } = params;

    this.logger.log(
      `Executing ${language} code against ${testCases.length} test cases (Entry: ${entryFunction || 'auto'})`,
    );

    const startTime = Date.now();

    switch (language) {
      case ProgrammingLanguage.JAVASCRIPT:
      case ProgrammingLanguage.TYPESCRIPT:
        return this.executeJavaScript(
          code,
          testCases,
          entryFunction,
          startTime,
        );

      case ProgrammingLanguage.PYTHON:
        return this.executePython(code, testCases, entryFunction, startTime);

      default:
        return {
          language,
          status: CodeExecutionStatus.COMPILE_ERROR,
          totalTests: testCases.length,
          passedTests: 0,
          runtimeMs: 0,
          results: [],
          compilerOutput: `Language ${language} execution runner is not configured. Supported languages: JavaScript, TypeScript, Python.`,
          interviewerContextNote: `Candidate attempted to run in unsupported language: ${language}`,
        };
    }
  }

  /**
   * Secure JavaScript / TypeScript execution using Node.js isolated VM context.
   * Strips all host I/O, process, require, network, and sets strict CPU timeouts.
   */
  private async executeJavaScript(
    code: string,
    testCases: TestCase[],
    entryFunction?: string,
    startTime = Date.now(),
  ): Promise<CodeExecutionResult> {
    const results: TestCaseResult[] = [];
    let passedCount = 0;
    let overallStatus = CodeExecutionStatus.PASSED;

    // Buffer to capture candidate console.log output
    let stdoutBuffer = '';

    const safeConsole = {
      log: (...args: unknown[]) => {
        if (stdoutBuffer.length < this.MAX_OUTPUT_BYTES) {
          stdoutBuffer +=
            args
              .map((a) => {
                if (typeof a === 'string') return a;
                if (
                  typeof a === 'number' ||
                  typeof a === 'boolean' ||
                  typeof a === 'bigint' ||
                  typeof a === 'symbol'
                ) {
                  return a.toString();
                }
                if (a === null) return 'null';
                if (a === undefined) return 'undefined';
                try {
                  return JSON.stringify(a);
                } catch {
                  return '[Object]';
                }
              })
              .join(' ') + '\n';
        }
      },
      warn: (...args: unknown[]) => safeConsole.log(...args),
      error: (...args: unknown[]) => safeConsole.log(...args),
    };

    // Construct isolated sandbox context with frozen primitives
    const sandbox = {
      console: safeConsole,
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      Map,
      Set,
      JSON,
      RegExp,
      BigInt,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      // Explicitly block host primitives
      require: undefined,
      process: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      WebSocket: undefined,
      globalThis: null,
      global: null,
    };

    const context = vm.createContext(sandbox);

    // 1. Compile user code
    let script: vm.Script;
    try {
      script = new vm.Script(code, {
        filename: 'candidate_solution.js',
      });
      script.runInContext(context, { timeout: 1000 });
    } catch (err) {
      return {
        language: ProgrammingLanguage.TYPESCRIPT,
        status: CodeExecutionStatus.COMPILE_ERROR,
        totalTests: testCases.length,
        passedTests: 0,
        runtimeMs: Date.now() - startTime,
        results: [],
        compilerOutput:
          err instanceof Error ? err.stack || err.message : String(err),
        interviewerContextNote: `Candidate code failed to compile: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // 2. Discover entry function if not explicitly passed
    let resolvedEntryFunction = entryFunction;
    if (!resolvedEntryFunction) {
      try {
        const discoverScript = new vm.Script(`
          Object.keys(this).find(k => typeof this[k] === 'function' && k !== 'parseInt' && k !== 'parseFloat' && k !== 'isNaN' && k !== 'isFinite')
        `);
        resolvedEntryFunction = discoverScript.runInContext(context);
      } catch {
        // ignore
      }
    }

    if (!resolvedEntryFunction) {
      return {
        language: ProgrammingLanguage.TYPESCRIPT,
        status: CodeExecutionStatus.COMPILE_ERROR,
        totalTests: testCases.length,
        passedTests: 0,
        runtimeMs: Date.now() - startTime,
        results: [],
        compilerOutput:
          'Could not detect an exported or globally declared solution function.',
        interviewerContextNote:
          'Candidate code does not declare an identifiable function to test.',
      };
    }

    // 3. Run each test case in the isolated context
    for (const tc of testCases) {
      const tcStart = Date.now();
      let actualOutput: unknown = undefined;
      let passed = false;
      let errorMsg: string | undefined;

      try {
        // Pass test case input safely via context variable
        (context as Record<string, unknown>).__current_input__ = tc.input;

        const harnessScript = new vm.Script(
          `
          (() => {
            const input = __current_input__;
            if (Array.isArray(input)) {
              return ${resolvedEntryFunction}(...input);
            } else {
              return ${resolvedEntryFunction}(input);
            }
          })()
          `,
          { filename: `test_${tc.id}.js` },
        );

        actualOutput = harnessScript.runInContext(context, {
          timeout: this.EXECUTION_TIMEOUT_MS,
        });

        // Deep equality check between actual and expected
        passed = this.areOutputsEqual(actualOutput, tc.expectedOutput);
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('timed out')) {
          overallStatus = CodeExecutionStatus.TIMED_OUT;
        } else if (overallStatus !== CodeExecutionStatus.TIMED_OUT) {
          overallStatus = CodeExecutionStatus.RUNTIME_ERROR;
        }
      }

      const tcDuration = Date.now() - tcStart;

      if (passed) {
        passedCount++;
      } else if (overallStatus === CodeExecutionStatus.PASSED) {
        overallStatus = CodeExecutionStatus.FAILED;
      }

      results.push({
        id: tc.id,
        description: tc.description,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: actualOutput ?? null,
        passed,
        executionTimeMs: tcDuration,
        error: errorMsg,
        stdout: stdoutBuffer.trim() ? stdoutBuffer.trim() : undefined,
      });

      // Clear stdout buffer between test cases
      stdoutBuffer = '';
    }

    const totalRuntime = Date.now() - startTime;

    let interviewerContextNote: string;
    if (passedCount === testCases.length) {
      interviewerContextNote = `Candidate code passed all ${testCases.length}/${testCases.length} test cases in ${totalRuntime}ms.`;
    } else {
      interviewerContextNote = `Candidate code passed ${passedCount}/${testCases.length} test cases. Overall status: ${overallStatus}.`;
    }

    return {
      language: ProgrammingLanguage.TYPESCRIPT,
      status: overallStatus,
      totalTests: testCases.length,
      passedTests: passedCount,
      runtimeMs: totalRuntime,
      results,
      compilerOutput: undefined,
      interviewerContextNote,
    };
  }

  /**
   * Python execution sandbox using an isolated child process.
   */
  private async executePython(
    code: string,
    testCases: TestCase[],
    entryFunction?: string,
    startTime = Date.now(),
  ): Promise<CodeExecutionResult> {
    return new Promise((resolve) => {
      // Build test runner wrapper in Python
      const runnerScript = `
import sys, json, time

# User solution
${code}

test_cases = json.loads('''${JSON.stringify(testCases).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}''')
results = []
passed_count = 0

entry_fn_name = "${entryFunction || ''}"
if not entry_fn_name:
    # Auto-detect function
    for name in dir():
        if not name.startswith('_') and callable(globals()[name]) and name not in ['json', 'sys', 'time']:
            entry_fn_name = name
            break

if not entry_fn_name or entry_fn_name not in globals():
    print(json.dumps({"error": "No solution function found", "results": []}))
    sys.exit(0)

target_fn = globals()[entry_fn_name]

for tc in test_cases:
    tc_start = time.time()
    passed = False
    actual = None
    err_str = None
    try:
        inp = tc['input']
        if isinstance(inp, list):
            actual = target_fn(*inp)
        else:
            actual = target_fn(inp)
        
        # Compare actual and expected
        passed = (actual == tc['expectedOutput'])
    except Exception as e:
        err_str = str(e)
    
    tc_duration = int((time.time() - tc_start) * 1000)
    if passed:
        passed_count += 1
    
    results.append({
        "id": tc['id'],
        "description": tc.get('description'),
        "input": tc['input'],
        "expectedOutput": tc['expectedOutput'],
        "actualOutput": actual,
        "passed": passed,
        "executionTimeMs": tc_duration,
        "error": err_str
    })

print(json.dumps({"results": results, "passedCount": passed_count}))
`;

      const pyProcess = spawn('python3', ['-u', '-c', runnerScript], {
        timeout: this.EXECUTION_TIMEOUT_MS,
        env: {
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
          PYTHONNOUSERSITE: '1',
        },
      });

      let stdout = '';
      let stderr = '';

      pyProcess.stdout.on('data', (d) => {
        if (stdout.length < this.MAX_OUTPUT_BYTES) stdout += d.toString();
      });

      pyProcess.stderr.on('data', (d) => {
        if (stderr.length < this.MAX_OUTPUT_BYTES) stderr += d.toString();
      });

      pyProcess.on('close', (codeStatus) => {
        const totalRuntime = Date.now() - startTime;

        if (codeStatus !== 0 && !stdout.trim()) {
          resolve({
            language: ProgrammingLanguage.PYTHON,
            status: CodeExecutionStatus.RUNTIME_ERROR,
            totalTests: testCases.length,
            passedTests: 0,
            runtimeMs: totalRuntime,
            results: [],
            compilerOutput: stderr || 'Python execution failed.',
            interviewerContextNote: `Candidate Python code failed with exit code ${codeStatus}: ${stderr.slice(0, 150)}`,
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          const passedCount = parsed.passedCount || 0;
          const status =
            passedCount === testCases.length
              ? CodeExecutionStatus.PASSED
              : CodeExecutionStatus.FAILED;

          resolve({
            language: ProgrammingLanguage.PYTHON,
            status,
            totalTests: testCases.length,
            passedTests: passedCount,
            runtimeMs: totalRuntime,
            results: parsed.results || [],
            interviewerContextNote: `Candidate Python code passed ${passedCount}/${testCases.length} test cases.`,
          });
        } catch {
          resolve({
            language: ProgrammingLanguage.PYTHON,
            status: CodeExecutionStatus.COMPILE_ERROR,
            totalTests: testCases.length,
            passedTests: 0,
            runtimeMs: totalRuntime,
            results: [],
            compilerOutput: stderr || stdout,
            interviewerContextNote:
              'Failed to parse Python test runner output.',
          });
        }
      });

      pyProcess.on('error', (err) => {
        resolve({
          language: ProgrammingLanguage.PYTHON,
          status: CodeExecutionStatus.COMPILE_ERROR,
          totalTests: testCases.length,
          passedTests: 0,
          runtimeMs: Date.now() - startTime,
          results: [],
          compilerOutput: `Failed to launch Python sandbox: ${err.message}`,
          interviewerContextNote: 'Python runner unavailable on host system.',
        });
      });
    });
  }

  /**
   * Helper for deep structural comparison of test case outputs.
   */
  private areOutputsEqual(actual: unknown, expected: unknown): boolean {
    if (actual === expected) return true;
    if (actual === undefined && expected === null) return true;
    if (actual === null && expected === undefined) return true;

    try {
      return JSON.stringify(actual) === JSON.stringify(expected);
    } catch {
      return false;
    }
  }
}
