import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/credits/bulk - Add credits for multiple days/employees
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { employee_ids, start_date, end_date, lunch_credit, ot_meal_credit } = body;

        console.log('[Bulk Credits] Request:', { employee_ids, start_date, end_date, lunch_credit, ot_meal_credit });

        // Validation
        if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
            return NextResponse.json(
                { error: 'At least one employee ID is required' },
                { status: 400 }
            );
        }

        if (!start_date || !end_date) {
            return NextResponse.json(
                { error: 'Start date and end date are required' },
                { status: 400 }
            );
        }

        // Generate date range
        const start = new Date(start_date);
        const end = new Date(end_date);
        const dates = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d).toISOString().split('T')[0]);
        }

        console.log('[Bulk Credits] Generated dates:', dates);

        // Create credit records for each employee and each date
        // Note: Schema uses BOOLEAN columns (lunch_available, ot_meal_available)
        // not integer credits
        const credits = [];
        for (const employeeId of employee_ids) {
            for (const date of dates) {
                credits.push({
                    employee_id: employeeId,
                    date,
                    lunch_available: lunch_credit > 0, // Convert to boolean
                    ot_meal_available: ot_meal_credit > 0, // Convert to boolean
                });
            }
        }

        console.log('[Bulk Credits] Total credits to insert:', credits.length);

        // Delete existing credits for these employees and dates
        const deletePromises = [];
        for (const employeeId of employee_ids) {
            deletePromises.push(
                supabase
                    .from('meal_credits')
                    .delete()
                    .eq('employee_id', employeeId)
                    .in('date', dates)
            );
        }

        await Promise.all(deletePromises);
        console.log('[Bulk Credits] Cleared existing credits');

        // Insert new credits
        const { data, error } = await supabase
            .from('meal_credits')
            .insert(credits)
            .select();

        if (error) {
            console.error('[Bulk Credits] Database error:', error);
            return NextResponse.json({
                error: error.message,
                details: error
            }, { status: 500 });
        }

        console.log('[Bulk Credits] Success! Inserted:', data?.length);

        return NextResponse.json({
            success: true,
            credits: data,
            count: data?.length || 0,
            message: `Added credits for ${employee_ids.length} employee(s) across ${dates.length} day(s)`,
        }, { status: 201 });
    } catch (err) {
        console.error('[Bulk Credits] Unexpected error:', err);
        return NextResponse.json(
            {
                error: 'Failed to create bulk credits',
                details: err instanceof Error ? err.message : String(err)
            },
            { status: 500 }
        );
    }
}
