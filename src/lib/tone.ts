import type { EmotionLabel, MoodBand } from '../engine/types';

export const bandChip: Record<MoodBand, { label: string; classes: string; dot: string; hex: string }> = {
  bright: { label: 'Bright', classes: 'bg-gold/15 text-[#8a6414] border-gold/30', dot: 'bg-gold', hex: '#CF9A35' },
  steady: { label: 'Steady', classes: 'bg-sage/14 text-[#456b4b] border-sage/30', dot: 'bg-sage', hex: '#6F8F74' },
  unsettled: { label: 'Unsettled', classes: 'bg-clay/12 text-clay border-clay/25', dot: 'bg-clay', hex: '#BD5A3C' },
  heavy: { label: 'Heavy', classes: 'bg-rose/12 text-rose border-rose/25', dot: 'bg-rose', hex: '#A8433F' },
};

export const EMOTION_META: Record<EmotionLabel, { label: string; hex: string; hint: string }> = {
  joy: { label: 'Joy', hex: '#CF9A35', hint: 'lightness, delight' },
  sadness: { label: 'Sadness', hex: '#5B7C9B', hint: 'loss, disappointment' },
  anger: { label: 'Anger', hex: '#B04A32', hint: 'frustration, injustice' },
  fear: { label: 'Fear', hex: '#7A5C8F', hint: 'threat, dread' },
  anxiety: { label: 'Anxiety', hex: '#BD7A3C', hint: 'worry, arousal' },
  loneliness: { label: 'Loneliness', hex: '#3A7089', hint: 'disconnection' },
  shame: { label: 'Shame', hex: '#8F5A5A', hint: 'judgement, stigma' },
  numbness: { label: 'Numbness', hex: '#7C8580', hint: 'flatness, emptiness' },
  gratitude: { label: 'Gratitude', hex: '#8A9B4E', hint: 'thanks, blessing' },
  hope: { label: 'Hope', hex: '#4E8B6A', hint: 'forward motion' },
  calm: { label: 'Calm', hex: '#6F8F74', hint: 'settled, safe' },
};

export const RISK_TONE: Record<string, { border: string; bg: string; text: string }> = {
  none: { border: 'border-line', bg: 'bg-white/60', text: 'text-ink-muted' },
  watch: { border: 'border-gold/40', bg: 'bg-gold/8', text: 'text-[#8a6414]' },
  elevated: { border: 'border-clay/40', bg: 'bg-clay/8', text: 'text-clay' },
  urgent: { border: 'border-rose/50', bg: 'bg-rose/8', text: 'text-rose' },
};

export function distressTone(distress: number): { label: string; classes: string } {
  if (distress >= 75) return { label: 'High load', classes: 'text-rose' };
  if (distress >= 50) return { label: 'Notable load', classes: 'text-clay' };
  if (distress >= 30) return { label: 'Some load', classes: 'text-[#8a6414]' };
  return { label: 'Light load', classes: 'text-[#456b4b]' };
}
