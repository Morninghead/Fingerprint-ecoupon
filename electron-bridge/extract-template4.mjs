// Extract fingerprint templates from ATT2000.MDB using TEMPLATE4 column (V10 format)
import MDBReader from 'mdb-reader';
import { readFileSync, writeFileSync } from 'fs';

const mdbPath = 'X:/FP-E-coupon/Thai01/ATT2000.MDB';
const outputPath = 'X:/FP-E-coupon/FpTest/bin/Release/net48/templates_cache.json';

async function main() {
    console.log('Reading MDB file...');

    const buffer = readFileSync(mdbPath);
    const reader = new MDBReader(buffer);

    console.log('✅ MDB opened!');

    // Read TEMPLATE table - need TEMPLATEIE table which has TEMPLATE4
    const tables = reader.getTableNames();
    console.log('Tables:', tables);

    // Check for TEMPLATEIE table (contains TEMPLATE4)
    let templateTableName = 'TEMPLATEIE';
    if (!tables.includes(templateTableName)) {
        templateTableName = 'TEMPLATE';
        console.log('⚠️ TEMPLATEIE not found, using TEMPLATE');
    }

    const templateTable = reader.getTable(templateTableName);
    const templates = templateTable.getData();
    const columns = templateTable.getColumnNames();

    console.log(`\n--- ${templateTableName} Table ---`);
    console.log(`Total records: ${templates.length}`);
    console.log('Columns:', columns);

    // Check if TEMPLATE4 column exists
    const hasTemplate4 = columns.includes('TEMPLATE4');
    console.log('Has TEMPLATE4:', hasTemplate4);

    if (templates.length > 0) {
        // Show first record
        console.log('\nFirst record:');
        const first = templates[0];
        Object.entries(first).forEach(([key, val]) => {
            if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
                const buf = Buffer.from(val);
                console.log(`  ${key}: Binary(${val.length} bytes) - ${buf.slice(0, 20).toString('hex')}`);
            } else {
                console.log(`  ${key}: ${val}`);
            }
        });

        // Extract templates using TEMPLATE4 if available
        const exportTemplates = [];
        let skipped = 0;

        for (const t of templates) {
            const userId = t.USERID || t.UserID || t.userid;
            const fingerId = t.FINGERID || t.FingerID || t.fingerid || 0;

            // Try TEMPLATE4 first, fallback to TEMPLATE
            let templateData = hasTemplate4 ? (t.TEMPLATE4 || t.Template4) : null;
            if (!templateData) {
                templateData = t.TEMPLATE || t.Template;
            }

            if (!templateData || templateData.length === 0) {
                skipped++;
                continue;
            }

            const base64 = Buffer.from(templateData).toString('base64');

            exportTemplates.push({
                mdb_user_id: userId,
                finger_id: fingerId,
                template_data: base64
            });
        }

        console.log(`\nExported: ${exportTemplates.length} templates`);
        console.log(`Skipped: ${skipped} empty templates`);

        if (exportTemplates.length > 0) {
            // Show first exported template info
            const firstExport = exportTemplates[0];
            const firstBuf = Buffer.from(firstExport.template_data, 'base64');
            console.log('\nFirst exported template:');
            console.log(`  user_id: ${firstExport.mdb_user_id}`);
            console.log(`  finger_id: ${firstExport.finger_id}`);
            console.log(`  size: ${firstBuf.length} bytes`);
            console.log(`  header: ${firstBuf.slice(0, 20).toString('hex')}`);

            // Save to cache file
            const cacheData = {
                version: "10",
                format: hasTemplate4 ? "TEMPLATE4" : "TEMPLATE",
                extracted_at: new Date().toISOString(),
                templates: exportTemplates
            };

            writeFileSync(outputPath, JSON.stringify(cacheData, null, 2));
            console.log(`\n✅ Saved to: ${outputPath}`);
        }
    }
}

main().catch(console.error);
