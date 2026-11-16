import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { analyse } from '@shared/engine/analyze';
import { REGIONS, REGION_CENTROIDS, type Region } from '@shared/data/facilities';
import AnalysisCard from '../components/AnalysisCard';
import {
  Eyebrow,
  GhostButton,
  KenteStrip,
  PrimaryButton,
  Wordmark,
} from '../components/Brand';
import CrisisCardMobile from '../components/CrisisCardMobile';
import { tapLight } from '../lib/haptics';
import { useMobileStore } from '../lib/mobileStore';
import { useMobileLocation } from '../lib/useMobileLocation';
import { COLORS, FONTS } from '../theme';

export default function OnboardingScreen() {
  const { state, updateSettings, updatePlan, importBackupJson } = useMobileStore();
  const { location, locating, message: locMsg, detect } = useMobileLocation();

  const [step, setStep] = useState<'welcome' | 'setup' | 'import'>('welcome');
  const [tryText, setTryText] = useState('');

  const [alias, setAlias] = useState(state.settings.displayName);
  const [language, setLanguage] = useState<'en' | 'tw-en'>(state.settings.language);
  const [manualRegion, setManualRegion] = useState<Region | ''>(
    state.settings.location?.region ?? '',
  );
  const [showRegions, setShowRegions] = useState(false);
  const [contactName, setContactName] = useState(state.settings.trusted?.name ?? '');
  const [contactPhone, setContactPhone] = useState(state.settings.trusted?.phone ?? '');
  const [consented, setConsented] = useState(Boolean(state.settings.trusted?.enabled));
  const [acknowledged, setAcknowledged] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [backupJson, setBackupJson] = useState('');
  const [importNote, setImportNote] = useState<string | null>(null);

  const livePreview = useMemo(
    () => (tryText.trim().length > 0 ? analyse(tryText) : null),
    [tryText],
  );

  const activeRegion = manualRegion || location?.region || '';
  const nameOk = alias.trim().length > 0;
  const contactOk = !contactName.trim() || consented;
  const ready = nameOk && acknowledged && contactOk;

  const finishSetup = () => {
    if (!ready) {
      setShowErrors(true);
      return;
    }
    tapLight();
    const contact = contactName.trim();
    const chosenCentroid = manualRegion ? REGION_CENTROIDS[manualRegion] : null;
    updateSettings({
      displayName: alias.trim(),
      language,
      onboarded: true,
      trusted: contact
        ? {
            name: contact,
            relationship: 'Trusted contact',
            phone: contactPhone.trim(),
            enabled: true,
            escalateAfterDays: 3,
            shareJournals: false,
          }
        : state.settings.trusted,
      location: chosenCentroid
        ? {
            lat: chosenCentroid.lat,
            lng: chosenCentroid.lng,
            region: manualRegion as Region,
            label: manualRegion,
            source: 'manual',
            updatedAt: new Date().toISOString(),
          }
        : location,
    });
    if (contact) {
      updatePlan({
        people: [{ name: contact, phone: contactPhone.trim(), note: 'Added at setup' }],
      });
    }
  };

  const skipSetup = () => {
    tapLight();
    updateSettings({
      onboarded: true,
      displayName: alias.trim() || 'friend',
      language,
    });
  };

  const handleImport = () => {
    const res = importBackupJson(backupJson);
    if (!res.ok) {
      setImportNote(res.error ?? 'Import failed.');
      return;
    }
    tapLight();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <KenteStrip />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topHeader}>
          <Wordmark />
          <View style={styles.privatePill}>
            <Feather name="lock" size={11} color={COLORS.forest} />
            <Text style={styles.privatePillText}>On-device</Text>
          </View>
        </View>

        {step === 'welcome' && (
          <View style={styles.section}>
            <Eyebrow>Private journal & mood companion · Ghana</Eyebrow>
            <Text style={styles.heroTitle}>
              Say what today felt like — without saying it to a crowd.
            </Text>
            <Text style={styles.heroBody}>
              Nkommo reads the emotional weather in your writing right on your phone,
              spots sustained hard patches early, and connects you to free 24/7 support in
              Ghana when it matters. No account required.
            </Text>

            <View style={styles.ctaStack}>
              <PrimaryButton
                label="Set up in 30 seconds →"
                onPress={() => {
                  tapLight();
                  setStep('setup');
                }}
              />
              <View style={styles.secondaryRow}>
                <GhostButton
                  label="Skip straight to journal"
                  onPress={skipSetup}
                  style={{ flex: 1 }}
                />
                <GhostButton
                  label="Import web backup"
                  onPress={() => setStep('import')}
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            {/* Live interactive engine sandbox — starts empty, zero fake seed data */}
            <View style={styles.sandboxCard}>
              <View style={styles.sandboxHeader}>
                <Eyebrow>Try the on-device reader</Eyebrow>
                <Text style={styles.sandboxNote}>Nothing typed here is saved</Text>
              </View>
              <TextInput
                value={tryText}
                onChangeText={setTryText}
                multiline
                placeholder="Write a sentence in English or Pidgin (e.g. “Chale today be heavy small, couldn’t sleep at all”)…"
                placeholderTextColor={COLORS.inkMuted}
                style={styles.sandboxInput}
              />
              {livePreview ? (
                <View style={{ gap: 10 }}>
                  {(livePreview.risk.level === 'urgent' ||
                    livePreview.risk.level === 'elevated') && (
                    <CrisisCardMobile
                      level={livePreview.risk.level === 'urgent' ? 'urgent' : 'elevated'}
                      compact
                    />
                  )}
                  <AnalysisCard analysis={livePreview} compact />
                </View>
              ) : (
                <Text style={styles.sandboxHint}>
                  Runs 100% offline on your phone in under 1 millisecond — valence,
                  Ghanaian English/Pidgin markers, 11 emotions, and phrase-level explanations.
                </Text>
              )}
            </View>

            <View style={styles.featureRow}>
              {[
                { icon: 'shield' as const, title: 'Private by default', desc: 'Stored on your phone, never uploaded unless you opt in.' },
                { icon: 'activity' as const, title: 'PHQ-9 & GAD-7', desc: 'Public-domain clinical check-ins & 14/30-day trends.' },
                { icon: 'map-pin' as const, title: '16 regions covered', desc: 'Offline clinic distance ranking + toll-free 0800 678 678.' },
              ].map((item) => (
                <View key={item.title} style={styles.featureCard}>
                  <Feather name={item.icon} size={16} color={COLORS.forest} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                    <Text style={styles.featureDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 'setup' && (
          <View style={styles.setupCard}>
            <View style={styles.setupHeaderRow}>
              <View>
                <Eyebrow>Akwaaba · One-screen setup</Eyebrow>
                <Text style={styles.setupTitle}>Make this space yours.</Text>
              </View>
              <Pressable onPress={() => setStep('welcome')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Back</Text>
              </Pressable>
            </View>

            {/* 1. Alias */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>What should Nkommo call you?</Text>
              <Text style={styles.fieldHint}>An alias or nickname is fine. Stays on this phone.</Text>
              <TextInput
                value={alias}
                onChangeText={setAlias}
                placeholder="Ama, Kofi, or just “friend”"
                placeholderTextColor={COLORS.inkMuted}
                maxLength={40}
                style={styles.input}
              />
              {showErrors && !nameOk && (
                <Text style={styles.errText}>Enter any name or alias to continue.</Text>
              )}
            </View>

            {/* 2. Language */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>How do you write?</Text>
              <View style={styles.langGrid}>
                {[
                  { id: 'en' as const, label: 'English', hint: 'Standard' },
                  { id: 'tw-en' as const, label: 'English + Twi / Pidgin', hint: 'Mixed, as you speak' },
                ].map((opt) => {
                  const selected = language === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setLanguage(opt.id)}
                      style={[styles.langCard, selected && styles.langCardActive]}
                    >
                      <View style={styles.langCardTop}>
                        <Text style={styles.langLabel}>{opt.label}</Text>
                        {selected && <Feather name="check" size={14} color={COLORS.forest} />}
                      </View>
                      <Text style={styles.langHint}>{opt.hint}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Region */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Your region in Ghana</Text>
                <Text style={styles.optionalTag}>OPTIONAL</Text>
              </View>
              <Text style={styles.fieldHint}>
                Used offline on your phone to rank nearby psychiatric clinics.
              </Text>
              <View style={styles.regionActionRow}>
                <Pressable onPress={() => void detect()} style={styles.gpsButton}>
                  <Feather name="crosshair" size={13} color={COLORS.forest} />
                  <Text style={styles.gpsButtonText}>
                    {locating ? 'Locating…' : activeRegion ? `${activeRegion} · Refresh GPS` : 'Detect via GPS'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowRegions((v) => !v)}
                  style={styles.pickRegionBtn}
                >
                  <Text style={styles.pickRegionBtnText}>
                    {showRegions ? 'Hide list' : 'Choose manually'}
                  </Text>
                </Pressable>
              </View>
              {locMsg && <Text style={styles.warnSmall}>{locMsg}</Text>}
              {showRegions && (
                <View style={styles.regionWrap}>
                  {REGIONS.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => {
                        setManualRegion(r);
                        setShowRegions(false);
                      }}
                      style={[
                        styles.regionPill,
                        activeRegion === r && styles.regionPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.regionPillText,
                          activeRegion === r && styles.regionPillTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* 4. Trusted contact */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Trusted contact</Text>
                <Text style={styles.optionalTag}>OPTIONAL</Text>
              </View>
              <Text style={styles.fieldHint}>
                Prepares a check-in draft you approve if patterns look heavy. Never auto-sent, never includes journal text.
              </Text>
              <View style={styles.twoCol}>
                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Their name"
                  placeholderTextColor={COLORS.inkMuted}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="+233 24 000 0000"
                  placeholderTextColor={COLORS.inkMuted}
                  keyboardType="phone-pad"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              {contactName.trim().length > 0 && (
                <View style={styles.switchRow}>
                  <Switch
                    value={consented}
                    onValueChange={setConsented}
                    trackColor={{ false: COLORS.line, true: COLORS.forest }}
                  />
                  <Text style={styles.switchText}>
                    I have asked this person and they agreed to be my check-in contact.
                  </Text>
                </View>
              )}
              {showErrors && !contactOk && (
                <Text style={styles.errText}>Confirm their consent first, or leave name blank.</Text>
              )}
            </View>

            {/* 5. Non-diagnostic acknowledgement */}
            <Pressable
              onPress={() => setAcknowledged((v) => !v)}
              style={styles.ackBox}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
            >
              <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
                {acknowledged && <Feather name="check" size={13} color="#FDFAF4" />}
              </View>
              <Text style={styles.ackText}>
                I understand Nkommo is a private reflection & screening aid —{' '}
                <Text style={{ fontWeight: '700', color: COLORS.ink }}>not a medical diagnosis</Text>{' '}
                and not an emergency service.
              </Text>
            </Pressable>
            {showErrors && !acknowledged && (
              <Text style={styles.errText}>Tick this acknowledgement to start.</Text>
            )}

            <PrimaryButton label="Start writing →" onPress={finishSetup} />

            <Pressable onPress={skipSetup} style={{ alignSelf: 'center', paddingVertical: 4 }}>
              <Text style={styles.skipText}>Skip setup for now</Text>
            </Pressable>
          </View>
        )}

        {step === 'import' && (
          <View style={styles.setupCard}>
            <View style={styles.setupHeaderRow}>
              <View>
                <Eyebrow>Bring your journal from the web</Eyebrow>
                <Text style={styles.setupTitle}>Import Nkommo JSON backup</Text>
              </View>
              <Pressable onPress={() => setStep('welcome')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Back</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldHint}>
              On the Nkommo website, open Privacy → Export JSON, then paste the exported JSON
              below to carry your entries, check-ins, and safety plan onto your phone.
            </Text>
            <TextInput
              value={backupJson}
              onChangeText={setBackupJson}
              multiline
              placeholder='{"app": "Nkommo", "entries": [...]}'
              placeholderTextColor={COLORS.inkMuted}
              style={[styles.sandboxInput, { minHeight: 140 }]}
            />
            {importNote && <Text style={styles.errText}>{importNote}</Text>}
            <PrimaryButton
              label="Import & open journal"
              disabled={!backupJson.trim()}
              onPress={handleImport}
            />
          </View>
        )}

        {/* Emergency footer always accessible */}
        <View style={styles.emergencyStrip}>
          <Text style={styles.emergencyLabel}>In danger right now?</Text>
          <View style={styles.emergencyLinks}>
            <Pressable onPress={() => void Linking.openURL('tel:112')}>
              <Text style={[styles.emergencyPhone, { color: COLORS.rose }]}>Call 112</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL('tel:0800678678')}>
              <Text style={[styles.emergencyPhone, { color: COLORS.forest }]}>
                MHA 0800 678 678
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  scroll: {
    padding: 18,
    paddingBottom: 36,
    gap: 18,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.forestSoft,
  },
  privatePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.forest,
  },
  section: {
    gap: 15,
  },
  heroTitle: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '600',
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  heroBody: {
    fontSize: 14.5,
    lineHeight: 22,
    color: COLORS.inkSoft,
  },
  ctaStack: {
    gap: 9,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sandboxCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 10,
  },
  sandboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sandboxNote: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  sandboxInput: {
    minHeight: 84,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.ink,
    textAlignVertical: 'top',
  },
  sandboxHint: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.inkMuted,
  },
  featureRow: {
    gap: 9,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 13,
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  setupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 18,
    gap: 16,
  },
  setupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  setupTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 3,
  },
  backLink: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.paperDeep,
  },
  backLinkText: {
    fontSize: 12,
    color: COLORS.inkSoft,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  optionalTag: {
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.inkMuted,
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.inkMuted,
  },
  input: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.ink,
  },
  langGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  langCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 11,
    gap: 3,
  },
  langCardActive: {
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  langCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  langHint: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  regionActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  gpsButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.forest,
  },
  pickRegionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
  },
  pickRegionBtnText: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
  },
  warnSmall: {
    fontSize: 11.5,
    color: COLORS.goldText,
  },
  regionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  regionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
  },
  regionPillActive: {
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  regionPillText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  regionPillTextActive: {
    color: COLORS.forest,
    fontWeight: '600',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  switchText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.inkSoft,
  },
  ackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.paperDeep,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.forest,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.forest,
  },
  ackText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.inkSoft,
  },
  errText: {
    fontSize: 12,
    color: COLORS.rose,
    fontWeight: '500',
  },
  skipText: {
    fontSize: 12.5,
    color: COLORS.inkMuted,
    textDecorationLine: 'underline',
  },
  emergencyStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.roseSoft,
    borderColor: 'rgba(168, 67, 63, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  emergencyLabel: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
    fontWeight: '500',
  },
  emergencyLinks: {
    flexDirection: 'row',
    gap: 14,
  },
  emergencyPhone: {
    fontSize: 13,
    fontWeight: '700',
  },
});
