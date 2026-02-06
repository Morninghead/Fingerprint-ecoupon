// Import ALL fingerprint templates to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.local' });

// Read env directly since service role key might not be in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ojpiwbsxuocflmxxdpwb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found');
    console.log('Please add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fpFolder = 'X:/FP-E-coupon/electron-bridge/fp-templates';
const mappingFile = 'X:/FP-E-coupon/electron-bridge/userid-mapping.json';

async function importTemplates() {
    console.log('='.repeat(60));
    console.log('IMPORTING FINGERPRINT TEMPLATES TO SUPABASE');
    console.log('='.repeat(60));

    // Load USERID -> Badgenumber mapping
    const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
    console.log(`Loaded ${Object.keys(mapping).length} USERID mappings`);

    // Get all template files
    const files = fs.readdirSync(fpFolder).filter(f => f.endsWith('.bin'));
    console.log(`Found ${files.length} template files`);
    console.log('');

    const batchSize = 100;
    let inserted = 0;
    let errors = 0;
    let batch = [];

    for (const file of files) {
        const match = file.match(/user_(\d+)_finger_(\d+)/);
        if (!match) continue;

        const userId = parseInt(match[1]);
        const fingerId = parseInt(match[2]);
        const employeeCode = mapping[userId] || String(userId);

        // Read template binary and convert to base64
        const templatePath = path.join(fpFolder, file);
        const templateData = fs.readFileSync(templatePath);
        const base64Data = templateData.toString('base64');

        batch.push({
            mdb_user_id: userId,
            employee_code: employeeCode,
            finger_id: fingerId,
            template_data: base64Data,
            template_size: templateData.length
        });

        // Insert in batches
        if (batch.length >= batchSize) {
            const { data, error } = await supabase
                .from('fingerprint_templates')
                .upsert(batch, { onConflict: 'mdb_user_id,finger_id' });

            if (error) {
                console.error('Batch error:', error.message);
                errors += batch.length;
            } else {
                inserted += batch.length;
                console.log(`Inserted: ${inserted} / ${files.length}`);
            }
            batch = [];
        }
    }

    // Insert remaining
    if (batch.length > 0) {
        const { data, error } = await supabase
            .from('fingerprint_templates')
            .upsert(batch, { onConflict: 'mdb_user_id,finger_id' });

        if (error) {
            console.error('Final batch error:', error.message);
            errors += batch.length;
        } else {
            inserted += batch.length;
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`❌ Errors: ${errors}`);
}

importTemplates().catch(console.error);
