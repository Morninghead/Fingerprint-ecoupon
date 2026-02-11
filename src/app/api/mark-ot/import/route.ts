/**
 * API: Import OT from Excel
 * POST /api/mark-ot/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const date = formData.get('date') as string;

        if (!file || !date) {
            return NextResponse.json(
                { error: 'File and date are required' },
                { status: 400 }
            );
        }

        // Read Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        console.log(`📊 Processing ${data.length} rows from Excel`);

        // Extract employee codes from Excel
        // Support multiple column names
        const employeeCodes: string[] = [];

        for (const row of data) {
            // Try different possible column names
            const code = row['รหัสพนักงาน'] || row['employee_code'] || row['รหัส'] ||
                row['PIN'] || row['pin'] || row['code'] || row['ID'] || row['id'] ||
                Object.values(row)[0]; // First column as fallback

            if (code) {
                employeeCodes.push(String(code).trim());
            }
        }

        console.log(`Found ${employeeCodes.length} employee codes`);

        // Get employee IDs from codes
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, pin, name')
            .or(`pin.in.(${employeeCodes.join(',')})`);

        if (empError) {
            console.error('Error finding employees:', empError);
            return NextResponse.json(
                { error: 'Error finding employees: ' + empError.message },
                { status: 500 }
            );
        }

        console.log(`Matched ${employees?.length || 0} employees`);

        // Grant OT to matched employees
        let success = 0;
        let failed = 0;
        const notFound: string[] = [];

        // Find which codes were matched
        const matchedPins = new Set(employees?.map(e => e.pin) || []);

        for (const code of employeeCodes) {
            if (!matchedPins.has(code)) {
                notFound.push(code);
            }
        }

        // Upsert OT credits
        for (const emp of employees || []) {
            const { error } = await supabase
                .from('meal_credits')
                .upsert({
                    employee_id: emp.id,
                    date: date,
                    ot_meal_available: true,
                    lunch_available: true
                }, {
                    onConflict: 'employee_id,date'
                });

            if (error) {
                console.error(`Failed for ${emp.name}:`, error);
                failed++;
            } else {
                success++;
            }
        }

        return NextResponse.json({
            success: true,
            imported: success,
            failed: failed,
            notFound: notFound,
            message: `ให้สิทธิ์ OT ${success} คน สำเร็จ${notFound.length > 0 ? `, ไม่พบ ${notFound.length} รหัส` : ''}`
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: 'Failed to import Excel file' },
            { status: 500 }
        );
    }
}
