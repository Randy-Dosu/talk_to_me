/**
 * Mental-health service points in Ghana.
 *
 * Coordinates are approximate town-centre positions for the facility, good
 * enough to rank by distance (a few hundred metres of error does not change
 * which hospital is closest). They are **not** turn-by-turn navigation.
 *
 * Phone numbers are only included where the number could be checked against a
 * public source. For the rest, the free 24/7 Mental Health Authority line is the
 * honest route: it can confirm whether a psychiatrist is on duty today.
 */

export type Region =
  | 'Greater Accra'
  | 'Ashanti'
  | 'Central'
  | 'Western'
  | 'Eastern'
  | 'Volta'
  | 'Northern'
  | 'Upper East'
  | 'Upper West'
  | 'Bono'
  | 'Bono East'
  | 'Ahafo'
  | 'Oti'
  | 'Savannah'
  | 'North East'
  | 'Western North';

export type Service = 'outpatient' | 'inpatient' | 'psychiatry' | 'psychology' | 'emergency';

export interface Facility {
  id: string;
  name: string;
  town: string;
  region: Region;
  lat: number;
  lng: number;
  services: Service[];
  phone?: string;
  /** tel: target, digits only where possible. */
  tel?: string;
  note?: string;
}

export const FACILITIES: Facility[] = [
  {
    id: 'aph',
    name: 'Accra Psychiatric Hospital',
    town: 'Accra',
    region: 'Greater Accra',
    lat: 5.5508,
    lng: -0.212,
    services: ['outpatient', 'inpatient', 'psychiatry', 'psychology', 'emergency'],
    phone: '0302 228 688',
    tel: '0302228688',
    note: 'Ghana’s oldest psychiatric hospital. Walk-in outpatient clinic on weekdays.',
  },
  {
    id: 'pantang',
    name: 'Pantang Hospital',
    town: 'Pantang, Accra',
    region: 'Greater Accra',
    lat: 5.674,
    lng: -0.173,
    services: ['outpatient', 'inpatient', 'psychiatry'],
    note: 'Psychiatric hospital north-east of Accra. Confirm visiting and admission rules first.',
  },
  {
    id: 'korlebu',
    name: 'Korle Bu Teaching Hospital — Psychiatry',
    town: 'Accra',
    region: 'Greater Accra',
    lat: 5.536,
    lng: -0.226,
    services: ['outpatient', 'inpatient', 'psychiatry', 'psychology', 'emergency'],
    phone: '+233 302 674 065',
    tel: '+233302674065',
    note: 'Teaching-hospital psychiatric department with emergency cover.',
  },
  {
    id: 'ridge',
    name: 'Ridge Hospital — Psychiatric Unit',
    town: 'Accra',
    region: 'Greater Accra',
    lat: 5.562,
    lng: -0.205,
    services: ['outpatient', 'psychiatry'],
    note: 'Central Accra. Ask for the psychiatric unit at reception.',
  },
  {
    id: '37',
    name: '37 Military Hospital — Psychiatry',
    town: 'Accra',
    region: 'Greater Accra',
    lat: 5.584,
    lng: -0.195,
    services: ['outpatient', 'inpatient', 'psychiatry', 'emergency'],
    note: 'Open to civilians for psychiatric outpatient care.',
  },
  {
    id: 'tema',
    name: 'Tema General Hospital',
    town: 'Tema',
    region: 'Greater Accra',
    lat: 5.666,
    lng: -0.018,
    services: ['outpatient', 'psychiatry', 'emergency'],
    note: 'Psychiatric outpatient clinic; emergency department open 24 hours.',
  },
  {
    id: 'ankafu',
    name: 'Ankaful Psychiatric Hospital',
    town: 'Ankaful, Cape Coast',
    region: 'Central',
    lat: 5.098,
    lng: -1.253,
    services: ['outpatient', 'inpatient', 'psychiatry', 'psychology'],
    note: 'One of the three national psychiatric hospitals, serving the central belt.',
  },
  {
    id: 'ccth',
    name: 'Cape Coast Teaching Hospital — Psychiatry',
    town: 'Cape Coast',
    region: 'Central',
    lat: 5.136,
    lng: -1.289,
    services: ['outpatient', 'inpatient', 'psychiatry', 'emergency'],
    note: 'Teaching-hospital psychiatric unit and emergency department.',
  },
  {
    id: 'kath',
    name: 'Komfo Anokye Teaching Hospital — Psychiatry',
    town: 'Kumasi',
    region: 'Ashanti',
    lat: 6.697,
    lng: -1.623,
    services: ['outpatient', 'inpatient', 'psychiatry', 'psychology', 'emergency'],
    phone: '032 202 2987',
    tel: '0322022987',
    note: 'The main psychiatric service for the Ashanti region.',
  },
  {
    id: 'tth',
    name: 'Tamale Teaching Hospital — Psychiatry',
    town: 'Tamale',
    region: 'Northern',
    lat: 9.404,
    lng: -0.834,
    services: ['outpatient', 'inpatient', 'psychiatry', 'emergency'],
    note: 'Referral hospital for the northern regions.',
  },
  {
    id: 'ho',
    name: 'Ho Teaching Hospital — Psychiatry',
    town: 'Ho',
    region: 'Volta',
    lat: 6.594,
    lng: 0.464,
    services: ['outpatient', 'inpatient', 'psychiatry', 'emergency'],
    note: 'Psychiatric services for the Volta and Oti regions.',
  },
  {
    id: 'effia',
    name: 'Effia Nkwanta Regional Hospital',
    town: 'Takoradi',
    region: 'Western',
    lat: 4.925,
    lng: -1.765,
    services: ['outpatient', 'psychiatry', 'emergency'],
    note: 'Regional hospital with a psychiatric outpatient clinic.',
  },
  {
    id: 'sunyani',
    name: 'Sunyani Regional Hospital',
    town: 'Sunyani',
    region: 'Bono',
    lat: 7.335,
    lng: -2.33,
    services: ['outpatient', 'psychiatry', 'emergency'],
    note: 'Regional referral point for Bono and Ahafo.',
  },
  {
    id: 'koforidua',
    name: 'Koforidua Regional Hospital',
    town: 'Koforidua',
    region: 'Eastern',
    lat: 6.09,
    lng: -0.262,
    services: ['outpatient', 'psychiatry', 'emergency'],
    note: 'Psychiatric outpatient services for the Eastern region.',
  },
  {
    id: 'bolga',
    name: 'Bolgatanga Regional Hospital',
    town: 'Bolgatanga',
    region: 'Upper East',
    lat: 10.79,
    lng: -0.855,
    services: ['outpatient', 'psychiatry', 'emergency'],
    note: 'Upper East referral hospital; psychiatric cover may be part-time.',
  },
  {
    id: 'wa',
    name: 'Wa Regional Hospital',
    town: 'Wa',
    region: 'Upper West',
    lat: 10.055,
    lng: -2.505,
    services: ['outpatient', 'psychiatry', 'emergency'],
    note: 'Upper West referral hospital; call ahead for psychiatric clinic days.',
  },
  {
    id: 'techiman',
    name: 'Holy Family Hospital',
    town: 'Techiman',
    region: 'Bono East',
    lat: 7.59,
    lng: -1.938,
    services: ['outpatient', 'emergency'],
    note: 'Mission hospital; mental-health cover is limited — confirm before travelling.',
  },
];

