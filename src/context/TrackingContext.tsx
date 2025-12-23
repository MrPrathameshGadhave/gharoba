'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useDriver } from '@/hooks/useDriver';

type TrackingContextType = {
  isTracking: boolean;
  currentDuty: any;
  startTracking: () -> Promise<void>;
  stopTracking: () -> void;
};

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { driver } = useDriver();
  const [isTracking, setIsTracking] = useState(false);
  const [currentDuty, setCurrentDuty] = useState<any>(null);
  const watchId = useRef<number | null>(null);

  const fetchCurrentDuty = async () => {
    if (!driver) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_duties')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('date', today)
      .maybeSingle();

    if (data && data.start_time && !data.end_time) {
      setCurrentDuty(data);
      if (!isTracking) {
        startLocationWatch();
      }
    } else {
      setCurrentDuty(null);
      stopLocationWatch();
    }
  };

  const startLocationWatch = () => {
    if (watchId.current || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        await supabase.from('live_locations').upsert({
          driver_id: driver.id,
          location: `${lat},${lng}`
        });
      },
      (err) => console.error('Location error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    watchId.current = id;
    setIsTracking(true);
  };

  const stopLocationWatch = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    supabase.from('live_locations').delete().eq('driver_id', driver.id);
    setIsTracking(false);
  };

  useEffect(() => {
    if (driver) {
      fetchCurrentDuty();

      const channel = supabase
        .channel('duty_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'daily_duties',
          filter: `driver_id=eq.${driver.id}`
        }, () => fetchCurrentDuty())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [driver]);

  const startTracking = async () => {
    // This will be called from Journey page
    // We'll implement it there
  };

  const stopTracking = () => {
    stopLocationWatch();
    setCurrentDuty(null);
  };

  return (
    <TrackingContext.Provider value={{ isTracking, currentDuty, startTracking, stopTracking }}>
      {children}
    </TrackingContext.Provider>
  );
}

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) throw new Error('useTracking must be used within TrackingProvider');
  return context;
};