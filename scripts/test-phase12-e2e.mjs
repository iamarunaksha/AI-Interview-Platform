import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

async function run() {
  console.log('🧪 ============================================================');
  console.log('🧪 Starting Phase 12 SAP Interview Specialization Live E2E Verification...');
  console.log('🧪 ============================================================');

  // 1. Authenticate / Register test user
  const testEmail = `sap_architect_${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'SAP Solution Architect Candidate',
    }),
  });

  if (!registerRes.ok) {
    throw new Error(`Registration failed: ${await registerRes.text()}`);
  }
  const registerData = await registerRes.json();
  const token = registerData.accessToken;
  console.log('✅ 1. Candidate registered and authenticated with JWT.');

  // 2. Query SAP Competencies from Question Bank
  const compRes = await fetch(`${API_BASE}/tracks/competencies?domain=sap`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!compRes.ok) {
    throw new Error(`Failed to fetch SAP competencies: ${await compRes.text()}`);
  }
  const competencies = await compRes.json();
  console.log(`✅ 2. Retrieved ${competencies.length} SAP enterprise competencies.`);
  
  const expectedPillars = [
    'sap_abap_rap',
    'sap_s4hana_core_clean_core',
    'sap_btp_cloud_integration',
    'sap_tm_logistics',
    'sap_fico_financials',
  ];
  for (const pillar of expectedPillars) {
    const found = competencies.find((c) => c.slug === pillar);
    if (!found) {
      throw new Error(`Missing expected SAP enterprise competency: ${pillar}`);
    }
    console.log(`   ✓ Found pillar: "${found.name}" (${found.slug})`);
  }

  // 3. Query SAP Questions
  const qRes = await fetch(`${API_BASE}/tracks/questions?domain=sap`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!qRes.ok) {
    throw new Error(`Failed to fetch SAP questions: ${await qRes.text()}`);
  }
  const questions = await qRes.json();
  console.log(`✅ 3. Retrieved ${questions.length} SAP enterprise interview questions.`);
  if (questions.length < 5) {
    throw new Error(`Expected at least 5 SAP questions, received ${questions.length}`);
  }
  console.log(`   Sample question: "${questions[0].title}" (${questions[0].difficulty})`);

  // 4. Create SAP Interview Session
  const createRes = await fetch(`${API_BASE}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      domain: 'sap',
      targetRole: 'SAP S/4HANA Solution Architect',
      companyCategory: 'sap_consulting',
      difficulty: 'hard',
      mode: 'practice',
      durationMinutes: 30,
      questionId: questions[0].id,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create SAP interview session: ${await createRes.text()}`);
  }
  const session = await createRes.json();
  console.log(`✅ 4. Created SAP interview session: ${session.id} for "${session.targetRole}"`);

  // 5. Connect to WebSocket Gateway
  console.log('🔄 Connecting to WebSocket Gateway for live interview flow...');
  const socket = io(WS_BASE, {
    transports: ['websocket'],
    auth: { token },
  });

  let assistantResponded = false;
  let evidenceExtracted = false;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket live turn timeout')), 20000);

    socket.on('connect', () => {
      console.log('✅ 5. Connected to /interview WebSocket namespace.');
      socket.emit('session.join', { sessionId: session.id });
    });

    socket.on('session.ready', (data) => {
      console.log(`✅ 6. Received session.ready for session: ${data.sessionId}`);
      
      // Candidate speaks with deep SAP technical domain knowledge
      console.log('🗣️ Sending candidate response containing SAP Clean Core & ACDOCA concepts...');
      socket.emit('message.send', {
        sessionId: session.id,
        text: 'In our enterprise S/4HANA architecture, we strictly enforce Clean Core Tier 2 developer extensibility with released C1 APIs. We avoid direct database updates to ACDOCA and ensure the RAP transaction manager governs the save sequence without calling COMMIT WORK, while using CDS view code pushdown for heavy calculations.',
      });
    });

    socket.on('assistant.response', (data) => {
      console.log(`🤖 Assistant responded: "${data.text?.slice(0, 75)}..."`);
      assistantResponded = true;
    });

    socket.on('evidence.recorded', (data) => {
      console.log(`📋 Real-time evidence extracted: ${data.technicalClaims?.length || 0} claims, Reasoning: ${data.reasoningQuality}, Practical Experience: ${data.practicalExperience}`);
      evidenceExtracted = true;
      clearTimeout(timeout);
      resolve();
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });

  socket.disconnect();
  console.log('✅ 7. Completed real-time dialogue and evidence mining verification.');

  // 8. Conclude Interview Session
  const endRes = await fetch(`${API_BASE}/interviews/${session.id}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!endRes.ok) {
    throw new Error(`Failed to end session: ${await endRes.text()}`);
  }
  console.log('✅ 8. Interview session transitioned to concluded state.');

  // 9. Generate Independent SAP Evaluation Report
  console.log('📊 Generating independent evaluation report for SAP interview...');
  const evalRes = await fetch(`${API_BASE}/interviews/${session.id}/evaluation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!evalRes.ok) {
    throw new Error(`Failed to generate evaluation: ${await evalRes.text()}`);
  }
  const evaluation = await evalRes.json();
  console.log(`✅ 9. Evaluation Scorecard generated: Score ${evaluation.overallScore}/4.0 (${evaluation.overallRating})`);
  console.log(`   Summary: "${evaluation.summary?.slice(0, 95)}..."`);
  console.log(`   Competency Scores: ${evaluation.competencyScores?.length || 0} assessed.`);

  // 10. Fetch Comprehensive Assessment Report
  const reportRes = await fetch(`${API_BASE}/interviews/${session.id}/report`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!reportRes.ok) {
    throw new Error(`Failed to fetch comprehensive report: ${await reportRes.text()}`);
  }
  const report = await reportRes.json();
  console.log('✅ 10. Comprehensive Interview Assessment Report retrieved successfully.');
  console.log(`    - Report ID: ${report.id}`);
  console.log(`    - Candidate Role: ${report.reportData?.candidate?.targetRole}`);
  console.log(`    - Technical Strengths: ${report.reportData?.evaluation?.strengths?.length || 0}`);
  console.log(`    - Actionable Recommendations: ${report.reportData?.evaluation?.recommendations?.length || 0}`);

  console.log('\n🎉 ============================================================');
  console.log('🎉 PHASE 12 LIVE E2E VERIFICATION COMPLETED WITH 100% SUCCESS!');
  console.log('🎉 ============================================================');
}

run().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
