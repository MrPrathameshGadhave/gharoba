'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useDriver } from '@/hooks/useDriver';

export default function DriverHome() {
  const { driver, profile, vehicle, loading: driverLoading, error: driverError } = useDriver();
  const [todayDuty, setTodayDuty] = useState<any>(null);

  useEffect(() => {
    if (driver) {
      const fetchTodayDuty = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('daily_duties')
          .select('*')
          .eq('driver_id', driver.id)
          .eq('date', today)
          .maybeSingle();

        setTodayDuty(data || null);
      };

      fetchTodayDuty();
    }
  }, [driver]);

  if (driverLoading) return <p className="text-center text-xl mt-20">Loading driver data...</p>;
  if (driverError) return <p className="text-center text-xl text-red-600 mt-20">{driverError}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Welcome, {profile?.full_name || 'Driver'}!
      </h1>
      <p className="text-gray-600 mb-8">
        Vehicle: {vehicle?.registration_number || 'Not Assigned'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Document Status</h3>
          <p className={`text-2xl font-bold ${driver?.documents_approved ? 'text-green-600' : 'text-red-600'}`}>
            {driver?.documents_approved ? 'Approved ✓' : 'Pending Approval'}
          </p>
          {!driver?.documents_approved && (
            <p className="text-sm text-gray-600 mt-2">Upload all documents to start duty</p>
          )}
        </div>

        {/* Today's Duty */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Today's Duty</h3>
          {todayDuty ? (
            todayDuty.end_time ? (
              <p className="text-2xl font-bold text-green-600">Completed ✓</p>
            ) : (
              <p className="text-2xl font-bold text-blue-600">Active</p>
            )
          ) : (
            <p className="text-2xl font-bold text-gray-500">Not Started</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Quick Actions</h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">→</span> Go to Journey → Start Trip
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">→</span> Upload Documents
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">→</span> Log Expenses
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">→</span> View Trip History
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}