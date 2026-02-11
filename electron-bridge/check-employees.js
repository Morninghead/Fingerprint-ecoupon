#!/usr/bin/env node
/**
 * Check employee data structure
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function check() {
    const { data: employees } = await supabase
        .from('employees')
        .select('id, name, pin, employee_code')
        .limit(5);

    console.log('Sample employees:');
    console.log(JSON.stringify(employees, null, 2));
}

check();
