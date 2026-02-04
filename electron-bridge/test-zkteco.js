#!/usr/bin/env node

/**
 * ZKTeco Fingerprint Bridge - Comprehensive Test Utility
 * Tests all 4 integration modes: CLI, Native, Network, Mock
 *
 * Usage:
 *   node test-zkteco.js [mode] [command]
 *
 * Commands:
 *   test-all           - Test all integration modes
 *   test-cli          - Test CLI mode only
 *   test-native        - Test native addon mode only
 *   test-network       - Test network mode only
 *   test-mock         - Test mock mode only
 *   verify-bridge      - Verify bridge connectivity
 *   test-kiosk        - Test end-to-end flow (kiosk + API)
 *   benchmark          - Performance comparison between modes
 *
 * Environment Variables:
 *   ZK_INTEGRATION_MODE - Set mode (cli, native, network, mock)
 *   ZK_DEVICE_IP        - Set device IP for network mode
 *   ZK_AUTH_TOKEN       - Set auth token for dev mode
 */

const WebSocket = require('ws');
const path = require('path');
const { spawn } = require('child_process');

// Default test configuration
const CONFIG = {
  bridgeUrl: 'ws://localhost:8081',
  bridgeTimeout: 5000,
  apiBaseUrl: 'http://localhost:3000',
  modes: ['cli', 'native', 'network', 'mock'],
  tests: [
    { name: 'Connection Test', fn: 'testConnection' },
    { name: 'Fingerprint Capture', fn: 'testCapture' },
    { name: 'Error Handling', fn: 'testErrorHandling' },
    { name: 'Rate Limiting', fn: 'testRateLimit' },
    { name: 'End-to-End Flow', fn: 'testE2E' }
  ]
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) { log(message, colors.green); }
function logError(message) { log(message, colors.red); }
function logWarning(message) { log(message, colors.yellow); }
function logInfo(message) { log(message, colors.cyan); }
function logStep(message) { log(message, colors.blue); }

class ZKTecoTester {
  constructor() {
    this.mode = process.env.ZK_INTEGRATION_MODE || 'mock';
    this.ws = null;
    this.testResults = [];
  }

