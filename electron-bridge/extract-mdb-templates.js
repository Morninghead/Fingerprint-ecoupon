// Extract fingerprint templates from ATT2000.MDB using ODBC
const odbc = require('odbc');

const mdbPath = 'X:\\FP-E-coupon\\Thai01\\ATT2000.MDB';
const connectionString = `Driver={Microsoft Access Driver (*.mdb)};DBQ=${mdbPath};`;

async function main() {
    console.log('Connecting to MDB via ODBC...');

    try {
        const connection = await odbc.connect(connectionString);
        console.log('✅ Connected!');

        // List all tables
        const tables = await connection.tables(null, null, null, 'TABLE');
        console.log('\nTables in MDB:');
        tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

        // Check TEMPLATE table
        console.log('\n--- TEMPLATE Table ---');
        const templates = await connection.query('SELECT * FROM TEMPLATE');
        console.log(`Total templates: ${templates.length}`);

        if (templates.length > 0) {
            // Show columns
            console.log('\nColumns:', Object.keys(templates[0]));

            // Show first record
            console.log('\nFirst template:');
            const first = templates[0];
            Object.keys(first).forEach(key => {
                const val = first[key];
                if (Buffer.isBuffer(val)) {
                    console.log(`  ${key}: Buffer(${val.length} bytes) - ${val.slice(0, 20).toString('hex')}...`);
                } else {
                    console.log(`  ${key}: ${val}`);
                }
            });

            // Count users with templates
            const users = new Set(templates.map(t => t.UserID || t.userid));
            console.log(`\nUnique users with templates: ${users.size}`);

            // Count templates per finger
            const fingerCounts = {};
            templates.forEach(t => {
                const finger = t.FingerID || t.fingerid || 0;
                fingerCounts[finger] = (fingerCounts[finger] || 0) + 1;
            });
            console.log('\nTemplates by finger:');
            Object.entries(fingerCounts).forEach(([f, c]) => console.log(`  Finger ${f}: ${c}`));
        }

        await connection.close();
        console.log('\nDone!');

    } catch (err) {
        console.error('Error:', err.message);
        console.error('\nTry installing Access Database Engine:');
        console.error('https://www.microsoft.com/en-us/download/details.aspx?id=54920');
    }
}

main().catch(console.error);
