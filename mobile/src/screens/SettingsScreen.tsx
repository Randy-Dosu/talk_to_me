import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { formatDay } from '@shared/engine/id';
import { concernScore, detectPatterns, weeklyAverages } from '@shared/engine/trends';
import { Eyebrow, GhostButton, PrimaryButton } from '../components/Brand';
import { notifySuccess, tapLight } from '../lib/haptics';
import {
  DEFAULT_HF_MODEL,
  getHfToken,
  setHfToken,
  testHfMobileConnection,
  usingProxy,
} from '../lib/hfMobile';
import { formatClock } from '../lib/mobileDayPrompter';
import { useMobileStore } from '../lib/mobileStore';
import {
  getNotificationStatus,
  requestNotificationAccess,
  syncDailyReminders,
  type NotifPermission,
} from '../lib/notifications';
import { COLORS, FONTS } from '../theme';

type MoreTab = 'trusted' | 'settings' | 'privacy';

function buildTrustedPreview(
  contactName: string,
  patterns: ReturnType<typeof detectPatterns>,
  week: ReturnType<typeof weeklyAverages>,
): string {
  const concerns = patterns
    .filter((p) => p.tone === 'concern' || p.tone === 'notice')
    .slice(0, 2);
  return [
    `Hi ${contactName}, this is a check-in from Nkommo (shared by your person with their permission).`,
    '',
    `Their mood readings averaged ${week.thisWeek ?? '—'}/100 across ${week.thisCount} entries this week${
      week.delta === null
        ? '.'
        : week.delta < 0
          ? `, down ${Math.abs(week.delta)} points from last week.`
          : `, up ${week.delta} points from last week.`
    }`,
    ...(concerns.length
      ? ['', 'What the pattern shows:', ...concerns.map((p) => `• ${p.title}`)]
      : []),
    '',
    'No journal text is ever included. Please check in on them gently. If you think they are in immediate danger, call 112.',
    '',
    '— Nkommo · not an emergency service',
  ].join('\n');
}

