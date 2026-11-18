import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

async function run() {
  console.log('🧪 Starting Phase 9 Interview Reports & Candidate Dashboard Live Verification...');

  // 1. Authenticate / Register test user
  const testEmail = `report_test_${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'Report Engine Candidate',
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

  // 4. Connect via WebSocket and exchange dialogue turns
  console.log('Connecting to WebSocket gateway...');
  const socket = io(WS_BASE, {
    auth: { token },
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket connection timed out')), 10000);

    socket.on('connect', () => {
      console.log(`Connected to WS gateway. Socket ID: ${socket.id}`);
      socket.emit('session.join', { sessionId: session.id });
    });

    socket.on('session.ready', () => {
      console.log('✅ Handshake complete. session.ready received from bridge.');
      clearTimeout(timeout);
      resolve();
    });

    socket.on('session.error', (err) => {
      console.error('WebSocket session error:', err);
      clearTimeout(timeout);
      reject(err);
    });
  });

  // 5. Send technical candidate dialogue turn
  console.log('Sending technical candidate dialogue turn...');
  socket.emit('message.send', {
    text: 'In our production infrastructure, we mitigated cache stampede by using Redis with probabilistic early expiration (XFetch algorithm) and distributed locks via Redlock. This kept our p99 latency strictly under 12ms during 50k RPS spikes.',
  });

  // Wait 1.5s for audio/turn processing
  await new Promise((resolve) => setTimeout(resolve, 1500));
  socket.disconnect();
  console.log('✅ 4. Dialogue turns exchanged via WebSocket.');

  // 6. Record verifiable evidence turn via REST
  const extractRes = await fetch(`${API_BASE}/interviews/${session.id}/evidence/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      questionAsked: 'How did you ensure fault tolerance and low p99 read latency under cache failures?',
      candidateAnswer:
        'We implemented multi-level caching with local Caffeine caches, a distributed Redis cluster with master-replica failover, and circuit breakers via Resilience4j to fall back gracefully without hammering PostgreSQL.',
      competencyId: selectedQuestion.competencyId,
    }),
  });

  if (!extractRes.ok) {
    throw new Error(`Evidence extraction failed: ${await extractRes.text()}`);
  }
  const extractedRecord = await extractRes.json();
  console.log(`✅ 5. Extracted Phase 7 Evidence Record ID: ${extractedRecord.id}`);
  console.log(`   - Reasoning Quality: ${extractedRecord.reasoningQuality}`);
  console.log(`   - Correct Concepts: ${extractedRecord.correctConcepts.join(', ')}`);

  // 7. Trigger Phase 8 Independent Evaluation Engine
  console.log('Triggering independent evaluation engine (POST /api/interviews/:id/evaluation)...');
  const evalRes = await fetch(`${API_BASE}/interviews/${session.id}/evaluation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!evalRes.ok) {
    throw new Error(`Evaluation generation failed: ${await evalRes.text()}`);
  }
  const evaluation = await evalRes.json();
  console.log('✅ 6. Independent evaluation generated:');
  console.log(`   - Overall Score: ${evaluation.overallScore}/4.0`);
  console.log(`   - Overall Rating: ${evaluation.overallRating}`);
  console.log(`   - Summary: ${evaluation.summary.slice(0, 90)}...`);

  // 8. Generate and Retrieve Phase 9 Comprehensive Interview Report
  console.log('Fetching Phase 9 Comprehensive Report (GET /api/interviews/:id/report)...');
  const reportRes = await fetch(`${API_BASE}/interviews/${session.id}/report`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!reportRes.ok) {
    throw new Error(`Fetch report failed: ${await reportRes.text()}`);
  }
  const report = await reportRes.json();
  console.log('✅ 7. Phase 9 Comprehensive Report retrieved:');
  console.log(`   - Report ID: ${report.id}`);
  console.log(`   - Candidate: ${report.candidateName} (${report.candidateEmail})`);
  console.log(`   - Track: ${report.domain.toUpperCase()} - ${report.targetRole}`);
  console.log(`   - Score: ${report.overallScore}/4.0 (${report.overallRating})`);
  console.log(`   - Competency Scores Count: ${report.competencyScores.length}`);
  console.log(`   - Detailed Evidence Count: ${report.detailedEvidence.length}`);
  console.log(`   - Strengths Count: ${report.strengths.length}`);
  console.log(`   - Weaknesses Count: ${report.weaknesses.length}`);
  console.log(`   - Actionable Recommendations: ${report.recommendations.length}`);
  console.log(`   - Suggested Next Difficulty: ${report.suggestedNextDifficulty}`);

  if (!report.competencyScores || report.competencyScores.length === 0) {
    throw new Error('Report missing competency scores!');
  }
  if (!report.detailedEvidence || report.detailedEvidence.length === 0) {
    throw new Error('Report missing detailed evidence records!');
  }

  // 9. Query Candidate Dashboard Analytics (GET /api/reports/dashboard)
  console.log('Fetching Candidate Dashboard Metrics (GET /api/reports/dashboard)...');
  const dashRes = await fetch(`${API_BASE}/reports/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!dashRes.ok) {
    throw new Error(`Fetch dashboard metrics failed: ${await dashRes.text()}`);
  }
  const dashboard = await dashRes.json();
  console.log('✅ 8. Candidate Dashboard Metrics retrieved:');
  console.log(`   - Total Interviews: ${dashboard.totalInterviews}`);
  console.log(`   - Completed Interviews: ${dashboard.completedInterviews}`);
  console.log(`   - Average Score: ${dashboard.averageScore}/4.0`);
  console.log(`   - Highest Score: ${dashboard.highestScore}/4.0`);
  console.log(`   - Competency Performance Records: ${dashboard.competencyPerformance.length}`);
  console.log(`   - Recent Sessions in History: ${dashboard.recentSessions.length}`);
  console.log(`   - Has Report in Recent Session: ${dashboard.recentSessions[0].hasReport}`);
  console.log(`   - AI Next Suggested Difficulty: ${dashboard.recommendedNextStep.suggestedDifficulty}`);
  console.log(`   - AI Recommended Practice Topics: ${dashboard.recommendedNextStep.recommendedTopics.join(', ')}`);

  if (dashboard.totalInterviews < 1) {
    throw new Error('Dashboard totalInterviews should be at least 1');
  }
  if (dashboard.recentSessions[0].hasReport !== true) {
    throw new Error('Dashboard recent session hasReport should be true');
  }

  console.log('\n🎉 ALL PHASE 9 VERIFICATIONS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Phase 9 Verification FAILED:', err);
  process.exit(1);
});
