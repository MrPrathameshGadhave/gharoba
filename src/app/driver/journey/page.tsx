'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { useDriver } from '@/hooks/useDriver';

// Dynamic import for Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

function LocationMarker({ position }: { position: [number, number] }) {
  return (
    <Marker position={position}>
      <Popup>Current Location</Popup>
    </Marker>
  );
}

export default function DriverJourney() {
  const { driver, loading: driverLoading, error: driverError } = useDriver();
  const [currentDuty, setCurrentDuty] = useState<any>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const watchId = useRef<number | null>(null);
  const lastPosition = useRef<[number, number] | null>(null);

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
      .select('*')
      .eq('driver_id', driver.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      setCurrentDuty(data);
      if (data.start_time && !data.end_time) {
        if (data.start_location) {
          const [lat, lng] = data.start_location.split(',').map(Number);
          setPosition([lat, lng]);
          lastPosition.current = [lat, lng];
          setRoute([[lat, lng]]);
        }
        startTracking();
      }
    }
  };

  const startTracking = () => {
    if (watchId.current || !navigator.geolocation) return;

    setStatusMessage('Requesting location permission...');

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newPos: [number, number] = [lat, lng];

        setPosition(newPos);
        setRoute(prev => [...prev, newPos]);

        if (lastPosition.current) {
          calculateDistance(lastPosition.current, newPos);
        }
        lastPosition.current = newPos;

        await supabase.from('live_locations').upsert({
          driver_id: driver.id,
          location: `${lat},${lng}`
        });

        if (statusMessage.includes('Requesting')) {
          setStatusMessage('Live tracking active!');
        }
      },
      (err) => {
        setStatusMessage('Location error: ' + err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    watchId.current = id;
  };

  const stopTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    supabase.from('live_locations').delete().eq('driver_id', driver.id);
    lastPosition.current = null;
  };

  const calculateDistance = (from: [number, number], to: [number, number]) => {
    const R = 6371e3;
    const φ1 = (from[0] * Math.PI) / 180;
    const φ2 = (to[0] * Math.PI) / 180;
    const Δφ = ((to[0] - from[0]) * Math.PI) / 180;
    const Δλ = ((to[1] - from[1]) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c / 1000;
    setDistance(prev => prev + d);
  };

  const startDuty = async () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation not supported');
      return;
    }

    setStatusMessage('Getting location...');

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const loc = `${lat},${lng}`;
      const newPos: [number, number] = [lat, lng];

      const { data, error } = await supabase.from('daily_duties').insert({
        driver_id: driver.id,
        start_time: new Date().toISOString(),
        start_location: loc,
      }).select().single();

      if (error) {
        setStatusMessage('Error starting duty: ' + error.message);
      } else {
        setStatusMessage('Duty started! Live tracking active.');
        setCurrentDuty(data);
        setPosition(newPos);
        setRoute([newPos]);
        setDistance(0);
        lastPosition.current = newPos;
        startTracking();
      }
    }, (err) => setStatusMessage('Location access denied: ' + err.message));
  };

  const endDuty = async () => {
    stopTracking();
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const loc = `${lat},${lng}`;

      const { error } = await supabase.from('daily_duties').update({
        end_time: new Date().toISOString(),
        end_location: loc,
      }).eq('id', currentDuty.id);

      if (error) {
        setStatusMessage('Error ending duty: ' + error.message);
      } else {
        setStatusMessage('Duty ended successfully!');
        setCurrentDuty(null);
        setRoute([]);
        setDistance(0);
        setPosition(null);
      }
    }, (err) => setStatusMessage('Location error on end'));
  };

  if (driverLoading) return <p className="text-center text-xl">Loading...</p>;
  if (driverError) return <p className="text-center text-xl text-red-600">{driverError}</p>;

  const isActive = currentDuty?.start_time && !currentDuty?.end_time;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Journey</h1>

      {statusMessage && <p className="mb-4 text-lg font-medium text-indigo-600">{statusMessage}</p>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-lg">Status: {isActive ? 'Active' : 'Not Started'}</p>
            <p className="text-lg">Distance Travelled: {distance.toFixed(2)} km</p>
          </div>
          <div className="flex gap-4">
            {!isActive && (
              <button onClick={startDuty} className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Start Journey
              </button>
            )}
            {isActive && (
              <button onClick={endDuty} className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                End Journey
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow" style={{ height: '500px', width: '100%' }}>
        {position ? (
          <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker position={position} />
            {route.length > 1 && <Polyline positions={route} color="blue" weight={6} />}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p className="text-xl">Map will appear when journey starts</p>
          </div>
        )}
      </div>
    </div>
  );
}