/**
 * Work Record Calculator
 * คำนวณชั่วโมงทำงานและ OT จาก attendance scans
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Types
interface Shift {
    id: string;
    name: string;
    start_time: string;  // "08:00:00"
    end_time: string;    // "17:00:00"
    ot_start_time: string; // "17:30:00"
    crosses_midnight: boolean;
    break_minutes: number;
}

interface AttendanceScan {
    id: string;
    employee_code: string;
    check_time: string;
    device_ip: string;
}

interface WorkRecord {
    employee_code: string;
    work_date: string;
    shift_id: string;
    scan_in_id: string | null;
    scan_out_id: string | null;
    scan_in: string | null;
    scan_out: string | null;
    working_minutes: number;
    ot_minutes: number;
    status: 'complete' | 'incomplete' | 'pending';
}

// Constants
const SHIFTS = {
    Day: { start: 6, end: 10 },      // Scan 06:00-10:00 → Day
    Evening: { start: 14, end: 18 }, // Scan 14:00-18:00 → Evening
    Night: { start: 18, end: 22 },   // Scan 18:00-22:00 → Night
};

/**
 * Detect shift from first scan time
 */
export function detectShift(scanTime: Date): string {
    const hour = scanTime.getHours();

    if (hour >= SHIFTS.Day.start && hour < SHIFTS.Day.end) {
        return 'Day';
    } else if (hour >= SHIFTS.Evening.start && hour < SHIFTS.Evening.end) {
        return 'Evening';
    } else if (hour >= SHIFTS.Night.start && hour <= SHIFTS.Night.end) {
        return 'Night';
    }

    // Default to Day for ambiguous times
    return 'Day';
}

/**
 * Calculate work date from scan time
 * For midnight-crossing shifts, early morning scans belong to previous day
 */
