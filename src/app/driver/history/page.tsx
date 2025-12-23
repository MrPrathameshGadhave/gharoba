'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useDriver } from '@/hooks/useDriver';

export default function DriverHistory() {
  const { driver, profile, vehicle, loading: driverLoading, error: driverError } = useDriver();
  const [duties, setDuties] = useState<any[]>([]);
  const [selectedDuty, setSelectedDuty] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingDuty, setLoadingDuty] = useState(false);

  useEffect(() => {
    if (driver) {
      fetchHistory();
    }
  }, [driver]);

  const fetchHistory = async () => {
    if (!driver) return;
    const { data, error } = await supabase
      .from('daily_duties')
      .select('id, date, start_time, end_time, total_collection')
      .eq('driver_id', driver.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setDuties(data || []);
    }
  };

  const viewDutyDetails = async (duty: any) => {
    setLoadingDuty(true);
    setSelectedDuty(duty);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('duty_id', duty.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } else {
      setExpenses(data || []);
    }
    setLoadingDuty(false);
  };

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const profit = (selectedDuty?.total_collection || 0) - totalExpenses;

  if (driverLoading) return <p className="text-center text-xl">Loading driver data...</p>;
  if (driverError) return <p className="text-center text-xl text-red-600">{driverError}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Trip History</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Duties List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b bg-gray-50">
              <h2 className="text-xl font-semibold">Past Trips</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {duties.length === 0 ? (
                <p className="p-8 text-center text-gray-500">No trips completed yet</p>
              ) : (
                duties.map((duty) => (
                  <div
                    key={duty.id}
                    onClick={() => viewDutyDetails(duty)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                      selectedDuty?.id === duty.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <p className="font-medium">{new Date(duty.date).toLocaleDateString('en-IN')}</p>
                    <p className="text-sm text-gray-600">
                      {duty.start_time ? new Date(duty.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not started'}
                      {' → '}
                      {duty.end_time ? new Date(duty.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                    </p>
                    <p className="text-sm font-medium text-green-600 mt-1">
                      Collection: ₹{duty.total_collection?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Duty Details */}
        <div className="lg:col-span-2">
          {selectedDuty ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-6">
                Trip on {new Date(selectedDuty.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-sm text-gray-600">Start Time</p>
                  <p className="text-lg font-medium">
                    {selectedDuty.start_time ? new Date(selectedDuty.start_time).toLocaleString('en-IN') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Time</p>
                  <p className="text-lg font-medium">
                    {selectedDuty.end_time ? new Date(selectedDuty.end_time).toLocaleString('en-IN') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Collection</p>
                  <p className="text-2xl font-bold text-green-600">₹{selectedDuty.total_collection?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Net Earnings</p>
                  <p className="text-3xl font-bold text-blue-600">₹{profit.toFixed(2)}</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-4">Expenses</h3>
              {loadingDuty ? (
                <p>Loading expenses...</p>
              ) : expenses.length === 0 ? (
                <p className="text-gray-500">No expenses logged</p>
              ) : (
                <div className="space-y-4">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium capitalize">{exp.type}</p>
                        <p className="text-sm text-gray-600">{exp.description || 'No description'}</p>
                        <p className="text-lg font-bold text-red-600 mt-1">₹{exp.amount.toFixed(2)}</p>
                      </div>
                      {exp.receipt_path && (
                        <a
                          href={supabase.storage.from('receipts').getPublicUrl(exp.receipt_path).data.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          View Receipt
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-12 text-center text-gray-500">
              <p className="text-xl">Select a trip from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}