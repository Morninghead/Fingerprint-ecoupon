// Deep scan all tables in ATT2000.MDB for binary data
import MDBReader from 'mdb-reader';
import { readFileSync } from 'fs';

const mdbPath = 'X:/FP-E-coupon/Thai01/ATT2000.MDB';

async function main() {
    console.log('Scanning MDB for binary data...\n');

    const buffer = readFileSync(mdbPath);
    const reader = new MDBReader(buffer);

    const tables = reader.getTableNames();

    for (const tableName of tables) {
        try {
            const table = reader.getTable(tableName);
            const data = table.getData();
            const columns = table.getColumnNames();

            // Check for binary columns
            if (data.length > 0) {
                const first = data[0];
                const binaryColumns = [];

                for (const col of columns) {
                    const val = first[col];
                    if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
                        binaryColumns.push({ col, size: val.length });
                    }
                }

                if (binaryColumns.length > 0) {
                    console.log(`📁 ${tableName} (${data.length} rows)`);
                    binaryColumns.forEach(({ col, size }) => {
                        console.log(`   → ${col}: Binary (${size} bytes)`);
                    });
                    console.log('');
                }
            }
        } catch (e) {
            // Skip tables that can't be read
        }
    }

    // Check FaceTemp table specifically
    console.log('\n--- FaceTemp Table ---');
    try {
        const faceTable = reader.getTable('FaceTemp');
        const faceData = faceTable.getData();
        console.log(`Rows: ${faceData.length}`);
        console.log('Columns:', faceTable.getColumnNames());
        if (faceData.length > 0) {
            console.log('First row:', faceData[0]);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

main().catch(console.error);