export function getWorkDate(scanTime: Date, shiftName: string): string {
    const hour = scanTime.getHours();
    const date = new Date(scanTime);

    // For Evening/Night shifts, if scan is between 00:00-08:00, it belongs to previous work date
    if ((shiftName === 'Evening' || shiftName === 'Night') && hour < 8) {
        date.setDate(date.getDate() - 1);
    }

    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Calculate OT minutes
 * OT starts 30 min after shift end, rounded down to 30-min blocks
 */
export function calculateOT(
    scanOut: Date,
    shift: Shift,
    skipBreakOT: boolean = false
): number {
    // Parse OT start time
    const [otHour, otMin] = shift.ot_start_time.split(':').map(Number);

    // Create OT start datetime
    const otStart = new Date(scanOut);
    otStart.setHours(otHour, otMin, 0, 0);

    // For midnight-crossing shifts, if scanOut is after midnight, OT start is also next day
    if (shift.crosses_midnight && scanOut.getHours() < 12) {
        // OT start time is already in the early morning of the same calendar day
    } else if (shift.crosses_midnight) {
        // Scan is before midnight, OT start should be next day
        otStart.setDate(otStart.getDate() + 1);
    }

    // If skip break OT, start counting 30 min earlier
    if (skipBreakOT) {
        otStart.setMinutes(otStart.getMinutes() - 30);
    }

    // Calculate OT minutes
    const diffMs = scanOut.getTime() - otStart.getTime();

    if (diffMs <= 0) {
        return 0;
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Round down to 30-minute blocks
    return Math.floor(diffMinutes / 30) * 30;
}

/**
 * Calculate working minutes
 */
export function calculateWorkingMinutes(
    scanIn: Date,
    scanOut: Date,
    breakMinutes: number = 60,
    skipBreakLunch: boolean = false
): number {
    const diffMs = scanOut.getTime() - scanIn.getTime();
    let workMinutes = Math.floor(diffMs / (1000 * 60));

    // Subtract break time
    const actualBreak = skipBreakLunch ? 0 : breakMinutes;
    workMinutes = Math.max(0, workMinutes - actualBreak);

    return workMinutes;
}

/**
 * Process attendance scans for a single employee on a single work date
 */
export function processScansForWorkRecord(
    scans: AttendanceScan[],
    shift: Shift,
    workDate: string,
    skipBreakLunch: boolean = false,
    skipBreakOT: boolean = false
): WorkRecord {
    if (scans.length === 0) {
        return {
            employee_code: '',
            work_date: workDate,
            shift_id: shift.id,
            scan_in_id: null,
            scan_out_id: null,
            scan_in: null,
            scan_out: null,
            working_minutes: 0,
            ot_minutes: 0,
            status: 'incomplete',
        };
    }

    // Sort scans by time
    const sortedScans = [...scans].sort(
        (a, b) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime()
    );

    const firstScan = sortedScans[0];
    const lastScan = sortedScans[sortedScans.length - 1];

    const scanIn = new Date(firstScan.check_time);
    const scanOut = new Date(lastScan.check_time);

    // If only one scan, mark as incomplete
    if (sortedScans.length === 1) {
        return {
            employee_code: firstScan.employee_code,
            work_date: workDate,
            shift_id: shift.id,
            scan_in_id: firstScan.id,
            scan_out_id: null,
            scan_in: firstScan.check_time,
            scan_out: null,
            working_minutes: 0,
            ot_minutes: 0,
            status: 'incomplete',
        };
    }

    // Calculate working minutes
    const workingMinutes = calculateWorkingMinutes(
        scanIn,
        scanOut,
        shift.break_minutes,
        skipBreakLunch
    );

    // Calculate OT (only for Day shift based on current requirements)
    let otMinutes = 0;
    if (shift.name === 'Day') {
        otMinutes = calculateOT(scanOut, shift, skipBreakOT);
    }

    return {
        employee_code: firstScan.employee_code,
        work_date: workDate,
        shift_id: shift.id,
        scan_in_id: firstScan.id,
        scan_out_id: lastScan.id,
        scan_in: firstScan.check_time,
        scan_out: lastScan.check_time,
        working_minutes: workingMinutes,
        ot_minutes: otMinutes,
        status: 'complete',
    };
}

/**
 * Main function to calculate work records for a date range
 */
export async function calculateWorkRecords(
    supabase: SupabaseClient,
    startDate: string,
    endDate: string
): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    // Get shifts
    const { data: shiftsData, error: shiftError } = await supabase
        .from('shifts')
        .select('*');

    if (shiftError || !shiftsData) {
        return { processed: 0, errors: ['Failed to load shifts: ' + shiftError?.message] };
    }

    const shifts = shiftsData as unknown as Shift[];
    const shiftMap = new Map<string, Shift>(shifts.map(s => [s.name, s]));

    // Get all attendance scans in date range
    const { data: scansData, error: scanError } = await supabase
        .from('attendance')
        .select('id, employee_code, check_time, device_ip')
        .gte('check_time', startDate)
        .lte('check_time', endDate + 'T23:59:59')
        .order('check_time');

    if (scanError || !scansData) {
        return { processed: 0, errors: ['Failed to load attendance: ' + scanError?.message] };
    }

    const scans = scansData as unknown as AttendanceScan[];

    // Group scans by employee and work date
    const scanGroups = new Map<string, AttendanceScan[]>();

    for (const scan of scans) {
        const scanTime = new Date(scan.check_time);
        const detectedShift = detectShift(scanTime);
        const workDate = getWorkDate(scanTime, detectedShift);

        const key = `${scan.employee_code}_${workDate}`;

        if (!scanGroups.has(key)) {
            scanGroups.set(key, []);
        }
        scanGroups.get(key)!.push(scan);
    }

    // Process each group
    for (const [key, groupScans] of Array.from(scanGroups)) {
        const [employeeCode, workDate] = key.split('_');

        // Detect shift from first scan
        const firstScanTime = new Date(groupScans[0].check_time);
        const shiftName = detectShift(firstScanTime);
        const shift = shiftMap.get(shiftName);

        if (!shift) {
            errors.push(`Shift not found: ${shiftName} for ${employeeCode} on ${workDate}`);
            continue;
        }

        // Calculate work record
        const workRecord = processScansForWorkRecord(groupScans, shift, workDate);

        // Upsert to database
        const { error: upsertError } = await supabase
            .from('work_records')
            .upsert({
                ...workRecord,
                employee_code: employeeCode,
            }, {
                onConflict: 'employee_code,work_date',
            });

        if (upsertError) {
            errors.push(`Failed to save work record for ${employeeCode} on ${workDate}: ${upsertError.message}`);
        } else {
            processed++;
        }
    }

    return { processed, errors };
}

/**
 * Check if employee is eligible for meal credit
 * Only Day shift workers and Day shift OT workers are eligible
 */
export function isEligibleForMealCredit(workRecord: WorkRecord, shiftName: string): boolean {
    // Only Day shift
    if (shiftName !== 'Day') {
        return false;
    }

    // Must have complete record (in + out)
    if (workRecord.status !== 'complete') {
        return false;
    }

    // Must work at least some hours
    return workRecord.working_minutes > 0;
}
