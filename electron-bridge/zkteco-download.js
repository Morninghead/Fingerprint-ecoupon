// Connect to ZKTeco device and download users + fingerprints
const ZKLib = require('zkteco-js');

const DEVICE_IP = '192.168.0.151';
const DEVICE_PORT = 4370;

async function main() {
    console.log('='.repeat(60));
    console.log(`Connecting to ZKTeco @ ${DEVICE_IP}:${DEVICE_PORT}...`);
    console.log('='.repeat(60));

    const zkInstance = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

    try {
        // Connect
        await zkInstance.createSocket();
        console.log('✅ Connected!');

        // Get device info
        console.log('\n--- Device Info ---');
        const info = await zkInstance.getInfo();
        console.log('Info:', info);

        // Get users
        console.log('\n--- Users (first 20) ---');
        const users = await zkInstance.getUsers();
        console.log(`Total users: ${users.data.length}`);

        users.data.slice(0, 20).forEach((user, i) => {
            console.log(`[${i + 1}] ID: ${user.uid}, Name: ${user.name}, UserID: ${user.userId}`);
        });

        // Get fingerprint templates
        console.log('\n--- Fingerprints ---');
        try {
            const templates = await zkInstance.getTemplates();
            console.log(`Total templates: ${templates.data ? templates.data.length : 0}`);

            if (templates.data && templates.data.length > 0) {
                templates.data.slice(0, 10).forEach((tpl, i) => {
                    console.log(`[${i + 1}] UID: ${tpl.uid}, FingerID: ${tpl.index}, Size: ${tpl.template ? tpl.template.length : 0}`);
                });
            }
        } catch (tplErr) {
            console.log('Template error:', tplErr.message);
        }

        // Get attendance logs (last 20)
        console.log('\n--- Attendance Logs (last 20) ---');
        const logs = await zkInstance.getAttendances();
        console.log(`Total logs: ${logs.data.length}`);

        logs.data.slice(-20).forEach((log, i) => {
            console.log(`  ${log.id} @ ${log.timestamp}`);
        });

        // Disconnect
        await zkInstance.disconnect();
        console.log('\n✅ Disconnected');

    } catch (error) {
        console.error('❌ Error:', error.message);
        try {
            await zkInstance.disconnect();
        } catch (e) { }
    }
}

main();
