'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

type Driver = {
  id: string;
  phone: string | null;
  license_number: string | null;
  aadhaar_number: string | null;
  assigned_vehicle: string | null;
  documents_approved: boolean;
  full_name: string | null;
  email: string | null;
  vehicle_reg: string | null;
};

type Vehicle = {
  id: string;
  registration_number: string;
};

export default function DriversPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/');
    } else if (role === 'admin') {
      fetchVehicles();
      fetchDrivers();
    }
  }, [role, loading, router]);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, registration_number')
      .order('registration_number');
    setVehicles(data || []);
  };

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from('driver_details')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error fetching drivers:', error);
      alert('Failed to load drivers: ' + error.message);
    } else {
      setDrivers(data || []);
    }
  };

  const handleAssignVehicle = async () => {
    if (!selectedDriver) return;

    const { error } = await supabase
      .from('drivers')
      .update({ assigned_vehicle: assignVehicleId || null })
      .eq('id', selectedDriver.id);

    if (error) {
      alert('Error assigning vehicle: ' + error.message);
    } else {
      alert('Vehicle assigned successfully!');
      setSelectedDriver(null);
      setAssignVehicleId('');
      fetchDrivers();
    }
  };

  const toggleDocumentsApproved = async (driverId: string, current: boolean) => {
    const { error } = await supabase
      .from('drivers')
      .update({ documents_approved: !current })
      .eq('id', driverId);

    if (error) {
      alert('Error updating documents status');
    } else {
      fetchDrivers();
    }
  };

  if (loading) return <p className="text-center text-xl">Loading...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Drivers Management</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No drivers found. New signups will appear here.
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id}>
                  <td className="px-6 py-4 font-medium">{driver.full_name || 'No Name'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{driver.email || 'No Email'}</td>
                  <td className="px-6 py-4 text-sm">{driver.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm">{driver.license_number || '-'}</td>
                  <td className="px-6 py-4 font-medium">{driver.vehicle_reg || 'Not Assigned'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${driver.documents_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {driver.documents_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-3">
                    <button onClick={() => {
                      setSelectedDriver(driver);
                      setAssignVehicleId(driver.assigned_vehicle || '');
                    }} className="text-indigo-600 hover:text-indigo-900">
                      Assign Vehicle
                    </button>
                    <button onClick={() => toggleDocumentsApproved(driver.id, driver.documents_approved)} className={driver.documents_approved ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}>
                      {driver.documents_approved ? 'Revoke' : 'Approve'} Docs
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Vehicle Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Assign Vehicle to {selectedDriver.full_name}</h2>
            <select value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)} className="w-full px-4 py-2 border rounded-md mb-6">
              <option value="">No Vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number}</option>
              ))}
            </select>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setSelectedDriver(null)} className="px-6 py-2 bg-gray-500 text-white rounded-lg">
                Cancel
              </button>
              <button onClick={handleAssignVehicle} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}