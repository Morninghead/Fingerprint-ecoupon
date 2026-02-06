/**
 * Standalone Bridge Server
 * Runs WebSocket server without Electron
 */

const FingerprintBridge = require('./fingerprint');

console.log('========================================');
console.log('ZK9500 Fingerprint Bridge');
console.log('========================================');
console.log('Mode:', process.env.ZK_INTEGRATION_MODE || 'hybrid-mock');
console.log('');

// Start the bridge
const bridge = new FingerprintBridge(8081);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down bridge...');
    bridge.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down bridge...');
    bridge.close();
    process.exit(0);
});

console.log('Press Ctrl+C to stop the bridge');
