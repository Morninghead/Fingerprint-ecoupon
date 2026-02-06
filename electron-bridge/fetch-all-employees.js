// Fetch all employees from all 4 Thai01 devices
const ZKLib = require('zkteco-js');

const DEVICES = [
    { ip: '192.168.0.151', name: 'Thai01-1' },
    { ip: '192.168.0.152', name: 'Thai01-2' },
    { ip: '192.168.0.153', name: 'Thai01-3' },
    { ip: '192.168.0.154', name: 'Thai01-4' },
];

async function fetchFromDevice(device) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Connecting to ${device.name} (${device.ip})...`);

    const zk = new ZKLib(device.ip, 4370, 10000, 4000);

    try {
        await zk.createSocket();
        console.log(`✅ Connected to ${device.name}`);

        // Get device info
        const info = await zk.getInfo();
        console.log(`   Users: ${info.userCounts}, Logs: ${info.logCounts}`);

        // Get all users
        const result = await zk.getUsers();
        const users = result.data;

        console.log(`   Fetched ${users.length} employees`);

        // Show sample
        console.log('\n   Sample (first 10):');
        users.slice(0, 10).forEach((u, i) => {
            console.log(`   [${i + 1}] UID: ${u.uid}, UserID: ${u.userId}, Name: ${u.name}`);
        });

        await zk.disconnect();

        return {
            device: device.name,
            ip: device.ip,
            userCount: info.userCounts,
            users: users
        };

    } catch (error) {
        console.error(`❌ Error on ${device.name}: ${error.message}`);
        try { await zk.disconnect(); } catch (e) { }
        return { device: device.name, ip: device.ip, error: error.message, users: [] };
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('FETCHING EMPLOYEES FROM ALL THAI01 DEVICES');
    console.log('='.repeat(60));

    const allResults = [];

    // Fetch from each device sequentially
    for (const device of DEVICES) {
        const result = await fetchFromDevice(device);
        allResults.push(result);
    }

    // Combine all unique employees (by UserID)
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const allEmployees = new Map();

    for (const result of allResults) {
        console.log(`\n${result.device} (${result.ip}):`);
        if (result.error) {
            console.log(`   ❌ Error: ${result.error}`);
        } else {
            console.log(`   ✅ ${result.users.length} employees`);

            // Add to map (dedupe by UserID)
            result.users.forEach(u => {
                if (!allEmployees.has(u.userId)) {
                    allEmployees.set(u.userId, {
                        uid: u.uid,
                        userId: u.userId, // This is the 5-digit employee code
                        name: u.name,
                        sourceDevice: result.ip
                    });
                }
            });
        }
    }

    console.log('\n' + '-'.repeat(60));
    console.log(`TOTAL UNIQUE EMPLOYEES: ${allEmployees.size}`);
    console.log('-'.repeat(60));

    // Show all unique employees
    const employees = Array.from(allEmployees.values());
    console.log('\nAll unique employee codes (UserID):');

    // Filter to only 5-digit numeric codes
    const valid5Digit = employees.filter(e => /^\d{5}$/.test(e.userId));
    console.log(`5-digit codes: ${valid5Digit.length}`);

    const others = employees.filter(e => !/^\d{5}$/.test(e.userId));
    console.log(`Other codes: ${others.length}`);

    if (others.length > 0) {
        console.log('\nNon-5-digit codes:');
        others.forEach(e => console.log(`   ${e.userId}`));
    }

    // Save to file for import
    const fs = require('fs');
    fs.writeFileSync('employees-from-devices.json', JSON.stringify({
        fetchedAt: new Date().toISOString(),
        totalUnique: employees.length,
        valid5Digit: valid5Digit.length,
        employees: employees
    }, null, 2));

    console.log('\n✅ Saved to employees-from-devices.json');
}

main().catch(console.error);
