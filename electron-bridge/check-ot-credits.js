#!/usr/bin/env node
/**
 * Check OT meal credits
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function check() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking OT credits for: ${today}\n`);

    // Get all meal credits for today
    const { data: credits, error } = await supabase
        .from('meal_credits')
        .select('*, employees(name, pin)')
        .eq('date', today);

    if (error) {
        console.log('Error:', error.message);
        return;
    }

    console.log(`Total records: ${credits?.length || 0}`);

    const withOT = credits?.filter(c => c.ot_meal_available) || [];
    console.log(`With OT: ${withOT.length}`);

    console.log('\n--- Employees with OT meal ---');
    withOT.forEach(c => {
        console.log(`- ${c.employees?.name || 'Unknown'} (${c.employees?.pin})`);
    });

    console.log('\n--- Sample credits ---');
    credits?.slice(0, 10).forEach(c => {
        console.log(`${c.employees?.name}: lunch=${c.lunch_available}, ot=${c.ot_meal_available}`);
    });
}

check();
