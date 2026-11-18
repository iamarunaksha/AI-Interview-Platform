import { io } from '../apps/web/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const WS_BASE = 'http://localhost:4000/interview';

async function run() {
  console.log('🧪 Starting Phase 11 Video Interview Experience Live Verification...');

  // 1. Authenticate / Register test user
  const testEmail = `video_test_${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      name: 'Video Experience Candidate',
    }),
  });

  if (!registerRes.ok) {
    throw new Error(`Registration failed: ${await registerRes.text()}`);
  }
  const registerData = await registerRes.json();
  const token = registerData.accessToken;
  console.log('✅ 1. Candidate registered and authenticated.');

  // 2. Create interview session
  const createRes = await fetch(`${API_BASE}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      domain: 'sde',
      targetRole: 'Senior Video & Systems Engineer',
      companyCategory: 'faang_style',
      mode: 'practice',
      durationMinutes: 20,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create interview session: ${await createRes.text()}`);
  }
  const session = await createRes.json();
  console.log(`✅ 2. Created interview session: ${session.id}`);

  // 3. Connect to WebSocket Gateway
  console.log('🔄 Connecting to WebSocket Gateway for video signaling verification...');
  const socket = io(WS_BASE, {
    transports: ['websocket'],
    auth: { token },
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);

    socket.on('connect', () => {
      console.log('✅ 3. Connected to WebSocket Gateway.');
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

  // 4. Test Video Toggle: Turn on camera with GRID layout
  console.log('🔄 Emitting video.toggle (Camera ON, layout=grid)...');
  const videoStateEvent1 = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('video.state WebSocket timeout')), 8000);

    socket.once('video.state', (event) => {
      clearTimeout(timeout);
      resolve(event);
    });

    socket.emit('video.toggle', {
      sessionId: session.id,
      isCameraActive: true,
      layoutMode: 'grid',
    });
  });

  console.log(`✅ 4. Received video.state broadcast: cameraActive=${videoStateEvent1.isCameraActive}, layout=${videoStateEvent1.layoutMode}`);
  if (videoStateEvent1.isCameraActive !== true || videoStateEvent1.layoutMode !== 'grid') {
    throw new Error(`Unexpected video state: ${JSON.stringify(videoStateEvent1)}`);
  }

  // 5. Test Video Toggle: Switch layout to PiP (Picture-in-Picture)
  console.log('🔄 Emitting video.toggle (layout=pip)...');
  const videoStateEvent2 = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('video.state PiP WebSocket timeout')), 8000);

    socket.once('video.state', (event) => {
      clearTimeout(timeout);
      resolve(event);
    });

    socket.emit('video.toggle', {
      sessionId: session.id,
      isCameraActive: true,
      layoutMode: 'pip',
    });
  });

  console.log(`✅ 5. Received video.state broadcast: layout=${videoStateEvent2.layoutMode}`);
  if (videoStateEvent2.layoutMode !== 'pip') {
    throw new Error(`Expected layoutMode "pip", got: ${videoStateEvent2.layoutMode}`);
  }

  // 6. Test Video Toggle: Switch layout to SPEAKER focus
  console.log('🔄 Emitting video.toggle (layout=speaker)...');
  const videoStateEvent3 = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('video.state Speaker WebSocket timeout')), 8000);

    socket.once('video.state', (event) => {
      clearTimeout(timeout);
      resolve(event);
    });

    socket.emit('video.toggle', {
      sessionId: session.id,
      isCameraActive: true,
      layoutMode: 'speaker',
    });
  });

  console.log(`✅ 6. Received video.state broadcast: layout=${videoStateEvent3.layoutMode}`);
  if (videoStateEvent3.layoutMode !== 'speaker') {
    throw new Error(`Expected layoutMode "speaker", got: ${videoStateEvent3.layoutMode}`);
  }

  // 7. Test Video Toggle: Turn off camera (mute video, audio remains active)
  console.log('🔄 Emitting video.toggle (Camera OFF)...');
  const videoStateEvent4 = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('video.state Camera OFF WebSocket timeout')), 8000);

    socket.once('video.state', (event) => {
      clearTimeout(timeout);
      resolve(event);
    });

    socket.emit('video.toggle', {
      sessionId: session.id,
      isCameraActive: false,
    });
  });

  console.log(`✅ 7. Received video.state broadcast: cameraActive=${videoStateEvent4.isCameraActive}`);
  if (videoStateEvent4.isCameraActive !== false) {
    throw new Error(`Expected isCameraActive to be false, got: ${videoStateEvent4.isCameraActive}`);
  }

  socket.disconnect();
  console.log('\n🎉 ALL PHASE 11 VIDEO EXPERIENCE VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Phase 11 verification failed:', err);
  process.exit(1);
});
