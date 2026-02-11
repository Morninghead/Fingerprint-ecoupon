// Import ALL logs from SSTH-Entrance (no date filter)
const ZKLib = require('zkteco-js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const zk = new ZKLib('192.168.0.151', 4370, 10000, 4000);

    console.log('='.repeat(60));
    console.log('IMPORTING ALL LOGS FROM SSTH-Entrance');
    console.log('='.repeat(60));

    await zk.createSocket();
    console.log('✅ Connected');

    const result = await zk.getAttendances();
    console.log(`Fetched: ${result.data.length} records`);

    // Filter only records with valid user_id and date
    const validLogs = result.data.filter(log => {
        if (!log.user_id) return false;
        const d = new Date(log.record_time);
        return !isNaN(d.getTime()) && d.getFullYear() >= 2000;
    });

    console.log(`Valid logs: ${validLogs.length}`);

    // Convert to DB format - บันทึกเป็น SCAN ทั้งหมด
    const records = validLogs.map(log => ({
        employee_code: String(log.user_id),
        check_time: new Date(log.record_time).toISOString(),
        check_type: 'SCAN',  // ระบบจะคำนวณ IN/OUT ภายหลังตามกะ
        raw_state: log.state ?? null,  // เก็บค่าดิบจากเครื่อง
        device_ip: '192.168.0.151'
    }));

    console.log('\nUploading to Supabase...');

    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += 100) {
        const batch = records.slice(i, i + 100);
        const { data, error } = await supabase
            .from('attendance')
            .upsert(batch, { onConflict: 'employee_code,check_time,device_ip' })
            .select();

        if (error) {
            console.error(`Batch ${Math.floor(i / 100) + 1} error: ${error.message}`);
            errors += batch.length;
        } else {
            inserted += data?.length || 0;
            process.stdout.write(`\rProgress: ${inserted}/${records.length}`);
        }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`❌ Errors: ${errors}`);

    await zk.disconnect();
}

main().catch(console.error);
