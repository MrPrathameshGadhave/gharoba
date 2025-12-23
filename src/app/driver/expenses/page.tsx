'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useDriver } from '@/hooks/useDriver';

const expenseTypes = [
  { value: 'cng', label: 'CNG Fill' },
  { value: 'toll', label: 'Toll' },
  { value: 'parking', label: 'Parking' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export default function DriverExpenses() {
const { driver, profile, vehicle, loading: driverLoading, error: driverError } = useDriver();  const [currentDuty, setCurrentDuty] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [type, setType] = useState('cng');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (driver) {
      fetchCurrentDuty();
    }
  }, [driver]);

  const fetchCurrentDuty = async () => {
    if (!driver) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_duties')
      .select('id')
      .eq('driver_id', driver.id)
      .eq('date', today)
      .maybeSingle(); // Use maybeSingle to avoid error if no duty

    if (data) {
      setCurrentDuty(data);
      fetchExpenses(data.id);
    } else {
      setCurrentDuty(null);
      setExpenses([]);
    }
  };

  const fetchExpenses = async (dutyId: string) => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('duty_id', dutyId)
      .order('created_at', { ascending: false });
    setExpenses(data || []);
  };

  const addExpense = async () => {
    if (!currentDuty) {
      setMessage('No active duty. Start your journey first.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Enter a valid amount');
      return;
    }

    setUploading(true);
    setMessage('');
    let receiptPath = null;

    if (receipt) {
      const fileExt = receipt.name.split('.').pop();
      const fileName = `receipt_${Date.now()}.${fileExt}`;
      const filePath = `${supabase.auth.getUser().then(u => u.data.user?.id)}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receipt);

      if (uploadError) {
        setMessage('Receipt upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }
      receiptPath = filePath;
    }

    const { error } = await supabase.from('expenses').insert({
      duty_id: currentDuty.id,
      type,
      amount: parseFloat(amount),
      description: description || null,
      receipt_path: receiptPath,
    });

    if (error) {
      setMessage('Error adding expense: ' + error.message);
    } else {
      setMessage('Expense added successfully!');
      setAmount('');
      setDescription('');
      setReceipt(null);
      fetchExpenses(currentDuty.id);
    }
    setUploading(false);
  };

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

  if (driverLoading) return <p className="text-center text-xl">Loading driver data...</p>;
  if (driverError) return <p className="text-center text-xl text-red-600">{driverError}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Expenses</h1>

      {message && (
        <p className={`mb-6 text-lg ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      {!currentDuty ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-xl text-yellow-800">No active duty today</p>
          <p className="text-gray-600 mt-2">Start your journey to log expenses</p>
        </div>
      ) : (
        <>
          {/* Add Expense Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Add New Expense</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {expenseTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. CNG at HP pump"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={addExpense}
                  disabled={uploading}
                  className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {uploading ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Today's Expenses</h2>
              <p className="text-xl font-bold text-red-600">Total: ₹{totalExpenses.toFixed(2)}</p>
            </div>
            {expenses.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No expenses logged yet</p>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="px-6 py-4 capitalize">{exp.type}</td>
                      <td className="px-6 py-4 font-medium">₹{exp.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-600">{exp.description || '-'}</td>
                      <td className="px-6 py-4">
                        {exp.receipt_path ? (
                          <a
                            href={supabase.storage.from('receipts').getPublicUrl(exp.receipt_path).data.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            View Receipt
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}