export default function SettingsScreen() {
  const {
    state,
    updateSettings,
    addAlert,
    dismissAlert,
    exportJson,
    importBackupJson,
    wipe,
  } = useMobileStore();

  const [tab, setTab] = useState<MoreTab>('trusted');

  // Trusted Circle state
  const trusted = state.settings.trusted;
  const [cName, setCName] = useState(trusted?.name ?? '');
  const [cRel, setCRel] = useState(trusted?.relationship ?? 'Friend');
  const [cPhone, setCPhone] = useState(trusted?.phone ?? '');
  const [cConsent, setCConsent] = useState(Boolean(trusted?.enabled));
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [savedContact, setSavedContact] = useState(false);

  // Settings & AI state
  const [notifPerm, setNotifPerm] = useState<NotifPermission>('undetermined');
  const [hfTokenInput, setHfTokenInput] = useState('');
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [aiConsent, setAiConsent] = useState(state.settings.ai.enabled);
  const [modelId, setModelId] = useState(state.settings.ai.model || DEFAULT_HF_MODEL);
  const [testNote, setTestNote] = useState<string | null>(null);
  const [testingHf, setTestingHf] = useState(false);

  // Privacy & Backup state
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    void getNotificationStatus().then(setNotifPerm);
    void getHfToken().then((t) => {
      setHasSavedToken(Boolean(t));
    });
  }, []);

  const patterns = useMemo(
    () => detectPatterns(state.entries, state.checkins),
    [state.entries, state.checkins],
  );
  const week = useMemo(() => weeklyAverages(state.entries), [state.entries]);
  const concerns = concernScore(patterns);

  const previewText = useMemo(
    () => buildTrustedPreview(trusted?.name || cName || 'friend', patterns, week),
    [trusted?.name, cName, patterns, week],
  );

  const saveTrusted = () => {
    if (!cName.trim() || !cConsent) return;
    tapLight();
    updateSettings({
      trusted: {
        name: cName.trim(),
        relationship: cRel.trim() || 'Friend',
        phone: cPhone.trim(),
        enabled: true,
        escalateAfterDays: 3,
        shareJournals: false,
      },
    });
    setSavedContact(true);
    setTimeout(() => setSavedContact(false), 2200);
  };

  const shareDraftNatively = async () => {
    try {
      await Share.share({ message: previewText });
    } catch {
      // user dismissed share sheet
    }
  };

  const copyDraft = async () => {
    await Clipboard.setStringAsync(previewText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const enableNotifications = async () => {
    const next = await requestNotificationAccess();
    setNotifPerm(next);
    if (next === 'granted') {
      await syncDailyReminders({ ...state.settings, remindersEnabled: true });
      updateSettings({ remindersEnabled: true });
    }
  };

  const saveAiConfig = async () => {
    if (hfTokenInput.trim()) {
      await setHfToken(hfTokenInput.trim());
      setHasSavedToken(true);
      setHfTokenInput('');
    }
    const token = await getHfToken();
    const canEnable = aiConsent && (Boolean(token) || usingProxy());
    updateSettings({
      ai: {
        enabled: canEnable,
        model: modelId.trim() || DEFAULT_HF_MODEL,
      },
    });
    notifySuccess();
    setTestNote(canEnable ? 'AI companion enabled.' : 'AI companion turned off.');
  };

  const runHfTest = async () => {
    setTestingHf(true);
    setTestNote('Testing model connection…');
    const token = hfTokenInput.trim() || (await getHfToken());
    const res = await testHfMobileConnection(modelId.trim() || DEFAULT_HF_MODEL, token);
    setTestingHf(false);
    if (res.ok) {
      if (res.model && res.model !== modelId) setModelId(res.model);
      setTestNote(`Connected (${res.model ?? modelId}).`);
    } else {
      setTestNote(res.error ?? 'Connection failed.');
    }
  };

  const forgetToken = async () => {
    await setHfToken('');
    setHasSavedToken(false);
    setHfTokenInput('');
    updateSettings({ ai: { ...state.settings.ai, enabled: false } });
    setTestNote('Token erased from secure storage.');
  };

  const handleExportShare = async () => {
    const json = exportJson();
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(json);
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2200);
      return;
    }
    try {
      await Share.share({
        title: 'Nkommo Journal Backup',
        message: json,
      });
    } catch {
      await Clipboard.setStringAsync(json);
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2200);
    }
  };

  const handleCopyExport = async () => {
    await Clipboard.setStringAsync(exportJson());
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2200);
  };

  const handleImport = () => {
    const res = importBackupJson(importText);
    if (res.ok) {
      notifySuccess();
      setImportText('');
      setImportStatus(`Imported successfully (${res.entriesAdded} new entries merged).`);
    } else {
      setImportStatus(res.error ?? 'Import failed.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Eyebrow>Circle · Preferences · Privacy</Eyebrow>
      <Text style={styles.title}>Your phone, your rules.</Text>

      <View style={styles.tabBar}>
        {(
          [
            { id: 'trusted', label: 'Trusted Circle' },
            { id: 'settings', label: 'Preferences & AI' },
            { id: 'privacy', label: 'Backup & Erase' },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tabPill, active && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'trusted' && (
        <View style={styles.stack}>
          <View style={styles.noticeBanner}>
            <Feather name="info" size={14} color={COLORS.goldText} />
            <Text style={styles.noticeText}>
              Dry-run by design: Nkommo never auto-sends messages behind your back. It drafts
              a summary with zero journal text so you can copy or share it via WhatsApp/SMS yourself.
            </Text>
          </View>

          <View style={styles.card}>
            <Eyebrow>{trusted ? 'Your Trusted Contact' : 'Add Trusted Contact'}</Eyebrow>
            <TextInput
              value={cName}
              onChangeText={setCName}
              placeholder="Their name"
              placeholderTextColor={COLORS.inkMuted}
              style={styles.input}
            />
            <View style={styles.twoCol}>
              <TextInput
                value={cRel}
                onChangeText={setCRel}
                placeholder="Relationship (e.g. Sister)"
                placeholderTextColor={COLORS.inkMuted}
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={cPhone}
                onChangeText={setCPhone}
                placeholder="+233 24 000 0000"
                placeholderTextColor={COLORS.inkMuted}
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <View style={styles.switchRow}>
              <Switch
                value={cConsent}
                onValueChange={setCConsent}
                trackColor={{ false: COLORS.line, true: COLORS.forest }}
              />
              <Text style={styles.switchLabel}>
                I asked this person first and they agreed to be my check-in contact.
              </Text>
            </View>

            <View style={styles.btnRow}>
              <PrimaryButton
                label={savedContact ? 'Saved ✓' : 'Save contact'}
                disabled={!cName.trim() || !cConsent}
                onPress={saveTrusted}
                style={{ flex: 1 }}
              />
              {trusted && (
                <GhostButton
                  label="Remove"
                  onPress={() => {
                    updateSettings({ trusted: null });
                    setCName('');
                    setCPhone('');
                    setCConsent(false);
                  }}
                />
              )}
            </View>

            <Text style={styles.evidenceFoot}>
              Convergence evidence right now: <Text style={{ fontWeight: '700' }}>{concerns}/3</Text> (needs 3 converging signals over 10 days; journal text is never included).
            </Text>
          </View>

          <View style={styles.card}>
            <Eyebrow>Check-in message preview · Zero journal text</Eyebrow>
            <View style={styles.previewBox}>
              <Text style={styles.previewMono}>{previewText}</Text>
            </View>
            <View style={styles.btnRow}>
              <PrimaryButton
                label="Share via phone…"
                tone="clay"
                onPress={() => void shareDraftNatively()}
                style={{ flex: 1 }}
              />
              <GhostButton
                label={copiedDraft ? 'Copied ✓' : 'Copy'}
                onPress={() => void copyDraft()}
              />
              <GhostButton
                label="Save draft"
                onPress={() => addAlert('Saved check-in preview', previewText)}
              />
            </View>
          </View>

          {state.alerts.length > 0 && (
            <View style={styles.card}>
              <Eyebrow>Saved drafts on this phone</Eyebrow>
              {state.alerts.map((al) => (
                <View key={al.id} style={styles.draftRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.draftTitle}>
                      {al.trigger} · {formatDay(al.createdAt)}
                    </Text>
                    <Text style={styles.draftStatus}>{al.status} · preview only</Text>
                  </View>
                  {al.status === 'drafted' && (
                    <Pressable onPress={() => dismissAlert(al.id)}>
                      <Text style={styles.discardLink}>Discard</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {tab === 'settings' && (
        <View style={styles.stack}>
          {/* Profile */}
          <View style={styles.card}>
            <Eyebrow>Profile & Tone</Eyebrow>
            <Text style={styles.fieldLabel}>Name or alias</Text>
            <TextInput
              value={state.settings.displayName}
              onChangeText={(displayName) => updateSettings({ displayName })}
              placeholder="friend"
              placeholderTextColor={COLORS.inkMuted}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Writing language</Text>
            <View style={styles.twoCol}>
              {(
                [
                  { id: 'en', label: 'English' },
                  { id: 'tw-en', label: 'English + Twi / Pidgin' },
                ] as const
              ).map((opt) => {
                const active = state.settings.language === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => updateSettings({ language: opt.id })}
                    style={[styles.choiceBtn, active && styles.choiceBtnActive]}
                  >
                    <Text
                      style={[
                        styles.choiceBtnText,
                        active && styles.choiceBtnTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Native Daily Reminders */}
          <View style={styles.card}>
            <Eyebrow>Daily Reminders · On-Device Notifications</Eyebrow>
            <View style={styles.switchRow}>
              <Switch
                value={state.settings.remindersEnabled}
                onValueChange={(remindersEnabled) => updateSettings({ remindersEnabled })}
                trackColor={{ false: COLORS.line, true: COLORS.forest }}
              />
              <Text style={styles.switchLabel}>
                Morning & evening prompt questions (scheduled locally on your phone; notification holds only a short neutral question).
              </Text>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.fieldLabel}>
                  Morning ({formatClock(state.settings.morningTime)})
                </Text>
                <TextInput
                  value={state.settings.morningTime}
                  onChangeText={(morningTime) => updateSettings({ morningTime })}
                  placeholder="07:30"
                  placeholderTextColor={COLORS.inkMuted}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.fieldLabel}>
                  Evening ({formatClock(state.settings.eveningTime)})
                </Text>
                <TextInput
                  value={state.settings.eveningTime}
                  onChangeText={(eveningTime) => updateSettings({ eveningTime })}
                  placeholder="20:30"
                  placeholderTextColor={COLORS.inkMuted}
                  style={styles.input}
                />
              </View>
            </View>

            {notifPerm !== 'granted' && (
              <GhostButton
                label={
                  notifPerm === 'unsupported'
                    ? 'Notifications unavailable in this browser'
                    : 'Allow phone notifications'
                }
                disabled={notifPerm === 'unsupported'}
                onPress={() => void enableNotifications()}
              />
            )}
          </View>

          {/* Optional Hugging Face Companion */}
          <View style={styles.card}>
            <Eyebrow>Optional AI Replies · Hugging Face</Eyebrow>
            <Text style={styles.smallBody}>
              Off by default. When enabled, non-crisis entries request a short warm reflection.
              High-risk entries are blocked from ever leaving your phone. Tokens are encrypted in{' '}
              {Platform.OS === 'web' ? 'sessionStorage' : 'your phone’s SecureStore keychain'}.
            </Text>

            <View style={styles.switchRow}>
              <Switch
                value={aiConsent}
                onValueChange={setAiConsent}
                trackColor={{ false: COLORS.line, true: COLORS.forest }}
              />
              <Text style={styles.switchLabel}>
                Enable conversational AI replies for non-crisis entries
              </Text>
            </View>

            {!usingProxy() && (
              <>
                <Text style={styles.fieldLabel}>
                  Hugging Face Access Token {hasSavedToken ? '(saved securely ✓)' : ''}
                </Text>
                <TextInput
                  value={hfTokenInput}
                  onChangeText={setHfTokenInput}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder={hasSavedToken ? '•••••••••••• (paste to replace)' : 'hf_...'}
                  placeholderTextColor={COLORS.inkMuted}
                  style={styles.input}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Preferred Chat Model ID</Text>
            <TextInput
              value={modelId}
              onChangeText={setModelId}
              autoCapitalize="none"
              placeholder={DEFAULT_HF_MODEL}
              placeholderTextColor={COLORS.inkMuted}
              style={styles.input}
            />

            {testNote && <Text style={styles.statusInfo}>{testNote}</Text>}

            <View style={styles.btnRow}>
              <PrimaryButton
                label="Save AI settings"
                onPress={() => void saveAiConfig()}
                style={{ flex: 1 }}
              />
              <GhostButton
                label={testingHf ? 'Testing…' : 'Test'}
                disabled={testingHf}
                onPress={() => void runHfTest()}
              />
              {hasSavedToken && (
                <GhostButton label="Forget token" onPress={() => void forgetToken()} />
              )}
            </View>
          </View>
        </View>
      )}

      {tab === 'privacy' && (
        <View style={styles.stack}>
          <View style={styles.card}>
            <Eyebrow>Export or Sync with Website</Eyebrow>
            <Text style={styles.smallBody}>
              Your phone holds {state.entries.length} journal{' '}
              {state.entries.length === 1 ? 'entry' : 'entries'} and{' '}
              {state.checkins.length} check-ins. Export JSON to keep a personal backup or
              import a backup from the Nkommo website.
            </Text>
            <View style={styles.btnRow}>
              <PrimaryButton
                label="Share JSON backup"
                onPress={() => void handleExportShare()}
                style={{ flex: 1 }}
              />
              <GhostButton
                label={copiedBackup ? 'Copied JSON ✓' : 'Copy JSON'}
                onPress={() => void handleCopyExport()}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Eyebrow>Import JSON Backup</Eyebrow>
            <Text style={styles.smallBody}>
              Paste a JSON export from Nkommo Web or another phone. Entries merge additively by ID — nothing already on this phone is overwritten.
            </Text>
            <TextInput
              value={importText}
              onChangeText={setImportText}
              multiline
              placeholder='Paste {"app":"Nkommo", ...} here'
              placeholderTextColor={COLORS.inkMuted}
              style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
            />
            {importStatus && <Text style={styles.statusInfo}>{importStatus}</Text>}
            <PrimaryButton
              label="Merge backup onto this phone"
              disabled={!importText.trim()}
              onPress={handleImport}
            />
          </View>

          <View style={styles.card}>
            <Eyebrow>Shared-Engine Model Card</Eyebrow>
            <Text style={styles.smallBody}>
              Nkommo Mobile runs the exact same deterministic TypeScript engine (`src/engine`)
              as the web app — audited on an 82-case hand-labelled corpus:
            </Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricBig}>91.5%</Text>
                <Text style={styles.metricLabel}>Risk accuracy (n=82)</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricBig}>100%</Text>
                <Text style={styles.metricLabel}>Urgent recall</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricBig}>88.9%</Text>
                <Text style={styles.metricLabel}>Ghanaian subset</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { borderColor: 'rgba(168, 67, 63, 0.35)' }]}>
            <Eyebrow>Shared Phone / Immediate Wipe</Eyebrow>
            <Text style={styles.smallBody}>
              Sharing your phone or handing it over? Erase deletes every entry, check-in,
              safety plan item, trusted contact, and saved token from this device immediately.
            </Text>
            {!confirmWipe ? (
              <PrimaryButton
                label="Erase everything from this phone"
                tone="rose"
                onPress={() => setConfirmWipe(true)}
              />
            ) : (
              <View style={styles.btnRow}>
                <PrimaryButton
                  label="Yes, permanently erase all data"
                  tone="rose"
                  onPress={() => {
                    void wipe();
                    setConfirmWipe(false);
                  }}
                  style={{ flex: 1 }}
                />
                <GhostButton label="Cancel" onPress={() => setConfirmWipe(false)} />
              </View>
            )}
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
    paddingBottom: 36,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 23,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 3,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 3,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: COLORS.forest,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  tabPillTextActive: {
    color: '#FDFAF4',
  },
  stack: {
    gap: 12,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: COLORS.goldSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(207, 154, 53, 0.36)',
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17.5,
    color: COLORS.goldText,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  smallBody: {
    fontSize: 12.5,
    lineHeight: 18.5,
    color: COLORS.inkSoft,
  },
  input: {
    backgroundColor: COLORS.paper,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: COLORS.ink,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchLabel: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17.5,
    color: COLORS.inkSoft,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  evidenceFoot: {
    fontSize: 11.5,
    lineHeight: 17,
    color: COLORS.inkMuted,
    backgroundColor: COLORS.paperDeep,
    borderRadius: 12,
    padding: 10,
  },
  previewBox: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
  },
  previewMono: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.inkSoft,
  },
  draftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperDeep,
  },
  draftTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  draftStatus: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  discardLink: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.rose,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.paper,
    alignItems: 'center',
  },
  choiceBtnActive: {
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  choiceBtnText: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
    fontWeight: '500',
  },
  choiceBtnTextActive: {
    color: COLORS.forest,
    fontWeight: '700',
  },
  statusInfo: {
    fontSize: 12,
    color: COLORS.forest,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 10,
    alignItems: 'center',
  },
  metricBig: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.forest,
  },
  metricLabel: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});
