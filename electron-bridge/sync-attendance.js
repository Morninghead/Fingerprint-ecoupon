// Sync attendance from ZKTeco devices to Supabase
// Only syncs from START_DATE onwards
const ZKLib = require('zkteco-js');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEVICES = [
    { ip: '192.168.0.151', name: 'SSTH-Entrance' },
    { ip: '192.168.0.152', name: 'SSTH-Factory A' },
    { ip: '192.168.0.153', name: 'Haoli' },
    { ip: '192.168.0.154', name: 'PPS' },
];

// Only sync from this date onwards (26 Dec 2025)
const START_DATE = new Date('2025-12-26T00:00:00');

const STATE_FILE = 'sync-state.json';

function loadState() {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch {
        return { lastSync: {}, lastRun: null };
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function fetchAttendanceFromDevice(device, lastSyncTime) {
    console.log(`\n--- ${device.name} (${device.ip}) ---`);

    const zk = new ZKLib(device.ip, 4370, 10000, 4000);

    try {
        await zk.createSocket();
        console.log(`✅ Connected`);

        const info = await zk.getInfo();
        console.log(`   Logs in device: ${info.logCounts}`);

        const result = await zk.getAttendances();
        const allLogs = result.data;
        console.log(`   Fetched: ${allLogs.length} total records`);

        // Correct field names: user_id, record_time, state
        const cutoffTime = lastSyncTime ? new Date(lastSyncTime) : START_DATE;
        const effectiveCutoff = cutoffTime > START_DATE ? cutoffTime : START_DATE;

        const newLogs = allLogs.filter(log => {
            const logTime = new Date(log.record_time);
            return logTime >= START_DATE && logTime > effectiveCutoff && log.user_id;
        });

        console.log(`   Valid logs >= 26/12/2025: ${newLogs.length} records`);

        // Show sample of valid logs
        if (newLogs.length > 0) {
            console.log(`   Sample: ${newLogs[0].user_id} @ ${newLogs[0].record_time}`);
        }

        await zk.disconnect();

        return newLogs.map(log => ({
            employee_code: String(log.user_id),
            check_time: new Date(log.record_time).toISOString(),
            check_type: log.state === 0 ? 'I' : 'O',
            device_ip: device.ip
        }));

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        try { await zk.disconnect(); } catch (e) { }
        return [];
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('ATTENDANCE SYNC - ' + new Date().toISOString());
    console.log('Filter: >= 26/12/2025');
    console.log('='.repeat(60));

    const state = loadState();
    console.log('Last run:', state.lastRun || 'Never');

    let totalNew = 0;
    let totalInserted = 0;

    for (const device of DEVICES) {
        const lastSync = state.lastSync[device.ip] || null;
        const newRecords = await fetchAttendanceFromDevice(device, lastSync);

        if (newRecords.length > 0) {
            totalNew += newRecords.length;

            const latestTime = newRecords.reduce((max, r) =>
                r.check_time > max ? r.check_time : max, newRecords[0].check_time);

            console.log(`   Uploading ${newRecords.length} to Supabase...`);

            for (let i = 0; i < newRecords.length; i += 100) {
                const batch = newRecords.slice(i, i + 100);
                const { data, error } = await supabase
                    .from('attendance')
                    .upsert(batch, { onConflict: 'employee_code,check_time,device_ip' })
                    .select();

                if (error) {
                    console.error(`   Batch error: ${error.message}`);
                } else {
                    totalInserted += data?.length || 0;
                }
            }

            state.lastSync[device.ip] = latestTime;
        }
    }

    state.lastRun = new Date().toISOString();
    saveState(state);

    console.log('\n' + '='.repeat(60));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total new records: ${totalNew}`);
    console.log(`Total inserted: ${totalInserted}`);
}

main().catch(console.error);
