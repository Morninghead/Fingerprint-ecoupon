/**
 * Simple ZK9500 Test with zkteco-js
 * 
 * Tests if we can communicate with the ZK9500 scanner
 * without needing to compile C++ code
 */

console.log('==============================================');
console.log('ZK9500 Scanner Test (zkteco-js)');
console.log('==============================================\n');

// Try to load zkteco-js
let ZktecoJs;
try {
    ZktecoJs = require('zkteco-js');
    console.log('[OK] zkteco-js library loaded');
} catch (error) {
    console.log('[ERROR] zkteco-js not installed');
    console.log('Run: npm install zkteco-js');
    process.exit(1);
}

// Test with localhost (USB mode)
// Note: zkteco-js typically works with networked devices,
// but some USB devices can be accessed via localhost
async function testScanner() {
    console.log('\nAttempting to connect to scanner...');
    console.log('Device: ZK9500 USB');
    console.log('Serial: 1967254100140\n');

    // Try different connection modes
    const modes = [
        { ip: '127.0.0.1', port: 4370, name: 'Localhost (USB Bridge)' },
        { ip: 'localhost', port: 4370, name: 'Localhost Named' },
    ];

    for (const mode of modes) {
        console.log(`Trying: ${mode.name} (${mode.ip}:${mode.port})...`);

        try {
            const device = new ZktecoJs(mode.ip, mode.port, 5200, 5000);
            await device.createSocket();

            console.log('[SUCCESS] Connected!');

            // Try to get device info
            try {
                const info = await device.getInfo();
                console.log('\nDevice Info:');
                console.log(JSON.stringify(info, null, 2));
            } catch (e) {
                console.log('Could not get device info');
            }

            await device.disconnect();
            process.exit(0);

        } catch (error) {
            console.log(`[FAIL] ${error.message}`);
        }
    }

    console.log('\n[INFO] Could not connect via network mode');
    console.log('[INFO] ZK9500 USB scanner needs SDK/CLI mode');
    console.log('');
    console.log('Next steps:');
    console.log('1. Use mock mode (already working!)');
    console.log('2. Build CLI (needs C++ compiler)');
    console.log('3. Contact ZKTeco for USB-compatible library');
    process.exit(1);
}

testScanner().catch(console.error);
