'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const navItems = [
  { name: 'Dashboard', href: '/admin' },
  { name: 'Vehicles', href: '/admin/vehicles' },
  { name: 'Drivers', href: '/admin/drivers' },
  { name: 'Reports', href: '/admin/reports' },
  { name: 'Live Tracking', href: '/admin/tracking' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-900 text-white flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-indigo-800">
          <h1 className="text-2xl font-bold">Gharoba</h1>
          <p className="text-indigo-300 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 mt-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-6 py-3 text-lg font-medium transition-colors hover:bg-indigo-800 ${
                pathname === item.href ? 'bg-indigo-800 border-l-4 border-white' : ''
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Logout Button - Now at the bottom, nicer look */}
        <div className="p-6 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition font-medium text-white shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        {children}
      </div>
    </div>
  );
}