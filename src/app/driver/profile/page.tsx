'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function DriverProfile() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [driver, setDriver] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && role !== 'driver') {
      router.push('/');
    } else if (user) {
      fetchProfileData();
    }
  }, [user, role, loading, router]);

  const fetchProfileData = async () => {
    // Fetch driver data
    const { data: driverData } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    // Fetch profile data separately
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user?.id)
      .single();

    if (driverData) {
      setDriver(driverData);
      setPhone(driverData.phone || '');
      setLicenseNumber(driverData.license_number || '');
      setAadhaarNumber(driverData.aadhaar_number || '');
    }

    if (profileData) {
      setProfile(profileData);
      setFullName(profileData.full_name || '');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const updates = [];

    // Update profiles table
    if (fullName !== profile?.full_name) {
      updates.push(
        supabase.from('profiles').update({ full_name: fullName }).eq('id', user?.id)
      );
    }

    // Update drivers table
    const driverUpdates: any = {};
    if (phone !== driver?.phone) driverUpdates.phone = phone;
    if (licenseNumber !== driver?.license_number) driverUpdates.license_number = licenseNumber;
    if (aadhaarNumber !== driver?.aadhaar_number) driverUpdates.aadhaar_number = aadhaarNumber;

    if (Object.keys(driverUpdates).length > 0) {
      updates.push(
        supabase.from('drivers').update(driverUpdates).eq('user_id', user?.id)
      );
    }

    if (updates.length === 0) {
      setMessage('No changes to save');
      setSaving(false);
      return;
    }

    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);

    if (hasError) {
      setMessage('Error saving profile');
    } else {
      setMessage('Profile updated successfully!');
      fetchProfileData();
    }
    setSaving(false);
  };

  if (loading || !driver || !profile) return <p className="text-center text-xl">Loading...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Profile</h1>

      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email (cannot change)</label>
            <p className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">{user?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Driving License Number</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
            <input
              type="text"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {message && (
              <p className={`mt-4 text-lg ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}