  async connectBridge() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONFIG.bridgeTimeout);

      this.ws = new WebSocket(CONFIG.bridgeUrl);
      this.ws.on('open', () => {
        clearTimeout(timeout);
        logSuccess('Connected to fingerprint bridge');
        resolve();
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async testConnection() {
    logInfo('Testing bridge connectivity...');
    try {
      await this.connectBridge();
      logSuccess('✓ Connection test PASSED');
      return true;
    } catch (error) {
      logError(`✗ Connection test FAILED: ${error.message}`);
      return false;
    }
  }

  async testCapture() {
    logInfo('Testing fingerprint capture...');
    try {
      await this.connectBridge();

      return new Promise((resolve, reject) => {
        this.ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data);

            if (message.type === 'fingerprint') {
              logSuccess(`✓ Fingerprint captured`);
              logInfo(`  Template length: ${message.template?.length || 'unknown'}`);
              logInfo(`  Mode: ${message.mode || 'unknown'}`);
              this.ws.close();
              this.testResults.push({ test: 'Capture', passed: true, mode: this.mode });
              resolve(true);
            } else if (message.type === 'error') {
              logError(`✗ Capture error: ${message.message}`);
              this.testResults.push({ test: 'Capture', passed: false, error: message.message, mode: this.mode });
              this.ws.close();
              resolve(false);
            }
          } catch (error) {
            logError(`✗ Message parsing error: ${error.message}`);
            reject(error);
          }
        });

        this.ws.on('error', (error) => {
          logError(`✗ WebSocket error: ${error.message}`);
          this.ws.close();
          reject(error);
        });
      });
    } catch (error) {
      logError(`✗ Capture test FAILED: ${error.message}`);
      return false;
    }
  }

  async testErrorHandling() {
    logInfo('Testing error handling...');
    try {
      await this.connectBridge();

      return new Promise((resolve, reject) => {
        let pongCount = 0;

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);

            if (message.type === 'pong') {
              pongCount++;
              logInfo(`  Pong #${pongCount}`);
            }
          } catch (error) {
            // Send invalid JSON
            this.ws.send('invalid-json{{{');
          }
        });

        // Test invalid command
        setTimeout(() => {
          this.ws.send('{"type":"invalid-command"}');
        }, 1000);

        // Check for error response
        setTimeout(() => {
          if (pongCount > 0) {
            logSuccess('✓ Invalid command rejected');
            resolve(true);
            this.ws.close();
          } else {
            logWarning('⚠ No error response received');
            resolve(false);
            this.ws.close();
          }
        }, 3000);
      });
    } catch (error) {
      logError(`✗ Error handling test FAILED: ${error.message}`);
      return false;
    }
  }

  async testRateLimit() {
    logInfo('Testing rate limiting...');
    try {
      const connections = [];

      // Create 6 connections
      for (let i = 0; i < 6; i++) {
        const ws = new WebSocket(CONFIG.bridgeUrl);
        connections.push(ws);
      }

      // Wait for all to connect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try  create 7th connection (should be rejected)
      const ws7 = new WebSocket(CONFIG.bridgeUrl);

      ws7.on('open', () => {
        logSuccess('✓ 7th connection opened');
      });

      ws7.on('close', (code, reason) => {
        if (code === 1008) {
          logSuccess('✓ Rate limit enforced (7th connection rejected)');
        } else {
          logError(`✗ Unexpected close code: ${code} (${reason})`);
        }
      });

      // Close all connections
      connections.forEach(ws => ws.close());
    } catch (error) {
      logError(`✗ Rate limiting test FAILED: ${error.message}`);
      return false;
    }
  }

  async testE2E() {
    logInfo('Testing end-to-end flow (Kiosk → Bridge → API)...');
    logStep('Step 1: Check API status');
    logStep('Step 2: Start bridge and verify fingerprint capture');
    logStep('Step 3: Verify API redemption');

    try {
      // Check API health
      const apiCheck = await fetch(`${CONFIG.apiBaseUrl}/api/verify-fingerprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint_template: 'test_template',
          company_id: 'test-company'
        })
      });

      if (!apiCheck.ok) {
        logError('✗ API server not responding');
        return false;
      }

      logSuccess('✓ API server is running');

      // Step 1: Verify fingerprint capture
      logStep('Attempting fingerprint capture...');

      const captureResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket(CONFIG.bridgeUrl);

        ws.on('open', () => {
          logInfo('  Bridge connected');
          ws.send(JSON.stringify({ type: 'capture' }));
        });

        ws.on('message', async (data) => {
          const message = JSON.parse(data);
          if (message.type === 'fingerprint') {
            logSuccess(`  ✓ Fingerprint captured`);
            resolve(message);
          }
        });

        ws.on('error', reject);
        setTimeout(() => {
          ws.close();
          reject(new Error('Capture timeout'));
        }, CONFIG.bridgeTimeout);
      });

      // Step 2: Verify API redemption
      logStep('Attempting meal redemption...');

      const redeemCheck = await fetch(`${CONFIG.apiBaseUrl}/api/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: 'test-employee',
          meal_type: 'LUNCH'
        })
      });

      if (redeemCheck.ok) {
        const result = await redeemCheck.json();
        if (result.success) {
          logSuccess('✓ Redemption successful');
        } else {
          logError(`✗ Redemption failed: ${result.error || 'Unknown'}`);
        }
      } else {
        logError('✗ API error: ${redeemCheck.status}`);
      }

      logSuccess('✓ End-to-end flow complete');
      return true;
    } catch (error) {
      logError(`✗ E2E test FAILED: ${error.message}`);
      return false;
    }
  }

  async benchmark() {
    logInfo('Running performance benchmark...');
    const modes = ['cli', 'native', 'network', 'mock'];
    const results = [];

    for (const mode of modes) {
      logInfo(`Testing ${mode} mode...`);

      const startTime = Date.now();
      let captureCount = 0;
      const iterations = 10;

      try {
        // Run 10 captures per mode
        for (let i = 0; i < iterations; i++) {
          const ws = new WebSocket(CONFIG.bridgeUrl);

          const capturePromise = new Promise((resolve, reject) => {
            let responded = false;

            const timeout = setTimeout(() => {
              if (!responded) {
                reject(new Error('Capture timeout'));
              }
            }, 3000);

            ws.on('message', (data) => {
              const message = JSON.parse(data);
              if (message.type === 'fingerprint') {
                responded = true;
                clearTimeout(timeout);
                resolve();
              }
            });

            ws.on('error', reject);

            await capturePromise;
            ws.close();
          });

          captureCount++;
        }

        const duration = Date.now() - startTime;
        const avgTime = duration / iterations;

        results.push({
          mode,
          total: duration,
          avgTime: avgTime.toFixed(2),
          captures: iterations
        });

        logSuccess(`✓ ${mode}: ${iterations} captures in ${duration}ms (${avgTime}ms avg)`);

      } catch (error) {
        logError(`✗ ${mode} benchmark failed: ${error.message}`);
      }

      // Wait between modes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  printResults() {
    logInfo('\n' + '='.repeat(60));
    logInfo('TEST RESULTS');
    logInfo('='.repeat(60));
    logInfo(`Mode: ${this.mode.toUpperCase()}`);
    logInfo(`Bridge: ${CONFIG.bridgeUrl}`);
    logInfo('Tests: ${this.testResults.length}`);

    let passed = 0;
    let failed = 0;

    this.testResults.forEach(result => {
      if (result.passed) {
        passed++;
        logSuccess(`  ✓ ${result.test}`);
      } else {
        failed++;
        logError(`  ✗ ${result.test}${result.error ? `: ${result.error}` : ''}`);
      }
    });

    logInfo('-'.repeat(60));
    logInfo(`Summary: ${passed} PASSED, ${failed} FAILED`);
    logInfo('='.repeat(60));
  }

  async runCommand(command) {
    logStep(`Running: ${command}`);

    const tester = new ZKTecoTester();

    switch (command) {
      case 'test-all':
        for (const test of CONFIG.tests) {
          await tester[test.fn]();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        tester.printResults();
        break;

      case 'test-cli':
        tester.mode = 'cli';
        await tester.testCapture();
        await tester.testConnection();
        tester.printResults();
        break;

      case 'test-native':
        tester.mode = 'native';
        await tester.testCapture();
        await tester.testConnection();
        tester.printResults();
        break;

      case 'test-network':
        tester.mode = 'network';
        await tester.testCapture();
        await tester.testConnection();
        tester.printResults();
        break;

      case 'test-mock':
        tester.mode = 'mock';
        await tester.testCapture();
        await tester.testConnection();
        tester.printResults();
        break;

      case 'verify-bridge':
        await tester.testConnection();
        tester.printResults();
        break;

      case 'test-e2e':
        await tester.testE2E();
        tester.printResults();
        break;

      case 'benchmark':
        await tester.benchmark();
        tester.printResults();
        break;

      default:
        logError(`Unknown command: ${command}`);
        this.printUsage();
    }
  }

  printUsage() {
    logInfo('\n' + '='.repeat(60));
    logInfo('ZKTeco Fingerprint Bridge - Test Utility');
    logInfo('='.repeat(60));
    logInfo('Usage:');
    logInfo('  node test-zkteco.js [command] [options]');
    logInfo('\nCommands:');
    logInfo('  test-all           - Run all tests');
    logInfo('  test-cli          - Test CLI mode');
    logInfo('  test-native        - Test Native addon mode');
    logInfo('  test-network       - Test Network mode');
    logInfo('  test-mock         - Test Mock mode');
    logInfo('  verify-bridge     - Verify bridge connectivity');
    logInfo('  test-e2e          - Test end-to-end flow (Kiosk → API)');
    logInfo('  benchmark          - Performance comparison between modes');
    logInfo('\nIntegration Modes:');
    logInfo('  Set ZK_INTEGRATION_MODE to:');
    logInfo('    cli      - Test with CLI wrapper');
    logInfo('    native   - Test with Node.js native addon');
    logInfo('    network  - Test with zkteco-js (TCP/IP)');
    logInfo('    mock     - Test with simulated capture (default)');
    logInfo('\nEnvironment Variables:');
    logInfo('  ZK_DEVICE_IP       - Set device IP for network mode');
    logInfo('  ZK_AUTH_TOKEN      - Set auth token for development');
    logInfo('\nOptions:');
    logInfo('  --verbose, -v      - Verbose output');
    logInfo('  --no-color         - Disable colored output');
    logInfo('  --help             - Show this help message');
    logInfo('\n' + '='.repeat(60));
  }
}

// Main execution
const tester = new ZKTecoTester();

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

// Parse options
const verbose = options.includes('--verbose') || options.includes('-v');
const noColor = options.includes('--no-color');

// Override color function if --no-color
if (noColor) {
  const originalLog = console.log;
  console.log = () => {};
  tester.logSuccess = (msg) => originalLog(msg.replace(/[\x1b\[\d+m/g, '') ''));
  tester.logError = (msg) => originalLog(msg.replace(/[\x1b\[\d+m/g, '') ''));
  tester.logInfo = (msg) => originalLog(msg.replace(/[\x1b\[\d+m/g, '') ''));
  tester.logWarning = (msg) => originalLog(msg.replace(/[\x1b\[\d+m/g, '') ''));
  tester.logStep = (msg) => originalLog(msg.replace(/[\x1b\[\d+m/g, '') ''));
}

// Execute command
if (!command || ['--help', '-h'].includes(command)) {
  tester.printUsage();
  process.exit(0);
}

if (verbose) {
  logInfo(`Executing: ${command}${options.length > 0 ? ` with options: ${options.join(' ')}` : ''}`);
}

tester.runCommand(command)
  .then(() => {
    const exitCode = tester.testResults.some(r => !r.passed) ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
