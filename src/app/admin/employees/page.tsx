'use client';

import { useState, useEffect } from 'react';
import { supabase, Database } from '@/lib/supabase';

type Employee = Database['public']['Tables']['employees']['Row'];

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('*, companies(*)')
      .order('name');

    setEmployees(data || []);
    setLoading(false);
  }

  async function handleAdd(employee: Partial<Employee>) {
    const { error } = await supabase
      .from('employees')
      .insert({
        name: employee.name!,
        pin: employee.pin!,
        company_id: 'c0000000-0000-0000-0000-000000000001', // Demo company
        fingerprint_template: employee.fingerprint_template || null
      });

    if (!error) {
      setShowAddModal(false);
      loadEmployees();
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this employee?')) {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (!error) {
        loadEmployees();
      }
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="mt-1 text-gray-700">Manage your company employees</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/register-fingerprint"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              👆 Register Fingerprints
            </a>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">PIN</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fingerprint</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{employee.name}</div>
                </td>
                <td className="px-6 py-4 text-gray-800 font-medium">{employee.pin}</td>
                <td className="px-6 py-4">
                  {employee.fingerprint_template ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      Registered
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      Not Registered
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setEditingEmployee(employee)}
                    className="px-3 py-1 text-blue-600 hover:text-blue-700 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="px-3 py-1 text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No employees yet. Add your first employee to get started.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (emp: any) => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [registerFingerprint, setRegisterFingerprint] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ name, pin, fingerprint_template: null });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Add New Employee</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Enter employee name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN Code
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. 12345"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="fingerprint"
              checked={registerFingerprint}
              onChange={(e) => setRegisterFingerprint(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="fingerprint" className="ml-2 text-sm text-gray-700">
              Register Fingerprint (via Kiosk)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
