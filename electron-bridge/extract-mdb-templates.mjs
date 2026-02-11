// Extract fingerprint templates from ATT2000.MDB using mdb-reader (pure JS)
import MDBReader from 'mdb-reader';
import { readFileSync, writeFileSync } from 'fs';

const mdbPath = 'X:/FP-E-coupon/Thai01/ATT2000.MDB';

async function main() {
    console.log('Reading MDB file...');

    const buffer = readFileSync(mdbPath);
    const reader = new MDBReader(buffer);

    console.log('✅ MDB opened!');
    console.log('\nTables:', reader.getTableNames());

    // Read TEMPLATE table
    console.log('\n--- TEMPLATE Table ---');
    const templateTable = reader.getTable('TEMPLATE');
    const templates = templateTable.getData();

    console.log(`Total templates: ${templates.length}`);
    console.log('Columns:', templateTable.getColumnNames());

    if (templates.length > 0) {
        // Show first record
        console.log('\nFirst template:');
        const first = templates[0];
        Object.entries(first).forEach(([key, val]) => {
            if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
                console.log(`  ${key}: Binary(${val.length} bytes) - ${Buffer.from(val.slice(0, 20)).toString('hex')}...`);
            } else {
                console.log(`  ${key}: ${val}`);
            }
        });

        // Count users
        const users = new Set(templates.map(t => t.UserID));
        console.log(`\nUnique users with templates: ${users.size}`);

        // Save template data to JSON for inspection
        const exportData = templates.slice(0, 10).map(t => ({
            ...t,
            Template: t.Template ? `Binary(${t.Template.length} bytes)` : null
        }));
        writeFileSync('template-sample.json', JSON.stringify(exportData, null, 2));
        console.log('\nSample saved to template-sample.json');
    }
}

main().catch(console.error);
