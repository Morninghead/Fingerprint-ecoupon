// Sync attendance from ZKTeco devices to Supabase
// Supports night shift by syncing yesterday + today
// Syncs ONLY daily attendance (yesterday + today) to handle night shifts
// No longer tries to "catch up" on old missing data (per new requirement)
// Added: Auto-create employees when new employee_code detected
const ZKLib = require('zkteco-js');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEVICES = [
    { ip: '192.168.0.151', name: 'SSTH-Entrance' },
    { ip: '192.168.0.152', name: 'SSTH-Factory A' },
    { ip: '192.168.0.153', name: 'Haoli' },
    { ip: '192.168.0.154', name: 'PPS' },
];

// Cache of existing employee codes to avoid repeated lookups
let existingEmployeeCodes = new Set();
// Track new employees created in this sync run
let newEmployeesCreated = [];
const START_DATE = new Date('2025-12-26T00:00:00');

// Default sync window: sync at least 7 days back for safety (covers holidays, weekends)
// Default sync window is now fixed to yesterday + today


// Calculate a date at midnight
function getMidnight(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Get yesterday at midnight
function getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getMidnight(yesterday);
}

// Get N days ago at midnight

const STATE_FILE = 'sync-state.json';
const STATE_BACKUP_FILE = 'sync-state.backup.json';

function loadState() {
    try {
        const data = fs.readFileSync(STATE_FILE, 'utf-8');
        const state = JSON.parse(data);

        // Validate state structure
        if (!state.lastSync || typeof state.lastSync !== 'object') {
            console.warn('⚠️ Invalid state structure, resetting...');
            return { lastSync: {}, lastRun: null };
        }

        return state;
    } catch (error) {
        console.warn(`⚠️ Cannot read state file: ${error.message}`);

        // Try backup
        try {
            const backup = fs.readFileSync(STATE_BACKUP_FILE, 'utf-8');
            console.log('📂 Restored from backup');
            return JSON.parse(backup);
        } catch {
            console.log('📂 Starting fresh (no state file)');
            return { lastSync: {}, lastRun: null };
        }
    }
}

