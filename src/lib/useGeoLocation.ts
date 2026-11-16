import { useCallback, useState } from 'react';
import type { GeoPoint } from './geo';

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'timeout' | 'error';

const COPY: Record<Exclude<LocationStatus, 'idle' | 'locating' | 'ready'>, string> = {
  denied: 'Location is blocked. Pick your region instead — same result, one tap.',
  unavailable: 'This device cannot give a location. Pick your region instead.',
  timeout: 'Location took too long. Pick your region instead.',
  error: 'Could not read your location. Pick your region instead.',
};

/**
 * Browser geolocation with honest failure states. Coordinates never leave the
 * device: distance is computed locally against a bundled facility list.
 */
export function useGeoLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const request = useCallback(
    () =>
      new Promise<GeoPoint | null>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setStatus('unavailable');
          setMessage(COPY.unavailable);
          resolve(null);
          return;
        }
        setStatus('locating');
        setMessage(null);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const point = {
              lat: Number(position.coords.latitude.toFixed(4)),
              lng: Number(position.coords.longitude.toFixed(4)),
            };
            setCoords(point);
            setStatus('ready');
            resolve(point);
          },
          (error) => {
            const next: LocationStatus =
              error.code === error.PERMISSION_DENIED
                ? 'denied'
                : error.code === error.TIMEOUT
                  ? 'timeout'
                  : 'unavailable';
            setStatus(next);
            setMessage(COPY[next as keyof typeof COPY] ?? COPY.error);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
        );
      }),
    [],
  );

  return { status, coords, message, request };
}
