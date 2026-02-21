/**
 * API: Auto Grant Meal Credits
 * POST /api/auto-grant-credits
 * 
 * คำนวณ work records และให้สิทธิ์ meal credits อัตโนมัติ
 * สำหรับพนักงานที่มาสแกนเข้างานในวันที่ระบุ
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

interface GrantResult {
    date: string;
    employeesWithAttendance: number;
    lunchGranted: number;
    otGranted: number;
    errors: string[];
}

/**
 * POST: คำนวณและให้สิทธิ์ meal credits
 * Body: { date?: string, grantOT?: boolean }
 * - date: วันที่ต้องการคำนวณ (default: วันนี้)
 * - grantOT: ให้สิทธิ์ OT meal ด้วยหรือไม่ (default: false, ให้แค่ lunch)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));

        // Fix: Use Thailand timezone for default date
        const defaultDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const date = body.date || defaultDate;
        const grantOT = body.grantOT || false;

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🍽️ AUTO GRANT MEAL CREDITS`);
        console.log(`📅 Date: ${date}`);
        console.log(`${'═'.repeat(50)}`);

        const result = await grantMealCreditsForDate(date, grantOT);

        console.log(`\n✅ Complete:`);
        console.log(`   - Employees with attendance: ${result.employeesWithAttendance}`);
        console.log(`   - Lunch granted: ${result.lunchGranted}`);
        console.log(`   - OT granted: ${result.otGranted}`);
        console.log(`   - Errors: ${result.errors.length}`);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Error in auto-grant-credits:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET: ดูสถานะ meal credits ของวันนั้น
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

        // Count attendance (ใช้ timezone ไทย)
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        const { data: attendance } = await supabase
            .from('attendance')
            .select('employee_code')
            .gte('check_time', `${date}T00:00:00+07:00`)
            .lt('check_time', `${nextDateStr}T00:00:00+07:00`);

        const uniqueEmployees = [...new Set(attendance?.map(a => a.employee_code) || [])];

        // Count meal credits
        const { count: creditCount } = await supabase
            .from('meal_credits')
            .select('*', { count: 'exact', head: true })
            .eq('date', date);

        const { data: creditsByType } = await supabase
            .from('meal_credits')
            .select('lunch_available, ot_meal_available')
            .eq('date', date);

        const lunchCount = creditsByType?.filter(c => c.lunch_available).length || 0;
        const otCount = creditsByType?.filter(c => c.ot_meal_available).length || 0;

        return NextResponse.json({
            date,
            attendance: {
                totalScans: attendance?.length || 0,
                uniqueEmployees: uniqueEmployees.length
            },
            mealCredits: {
                total: creditCount || 0,
                lunchAvailable: lunchCount,
                otMealAvailable: otCount
            }
        });

    } catch (error) {
        console.error('Error getting status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * ให้สิทธิ์ meal credits สำหรับพนักงานที่มีการสแกนในวันที่ระบุ
 */
async function grantMealCreditsForDate(date: string, grantOT: boolean): Promise<GrantResult> {
    const errors: string[] = [];

    // 1. หาพนักงานที่มี attendance ในวันที่ระบุ (ใช้ timezone ไทย)
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const { data: attendanceData, error: attError } = await supabase
        .from('attendance')
        .select('employee_code')
        .gte('check_time', `${date}T00:00:00+07:00`)
        .lt('check_time', `${nextDateStr}T00:00:00+07:00`);

    if (attError) {
        errors.push(`Failed to fetch attendance: ${attError.message}`);
        return { date, employeesWithAttendance: 0, lunchGranted: 0, otGranted: 0, errors };
    }

    // หา unique employee codes
    const uniqueCodes = [...new Set(attendanceData?.map(a => a.employee_code) || [])];
    console.log(`📊 Found ${uniqueCodes.length} unique employees with attendance`);

    if (uniqueCodes.length === 0) {
        return { date, employeesWithAttendance: 0, lunchGranted: 0, otGranted: 0, errors };
    }

    // 2. หา employee IDs จาก codes (PIN)
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, pin, name')
        .in('pin', uniqueCodes);

    if (empError) {
        errors.push(`Failed to fetch employees: ${empError.message}`);
        return { date, employeesWithAttendance: uniqueCodes.length, lunchGranted: 0, otGranted: 0, errors };
    }

    console.log(`👥 Matched ${employees?.length || 0} employees from database`);

    // 3. สร้างหรืออัพเดท meal_credits แบบ Bulk Insert
    let lunchGranted = 0;
    let otGranted = 0;

    const creditsToUpsert = (employees || []).map(emp => ({
        employee_id: emp.id,
        date: date,
        lunch_available: true,
        ot_meal_available: grantOT
    }));

    if (creditsToUpsert.length > 0) {
        // แบ่งการ upsert เป็น chunk เผื่อมีจำนวนมากเกิน limit ของ supabase (ประมาณ 1000 แถวต่อ request กำลังดี)
        const chunkSize = 1000;
        for (let i = 0; i < creditsToUpsert.length; i += chunkSize) {
            const chunk = creditsToUpsert.slice(i, i + chunkSize);
            const { error: upsertError } = await supabase
                .from('meal_credits')
                .upsert(chunk, {
                    onConflict: 'employee_id,date'
                });

            if (upsertError) {
                errors.push(`Failed to bulk grant credits (chunk ${i}): ${upsertError.message}`);
                console.error("Bulk upsert error:", upsertError);
            } else {
                lunchGranted += chunk.length;
                if (grantOT) otGranted += chunk.length;
            }
        }
    }

    // หาพนักงานที่ไม่พบใน database
    const foundPins = new Set(employees?.map(e => e.pin) || []);
    const notFound = uniqueCodes.filter(code => !foundPins.has(code));
    if (notFound.length > 0) {
        console.log(`⚠️ ${notFound.length} employee codes not found in database`);
        // Only log first 5 to avoid flooding
        notFound.slice(0, 5).forEach(code => {
            errors.push(`Employee code not found: ${code}`);
        });
        if (notFound.length > 5) {
            errors.push(`...and ${notFound.length - 5} more not found`);
        }
    }

    return {
        date,
        employeesWithAttendance: uniqueCodes.length,
        lunchGranted,
        otGranted,
        errors
    };
}
