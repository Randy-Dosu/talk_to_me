/**
 * Nkommo — shared types for the on-device emotional analysis engine.
 *
 * Everything in `src/engine` is dependency-free and deterministic: the same
 * text always produces the same reading, with no network call and no
 * hidden model state. That property is what makes the readings auditable.
 */

export type EmotionLabel =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'anxiety'
  | 'loneliness'
  | 'shame'
  | 'numbness'
  | 'gratitude'
  | 'hope'
  | 'calm';

export type RiskLevel = 'none' | 'watch' | 'elevated' | 'urgent';

export type MoodBand = 'bright' | 'steady' | 'unsettled' | 'heavy';

/** Categories of evidence the engine can cite back to the writer. */
export type SignalCategory =
  | 'positive'
  | 'negative'
  | 'hopelessness'
  | 'anxiety'
  | 'isolation'
  | 'shame'
  | 'sleep'
  | 'somatic'
  | 'self-harm'
  | 'suicidal-ideation'
  | 'negation'
  | 'intensifier'
  | 'support';

export interface Signal {
  /** Exact substring from the entry, so the writer can see what was read. */
  phrase: string;
  category: SignalCategory;
  /** Signed contribution to valence, or severity weight for risk signals. */
  weight: number;
  /** Human-readable reason, used in the "why did it read it that way" panel. */
  note?: string;
}

export interface EmotionScore {
  label: EmotionLabel;
  /** 0–1, normalised so the strongest emotion is 1. */
  score: number;
}

export interface RiskFinding {
  level: RiskLevel;
  /** 0–100 severity index. Written to the data model so trends can use it. */
  score: number;
  /** Which patterns fired. */
  matches: RiskMatch[];
  /**
   * second-person / third-person risk ("my friend wants to die") is flagged
   * separately: the user may be reporting someone else, so we must not
   * escalate the user's own record but should still offer help.
   */
  subject: 'self' | 'other' | 'unclear';
  /** true when we found risk language but a negator or idiom cancelled it. */
  suppressed: boolean;
  suppressedBy?: string;
}

export interface RiskMatch {
  phrase: string;
  tier: Exclude<RiskLevel, 'none'>;
  pattern: string;
  subject: 'self' | 'other' | 'unclear';
}

export interface LanguageRead {
  /** Share of tokens recognised by the Ghanaian English/Pidgin seed lexicon. */
  ghanaianMarkerRatio: number;
  markers: string[];
  /** Honest label — the engine is validated on English only. */
  support: 'english' | 'english-with-ghanaian-markers' | 'limited-coverage';
}

export interface Analysis {
  version: string;
  /** Full text that was read (stored so entries remain auditable). */
  text: string;
  wordCount: number;
  /** VADER-style compound valence, -1 (very negative) … +1 (very positive). */
  compound: number;
  /** 0–100; higher = better mood. This is the number plotted on the chart. */
  moodScore: number;
  moodBand: MoodBand;
  /** 0–100 composite distress index. */
  distress: number;
  emotions: EmotionScore[];
  risk: RiskFinding;
  signals: Signal[];
  language: LanguageRead;
  /** 0–1; low when the entry is very short or mostly out-of-vocabulary. */
  confidence: number;
  /** ISO timestamp of the analysis run. */
  analysedAt: string;
}

export interface JournalEntry {
  id: string;
  createdAt: string;
  text: string;
  source: 'typed' | 'voice';
  analysis: Analysis;
  /** Optional short note the user attaches to the day. */
  title?: string;
  /** User override — the writer always has the final word on their mood. */
  feltMood?: MoodBand;
}

export type ScaleId = 'PHQ9' | 'GAD7';

export interface CheckIn {
  id: string;
  createdAt: string;
  scale: ScaleId;
  answers: number[];
  score: number;
  maxScore: number;
  band: string;
  /** PHQ-9 item 9 (self-harm ideation) — gated on >= 1 regardless of total. */
  item9?: number;
  /** true when the scale's safety flag fired. */
  safetyFlag: boolean;
}

export interface TrustedContact {
  name: string;
  relationship: string;
  /** Ghanaian mobile numbers stored as +233… where possible. */
  phone: string;
  enabled: boolean;
  /** Only ever alert after this many days of concerning patterns. */
  escalateAfterDays: 3;
  /** Never send the journal text — only a check-in prompt. */
  shareJournals: false;
}

export interface SafetyPlan {
  warningSigns: string[];
  copingSteps: string[];
  people: { name: string; phone: string; note?: string }[];
  places: string[];
  reasons: string[];
  professional: string;
}

export interface Settings {
  displayName: string;
  /** Chosen greeting tone: Twi/English mix by default. */
  language: 'en' | 'tw-en';
  remindersEnabled: boolean;
  reminderTime: string;
  trusted: TrustedContact | null;
  /** Whether the crisis card may be shown proactively on the dashboard. */
  showResourcesOnOpen: boolean;
  onboarded: boolean;
  clinicianMode: boolean;
}

export interface AlertEvent {
  id: string;
  createdAt: string;
  trigger: string;
  /** Always a dry-run preview in this build: nothing leaves the device. */
  channel: 'preview';
  preview: string;
  status: 'drafted' | 'dismissed';
}

export interface StoreShape {
  version: number;
  entries: JournalEntry[];
  checkins: CheckIn[];
  settings: Settings;
  safetyPlan: SafetyPlan;
  alerts: AlertEvent[];
  demoMode: boolean;
}
