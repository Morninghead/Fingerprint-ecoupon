// Import employees from JSON to Supabase
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Company ID from seed data
const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

async function main() {
    console.log('='.repeat(60));
    console.log('IMPORTING EMPLOYEES TO SUPABASE');
    console.log('='.repeat(60));
    console.log(`Supabase URL: ${supabaseUrl}`);

    // Load JSON
    const data = JSON.parse(fs.readFileSync('employees-from-devices.json', 'utf-8'));
    console.log(`\nLoaded ${data.employees.length} employees from JSON`);

    // Filter to valid 5-digit codes only
    const validEmployees = data.employees.filter(e => /^\d{5}$/.test(e.userId));
    console.log(`Valid 5-digit codes: ${validEmployees.length}`);

    // Prepare records for Supabase
    const records = validEmployees.map(emp => ({
        pin: emp.userId, // 5-digit employee code as PIN
        name: emp.name || `Employee ${emp.userId}`, // Use name or fallback
        company_id: COMPANY_ID,
        fingerprint_template: null // No fingerprint from zkteco-js
    }));

    console.log(`\nSample records to insert:`);
    records.slice(0, 5).forEach((r, i) => {
        console.log(`  [${i + 1}] PIN: ${r.pin}, Name: ${r.name}`);
    });

    // Check existing employees
    console.log('\n--- Checking existing employees ---');
    const { data: existing, error: selectErr } = await supabase
        .from('employees')
        .select('pin');

    if (selectErr) {
        console.error('Error fetching existing:', selectErr);
        return;
    }

    const existingPins = new Set(existing.map(e => e.pin));
    console.log(`Existing in DB: ${existingPins.size}`);

    // Filter out already existing
    const newRecords = records.filter(r => !existingPins.has(r.pin));
    console.log(`New to insert: ${newRecords.length}`);

    if (newRecords.length === 0) {
        console.log('\n✅ All employees already exist in database!');
        return;
    }

    // Insert in batches of 100
    console.log('\n--- Inserting new employees ---');
    const BATCH_SIZE = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < newRecords.length; i += BATCH_SIZE) {
        const batch = newRecords.slice(i, i + BATCH_SIZE);
        const { data: result, error } = await supabase
            .from('employees')
            .insert(batch)
            .select();

        if (error) {
            console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
            errors += batch.length;
        } else {
            inserted += result.length;
            console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${result.length}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`❌ Errors: ${errors}`);

    // Verify count
    const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });
    console.log(`\nTotal employees in DB: ${count}`);
}

main().catch(console.error);
