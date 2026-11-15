import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { tapSoft } from '../lib/haptics';
import { COLORS, FONTS } from '../theme';
import { Eyebrow } from './Brand';

type Phase = { label: string; seconds: number; hint: string };

const PHASES: Phase[] = [
  { label: 'Breathe in', seconds: 4, hint: 'Slowly through your nose' },
  { label: 'Hold gently', seconds: 4, hint: 'Shoulders down, jaw loose' },
  { label: 'Out slowly', seconds: 6, hint: 'Longer exhale settles the pulse' },
];

export default function BreathingCard() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;
        setPhaseIdx((p) => {
          const next = (p + 1) % PHASES.length;
          if (next === 0) setCycles((c) => c + 1);
          setRemaining(PHASES[next].seconds);
          tapSoft();
          return next;
        });
        return 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const current = PHASES[phaseIdx];
  const progress = 1 - remaining / current.seconds;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const toggle = () => {
    tapSoft();
    if (running) {
      setRunning(false);
      setPhaseIdx(0);
      setRemaining(PHASES[0].seconds);
    } else {
      setRunning(true);
    }
  };

  return (
    <View style={styles.card}>
      <Eyebrow>4-4-6 Breathing</Eyebrow>
      <View style={styles.row}>
        <View style={styles.ringWrap}>
          <Svg width={110} height={110} viewBox="0 0 110 110">
            <Circle
              cx={55}
              cy={55}
              r={radius}
              stroke={COLORS.paperDeep}
              strokeWidth={7}
              fill={running && phaseIdx === 0 ? COLORS.forestSoft : COLORS.paper}
            />
            {running && (
              <Circle
                cx={55}
                cy={55}
                r={radius}
                stroke={phaseIdx === 2 ? COLORS.sage : COLORS.forest}
                strokeWidth={7}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="none"
                rotation="-90"
                origin="55, 55"
              />
            )}
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.countText}>{running ? remaining : '4·4·6'}</Text>
          </View>
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.phaseTitle}>{running ? current.label : 'Two minutes to slow down'}</Text>
          <Text style={styles.phaseHint}>
            {running
              ? current.hint
              : 'Four counts in, hold four, six counts out. Longer exhales quiet the threat response.'}
          </Text>
          <View style={styles.btnRow}>
            <Pressable onPress={toggle} style={styles.actionBtn} accessibilityRole="button">
              <Text style={styles.actionBtnText}>{running ? 'Stop' : 'Start'}</Text>
            </Pressable>
            {cycles > 0 && <Text style={styles.cycleText}>{cycles} cycles done</Text>}
          </View>
        </View>
      </View>
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
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ringWrap: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: FONTS.display,
    fontSize: 21,
    fontWeight: '600',
    color: COLORS.forest,
  },
  phaseTitle: {
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.ink,
  },
  phaseHint: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.inkSoft,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: COLORS.forest,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionBtnText: {
    color: '#FDFAF4',
    fontSize: 13,
    fontWeight: '600',
  },
  cycleText: {
    fontSize: 11.5,
    color: COLORS.inkMuted,
  },
});
