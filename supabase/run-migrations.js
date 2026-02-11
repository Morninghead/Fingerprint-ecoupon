#!/usr/bin/env node
/**
 * Run migrations via Supabase REST API
 */

require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Running migrations...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'run_migrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into statements
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;

        console.log(`[${i + 1}/${statements.length}] Executing...`);

        try {
            const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });

            if (error) {
                // Try direct query for DDL
                console.log(`   ⚠️ RPC failed, statement: ${stmt.substring(0, 50)}...`);
            } else {
                console.log(`   ✅ Success`);
            }
        } catch (err) {
            console.log(`   ⚠️ ${err.message}`);
        }
    }

    console.log('\n✅ Migration script completed!');
    console.log('\n📋 Please run the SQL in supabase/run_migrations.sql');
    console.log('   via Supabase Dashboard > SQL Editor');
}

runMigration();
