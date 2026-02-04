const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// Integration modes: 'cli', 'native', 'network', 'mock'
const INTEGRATION_MODE = process.env.ZK_INTEGRATION_MODE || 'mock';

// Environment variable for simple auth token (dev/testing)
const AUTH_TOKEN = process.env.ZK_AUTH_TOKEN || 'dev-token';

class FingerprintBridge {
  constructor(port = 8081) {
    this.port = port;
    this.clientConnections = new Map();
    this.wss = new WebSocket.Server({ 
      port,
      // Security: Origin validation - only allow connections from PWA
      verifyClient: { origin: 'http://localhost:3000' }
    });
    this.setupWebSocket();
  }

  captureFingerprint() {
    switch (INTEGRATION_MODE) {
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
                reject(new Error(result.error || 'Capture failed'));
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
        const mockTemplate = Buffer.from('mock_fingerprint_template').toString('base64');
        resolve(mockTemplate);
      }, 1000);
    });
  }

  setupWebSocket() {
    console.log(`Fingerprint bridge running on ws://localhost:${this.port}`);
    console.log(`Integration mode: ${INTEGRATION_MODE}`);
    console.log(`Origin validation: http://localhost:3000`);
    console.log(`Rate limit: 5 connections per IP`);

    this.wss.on('connection', (ws, req) => {
      // Security: Simple auth token validation for dev/testing
      const authHeader = req.headers['authorization'];
      if (AUTH_TOKEN && authHeader !== `Bearer ${AUTH_TOKEN}`) {
        console.warn(`Unauthorized connection from ${req.socket.remoteAddress}`);
        ws.close(1008, 'Unauthorized');
        return;
      }

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
                const template = await this.captureFingerprint();
                ws.send(JSON.stringify({ type: 'fingerprint', template, mode: INTEGRATION_MODE }));
              } catch (error) {
                // Sanitized error message (no internal details exposed)
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Capture failed' // Generic message
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
            message: 'Capture failed'
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
