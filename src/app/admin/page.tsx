'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminHome() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/');
    }
  }, [role, loading, router]);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold">Total Vehicles</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-4">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold">Active Drivers</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-4">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold">Today's Earnings</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-4">₹0</p>
        </div>
      </div>
    </div>
  );
}