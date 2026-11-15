import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HELPLINE_NOTE, RESOURCES } from '@shared/data/resources';
import { COLORS, FONTS } from '../theme';
import NearestHelpCard from './NearestHelpCard';

export default function CrisisCardMobile({
  level = 'elevated',
  compact = false,
  onOpenSafety,
}: {
  level?: 'elevated' | 'urgent' | 'watch';
  compact?: boolean;
  onOpenSafety?: () => void;
}) {
  const urgent = level === 'urgent';
  const helplines = RESOURCES.filter((r) => r.kind !== 'ngo');

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: urgent ? 'rgba(168, 67, 63, 0.42)' : 'rgba(189, 90, 60, 0.36)',
          backgroundColor: urgent ? COLORS.roseSoft : COLORS.claySoft,
        },
      ]}
    >
      <View style={[styles.topAccent, { backgroundColor: urgent ? COLORS.rose : COLORS.clay }]} />
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: urgent ? 'rgba(168, 67, 63, 0.16)' : 'rgba(189, 90, 60, 0.16)',
              },
            ]}
          >
            <Feather
              name="heart"
              size={16}
              color={urgent ? COLORS.rose : COLORS.clay}
            />
          </View>
          <Text style={[styles.heading, { color: urgent ? COLORS.rose : COLORS.clay }]}>
            {urgent
              ? 'What you wrote matters. Please talk to a person now.'
              : 'This sounds heavy. You do not have to sit with it alone.'}
          </Text>
        </View>

        <Text style={styles.body}>
          {urgent
            ? 'Your entry contains language suggesting thoughts of ending your life or hurting yourself. That is a real emergency, not an overreaction — tap a number below to reach a real person right now.'
            : 'Some of what you wrote gets heavier in silence. A trained listener on the phone can hold this better than any app.'}
        </Text>

        <View style={styles.helplineList}>
          {helplines.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Call ${r.name} at ${r.contact}`}
              onPress={() => r.tel && void Linking.openURL(`tel:${r.tel}`)}
              style={styles.helplineRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.helplineKind}>{r.name}</Text>
                <Text style={styles.helplineNumber}>{r.contact}</Text>
                <Text style={styles.helplineHours}>{r.hours}</Text>
              </View>
              <View style={styles.dialBadge}>
                <Feather name="phone-call" size={15} color="#FDFAF4" />
                <Text style={styles.dialBadgeText}>Call</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <NearestHelpCard compact />

        {onOpenSafety && (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenSafety}
            style={styles.safetyPlanBtn}
          >
            <Feather name="shield" size={14} color="#FDFAF4" />
            <Text style={styles.safetyPlanBtnText}>Open my safety plan & coping tools</Text>
          </Pressable>
        )}

        {!compact && <Text style={styles.footNote}>{HELPLINE_NOTE}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topAccent: {
    height: 4,
    width: '100%',
  },
  inner: {
    padding: 15,
    gap: 11,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  heading: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkSoft,
  },
  helplineList: {
    gap: 8,
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  helplineKind: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.inkMuted,
    fontWeight: '700',
  },
  helplineNumber: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.forest,
    fontWeight: '600',
    marginTop: 2,
  },
  helplineHours: {
    fontSize: 11,
    color: COLORS.inkMuted,
    marginTop: 1,
  },
  dialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.forest,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dialBadgeText: {
    color: '#FDFAF4',
    fontSize: 12.5,
    fontWeight: '600',
  },
  safetyPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.forest,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  safetyPlanBtnText: {
    color: '#FDFAF4',
    fontSize: 13,
    fontWeight: '600',
  },
  footNote: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.inkMuted,
    borderTopWidth: 1,
    borderTopColor: 'rgba(22, 33, 29, 0.1)',
    paddingTop: 8,
  },
});
