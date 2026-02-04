import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { employee_id, date, ot_meal_available } = await request.json();

    if (!employee_id || date === undefined || ot_meal_available === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, date, ot_meal_available' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('meal_credits')
      .upsert({
        employee_id,
        date,
        ot_meal_available
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ meal_credit: data });
  } catch (error) {
    console.error('Error marking OT:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
