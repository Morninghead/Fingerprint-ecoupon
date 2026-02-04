const WebSocket = require('ws');

class FingerprintBridge {
  constructor(port = 8081) {
    this.port = port;
    this.wss = new WebSocket.Server({ port });
    this.setupWebSocket();
  }

  captureFingerprint() {
    return new Promise((resolve, reject) => {
      // This is a placeholder for ZK9500 SDK integration
      // In production, this would call the actual SDK to capture fingerprint
      // For now, we simulate a fingerprint capture

      // Simulate SDK delay
      setTimeout(() => {
        // Generate a mock fingerprint template
        const mockTemplate = Buffer.from('mock_fingerprint_template').toString('base64');
        resolve(mockTemplate);
      }, 1000);

      // Example of how ZK9500 SDK would be called:
      // const sdk = spawn('./sdk/zk9500-capture', ['--format', 'base64']);
      // sdk.stdout.on('data', (data) => {
      //   resolve(data.toString().trim());
      // });
      // sdk.on('close', (code) => {
      //   if (code !== 0) reject(new Error(`SDK failed with code ${code}`));
      // });
    });
  }

  setupWebSocket() {
    console.log(`Fingerprint bridge running on ws://localhost:${this.port}`);

    this.wss.on('connection', (ws) => {
      console.log('New client connected');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log('Received:', data.type);

          switch (data.type) {
            case 'capture':
              try {
                const template = await this.captureFingerprint();
                ws.send(JSON.stringify({ type: 'fingerprint', template }));
              } catch (error) {
                ws.send(JSON.stringify({ type: 'error', message: error.message }));
              }
              break;

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;

            default:
              ws.send(JSON.stringify({ type: 'error', message: 'Unknown command' }));
          }
        } catch (error) {
          console.error('Error processing message:', error);
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
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
