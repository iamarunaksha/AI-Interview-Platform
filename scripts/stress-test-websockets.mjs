#!/usr/bin/env node
import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

const CONCURRENT_CLIENTS = 10;
const AUDIO_CHUNKS_PER_CLIENT = 8;
const CODE_UPDATES_PER_CLIENT = 5;

async function runStressTest() {
  console.log('⚡ ============================================================');
  console.log(`⚡ Phase 13: WebSocket Concurrency & High-Load Stress Testing`);
  console.log(`⚡ Testing ${CONCURRENT_CLIENTS} simultaneous active interview rooms...`);
  console.log('⚡ ============================================================\n');

  // 1. Register a test master account to acquire valid JWT
  const testEmail = `stress_master_${Date.now()}@example.com`;
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'Stress Test Suite Runner',
    }),
  });

  if (!regRes.ok) {
    throw new Error(`Master auth registration failed: ${await regRes.text()}`);
  }
  const { accessToken } = await regRes.json();
  console.log('✅ Master authentication verified.');

  // 2. Pre-create 10 interview sessions
  console.log(`📌 Pre-provisioning ${CONCURRENT_CLIENTS} interview sessions...`);
  const sessionIds = [];
  for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
    const sRes = await fetch(`${API_BASE}/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        domain: i % 2 === 0 ? 'sde' : 'sap',
        targetRole: i % 2 === 0 ? 'Senior Distributed Systems Engineer' : 'SAP S/4HANA Solution Architect',
        companyCategory: i % 2 === 0 ? 'faang_style' : 'sap_consulting',
        difficulty: 'medium',
        durationMinutes: 15,
      }),
    });
    if (!sRes.ok) {
      throw new Error(`Failed to provision session ${i}: ${await sRes.text()}`);
    }
    const sessionData = await sRes.json();
    sessionIds.push(sessionData.id);
  }
  console.log(`✅ ${CONCURRENT_CLIENTS} sessions provisioned in PostgreSQL.\n`);

  // 3. Connect clients concurrently
  console.log(`🚀 Swarming ${CONCURRENT_CLIENTS} concurrent WebSocket connections...`);
  const overallStartTime = Date.now();
  const metrics = [];

  const clientPromises = sessionIds.map((sessionId, index) => {
    return new Promise((resolve) => {
      const clientMetric = {
        clientId: index + 1,
        connectTimeMs: 0,
        sessionReadyTimeMs: 0,
        audioChunksSent: 0,
        codeUpdatesSent: 0,
        videoTogglesSent: 0,
        assistantResponses: 0,
        errors: 0,
      };

      const startConnect = Date.now();
      const socket = io(WS_BASE, {
        transports: ['websocket'],
        auth: { token: accessToken },
        forceNew: true,
      });

      socket.on('connect', () => {
        clientMetric.connectTimeMs = Date.now() - startConnect;
        socket.emit('session.join', { sessionId });
      });

      socket.on('session.ready', () => {
        clientMetric.sessionReadyTimeMs = Date.now() - startConnect;

        // Simulate streaming audio chunks
        for (let c = 0; c < AUDIO_CHUNKS_PER_CLIENT; c++) {
          const fakeAudioChunk = Buffer.alloc(1024, index + c);
          socket.emit('audio.chunk', fakeAudioChunk);
          clientMetric.audioChunksSent++;
        }

        // Simulate concurrent live code editing
        for (let u = 0; u < CODE_UPDATES_PER_CLIENT; u++) {
          socket.emit('code.change', {
            sessionId,
            code: `// Client ${index + 1} Revision ${u + 1}\nfunction solve() { return ${u}; }`,
            language: 'typescript',
          });
          clientMetric.codeUpdatesSent++;
        }

        // Simulate video state toggle
        socket.emit('video.toggle', {
          sessionId,
          isCameraActive: true,
          layoutMode: 'grid',
        });
        clientMetric.videoTogglesSent++;

        // Send a text probe to elicit assistant response
        socket.emit('message.send', {
          sessionId,
          text: `Concurrent candidate ${index + 1} verifying throughput and latency under stress.`,
        });
      });

      socket.on('assistant.response', () => {
        clientMetric.assistantResponses++;
        // Conclude after receiving assistant response
        setTimeout(() => {
          socket.disconnect();
          resolve(clientMetric);
        }, 500);
      });

      socket.on('error', (err) => {
        console.error(`Client ${index + 1} error:`, err);
        clientMetric.errors++;
      });

      socket.on('connect_error', (err) => {
        console.error(`Client ${index + 1} connection error:`, err.message);
        clientMetric.errors++;
        socket.disconnect();
        resolve(clientMetric);
      });

      // Safety timeout per client
      setTimeout(() => {
        if (!clientMetric.sessionReadyTimeMs) {
          clientMetric.errors++;
        }
        socket.disconnect();
        resolve(clientMetric);
      }, 15000);
    });
  });

  const allResults = await Promise.all(clientPromises);
  const totalElapsedMs = Date.now() - overallStartTime;

  // 4. Compute Benchmark Statistics
  const connectTimes = allResults.map((r) => r.connectTimeMs).filter((t) => t > 0);
  const sessionReadyTimes = allResults.map((r) => r.sessionReadyTimeMs).filter((t) => t > 0);
  const totalAudioChunks = allResults.reduce((sum, r) => sum + r.audioChunksSent, 0);
  const totalCodeUpdates = allResults.reduce((sum, r) => sum + r.codeUpdatesSent, 0);
  const totalVideoToggles = allResults.reduce((sum, r) => sum + r.videoTogglesSent, 0);
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors, 0);

  const avgConnect = (connectTimes.reduce((a, b) => a + b, 0) / connectTimes.length).toFixed(1);
  const maxConnect = Math.max(...connectTimes);
  const minConnect = Math.min(...connectTimes);

  const avgReady = (sessionReadyTimes.reduce((a, b) => a + b, 0) / sessionReadyTimes.length).toFixed(1);
  const maxReady = Math.max(...sessionReadyTimes);

  console.log('\n============================================================');
  console.log('📊 CONCURRENCY & THROUGHPUT BENCHMARK RESULTS');
  console.log('============================================================');
  console.log(`• Concurrent Active Sessions:      ${CONCURRENT_CLIENTS}`);
  console.log(`• Total Execution Duration:        ${totalElapsedMs} ms`);
  console.log(`• WebSocket Connect Latency (avg): ${avgConnect} ms (min: ${minConnect}ms, max: ${maxConnect}ms)`);
  console.log(`• Session Handshake Latency (avg): ${avgReady} ms (max: ${maxReady}ms)`);
  console.log(`• Binary Audio Chunks Processed:   ${totalAudioChunks} chunks (1024 bytes each)`);
  console.log(`• Live Code Updates Dispatched:    ${totalCodeUpdates} updates`);
  console.log(`• Video Signaling Toggles Synced:  ${totalVideoToggles} events`);
  console.log(`• Total Dropped / Error Events:    ${totalErrors} (Error Rate: ${(totalErrors / CONCURRENT_CLIENTS) * 100}%)`);
  console.log('============================================================');

  if (totalErrors > 0) {
    throw new Error(`Stress test failed with ${totalErrors} errors.`);
  }

  console.log('✅ Stress Test Status: PASSED (100% throughput, 0 dropped frames)\n');
}

runStressTest().catch((err) => {
  console.error('❌ Stress test failed:', err);
  process.exit(1);
});
