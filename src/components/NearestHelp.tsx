import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Phone, Crosshair } from 'lucide-react';
import { useStore } from '../data/store';
import { formatKm, rankFacilities, regionForPoint, regionOrigin } from '../lib/geo';
import { useGeoLocation } from '../lib/useGeoLocation';
import { HELPLINE_TEXT, HELPLINE_TEL, NEAREST_DISCLAIMER, REGIONS, type Region } from '../data/facilities';

/**
 * Ranks the bundled facility list against a locally stored position. No maps,
 * no network, no third party — the coordinates never leave this device.
 */
export default function NearestHelp({ compact = false }: { compact?: boolean }) {
  const { state, updateSettings } = useStore();
  const saved = state.settings.location;
  const { status, message, request } = useGeoLocation();
  const [region, setRegion] = useState<Region | ''>('');

  const locate = async () => {
    const point = await request();
    if (!point) return;
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
  };

  const pickRegion = (value: Region) => {
    setRegion(value);
    const point = regionOrigin(value);
    updateSettings({
      location: {
        lat: point.lat,
        lng: point.lng,
        region: value,
        label: value,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const ranked = saved ? rankFacilities({ lat: saved.lat, lng: saved.lng }, compact ? 1 : 3) : [];
  const closest = ranked[0];

  return (
    <div className={compact ? '' : 'card p-5'}>
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-forest" />
        <p className={compact ? 'text-[0.74rem] font-medium text-ink' : 'text-[0.86rem] font-medium text-ink'}>
          Nearest mental-health service
        </p>
        {saved && (
          <span className="ml-auto text-[0.66rem] text-ink-muted">
            {saved.source === 'gps' ? `${saved.region ?? 'live'} · from your location` : saved.label}
          </span>
        )}
      </div>

      {!saved && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={locate}
            disabled={status === 'locating'}
            className="btn btn-ghost px-3 py-1.5 text-[0.78rem]"
          >
            <Crosshair size={13} /> {status === 'locating' ? 'Locating…' : 'Use my location'}
          </button>
          <label className="inline-flex items-center gap-1 text-[0.74rem] text-ink-muted">
            <span className="sr-only">Or pick your region</span>
            <select
              value={region}
              onChange={(event) => event.target.value && pickRegion(event.target.value as Region)}
              className="rounded-full border border-line bg-white/70 px-2.5 py-1.5 text-[0.76rem] text-ink-soft"
              aria-label="Or pick your region"
            >
              <option value="">or pick a region…</option>
              {REGIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {message && <p className="mt-2 text-[0.72rem] leading-snug text-[#6f5310]">{message}</p>}

      {saved && closest && (
        <ul className="mt-2 space-y-1.5">
          {ranked.map(({ facility, km }) => (
            <li key={facility.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white/70 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[0.82rem] font-medium text-ink">{facility.name}</p>
                <p className="text-[0.7rem] text-ink-muted">
                  {facility.town} · {formatKm(km)}
                </p>
                {!compact && <p className="mt-0.5 text-[0.7rem] leading-snug text-ink-soft">{facility.note}</p>}
              </div>
              <a
                href={`tel:${facility.tel ?? HELPLINE_TEL}`}
                className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-forest/25 bg-forest/8 px-2 py-1 text-[0.7rem] font-medium text-forest"
                aria-label={`Call ${facility.phone ?? HELPLINE_TEXT}`}
              >
                <Phone size={11} /> {facility.phone ?? 'Helpline'}
              </a>
            </li>
          ))}
        </ul>
      )}

      {saved && closest && !closest.facility.phone && (
        <p className="mt-1.5 text-[0.68rem] leading-snug text-ink-muted">
          No verified direct line for this one — call {HELPLINE_TEXT} and ask them to confirm the clinic day.
        </p>
      )}

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2">
          <p className="max-w-md text-[0.68rem] leading-relaxed text-ink-muted">{NEAREST_DISCLAIMER}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={locate}
              className="inline-flex items-center gap-1 text-[0.72rem] text-forest hover:underline"
            >
              <Navigation size={11} /> Update
            </button>
            {saved && (
              <button
                type="button"
                onClick={() => updateSettings({ location: null })}
                className="text-[0.72rem] text-ink-muted underline decoration-line underline-offset-2 hover:text-rose"
              >
                Forget
              </button>
            )}
            <Link to="/settings" className="text-[0.72rem] text-ink-muted underline decoration-line underline-offset-2 hover:text-forest">
              Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
