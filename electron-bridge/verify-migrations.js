#!/usr/bin/env node
/**
 * Verify migration success
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('🔍 Verifying migrations...\n');

    // Check shifts table
    const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*');

    if (shiftError) {
        console.log('❌ shifts table:', shiftError.message);
    } else {
        console.log('✅ shifts table exists:');
        shifts.forEach(s => {
            console.log(`   - ${s.name}: ${s.start_time} - ${s.end_time} (OT after ${s.ot_start_time})`);
        });
    }

    // Check work_records table
    const { data: records, error: recordError } = await supabase
        .from('work_records')
        .select('*')
        .limit(1);

    if (recordError) {
        console.log('❌ work_records table:', recordError.message);
    } else {
        console.log('✅ work_records table exists');
    }

    // Check attendance columns
    const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('id, raw_state, calculated_type, shift_id')
        .limit(1);

    if (attError) {
        console.log('❌ attendance columns:', attError.message);
    } else {
        console.log('✅ attendance table updated (raw_state, calculated_type, shift_id)');
    }

    console.log('\n🎉 Migration verification complete!');
}

verify();
