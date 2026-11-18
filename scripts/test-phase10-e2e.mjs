import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

async function run() {
  console.log('🧪 Starting Phase 10 Coding Interview Environment Live Verification...');

  // 1. Authenticate / Register test user
  const testEmail = `coding_test_${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'Coding Environment Candidate',
    }),
  });

  if (!registerRes.ok) {
    throw new Error(`Registration failed: ${await registerRes.text()}`);
  }
  const registerData = await registerRes.json();
  const token = registerData.accessToken;
  console.log('✅ 1. Test user registered and authenticated.');

  // 2. Fetch coding problems from API
  const problemsRes = await fetch(`${API_BASE}/coding/problems`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!problemsRes.ok) {
    throw new Error(`Failed to list problems: ${await problemsRes.text()}`);
  }
  const problems = await problemsRes.json();
  console.log(`✅ 2. Retrieved ${problems.length} coding interview problems from catalog.`);
  if (!problems.some((p) => p.id === 'two-sum')) {
    throw new Error('Expected "two-sum" problem to be present in problems catalog');
  }

  // 3. Fetch specific problem details
  const problemRes = await fetch(`${API_BASE}/coding/problems/two-sum`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!problemRes.ok) {
    throw new Error(`Failed to get two-sum problem: ${await problemRes.text()}`);
  }
  const twoSumProblem = await problemRes.json();
  console.log(`✅ 3. Fetched problem "${twoSumProblem.title}" (${twoSumProblem.difficulty}) with ${twoSumProblem.testCases.length} test suites.`);

  // 4. Test REST Execution: Correct Two Sum solution
  const correctSolution = `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`;
  const execRes = await fetch(`${API_BASE}/coding/execute?problemId=two-sum`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      code: correctSolution,
      language: 'typescript',
    }),
  });
  if (!execRes.ok) {
    throw new Error(`Code execution failed: ${await execRes.text()}`);
  }
  const execResult = await execRes.json();
  console.log(`✅ 4. Correct TypeScript solution execution: status=${execResult.status}, passed=${execResult.passedTests}/${execResult.totalTests} in ${execResult.runtimeMs}ms.`);
  if (execResult.status !== 'PASSED' || execResult.passedTests !== execResult.totalTests) {
    throw new Error(`Expected all tests to pass, got: ${JSON.stringify(execResult)}`);
  }

  // 5. Test REST Execution: Buggy / failing solution
  const failingSolution = `
function twoSum(nums, target) {
  return [0, 0];
}
`;
  const failRes = await fetch(`${API_BASE}/coding/execute?problemId=two-sum`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      code: failingSolution,
      language: 'typescript',
    }),
  });
  const failResult = await failRes.json();
  console.log(`✅ 5. Buggy solution execution correctly flagged: status=${failResult.status}, passed=${failResult.passedTests}/${failResult.totalTests}.`);
  if (failResult.status !== 'FAILED' || failResult.passedTests === failResult.totalTests) {
    throw new Error(`Expected failing solution to fail, got status: ${failResult.status}`);
  }

  // 6. Test REST Execution: Infinite loop defense (sandbox timeout)
  const infiniteLoopCode = `
function twoSum(nums, target) {
  while (true) {}
}
`;
  const loopRes = await fetch(`${API_BASE}/coding/execute?problemId=two-sum`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      code: infiniteLoopCode,
      language: 'typescript',
    }),
  });
  const loopResult = await loopRes.json();
  console.log(`✅ 6. Infinite loop defense verified: status=${loopResult.status} (Execution terminated within sandbox timeout).`);
  if (loopResult.status !== 'TIMED_OUT') {
    throw new Error(`Expected TIMED_OUT status, got: ${loopResult.status}`);
  }

  // 7. Create interview session for live WebSocket testing
  const createRes = await fetch(`${API_BASE}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      domain: 'sde',
      targetRole: 'Senior Full Stack Engineer',
      companyCategory: 'faang_style',
      mode: 'assessment',
      durationMinutes: 30,
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create interview session: ${await createRes.text()}`);
  }
  const session = await createRes.json();
  console.log(`✅ 7. Created interview session: ${session.id}`);

  // 8. Connect to WebSocket Gateway
  console.log('🔄 Connecting to WebSocket Gateway for live code sync and execution...');
  const socket = io(WS_BASE, {
    transports: ['websocket'],
    auth: { token },
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);

    socket.on('connect', () => {
      console.log('✅ 8. Connected to WebSocket Gateway.');
      socket.emit('session.join', { sessionId: session.id });
    });

    socket.on('session.ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.on('session.error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`WebSocket session error: ${JSON.stringify(err)}`));
    });
  });

  // 9. Sync code buffer via WebSocket
  socket.emit('code.change', {
    sessionId: session.id,
    code: correctSolution,
    language: 'typescript',
  });
  console.log('✅ 9. Emitted code.change event to sync code buffer.');

  // 10. Run code via WebSocket and await results
  console.log('🔄 Emitting code.run over WebSocket...');
  const wsResult = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('code.result WebSocket timeout')), 10000);

    socket.on('code.status', (status) => {
      console.log(`   [WS code.status] status=${status.status}: ${status.message}`);
    });

    socket.on('code.result', (result) => {
      clearTimeout(timeout);
      resolve(result);
    });

    socket.emit('code.run', {
      sessionId: session.id,
      code: correctSolution,
      language: 'typescript',
      problemId: 'two-sum',
    });
  });

  console.log(`✅ 10. Received code.result via WebSocket: status=${wsResult.status}, passed=${wsResult.passedTests}/${wsResult.totalTests}`);
  if (wsResult.status !== 'PASSED' || wsResult.passedTests !== wsResult.totalTests) {
    throw new Error(`Expected WebSocket run to pass all tests, got: ${JSON.stringify(wsResult)}`);
  }

  socket.disconnect();
  console.log('\n🎉 ALL PHASE 10 VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Phase 10 verification failed:', err);
  process.exit(1);
});
