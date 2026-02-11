'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface CreditReport {
    id: string;
    employee_id: string;
    date: string;
    lunch_available: boolean;
    ot_meal_available: boolean;
    lunch_used: boolean;
    ot_meal_used: boolean;
    employees: {
        name: string;
        pin: string;
    } | null;
}

interface AttendanceRecord {
    employee_code: string;
    check_time: string;
    device_ip: string;
}

interface Summary {
    total: number;
    lunchAvailable: number;
    lunchUsed: number;
    otAvailable: number;
    otUsed: number;
}

interface CombinedRecord {
    pin: string;
    name: string;
    firstScan: string | null;
    lunchAvailable: boolean;
    lunchUsed: boolean;
    otAvailable: boolean;
    otUsed: boolean;
    deviceIp: string | null;
}

export default function DailyCreditsPage() {
    const [credits, setCredits] = useState<CreditReport[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'used'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState<Summary>({
        total: 0,
        lunchAvailable: 0,
        lunchUsed: 0,
        otAvailable: 0,
        otUsed: 0
    });

    const loadData = useCallback(async () => {
        setLoading(true);

        // Load meal credits
        const { data: creditsData, error: creditsError } = await supabase
            .from('meal_credits')
            .select('*, employees(name, pin)')
            .eq('date', selectedDate);

        if (creditsError) {
            console.error('Credits error:', creditsError);
        }

        // Load attendance for the day
        const startOfDay = `${selectedDate}T00:00:00`;
        const endOfDay = `${selectedDate}T23:59:59`;

        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('employee_code, check_time, device_ip')
            .gte('check_time', startOfDay)
            .lte('check_time', endOfDay)
            .order('check_time', { ascending: true });

        if (creditsData) {
            setCredits(creditsData as CreditReport[]);

            // Calculate summary
            const sum: Summary = {
                total: creditsData.length,
                lunchAvailable: creditsData.filter(c => c.lunch_available && !c.lunch_used).length,
                lunchUsed: creditsData.filter(c => c.lunch_used).length,
                otAvailable: creditsData.filter(c => c.ot_meal_available && !c.ot_meal_used).length,
                otUsed: creditsData.filter(c => c.ot_meal_used).length
            };
            setSummary(sum);
        }

        if (attendanceData) {
            setAttendance(attendanceData as AttendanceRecord[]);
        }

        setLoading(false);
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Combine credits with attendance data
    const combinedRecords: CombinedRecord[] = credits.map(credit => {
        const pin = credit.employees?.pin;
        const attendanceRecords = attendance.filter(a => a.employee_code === pin);
        const firstScan = attendanceRecords.length > 0 ? attendanceRecords[0] : null;

        return {
            pin: pin || '-',
            name: credit.employees?.name || '-',
            firstScan: firstScan?.check_time || null,
            lunchAvailable: credit.lunch_available,
            lunchUsed: credit.lunch_used ?? false,
            otAvailable: credit.ot_meal_available,
            otUsed: credit.ot_meal_used ?? false,
            deviceIp: firstScan?.device_ip || null
        };
    });

    // Apply filters
    const filteredRecords = combinedRecords.filter(record => {
        // Status filter
        if (filterStatus === 'available') {
            if (!((record.lunchAvailable && !record.lunchUsed) || (record.otAvailable && !record.otUsed))) {
                return false;
            }
        }
        if (filterStatus === 'used') {
            if (!(record.lunchUsed || record.otUsed)) {
                return false;
            }
        }

        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return record.pin.toLowerCase().includes(searchLower) ||
                record.name.toLowerCase().includes(searchLower);
        }

        return true;
    });

    function formatTime(isoString: string | null): string {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch {
            return '-';
        }
    }

    function exportToCSV() {
        const headers = ['#', 'PIN', 'ชื่อพนักงาน', 'เวลาสแกน', 'เครื่อง', 'Lunch', 'OT'];
        const rows = filteredRecords.map((r, i) => [
            i + 1,
            r.pin,
            r.name,
            formatTime(r.firstScan),
            r.deviceIp || '-',
            r.lunchAvailable ? (r.lunchUsed ? 'ใช้แล้ว' : 'มีสิทธิ์') : 'ไม่มี',
            r.otAvailable ? (r.otUsed ? 'ใช้แล้ว' : 'มีสิทธิ์') : '-'
        ]);

        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meal-credits-report-${selectedDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">กำลังโหลด...</span>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">📊 รายงานสิทธิ์อาหาร</h1>
                        <p className="mt-1 text-gray-700">ดูรายละเอียดการให้สิทธิ์และการใช้งาน</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={loadData}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            🔄 รีเฟรช
                        </button>
                        <button
                            onClick={exportToCSV}
                            disabled={filteredRecords.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            📥 Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📅 เลือกวันที่
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            🔍 ค้นหา PIN / ชื่อ
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="พิมพ์เพื่อค้นหา..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📋 สถานะ
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'available' | 'used')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="available">ยังมีสิทธิ์</option>
                            <option value="used">ใช้ไปแล้ว</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
                    <div className="text-sm text-gray-600">รวมทั้งหมด</div>
                </div>
                <div className="bg-green-50 rounded-xl shadow-sm p-4 text-center border-2 border-green-200">
                    <div className="text-3xl font-bold text-green-600">{summary.lunchAvailable}</div>
                    <div className="text-sm text-green-700">🍚 Lunch ยังใช้ได้</div>
                </div>
                <div className="bg-gray-100 rounded-xl shadow-sm p-4 text-center">
                    <div className="text-3xl font-bold text-gray-600">{summary.lunchUsed}</div>
                    <div className="text-sm text-gray-600">🍚 Lunch ใช้แล้ว</div>
                </div>
                <div className="bg-orange-50 rounded-xl shadow-sm p-4 text-center border-2 border-orange-200">
                    <div className="text-3xl font-bold text-orange-600">{summary.otAvailable}</div>
                    <div className="text-sm text-orange-700">🌙 OT ยังใช้ได้</div>
                </div>
                <div className="bg-gray-100 rounded-xl shadow-sm p-4 text-center">
                    <div className="text-3xl font-bold text-gray-600">{summary.otUsed}</div>
                    <div className="text-sm text-gray-600">🌙 OT ใช้แล้ว</div>
                </div>
            </div>

            {/* Attendance Stats */}
            <div className="bg-blue-50 rounded-xl shadow-sm p-4 mb-6 border-2 border-blue-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">📍</span>
                        <div>
                            <div className="font-semibold text-blue-900">สแกนเข้างานวันนี้</div>
                            <div className="text-sm text-blue-700">{attendance.length} ครั้ง จาก {new Set(attendance.map(a => a.employee_code)).size} คน</div>
                        </div>
                    </div>
                    <div className="text-right text-sm text-blue-700">
                        อัพเดท: {new Date().toLocaleTimeString('th-TH')}
                    </div>
                </div>
            </div>

            {/* Credits Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="font-semibold text-gray-900">
                        📋 รายชื่อพนักงาน ({filteredRecords.length} คน)
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PIN</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ชื่อพนักงาน</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">⏰ เวลาสแกน</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">📍 เครื่อง</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">🍚 Lunch</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">🌙 OT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredRecords.map((record, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm font-mono font-bold text-gray-900">
                                        {record.pin}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {record.name}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-mono text-blue-600">
                                        {formatTime(record.firstScan)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                                        {record.deviceIp || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {record.lunchAvailable ? (
                                            record.lunchUsed ? (
                                                <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                                                    ✅ ใช้แล้ว
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    🟢 มีสิทธิ์
                                                </span>
                                            )
                                        ) : (
                                            <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                                                ❌ ไม่มี
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {record.otAvailable ? (
                                            record.otUsed ? (
                                                <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                                                    ✅ ใช้แล้ว
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                                    🟠 มีสิทธิ์
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredRecords.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        ไม่พบข้อมูลสิทธิ์อาหารสำหรับวันที่เลือก
                    </div>
                )}
            </div>
        </div>
    );
}
