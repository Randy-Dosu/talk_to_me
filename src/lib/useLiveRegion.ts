import { useCallback, useEffect } from 'react';
import { useStore } from '../data/store';
import { regionForPoint } from './geo';
import { useGeoLocation } from './useGeoLocation';

const TRIED_KEY = 'nkommo.geo.tried';

/**
 * Turns the device position into a region, once, and keeps it on the device.
 *
 * The coordinate is used for two things only: ranking the bundled facility
 * list, and labelling the region shown on signup, settings and the safety page.
 * Nothing is uploaded — there is no server to upload it to.
 */
export function useLiveRegion(auto = false) {
  const { state, updateSettings } = useStore();
  const { status, message, request } = useGeoLocation();
  const saved = state.settings.location;

  const detect = useCallback(async () => {
    const point = await request();
    if (!point) return null;
    updateSettings({
      location: {
        lat: point.lat,
        lng: point.lng,
        region: regionForPoint(point),
        label: 'your approximate position',
        source: 'gps',
        updatedAt: new Date().toISOString(),
      },
    });
    return point;
  }, [request, updateSettings]);

  useEffect(() => {
    if (!auto || saved) return;
    try {
      if (window.sessionStorage.getItem(TRIED_KEY)) return;
      window.sessionStorage.setItem(TRIED_KEY, '1');
    } catch {
      // private mode: fall through and ask once per mount
    }
    void detect();
  }, [auto, saved, detect]);

  return {
    saved,
    region: saved?.region ?? null,
    detect,
    status,
    message,
    locating: status === 'locating',
  };
}
