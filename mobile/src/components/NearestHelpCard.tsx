import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  HELPLINE_TEL,
  HELPLINE_TEXT,
  NEAREST_DISCLAIMER,
  REGIONS,
  type Region,
} from '@shared/data/facilities';
import { formatKm, rankFacilities } from '@shared/lib/geo';
import { useMobileLocation } from '../lib/useMobileLocation';
import { COLORS, FONTS } from '../theme';
import { Eyebrow } from './Brand';

export default function NearestHelpCard({ compact = false }: { compact?: boolean }) {
  const { location, locating, message, detect, setManualRegion } = useMobileLocation();
  const [showPicker, setShowPicker] = useState(false);

  const ranked = location
    ? rankFacilities({ lat: location.lat, lng: location.lng }, compact ? 2 : 4)
    : [];

  return (
    <View style={[styles.box, compact && { padding: 12 }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Nearest psychiatric care</Eyebrow>
          <Text style={styles.subText}>
            {location
              ? `Ranked from ${location.label} · coordinates stay on this phone`
              : 'Find clinics closest to you across all 16 regions'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void detect()}
          style={styles.gpsBtn}
        >
          <Feather name="navigation" size={13} color={COLORS.forest} />
          <Text style={styles.gpsBtnText}>{locating ? 'Locating…' : 'Use GPS'}</Text>
        </Pressable>
      </View>

      {message && <Text style={styles.warnText}>{message}</Text>}

      {!location || showPicker ? (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.pickHint}>Or tap your region:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionChips}
          >
            {REGIONS.map((r: Region) => {
              const active = location?.region === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setManualRegion(r);
                    setShowPicker(false);
                  }}
                  style={[styles.regionChip, active && styles.regionChipActive]}
                >
                  <Text style={[styles.regionChipText, active && styles.regionChipTextActive]}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <Pressable onPress={() => setShowPicker(true)} style={{ alignSelf: 'flex-start' }}>
          <Text style={styles.changeRegion}>Change region ({location.region ?? location.label})</Text>
        </Pressable>
      )}

      {ranked.length > 0 && (
        <View style={styles.facilityList}>
          {ranked.map(({ facility, km }) => (
            <View key={facility.id} style={styles.facilityCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.facilityTitleRow}>
                  <Text style={styles.facilityName}>{facility.name}</Text>
                  <Text style={styles.kmBadge}>{formatKm(km)}</Text>
                </View>
                <Text style={styles.facilityMeta}>
                  {facility.town} · {facility.region}
                </Text>
                {!compact && facility.note && (
                  <Text style={styles.facilityNote}>{facility.note}</Text>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void Linking.openURL(`tel:${facility.tel ?? HELPLINE_TEL}`)}
                style={styles.callChip}
              >
                <Feather name="phone" size={13} color={COLORS.forest} />
                <Text style={styles.callChipText}>
                  {facility.phone ?? `MHA ${HELPLINE_TEXT}`}
                </Text>
              </Pressable>
            </View>
          ))}
          {!compact && <Text style={styles.disclaimer}>{NEAREST_DISCLAIMER}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  subText: {
    fontSize: 12,
    color: COLORS.inkMuted,
    marginTop: 3,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.forest,
  },
  warnText: {
    fontSize: 11.5,
    color: COLORS.goldText,
  },
  pickHint: {
    fontSize: 11.5,
    color: COLORS.inkMuted,
    marginBottom: 6,
  },
  regionChips: {
    gap: 6,
    paddingVertical: 2,
  },
  regionChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
  },
  regionChipActive: {
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  regionChipText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  regionChipTextActive: {
    color: COLORS.forest,
    fontWeight: '600',
  },
  changeRegion: {
    fontSize: 11.5,
    color: COLORS.forest,
    textDecorationLine: 'underline',
  },
  facilityList: {
    marginTop: 4,
    gap: 8,
  },
  facilityCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 11,
    gap: 8,
  },
  facilityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  facilityName: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  kmBadge: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  facilityMeta: {
    fontSize: 11.5,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  facilityNote: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.inkSoft,
    marginTop: 4,
  },
  callChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  callChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.forest,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
});
