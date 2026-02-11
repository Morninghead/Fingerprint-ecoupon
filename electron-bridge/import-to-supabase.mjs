/**
 * Import employees and fingerprints from MDB to Supabase
 * Run with: node import-to-supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase config
const SUPABASE_URL = 'https://ojpiwbsxuocflmxxdpwb.supabase.co';
const SUPABASE_KEY = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
    .split('\n')
    .find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_KEY='))
    ?.split('=')[1]?.trim();

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_KEY not found in .env.local');
    process.exit(1);
}

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

// Prefix to company mapping
const PREFIX_COMPANY_MAP = {
    '1': null,  // Will be set later
    '2': null,  // 2x prefix
    '3': null,  // 3x prefix  
    '4': null,  // 4x prefix
    '5': null   // 5x prefix
};

async function fetchOrCreateCompanies() {
    console.log('📦 Checking/Creating companies...');

    // Get existing companies
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name`, { headers });
    const companies = await response.json();

    console.log(`   Found ${companies.length} existing companies`);

    // Create placeholder companies for each prefix if not exists
    const prefixNames = {
        '2': 'Company 2x',
        '3': 'Company 3x',
        '4': 'Company 4x',
        '5': 'Company 5x'
    };

    for (const [prefix, name] of Object.entries(prefixNames)) {
        let company = companies.find(c => c.name === name);

        if (!company) {
            console.log(`   Creating company: ${name}`);
            const createRes = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
                method: 'POST',
                headers: { ...headers, 'Prefer': 'return=representation' },
                body: JSON.stringify({ name })
            });

            if (createRes.ok) {
                const created = await createRes.json();
                company = created[0];
                console.log(`   ✅ Created: ${name} (${company.id})`);
            }
        } else {
            console.log(`   ✓ Exists: ${name} (${company.id})`);
        }

        if (company) {
            PREFIX_COMPANY_MAP[prefix] = company.id;
        }
    }

    return PREFIX_COMPANY_MAP;
}

async function importEmployees(data) {
    console.log('\n👥 Importing employees...');

    const employees = data.employees;
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches
    const batchSize = 50;

    for (let i = 0; i < employees.length; i += batchSize) {
        const batch = employees.slice(i, i + batchSize);

        for (const emp of batch) {
            try {
                const prefix = emp.employee_code?.charAt(0);
                const companyId = PREFIX_COMPANY_MAP[prefix];

                if (!companyId) {
                    skipped++;
                    continue;
                }

                // Check if employee exists by PIN
                const checkRes = await fetch(
                    `${SUPABASE_URL}/rest/v1/employees?pin=eq.${emp.employee_code}&select=id,employee_code`,
                    { headers }
                );
                const existing = await checkRes.json();

                let employeeId = null;

                if (existing.length > 0) {
                    // Update existing employee
                    employeeId = existing[0].id;

                    if (!existing[0].employee_code) {
                        // Only update if employee_code is not set
                        await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${employeeId}`, {
                            method: 'PATCH',
                            headers,
                            body: JSON.stringify({
                                employee_code: emp.employee_code,
                                mdb_user_id: emp.mdb_user_id,
                                prefix_group: emp.prefix,
                                name: emp.name || emp.employee_code
                            })
                        });
                        updated++;
                    } else {
                        skipped++;
                    }
                } else {
                    // Create new employee
                    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/employees`, {
                        method: 'POST',
                        headers: { ...headers, 'Prefer': 'return=representation' },
                        body: JSON.stringify({
                            company_id: companyId,
                            name: emp.name || emp.employee_code,
                            pin: emp.employee_code,
                            employee_code: emp.employee_code,
                            mdb_user_id: emp.mdb_user_id,
                            prefix_group: emp.prefix
                        })
                    });

                    if (createRes.ok) {
                        const created = await createRes.json();
                        employeeId = created[0]?.id;
                        imported++;
                    } else {
                        errors++;
                    }
                }

                // Import fingerprints for this employee
                if (employeeId && emp.fingerprints) {
                    for (const fp of emp.fingerprints) {
                        // Use upsert for fingerprints
                        await fetch(`${SUPABASE_URL}/rest/v1/fingerprint_templates`, {
                            method: 'POST',
                            headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
                            body: JSON.stringify({
                                employee_id: employeeId,
                                finger_id: fp.finger_id,
                                template_data: fp.template_data,
                                template_size: fp.template_size,
                                template_version: '10'
                            })
                        });
                    }
                }
            } catch (err) {
                errors++;
            }
        }

        process.stdout.write(`\r   Progress: ${Math.min(i + batchSize, employees.length)}/${employees.length} (new: ${imported}, updated: ${updated}, skipped: ${skipped}, errors: ${errors})`);
    }

    console.log(`\n   ✅ Done: ${imported} new, ${updated} updated, ${skipped} skipped, ${errors} errors`);
    return imported + updated;
}

async function main() {
    console.log('========================================');
    console.log('  MDB → Supabase Import');
    console.log('========================================\n');

    // Load data
    const dataPath = path.join(__dirname, 'all_employees_with_fp.json');

    if (!fs.existsSync(dataPath)) {
        console.error('❌ all_employees_with_fp.json not found!');
        console.log('   Run: C:\\Windows\\SysWOW64\\cscript.exe import-all-employees.vbs');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    console.log(`📊 Data loaded:`);
    console.log(`   Employees: ${data.summary.total_employees}`);
    console.log(`   Templates: ${data.summary.total_templates}`);
    console.log(`   By prefix: 2x=${data.summary.group_2x}, 3x=${data.summary.group_3x}, 4x=${data.summary.group_4x}, 5x=${data.summary.group_5x}`);

    // Setup companies
    await fetchOrCreateCompanies();

    // Import employees
    const imported = await importEmployees(data);

    console.log('\n========================================');
    console.log('  Import Complete!');
    console.log('========================================');
    console.log(`  Total imported: ${imported} employees`);
}

main().catch(console.error);
