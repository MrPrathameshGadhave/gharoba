'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

type Vehicle = {
  id: string;
  registration_number: string;
  model: string;
  cng_fitted: boolean;
  insurance_expiry: string | null;
  puc_expiry: string | null;
};

export default function VehiclesPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [regNo, setRegNo] = useState('');
  const [model, setModel] = useState('');
  const [cngFitted, setCngFitted] = useState(true);
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [pucExpiry, setPucExpiry] = useState('');

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/');
    } else if (role === 'admin') {
      fetchVehicles();
    }
  }, [role, loading, router]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage({ type: 'error', text: 'Error loading vehicles: ' + error.message });
    } else {
      setVehicles(data || []);
    }
  };

  const resetForm = () => {
    setRegNo('');
    setModel('');
    setCngFitted(true);
    setInsuranceExpiry('');
    setPucExpiry('');
    setEditingVehicle(null);
    setShowForm(false);
    setMessage(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const vehicleData = {
      registration_number: regNo.toUpperCase().trim(),
      model: model.trim(),
      cng_fitted: cngFitted,
      insurance_expiry: insuranceExpiry || null,
      puc_expiry: pucExpiry || null,
    };

    let error;

    if (editingVehicle) {
      ({ error } = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', editingVehicle.id));
    } else {
      ({ error } = await supabase
        .from('vehicles')
        .insert(vehicleData));
    }

    if (error) {
      let errorMsg = error.message;
      if (error.code === '23505') {
        errorMsg = 'Registration number already exists.';
      }
      setMessage({ type: 'error', text: errorMsg });
    } else {
      setMessage({ type: 'success', text: editingVehicle ? 'Vehicle updated!' : 'Vehicle added successfully!' });
      resetForm();
      fetchVehicles();
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setRegNo(vehicle.registration_number);
    setModel(vehicle.model);
    setCngFitted(vehicle.cng_fitted);
    setInsuranceExpiry(vehicle.insurance_expiry || '');
    setPucExpiry(vehicle.puc_expiry || '');
    setShowForm(true);
    setMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return;

    const { error } = await supabase.from('vehicles').delete().eq('id', id);

    if (error) {
      setMessage({ type: 'error', text: 'Error deleting: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Vehicle deleted!' });
      fetchVehicles();
    }
  };

  if (loading) return <p className="text-center text-xl">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Vehicles</h1>
        <button
          onClick={openAddForm}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition"
        >
          + Add Vehicle
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">
            {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number *</label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                required
                placeholder="MH04AB1234"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                placeholder="Maruti Swift"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={cngFitted}
                onChange={(e) => setCngFitted(e.target.checked)}
                className="mr-3 h-5 w-5 text-indigo-600 rounded"
              />
              <label className="text-sm font-medium text-gray-700">CNG Fitted</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Expiry</label>
              <input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PUC Expiry</label>
              <input
                type="date"
                value={pucExpiry}
                onChange={(e) => setPucExpiry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                {editingVehicle ? 'Update' : 'Save'} Vehicle
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNG</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Insurance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PUC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No vehicles added yet
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-6 py-4 font-medium">{vehicle.registration_number}</td>
                  <td className="px-6 py-4">{vehicle.model}</td>
                  <td className="px-6 py-4">{vehicle.cng_fitted ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4">{vehicle.insurance_expiry || '-'}</td>
                  <td className="px-6 py-4">{vehicle.puc_expiry || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}