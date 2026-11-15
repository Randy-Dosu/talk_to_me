import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { COLORS, FONTS } from '../theme';
import { Eyebrow, GhostButton, PrimaryButton } from './Brand';

interface WebSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getWebSpeechCtor(): (new () => WebSpeechRecognition) | null {
  if (Platform.OS !== 'web') return null;
  const w = globalThis as unknown as {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceModal({
  visible,
  onClose,
  onInsert,
}: {
  visible: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const webRecRef = useRef<WebSpeechRecognition | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const transcribeEndpoint = (process.env.EXPO_PUBLIC_TRANSCRIBE_URL ?? '').trim();

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  useEffect(() => {
    if (!visible) {
      setListening(false);
      setSeconds(0);
      setStatusNote(null);
      try {
        webRecRef.current?.stop();
      } catch {
        // ignore
      }
    }
  }, [visible]);

  const startCapture = async () => {
    setStatusNote(null);
    setSeconds(0);

    const Ctor = getWebSpeechCtor();
    if (Ctor) {
      try {
        const rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-GH';
        rec.onresult = (event) => {
          let full = '';
          for (let i = 0; i < event.results.length; i += 1) {
            full += `${event.results[i][0]?.transcript ?? ''} `;
          }
          setDraft(full.trim());
        };
        rec.onerror = (e) => {
          setStatusNote(
            e.error === 'not-allowed'
              ? 'Microphone permission blocked by browser.'
              : 'Speech recognition paused — you can also type or edit below.',
          );
          setListening(false);
        };
        rec.onend = () => setListening(false);
        webRecRef.current = rec;
        rec.start();
        setListening(true);
        return;
      } catch {
        setStatusNote('Browser speech recognition could not start.');
        return;
      }
    }

    // Native iOS / Android microphone recording via expo-audio
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setStatusNote('Microphone permission denied. Enable it in your phone settings, or use your keyboard microphone icon below.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setListening(true);
    } catch {
      setStatusNote(
        'Native recorder unavailable here — tap the text box below and press your phone keyboard’s microphone key for offline dictation.',
      );
    }
  };

  const stopCapture = async () => {
    setListening(false);
    if (webRecRef.current) {
      try {
        webRecRef.current.stop();
      } catch {
        // ignore
      }
      webRecRef.current = null;
      return;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri && transcribeEndpoint) {
        setTranscribing(true);
        try {
          const audioRes = await fetch(uri);
          const blob = await audioRes.blob();
          const up = await fetch(transcribeEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'audio/mp4' },
            body: blob,
          });
          const data = (await up.json()) as { text?: string };
          if (data.text?.trim()) {
            setDraft((prev) => `${prev ? `${prev} ` : ''}${data.text!.trim()}`);
          } else {
            setStatusNote('Recording saved locally, but no speech was detected.');
          }
        } catch {
          setStatusNote('Could not reach transcription endpoint — use your phone keyboard mic below to dictate offline.');
        } finally {
          setTranscribing(false);
        }
      } else if (uri) {
        setStatusNote(
          'Voice note captured. Without EXPO_PUBLIC_TRANSCRIBE_URL configured, Nkommo keeps your audio strictly on-device — tap the box below and use your phone keyboard’s mic icon to dictate text offline.',
        );
      }
    } catch {
      // ignore
    }
  };

  const submit = () => {
    const clean = draft.trim();
    if (!clean) return;
    onInsert(clean);
    setDraft('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Eyebrow>Voice entry</Eyebrow>
              <Text style={styles.title}>Speak in your own words</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
              <Feather name="x" size={18} color={COLORS.inkSoft} />
            </Pressable>
          </View>

          <Text style={styles.privacyNote}>
            Privacy disclosure: On-device keyboard dictation (iOS Dictation / Android Gboard mic) or
            browser speech-to-text is processed by your phone OS, not stored on Nkommo servers.
          </Text>

          <View style={styles.micBox}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop recording' : 'Start speaking'}
              onPress={() => void (listening ? stopCapture() : startCapture())}
              style={[styles.micButton, listening && styles.micButtonActive]}
            >
              <Feather
                name={listening ? 'square' : 'mic'}
                size={24}
                color="#FDFAF4"
              />
            </Pressable>
            <Text style={styles.micStatus}>
              {transcribing
                ? 'Transcribing audio…'
                : listening
                  ? `Listening · ${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(2, '0')}`
                  : 'Tap microphone to record, or use keyboard dictation below'}
            </Text>
          </View>

          {statusNote && <Text style={styles.statusBanner}>{statusNote}</Text>}

          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Your spoken words appear here — you can also tap your phone keyboard’s 🎤 key or edit before inserting…"
            placeholderTextColor={COLORS.inkMuted}
            style={styles.input}
          />

          <View style={styles.actions}>
            <GhostButton label="Cancel" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton
              label="Use in journal"
              disabled={!draft.trim()}
              onPress={submit}
              style={{ flex: 1.4 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 33, 29, 0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.paper,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    gap: 13,
    borderTopWidth: 1,
    borderColor: COLORS.line,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: COLORS.paperDeep,
  },
  privacyNote: {
    fontSize: 11.5,
    lineHeight: 17,
    color: COLORS.inkMuted,
  },
  micBox: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: COLORS.rose,
  },
  micStatus: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusBanner: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.goldText,
    backgroundColor: COLORS.goldSoft,
    borderRadius: 12,
    padding: 10,
  },
  input: {
    minHeight: 96,
    maxHeight: 160,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.ink,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
});
