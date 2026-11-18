import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

async function run() {
  console.log('🧪 Starting Phase 8 Independent Evaluation Engine End-to-End Verification...');

  // 1. Authenticate / Register test user
  const testEmail = `eval_test_${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'Evaluation Engine Test Candidate',
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
  console.log(`✅ 2. Retrieved question: "${selectedQuestion.title}" (Competency ID: ${selectedQuestion.competencyId})`);

  // 3. Create interview session
  const createRes = await fetch(`${API_BASE}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      domain: 'sde',
      targetRole: 'Staff Distributed Systems Engineer',
      questionId: selectedQuestion.id,
      companyCategory: 'faang_style',
      mode: 'assessment',
      durationMinutes: 20,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Create session failed: ${await createRes.text()}`);
  }
  const session = await createRes.json();
  console.log(`✅ 3. Created interview session: ${session.id}`);

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

  const capturedEvidence = [];
  socket.on('evidence.recorded', (evt) => {
    const ev = evt.evidence || evt;
    capturedEvidence.push(ev);
    console.log(`📡 [WS Event] evidence.recorded -> Quality: ${ev.reasoningQuality}, Claims: ${ev.technicalClaims?.length || 0}`);
  });

  // 5. Join session room and wait for session.ready
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.log('⚡ Proceeding after handshake timeout');
      resolve();
    }, 4000);
    socket.once('session.ready', () => {
      clearTimeout(timer);
      console.log('✅ session.ready event received from bridge!');
      resolve();
    });
    socket.emit('session.join', { sessionId: session.id });
  });

  await new Promise((r) => setTimeout(r, 500));

  // 6. Send substantive technical answer
  console.log('💬 5. Candidate providing detailed technical answer...');
  const candidateAnswer = `In production, consistent hashing utilizes a hash ring abstraction to map servers and keys uniformly. We implement virtual nodes per physical host to prevent non-uniform distribution and mitigate hot spots during failovers. When a server crashes or leaves, only the keys belonging to that node are moved to the clockwise successor, keeping key migration localized and bounding p99 latency spikes under 15ms.`;

  socket.emit('message.send', {
    sessionId: session.id,
    text: candidateAnswer,
  });

  // Wait for evidence to be recorded
  console.log('⏳ 6. Awaiting background evidence mining...');
  const waitStart = Date.now();
  while (capturedEvidence.length === 0 && Date.now() - waitStart < 8000) {
    await new Promise((r) => setTimeout(r, 400));
  }
  await new Promise((r) => setTimeout(r, 500));

  // 7. End session
  console.log('🛑 7. Concluding interview session...');
  const endRes = await fetch(`${API_BASE}/interviews/${session.id}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!endRes.ok) {
    throw new Error(`End session failed: ${await endRes.text()}`);
  }
  const endedSession = await endRes.json();
  console.log(`✅ Session marked completed: Status = ${endedSession.status}`);

  // 8. Run Independent Evaluation Engine
  console.log('⚖️ 8. Triggering POST /api/interviews/:id/evaluation...');
  const evalRes = await fetch(`${API_BASE}/interviews/${session.id}/evaluation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!evalRes.ok) {
    throw new Error(`Evaluation failed: ${await evalRes.text()}`);
  }
  const evaluationReport = await evalRes.json();
  console.log('📋 Evaluation Report Generated Successfully:');
  console.log({
    id: evaluationReport.id,
    overallScore: `${evaluationReport.overallScore}/4.0`,
    overallRating: evaluationReport.overallRating,
    evaluatorModel: evaluationReport.evaluatorModel,
    competenciesCount: evaluationReport.competencyScores.length,
    strengthsCount: evaluationReport.strengths.length,
    weaknessesCount: evaluationReport.weaknesses.length,
    recommendationsCount: evaluationReport.recommendations.length,
  });

  console.log('\n--- Executive Summary ---');
  console.log(evaluationReport.summary);

  console.log('\n--- Competency Scores ---');
  for (const cs of evaluationReport.competencyScores) {
    console.log(`- ${cs.competencyName}: Score ${cs.score}/4.0 (Rating: ${cs.rating})`);
    console.log(`  Justification: ${cs.justification}`);
    console.log(`  Cited Evidence Records: [${(cs.evidenceRefs || []).join(', ')}]`);
  }

  // 9. Verify REST GET /api/interviews/:id/evaluation
  console.log('\n🔍 9. Verifying GET /api/interviews/:id/evaluation persistence in PostgreSQL...');
  const getEvalRes = await fetch(`${API_BASE}/interviews/${session.id}/evaluation`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!getEvalRes.ok) {
    throw new Error(`Fetch evaluation failed: ${await getEvalRes.text()}`);
  }
  const persistedReport = await getEvalRes.json();
  if (persistedReport.id !== evaluationReport.id) {
    throw new Error(`Mismatch in persisted evaluation ID: expected ${evaluationReport.id}, got ${persistedReport.id}`);
  }
  console.log('✅ PostgreSQL persistence verified! Evaluation retrieved cleanly.');

  // Clean up
  socket.disconnect();
  console.log('🎉 Phase 8 Independent Evaluation Engine Live End-to-End Verification COMPLETED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Error during Phase 8 verification:', err);
  process.exit(1);
});
