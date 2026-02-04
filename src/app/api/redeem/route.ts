import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { employee_id, meal_type, is_override, override_reason } = await request.json();

    if (!employee_id || !meal_type) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, meal_type' },
        { status: 400 }
      );
    }

    // Get employee with company
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*, companies(*)')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const company = employee.companies;
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    // Validate time window
    let validWindow = false;
    if (meal_type === 'LUNCH') {
      validWindow = currentTime >= company.lunch_time_start && currentTime <= company.lunch_time_end;
    } else if (meal_type === 'OT_MEAL') {
      validWindow = currentTime >= company.ot_time_start && currentTime <= company.ot_time_end;
    }

    if (!validWindow && !is_override) {
      return NextResponse.json({
        error: 'Not in valid time window',
        valid: false,
        allowed_override: true
      }, { status: 400 });
    }

    // Check meal credit availability
    const { data: credit, error: creditError } = await supabase
      .from('meal_credits')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('date', now.toISOString().split('T')[0])
      .single();

    if (creditError || !credit) {
      return NextResponse.json(
        { error: 'Meal credit not found' },
        { status: 404 }
      );
    }

    let creditAvailable = false;
    if (meal_type === 'LUNCH' && credit.lunch_available) {
      creditAvailable = true;
    } else if (meal_type === 'OT_MEAL' && credit.ot_meal_available) {
      creditAvailable = true;
    }

    if (!creditAvailable && !is_override) {
      return NextResponse.json({
        error: 'No credit available',
        valid: false,
        allowed_override: true
      }, { status: 400 });
    }

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        employee_id,
        company_id: company.id,
        meal_type,
        amount: meal_type === 'LUNCH' ? company.lunch_price : company.ot_meal_price,
        is_override: is_override || false,
        override_reason: override_reason || null,
        status: is_override ? 'FLAGGED' : 'VALID'
      })
      .select()
      .single();

    if (txError) {
      return NextResponse.json(
        { error: txError.message },
        { status: 500 }
      );
    }

    // Update meal credits
    const updateData: any = {};
    if (meal_type === 'LUNCH') updateData.lunch_available = false;
    if (meal_type === 'OT_MEAL') updateData.ot_meal_available = false;

    const { error: updateError } = await supabase
      .from('meal_credits')
      .update(updateData)
      .eq('id', credit.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ transaction, employee, success: true });
  } catch (error) {
    console.error('Error redeeming meal:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
