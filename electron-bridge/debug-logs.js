// Check oldest log and device info for SSTH-Entrance
const ZKLib = require('zkteco-js');

async function main() {
    const zk = new ZKLib('192.168.0.151', 4370, 10000, 4000);

    console.log('Connecting to SSTH-Entrance (192.168.0.151)...');
    await zk.createSocket();
    console.log('Connected!');

    // Device info
    const info = await zk.getInfo();
    console.log('\n--- Device Info ---');
    console.log(`Users: ${info.userCounts}`);
    console.log(`Logs: ${info.logCounts}`);
    console.log(`Log Capacity: ${info.logCapacity}`);
    console.log(`Usage: ${((info.logCounts / info.logCapacity) * 100).toFixed(1)}%`);

    // Get logs
    const result = await zk.getAttendances();
    console.log(`\nFetched: ${result.data.length} records`);

    // Find oldest log with valid data
    const validLogs = result.data.filter(log => log.user_id && log.record_time);
    validLogs.sort((a, b) => new Date(a.record_time) - new Date(b.record_time));

    console.log('\n--- Oldest 10 logs ---');
    validLogs.slice(0, 10).forEach((log, i) => {
        console.log(`${i + 1}. ${log.user_id} @ ${log.record_time}`);
    });

    console.log('\n--- Newest 10 logs ---');
    validLogs.slice(-10).forEach((log, i) => {
        console.log(`${i + 1}. ${log.user_id} @ ${log.record_time}`);
    });

    // Check available methods
    console.log('\n--- Available ZK methods ---');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(zk))
        .filter(m => typeof zk[m] === 'function' && !m.startsWith('_'));
    console.log(methods.join(', '));

    await zk.disconnect();
}

main().catch(console.error);
