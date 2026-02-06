import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// 🔧 DEV MODE: Set to true to return random employees (for testing hardware)
// Set to false for production (real fingerprint matching)
const DEV_MODE = true;

export async function POST(request: NextRequest) {
  try {
    const { fingerprint_template, company_id } = await request.json();

    if (!fingerprint_template || !company_id) {
      return NextResponse.json(
        { error: 'Missing required fields: fingerprint_template, company_id' },
        { status: 400 }
      );
    }

    // 🎯 DEV MODE: Return random employee for testing
    if (DEV_MODE) {
      console.log('[DEV MODE] Returning random employee for testing');

      // Get a random employee from the company
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', company_id);

      if (empError || !employees || employees.length === 0) {
        return NextResponse.json(
          { error: 'No employees found' },
          { status: 404 }
        );
      }

      // Select random employee
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];

      console.log(`[DEV MODE] Selected random employee: ${randomEmployee.name} (PIN: ${randomEmployee.pin})`);

      return NextResponse.json({
        employee: randomEmployee,
        match_score: 95, // Mock high confidence
        dev_mode: true
      });
    }

    // PRODUCTION MODE: Real fingerprint matching
    // Find employee by fingerprint template
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*, companies(*)')
      .eq('fingerprint_template', fingerprint_template)
      .eq('company_id', company_id)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee, match_score: 100 });
  } catch (error) {
    console.error('Error verifying fingerprint:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
