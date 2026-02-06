// Run SQL migration on Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Creating attendance table...');

    // Since we can't run raw SQL from JS client, we'll use RPC or just test insert
    // First, let's try inserting a test record to see if table exists

    const testRecord = {
        employee_code: 'TEST',
        check_time: new Date().toISOString(),
        check_type: 'I',
        device_ip: '0.0.0.0'
    };

    const { data, error } = await supabase
        .from('attendance')
        .insert(testRecord)
        .select();

    if (error) {
        if (error.message.includes('does not exist')) {
            console.log('❌ Table "attendance" does not exist!');
            console.log('\nPlease run this SQL in Supabase Dashboard:');
            console.log('='.repeat(50));
            console.log(fs.readFileSync('../supabase/migrations/002_attendance_table.sql', 'utf-8'));
            console.log('='.repeat(50));
        } else {
            console.error('Error:', error);
        }
    } else {
        console.log('✅ Table exists! Test record inserted:', data);

        // Delete test record
        await supabase.from('attendance').delete().eq('employee_code', 'TEST');
        console.log('✅ Test record cleaned up');
    }
}

main().catch(console.error);
