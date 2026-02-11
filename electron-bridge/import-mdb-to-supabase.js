/**
 * Import V10 templates from MDB to Supabase
 * This will update the existing templates with V10 format data
 */
const ADODB = require('node-adodb');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const MDB_PATH = 'X:/FP-E-coupon/Thai01/ATT2000.MDB';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function importFromMDB() {
    console.log('📂 Connecting to MDB:', MDB_PATH);

    const connection = ADODB.open(
        `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${MDB_PATH};`
    );

    try {
        // Get templates from MDB - use TEMPLATE4 for V10 format
        console.log('\n🔍 Reading TEMPLATE table...');
        const templates = await connection.query(`
            SELECT USERID, FINGERID, TEMPLATE4, TEMPLATE 
            FROM TEMPLATE
        `);

        console.log(`📊 Found ${templates.length} records in MDB`);

        let processed = 0;
        let updated = 0;
        let errors = 0;

        for (const row of templates) {
            const userId = row.USERID;
            const fingerId = row.FINGERID;

            // Try TEMPLATE4 first (V10), fallback to TEMPLATE
            let templateData = row.TEMPLATE4 || row.TEMPLATE;

            if (!templateData || templateData.length < 100) {
                continue;
            }

            // Convert to base64 if it's binary
            let base64Data;
            if (Buffer.isBuffer(templateData)) {
                base64Data = templateData.toString('base64');
            } else if (typeof templateData === 'string') {
                // Already base64 or needs conversion
                base64Data = Buffer.from(templateData, 'binary').toString('base64');
            } else {
                continue;
            }

            // Log first few
            if (processed < 5) {
                const buf = Buffer.from(base64Data, 'base64');
                const header = buf.slice(0, 6).toString('hex').toUpperCase();
                console.log(`  #${processed + 1}: userId=${userId}, finger=${fingerId}, size=${buf.length}, header=${header}`);
            }

            // Upsert to Supabase
            const { error } = await supabase
                .from('fingerprint_templates')
                .upsert({
                    mdb_user_id: userId,
                    finger_id: fingerId,
                    template_data: base64Data,
                    template_size: Buffer.from(base64Data, 'base64').length,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'mdb_user_id,finger_id'
                });

            if (error) {
                errors++;
                if (errors <= 3) console.log(`  ❌ Error: ${error.message}`);
            } else {
                updated++;
            }

            processed++;

            // Progress update every 500
            if (processed % 500 === 0) {
                console.log(`  ⏳ Processed ${processed}...`);
            }
        }

        console.log('\n✅ Import completed!');
        console.log(`   Processed: ${processed}`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Errors: ${errors}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

importFromMDB().catch(console.error);
