// Analyze USERINFO and TEMPLATE tables
const MDBReader = require('mdb-reader').default;
const fs = require('fs');
const path = require('path');

const mdbPath = path.join(__dirname, '..', 'Thai01', 'ATT2000.MDB');

try {
    const buffer = fs.readFileSync(mdbPath);
    const reader = new MDBReader(buffer);

    // TEMPLATE table (fingerprints)
    console.log('='.repeat(70));
    console.log('TABLE: TEMPLATE (Fingerprints)');
    console.log('='.repeat(70));

    const tplTable = reader.getTable('TEMPLATE');
    const tplCols = tplTable.getColumnNames();
    const tplData = tplTable.getData();

    console.log(`\nColumns (${tplCols.length}):`);
    tplCols.forEach(col => {
        const colDef = tplTable.getColumn(col);
        console.log(`  - ${col} (${colDef.type})`);
    });

    console.log(`\nTotal fingerprints: ${tplData.length}`);
    console.log('\nSample (first 50):');
    console.log('-'.repeat(70));

    // Group by UserID to see fingerprint count per user
    const userFpCount = {};
    tplData.forEach(row => {
        const uid = row.USERID || row.UserID || row.userid;
        if (!userFpCount[uid]) userFpCount[uid] = 0;
        userFpCount[uid]++;
    });

    console.log('\nFingerprints per user (sample):');
    Object.entries(userFpCount).slice(0, 20).forEach(([uid, count]) => {
        console.log(`  UserID ${uid}: ${count} fingerprint(s)`);
    });

    console.log('\n\nRaw template data (first 10):');
    tplData.slice(0, 10).forEach((row, i) => {
        console.log(`\n[${i + 1}]`);
        for (const col of tplCols) {
            let value = row[col];
            if (Buffer.isBuffer(value)) {
                value = `[Binary ${value.length} bytes] ${value.slice(0, 20).toString('hex')}...`;
            } else if (typeof value === 'string' && value.length > 50) {
                value = value.substring(0, 50) + '...';
            }
            console.log(`  ${col}: ${value}`);
        }
    });

    // Also show CHECKINOUT (attendance logs)
    console.log('\n' + '='.repeat(70));
    console.log('TABLE: CHECKINOUT (Attendance)');
    console.log('='.repeat(70));

    const checkTable = reader.getTable('CHECKINOUT');
    const checkCols = checkTable.getColumnNames();
    const checkData = checkTable.getData();

    console.log(`\nColumns: ${checkCols.join(', ')}`);
    console.log(`Total records: ${checkData.length}`);

    console.log('\nSample (last 20):');
    checkData.slice(-20).forEach((row, i) => {
        console.log(`  ${row.USERID || row.UserID} @ ${row.CHECKTIME} [${row.CHECKTYPE}]`);
    });

} catch (error) {
    console.error('Error:', error.message);
}
