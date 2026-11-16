import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SCALES, bandFor, severityPercent } from '@shared/engine/checkins';
import { formatDay } from '@shared/engine/id';
import type { CheckIn as CheckInType, ScaleId } from '@shared/engine/types';
import {
  Eyebrow,
  GhostButton,
  PrimaryButton,
} from '../components/Brand';
import CrisisCardMobile from '../components/CrisisCardMobile';
import { notifySuccess, tapSoft } from '../lib/haptics';
import { useMobileStore } from '../lib/mobileStore';
import { type AppTab, COLORS, FONTS } from '../theme';

export default function CheckInScreen({
  onNavigate,
}: {
  onNavigate: (tab: AppTab) => void;
}) {
  const { state, addCheckIn } = useMobileStore();
  const [scale, setScale] = useState<ScaleId>('PHQ9');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<CheckInType | null>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const def = SCALES[scale];
  const answeredCount = Object.keys(answers).length;
  const complete = answeredCount === def.items.length;

  const previous = useMemo(
    () =>
      [...state.checkins]
        .filter((c) => c.scale === scale)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    [state.checkins, scale],
  );

  const history = useMemo(
    () =>
      [...state.checkins]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [state.checkins],
  );

  const reset = (nextScale?: ScaleId) => {
    setAnswers({});
    setResult(null);
    if (nextScale) setScale(nextScale);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const submit = () => {
    const ordered = def.items.map((_, idx) => answers[idx] ?? 0);
    const saved = addCheckIn(scale, ordered);
    notifySuccess();
    setResult(saved);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (result) {
    const band = bandFor(def, result.score);
    const delta = previous ? result.score - previous.score : null;

    return (
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <Eyebrow>{`Check-in saved · ${formatDay(result.createdAt)}`}</Eyebrow>
        <Text style={styles.title}>
          {def.name}: {result.score} / {result.maxScore} — {band.label}
        </Text>

        <View style={styles.resultCard}>
          <View style={styles.meterEnds}>
            <Text style={styles.endLabel}>0</Text>
            <Text style={styles.endLabel}>{result.maxScore}</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(4, severityPercent(result))}%`,
                  backgroundColor: result.safetyFlag
                    ? COLORS.rose
                    : result.score >= 10
                      ? COLORS.clay
                      : COLORS.sage,
                },
              ]}
            />
          </View>

          <View style={styles.bandPills}>
            {def.bands.map((b) => {
              const active = b.label === band.label;
              return (
                <View
                  key={b.label}
                  style={[styles.bandTag, active && styles.bandTagActive]}
                >
                  <Text style={[styles.bandTagText, active && styles.bandTagTextActive]}>
                    {b.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.adviceText}>{band.advice}</Text>

          {previous && delta !== null && previous.id !== result.id && (
            <Text style={styles.deltaNote}>
              {delta === 0
                ? `Unchanged since ${formatDay(previous.createdAt)}.`
                : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} points since ${formatDay(previous.createdAt)} (${previous.score}).`}
            </Text>
          )}

          <Text style={styles.disclaimer}>
            A screening score is not a clinical diagnosis — it is a structured two-week snapshot
            you can track for yourself or bring to a health worker.
          </Text>
        </View>

        {result.safetyFlag && (
          <CrisisCardMobile level="urgent" onOpenSafety={() => onNavigate('safety')} />
        )}

        {!result.safetyFlag && result.score >= 10 && (
          <Pressable
            onPress={() => onNavigate('safety')}
            style={styles.clinicalCallout}
          >
            <Feather name="alert-circle" size={16} color={COLORS.clay} />
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicalTitle}>
                Guidelines suggest speaking with a clinician at this level
              </Text>
              <Text style={styles.clinicalBody}>
                Tap to see free Ghana helplines and psychiatric clinics near your region →
              </Text>
            </View>
          </Pressable>
        )}

        <View style={styles.btnRow}>
          <PrimaryButton label="Take again" onPress={() => reset()} style={{ flex: 1 }} />
          <GhostButton
            label={`Try ${scale === 'PHQ9' ? 'GAD-7' : 'PHQ-9'}`}
            onPress={() => reset(scale === 'PHQ9' ? 'GAD7' : 'PHQ9')}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Clinical screening · Public domain</Eyebrow>
          <Text style={styles.title}>{def.fullName}</Text>
        </View>
      </View>

      {/* Scale switcher */}
      <View style={styles.scaleSwitch}>
        {(['PHQ9', 'GAD7'] as const).map((id) => {
          const active = scale === id;
          return (
            <Pressable
              key={id}
              onPress={() => reset(id)}
              style={[styles.scaleTab, active && styles.scaleTabActive]}
            >
              <Text style={[styles.scaleTabText, active && styles.scaleTabTextActive]}>
                {id === 'PHQ9' ? 'PHQ-9 · Mood (9)' : 'GAD-7 · Anxiety (7)'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.progressBarWrap}>
        <View style={styles.progressHead}>
          <Text style={styles.lookback}>{def.lookback}</Text>
          <Text style={styles.progressCount}>
            {answeredCount}/{def.items.length}
          </Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${(answeredCount / def.items.length) * 100}%`,
                backgroundColor: COLORS.forest,
              },
            ]}
          />
        </View>
      </View>

      {/* Questions */}
      {def.items.map((item, index) => {
        const chosen = answers[index];
        return (
          <View
            key={item.id}
            style={[styles.itemCard, item.safety && styles.itemCardSafety]}
          >
            <Text style={styles.qIndex}>
              Question {index + 1} of {def.items.length}
              {item.safety ? ' · Safety check' : ''}
            </Text>
            <Text style={styles.qText}>{item.text}</Text>
            {item.helper && <Text style={styles.qHelper}>{item.helper}</Text>}

            <View style={styles.optionsGrid}>
              {def.options.map((opt) => {
                const selected = chosen === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      tapSoft();
                      setAnswers((prev) => ({ ...prev, [index]: opt.value }));
                    }}
                    style={[styles.optBtn, selected && styles.optBtnSelected]}
                  >
                    <Text style={[styles.optLabel, selected && styles.optLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optSub, selected && styles.optSubSelected]}>
                      {opt.helper}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <PrimaryButton
        label={
          complete
            ? `Save ${def.name} check-in`
            : `Answer ${def.items.length - answeredCount} more to finish`
        }
        disabled={!complete}
        onPress={submit}
      />

      <Text style={styles.sourceCite}>Source: {def.source}</Text>

      {history.length > 0 && (
        <View style={styles.historyCard}>
          <Eyebrow>Recent check-ins on this phone</Eyebrow>
          {history.map((c) => (
            <View key={c.id} style={styles.historyRow}>
              <Text style={styles.historyScale}>{c.scale}</Text>
              <Text style={styles.historyBand}>
                {c.score}/{c.maxScore} · {c.band}
              </Text>
              <Text style={styles.historyDate}>{formatDay(c.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 34,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 4,
  },
  scaleSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 3,
  },
  scaleTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  scaleTabActive: {
    backgroundColor: COLORS.forest,
  },
  scaleTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  scaleTabTextActive: {
    color: '#FDFAF4',
  },
  progressBarWrap: {
    gap: 6,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  lookback: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.inkSoft,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.forest,
  },
  track: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(22,33,29,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 7,
  },
  itemCardSafety: {
    borderColor: 'rgba(189, 90, 60, 0.4)',
  },
  qIndex: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.inkMuted,
    fontWeight: '700',
  },
  qText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.ink,
    fontWeight: '500',
  },
  qHelper: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.inkMuted,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 4,
  },
  optBtn: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  optBtnSelected: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  optLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  optLabelSelected: {
    color: '#FDFAF4',
  },
  optSub: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
    marginTop: 1,
  },
  optSubSelected: {
    color: 'rgba(253, 250, 244, 0.78)',
  },
  sourceCite: {
    fontSize: 11,
    color: COLORS.inkMuted,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    gap: 10,
  },
  meterEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endLabel: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  bandPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bandTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  bandTagActive: {
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  bandTagText: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  bandTagTextActive: {
    color: COLORS.forest,
    fontWeight: '700',
  },
  adviceText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkSoft,
  },
  deltaNote: {
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  disclaimer: {
    fontSize: 11.5,
    lineHeight: 17,
    color: COLORS.inkMuted,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 9,
  },
  clinicalCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.claySoft,
    borderColor: 'rgba(189, 90, 60, 0.36)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  clinicalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.clay,
  },
  clinicalBody: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 9,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperDeep,
  },
  historyScale: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.forest,
    width: 60,
  },
  historyBand: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.inkSoft,
  },
  historyDate: {
    fontSize: 11.5,
    color: COLORS.inkMuted,
  },
});
