/**
 * API: Calculate Work Records
 * POST /api/work-records/calculate
 * 
 * คำนวณชั่วโมงทำงานและ OT จาก attendance scans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateWorkRecords } from '@/lib/work-record-calculator';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { startDate, endDate } = body;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate and endDate are required' },
                { status: 400 }
            );
        }

        console.log(`📊 Calculating work records from ${startDate} to ${endDate}`);

        const result = await calculateWorkRecords(supabase, startDate, endDate);

        console.log(`✅ Processed: ${result.processed}, Errors: ${result.errors.length}`);

        return NextResponse.json({
            success: true,
            processed: result.processed,
            errors: result.errors,
        });

    } catch (error) {
        console.error('Error calculating work records:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const employeeCode = searchParams.get('employee_code');
        const workDate = searchParams.get('work_date');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        let query = supabase
            .from('work_records')
            .select(`
        *,
        shifts (name, start_time, end_time)
      `)
            .order('work_date', { ascending: false });

        if (employeeCode) {
            query = query.eq('employee_code', employeeCode);
        }

        if (workDate) {
            query = query.eq('work_date', workDate);
        }

        if (startDate) {
            query = query.gte('work_date', startDate);
        }

        if (endDate) {
            query = query.lte('work_date', endDate);
        }

        const { data, error } = await query.limit(100);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error('Error fetching work records:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
