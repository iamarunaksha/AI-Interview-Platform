import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

async function run() {
  console.log('🧪 Starting Phase 7 Evidence Collection Engine End-to-End Verification...');

  // 1. Authenticate / Register test user
  const testEmail = `evidence_test_${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'Evidence Engine Test Candidate',
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
  console.log(`   Expected concepts: ${selectedQuestion.expectedConcepts.join(', ')}`);

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
      mode: 'practice',
      durationMinutes: 15,
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

  const capturedEvidenceEvents = [];
  socket.on('evidence.recorded', (evt) => {
    const ev = evt.evidence || evt;
    capturedEvidenceEvents.push(ev);
    console.log(`📡 [WS Event] evidence.recorded -> Quality: ${ev.reasoningQuality}, Claims: ${ev.technicalClaims?.length || 0}, Practical: ${ev.practicalExperience}`);
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

  // Short pause to ensure bridge callbacks are set
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 6. Send rich candidate answer with technical claims & practical experience
  console.log('💬 5. Candidate providing high-depth technical explanation...');
  const richCandidateAnswer = `In our production environment with 50+ nodes, we implemented consistent hashing using a hash ring abstraction. We mapped both server nodes and cache keys to a circular 64-bit integer space. To avoid hot spots and handle failover without a cache stampede during node outages, we introduced 150 virtual nodes per physical host. When a node crashes, only the keys between that node and its predecessor are affected, so failover latency stays under 10ms.`;

  socket.emit('message.send', {
    sessionId: session.id,
    text: richCandidateAnswer,
  });

  // Wait for background evidence extraction
  console.log('⏳ 6. Awaiting background evidence mining and extraction...');
  const startWait = Date.now();
  while (capturedEvidenceEvents.length === 0 && Date.now() - startWait < 8000) {
    await new Promise((r) => setTimeout(r, 400));
  }
  // Brief pause to ensure DB commit
  await new Promise((r) => setTimeout(r, 500));

  // 7. Query Evidence via REST API
  console.log('🔍 7. Fetching Session Evidence from PostgreSQL via REST API...');
  const evidenceRes = await fetch(`${API_BASE}/interviews/${session.id}/evidence`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!evidenceRes.ok) {
    throw new Error(`Fetch evidence failed: ${await evidenceRes.text()}`);
  }
  const evidenceRecords = await evidenceRes.json();
  console.log(`📋 Total Evidence Records Retrieved: ${evidenceRecords.length}`);

  if (evidenceRecords.length === 0) {
    throw new Error('Expected at least 1 evidence record to be extracted and saved');
  }

  const primaryEvidence = evidenceRecords[0];
  console.log('🎯 Evidence Record Analysis:');
  console.log({
    id: primaryEvidence.id,
    reasoningQuality: primaryEvidence.reasoningQuality,
    practicalExperience: primaryEvidence.practicalExperience,
    confidence: `${Math.round(primaryEvidence.confidence * 100)}%`,
    technicalClaimsCount: primaryEvidence.technicalClaims.length,
    correctConceptsCount: primaryEvidence.correctConcepts.length,
    missingConceptsCount: primaryEvidence.missingConcepts.length,
    notes: primaryEvidence.notes,
  });

  console.log('   Technical Claims extracted:', primaryEvidence.technicalClaims);
  console.log('   Correct Concepts identified:', primaryEvidence.correctConcepts);

  if (!primaryEvidence.practicalExperience) {
    console.warn('⚠️ Practical experience was not detected as true. Check keyword list.');
  } else {
    console.log('⚡ Practical production experience successfully detected and verified!');
  }

  // 8. Test Direct Extract Endpoint
  console.log('🧪 8. Testing direct POST /interviews/:id/evidence/extract endpoint...');
  const directExtractRes = await fetch(`${API_BASE}/interviews/${session.id}/evidence/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      questionAsked: 'What happens when a node in the ring crashes?',
      candidateAnswer: 'When a node crashes in production, only keys between that node and its predecessor are reassigned to the clockwise successor.',
      competencyId: selectedQuestion.competencyId,
      expectedConcepts: ['Clockwise successor lookup', 'Hash ring abstraction'],
    }),
  });

  if (!directExtractRes.ok) {
    throw new Error(`Direct extract failed: ${await directExtractRes.text()}`);
  }
  const directRecord = await directExtractRes.json();
  console.log(`✅ Direct extract succeeded: Evidence ID ${directRecord.id} (Quality: ${directRecord.reasoningQuality})`);

  // 9. Clean up
  socket.disconnect();
  console.log('🎉 Phase 7 Evidence Collection Engine Live End-to-End Verification COMPLETED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Error during Phase 7 verification:', err);
  process.exit(1);
});
