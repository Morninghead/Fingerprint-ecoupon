// Check fingerprint template .bin files - show first 10 bytes
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const folder = 'X:/FP-E-coupon/electron-bridge/fp-templates';

const files = readdirSync(folder).filter(f => f.endsWith('.bin')).slice(0, 20);

console.log('Checking first 20 fingerprint template files:\n');
console.log('File'.padEnd(30), 'Size'.padEnd(8), 'First 10 bytes (hex)');
console.log('='.repeat(70));

files.forEach(file => {
    const path = join(folder, file);
    const data = readFileSync(path);
    const hex = data.slice(0, 10).toString('hex').match(/.{2}/g).join(' ');
    const ascii = data.slice(0, 10).toString('ascii').replace(/[^\x20-\x7E]/g, '.');

    console.log(
        file.padEnd(30),
        String(data.length).padEnd(8),
        hex,
        '|', ascii
    );
});

// Check if there's a pattern
console.log('\n--- Checking header pattern ---');
const first = readFileSync(join(folder, files[0]));
console.log('First 50 bytes:');
console.log('Hex:', first.slice(0, 50).toString('hex').match(/.{2}/g).join(' '));

// Try to find user ID in the data
console.log('\n--- Looking for patterns ---');
files.slice(0, 5).forEach(file => {
    const path = join(folder, file);
    const data = readFileSync(path);

    // Extract user ID from filename
    const match = file.match(/user_(\d+)_finger_(\d+)/);
    if (match) {
        const userId = parseInt(match[1]);
        const fingerId = parseInt(match[2]);

        // Check if user ID appears in first 20 bytes
        const first20 = data.slice(0, 20);
        console.log(`\n${file}:`);
        console.log(`  UserID from name: ${userId}, FingerID: ${fingerId}`);
        console.log(`  First 20 bytes: ${first20.toString('hex')}`);

        // Check for user ID as 2-byte or 4-byte value
        const u16le = first20.readUInt16LE(0);
        const u16be = first20.readUInt16BE(0);
        const u32le = first20.readUInt32LE(0);

        console.log(`  Byte 0-1 as uint16 LE: ${u16le}, BE: ${u16be}`);
        console.log(`  Byte 0-3 as uint32 LE: ${u32le}`);
    }
});
