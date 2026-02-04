import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fingerprint_template, company_id } = await request.json();

    if (!fingerprint_template || !company_id) {
      return NextResponse.json(
        { error: 'Missing required fields: fingerprint_template, company_id' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error verifying fingerprint:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
