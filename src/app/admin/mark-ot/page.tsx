'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Database } from '@/lib/supabase';

type Employee = Database['public']['Tables']['employees']['Row'] & {
  companies: Database['public']['Tables']['companies']['Row'];
  department?: string;
};

type MealCredit = Database['public']['Tables']['meal_credits']['Row'];

export default function OTMarkingPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mealCredits, setMealCredits] = useState<Map<string, MealCredit>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Bulk selection
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Excel import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; notFound: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: emps } = await supabase
      .from('employees')
      .select('*, companies(*)')
      .order('name');

    const { data: credits } = await supabase
      .from('meal_credits')
      .select('*')
      .eq('date', selectedDate);

    const creditsMap = new Map<string, MealCredit>(
      (credits || []).map((c): [string, MealCredit] => [c.employee_id, c])
    );

    setEmployees(emps || []);
    setMealCredits(creditsMap);
    setSelectedEmployees(new Set());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle single employee selection
  function toggleSelect(employeeId: string) {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  }

  // Select all visible employees
  function selectAll() {
    const visibleIds = filteredEmployees.map(e => e.id);
    setSelectedEmployees(new Set(visibleIds));
  }

  // Clear selection
  function clearSelection() {
    setSelectedEmployees(new Set());
  }

  // Bulk grant OT
  async function bulkGrantOT() {
    if (selectedEmployees.size === 0) return;

    setSaving(true);
    const promises = Array.from(selectedEmployees).map(employeeId =>
      fetch('/api/mark-ot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          date: selectedDate,
          ot_meal_available: true
        })
      })
    );

    await Promise.all(promises);

    setToastMessage(`✅ ให้สิทธิ์ OT ${selectedEmployees.size} คนแล้ว`);
    setTimeout(() => setToastMessage(''), 2000);

    setSelectionMode(false);
    setSelectedEmployees(new Set());
    setSaving(false);
    loadData();
  }

  // Bulk revoke OT
  async function bulkRevokeOT() {
    if (selectedEmployees.size === 0) return;

    setSaving(true);
    const promises = Array.from(selectedEmployees).map(employeeId =>
      fetch('/api/mark-ot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          date: selectedDate,
          ot_meal_available: false
        })
      })
    );

    await Promise.all(promises);

    setToastMessage(`❌ ยกเลิกสิทธิ์ OT ${selectedEmployees.size} คนแล้ว`);
    setTimeout(() => setToastMessage(''), 2000);

    setSelectionMode(false);
    setSelectedEmployees(new Set());
    setSaving(false);
    loadData();
  }

  // Handle Excel import
  async function handleImportExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('date', selectedDate);

    try {
      const response = await fetch('/api/mark-ot/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult({ success: result.imported, notFound: result.notFound || [] });
        setToastMessage(`✅ ${result.message}`);
        setTimeout(() => setToastMessage(''), 3000);
        loadData();
      } else {
        setToastMessage(`❌ ${result.error}`);
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch {
      setToastMessage('❌ เกิดข้อผิดพลาด');
      setTimeout(() => setToastMessage(''), 3000);
    }

    setImporting(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Toggle single OT (non-bulk mode)
  async function toggleOT(employeeId: string, employeeName: string) {
    const credit = mealCredits.get(employeeId);
    const newStatus = !credit?.ot_meal_available;

    const response = await fetch('/api/mark-ot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        date: selectedDate,
        ot_meal_available: newStatus
      })
    });

    if (response.ok) {
      setMealCredits(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(employeeId);
        if (existing) {
          newMap.set(employeeId, { ...existing, ot_meal_available: newStatus });
        } else {
          newMap.set(employeeId, {
            id: 'temp',
            employee_id: employeeId,
            date: selectedDate,
            lunch_available: true,
            ot_meal_available: newStatus
          } as MealCredit);
        }
        return newMap;
      });

      setToastMessage(`${employeeName}: ${newStatus ? 'ได้รับสิทธิ์ OT ✅' : 'ยกเลิกสิทธิ์ OT ❌'}`);
      setTimeout(() => setToastMessage(''), 2000);
    }
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.pin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const otGrantedCount = Array.from(mealCredits.values()).filter(c => c.ot_meal_available).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">🍽️ ให้สิทธิ์ OT Meal</h1>
        <p className="text-sm text-gray-700">เลือกพนักงานที่จะให้สิทธิ์รับอาหาร OT</p>

        {/* Date Picker */}
        <div className="mt-3 flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base text-gray-900 font-medium"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
          >
            วันนี้
          </button>
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="ค้นหาพนักงาน..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-xl text-base text-gray-900 placeholder-gray-600"
        />

        {/* Stats & Mode Toggle */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-2 text-sm font-medium">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              👥 {employees.length} คน
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              ✅ OT {otGrantedCount} คน
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedEmployees(new Set());
            }}
            className={`px-3 py-1 rounded-full text-sm font-medium ${selectionMode
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700'
              }`}
          >
            {selectionMode ? '✓ เลือกหลายคน' : '☐ เลือกหลายคน'}
          </button>
        </div>

        {/* Excel Import */}
        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-800">📊 Import จาก Excel</div>
              <div className="text-xs text-blue-600">อัพโหลดไฟล์รายชื่อพนักงาน OT</div>
            </div>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700">
              {importing ? '⏳...' : '📁 เลือกไฟล์'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="mt-2 text-xs">
              <span className="text-green-700">✅ {importResult.success} คน</span>
              {importResult.notFound.length > 0 && (
                <span className="text-red-600 ml-2">
                  ❌ ไม่พบ: {importResult.notFound.slice(0, 3).join(', ')}
                  {importResult.notFound.length > 3 && ` +${importResult.notFound.length - 3}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bulk Selection Controls */}
        {selectionMode && (
          <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-800">
                เลือกแล้ว {selectedEmployees.size} คน
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1 text-xs bg-purple-200 text-purple-800 rounded-full"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full"
                >
                  ล้าง
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={bulkGrantOT}
                disabled={selectedEmployees.size === 0 || saving}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {saving ? '⏳ กำลังบันทึก...' : `✅ ให้สิทธิ์ ${selectedEmployees.size} คน`}
              </button>
              <button
                type="button"
                onClick={bulkRevokeOT}
                disabled={selectedEmployees.size === 0 || saving}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {saving ? '⏳...' : `❌ ยกเลิก ${selectedEmployees.size} คน`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Cards */}
      <div className="px-4 py-4 space-y-3">
        {filteredEmployees.map((employee) => {
          const credit = mealCredits.get(employee.id);
          const hasOT = credit?.ot_meal_available;
          const isSelected = selectedEmployees.has(employee.id);

          return (
            <div
              key={employee.id}
              onClick={() => selectionMode && toggleSelect(employee.id)}
              className={`p-4 rounded-xl border-2 transition-all ${selectionMode
                ? isSelected
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white cursor-pointer'
                : hasOT
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Selection Checkbox */}
                  {selectionMode && (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                      ? 'border-purple-500 bg-purple-500 text-white'
                      : 'border-gray-300'
                      }`}>
                      {isSelected && '✓'}
                    </div>
                  )}

                  <div>
                    <div className="font-semibold text-gray-900">
                      {employee.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {employee.pin}
                    </div>
                  </div>
                </div>

                {/* Action Button (only in non-selection mode) */}
                {!selectionMode && (
                  <button
                    type="button"
                    onClick={() => toggleOT(employee.id, employee.name || '')}
                    className={`px-5 py-3 rounded-xl font-semibold text-base cursor-pointer ${hasOT
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                      }`}
                  >
                    {hasOT ? '❌ ยกเลิก' : '✅ ให้สิทธิ์'}
                  </button>
                )}

                {/* OT Badge (in selection mode) */}
                {selectionMode && hasOT && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    มี OT
                  </span>
                )}
              </div>

              {/* Status badges */}
              {!selectionMode && (
                <div className="mt-2 flex gap-2">
                  {credit?.lunch_available && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      🍱 Lunch
                    </span>
                  )}
                  {hasOT && (
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                      🌙 OT Meal
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? 'ไม่พบพนักงานที่ค้นหา' : 'ไม่มีพนักงาน'}
          </div>
        )}
      </div>

      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-sm bg-gray-900 text-white px-4 py-3 rounded-xl text-center shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