/** Region centroids, used when someone prefers to pick a region instead of GPS. */
export const REGION_CENTROIDS: Record<Region, { lat: number; lng: number }> = {
  'Greater Accra': { lat: 5.6, lng: -0.19 },
  Ashanti: { lat: 6.69, lng: -1.62 },
  Central: { lat: 5.13, lng: -1.28 },
  Western: { lat: 4.93, lng: -1.76 },
  Eastern: { lat: 6.09, lng: -0.26 },
  Volta: { lat: 6.6, lng: 0.47 },
  Northern: { lat: 9.4, lng: -0.84 },
  'Upper East': { lat: 10.79, lng: -0.86 },
  'Upper West': { lat: 10.06, lng: -2.51 },
  Bono: { lat: 7.34, lng: -2.33 },
  'Bono East': { lat: 7.59, lng: -1.94 },
  Ahafo: { lat: 6.8, lng: -2.5 },
  Oti: { lat: 8.0, lng: 0.4 },
  Savannah: { lat: 9.1, lng: -1.8 },
  'North East': { lat: 10.5, lng: -0.4 },
  'Western North': { lat: 6.3, lng: -2.8 },
};

export const REGIONS = Object.keys(REGION_CENTROIDS) as Region[];

export const NEAREST_DISCLAIMER =
  'Straight-line distance from your approximate position, not travel time. Call before you travel — clinic days and psychiatric cover change.';

export const HELPLINE_TEL = '0800678678';
export const HELPLINE_TEXT = '0800 678 678';
