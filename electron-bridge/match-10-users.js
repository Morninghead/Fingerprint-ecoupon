// Match 10 MDB users with Supabase + show FP template details
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    }
    return users;
}

async function matchUsers() {
    console.log('='.repeat(70));
    console.log('MATCHING 10 MDB USERS WITH SUPABASE + FP TEMPLATE DETAILS');
    console.log('='.repeat(70));
    console.log('');

    const users = getFirst10Users();
    let matched = 0;

    for (const [userId, templates] of users) {
        console.log(`\n${'─'.repeat(70)}`);
        console.log(`📌 MDB UserID: ${userId}`);
        console.log(`${'─'.repeat(70)}`);

        // Show FP templates for this user
        console.log(`\n   🖐️  Fingerprint Templates:`);
        for (const t of templates) {
            const data = fs.readFileSync(path.join(fpFolder, t.file));
            const header = data.slice(2, 6).toString('ascii'); // SS21
            const hex10 = data.slice(0, 10).toString('hex').match(/.{2}/g).join(' ');

            console.log(`       Finger ${t.fingerId}: ${t.size} bytes | Header: "${header}" | First 10: ${hex10}`);
        }

        // Match with Supabase
        const { data, error } = await supabase
            .from('employees')
            .select('id, employee_code, first_name, last_name, national_id')
            .or(`employee_code.eq.${userId},employee_code.eq.${String(userId).padStart(4, '0')}`)
            .limit(1);

        console.log(`\n   👤 Supabase Match:`);
        if (data && data.length > 0) {
            const emp = data[0];
            console.log(`       ✅ MATCHED!`);
            console.log(`       Employee Code: ${emp.employee_code}`);
            console.log(`       Name: ${emp.first_name} ${emp.last_name}`);
            console.log(`       National ID: ${emp.national_id || 'N/A'}`);
            matched++;
        } else {
            console.log(`       ❌ NOT FOUND in Supabase`);
        }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`SUMMARY: ${matched}/10 users matched with Supabase`);
    console.log('='.repeat(70));
}

matchUsers().catch(console.error);
