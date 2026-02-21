'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // Transaction History state
  const [historyTxs, setHistoryTxs] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [mealFilter, setMealFilter] = useState<'ALL' | 'LUNCH' | 'OT_MEAL'>('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  const [historyStats, setHistoryStats] = useState({
    total: 0, lunch: 0, ot: 0, cost: 0
  });

  useEffect(() => {
    loadTodayData();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [dateFrom, dateTo, mealFilter, currentPage]);

  async function loadTodayData() {
    const today = new Date().toISOString().split('T')[0];

    const { data: txs } = await supabase
      .from('transactions')
      .select('*, employees(*)')
      .gte('timestamp', today + 'T00:00:00')
      .order('timestamp', { ascending: false })
      .limit(50);

    setTransactions(txs || []);

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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    const fromTs = `${dateFrom}T00:00:00+07:00`;
    const nextDay = new Date(dateTo);
    nextDay.setDate(nextDay.getDate() + 1);
    const toTs = `${nextDay.toISOString().split('T')[0]}T00:00:00+07:00`;

    // Build query
    let query = supabase
      .from('transactions')
      .select('*, employees(*)', { count: 'exact' })
      .gte('timestamp', fromTs)
      .lt('timestamp', toTs)
      .order('timestamp', { ascending: false });

    if (mealFilter !== 'ALL') {
      query = query.eq('meal_type', mealFilter);
    }

    // Paginate
    query = query.range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    const { data, count } = await query;
    setHistoryTxs(data || []);
    setTotalCount(count || 0);

    // Summary stats for the period (separate query without pagination)
    let statsQuery = supabase
      .from('transactions')
      .select('meal_type, amount')
      .gte('timestamp', fromTs)
      .lt('timestamp', toTs);

    if (mealFilter !== 'ALL') {
      statsQuery = statsQuery.eq('meal_type', mealFilter);
    }

    const { data: allTxs } = await statsQuery;
    const lunch = (allTxs || []).filter(t => t.meal_type === 'LUNCH').length;
    const ot = (allTxs || []).filter(t => t.meal_type === 'OT_MEAL').length;
    const cost = (allTxs || []).reduce((sum, t) => sum + Number(t.amount), 0);

    setHistoryStats({
      total: (allTxs || []).length,
      lunch,
      ot,
      cost
    });

    setHistoryLoading(false);
  }, [dateFrom, dateTo, mealFilter, currentPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Filter history by search
  const filteredHistory = searchTerm
    ? historyTxs.filter(tx =>
      (tx.employees?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.employees?.pin || '').includes(searchTerm)
    )
    : historyTxs;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      {/* Navigation Menu */}
      <div className="mb-8 bg-white rounded-lg shadow-sm p-4">
        <nav className="flex gap-4 flex-wrap">
          <a href="/admin/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
            Dashboard
          </a>
          <a href="/admin/daily-credits" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
            📊 Daily Credits
          </a>
          <a href="/admin/credits" className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
            Manage Credits
          </a>
          <a href="/admin/employees" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
            Employees
          </a>
          <a href="/admin/mark-ot" className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200">
            🌙 Mark OT
          </a>
          <a href="/admin/reports" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
            Reports
          </a>
        </nav>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-700">Today&apos;s meal redemption statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-800">🍚 Lunch Meals</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{stats.totalLunch}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-800">🌙 OT Meals</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.totalOT}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-800">📊 Total Today</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{stats.todayCount}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm font-medium text-gray-800">💰 Total Cost</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">฿{stats.totalCost.toFixed(2)}</div>
        </div>
      </div>

      {/* Today's Redemptions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">📋 Today&apos;s Redemptions</h3>
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
                <td className="px-6 py-4 text-sm text-gray-800">
                  {new Date(tx.timestamp).toLocaleTimeString('th-TH')}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {tx.employees?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  {tx.meal_type === 'LUNCH' ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">🍚 Lunch</span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">🌙 OT Meal</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-900 font-medium">฿{Number(tx.amount).toFixed(2)}</td>
                <td className="px-6 py-4">
                  {tx.status === 'VALID' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">✓ Valid</span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">⚠ Override</span>
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

      {/* ════════════════════════════════════════════════ */}
      {/* Transaction History */}
      {/* ════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">📜 Transaction History</h3>
          <p className="text-sm text-gray-500 mt-1">ประวัติการใช้สิทธิ์ย้อนหลัง</p>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">จากวันที่</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setCurrentPage(0); }}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ถึงวันที่</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setCurrentPage(0); }}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ประเภท</label>
            <select
              value={mealFilter}
              onChange={e => { setMealFilter(e.target.value as 'ALL' | 'LUNCH' | 'OT_MEAL'); setCurrentPage(0); }}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="LUNCH">🍚 Lunch</option>
              <option value="OT_MEAL">🌙 OT Meal</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">ค้นหาพนักงาน</label>
            <input
              type="text"
              placeholder="ชื่อ หรือ รหัสพนักงาน..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => { setCurrentPage(0); loadHistory(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            🔄 โหลดข้อมูล
          </button>
        </div>

        {/* Period Summary */}
        <div className="px-6 py-3 bg-blue-50 border-b flex gap-6 text-sm">
          <span className="text-gray-600">
            ช่วงที่เลือก: <strong className="text-gray-900">{historyStats.total}</strong> รายการ
          </span>
          <span className="text-blue-700">🍚 Lunch: <strong>{historyStats.lunch}</strong></span>
          <span className="text-green-700">🌙 OT: <strong>{historyStats.ot}</strong></span>
          <span className="text-orange-700">💰 รวม: <strong>฿{historyStats.cost.toFixed(2)}</strong></span>
        </div>

        {/* History Table */}
        {historyLoading ? (
          <div className="p-8 text-center text-gray-500">⏳ กำลังโหลด...</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">วัน/เวลา</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">รหัส</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ชื่อพนักงาน</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ประเภท</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">จำนวน</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-800">
                      <div>{new Date(tx.timestamp).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</div>
                      <div className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                      {tx.employees?.pin || '-'}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {tx.employees?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-3">
                      {tx.meal_type === 'LUNCH' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">🍚 Lunch</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">🌙 OT</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-900 font-medium">฿{Number(tx.amount).toFixed(2)}</td>
                    <td className="px-6 py-3">
                      {tx.status === 'VALID' ? (
                        <span className="text-green-600 text-sm">✓</span>
                      ) : (
                        <span className="text-yellow-600 text-sm">⚠ Override</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHistory.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                ไม่พบ transaction ในช่วงที่เลือก
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  แสดง {currentPage * PAGE_SIZE + 1}-{Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} จาก {totalCount} รายการ
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-gray-100"
                  >
                    ← ก่อนหน้า
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    หน้า {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-gray-100"
                  >
                    ถัดไป →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

