import { describe, it, expect, beforeEach } from 'vitest';
import { CodingSandboxService } from './coding-sandbox.service.js';
import { BUILTIN_CODING_PROBLEMS } from './coding.service.js';
import {
  ProgrammingLanguage,
  CodeExecutionStatus,
  type TestCase,
} from '@interviewai/shared-types';

describe('CodingSandboxService', () => {
  let sandbox: CodingSandboxService;

  beforeEach(() => {
    sandbox = new CodingSandboxService();
  });

  const sampleTestCases: TestCase[] = [
    {
      id: 'tc-1',
      description: 'Basic two sum pair',
      input: [[2, 7, 11, 15], 9],
      expectedOutput: [0, 1],
    },
    {
      id: 'tc-2',
      description: 'Pair not at beginning',
      input: [[3, 2, 4], 6],
      expectedOutput: [1, 2],
    },
    {
      id: 'tc-3',
      description: 'Duplicate numbers',
      input: [[3, 3], 6],
      expectedOutput: [0, 1],
    },
  ];

  it('should successfully execute valid TypeScript solution passing all test cases', async () => {
    const validCode = `
      function twoSum(nums: number[], target: number): number[] {
        const map = new Map<number, number>();
        for (let i = 0; i < nums.length; i++) {
          const complement = target - nums[i];
          if (map.has(complement)) {
            return [map.get(complement)!, i];
          }
          map.set(nums[i], i);
        }
        return [];
      }
    `;

    const result = await sandbox.execute({
      code: validCode,
      language: ProgrammingLanguage.TYPESCRIPT,
      testCases: sampleTestCases,
      entryFunction: 'twoSum',
    });

    expect(result.language).toBe(ProgrammingLanguage.TYPESCRIPT);
    expect(result.status).toBe(CodeExecutionStatus.PASSED);
    expect(result.totalTests).toBe(3);
    expect(result.passedTests).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].passed).toBe(true);
    expect(result.results[0].actualOutput).toEqual([0, 1]);
  });

  it('should execute all builtin TypeScript starter templates without compile errors', async () => {
    for (const problem of BUILTIN_CODING_PROBLEMS) {
      const tsCode = problem.starterCode[ProgrammingLanguage.TYPESCRIPT]!;
      const result = await sandbox.execute({
        code: tsCode,
        language: ProgrammingLanguage.TYPESCRIPT,
        testCases: problem.testCases,
        entryFunction: problem.entryFunction,
      });

      expect(result.status, `Expected ${problem.id} TypeScript starter to pass`).toBe(
        CodeExecutionStatus.PASSED,
      );
      expect(result.passedTests).toBe(problem.testCases.length);
    }
  });

  it('should report FAILED when user logic produces incorrect results', async () => {
    const incorrectCode = `
      function twoSum(nums, target) {
        return [0, 0]; // deliberate wrong answer
      }
    `;

    const result = await sandbox.execute({
      code: incorrectCode,
      language: ProgrammingLanguage.TYPESCRIPT,
      testCases: sampleTestCases,
      entryFunction: 'twoSum',
    });

    expect(result.status).toBe(CodeExecutionStatus.FAILED);
    expect(result.totalTests).toBe(3);
    expect(result.passedTests).toBe(0);
    expect(result.results[0].passed).toBe(false);
    expect(result.results[0].actualOutput).toEqual([0, 0]);
  });

  it('should report COMPILE_ERROR on invalid syntax', async () => {
    const invalidSyntaxCode = `
      function twoSum(nums, target) {
        return [0, 1 // missing closing bracket
    `;

    const result = await sandbox.execute({
      code: invalidSyntaxCode,
      language: ProgrammingLanguage.TYPESCRIPT,
      testCases: sampleTestCases,
      entryFunction: 'twoSum',
    });

    expect(result.status).toBe(CodeExecutionStatus.COMPILE_ERROR);
    expect(result.passedTests).toBe(0);
    expect(result.compilerOutput).toBeDefined();
  });

  it('should safely terminate infinite loops with TIMED_OUT status', async () => {
    const infiniteLoopCode = `
      function twoSum(nums, target) {
        while (true) {} // infinite loop
        return [];
      }
    `;

    const result = await sandbox.execute({
      code: infiniteLoopCode,
      language: ProgrammingLanguage.TYPESCRIPT,
      testCases: [sampleTestCases[0]],
      entryFunction: 'twoSum',
    });

    expect(result.status).toBe(CodeExecutionStatus.TIMED_OUT);
    expect(result.passedTests).toBe(0);
    expect(result.results[0].error).toContain('timed out');
  });

  it('should immediately block hostile code attempting to access process or host APIs', async () => {
    const hostileCode = `
      function twoSum(nums, target) {
        process.exit(1);
        return [0, 1];
      }
    `;

    const result = await sandbox.execute({
      code: hostileCode,
      language: ProgrammingLanguage.TYPESCRIPT,
      testCases: [sampleTestCases[0]],
      entryFunction: 'twoSum',
    });

    expect(result.status).toBe(CodeExecutionStatus.COMPILE_ERROR);
    expect(result.compilerOutput).toContain('Security violation');
    expect(result.compilerOutput).toContain('Node.js host process');
  });

  it('should block prototype pollution and constructor escapement attempts', async () => {
    const exploitCode = `
      function twoSum(nums, target) {
        const fn = this.constructor.constructor("return 42");
        return [0, 1];
      }
    `;

    const result = await sandbox.execute({
      code: exploitCode,
      language: ProgrammingLanguage.TYPESCRIPT,
      testCases: [sampleTestCases[0]],
      entryFunction: 'twoSum',
    });

    expect(result.status).toBe(CodeExecutionStatus.COMPILE_ERROR);
    expect(result.compilerOutput).toContain('Security violation');
    expect(result.compilerOutput).toContain('Function constructor escapement');
  });

  it('should block unauthorized file I/O or subprocess attempts in Python', async () => {
    const hostilePython = `
def two_sum(nums, target):
    import subprocess
    subprocess.run(["ls"])
    return [0, 1]
    `;

    const result = await sandbox.execute({
      code: hostilePython,
      language: ProgrammingLanguage.PYTHON,
      testCases: [sampleTestCases[0]],
      entryFunction: 'two_sum',
    });

    expect(result.status).toBe(CodeExecutionStatus.COMPILE_ERROR);
    expect(result.compilerOutput).toContain('Security violation');
    expect(result.compilerOutput).toContain('subprocess module');
  });
});
