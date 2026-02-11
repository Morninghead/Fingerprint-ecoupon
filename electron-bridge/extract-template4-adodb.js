// Extract fingerprint templates from ATT2000.MDB using ODBC (can read binary data)
const ADODB = require('node-adodb');
const fs = require('fs');

const mdbPath = 'X:\\FP-E-coupon\\Thai01\\ATT2000.MDB';
const outputPath = 'X:\\FP-E-coupon\\FpTest\\bin\\Release\\net48\\templates_cache.json';

// Connection string for 32-bit Access
const connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${mdbPath};`);

async function main() {
    console.log('Reading MDB via ADODB...');

    try {
        // Query TEMPLATE table with TEMPLATE4 column
        console.log('\nQuerying TEMPLATE table...');
        const templates = await connection.query(`
            SELECT USERID, FINGERID, TEMPLATE4, DivisionFP 
            FROM TEMPLATE 
            WHERE TEMPLATE4 IS NOT NULL
        `);

        console.log(`Total templates: ${templates.length}`);

        if (templates.length > 0) {
            console.log('\nFirst template:');
            const first = templates[0];
            console.log('  USERID:', first.USERID);
            console.log('  FINGERID:', first.FINGERID);
            console.log('  DivisionFP:', first.DivisionFP);

            // TEMPLATE4 should be binary buffer
            const template4 = first.TEMPLATE4;
            if (Buffer.isBuffer(template4)) {
                console.log('  TEMPLATE4:', `Buffer(${template4.length} bytes) - ${template4.slice(0, 20).toString('hex')}`);
            } else {
                console.log('  TEMPLATE4 type:', typeof template4).length;
                console.log('  TEMPLATE4:', template4);
            }

            // Export all templates
            const exportTemplates = [];
            let skipped = 0;

            for (const t of templates) {
                const templateData = t.TEMPLATE4;

                if (!templateData || !Buffer.isBuffer(templateData) || templateData.length === 0) {
                    skipped++;
                    continue;
                }

                exportTemplates.push({
                    mdb_user_id: t.USERID,
                    finger_id: t.FINGERID,
                    template_data: templateData.toString('base64')
                });
            }

            console.log(`\nExported: ${exportTemplates.length} templates`);
            console.log(`Skipped: ${skipped}`);

            if (exportTemplates.length > 0) {
                const firstExport = exportTemplates[0];
                const firstBuf = Buffer.from(firstExport.template_data, 'base64');
                console.log('\nFirst exported:');
                console.log(`  size: ${firstBuf.length} bytes`);
                console.log(`  header: ${firstBuf.slice(0, 20).toString('hex')}`);

                // Save
                const cacheData = {
                    version: "10",
                    format: "TEMPLATE4",
                    extracted_at: new Date().toISOString(),
                    templates: exportTemplates
                };

                fs.writeFileSync(outputPath, JSON.stringify(cacheData, null, 2));
                console.log(`\n✅ Saved to: ${outputPath}`);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);

        if (err.message.includes('Provider')) {
            console.log('\n⚠️ Need Microsoft Access Database Engine (32-bit)');
            console.log('Or try running with 32-bit node.js');
        }
    }
}

main().catch(console.error);
