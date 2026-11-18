import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CodingSandboxService } from './coding-sandbox.service.js';
import {
  ProgrammingLanguage,
  InterviewDifficulty,
  type CodingProblem,
  type CodeExecutionResult,
  type CodeRunRequest,
} from '@interviewai/shared-types';

export const BUILTIN_CODING_PROBLEMS: CodingProblem[] = [
  {
    id: 'two-sum',
    title: 'Two Sum Target Indices',
    difficulty: InterviewDifficulty.EASY,
    description:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. Return the answer sorted in ascending order.',
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Exactly one valid answer exists.',
    ],
    entryFunction: 'twoSum',
    starterCode: {
      [ProgrammingLanguage.TYPESCRIPT]: `function twoSum(nums: number[], target: number): number[] {
  // Write your solution here
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      [ProgrammingLanguage.JAVASCRIPT]: `function twoSum(nums, target) {
  // Write your solution here
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      [ProgrammingLanguage.PYTHON]: `def twoSum(nums, target):
    # Write your solution here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
    },
    testCases: [
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
        description: 'Duplicate values',
        input: [[3, 3], 6],
        expectedOutput: [0, 1],
      },
      {
        id: 'tc-4',
        description: 'Negative numbers',
        input: [[-1, -2, -3, -4, -5], -8],
        expectedOutput: [2, 4],
        isHidden: true,
      },
    ],
  },
  {
    id: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: InterviewDifficulty.MEDIUM,
    description:
      'Given a string `s`, find the length of the longest substring without duplicate characters.',
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.',
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3.',
      },
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
    ],
    entryFunction: 'lengthOfLongestSubstring',
    starterCode: {
      [ProgrammingLanguage.TYPESCRIPT]: `function lengthOfLongestSubstring(s: string): number {
  // Write your sliding window solution here
  let maxLength = 0;
  let start = 0;
  const charMap = new Map<string, number>();

  for (let end = 0; end < s.length; end++) {
    const char = s[end];
    if (charMap.has(char) && charMap.get(char)! >= start) {
      start = charMap.get(char)! + 1;
    }
    charMap.set(char, end);
    maxLength = Math.max(maxLength, end - start + 1);
  }

  return maxLength;
}`,
      [ProgrammingLanguage.JAVASCRIPT]: `function lengthOfLongestSubstring(s) {
  let maxLength = 0;
  let start = 0;
  const charMap = new Map();

  for (let end = 0; end < s.length; end++) {
    const char = s[end];
    if (charMap.has(char) && charMap.get(char) >= start) {
      start = charMap.get(char) + 1;
    }
    charMap.set(char, end);
    maxLength = Math.max(maxLength, end - start + 1);
  }

  return maxLength;
}`,
      [ProgrammingLanguage.PYTHON]: `def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    max_len = 0
    start = 0
    for end, char in enumerate(s):
        if char in char_map and char_map[char] >= start:
            start = char_map[char] + 1
        char_map[char] = end
        max_len = max(max_len, end - start + 1)
    return max_len`,
    },
    testCases: [
      {
        id: 'tc-1',
        description: 'Standard repeated characters',
        input: 'abcabcbb',
        expectedOutput: 3,
      },
      {
        id: 'tc-2',
        description: 'All same character',
        input: 'bbbbb',
        expectedOutput: 1,
      },
      {
        id: 'tc-3',
        description: 'Empty string',
        input: '',
        expectedOutput: 0,
      },
      {
        id: 'tc-4',
        description: 'Substring in middle',
        input: 'pwwkew',
        expectedOutput: 3,
      },
    ],
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses Matching',
    difficulty: InterviewDifficulty.EASY,
    description:
      'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets in the correct order.',
    examples: [
      {
        input: 's = "()"',
        output: 'true',
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
      },
      {
        input: 's = "(]"',
        output: 'false',
      },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only "()[]{}"',
    ],
    entryFunction: 'isValid',
    starterCode: {
      [ProgrammingLanguage.TYPESCRIPT]: `function isValid(s: string): boolean {
  // Use a stack
  const stack: string[] = [];
  const map: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

  for (const char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else {
      if (stack.pop() !== map[char]) {
        return false;
      }
    }
  }

  return stack.length === 0;
}`,
      [ProgrammingLanguage.JAVASCRIPT]: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };

  for (const char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else {
      if (stack.pop() !== map[char]) return false;
    }
  }

  return stack.length === 0;
}`,
      [ProgrammingLanguage.PYTHON]: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
    return not stack`,
    },
    testCases: [
      {
        id: 'tc-1',
        description: 'Simple matching parentheses',
        input: '()',
        expectedOutput: true,
      },
      {
        id: 'tc-2',
        description: 'Multiple matching pairs',
        input: '()[]{}',
        expectedOutput: true,
      },
      {
        id: 'tc-3',
        description: 'Mismatched types',
        input: '(]',
        expectedOutput: false,
      },
      {
        id: 'tc-4',
        description: 'Nested valid brackets',
        input: '{[()]}',
        expectedOutput: true,
      },
    ],
  },
];

@Injectable()
export class CodingService {
  private readonly logger = new Logger(CodingService.name);

  constructor(private readonly sandbox: CodingSandboxService) {}

  /**
   * List all available technical coding problems.
   */
  listProblems(): CodingProblem[] {
    return BUILTIN_CODING_PROBLEMS;
  }

  /**
   * Get a specific coding problem by ID.
   */
  getProblem(problemId: string): CodingProblem {
    const problem = BUILTIN_CODING_PROBLEMS.find((p) => p.id === problemId);
    if (!problem) {
      throw new NotFoundException(`Coding problem '${problemId}' not found.`);
    }
    return problem;
  }

  /**
   * Execute candidate code against the problem test suite or custom test cases.
   */
  async runCode(
    request: CodeRunRequest,
    problemId?: string,
  ): Promise<CodeExecutionResult> {
    let testCases = request.testCases;
    let entryFunction = request.entryFunction;

    if (problemId) {
      const problem = this.getProblem(problemId);
      testCases = problem.testCases;
      entryFunction = problem.entryFunction;
    }

    if (!testCases || testCases.length === 0) {
      // Default sample test case
      testCases = [
        {
          id: 'sample-1',
          input: [],
          expectedOutput: null,
          description: 'Basic sanity check',
        },
      ];
    }

    return this.sandbox.execute({
      code: request.code,
      language: request.language,
      testCases,
      entryFunction,
    });
  }
}
