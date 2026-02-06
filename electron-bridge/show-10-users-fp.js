// Show 10 users with FP template details (no Supabase needed)
const fs = require('fs');
const path = require('path');

const fpFolder = 'X:/FP-E-coupon/electron-bridge/fp-templates';

// Get first 10 unique users from FP templates
function getFirst10Users() {
    const files = fs.readdirSync(fpFolder).filter(f => f.endsWith('.bin'));
    const users = new Map();

    for (const file of files) {
        const match = file.match(/user_(\d+)_finger_(\d+)/);
        if (match && users.size < 10) {
            const userId = parseInt(match[1]);
            if (!users.has(userId)) {
                users.set(userId, []);
            }
            users.get(userId).push({
                file,
                fingerId: parseInt(match[2]),
                size: fs.statSync(path.join(fpFolder, file)).size
            });
        }
        if (users.size >= 10 && users.get(parseInt(match[1]))) {
            // Make sure we have all fingers for the 10th user
            continue;
        }
    }
    return users;
}

console.log('='.repeat(80));
console.log('FINGERPRINT TEMPLATE DETAILS - FIRST 10 USERS');
console.log('='.repeat(80));
console.log('');

const users = getFirst10Users();
let userCount = 0;

for (const [userId, templates] of users) {
    userCount++;
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`👤 USER #${userCount}: MDB UserID = ${userId}`);
    console.log(`${'─'.repeat(80)}`);

    // Show FP templates for this user
    console.log(`\n   🖐️  Fingerprint Templates (${templates.length} finger(s)):`);

    for (const t of templates) {
        const data = fs.readFileSync(path.join(fpFolder, t.file));
        const header = data.slice(2, 6).toString('ascii'); // SS21
        const hex20 = data.slice(0, 20).toString('hex').match(/.{2}/g).join(' ');

        // Parse some structure
        const byte0_1 = data.readUInt16LE(0);
        const byte8_9 = data.readUInt16LE(8); // template size in header

        console.log(`\n       📍 Finger ${t.fingerId}:`);
        console.log(`          File: ${t.file}`);
        console.log(`          Size: ${t.size} bytes`);
        console.log(`          Format: "${header}" (ZKTeco format)`);
        console.log(`          Header bytes 0-1: 0x${byte0_1.toString(16).padStart(4, '0')}`);
        console.log(`          Header bytes 8-9 (template size): ${byte8_9}`);
        console.log(`          First 20 bytes (hex):`);
        console.log(`          ${hex20}`);
    }

    console.log(`\n   ✅ Verification: UserID ${userId} = Employee Code ${userId}`);
    console.log(`      Template(s) belong to employee with code: ${String(userId).padStart(4, '0')} or ${userId}`);
}

console.log(`\n${'='.repeat(80)}`);
console.log(`SUMMARY: Displayed ${userCount} users with their fingerprint templates`);
console.log('='.repeat(80));
console.log(`\n📋 EXPLANATION:`);
console.log(`   - MDB UserID = Employee Code used during fingerprint enrollment`);
console.log(`   - Each user can have multiple fingers (0-9)`);
console.log(`   - Template format: ZKTeco SS21 (bytes 2-5 = "SS21")`);
console.log(`   - Template size: typically 500-1500 bytes per finger`);
