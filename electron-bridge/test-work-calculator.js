#!/usr/bin/env node
/**
 * Test Work Record Calculator - Standalone
 * ทดสอบการคำนวณ OT และชั่วโมงทำงาน
 */

console.log('='.repeat(60));
console.log('TESTING WORK RECORD CALCULATOR');
console.log('='.repeat(60));

// Mock shift data
const dayShift = {
    id: 'day-shift-id',
    name: 'Day',
    start_time: '08:00:00',
    end_time: '17:00:00',
    ot_start_time: '17:30:00',
    crosses_midnight: false,
    break_minutes: 60,
};

// Helper functions (copy from work-record-calculator.ts for testing)
function detectShift(scanTime) {
    const hour = scanTime.getHours();

    if (hour >= 6 && hour < 10) return 'Day';
    if (hour >= 14 && hour < 18) return 'Evening';
    if (hour >= 18 && hour <= 22) return 'Night';

    return 'Day';
}

function calculateOT(scanOut, shift, skipBreakOT = false) {
    const [otHour, otMin] = shift.ot_start_time.split(':').map(Number);

    const otStart = new Date(scanOut);
    otStart.setHours(otHour, otMin, 0, 0);

    if (skipBreakOT) {
        otStart.setMinutes(otStart.getMinutes() - 30);
    }

    const diffMs = scanOut.getTime() - otStart.getTime();

    if (diffMs <= 0) return 0;

    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Round down to 30-minute blocks
    return Math.floor(diffMinutes / 30) * 30;
}

function calculateWorkingMinutes(scanIn, scanOut, breakMinutes = 60, skipBreakLunch = false) {
    const diffMs = scanOut.getTime() - scanIn.getTime();
    let workMinutes = Math.floor(diffMs / (1000 * 60));

    const actualBreak = skipBreakLunch ? 0 : breakMinutes;
    workMinutes = Math.max(0, workMinutes - actualBreak);

    return workMinutes;
}

// Test 1: Detect Shift
console.log('\n--- Test 1: Detect Shift ---');
const testCases1 = [
    { time: '07:30', expected: 'Day' },
    { time: '09:00', expected: 'Day' },
    { time: '15:00', expected: 'Evening' },
    { time: '17:30', expected: 'Evening' },
    { time: '19:00', expected: 'Night' },
    { time: '21:00', expected: 'Night' },
];

testCases1.forEach(tc => {
    const scanTime = new Date(`2026-02-07T${tc.time}:00+07:00`);
    const result = detectShift(scanTime);
    const status = result === tc.expected ? '✅' : '❌';
    console.log(`${status} ${tc.time} → ${result} (expected: ${tc.expected})`);
});

// Test 2: Calculate OT (Day shift)
console.log('\n--- Test 2: Calculate OT (Day Shift) ---');
const testCases2 = [
    { out: '17:00', expected: 0 },
    { out: '17:30', expected: 0 },
    { out: '17:45', expected: 0, note: 'เศษ 15 นาทีไม่นับ' },
    { out: '18:00', expected: 30 },
    { out: '18:20', expected: 30, note: 'เศษ 20 นาทีไม่นับ' },
    { out: '18:30', expected: 60 },
    { out: '19:00', expected: 90 },
    { out: '19:30', expected: 120 },
];

testCases2.forEach(tc => {
    const scanOut = new Date(`2026-02-07T${tc.out}:00+07:00`);
    const result = calculateOT(scanOut, dayShift, false);
    const status = result === tc.expected ? '✅' : '❌';
    const note = tc.note ? ` (${tc.note})` : '';
    console.log(`${status} OUT ${tc.out} → OT ${result} min (expected: ${tc.expected})${note}`);
});

// Test 3: Calculate OT with Skip Break
console.log('\n--- Test 3: OT with Skip Break (no 30-min grace) ---');
const testCases3 = [
    { out: '17:15', expected: 0 },
    { out: '17:30', expected: 30 }, // Counts from 17:00
    { out: '18:00', expected: 60 },
];

testCases3.forEach(tc => {
    const scanOut = new Date(`2026-02-07T${tc.out}:00+07:00`);
    const result = calculateOT(scanOut, dayShift, true); // skipBreakOT = true
    const status = result === tc.expected ? '✅' : '❌';
    console.log(`${status} OUT ${tc.out} (skip break) → OT ${result} min (expected: ${tc.expected})`);
});

// Test 4: Calculate Working Minutes
console.log('\n--- Test 4: Working Minutes ---');
const testCases4 = [
    { in: '08:00', out: '17:00', skipLunch: false, expected: 480, note: '9hr - 1hr = 8hr' },
    { in: '08:00', out: '18:00', skipLunch: false, expected: 540, note: '10hr - 1hr = 9hr' },
    { in: '08:00', out: '17:00', skipLunch: true, expected: 540, note: '9hr - 0hr = 9hr (skip lunch)' },
];

testCases4.forEach(tc => {
    const scanIn = new Date(`2026-02-07T${tc.in}:00+07:00`);
    const scanOut = new Date(`2026-02-07T${tc.out}:00+07:00`);
    const result = calculateWorkingMinutes(scanIn, scanOut, 60, tc.skipLunch);
    const status = result === tc.expected ? '✅' : '❌';
    console.log(`${status} ${tc.in}-${tc.out} → ${result} min (expected: ${tc.expected}) ${tc.note}`);
});

// Test 5: Full scenario
console.log('\n--- Test 5: Full Scenario ---');
console.log('Employee IN 08:05, OUT 19:00 (Day shift)');

const scanIn = new Date('2026-02-07T08:05:00+07:00');
const scanOut = new Date('2026-02-07T19:00:00+07:00');

const workingMin = calculateWorkingMinutes(scanIn, scanOut, 60, false);
const otMin = calculateOT(scanOut, dayShift, false);

console.log(`Working: ${workingMin} min (${(workingMin / 60).toFixed(1)} hrs)`);
console.log(`OT: ${otMin} min (${(otMin / 60).toFixed(1)} hrs)`);

console.log('\n' + '='.repeat(60));
console.log('TESTS COMPLETE');
console.log('='.repeat(60));