function saveState(state) {
    // Backup current state first
    try {
        if (fs.existsSync(STATE_FILE)) {
            fs.copyFileSync(STATE_FILE, STATE_BACKUP_FILE);
        }
    } catch (e) {
        console.warn('⚠️ Cannot backup state:', e.message);
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Load all existing employee codes from Supabase
 */
async function loadExistingEmployees() {
    console.log('\n📋 Loading existing employees from Supabase...');
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('employee_code');

        if (error) throw error;

        existingEmployeeCodes = new Set(data.map(e => e.employee_code));
        console.log(`   ✅ Found ${existingEmployeeCodes.size} employees in Supabase`);
    } catch (error) {
        console.error(`   ❌ Error loading employees: ${error.message}`);
    }
}

/**
 * Fetch all users from a ZKTeco device
 */
async function fetchUsersFromDevice(device) {
    const zk = new ZKLib(device.ip, 4370, 10000, 4000);
    try {
        await zk.createSocket();
        const result = await zk.getUsers();
        await zk.disconnect();
        return result.data || [];
    } catch (error) {
        console.error(`   ❌ Cannot fetch users from ${device.name}: ${error.message}`);
        try { await zk.disconnect(); } catch { }
        return [];
    }
}

/**
 * Get prefix group based on employee code - returns first char only
 */
function getPrefixGroup(employeeCode) {
    if (!employeeCode || employeeCode.length < 1) return null;
    // Return just the first character to fit varchar(1) column
    return employeeCode.substring(0, 1);
}

/**
 * Auto-create missing employees in Supabase
 */
async function autoCreateMissingEmployees(employeeCodes) {
    // Find codes that don't exist in Supabase
    const missingCodes = [...new Set(employeeCodes)].filter(code => !existingEmployeeCodes.has(code));

    if (missingCodes.length === 0) {
        console.log(`\n👤 No new employee PINs detected`);
        return;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🆕 NEW EMPLOYEE PINs DETECTED: ${missingCodes.length}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`   PINs not found in Supabase:`);
    // Show all new PINs (grouped in rows of 10 for readability)
    for (let i = 0; i < missingCodes.length; i += 10) {
        const chunk = missingCodes.slice(i, i + 10);
        console.log(`   ${chunk.join(', ')}`);
    }

    console.log(`\n👤 Fetching names from ZKTeco devices...`);

    // Fetch user info from ZKTeco devices
    let allUsers = [];
    for (const device of DEVICES) {
        const users = await fetchUsersFromDevice(device);
        allUsers = allUsers.concat(users);
    }

    // Create a map of userId -> user info
    const userMap = new Map();
    for (const user of allUsers) {
        if (user.userId && !userMap.has(user.userId)) {
            userMap.set(user.userId, user);
        }
    }

    // Create employee records - only include essential fields
    const newEmployees = [];
    for (const code of missingCodes) {
        const zkUser = userMap.get(code);

        const employee = {
            employee_code: code,
            name: zkUser?.name || `Employee ${code}`,
            pin: code,
            mdb_user_id: zkUser?.uid || null
        };

        newEmployees.push(employee);
    }

    // Show new employees with names
    console.log(`\n   📋 New employees to create:`);
    for (const emp of newEmployees) {
        const nameSource = userMap.has(emp.employee_code) ? '(จากเครื่อง)' : '(ชื่อชั่วคราว)';
        console.log(`      🆔 ${emp.employee_code} → ${emp.name} ${nameSource}`);
    }

    // Insert into Supabase
    if (newEmployees.length > 0) {
        console.log(`\n   📤 Inserting ${newEmployees.length} new employees to Supabase...`);
        const { data, error } = await supabase
            .from('employees')
            .upsert(newEmployees, { onConflict: 'employee_code' })
            .select();

        if (error) {
            console.error(`   ❌ Error creating employees: ${error.message}`);
            console.error(`   💡 Hint: Run migration 008_fix_employee_code_unique.sql first!`);
        } else {
            const created = data || [];
            newEmployeesCreated = created;
            console.log(`   ✅ Successfully created ${created.length} new employees!`);
            for (const emp of created) {
                existingEmployeeCodes.add(emp.employee_code);
            }
        }
    }
    console.log(`${'═'.repeat(60)}`);
}

/**
 * Calculate the effective cutoff time for syncing
 * Logic: 
 * - Use the OLDER of (lastSyncTime, yesterday) to ensure we don't miss any data
 * - But never go before START_DATE
 * - If lastSync is very old (> DEFAULT_SYNC_DAYS), still respect it to catch all missed data
 */
function calculateCutoff(lastSyncTime) {
    // Always sync from yesterday to cover night shifts
    // We intentionally IGNORE lastSyncTime because we don't need to "catch up" on old data
    // (attendance/credit is daily basis)
    let cutoff = getYesterday();

    console.log(`   📅 Using daily window: moving forward from ${cutoff.toISOString()}`);

    // Never go before START_DATE
    if (cutoff < START_DATE) {
        cutoff = START_DATE;
        console.log(`   📅 Capped to START_DATE: ${START_DATE.toISOString()}`);
    }

    return cutoff;
}

async function fetchAttendanceFromDevice(device, lastSyncTime) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📡 ${device.name} (${device.ip})`);
    console.log(`${'─'.repeat(50)}`);

    const zk = new ZKLib(device.ip, 4370, 10000, 4000);

    try {
        await zk.createSocket();
        console.log(`✅ Connected`);

        const info = await zk.getInfo();
        console.log(`   📊 Logs in device: ${info.logCounts}`);

        const result = await zk.getAttendances();
        const allLogs = result.data;
        console.log(`   📥 Fetched: ${allLogs.length} total records`);

        // Calculate the cutoff time
        const cutoff = calculateCutoff(lastSyncTime);

        // Filter logs: must be at or after cutoff AND after START_DATE AND have user_id
        // Using >= instead of > to handle edge case where multiple records have same timestamp
        // Upsert with onConflict will handle any duplicates
        const newLogs = allLogs.filter(log => {
            if (!log.user_id) return false;

            const logTime = new Date(log.record_time);
            return logTime >= START_DATE && logTime >= cutoff;
        });

        console.log(`   ✨ New logs to sync: ${newLogs.length} records`);

        // Show date range of new logs
        if (newLogs.length > 0) {
            const sortedLogs = [...newLogs].sort((a, b) =>
                new Date(a.record_time) - new Date(b.record_time));
            const oldest = new Date(sortedLogs[0].record_time);
            const newest = new Date(sortedLogs[sortedLogs.length - 1].record_time);
            console.log(`   📆 Range: ${oldest.toLocaleDateString('th-TH')} → ${newest.toLocaleDateString('th-TH')}`);
        }

        await zk.disconnect();

        return newLogs.map(log => ({
            employee_code: String(log.user_id),
            check_time: new Date(log.record_time).toISOString(),
            // เปลี่ยนจาก 'SCAN' เป็น null เพราะ DB column อาจเป็น VARCHAR(1)
            check_type: null,
            // เก็บค่าดิบจากเครื่องไว้สำหรับ debug/audit
            raw_state: log.state ?? null,
            device_ip: device.ip
        }));

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        try { await zk.disconnect(); } catch { }
        return [];
    }
}

async function main() {
    console.log('═'.repeat(60));
    console.log('🔄 ATTENDANCE SYNC + AUTO-CREATE EMPLOYEES');
    console.log(`   Time: ${new Date().toLocaleString('th-TH')}`);
    console.log(`   Mode: Night shift support (yesterday + today minimum)`);
    console.log(`   Safety: Fixed daily window (yesterday + today)`);
    console.log('═'.repeat(60));

    // Load existing employees first
    await loadExistingEmployees();

    const state = loadState();
    console.log(`\n📋 Last run: ${state.lastRun ? new Date(state.lastRun).toLocaleString('th-TH') : 'Never'}`);

    // Show last sync times per device
    console.log('\n📊 Last sync per device:');
    for (const device of DEVICES) {
        const lastSync = state.lastSync[device.ip];
        if (lastSync) {
            console.log(`   ${device.name}: ${new Date(lastSync).toLocaleString('th-TH')}`);
        } else {
            console.log(`   ${device.name}: Never (will sync daily window)`);
        }
    }

    let totalNew = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    let allEmployeeCodes = [];

    // Collect all attendance records first
    const deviceRecords = [];
    for (const device of DEVICES) {
        const lastSync = state.lastSync[device.ip] || null;
        const newRecords = await fetchAttendanceFromDevice(device, lastSync);
        deviceRecords.push({ device, records: newRecords });

        // Collect employee codes
        for (const rec of newRecords) {
            allEmployeeCodes.push(rec.employee_code);
        }
    }

    // Auto-create missing employees before inserting attendance
    await autoCreateMissingEmployees(allEmployeeCodes);

    // Now process attendance records
    for (const { device, records: newRecords } of deviceRecords) {
        console.log(`\n📤 Processing ${device.name}...`);

        if (newRecords.length > 0) {
            totalNew += newRecords.length;

            // Find the latest record time for this batch
            const latestTime = newRecords.reduce((max, r) =>
                r.check_time > max ? r.check_time : max, newRecords[0].check_time);

            console.log(`   📤 Uploading ${newRecords.length} to Supabase...`);

            // Upload in batches of 100
            for (let i = 0; i < newRecords.length; i += 100) {
                const batch = newRecords.slice(i, i + 100);
                const { data, error } = await supabase
                    .from('attendance')
                    .upsert(batch, { onConflict: 'employee_code,check_time,device_ip' })
                    .select();

                if (error) {
                    console.error(`   ❌ Batch error: ${error.message}`);
                    totalErrors++;
                } else {
                    const inserted = data?.length || 0;
                    totalInserted += inserted;
                    console.log(`   ✅ Batch ${Math.floor(i / 100) + 1}: ${inserted} records`);
                }
            }

            // Only update lastSync if we successfully processed records
            state.lastSync[device.ip] = latestTime;
            console.log(`   💾 Updated lastSync: ${new Date(latestTime).toLocaleString('th-TH')}`);
        } else {
            console.log(`   ℹ️ No new records`);
        }
    }

    state.lastRun = new Date().toISOString();
    saveState(state);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   📥 Total new records found: ${totalNew}`);
    console.log(`   📤 Total inserted/updated:  ${totalInserted}`);
    console.log(`   ❌ Errors:                  ${totalErrors}`);

    // New employees summary
    if (newEmployeesCreated.length > 0) {
        console.log(`\n   🆕 NEW EMPLOYEES CREATED: ${newEmployeesCreated.length}`);
        console.log(`   ${'─'.repeat(40)}`);
        for (const emp of newEmployeesCreated) {
            console.log(`   🆔 PIN: ${emp.employee_code} | ชื่อ: ${emp.name}`);
        }
        console.log(`   ${'─'.repeat(40)}`);
    } else {
        // Check if there were missing codes that failed to create
        const allUnique = [...new Set(allEmployeeCodes)];
        const stillMissing = allUnique.filter(code => !existingEmployeeCodes.has(code));
        if (stillMissing.length > 0) {
            console.log(`\n   ⚠️  FAILED TO CREATE ${stillMissing.length} NEW EMPLOYEES`);
            console.log(`   ${'─'.repeat(40)}`);
            for (const code of stillMissing.slice(0, 20)) {
                console.log(`   🔴 PIN: ${code} (ยังไม่ได้สร้าง)`);
            }
            if (stillMissing.length > 20) {
                console.log(`   ... and ${stillMissing.length - 20} more`);
            }
            console.log(`   💡 Run migration 008_fix_employee_code_unique.sql to fix!`);
            console.log(`   ${'─'.repeat(40)}`);
        }
    }
    console.log('═'.repeat(60));

    // Auto-grant meal credits if new records were synced
    if (totalInserted > 0) {
        await autoGrantMealCredits();
    }
}

/**
 * Call API to auto-grant meal credits for employees with attendance today
 */
async function autoGrantMealCredits() {
    console.log('\n💳 Auto-granting meal credits...');

    const today = new Date().toISOString().split('T')[0];

    try {
        const response = await fetch('http://localhost:3000/api/auto-grant-credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, grantOT: false })
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Meal credits granted:`);
            console.log(`   - Employees with attendance: ${result.employeesWithAttendance}`);
            console.log(`   - Lunch granted: ${result.lunchGranted}`);
            if (result.errors?.length > 0) {
                console.log(`   - Errors: ${result.errors.length}`);
            }
        } else {
            console.log(`⚠️ API error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.log(`⚠️ Cannot grant meal credits: ${error.message}`);
        console.log(`   (Make sure Next.js server is running at localhost:3000)`);
    }
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
