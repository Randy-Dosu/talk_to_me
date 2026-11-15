import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { questionFor } from '@shared/data/prompts';
import { dayKey, formatDay, formatTime } from '@shared/engine/id';
import type { JournalEntry, MoodBand } from '@shared/engine/types';
import AnalysisCard from '../components/AnalysisCard';
import { AdinkraMark, Eyebrow, MoodBadgePill } from '../components/Brand';
import CrisisCardMobile from '../components/CrisisCardMobile';
import VoiceModal from '../components/VoiceModal';
import { tapLight, tapSoft } from '../lib/haptics';
import {
  getHfToken,
  hfReplyMobile,
  localReflection,
  maySendToModel,
  usingProxy,
} from '../lib/hfMobile';
import {
  dismissWindow,
  isWindowDismissed,
  periodLabel,
  periodOfDay,
  promptWindow,
} from '../lib/mobileDayPrompter';
import { useMobileStore, useSortedMobileEntries } from '../lib/mobileStore';
import { type AppTab, BAND_STYLE, COLORS, FONTS } from '../theme';

const BANDS: MoodBand[] = ['heavy', 'unsettled', 'steady', 'bright'];

interface ReplyState {
  status: 'thinking' | 'ready';
  text: string;
  source: 'local' | 'hf';
  note?: string;
  model?: string;
}

