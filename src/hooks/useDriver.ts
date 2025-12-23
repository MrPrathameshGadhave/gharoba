import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export function useDriver() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        // 1. Fetch driver record
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('id, phone, license_number, aadhaar_number, documents_approved, assigned_vehicle')
          .eq('user_id', user.id)
          .single();

        if (driverError || !driverData) {
          throw new Error('Driver record not found');
        }
        setDriver(driverData);

        // 2. Fetch profile (full_name)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // 3. Fetch assigned vehicle if any
        if (driverData.assigned_vehicle) {
          const { data: vehicleData } = await supabase
            .from('vehicles')
            .select('registration_number')
            .eq('id', driverData.assigned_vehicle)
            .single();
          setVehicle(vehicleData);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load driver data');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  return { driver, profile, vehicle, loading, error };
}