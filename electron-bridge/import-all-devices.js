// Import ALL logs from ALL devices (no date filter, with duplicate check)
const ZKLib = require('zkteco-js');
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

async function importFromDevice(device) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${device.name} (${device.ip})`);
    console.log('='.repeat(60));

    const zk = new ZKLib(device.ip, 4370, 10000, 4000);

    try {
        await zk.createSocket();
        console.log('✅ Connected');

        const result = await zk.getAttendances();
        console.log(`Fetched: ${result.data.length} records`);

        // Filter valid records only
        const validLogs = result.data.filter(log => {
            if (!log.user_id) return false;
            const d = new Date(log.record_time);
            return !isNaN(d.getTime()) && d.getFullYear() >= 2020;
        });

        console.log(`Valid logs: ${validLogs.length}`);

        if (validLogs.length === 0) {
            await zk.disconnect();
            return { device: device.name, fetched: result.data.length, valid: 0, inserted: 0 };
        }

        // Convert to DB format - บันทึกเป็น SCAN ทั้งหมด
        const records = validLogs.map(log => ({
            employee_code: String(log.user_id),
            check_time: new Date(log.record_time).toISOString(),
            check_type: 'SCAN',  // ระบบจะคำนวณ IN/OUT ภายหลังตามกะ
            raw_state: log.state ?? null,  // เก็บค่าดิบจากเครื่อง
            device_ip: device.ip
        }));

        console.log('Uploading to Supabase (upsert - no duplicates)...');

        let inserted = 0;
        let errors = 0;

        for (let i = 0; i < records.length; i += 100) {
            const batch = records.slice(i, i + 100);
            const { data, error } = await supabase
                .from('attendance')
                .upsert(batch, { onConflict: 'employee_code,check_time,device_ip' })
                .select();

            if (error) {
                errors += batch.length;
            } else {
                inserted += data?.length || 0;
            }
            process.stdout.write(`\rProgress: ${Math.min(i + 100, records.length)}/${records.length}`);
        }

        console.log(`\n✅ Inserted/Updated: ${inserted}`);

        await zk.disconnect();
        return { device: device.name, fetched: result.data.length, valid: validLogs.length, inserted };

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        try { await zk.disconnect(); } catch (e) { }
        return { device: device.name, error: error.message, inserted: 0 };
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('IMPORTING ALL LOGS FROM ALL DEVICES');
    console.log('Using UPSERT to prevent duplicates');
    console.log('='.repeat(60));

    const results = [];

    for (const device of DEVICES) {
        const result = await importFromDevice(device);
        results.push(result);
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    let totalInserted = 0;
    results.forEach(r => {
        if (r.error) {
            console.log(`${r.device}: ❌ ${r.error}`);
        } else {
            console.log(`${r.device}: ${r.valid} valid → ${r.inserted} inserted`);
            totalInserted += r.inserted;
        }
    });

    console.log(`\nTOTAL: ${totalInserted} records`);

    // Get total count in DB
    const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });
    console.log(`Total in Supabase: ${count}`);
}

main().catch(console.error);
