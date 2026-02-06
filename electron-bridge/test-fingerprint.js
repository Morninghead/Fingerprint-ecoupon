// Test: Try to download fingerprint templates from ZKTeco device
const ZKLib = require('zkteco-js');
const net = require('net');

// Commands from zkteco protocol
const COMMANDS = {
    CMD_USERTEMP_RRQ: 9,
    CMD_DB_RRQ: 7,
    CMD_PREPARE_DATA: 1500,
    CMD_DATA: 1501,
    CMD_FREE_DATA: 1502,
};

async function main() {
    const zk = new ZKLib('192.168.0.151', 4370, 10000, 4000);

    console.log('Connecting to SSTH-Entrance...');
    await zk.createSocket();
    console.log('✅ Connected');

    // Get device info
    const info = await zk.getInfo();
    console.log(`Users: ${info.userCounts}`);
    console.log(`Fingerprint capacity: ${info.fingerprintCapacity || 'N/A'}`);

    // Get users first
    const usersResult = await zk.getUsers();
    console.log(`\nTotal users: ${usersResult.data.length}`);

    // Try to find users with fingerprint data
    const usersWithFP = usersResult.data.filter(u => u.cardno !== 0 || u.role !== 0);
    console.log(`Users with potential FP: ${usersWithFP.length}`);

    // Show sample user structure
    if (usersResult.data.length > 0) {
        console.log('\nSample user structure:');
        console.log(JSON.stringify(usersResult.data[0], null, 2));
    }

    // Try to execute CMD_USERTEMP_RRQ to get templates
    console.log('\n--- Attempting to read fingerprint templates ---');

    try {
        // Prepare request for user templates 
        // Format: [user_id (2 bytes), finger_idx (1 byte)]
        const testUserId = usersResult.data[0]?.uid || 1;
        const requestBuffer = Buffer.alloc(3);
        requestBuffer.writeUInt16LE(testUserId, 0);
        requestBuffer.writeUInt8(0, 2); // finger index 0

        const result = await zk.executeCmd(COMMANDS.CMD_USERTEMP_RRQ, requestBuffer);
        console.log('Template result:', result);
    } catch (err) {
        console.log('executeCmd error:', err.message);
    }

    await zk.disconnect();
    console.log('\nDone!');
}

main().catch(console.error);
