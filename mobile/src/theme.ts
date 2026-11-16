import { Platform } from 'react-native';
import type { EmotionLabel, MoodBand, RiskLevel } from '@shared/engine/types';

export const COLORS = {
  paper: '#FBF7F0',
  paperDeep: '#F4ECE0',
  surface: '#FFFFFF',
  surfaceSoft: 'rgba(255, 255, 255, 0.82)',
  ink: '#16211D',
  inkSoft: '#3C4A44',
  inkMuted: '#6B7A72',
  line: '#E2D8C9',
  forest: '#1F4B3F',
  forestDeep: '#14352C',
  forestSoft: '#E6EFEA',
  clay: '#BD5A3C',
  claySoft: '#F3E2D8',
  gold: '#CF9A35',
  goldText: '#8A6414',
  goldSoft: '#F7ECD4',
  sage: '#6F8F74',
  sageText: '#456B4B',
  sageSoft: '#E8EFE6',
  rose: '#A8433F',
  roseSoft: '#F6E3E1',
  sky: '#3A7089',
} as const;

export const FONTS = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, serif',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, sans-serif',
  }),
} as const;

export const BAND_STYLE: Record<
  MoodBand,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  bright: {
    label: 'Bright',
    bg: COLORS.goldSoft,
    border: 'rgba(207, 154, 53, 0.38)',
    text: COLORS.goldText,
    dot: COLORS.gold,
  },
  steady: {
    label: 'Steady',
    bg: COLORS.sageSoft,
    border: 'rgba(111, 143, 116, 0.38)',
    text: COLORS.sageText,
    dot: COLORS.sage,
  },
  unsettled: {
    label: 'Unsettled',
    bg: COLORS.claySoft,
    border: 'rgba(189, 90, 60, 0.34)',
    text: COLORS.clay,
    dot: COLORS.clay,
  },
  heavy: {
    label: 'Heavy',
    bg: COLORS.roseSoft,
    border: 'rgba(168, 67, 63, 0.36)',
    text: COLORS.rose,
    dot: COLORS.rose,
  },
};

export const RISK_STYLE: Record<
  RiskLevel,
  { label: string; bg: string; border: string; text: string }
> = {
  none: {
    label: 'No safety signal',
    bg: COLORS.surface,
    border: COLORS.line,
    text: COLORS.inkMuted,
  },
  watch: {
    label: 'Worth watching',
    bg: COLORS.goldSoft,
    border: 'rgba(207, 154, 53, 0.45)',
    text: COLORS.goldText,
  },
  elevated: {
    label: 'Elevated risk',
    bg: COLORS.claySoft,
    border: 'rgba(189, 90, 60, 0.45)',
    text: COLORS.clay,
  },
  urgent: {
    label: 'Urgent signal',
    bg: COLORS.roseSoft,
    border: 'rgba(168, 67, 63, 0.5)',
    text: COLORS.rose,
  },
};

export const EMOTION_COLORS: Record<EmotionLabel, { label: string; hex: string }> = {
  joy: { label: 'Joy', hex: '#CF9A35' },
  sadness: { label: 'Sadness', hex: '#5B7C9B' },
  anger: { label: 'Anger', hex: '#B04A32' },
  fear: { label: 'Fear', hex: '#7A5C8F' },
  anxiety: { label: 'Anxiety', hex: '#BD7A3C' },
  loneliness: { label: 'Loneliness', hex: '#3A7089' },
  shame: { label: 'Shame', hex: '#8F5A5A' },
  numbness: { label: 'Numbness', hex: '#7C8580' },
  gratitude: { label: 'Gratitude', hex: '#8A9B4E' },
  hope: { label: 'Hope', hex: '#4E8B6A' },
  calm: { label: 'Calm', hex: '#6F8F74' },
};

export type AppTab = 'journal' | 'patterns' | 'checkin' | 'safety' | 'more';
