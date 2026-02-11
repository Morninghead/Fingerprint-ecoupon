// Try to extract OLE Object data from MDB
import MDBReader from 'mdb-reader';
import { readFileSync, writeFileSync } from 'fs';

const mdbPath = 'X:/FP-E-coupon/Thai01/ATT2000.MDB';

async function main() {
    console.log('Reading MDB...');

    const buffer = readFileSync(mdbPath);
    const reader = new MDBReader(buffer);

    // Get TEMPLATE table with raw data
    const table = reader.getTable('TEMPLATE');
    const columns = table.getColumns();

    console.log('\nColumn definitions:');
    columns.forEach(col => {
        console.log(`  ${col.name}: type=${col.type}, size=${col.size}`);
    });

    // Check raw column type for TEMPLATE
    const templateCol = columns.find(c => c.name === 'TEMPLATE');
    console.log('\nTEMPLATE column details:', templateCol);

    // Get data
    const data = table.getData();
    console.log(`\nRows: ${data.length}`);

    // Check the actual byte representation
    if (data.length > 0) {
        const first = data[0];
        console.log('\nFirst row TEMPLATE value:', first.TEMPLATE);
        console.log('Type:', typeof first.TEMPLATE);

        // Check TEMPLATE4 which had different value
        console.log('TEMPLATE4 value:', first.TEMPLATE4);

        // Try to get raw buffer from mdb file at OLE location
        // OLE reference -2147483644 = 0x80000014
        const oleRef = first.TEMPLATE;
        if (typeof oleRef === 'number') {
            console.log('\nOLE Reference hex:', '0x' + (oleRef >>> 0).toString(16));
        }
    }

    // Check if mdb-reader exposes raw column data differently
    console.log('\n--- Checking raw table structure ---');
    console.log('Table row count:', table.rowCount);

    // Try reading with different options
    const rawData = table.getData({ dateWithTimezone: false });
    console.log('Raw first row keys:', Object.keys(rawData[0]));
}

main().catch(console.error);
