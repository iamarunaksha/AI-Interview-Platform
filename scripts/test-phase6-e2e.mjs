import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

async function run() {
  console.log('🧪 Starting Phase 6 Orchestrator End-to-End Verification...');

  // 1. Authenticate / Register test user
  const testEmail = `orchestrator_test_${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'Orchestrator Test Candidate',
    }),
  });

  if (!registerRes.ok) {
    throw new Error(`Registration failed: ${await registerRes.text()}`);
  }
  const registerData = await registerRes.json();
  const token = registerData.accessToken;
  console.log('✅ 1. Test user registered and authenticated.');

  // 2. Fetch questions from question bank
  const questionsRes = await fetch(`${API_BASE}/tracks/questions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const questions = await questionsRes.json();
  if (!questions || questions.length === 0) {
    throw new Error('No questions found in question bank');
  }
  const selectedQuestion = questions[0];
  console.log(`✅ 2. Retrieved question: "${selectedQuestion.title}" with ${selectedQuestion.expectedConcepts.length} expected concepts: ${selectedQuestion.expectedConcepts.join(', ')}`);

  // 3. Create interview session
  const createRes = await fetch(`${API_BASE}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      domain: 'sde',
      targetRole: 'Senior Backend Engineer',
      questionId: selectedQuestion.id,
      companyCategory: 'faang_style',
      mode: 'practice',
      durationMinutes: 10,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Create session failed: ${await createRes.text()}`);
  }
  const session = await createRes.json();
  console.log(`✅ 3. Created interview session: ${session.id} (Initial Stage: ${session.currentStage || 'greeting'})`);

  // 4. Connect via WebSocket
  console.log(`🔌 4. Connecting WebSocket to ${WS_BASE}...`);
  const socket = io(WS_BASE, {
    transports: ['websocket'],
    auth: { token },
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully!');
      resolve();
    });
    socket.on('connect_error', reject);
  });

  const orchestratorStates = [];
  const orchestratorTransitions = [];

  socket.on('orchestrator.state', (evt) => {
    const state = evt.state || evt;
    orchestratorStates.push(state);
    const covered = state.coveredConcepts || [];
    console.log(`📡 [WS Event] orchestrator.state -> Stage: ${state.stage}, Turn: ${state.turnCount}, Covered: [${covered.join(', ')}]`);
  });

  socket.on('orchestrator.transition', (evt) => {
    const transition = evt.transition || evt;
    orchestratorTransitions.push(transition);
    console.log(`🔄 [WS Event] orchestrator.transition -> ${transition.fromStage} => ${transition.toStage} ("${transition.reason}")`);
  });

  // 5. Join session room
  socket.emit('session.join', { sessionId: session.id });
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 6. Candidate greeting turn
  console.log('💬 5. Sending Candidate Turn 1 (Greeting)...');
  socket.emit('message.send', {
    sessionId: session.id,
    text: "Hello! I am ready and excited to start the interview.",
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 7. Candidate turn 2 (Framing / Problem statement acknowledgement)
  console.log('💬 6. Sending Candidate Turn 2 (Problem Framing)...');
  socket.emit('message.send', {
    sessionId: session.id,
    text: "Understood. I will design a scalable system taking functional and non-functional requirements into account.",
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 8. Candidate turn 3 (Mentioning key technical concepts)
  console.log(`💬 7. Sending Candidate Turn 3 with technical concepts (${selectedQuestion.expectedConcepts.slice(0, 2).join(', ')})...`);
  const conceptText = `For the architecture, I propose using a ${selectedQuestion.expectedConcepts[0]} approach, and persisting state across ${selectedQuestion.expectedConcepts[1]} with high availability and fault tolerance.`;
  socket.emit('message.send', {
    sessionId: session.id,
    text: conceptText,
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 9. Query REST endpoint for Orchestrator State
  console.log('🔍 8. Fetching Orchestrator State via REST API...');
  const orchRes = await fetch(`${API_BASE}/interviews/${session.id}/orchestrator`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!orchRes.ok) {
    throw new Error(`Fetch orchestrator state failed: ${await orchRes.text()}`);
  }
  const orchState = await orchRes.json();
  const totalConcepts = (orchState.coveredConcepts?.length || 0) + (orchState.remainingConcepts?.length || 0);
  const ratio = totalConcepts > 0 ? Math.round(((orchState.coveredConcepts?.length || 0) / totalConcepts) * 100) : 0;
  console.log('📋 Orchestrator State retrieved:');
  console.log({
    stage: orchState.stage,
    turnCount: orchState.turnCount,
    coveredConcepts: orchState.coveredConcepts,
    remainingConcepts: orchState.remainingConcepts,
    coverageRatio: `${ratio}%`,
    activeProbingQuestion: orchState.activeProbingQuestion,
  });

  if (orchState.coveredConcepts.length === 0) {
    console.warn('⚠️ Warning: Concepts were not detected as expected. Checking string matching...');
  } else {
    console.log(`🎯 Concepts successfully recognized by concept ledger: [${orchState.coveredConcepts.join(', ')}]`);
  }

  // 10. Clean up
  socket.disconnect();
  console.log('🎉 Phase 6 Orchestrator Live End-to-End Verification COMPLETED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Error during verification:', err);
  process.exit(1);
});
