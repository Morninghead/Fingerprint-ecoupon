'use client';

import { useState, useEffect } from 'react';
import { supabase, Database } from '@/lib/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  employees: Database['public']['Tables']['employees']['Row'];
};

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalLunch: 0,
    totalOT: 0,
    totalCost: 0,
    todayCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = new Date().toISOString().split('T')[0];

    const { data: txs } = await supabase
      .from('transactions')
      .select('*, employees(*)')
      .gte('timestamp', today + 'T00:00:00')
      .order('timestamp', { ascending: false })
      .limit(50);

    setTransactions(txs || []);

    // Calculate stats
    const totalLunch = (txs || []).filter(t => t.meal_type === 'LUNCH').length;
    const totalOT = (txs || []).filter(t => t.meal_type === 'OT_MEAL').length;
    const totalCost = (txs || []).reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalLunch,
      totalOT,
      totalCost,
      todayCount: (txs || []).length
    });

    setLoading(false);
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Today's meal redemption statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">Lunch Meals</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{stats.totalLunch}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">OT Meals</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.totalOT}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">Total Today</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{stats.todayCount}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-600">Total Cost</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">฿{stats.totalCost.toFixed(2)}</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Recent Redemptions</h3>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
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
                  {new Date(tx.timestamp).toLocaleTimeString()}
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
            No redemptions today.
          </div>
        )}
      </div>
    </div>
  );
}
