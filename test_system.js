const http = require('http');

async function runTests() {
  // Start server locally for test
  const app = require('./server/index.js');
  
  // Wait a moment for server to listen on port 5000
  await new Promise(r => setTimeout(r, 1000));

  const BASE = 'http://localhost:5000/api';

  async function post(url, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(BASE + url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  async function get(url, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(BASE + url, { headers });
    const data = await res.json();
    return { status: res.status, data };
  }

  console.log('--- TEST 1: Public Registration ---');
  const reg1 = await post('/participants/register', {
    full_name: 'Budi Santoso',
    nickname: 'Budi',
    school: 'SMA Negeri 1 Jakarta',
    grade: 'XII',
    email: 'budi.santoso@example.com'
  });
  console.log('Reg 1 Result:', reg1.status, reg1.data.participant?.code);
  if (reg1.status !== 201 || !reg1.data.participant?.code) {
    throw new Error('Reg 1 failed!');
  }

  console.log('\n--- TEST 2: Duplicate Email Rule ---');
  const regDupEmail = await post('/participants/register', {
    full_name: 'Budi Lainnya',
    nickname: 'Budi2',
    school: 'SMA 3',
    grade: 'X',
    email: 'budi.santoso@example.com' // same email
  });
  console.log('Dup Email Result:', regDupEmail.status, regDupEmail.data.error);
  if (regDupEmail.status !== 400) {
    throw new Error('Duplicate email was not rejected!');
  }

  console.log('\n--- TEST 3: Duplicate Name Rule ---');
  const regDupName = await post('/participants/register', {
    full_name: 'Budi Santoso', // same name
    nickname: 'Budi3',
    school: 'SMA 4',
    grade: 'XI',
    email: 'other.budi@example.com'
  });
  console.log('Dup Name Result:', regDupName.status, regDupName.data.error);
  if (regDupName.status !== 400) {
    throw new Error('Duplicate name was not rejected!');
  }

  console.log('\n--- TEST 4: Login Panitia ---');
  const panitiaLogin = await post('/auth/login', {
    username: 'panitia',
    password: 'panitia123'
  });
  console.log('Panitia Login Status:', panitiaLogin.status, 'Token:', !!panitiaLogin.data.token);
  const panitiaToken = panitiaLogin.data.token;

  console.log('\n--- TEST 5: Scan 1st time (Attendance Success) ---');
  const scan1 = await post('/participants/scan', { code: reg1.data.participant.code }, panitiaToken);
  console.log('Scan 1 Status:', scan1.status, scan1.data.message);
  if (scan1.status !== 200 || scan1.data.participant.attended !== 1) {
    throw new Error('First scan failed!');
  }

  console.log('\n--- TEST 6: Scan 2nd time (Duplicate Scan Rule) ---');
  const scan2 = await post('/participants/scan', { code: reg1.data.participant.code }, panitiaToken);
  console.log('Scan 2 Status:', scan2.status, scan2.data.error);
  if (scan2.status !== 400 || !scan2.data.already_attended) {
    throw new Error('Duplicate scan was not rejected!');
  }

  console.log('\n--- TEST 7: Manual Add Attendee by Panitia ---');
  const manualAdd = await post('/participants/manual', {
    full_name: 'Siti Nurhaliza',
    nickname: 'Siti',
    school: 'SMA Negeri 2 Bandung',
    grade: 'XI',
    email: 'siti.nurhaliza@example.com'
  }, panitiaToken);
  console.log('Manual Add Status:', manualAdd.status, manualAdd.data.participant?.code);
  if (manualAdd.status !== 201) {
    throw new Error('Manual add failed!');
  }

  console.log('\n--- TEST 8: Live Stats Check ---');
  const stats = await get('/participants/stats', panitiaToken);
  console.log('Stats Result:', stats.data);
  if (stats.data.total !== 2 || stats.data.attended !== 1 || stats.data.unattended !== 1) {
    throw new Error('Stats count mismatch!');
  }

  console.log('\n--- TEST 9: Login Admin & User Management ---');
  const adminLogin = await post('/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  const adminToken = adminLogin.data.token;
  console.log('Admin Login:', adminLogin.status);

  // Add new panitia user
  const newUser = await post('/auth/users', {
    username: 'petugas_gate1',
    password: 'password123',
    name: 'Petugas Gate 1',
    role: 'panitia'
  }, adminToken);
  console.log('Add User Status:', newUser.status, newUser.data.user?.username);

  // Delete created user
  const delUser = await fetch(`${BASE}/auth/users/${newUser.data.user.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Delete User Status:', delUser.status);

  console.log('\n=========================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('=========================================');

  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
