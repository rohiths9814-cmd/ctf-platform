/**
 * Auth System Test Script
 * Tests the entire authentication flow automatically.
 * Run with: node server/test-auth.js
 * Make sure the server is running on localhost:3001 first.
 */

const BASE_URL = 'http://localhost:3001/api';
let passed = 0;
let total = 7;
let savedToken = null;

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function report(testNum, name, pass, details) {
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`\n  Test ${testNum}: ${name}`);
  console.log(`  ${icon}`);
  if (details) console.log(`  Response: ${JSON.stringify(details).substring(0, 200)}`);
  if (pass) passed++;
}

async function runTests() {
  console.log('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  XYZ_CTF Auth System — Test Suite');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Register new user
  const t1 = await request('POST', '/auth/register', {
    username: 'testuser',
    email: 'test@ctf.com',
    password: 'testpass1',
  });
  report(1, 'Register new user (expect 201)', t1.status === 201, t1.data);

  // Test 2: Duplicate email (expect 409)
  const t2 = await request('POST', '/auth/register', {
    username: 'testuser2',
    email: 'test@ctf.com',
    password: 'testpass1',
  });
  report(2, 'Duplicate email (expect 409)', t2.status === 409, t2.data);

  // Test 3: Short password (expect 400)
  const t3 = await request('POST', '/auth/register', {
    username: 'newuser',
    email: 'new@ctf.com',
    password: 'abc',
  });
  report(3, 'Short password (expect 400)', t3.status === 400, t3.data);

  // Test 4: Invalid email format (expect 400)
  const t4 = await request('POST', '/auth/register', {
    username: 'newuser2',
    email: 'notanemail',
    password: 'testpass1',
  });
  report(4, 'Invalid email format (expect 400)', t4.status === 400, t4.data);

  // Test 5: Valid login (expect 200 + token)
  const t5 = await request('POST', '/auth/login', {
    email: 'test@ctf.com',
    password: 'testpass1',
  });
  const hasToken = t5.status === 200 && !!t5.data?.token;
  if (hasToken) savedToken = t5.data.token;
  report(5, 'Valid login (expect 200 + token)', hasToken, t5.data);

  // Test 6: GET /me with valid token (expect 200 + user with score)
  const t6 = await request('GET', '/auth/me', null, savedToken);
  const hasScore = t6.status === 200 && t6.data?.user && 'score' in t6.data.user;
  report(6, 'GET /me with valid token (expect 200 + score)', hasScore, t6.data);

  // Test 7: GET /me with fake token (expect 401)
  const t7 = await request('GET', '/auth/me', null, 'faketoken123');
  report(7, 'GET /me with fake token (expect 401)', t7.status === 401, t7.data);

  // Summary
  console.log('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${passed}/${total} tests passed`);
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Cleanup: delete the test user
  if (savedToken) {
    console.log('  🧹 Note: test user "testuser" was created. Use admin.cjs to clean up if needed.\n');
  }
}

runTests().catch((err) => {
  console.error('\n  ❌ Test runner failed:', err.message);
  console.error('  Make sure the server is running: npm run dev\n');
});
