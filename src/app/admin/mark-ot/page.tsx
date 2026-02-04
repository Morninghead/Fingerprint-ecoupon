'use client';

import { useState, useEffect } from 'react';
import { supabase, Database } from '@/lib/supabase';

type Employee = Database['public']['Tables']['employees']['Row'] & {
  companies: Database['public']['Tables']['companies']['Row'];
};

type MealCredit = Database['public']['Tables']['meal_credits']['Row'];

export default function OTMarkingPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mealCredits, setMealCredits] = useState<Map<string, MealCredit>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    const { data: emps } = await supabase
      .from('employees')
      .select('*, companies(*)')
      .order('name');

    const { data: credits } = await supabase
      .from('meal_credits')
      .select('*')
      .eq('date', selectedDate);

    const creditsMap = new Map((credits || []).map(c => [c.employee_id, c]));

    setEmployees(emps || []);
    setMealCredits(creditsMap);
    setLoading(false);
  }

  async function toggleOT(employeeId: string) {
    const credit = mealCredits.get(employeeId);

    const response = await fetch('/api/mark-ot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        date: selectedDate,
        ot_meal_available: credit?.ot_meal_available ? false : true
      })
    });

    if (response.ok) {
      loadData();
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mark OT Meals</h1>
            <p className="mt-1 text-gray-600">Enable overtime meal availability for employees</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Employee List with OT Toggle */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Employee</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Lunch Credit</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">OT Meal Credit</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => {
              const credit = mealCredits.get(employee.id);

              return (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{employee.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    {credit?.lunch_available ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        Available
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        Used
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {credit?.ot_meal_available ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        Available
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        Not Available
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleOT(employee.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {credit?.ot_meal_available ? 'Remove OT' : 'Add OT'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No employees. Add employees first in the Employees page.
          </div>
        )}
      </div>
    </div>
  );
}
