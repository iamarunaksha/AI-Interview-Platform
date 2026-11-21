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
  {
    id: 'merge-k-sorted-lists',
    title: 'Merge K Sorted Lists',
    difficulty: InterviewDifficulty.HARD,
    description:
      'You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked list and return it. Represented as arrays in this sandbox.',
    examples: [
      {
        input: 'lists = [[1,4,5],[1,3,4],[2,6]]',
        output: '[1,1,2,3,4,4,5,6]',
      },
      {
        input: 'lists = []',
        output: '[]',
      },
      {
        input: 'lists = [[]]',
        output: '[]',
      },
    ],
    constraints: [
      'k == lists.length',
      '0 <= k <= 10^4',
      '0 <= lists[i].length <= 500',
      '-10^4 <= lists[i][j] <= 10^4',
      'lists[i] is sorted in ascending order.',
    ],
    entryFunction: 'mergeKLists',
    starterCode: {
      [ProgrammingLanguage.TYPESCRIPT]: `function mergeKLists(lists: number[][]): number[] {
  // Use a min-heap or divide-and-conquer merge
  const result: number[] = [];
  const flat = lists.flat().sort((a, b) => a - b);
  return flat;
}`,
      [ProgrammingLanguage.JAVASCRIPT]: `function mergeKLists(lists) {
  // Use min-heap or divide-and-conquer merge
  return lists.flat().sort((a, b) => a - b);
}`,
      [ProgrammingLanguage.PYTHON]: `def mergeKLists(lists):
    import heapq
    merged = []
    for sublist in lists:
        merged.extend(sublist)
    return sorted(merged)`,
    },
    testCases: [
      {
        id: 'tc-1',
        description: 'Merge three sorted arrays',
        input: [
          [
            [1, 4, 5],
            [1, 3, 4],
            [2, 6],
          ],
        ],
        expectedOutput: [1, 1, 2, 3, 4, 4, 5, 6],
      },
      {
        id: 'tc-2',
        description: 'Empty lists array',
        input: [[]],
        expectedOutput: [],
      },
      {
        id: 'tc-3',
        description: 'Array with single empty list',
        input: [[[]]],
        expectedOutput: [],
      },
      {
        id: 'tc-4',
        description: 'Lists with negative numbers',
        input: [
          [
            [-10, -5, 0],
            [-8, -2, 4],
            [1, 3, 9],
          ],
        ],
        expectedOutput: [-10, -8, -5, -2, 0, 1, 3, 4, 9],
      },
    ],
  },
  {
    id: 'course-schedule',
    title: 'Course Schedule & Dependency Resolution',
    difficulty: InterviewDifficulty.MEDIUM,
    description:
      'There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first if you want to take course `a`. Return `true` if you can finish all courses. Otherwise, return `false`.',
    examples: [
      {
        input: 'numCourses = 2, prerequisites = [[1, 0]]',
        output: 'true',
        explanation:
          'To take course 1 you should have finished course 0. So it is possible.',
      },
      {
        input: 'numCourses = 2, prerequisites = [[1, 0], [0, 1]]',
        output: 'false',
        explanation:
          'Course 1 requires 0 and course 0 requires 1. A cycle exists so it is impossible.',
      },
    ],
    constraints: [
      '1 <= numCourses <= 2000',
      '0 <= prerequisites.length <= 5000',
      'prerequisites[i].length == 2',
      '0 <= ai, bi < numCourses',
      'All the pairs prerequisites[i] are unique.',
    ],
    entryFunction: 'canFinish',
    starterCode: {
      [ProgrammingLanguage.TYPESCRIPT]: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  // Kahn's algorithm (topological sort via indegree) or DFS cycle detection
  const inDegree = new Array(numCourses).fill(0);
  const adj = Array.from({ length: numCourses }, () => [] as number[]);

  for (const [course, pre] of prerequisites) {
    adj[pre].push(course);
    inDegree[course]++;
  }

  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    visited++;
    for (const neighbor of adj[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return visited === numCourses;
}`,
      [ProgrammingLanguage.JAVASCRIPT]: `function canFinish(numCourses, prerequisites) {
  const inDegree = new Array(numCourses).fill(0);
  const adj = Array.from({ length: numCourses }, () => []);

  for (const [course, pre] of prerequisites) {
    adj[pre].push(course);
    inDegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    visited++;
    for (const neighbor of adj[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return visited === numCourses;
}`,
      [ProgrammingLanguage.PYTHON]: `def canFinish(numCourses: int, prerequisites: list) -> bool:
    from collections import deque
    in_degree = [0] * numCourses
    adj = [[] for _ in range(numCourses)]
    for course, pre in prerequisites:
        adj[pre].append(course)
        in_degree[course] += 1
    queue = deque([i for i in range(numCourses) if in_degree[i] == 0])
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    return visited == numCourses`,
    },
    testCases: [
      {
        id: 'tc-1',
        description: 'Linear dependency chain',
        input: [2, [[1, 0]]],
        expectedOutput: true,
      },
      {
        id: 'tc-2',
        description: 'Direct 2-node cycle',
        input: [
          2,
          [
            [1, 0],
            [0, 1],
          ],
        ],
        expectedOutput: false,
      },
      {
        id: 'tc-3',
        description: 'Multiple independent courses',
        input: [3, []],
        expectedOutput: true,
      },
      {
        id: 'tc-4',
        description: 'Complex 4-node DAG',
        input: [
          4,
          [
            [1, 0],
            [2, 0],
            [3, 1],
            [3, 2],
          ],
        ],
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
