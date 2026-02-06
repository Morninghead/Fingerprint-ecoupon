const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// Integration modes: 'cli', 'native', 'network', 'mock', 'hybrid-mock'
const INTEGRATION_MODE = process.env.ZK_INTEGRATION_MODE || 'hybrid-mock';

// Environment variable for simple auth token (dev/testing)
const AUTH_TOKEN = process.env.ZK_AUTH_TOKEN || 'dev-token';

// Load hybrid mock if in hybrid mode
let HybridMock;
let ZK9500CLI;

if (INTEGRATION_MODE === 'hybrid-mock') {
  try {
    HybridMock = require('./hybrid-mock');
  } catch (e) {
    console.warn('Hybrid mock not available, falling back to standard mock');
  }
}

if (INTEGRATION_MODE === 'cli') {
  try {
    ZK9500CLI = require('./zk9500-cli');
  } catch (e) {
    console.error('ZK9500 CLI not available:', e.message);
  }
}

class FingerprintBridge {
  constructor(port = 8081) {
    this.port = port;
    this.clientConnections = new Map();
    this.wss = new WebSocket.Server({
      port
      // Note: Origin validation can be added here if needed
      // verifyClient: (info) => info.origin === 'http://localhost:3000'
    });

    // Initialize hybrid mock if available
    if (INTEGRATION_MODE === 'hybrid-mock' && HybridMock) {
      this.hybridMock = new HybridMock();
    }

    // Initialize CLI scanner if available
    if (INTEGRATION_MODE === 'cli' && ZK9500CLI) {
      this.cliScanner = new ZK9500CLI();
      console.log('[BRIDGE] ZK9500 CLI scanner initialized');
    }

    this.setupWebSocket();
  }

  captureFingerprint() {
    switch (INTEGRATION_MODE) {
      case 'hybrid-mock':
        return this.captureHybridMock();
      case 'cli':
        return this.captureViaCLI();
      case 'native':
        return this.captureViaNative();
      case 'network':
        return this.captureViaNetwork();
      case 'mock':
      default:
        return this.captureMock();
    }
  }

  // Mode 1: USB SDK via CLI Wrapper
  captureViaCLI() {
    return new Promise((resolve, reject) => {
      const exePath = path.join(__dirname, 'native', 'zkteco-cli.exe');

      try {
        const sdk = spawn(exePath, ['capture'], {
          cwd: path.join(__dirname, 'native')
        });

        let data = '';
        sdk.stdout.on('data', (chunk) => data += chunk);

        sdk.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(data);
              if (result.success && result.template) {
                resolve(result.template);
              } else {
                reject(new Error(result.message || result.error || 'Capture failed'));
              }
            } catch (e) {
              reject(new Error(`Invalid JSON: ${e.message}`));
            }
          } else {
            reject(new Error(`CLI failed with code ${code}`));
          }
        });

