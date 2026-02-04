'use client';

import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-10">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-blue-600">E-Coupon Admin</h1>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <a
              href="/admin/dashboard"
              className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/admin/employees"
              className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Employees
            </a>
            <a
              href="/admin/mark-ot"
              className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Mark OT Meal
            </a>
            <a
              href="/admin/reports"
              className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Reports
            </a>
          </nav>

          <div className="p-4 border-t">
            <button className="w-full px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Admin Panel</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Status: Online</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
