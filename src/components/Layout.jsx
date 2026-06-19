import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-gray-800 font-semibold text-sm">总装异常管理系统</h1>
        <div className="w-8" />
      </header>

      {/* Main content */}
      <main className="lg:ml-60 p-4 lg:p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
