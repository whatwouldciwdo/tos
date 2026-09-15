#!/usr/bin/env node
/**
 * Load Testing Script for TOR Online Application
 * Tests concurrent user access and TOR creation
 * 
 * Usage:
 *   node scripts/load-test.js                    # Run all tests
 *   node scripts/load-test.js --scenario login   # Test only concurrent login
 *   node scripts/load-test.js --scenario create  # Test only TOR creation
 *   node scripts/load-test.js--users 20          # Test with 20 concurrent users
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '10');
const SCENARIO = process.argv.find(arg => arg.startsWith('--scenario='))?.split('=')[1] || 'all';

// Test users - created by: node prisma/seed-test-users.cjs
// 10 test users across different bidang for load testing
const TEST_USERS = [
  { username: 'testuser1', password: 'test123' },   // Outage
  { username: 'testuser2', password: 'test123' },   // HAR Listrik
  { username: 'testuser3', password: 'test123' },   // HAR Mekanik
  { username: 'testuser4', password: 'test123' },   // HAR BOP
  { username: 'testuser5', password: 'test123' },   // K3
  { username: 'testuser6', password: 'test123' },   // Umum
  { username: 'testuser7', password: 'test123' },   // HAR Instrumen
  { username: 'testuser8', password: 'test123' },   // Outage
  { username: 'testuser9', password: 'test123' },   // HAR Listrik
  { username: 'testuser10', password: 'test123' },  // HAR Mekanik
];

// Helper: Make HTTP request
function makeRequest(method, path, body = null, cookies = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = lib.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            cookies: res.headers['set-cookie'],
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            cookies: res.headers['set-cookie'],
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Helper: Extract auth token from cookies
function extractAuthToken(cookies) {
  if (!cookies) return null;
  
  for (const cookie of cookies) {
    const match = cookie.match(/auth-token=([^;]+)/);
    if (match) {
      return `auth-token=${match[1]}`;
    }
  }
  
  return null;
}

// Test: Concurrent Login
async function testConcurrentLogin() {
  console.log(`\n🔐 Testing ${CONCURRENT_USERS} Concurrent Logins...`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < CONCURRENT_USERS; i++) {
    const user = TEST_USERS[i % TEST_USERS.length];
    const userIndex = i + 1;

    const promise = (async () => {
      const reqStart = Date.now();
      try {
        const response = await makeRequest('POST', '/api/login', {
          username: user.username,
          password: user.password,
        });

        const reqTime = Date.now() - reqStart;

        if (response.status === 200) {
          return {
            success: true,
            user: user.username,
            userIndex,
            time: reqTime,
            status: response.status,
          };
        } else {
          return {
            success: false,
            user: user.username,
            userIndex,
            time: reqTime,
            status: response.status,
            error: response.body.message || response.body.error?.message,
          };
        }
      } catch (error) {
        return {
          success: false,
          user: user.username,
          userIndex,
          time: Date.now() - reqStart,
          error: error.message,
        };
      }
    })();

    promises.push(promise);
  }

  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const times = results.map(r => r.time);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log(`\n✅ Successful: ${successful.length}/${CONCURRENT_USERS}`);
  console.log(`❌ Failed: ${failed.length}/${CONCURRENT_USERS}`);
  console.log(`\n⏱️  Performance:`);
  console.log(`   Total Time: ${totalTime}ms`);
  console.log(`   Avg Response: ${avgTime.toFixed(0)}ms`);
  console.log(`   Min Response: ${minTime}ms`);
  console.log(`   Max Response: ${maxTime}ms`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed Logins:`);
    failed.forEach(f => {
      console.log(`   User ${f.userIndex} (${f.user}): ${f.error || 'Status ' + f.status}`);
    });
  }

  return {
    total: CONCURRENT_USERS,
    successful: successful.length,
    failed: failed.length,
    avgTime,
    totalTime,
  };
}

// Test: Concurrent TOR Creation
async function testConcurrentTorCreation() {
  console.log(`\n📝 Testing ${CONCURRENT_USERS} Concurrent TOR Creations...`);
  console.log('='.repeat(60));

  // First, login all users
  console.log('Logging in users...');
  const userSessions = [];
  
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    const user = TEST_USERS[i % TEST_USERS.length];
    
    try {
      const response = await makeRequest('POST', '/api/login', {
        username: user.username,
        password: user.password,
      });

      if (response.status === 200) {
        const authToken = extractAuthToken(response.cookies);
        userSessions.push({
          user: user.username,
          index: i + 1,
          cookie: authToken,
        });
      }
    } catch (error) {
      console.error(`Failed to login user ${user.username}:`, error.message);
    }
  }

  console.log(`✅ ${userSessions.length} users logged in successfully\n`);

  // Now create TORs concurrently
  const startTime = Date.now();
  const promises = [];

  for (const session of userSessions) {
    const promise = (async () => {
      const reqStart = Date.now();
      
      try {
        const response = await makeRequest('POST', '/api/tor', {
          title: `Load Test TOR - User ${session.index} - ${Date.now()}`,
          description: `Created by concurrent load test for user ${session.user}`,
          budgetType: 'Anggaran Investasi',
          workType: 'Jasa dan Material',
        }, session.cookie);

        const reqTime = Date.now() - reqStart;

        if (response.status === 201) {
          return {
            success: true,
            user: session.user,
            userIndex: session.index,
            time: reqTime,
            torId: response.body.id,
            torNumber: response.body.number,
          };
        } else {
          return {
            success: false,
            user: session.user,
            userIndex: session.index,
            time: reqTime,
            status: response.status,
            error: response.body.message || response.body.error?.message,
          };
        }
      } catch (error) {
        return {
          success: false,
          user: session.user,
          userIndex: session.index,
          time: Date.now() - reqStart,
          error: error.message,
        };
      }
    })();

    promises.push(promise);
  }

  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const times = results.map(r => r.time);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log(`\n✅ Successful: ${successful.length}/${userSessions.length}`);
  console.log(`❌ Failed: ${failed.length}/${userSessions.length}`);
  console.log(`\n⏱️  Performance:`);
  console.log(`   Total Time: ${totalTime}ms`);
  console.log(`   Avg Response: ${avgTime.toFixed(0)}ms`);
  console.log(`   Min Response: ${minTime}ms`);
  console.log(`   Max Response: ${maxTime}ms`);

  if (successful.length > 0) {
    console.log(`\n📄 Created TORs (sample):`);
    successful.slice(0, 3).forEach(s => {
      console.log(`   ${s.torNumber} (User ${s.userIndex} - ${s.user})`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed Creations:`);
    failed.forEach(f => {
      console.log(`   User ${f.userIndex} (${f.user}): ${f.error || 'Status ' + f.status}`);
    });
  }

  return {
    total: userSessions.length,
    successful: successful.length,
    failed: failed.length,
    avgTime,
    totalTime,
  };
}

// Test: Health Check
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check Endpoint...');
  console.log('='.repeat(60));

  try {
    const response = await makeRequest('GET', '/api/health');
    
    if (response.status === 200) {
      console.log('✅ Health check passed');
      console.log(`   Status: ${response.body.status}`);
      console.log(`   Database: ${response.body.database}`);
      return true;
    } else {
      console.log('❌ Health check failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.body);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

// Main
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         TOR Online Load Testing                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nConfiguration:`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`  Scenario: ${SCENARIO}`);

  const results = {
    healthCheck: false,
    login: null,
    create: null,
  };

  try {
    // Always check health first
    results.healthCheck = await testHealthCheck();
    
    if (!results.healthCheck) {
      console.log('\n⚠️  Warning: Health check failed, but continuing tests...\n');
    }

    // Run tests based on scenario
    if (SCENARIO === 'all' || SCENARIO === 'login') {
      results.login = await testConcurrentLogin();
    }

    if (SCENARIO === 'all' || SCENARIO === 'create') {
      results.create = await testConcurrentTorCreation();
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    if (results.login) {
      const loginSuccess = results.login.successful === results.login.total;
      console.log(`\n🔐 Concurrent Login: ${loginSuccess ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Success Rate: ${results.login.successful}/${results.login.total} (${(results.login.successful / results.login.total * 100).toFixed(1)}%)`);
      console.log(`   Avg Response Time: ${results.login.avgTime.toFixed(0)}ms`);
    }

    if (results.create) {
      const createSuccess = results.create.successful === results.create.total;
      console.log(`\n📝 Concurrent TOR Creation: ${createSuccess ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Success Rate: ${results.create.successful}/${results.create.total} (${(results.create.successful / results.create.total * 100).toFixed(1)}%)`);
      console.log(`   Avg Response Time: ${results.create.avgTime.toFixed(0)}ms`);
    }

    const allPassed = 
      results.healthCheck &&
      (!results.login || results.login.failed === 0) &&
      (!results.create || results.create.failed === 0);

    console.log(`\n${'='.repeat(60)}`);
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Application is ready for concurrent users.');
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testConcurrentLogin, testConcurrentTorCreation, testHealthCheck };
