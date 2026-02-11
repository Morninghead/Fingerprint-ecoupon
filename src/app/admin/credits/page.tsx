'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Employee {
    id: string;
    name: string;
    pin: string;
}

interface MealCredit {
    id: string;
    employee_id: string;
    date: string;
    lunch_available: boolean;
    ot_meal_available: boolean;
    employees: {
        name: string;
        pin: string;
    };
}

export default function CreditsPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [credits, setCredits] = useState<MealCredit[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Form state
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [lunchCredit, setLunchCredit] = useState(1);
    const [otMealCredit, setOtMealCredit] = useState(1);

    // Filter state
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchEmployees();
        fetchCredits();
    }, [filterDate]);

    async function fetchEmployees() {
        const { data } = await supabase
            .from('employees')
            .select('id, name, pin')
            .order('name');
        if (data) setEmployees(data);
    }

    async function fetchCredits() {
        const { data } = await supabase
            .from('meal_credits')
            .select(`
        *,
        employees (
          name,
          pin
        )
      `)
            .gte('date', filterDate)
            .order('date', { ascending: true })
            .order('employees(name)', { ascending: true });

        if (data) setCredits(data as MealCredit[]);
    }

    async function handleBulkAdd() {
        if (selectedEmployees.length === 0) {
            setMessage('❌ Please select at least one employee');
            return;
        }

        if (!startDate || !endDate) {
            setMessage('❌ Please select start and end dates');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch('/api/credits/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_ids: selectedEmployees,
                    start_date: startDate,
                    end_date: endDate,
                    lunch_credit: lunchCredit,
                    ot_meal_credit: otMealCredit,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`✅ ${data.message}`);
                setSelectedEmployees([]);
                setStartDate('');
                setEndDate('');
                fetchCredits();
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch (error) {
            setMessage('❌ Failed to add credits');
        } finally {
            setLoading(false);
        }
    }

    function handleSelectAll() {
        if (selectedEmployees.length === employees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(employees.map((e) => e.id));
        }
    }

    function toggleEmployee(employeeId: string) {
        if (selectedEmployees.includes(employeeId)) {
            setSelectedEmployees(selectedEmployees.filter((id) => id !== employeeId));
        } else {
            setSelectedEmployees([...selectedEmployees, employeeId]);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Meal Credit Management</h1>
                    <p className="mt-2 text-gray-700">Add, view, and manage employee meal credits</p>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Add Credits Form */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Bulk Credits</h2>

                        {/* Employee Selection */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Select Employees ({selectedEmployees.length} selected)
                                </label>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                                {employees.map((employee) => (
                                    <label key={employee.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployees.includes(employee.id)}
                                            onChange={() => toggleEmployee(employee.id)}
                                            className="mr-3"
                                        />
                                        <span className="text-sm text-gray-900">
                                            {employee.name} <span className="text-gray-700">(PIN: {employee.pin})</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium"
                                />
                            </div>
                        </div>

                        {/* Credit Amounts */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lunch Credits
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={lunchCredit}
                                    onChange={(e) => setLunchCredit(parseInt(e.target.value))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    OT Meal Credits
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={otMealCredit}
                                    onChange={(e) => setOtMealCredit(parseInt(e.target.value))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleBulkAdd}
                            disabled={loading || selectedEmployees.length === 0 || !startDate || !endDate}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Adding Credits...' : 'Add Credits'}
                        </button>

                        {/* Quick Actions */}
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        handleSelectAll();
                                        const today = new Date();
                                        const nextWeek = new Date(today);
                                        nextWeek.setDate(today.getDate() + 7);
                                        setStartDate(today.toISOString().split('T')[0]);
                                        setEndDate(nextWeek.toISOString().split('T')[0]);
                                        setLunchCredit(1);
                                        setOtMealCredit(1);
                                    }}
                                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                                >
                                    All Employees + Next 7 Days
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* View Credits */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">Current Credits</h2>
                            <div>
                                <label className="text-sm text-gray-800 mr-2">From:</label>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 font-medium"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-96">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="text-left p-2 text-gray-900 font-semibold">Employee</th>
                                        <th className="text-left p-2 text-gray-900 font-semibold">Date</th>
                                        <th className="text-center p-2 text-gray-900 font-semibold">Lunch</th>
                                        <th className="text-center p-2 text-gray-900 font-semibold">OT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {credits.map((credit) => (
                                        <tr key={credit.id} className="border-t hover:bg-gray-50">
                                            <td className="p-2">
                                                <span className="text-gray-900 font-medium">{credit.employees.name}</span>
                                                <span className="text-gray-700 text-xs ml-1">
                                                    ({credit.employees.pin})
                                                </span>
                                            </td>
                                            <td className="p-2 text-gray-900">{credit.date}</td>
                                            <td className="text-center p-2">
                                                <span className={credit.lunch_available ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                                    {credit.lunch_available ? '✓' : '✗'}
                                                </span>
                                            </td>
                                            <td className="text-center p-2">
                                                <span className={credit.ot_meal_available ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                                    {credit.ot_meal_available ? '✓' : '✗'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {credits.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No credits found for selected date range
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t text-sm text-gray-800">
                            <p>Total: {credits.length} credit entries</p>
                        </div>
                    </div>
                </div>

                {/* Back to Admin */}
                <div className="mt-8 text-center">
                    <a
                        href="/admin/dashboard"
                        className="text-blue-600 hover:text-blue-800"
                    >
                        ← Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}
