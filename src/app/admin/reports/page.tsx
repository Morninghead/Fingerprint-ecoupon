'use client';

import { useState, useEffect } from 'react';
import { supabase, Database } from '@/lib/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  employees: Database['public']['Tables']['employees']['Row'];
};

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    mealType: ''
  });

  useEffect(() => {
    loadReports();
  }, [filters]);

  async function loadReports() {
    let query = supabase
      .from('transactions')
      .select('*, employees(*)')
      .order('timestamp', { ascending: false });

    if (filters.dateFrom) {
      query = query.gte('timestamp', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('timestamp', filters.dateTo + 'T23:59:59');
    }

    if (filters.mealType) {
      query = query.eq('meal_type', filters.mealType);
    }

    const { data } = await query.limit(100);

    setTransactions(data || []);
    setLoading(false);
  }

  function exportToCSV() {
    const headers = ['Time', 'Employee', 'Meal Type', 'Amount', 'Status'];
    const rows = transactions.map(t => [
      new Date(t.timestamp).toLocaleString(),
      t.employees?.name || 'Unknown',
      t.meal_type,
      `฿${t.amount}`,
      t.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Reports</h1>
            <p className="mt-1 text-gray-600">View and export meal redemption history</p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={transactions.length === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meal Type
            </label>
            <select
              value={filters.mealType}
              onChange={(e) => setFilters({ ...filters, mealType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Types</option>
              <option value="LUNCH">Lunch</option>
              <option value="OT_MEAL">OT Meal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date/Time</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Meal Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {tx.employees?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  {tx.meal_type === 'LUNCH' ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      Lunch
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                      OT Meal
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-900 font-medium">
                  ฿{Number(tx.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {tx.status === 'VALID' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                      Valid
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                      Override
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No transactions found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
