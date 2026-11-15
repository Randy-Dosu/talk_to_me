import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  bandSummary,
  buildSeries,
  concernScore,
  detectPatterns,
  emotionDistribution,
  streak,
  trendHeadline,
  weeklyAverages,
  type Pattern,
} from '@shared/engine/trends';
import type { EmotionLabel } from '@shared/engine/types';
import { Eyebrow, PrimaryButton } from '../components/Brand';
import MoodSparkChart from '../components/MoodSparkChart';
import { useMobileStore } from '../lib/mobileStore';
import { type AppTab, COLORS, EMOTION_COLORS, FONTS } from '../theme';

const TONE_BADGE: Record<
  Pattern['tone'],
  { bg: string; border: string; dot: string; label: string }
> = {
  concern: {
    bg: COLORS.roseSoft,
    border: 'rgba(168, 67, 63, 0.34)',
    dot: COLORS.rose,
    label: 'Concern',
  },
  notice: {
    bg: COLORS.goldSoft,
    border: 'rgba(207, 154, 53, 0.36)',
    dot: COLORS.gold,
    label: 'Notice',
  },
  info: {
    bg: COLORS.surface,
    border: COLORS.line,
    dot: COLORS.sky,
    label: 'Context',
  },
  good: {
    bg: COLORS.sageSoft,
    border: 'rgba(111, 143, 116, 0.34)',
    dot: COLORS.sage,
    label: 'Working',
  },
};

function actionTarget(action?: string): AppTab {
  if (!action) return 'journal';
  if (action.includes('PHQ-9')) return 'checkin';
  if (action.includes('person')) return 'more';
  if (action.includes('line')) return 'journal';
  return 'safety';
}