export default function JournalScreen({
  onNavigate,
}: {
  onNavigate: (tab: AppTab) => void;
}) {
  const { state, addEntry, removeEntry, setFeltMood, updateSettings } = useMobileStore();
  const entries = useSortedMobileEntries();

  const [text, setText] = useState('');
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [openWhyId, setOpenWhyId] = useState<string | null>(null);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, ReplyState>>({});
  const [prompterHidden, setPrompterHidden] = useState(false);
  const lastQuestionRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const now = new Date();
  const slotWindow = promptWindow(now);
  const promptKind = slotWindow ?? (now.getHours() < 17 ? 'morning' : 'evening');

  useEffect(() => {
    if (!slotWindow) return;
    isWindowDismissed(slotWindow, now).then((dismissed) => {
      if (dismissed) setPrompterHidden(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotWindow]);

  const questionSig = `${promptKind}:${entries.length}:${entries[0]?.id ?? 'none'}:${now.getHours()}`;
  const question = useMemo(
    () => questionFor({ kind: promptKind, entries, now }, lastQuestionRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionSig],
  );

  useEffect(() => {
    lastQuestionRef.current = question;
    AsyncStorage.setItem('nkommo.mobile.lastQuestion', question).catch(() => {});
  }, [question]);

  const days = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      const k = dayKey(e.createdAt);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()].map(([key, list]) => ({
      key,
      label:
        key === dayKey(new Date())
          ? 'Today'
          : formatDay(list[0].createdAt, { weekday: 'short', day: 'numeric', month: 'short' }),
      entries: [...list].reverse(),
      mood: list[0].feltMood ?? list[0].analysis.moodBand,
    }));
  }, [entries]);

  const visible = useMemo(() => {
    const flat = [...days].reverse().flatMap((d) => d.entries);
    return filterDay ? flat.filter((e) => dayKey(e.createdAt) === filterDay) : flat;
  }, [days, filterDay]);

  const showPrompter =
    Boolean(slotWindow) && state.settings.remindersEnabled && !prompterHidden;

  const send = async () => {
    const entry = addEntry(text, usedVoice ? 'voice' : 'typed');
    if (!entry) return;
    tapLight();
    setText('');
    setUsedVoice(false);
    setFilterDay(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    if (!state.settings.ai.enabled) return;
    const token = await getHfToken();
    if (!token && !usingProxy()) return;
    if (!maySendToModel(entry.analysis, entry.text)) return;

    setReplies((prev) => ({
      ...prev,
      [entry.id]: { status: 'thinking', text: '', source: 'hf' },
    }));
    const result = await hfReplyMobile({
      text: entry.text,
      analysis: entry.analysis,
      model: state.settings.ai.model,
      token,
    });
    if (result.ok && result.model && result.model !== state.settings.ai.model) {
      updateSettings({ ai: { ...state.settings.ai, model: result.model } });
    }
    setReplies((prev) => ({
      ...prev,
      [entry.id]: result.ok
        ? { status: 'ready', text: result.text, source: 'hf', model: result.model }
        : {
            status: 'ready',
            text: localReflection(entry),
            source: 'local',
            note: result.error ?? 'Model unavailable',
          },
    }));
  };

  const name = state.settings.displayName || 'friend';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header + Day Filter */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.greeting}>
            {periodLabel(periodOfDay(now))}, {name}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onNavigate('safety')}
            style={styles.sosChip}
          >
            <Feather name="phone" size={12} color={COLORS.rose} />
            <Text style={styles.sosChipText}>Help · 112</Text>
          </Pressable>
        </View>

        {days.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayStrip}
          >
            <Pressable
              onPress={() => setFilterDay(null)}
              style={[styles.dayChip, filterDay === null && styles.dayChipActive]}
            >
              <Text
                style={[styles.dayChipText, filterDay === null && styles.dayChipTextActive]}
              >
                All ({entries.length})
              </Text>
            </Pressable>
            {days.slice(0, 14).map((d) => {
              const active = filterDay === d.key;
              return (
                <Pressable
                  key={d.key}
                  onPress={() => setFilterDay(active ? null : d.key)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <View
                    style={[
                      styles.dayDot,
                      { backgroundColor: BAND_STYLE[d.mood].dot },
                    ]}
                  />
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Conversation feed */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.feed}
        keyboardShouldPersistTaps="handled"
      >
        {showPrompter && slotWindow && (
          <View style={styles.prompterCard}>
            <View style={styles.prompterTop}>
              <Eyebrow>
                {slotWindow === 'morning' ? 'Morning check' : 'Evening reflection'}
              </Eyebrow>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss prompt"
                onPress={() => {
                  void dismissWindow(slotWindow, now);
                  setPrompterHidden(true);
                }}
              >
                <Feather name="x" size={15} color={COLORS.inkMuted} />
              </Pressable>
            </View>
            <Text style={styles.prompterQuestion}>{question}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => inputRef.current?.focus()}
              style={styles.prompterWriteBtn}
            >
              <Feather name="edit-3" size={13} color={COLORS.forest} />
              <Text style={styles.prompterWriteText}>Write</Text>
            </Pressable>
          </View>
        )}

        {visible.length === 0 && !showPrompter && (
          <View style={styles.emptyPromptRow}>
            <AdinkraMark size={26} />
            <View style={styles.emptyBubble}>
              <Text style={styles.emptyQuestion}>{question}</Text>
            </View>
          </View>
        )}

        {visible.map((entry) => {
          const risky =
            entry.analysis.risk.level === 'urgent' ||
            entry.analysis.risk.level === 'elevated';
          const shownBand = entry.feltMood ?? entry.analysis.moodBand;
          const reply = replies[entry.id];

          return (
            <View key={entry.id} style={styles.turnBlock}>
              {/* Writer bubble */}
              <View style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{entry.text}</Text>
                  <View style={styles.userMeta}>
                    {entry.source === 'voice' && (
                      <View style={styles.voiceTag}>
                        <Feather name="mic" size={10} color="rgba(251,247,240,0.75)" />
                        <Text style={styles.userMetaText}>spoken</Text>
                      </View>
                    )}
                    <Text style={styles.userMetaText}>{formatTime(entry.createdAt)}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete entry"
                      onPress={() => setConfirmDeleteId(entry.id)}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={12} color="rgba(251,247,240,0.72)" />
                    </Pressable>
                  </View>
                </View>
              </View>

              {confirmDeleteId === entry.id && (
                <View style={styles.deleteConfirmRow}>
                  <Text style={styles.deletePrompt}>Delete this entry and reading?</Text>
                  <Pressable
                    onPress={() => {
                      removeEntry(entry.id);
                      setConfirmDeleteId(null);
                    }}
                    style={styles.deleteYesBtn}
                  >
                    <Text style={styles.deleteYesText}>Delete</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmDeleteId(null)}
                    style={styles.deleteNoBtn}
                  >
                    <Text style={styles.deleteNoText}>Keep</Text>
                  </Pressable>
                </View>
              )}

              {/* Companion reading */}
              <View style={styles.assistantRow}>
                <View style={{ marginTop: 2 }}>
                  <AdinkraMark size={22} />
                </View>
                <View style={styles.assistantBody}>
                  <Text style={styles.replyText}>
                    {reply?.status === 'thinking'
                      ? 'Listening…'
                      : reply?.text ?? localReflection(entry)}
                  </Text>

                  <View style={styles.badgeWrap}>
                    <MoodBadgePill band={shownBand} />
                    <View style={styles.neutralChip}>
                      <Text style={styles.neutralChipText}>
                        distress {entry.analysis.distress}
                      </Text>
                    </View>
                    {entry.analysis.emotions.slice(0, 2).map((em) => (
                      <View key={em.label} style={styles.neutralChip}>
                        <Text style={styles.neutralChipText}>{em.label}</Text>
                      </View>
                    ))}
                    {entry.feltMood && (
                      <Text style={styles.correctedTag}>you corrected this</Text>
                    )}
                  </View>

                  {risky && (
                    <CrisisCardMobile
                      level={entry.analysis.risk.level === 'urgent' ? 'urgent' : 'elevated'}
                      compact
                      onOpenSafety={() => onNavigate('safety')}
                    />
                  )}

                  {!risky && entry.analysis.risk.subject === 'other' && (
                    <View style={styles.otherFriendCard}>
                      <Text style={styles.otherFriendText}>
                        If your friend is in danger, call{' '}
                        <Text
                          style={styles.friendTel}
                          onPress={() => void Linking.openURL('tel:112')}
                        >
                          112
                        </Text>{' '}
                        or{' '}
                        <Text
                          style={styles.friendTel}
                          onPress={() => void Linking.openURL('tel:0800678678')}
                        >
                          0800 678 678
                        </Text>
                        .{' '}
                        <Text
                          style={styles.friendTel}
                          onPress={() => onNavigate('safety')}
                        >
                          How to help a friend →
                        </Text>
                      </Text>
                    </View>
                  )}

                  <Text style={styles.sourceCaption}>
                    {reply?.source === 'hf'
                      ? `via ${reply.model ?? state.settings.ai.model}`
                      : reply?.note
                        ? `${reply.note} · on-device reading`
                        : 'on-device reading'}
                  </Text>

                  <View style={styles.actionLinks}>
                    <Pressable
                      onPress={() =>
                        setOpenWhyId(openWhyId === entry.id ? null : entry.id)
                      }
                      style={styles.smallActionBtn}
                    >
                      <Feather name="zap" size={12} color={COLORS.inkMuted} />
                      <Text style={styles.smallActionText}>why</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setCorrectingId(correctingId === entry.id ? null : entry.id)
                      }
                      style={styles.smallActionBtn}
                    >
                      <Text style={styles.smallActionText}>not quite</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onNavigate('patterns')}
                      style={styles.smallActionBtn}
                    >
                      <Text style={styles.smallActionText}>patterns</Text>
                    </Pressable>
                  </View>

                  {correctingId === entry.id && (
                    <View style={styles.overrideRow}>
                      {BANDS.map((b) => {
                        const active = shownBand === b;
                        const s = BAND_STYLE[b];
                        return (
                          <Pressable
                            key={b}
                            onPress={() => {
                              tapSoft();
                              setFeltMood(entry.id, b);
                              setCorrectingId(null);
                            }}
                            style={[
                              styles.overrideChip,
                              active && {
                                backgroundColor: s.bg,
                                borderColor: s.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.overrideChipText,
                                active && { color: s.text, fontWeight: '700' },
                              ]}
                            >
                              {s.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                      {entry.feltMood && (
                        <Pressable onPress={() => setFeltMood(entry.id, null)}>
                          <Text style={styles.resetReadingText}>use reading</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {openWhyId === entry.id && (
                    <AnalysisCard analysis={entry.analysis} compact />
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom mobile composer */}
      <View style={styles.composerOuter}>
        <View style={styles.composerBox}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Say it how you would say it…"
            placeholderTextColor={COLORS.inkMuted}
            style={styles.composerInput}
          />
          <View style={styles.composerToolbar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setVoiceOpen(true)}
              style={styles.speakBtn}
            >
              <Feather name="mic" size={16} color={COLORS.forest} />
              <Text style={styles.speakBtnText}>Speak</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send entry"
              disabled={!text.trim()}
              onPress={() => void send()}
              style={[styles.sendBtn, !text.trim() && { opacity: 0.32 }]}
            >
              <Feather name="arrow-up" size={18} color="#FDFAF4" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.composerFoot}>
          Not a diagnosis or emergency service · Danger now? Call 112
        </Text>
      </View>

      <VoiceModal
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onInsert={(spoken) => {
          setUsedVoice(true);
          setText((prev) => `${prev.trim() ? `${prev.trim()} ` : ''}${spoken}`);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    backgroundColor: COLORS.paper,
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.ink,
  },
  sosChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.roseSoft,
    borderWidth: 1,
    borderColor: 'rgba(168, 67, 63, 0.3)',
  },
  sosChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.rose,
  },
  dayStrip: {
    gap: 6,
    paddingVertical: 2,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  dayChipActive: {
    borderColor: COLORS.forest,
    backgroundColor: COLORS.forestSoft,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayChipText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  dayChipTextActive: {
    color: COLORS.forest,
    fontWeight: '600',
  },
  feed: {
    padding: 16,
    gap: 20,
    paddingBottom: 24,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  prompterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 15,
    gap: 9,
  },
  prompterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prompterQuestion: {
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 25,
    color: COLORS.ink,
    fontWeight: '500',
  },
  prompterWriteBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.forestSoft,
  },
  prompterWriteText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.forest,
  },
  emptyPromptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  emptyBubble: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyQuestion: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.ink,
  },
  turnBlock: {
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '86%',
    backgroundColor: COLORS.forest,
    borderRadius: 18,
    borderBottomRightRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
  },
  userText: {
    color: COLORS.paper,
    fontSize: 14.5,
    lineHeight: 21,
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  voiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  userMetaText: {
    fontSize: 10.5,
    color: 'rgba(251, 247, 240, 0.68)',
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  deletePrompt: {
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  deleteYesBtn: {
    backgroundColor: COLORS.rose,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  deleteYesText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteNoBtn: {
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
  },
  deleteNoText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  assistantBody: {
    flex: 1,
    gap: 8,
  },
  replyText: {
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.ink,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  neutralChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  neutralChipText: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  correctedTag: {
    fontSize: 11,
    color: COLORS.forest,
    fontWeight: '600',
  },
  otherFriendCard: {
    backgroundColor: COLORS.goldSoft,
    borderRadius: 14,
    padding: 10,
  },
  otherFriendText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.goldText,
  },
  friendTel: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  sourceCaption: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
  },
  actionLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  smallActionText: {
    fontSize: 12,
    color: COLORS.inkMuted,
    fontWeight: '500',
  },
  overrideRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  overrideChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  overrideChipText: {
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  resetReadingText: {
    fontSize: 11.5,
    color: COLORS.forest,
    textDecorationLine: 'underline',
  },
  composerOuter: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: COLORS.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  composerBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  composerInput: {
    maxHeight: 110,
    minHeight: 36,
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.ink,
  },
  composerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.forestSoft,
  },
  speakBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.forest,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerFoot: {
    textAlign: 'center',
    fontSize: 10.5,
    color: COLORS.inkMuted,
    marginTop: 5,
  },
});
