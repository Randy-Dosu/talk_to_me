import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import {
  CONVERSATION_STARTERS,
  COPING_TIPS,
  GROUNDING_STEPS,
  HELPLINE_NOTE,
  RESOURCES,
} from '@shared/data/resources';
import BreathingCard from '../components/BreathingCard';
import { Eyebrow, GhostButton, PrimaryButton } from '../components/Brand';
import NearestHelpCard from '../components/NearestHelpCard';
import { tapSoft } from '../lib/haptics';
import { useMobileStore } from '../lib/mobileStore';
import { COLORS, FONTS } from '../theme';

type SafetySection = 'helplines' | 'coping' | 'plan' | 'friend';

function PlanListEditor({
  label,
  hint,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const clean = draft.trim();
    if (!clean) return;
    tapSoft();
    onChange([...values, clean]);
    setDraft('');
  };

  return (
    <View style={styles.planBlock}>
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planHint}>{hint}</Text>
      <View style={styles.planAddRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor={COLORS.inkMuted}
          maxLength={120}
          style={styles.planInput}
        />
        <Pressable onPress={add} style={styles.addBtn} accessibilityRole="button">
          <Feather name="plus" size={16} color={COLORS.forest} />
        </Pressable>
      </View>
      {values.length > 0 && (
        <View style={styles.chipWrap}>
          {values.map((v, i) => (
            <View key={`${v}-${i}`} style={styles.savedChip}>
              <Text style={styles.savedChipText}>{v}</Text>
              <Pressable
                onPress={() => onChange(values.filter((_, idx) => idx !== i))}
                hitSlop={6}
              >
                <Feather name="x" size={13} color={COLORS.rose} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SafetyScreen() {
  const { state, updatePlan } = useMobileStore();
  const plan = state.safetyPlan;
  const [section, setSection] = useState<SafetySection>('helplines');
  const [groundStep, setGroundStep] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');

  const copyLine = async (line: string, key: string) => {
    try {
      await Clipboard.setStringAsync(line);
      tapSoft();
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const addPerson = () => {
    if (!personName.trim()) return;
    tapSoft();
    updatePlan({
      people: [
        ...plan.people,
        { name: personName.trim(), phone: personPhone.trim() },
      ],
    });
    setPersonName('');
    setPersonPhone('');
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Safety & Grounding</Eyebrow>
          <Text style={styles.title}>Help that answers, tonight.</Text>
        </View>
        <Pressable
          onPress={() => void Linking.openURL('tel:112')}
          style={styles.emergencyBadge}
        >
          <Feather name="phone-call" size={13} color="#FFF" />
          <Text style={styles.emergencyBadgeText}>112</Text>
        </Pressable>
      </View>

      {/* Section tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subTabs}
      >
        {(
          [
            { id: 'helplines', label: 'Helplines & Clinics' },
            { id: 'coping', label: 'Breathe & Ground' },
            { id: 'plan', label: 'My Safety Plan' },
            { id: 'friend', label: 'Help a Friend' },
          ] as const
        ).map((tab) => {
          const active = section === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setSection(tab.id)}
              style={[styles.subTab, active && styles.subTabActive]}
            >
              <Text style={[styles.subTabText, active && styles.subTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {section === 'helplines' && (
        <View style={styles.stack}>
          {RESOURCES.map((r) => (
            <View key={r.id} style={styles.resourceCard}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.resKind}>{r.kind.toUpperCase()}</Text>
                <Text style={styles.resName}>{r.name}</Text>
                <Text style={styles.resHours}>{r.hours}</Text>
                <Text style={styles.resNote}>{r.note}</Text>
              </View>
              {r.tel && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void Linking.openURL(`tel:${r.tel}`)}
                  style={styles.callBtn}
                >
                  <Feather name="phone" size={14} color="#FDFAF4" />
                  <Text style={styles.callBtnText}>{r.contact}</Text>
                </Pressable>
              )}
            </View>
          ))}

          <NearestHelpCard />

          <Text style={styles.noteFoot}>{HELPLINE_NOTE}</Text>
        </View>
      )}

      {section === 'coping' && (
        <View style={styles.stack}>
          <BreathingCard />

          {/* 5-4-3-2-1 Grounding */}
          <View style={styles.card}>
            <Eyebrow>5-4-3-2-1 Senses Grounding</Eyebrow>
            <View style={styles.groundStepBox}>
              <Text style={styles.groundBigNum}>
                {GROUNDING_STEPS[groundStep].count}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.groundSense}>
                  {GROUNDING_STEPS[groundStep].sense}
                </Text>
                <Text style={styles.groundPrompt}>
                  {GROUNDING_STEPS[groundStep].prompt}
                </Text>
              </View>
            </View>
            <View style={styles.groundNav}>
              <GhostButton
                label="Previous"
                disabled={groundStep === 0}
                onPress={() => setGroundStep((s) => Math.max(0, s - 1))}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={
                  groundStep < GROUNDING_STEPS.length - 1
                    ? 'Next sense →'
                    : 'Start over'
                }
                onPress={() =>
                  setGroundStep((s) => (s + 1) % GROUNDING_STEPS.length)
                }
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {COPING_TIPS.map((tip) => (
            <View key={tip.id} style={styles.card}>
              <View style={styles.tipHead}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipMins}>{tip.minutes} min</Text>
              </View>
              {tip.body.map((p, idx) => (
                <Text key={idx} style={styles.tipPara}>
                  • {p}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {section === 'plan' && (
        <View style={styles.card}>
          <Eyebrow>Personal Safety Plan · Stored on this phone</Eyebrow>
          <Text style={styles.planIntro}>
            Write this on a calm day so you do not have to think from scratch on a hard night.
          </Text>

          <PlanListEditor
            label="1. Warning signs I notice first"
            hint="Not replying on WhatsApp, waking at 3am, skipping meals…"
            placeholder="Add a warning sign"
            values={plan.warningSigns}
            onChange={(warningSigns) => updatePlan({ warningSigns })}
          />

          <PlanListEditor
            label="2. Small things I can do by myself"
            hint="Cold water, stepping onto the veranda, 4-4-6 breathing…"
            placeholder="Add a coping step"
            values={plan.copingSteps}
            onChange={(copingSteps) => updatePlan({ copingSteps })}
          />

          <View style={styles.planBlock}>
            <Text style={styles.planLabel}>3. People I can call or sit with</Text>
            <View style={styles.twoInputs}>
              <TextInput
                value={personName}
                onChangeText={setPersonName}
                placeholder="Name"
                placeholderTextColor={COLORS.inkMuted}
                style={[styles.planInput, { flex: 1 }]}
              />
              <TextInput
                value={personPhone}
                onChangeText={setPersonPhone}
                placeholder="Phone"
                placeholderTextColor={COLORS.inkMuted}
                keyboardType="phone-pad"
                style={[styles.planInput, { flex: 1 }]}
              />
              <Pressable onPress={addPerson} style={styles.addBtn}>
                <Feather name="plus" size={16} color={COLORS.forest} />
              </Pressable>
            </View>
            {plan.people.map((p, i) => (
              <View key={`${p.name}-${i}`} style={styles.personRow}>
                <Text style={styles.personText}>
                  {p.name} {p.phone ? `· ${p.phone}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  {p.phone ? (
                    <Pressable onPress={() => void Linking.openURL(`tel:${p.phone}`)}>
                      <Feather name="phone" size={14} color={COLORS.forest} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() =>
                      updatePlan({
                        people: plan.people.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Feather name="trash-2" size={14} color={COLORS.rose} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <PlanListEditor
            label="4. Safe places I can go"
            hint="A friend’s room, church courtyard, evening walk…"
            placeholder="Add a safe place"
            values={plan.places}
            onChange={(places) => updatePlan({ places })}
          />

          <PlanListEditor
            label="5. Reasons worth staying for"
            hint="My younger sister, graduation, music, seeing next year…"
            placeholder="Add a reason"
            values={plan.reasons}
            onChange={(reasons) => updatePlan({ reasons })}
          />
        </View>
      )}

      {section === 'friend' && (
        <View style={styles.stack}>
          <View style={styles.card}>
            <Eyebrow>Sentences you can borrow</Eyebrow>
            <Text style={styles.planIntro}>
              Tap any sentence to copy it for WhatsApp or SMS when starting the conversation feels too heavy:
            </Text>
            {CONVERSATION_STARTERS.map((line, i) => {
              const key = `starter-${i}`;
              const copied = copiedKey === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => void copyLine(line, key)}
                  style={styles.starterRow}
                >
                  <Text style={styles.starterText}>“{line}”</Text>
                  <View style={styles.copyBadge}>
                    <Feather
                      name={copied ? 'check' : 'copy'}
                      size={13}
                      color={copied ? COLORS.forest : COLORS.inkMuted}
                    />
                    <Text style={styles.copyBadgeText}>
                      {copied ? 'Copied' : 'Copy'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.card}>
            <Eyebrow>When you are worried about a friend</Eyebrow>
            <Text style={styles.tipPara}>
              • Ask plainly: asking whether someone has had thoughts of ending their life does NOT plant the idea — it opens the door for relief.
            </Text>
            <Text style={styles.tipPara}>
              • Listen more than you lecture. Avoid saying “just pray harder” or “others have it worse.”
            </Text>
            <Text style={styles.tipPara}>
              • Stay with them or help them call 0800 678 678 together. If they are in immediate danger, call 112.
            </Text>
          </View>
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
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 23,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 3,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.rose,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
  },
  emergencyBadgeText: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  subTabs: {
    gap: 7,
    paddingVertical: 2,
  },
  subTab: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  subTabActive: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  subTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  subTabTextActive: {
    color: '#FDFAF4',
  },
  stack: {
    gap: 12,
  },
  resourceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    gap: 10,
  },
  resKind: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: COLORS.inkMuted,
  },
  resName: {
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.ink,
  },
  resHours: {
    fontSize: 11.5,
    color: COLORS.forest,
    fontWeight: '600',
  },
  resNote: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  callBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.forest,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  callBtnText: {
    color: '#FDFAF4',
    fontSize: 13.5,
    fontWeight: '700',
  },
  noteFoot: {
    fontSize: 11.5,
    lineHeight: 17,
    color: COLORS.inkMuted,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 10,
  },
  groundStepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.paper,
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  groundBigNum: {
    fontFamily: FONTS.display,
    fontSize: 34,
    fontWeight: '600',
    color: COLORS.forest,
    width: 34,
    textAlign: 'center',
  },
  groundSense: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    textTransform: 'capitalize',
  },
  groundPrompt: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  groundNav: {
    flexDirection: 'row',
    gap: 8,
  },
  tipHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipTitle: {
    fontFamily: FONTS.display,
    fontSize: 16.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  tipMins: {
    fontSize: 11,
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  tipPara: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkSoft,
  },
  planIntro: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.inkMuted,
  },
  planBlock: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperDeep,
  },
  planLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  planHint: {
    fontSize: 11.5,
    color: COLORS.inkMuted,
  },
  planAddRow: {
    flexDirection: 'row',
    gap: 7,
  },
  twoInputs: {
    flexDirection: 'row',
    gap: 6,
  },
  planInput: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13.5,
    color: COLORS.ink,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  savedChipText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  personText: {
    fontSize: 12.5,
    color: COLORS.ink,
    fontWeight: '500',
  },
  starterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 11,
  },
  starterText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18.5,
    color: COLORS.ink,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  copyBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
});
