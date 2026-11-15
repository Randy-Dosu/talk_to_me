import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { DayPoint } from '@shared/engine/trends';
import { COLORS } from '../theme';

function dotColor(mood: number): string {
  if (mood >= 72) return COLORS.gold;
  if (mood >= 55) return COLORS.sage;
  if (mood >= 35) return COLORS.clay;
  return COLORS.rose;
}

export default function MoodSparkChart({ points }: { points: DayPoint[] }) {
  const width = 340;
  const height = 165;
  const padL = 28;
  const padR = 12;
  const padT = 14;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const plotted = points
    .map((pt, idx) => {
      if (pt.mood === null) return null;
      const x =
        points.length <= 1
          ? padL + innerW / 2
          : padL + (idx / (points.length - 1)) * innerW;
      const y = padT + innerH - (Math.max(0, Math.min(100, pt.mood)) / 100) * innerH;
      return { x, y, pt };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const linePath =
    plotted.length >= 2
      ? plotted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';

  const areaPath =
    plotted.length >= 2
      ? `${linePath} L ${plotted[plotted.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${plotted[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  const firstLabel = points[0]?.label ?? '';
  const midLabel = points[Math.floor(points.length / 2)]?.label ?? '';
  const lastLabel = points[points.length - 1]?.label ?? '';

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={COLORS.forest} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={COLORS.forest} stopOpacity={0.01} />
          </LinearGradient>
        </Defs>

        {[100, 50, 0].map((val) => {
          const y = padT + innerH - (val / 100) * innerH;
          return (
            <Line
              key={val}
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke={COLORS.line}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          );
        })}

        {areaPath ? <Path d={areaPath} fill="url(#moodFill)" /> : null}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={COLORS.forest}
            strokeWidth={2.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {plotted.map(({ x, y, pt }) => {
          const risky = pt.risk === 'urgent' || pt.risk === 'elevated';
          return (
            <React.Fragment key={pt.date}>
              {risky && (
                <Circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill="none"
                  stroke={COLORS.rose}
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                />
              )}
              <Circle
                cx={x}
                cy={y}
                r={4.2}
                fill={dotColor(pt.mood ?? 50)}
                stroke={COLORS.surface}
                strokeWidth={1.5}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.axisLabels}>
        <Text style={styles.axisText}>{firstLabel}</Text>
        <Text style={styles.axisText}>{midLabel}</Text>
        <Text style={styles.axisText}>{lastLabel}</Text>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.gold }]} />
          <Text style={styles.legendText}>Bright</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.sage }]} />
          <Text style={styles.legendText}>Steady</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.clay }]} />
          <Text style={styles.legendText}>Unsettled</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.rose }]} />
          <Text style={styles.legendText}>Heavy</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -6,
  },
  axisText: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
});
