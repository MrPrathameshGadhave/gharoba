'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import L from 'leaflet';

// Fix Leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type ActiveDriver = {
  driver_id: string;
  location: string;
  full_name: string;
  vehicle_reg: string;
};

export default function AdminLiveTracking() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [center, setCenter] = useState<[number, number]>([19.0760, 72.8777]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/');
    }
  }, [role, loading, router]);

  useEffect(() => {
    if (role === 'admin') {
      const channel = supabase
        .channel('live_locations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => {
          fetchActiveDrivers();
        })
        .subscribe();

      fetchActiveDrivers();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [role]);

  const fetchActiveDrivers = async () => {
    // Step 1: Fetch live locations
    const { data: liveData, error: liveError } = await supabase
      .from('live_locations')
      .select('driver_id, location');

    if (liveError || !liveData || liveData.length === 0) {
      setDrivers([]);
      return;
    }

    // Step 2: Fetch driver details separately
    const driverIds = liveData.map(d => d.driver_id);

    const { data: driverDetails } = await supabase
      .from('drivers')
      .select('id, assigned_vehicle')
      .in('id', driverIds);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', driverDetails?.map(d => d.user_id) || []); // Note: if you have user_id in drivers

    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number')
      .in('id', driverDetails?.map(d => d.assigned_vehicle).filter(Boolean) || []);

    // Combine
    const formatted = liveData.map(item => {
      const driverDetail = driverDetails?.find(d => d.id === item.driver_id);
      const profile = profiles?.find(p => p.id === driverDetail?.user_id) || { full_name: 'Unknown' };
      const vehicle = vehicles?.find(v => v.id === driverDetail?.assigned_vehicle) || { registration_number: 'Not Assigned' };

      return {
        driver_id: item.driver_id,
        location: item.location,
        full_name: profile.full_name,
        vehicle_reg: vehicle.registration_number,
      };
    });

    setDrivers(formatted);

    if (formatted.length > 0) {
      const first = formatted[0].location.split(',').map(Number);
      setCenter([first[0], first[1]]);
    }
  };

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (loading || !mapReady) return <p className="text-center text-xl">Loading map...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Live Driver Tracking</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {drivers.map((driver) => {
            const [lat, lng] = driver.location.split(',').map(Number);
            return (
              <Marker key={driver.driver_id} position={[lat, lng]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{driver.full_name}</p>
                    <p className="text-sm">{driver.vehicle_reg}</p>
                    <p className="text-xs text-green-600">● Active</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Active Drivers ({drivers.length})</h2>
        {drivers.length === 0 ? (
          <p className="text-gray-500">No drivers currently on duty</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((driver) => (
              <div key={driver.driver_id} className="border rounded-lg p-4">
                <p className="font-medium">{driver.full_name}</p>
                <p className="text-sm text-gray-600">{driver.vehicle_reg}</p>
                <p className="text-xs text-green-600 mt-1">● Online</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}