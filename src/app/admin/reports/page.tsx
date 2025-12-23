'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

type MonthlyReport = {
  driver_name: string;
  vehicle_reg: string;
  total_earnings: number;
  cng_spend: number;
  other_expenses: number;
  profit: number;
  days_worked: number;
};

export default function ReportsPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState(''); // YYYY-MM format
  const [report, setReport] = useState<MonthlyReport[]>([]);
  const [totals, setTotals] = useState({
    total_earnings: 0,
    total_cng: 0,
    total_other: 0,
    total_profit: 0,
  });
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/');
    }
  }, [role, loading, router]);

  const generateReport = async () => {
    if (!month) {
      alert('Please select a month');
      return;
    }
    setLoadingReport(true);

    const fromDate = `${month}-01`;
    const toDate = new Date(month + '-01');
    toDate.setMonth(toDate.getMonth() + 1);
    const endDate = toDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .rpc('get_monthly_report', {
        start_date: fromDate,
        end_date: endDate,
      });

    if (error) {
      console.error('RPC error:', error);
      alert('Error generating report: ' + error.message);
    } else {
      setReport(data || []);
      const totalsCalc = data?.reduce((acc: any, curr: any) => ({
        total_earnings: acc.total_earnings + curr.total_earnings,
        total_cng: acc.total_cng + curr.cng_spend,
        total_other: acc.total_other + curr.other_expenses,
        total_profit: acc.total_profit + curr.profit,
      }), { total_earnings: 0, total_cng: 0, total_other: 0, total_profit: 0 }) || totals;
      setTotals(totalsCalc);
    }
    setLoadingReport(false);
  };

  const exportCSV = () => {
    if (report.length === 0) return;

    const headers = ['Driver', 'Vehicle', 'Earnings (₹)', 'CNG Spend (₹)', 'Other Expenses (₹)', 'Profit (₹)', 'Days Worked'];
    const rows = report.map(r => [
      r.driver_name,
      r.vehicle_reg,
      r.total_earnings.toFixed(2),
      r.cng_spend.toFixed(2),
      r.other_expenses.toFixed(2),
      r.profit.toFixed(2),
      r.days_worked,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GharobaCabs_Report_${month}.csv`;
    a.click();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Monthly Reports</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
          </div>
          <button
            onClick={generateReport}
            disabled={loadingReport}
            className="px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loadingReport ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {report.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800">Total Earnings</h3>
              <p className="text-3xl font-bold text-green-600">₹{totals.total_earnings.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800">Total CNG Spend</h3>
              <p className="text-3xl font-bold text-red-600">₹{totals.total_cng.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800">Other Expenses</h3>
              <p className="text-3xl font-bold text-orange-600">₹{totals.total_other.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">Net Profit</h3>
              <p className="text-3xl font-bold text-blue-600">₹{totals.total_profit.toFixed(2)}</p>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-semibold">Driver Breakdown - {month}</h2>
              <button
                onClick={exportCSV}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Export CSV
              </button>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNG</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Other Exp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.map((row, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 font-medium">{row.driver_name}</td>
                    <td className="px-6 py-4">{row.vehicle_reg || '-'}</td>
                    <td className="px-6 py-4 text-green-600 font-medium">₹{row.total_earnings.toFixed(2)}</td>
                    <td className="px-6 py-4 text-red-600">₹{row.cng_spend.toFixed(2)}</td>
                    <td className="px-6 py-4 text-orange-600">₹{row.other_expenses.toFixed(2)}</td>
                    <td className="px-6 py-4 text-blue-600 font-bold">₹{row.profit.toFixed(2)}</td>
                    <td className="px-6 py-4">{row.days_worked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}