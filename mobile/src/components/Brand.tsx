import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { MoodBand, RiskLevel } from '@shared/engine/types';
import { BAND_STYLE, COLORS, FONTS, RISK_STYLE } from '../theme';

export function AdinkraMark({
  size = 32,
  tone = 'forest',
}: {
  size?: number;
  tone?: 'forest' | 'paper';
}) {
  const stroke = tone === 'forest' ? COLORS.forest : COLORS.paper;
  const accent = tone === 'forest' ? COLORS.clay : COLORS.gold;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx="20" cy="20" r="18.5" stroke={stroke} strokeOpacity={0.28} strokeWidth={1.2} />
      <Path
        d="M20 6.5c4.6 6.2 4.6 10.6 0 14.6-4.6-4-4.6-8.4 0-14.6Z"
        stroke={stroke}
        strokeWidth={1.5}
      />
      <Path
        d="M20 33.5c-4.6-6.2-4.6-10.6 0-14.6 4.6 4 4.6 8.4 0 14.6Z"
        stroke={stroke}
        strokeWidth={1.5}
      />
      <Path
        d="M6.5 20c6.2-4.6 10.6-4.6 14.6 0-4 4.6-8.4 4.6-14.6 0Z"
        stroke={stroke}
        strokeWidth={1.5}
      />
      <Path
        d="M33.5 20c-6.2 4.6-10.6 4.6-14.6 0 4-4.6 8.4-4.6 14.6 0Z"
        stroke={stroke}
        strokeWidth={1.5}
      />
      <Circle cx="20" cy="20" r="3.1" fill={accent} />
    </Svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.wordmarkRow}>
      <AdinkraMark size={compact ? 28 : 34} />
      <View>
        <Text style={[styles.wordmarkTitle, compact && { fontSize: 19 }]}>nkommo</Text>
        {!compact && <Text style={styles.wordmarkSub}>TALK TO ME</Text>}
      </View>
    </View>
  );
}

export function KenteStrip() {
  const segments = [
    { w: 22, c: COLORS.forest },
    { w: 12, c: COLORS.gold },
    { w: 10, c: COLORS.clay },
    { w: 14, c: COLORS.ink },
    { w: 8, c: COLORS.sage },
  ];
  const patternWidth = 66;
  const repeats = 8;
  return (
    <View style={styles.kenteContainer}>
      <Svg width="100%" height={4} viewBox={`0 0 ${patternWidth * repeats} 4`} preserveAspectRatio="none">
        {Array.from({ length: repeats }).map((_, r) => {
          let x = r * patternWidth;
          return segments.map((seg, i) => {
            const rx = x;
            x += seg.w;
            return <Rect key={`${r}-${i}`} x={rx} y={0} width={seg.w} height={4} fill={seg.c} />;
          });
        })}
      </Svg>
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function MoodBadgePill({ band }: { band: MoodBand }) {
  const s = BAND_STYLE[band];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.pillText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

export function RiskBadgePill({ level }: { level: RiskLevel }) {
  const s = RISK_STYLE[level];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.pillText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'forest',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'forest' | 'clay' | 'rose';
  style?: ViewStyle;
}) {
  const bg =
    tone === 'clay' ? COLORS.clay : tone === 'rose' ? COLORS.rose : COLORS.forest;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btnPrimary,
        { backgroundColor: bg },
        disabled && styles.btnDisabled,
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      <Text style={styles.btnPrimaryText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btnGhost,
        disabled && styles.btnDisabled,
        pressed && !disabled && { backgroundColor: COLORS.paperDeep },
        style,
      ]}
    >
      <Text style={styles.btnGhostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  wordmarkTitle: {
    fontFamily: FONTS.display,
    fontSize: 21,
    color: COLORS.ink,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  wordmarkSub: {
    fontSize: 9,
    letterSpacing: 2.2,
    color: COLORS.inkMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  kenteContainer: {
    width: '100%',
    height: 4,
    overflow: 'hidden',
  },
  eyebrow: {
    fontSize: 10.5,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: COLORS.inkMuted,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  btnPrimary: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#FDFAF4',
    fontSize: 14,
    fontWeight: '600',
  },
  btnGhost: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    color: COLORS.ink,
    fontSize: 13.5,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
