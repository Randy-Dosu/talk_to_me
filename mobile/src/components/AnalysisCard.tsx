import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Analysis } from '@shared/engine/types';
import { MOOD_BAND_COPY, RISK_LEVEL_COPY } from '@shared/engine/analyze';
import { BAND_STYLE, COLORS, EMOTION_COLORS, FONTS } from '../theme';
import { Eyebrow, MoodBadgePill, RiskBadgePill } from './Brand';

const CATEGORY_LABEL: Record<string, string> = {
  positive: 'positive language',
  negative: 'negative language',
  hopelessness: 'hopelessness',
  anxiety: 'anxiety',
  isolation: 'withdrawal',
  shame: 'shame / stigma',
  sleep: 'sleep',
  somatic: 'body symptoms',
  'self-harm': 'self-harm',
  'suicidal-ideation': 'risk language',
  negation: 'negation',
  intensifier: 'emphasis',
  support: 'support',
};

function distressHint(distress: number): string {
  if (distress >= 75) return 'High load';
  if (distress >= 50) return 'Notable load';
  if (distress >= 30) return 'Some load';
  return 'Light load';
}

export default function AnalysisCard({
  analysis,
  compact = false,
}: {
  analysis: Analysis;
  compact?: boolean;
}) {
  const [phrasesOpen, setPhrasesOpen] = useState(compact);
  const band = BAND_STYLE[analysis.moodBand];
  const emotions = analysis.emotions.slice(0, compact ? 3 : 4);
  const riskCopy = RISK_LEVEL_COPY[analysis.risk.level];

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Eyebrow>How this reads</Eyebrow>
          <View style={styles.bandRow}>
            <MoodBadgePill band={analysis.moodBand} />
            <Text style={styles.blurb}>{MOOD_BAND_COPY[analysis.moodBand].blurb}</Text>
          </View>
        </View>
        <RiskBadgePill level={analysis.risk.level} />
      </View>

      <View style={styles.meterGrid}>
        <View style={styles.meterBox}>
          <View style={styles.meterHead}>
            <Text style={styles.meterLabel}>MOOD SCORE</Text>
            <Text style={styles.meterVal}>{analysis.moodScore}</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(4, analysis.moodScore)}%`, backgroundColor: band.dot },
              ]}
            />
          </View>
          <Text style={styles.meterHint}>{band.label} · 0 heavy, 100 bright</Text>
        </View>

        <View style={styles.meterBox}>
          <View style={styles.meterHead}>
            <Text style={styles.meterLabel}>DISTRESS LOAD</Text>
            <Text style={styles.meterVal}>{analysis.distress}</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(4, analysis.distress)}%`,
                  backgroundColor:
                    analysis.distress >= 60
                      ? COLORS.rose
                      : analysis.distress >= 35
                        ? COLORS.clay
                        : COLORS.sage,
                },
              ]}
            />
          </View>
          <Text style={styles.meterHint}>{distressHint(analysis.distress)}</Text>
        </View>
      </View>

      {emotions.length > 0 && (
        <View style={styles.emotionSection}>
          <Text style={styles.meterLabel}>EMOTIONAL SIGNATURE</Text>
          {emotions.map((em) => {
            const meta = EMOTION_COLORS[em.label];
            return (
              <View key={em.label} style={styles.emotionRow}>
                <Text style={styles.emotionName}>{meta.label}</Text>
                <View style={[styles.track, { flex: 1, marginTop: 0 }]}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.max(6, em.score * 100)}%`, backgroundColor: meta.hex },
                    ]}
                  />
                </View>
                <Text style={styles.emotionPct}>{Math.round(em.score * 100)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {analysis.risk.level !== 'none' && analysis.risk.subject === 'other' && (
        <View style={styles.otherBox}>
          <Text style={styles.otherText}>
            This reads as being about someone else — your own risk tier stays clear. If they are in
            danger, tap to call{' '}
            <Text style={styles.telLink} onPress={() => void Linking.openURL('tel:112')}>
              112
            </Text>{' '}
            or{' '}
            <Text style={styles.telLink} onPress={() => void Linking.openURL('tel:0800678678')}>
              0800 678 678
            </Text>
            .
          </Text>
        </View>
      )}

      {analysis.risk.level !== 'none' && analysis.risk.subject !== 'other' && !compact && (
        <View style={styles.riskExplain}>
          <Text style={styles.riskExplainText}>
            <Text style={{ fontWeight: '700', color: COLORS.ink }}>{riskCopy.label}. </Text>
            {riskCopy.blurb}
          </Text>
        </View>
      )}

      {analysis.risk.suppressed && (
        <Text style={styles.suppressedNote}>
          Risk language was set aside because{' '}
          {analysis.risk.suppressedBy ?? 'the context was protective or figurative'}.
        </Text>
      )}

      <View style={styles.metaFooter}>
        <Text style={styles.metaChip}>confidence {Math.round(analysis.confidence * 100)}%</Text>
        <Text style={styles.metaChip}>
          {analysis.language.support === 'english-with-ghanaian-markers'
            ? `Ghanaian markers: ${analysis.language.markers.slice(0, 3).join(', ')}`
            : analysis.language.support === 'limited-coverage'
              ? 'limited vocabulary coverage'
              : 'standard English'}
        </Text>
        <Text style={styles.metaChip}>{analysis.wordCount} words</Text>
      </View>

      <Pressable
        onPress={() => setPhrasesOpen((v) => !v)}
        style={styles.whyToggle}
        accessibilityRole="button"
      >
        <Text style={styles.whyToggleText}>Why it read it that way</Text>
        <Feather name={phrasesOpen ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.forest} />
      </Pressable>

      {phrasesOpen && (
        <View style={styles.signalList}>
          {analysis.signals.length === 0 ? (
            <Text style={styles.signalEmpty}>
              Nothing in the lexicon matched strongly. Neutral entries are normal.
            </Text>
          ) : (
            analysis.signals.map((sig, idx) => (
              <View key={`${sig.phrase}-${idx}`} style={styles.signalRow}>
                <View
                  style={[
                    styles.signalDot,
                    { backgroundColor: sig.weight < 0 ? COLORS.clay : COLORS.sage },
                  ]}
                />
                <Text style={styles.signalText}>
                  <Text style={styles.signalQuote}>“{sig.phrase}”</Text> —{' '}
                  {CATEGORY_LABEL[sig.category] ?? sig.category}
                  {sig.note ? `, ${sig.note}` : ''}
                </Text>
              </View>
            ))
          )}
          <Text style={styles.auditFoot}>
            Lexicon {analysis.version} · deterministic on-device rules. A reading, never a diagnosis
            — you are the authority on your own mood.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  bandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  blurb: {
    fontSize: 12.5,
    color: COLORS.inkMuted,
    flexShrink: 1,
  },
  meterGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  meterBox: {
    flex: 1,
  },
  meterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  meterLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: COLORS.inkMuted,
    fontWeight: '700',
  },
  meterVal: {
    fontFamily: FONTS.display,
    fontSize: 17,
    color: COLORS.ink,
    fontWeight: '600',
  },
  track: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(22, 33, 29, 0.08)',
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  meterHint: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
    marginTop: 4,
  },
  emotionSection: {
    gap: 7,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionName: {
    width: 72,
    fontSize: 12.5,
    color: COLORS.inkSoft,
  },
  emotionPct: {
    width: 28,
    textAlign: 'right',
    fontSize: 11.5,
    color: COLORS.inkMuted,
  },
  otherBox: {
    backgroundColor: COLORS.goldSoft,
    borderColor: 'rgba(207, 154, 53, 0.4)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  otherText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.goldText,
  },
  telLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  riskExplain: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 10,
  },
  riskExplainText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.inkSoft,
  },
  suppressedNote: {
    fontSize: 11.5,
    lineHeight: 17,
    color: COLORS.inkMuted,
  },
  metaFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 10,
  },
  metaChip: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  whyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  whyToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.forest,
  },
  signalList: {
    backgroundColor: COLORS.paperDeep,
    borderRadius: 14,
    padding: 11,
    gap: 6,
  },
  signalEmpty: {
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  signalText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.inkSoft,
  },
  signalQuote: {
    fontStyle: 'italic',
    color: COLORS.ink,
    fontWeight: '500',
  },
  auditFoot: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 7,
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.inkMuted,
  },
});