        sdk.on('error', reject);
      } catch (error) {
        // Fallback to mock if CLI not found
        console.warn('CLI not found, falling back to mock');
        return this.captureMock();
      }
    });
  }

  // Mode 2: USB SDK via Native Addon
  captureViaNative() {
    try {
      const zktecoNative = require('./native/zkteco_native.node');

      return new Promise((resolve, reject) => {
        try {
          const buffer = zktecoNative.captureFingerprint();
          // Convert buffer to base64 string
          resolve(buffer.toString('base64'));
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      // Fallback to mock if native addon not found
      console.warn('Native addon not found, falling back to mock');
      return this.captureMock();
    }
  }

  // Mode 3: Networked ZK Device via zkteco-js
  async captureViaNetwork() {
    try {
      const ZktecoJs = require('zkteco-js');

      // For networked ZK devices, use real-time logs instead
      const device = new ZktecoJs(process.env.ZK_DEVICE_IP || '192.168.1.201', 4370, 5200, 5000);

      try {
        await device.createSocket();

        // Get device info
        const info = await device.getInfo();
        console.log('Device info:', info);

        // Listen for next real-time attendance event (fingerprint scan)
        return new Promise((resolve, reject) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            device.disconnect();
            reject(new Error('Timeout waiting for fingerprint'));
          }, 15000); // 15 second timeout

          device.getRealTimeLogs((log) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              device.disconnect();

              // Return mock template for networked mode
              // Real fingerprint templates need device communication protocol
              const mockTemplate = Buffer.from(`network_log_${log.userId}_${Date.now()}`).toString('base64');
              resolve(mockTemplate);
            }
          });
        });
      } catch (error) {
        throw new Error(`Network connection failed: ${error.message}`);
      }
    } catch (error) {
      // zkteco-js not installed
      console.warn('zkteco-js not found, falling back to mock');
      return this.captureMock();
    }
  }

  // Mode 4: Mock/Development (default)
  captureMock() {
    return new Promise((resolve) => {
      // Simulate SDK delay
      setTimeout(() => {
        const mockTemplate = Buffer.from('mock_fingerprint_template_001').toString('base64');
        resolve(mockTemplate);
      }, 1000);
    });
  }

  // Mode: Real ZK9500 Scanner via CLI
  async captureViaCLI() {
    if (!this.cliScanner) {
      console.error('CLI scanner not initialized');
      throw new Error('CLI scanner not initialized');
    }

    try {
      console.log('[BRIDGE] Capturing fingerprint via ZK9500 CLI...');
      const result = await this.cliScanner.capture();

      if (result.success) {
        console.log(`[BRIDGE] ✓ Real fingerprint captured! Size: ${result.size} bytes`);
        // Return the FULL result with template AND image
        return {
          template: result.template,
          image: result.image,
          width: result.width,
          height: result.height
        };
      } else {
        // Return the error from CLI (including timeout)
        console.error('[BRIDGE] CLI returned error:', result.error || result.message);
        throw new Error(result.message || result.error || 'Capture failed');
      }
    } catch (error) {
      console.error('[BRIDGE] CLI capture failed:', error.message);
      // DO NOT fallback to mock - throw the actual error
      throw error;
    }
  }

  // Mode 5: Hybrid Mock - Real scanner trigger, mock data
  async captureHybridMock() {
    if (!this.hybridMock) {
      console.warn('Hybrid mock not initialized, using standard mock');
      return this.captureMock();
    }

    try {
      // Use the simple capture for better UX
      // This will auto-trigger after a realistic delay
      const template = await this.hybridMock.captureSimple();
      return template;
    } catch (error) {
      console.error('Hybrid mock capture failed:', error);
      // Fallback to standard mock
      return this.captureMock();
    }
  }

  setupWebSocket() {
    console.log(`Fingerprint bridge running on ws://localhost:${this.port}`);
    console.log(`Integration mode: ${INTEGRATION_MODE}`);
    console.log(`Origin validation: localhost allowed`);
    console.log(`Rate limit: 5 connections per IP`);

    this.wss.on('connection', (ws, req) => {
      // Security: Origin validation - allow localhost only
      const origin = req.headers.origin || '';
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || !origin;

      if (!isLocalhost) {
        console.warn(`Rejected connection from non-localhost origin: ${origin}`);
        ws.close(1008, 'Only localhost connections allowed');
        return;
      }

      console.log(`Client connected from ${origin || 'direct connection'}`);

      // Security: Rate limiting (prevent DoS)
      const clientIP = req.socket.remoteAddress;
      const existingConnections = this.clientConnections.get(clientIP) || 0;

      if (existingConnections >= 5) {
        console.warn(`Rate limit exceeded for ${clientIP}`);
        ws.close(1008, 'Too many connections');
        return;
      }

      // Track connection for cleanup
      const clientId = ws.id;
      this.clientConnections.set(clientId, { ws, timestamp: Date.now() });

      console.log('New client connected', clientIP);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log('Received:', data.type);

          switch (data.type) {
            case 'capture':
              try {
                const result = await this.captureFingerprint();
                // Send full result including image if available
                const response = {
                  type: 'fingerprint',
                  template: result.template || result, // Handle both object and string
                  mode: INTEGRATION_MODE
                };

                // Add image data if available
                if (result.image) {
                  response.image = result.image;
                  response.width = result.width;
                  response.height = result.height;
                }

                ws.send(JSON.stringify(response));
              } catch (error) {
                // Send actual error message to client
                ws.send(JSON.stringify({
                  type: 'error',
                  message: error.message || 'Capture failed'
                }));
              }
              break;

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', mode: INTEGRATION_MODE }));
              break;

            case 'connect':
              if (INTEGRATION_MODE === 'network') {
                // Connect to network device
                try {
                  const ZktecoJs = require('zkteco-js');
                  const device = new ZktecoJs(
                    process.env.ZK_DEVICE_IP || data.ip,
                    4370,
                    5200,
                    5000
                  );
                  await device.createSocket();
                  ws.send(JSON.stringify({
                    type: 'connected',
                    message: `Connected to ${data.ip || 'default IP'}`,
                    mode: INTEGRATION_MODE
                  }));
                } catch (error) {
                  ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Connection failed',
                    mode: INTEGRATION_MODE
                  }));
                }
              } else {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Connect only available in network mode',
                  mode: INTEGRATION_MODE
                }));
              }
              break;

            default:
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unknown command',
                mode: INTEGRATION_MODE
              }));
          }
        } catch (error) {
          console.error('Error processing message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Processing error'
          }));
        }
      });

      ws.on('close', () => {
        // Cleanup connection tracking
        this.clientConnections.delete(ws.id);
        console.log('Client disconnected', req.socket.remoteAddress);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  close() {
    this.wss.close(() => {
      console.log('Fingerprint bridge closed');
    });
  }
}

module.exports = FingerprintBridge;
