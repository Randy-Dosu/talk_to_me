import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { regionForPoint } from '@shared/lib/geo';
import { REGION_CENTROIDS, type Region } from '@shared/data/facilities';
import { useMobileStore } from './mobileStore';

export function useMobileLocation() {
  const { state, updateSettings } = useMobileStore();
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const detect = useCallback(async () => {
    setLocating(true);
    setMessage(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setMessage('Location permission denied — pick your region manually.');
        setLocating(false);
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const region = regionForPoint({ lat, lng });
      const saved = {
        lat,
        lng,
        region,
        label: `${region} (GPS)`,
        source: 'gps' as const,
        updatedAt: new Date().toISOString(),
      };
      updateSettings({ location: saved });
      setLocating(false);
      return saved;
    } catch {
      setMessage('Could not read GPS — choose your region below.');
      setLocating(false);
      return null;
    }
  }, [updateSettings]);

  const setManualRegion = useCallback(
    (region: Region | '') => {
      if (!region) {
        updateSettings({ location: null });
        return;
      }
      const centroid = REGION_CENTROIDS[region];
      updateSettings({
        location: {
          lat: centroid.lat,
          lng: centroid.lng,
          region,
          label: region,
          source: 'manual',
          updatedAt: new Date().toISOString(),
        },
      });
      setMessage(null);
    },
    [updateSettings],
  );

  return {
    location: state.settings.location,
    locating,
    message,
    detect,
    setManualRegion,
  };
}
