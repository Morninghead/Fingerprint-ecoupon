import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/credits/bulk - Add credits for multiple days
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { employee_id, start_date, end_date, lunch_credit, ot_meal_credit } = body;

        // Validation
        if (!employee_id || !start_date || !end_date) {
            return NextResponse.json(
                { error: 'Employee ID, start date, and end date are required' },
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

        // Create credit records for each date
        const credits = dates.map((date) => ({
            employee_id,
            date,
            lunch_credit: lunch_credit ?? 1,
            ot_meal_credit: ot_meal_credit ?? 1,
        }));

        // Insert all credits
        const { data, error } = await supabase
            .from('meal_credits')
            .insert(credits)
            .select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            credits: data,
            count: data.length,
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create bulk credits' },
            { status: 500 }
        );
    }
}
