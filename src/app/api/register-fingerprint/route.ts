import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: Register fingerprint for an employee
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { employee_id, fingerprint_template } = body;

        if (!employee_id || !fingerprint_template) {
            return NextResponse.json(
                { error: 'employee_id and fingerprint_template are required' },
                { status: 400 }
            );
        }

        // Update the employee's fingerprint
        const { data, error } = await supabase
            .from('employees')
            .update({
                fingerprint_template,
                updated_at: new Date().toISOString()
            })
            .eq('id', employee_id)
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Fingerprint registered successfully',
            employee: {
                id: data.id,
                name: data.name,
                has_fingerprint: !!data.fingerprint_template
            }
        });
    } catch (error) {
        console.error('Register fingerprint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove fingerprint from an employee
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employee_id = searchParams.get('employee_id');

        if (!employee_id) {
            return NextResponse.json(
                { error: 'employee_id is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('employees')
            .update({
                fingerprint_template: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', employee_id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Fingerprint removed successfully',
            employee: {
                id: data.id,
                name: data.name
            }
        });
    } catch (error) {
        console.error('Delete fingerprint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