export default function PatternsScreen({
  onNavigate,
}: {
  onNavigate: (tab: AppTab) => void;
}) {
  const { state } = useMobileStore();
  const [windowDays, setWindowDays] = useState<14 | 30>(14);

  const entries = state.entries;
  const points = useMemo(
    () => buildSeries(entries, state.checkins, windowDays),
    [entries, state.checkins, windowDays],
  );
  const patterns = useMemo(
    () => detectPatterns(entries, state.checkins),
    [entries, state.checkins],
  );
  const week = useMemo(() => weeklyAverages(entries), [entries]);
  const emotions = useMemo(
    () => emotionDistribution(entries.slice(0, 40)).slice(0, 6),
    [entries],
  );
  const summary = bandSummary(points);
  const concerns = concernScore(patterns);
  const readingDays = points.filter((p) => p.mood !== null).length;
  const riskyDays = points.filter(
    (p) => p.risk === 'urgent' || p.risk === 'elevated',
  ).length;
  const eligibleAlert = concerns >= 3 && Boolean(state.settings.trusted?.enabled);

  if (entries.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyWrap}>
        <Eyebrow>Patterns</Eyebrow>
        <Text style={styles.title}>The pattern needs a little history.</Text>
        <Text style={styles.subtitle}>
          Write two or three journal entries across the week and this screen maps direction
          of travel, sleep, withdrawal, and check-in changes automatically on your phone.
        </Text>
        <View style={styles.emptyCard}>
          <Feather name="trending-up" size={24} color={COLORS.forest} />
          <Text style={styles.emptyCardTitle}>No entries yet</Text>
          <Text style={styles.emptyCardBody}>
            Even a single line counts. Everything stays local on this device.
          </Text>
          <PrimaryButton
            label="Write your first entry"
            onPress={() => onNavigate('journal')}
          />
        </View>
      </ScrollView>
    );
  }

  const maxEmotionVal = emotions[0]?.value || 1;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{`Patterns · Last ${windowDays} days`}</Eyebrow>
          <Text style={styles.title}>{trendHeadline(entries)}</Text>
          <Text style={styles.subtitle}>
            {summary.label} across {readingDays} {readingDays === 1 ? 'day' : 'days'}.{' '}
            {riskyDays > 0
              ? `${riskyDays} ${riskyDays === 1 ? 'day' : 'days'} carried risk language.`
              : 'No risk language in this window.'}
          </Text>
        </View>
        <View style={styles.windowToggle}>
          {([14, 30] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => setWindowDays(d)}
              style={[styles.winBtn, windowDays === d && styles.winBtnActive]}
            >
              <Text
                style={[
                  styles.winBtnText,
                  windowDays === d && styles.winBtnTextActive,
                ]}
              >
                {d}d
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Stat tiles */}
      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>THIS WEEK</Text>
          <Text style={styles.statVal}>
            {week.thisWeek ?? '—'}
            <Text style={styles.statSuffix}>/100</Text>
          </Text>
          <Text style={styles.statHint}>
            {week.delta === null
              ? `${week.thisCount} entries`
              : `${week.delta >= 0 ? '+' : ''}${week.delta} vs last week`}
          </Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>STREAK</Text>
          <Text style={styles.statVal}>
            {streak(entries)}
            <Text style={styles.statSuffix}> days</Text>
          </Text>
          <Text style={styles.statHint}>consecutive days</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>CHECK-INS</Text>
          <Text style={styles.statVal}>{state.checkins.length}</Text>
          <Text style={styles.statHint}>
            {state.checkins[0]
              ? `latest ${state.checkins[0].scale} ${state.checkins[0].score}/${state.checkins[0].maxScore}`
              : 'none yet'}
          </Text>
        </View>
      </View>

      {/* SVG Mood Chart */}
      <MoodSparkChart points={points} />

      {eligibleAlert && (
        <Pressable
          onPress={() => onNavigate('more')}
          style={styles.trustedBanner}
        >
          <Feather name="bell" size={16} color={COLORS.clay} />
          <View style={{ flex: 1 }}>
            <Text style={styles.trustedBannerTitle}>
              Sustained pattern meets your Trusted Circle threshold ({concerns}/3)
            </Text>
            <Text style={styles.trustedBannerBody}>
              Tap to review a check-in message draft for {state.settings.trusted?.name}. Nothing is ever sent automatically.
            </Text>
          </View>
        </Pressable>
      )}

      {/* Detected patterns */}
      <View style={styles.sectionBlock}>
        <Eyebrow>What stands out</Eyebrow>
        {patterns.length === 0 ? (
          <View style={styles.calmCard}>
            <Text style={styles.calmText}>
              No sustained warning patterns right now. Keep writing honestly — trends become
              clearer over a full two weeks.
            </Text>
          </View>
        ) : (
          patterns.map((p) => {
            const b = TONE_BADGE[p.tone];
            return (
              <View
                key={p.id}
                style={[
                  styles.patternCard,
                  { backgroundColor: b.bg, borderColor: b.border },
                ]}
              >
                <View style={styles.patternHead}>
                  <View style={[styles.patternDot, { backgroundColor: b.dot }]} />
                  <Text style={styles.patternBadgeText}>{b.label}</Text>
                </View>
                <Text style={styles.patternTitle}>{p.title}</Text>
                <Text style={styles.patternDetail}>{p.detail}</Text>
                <View style={styles.evidenceRow}>
                  {p.evidence.map((ev, i) => (
                    <View key={`${ev}-${i}`} style={styles.evPill}>
                      <Text style={styles.evText}>{ev}</Text>
                    </View>
                  ))}
                </View>
                {p.action && (
                  <Pressable
                    onPress={() => onNavigate(actionTarget(p.action))}
                    style={styles.patternActionBtn}
                  >
                    <Text style={styles.patternActionText}>{p.action} →</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Emotional distribution */}
      {emotions.length > 0 && (
        <View style={styles.emotionCard}>
          <Eyebrow>Recurring feelings</Eyebrow>
          {emotions.map((item) => {
            const meta = EMOTION_COLORS[item.label as EmotionLabel];
            const pct = Math.max(6, Math.round((item.value / maxEmotionVal) * 100));
            return (
              <View key={item.label} style={styles.emotionBarRow}>
                <Text style={styles.emotionLabel}>{meta?.label ?? item.label}</Text>
                <View style={styles.emotionTrack}>
                  <View
                    style={[
                      styles.emotionFill,
                      { width: `${pct}%`, backgroundColor: meta?.hex ?? COLORS.forest },
                    ]}
                  />
                </View>
                <Text style={styles.emotionVal}>{item.value.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  emptyWrap: {
    padding: 20,
    gap: 12,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkMuted,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 22,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyCardTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.ink,
  },
  emptyCardBody: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkMuted,
    textAlign: 'center',
  },
  windowToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 3,
  },
  winBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  winBtnActive: {
    backgroundColor: COLORS.forest,
  },
  winBtnText: {
    fontSize: 12,
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  winBtnTextActive: {
    color: '#FDFAF4',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    gap: 2,
  },
  statLabel: {
    fontSize: 9.5,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: COLORS.inkMuted,
  },
  statVal: {
    fontFamily: FONTS.display,
    fontSize: 21,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 2,
  },
  statSuffix: {
    fontSize: 12,
    color: COLORS.inkMuted,
    fontWeight: '400',
  },
  statHint: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
  },
  trustedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.claySoft,
    borderColor: 'rgba(189, 90, 60, 0.4)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
  },
  trustedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.clay,
  },
  trustedBannerBody: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  sectionBlock: {
    gap: 10,
  },
  calmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  calmText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkSoft,
  },
  patternCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  patternHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patternDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  patternBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.inkMuted,
  },
  patternTitle: {
    fontFamily: FONTS.display,
    fontSize: 16.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  patternDetail: {
    fontSize: 12.8,
    lineHeight: 18.5,
    color: COLORS.inkSoft,
  },
  evidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  evPill: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  evText: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
  },
  patternActionBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  patternActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.forest,
  },
  emotionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 9,
  },
  emotionBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionLabel: {
    width: 78,
    fontSize: 12.5,
    color: COLORS.inkSoft,
  },
  emotionTrack: {
    flex: 1,
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(22,33,29,0.08)',
    overflow: 'hidden',
  },
  emotionFill: {
    height: '100%',
    borderRadius: 99,
  },
  emotionVal: {
    width: 32,
    textAlign: 'right',
    fontSize: 11.5,
    color: COLORS.inkMuted,
  },
});
