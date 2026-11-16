import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AdinkraMark, KenteStrip } from './src/components/Brand';
import { tapSoft } from './src/lib/haptics';
import { MobileStoreProvider, useMobileStore } from './src/lib/mobileStore';
import CheckInScreen from './src/screens/CheckInScreen';
import JournalScreen from './src/screens/JournalScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PatternsScreen from './src/screens/PatternsScreen';
import SafetyScreen from './src/screens/SafetyScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { type AppTab, COLORS } from './src/theme';

const TABS: { id: AppTab; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { id: 'journal', label: 'Journal', icon: 'message-circle' },
  { id: 'patterns', label: 'Patterns', icon: 'trending-up' },
  { id: 'checkin', label: 'Check-in', icon: 'clipboard' },
  { id: 'safety', label: 'Safety', icon: 'shield' },
  { id: 'more', label: 'Circle', icon: 'sliders' },
];

function AppShell() {
  const { ready, state } = useMobileStore();
  const [activeTab, setActiveTab] = useState<AppTab>('journal');

  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <AdinkraMark size={44} />
        <ActivityIndicator color={COLORS.forest} style={{ marginTop: 14 }} />
      </SafeAreaView>
    );
  }

  if (!state.settings.onboarded) {
    return (
      <SafeAreaView style={styles.safeRoot} edges={['top', 'bottom']}>
        <OnboardingScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top', 'bottom']}>
      <KenteStrip />

      <View style={styles.contentArea}>
        {activeTab === 'journal' && <JournalScreen onNavigate={setActiveTab} />}
        {activeTab === 'patterns' && <PatternsScreen onNavigate={setActiveTab} />}
        {activeTab === 'checkin' && <CheckInScreen onNavigate={setActiveTab} />}
        {activeTab === 'safety' && <SafetyScreen />}
        {activeTab === 'more' && <SettingsScreen />}
      </View>

      <View style={styles.bottomNav} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const isSafety = tab.id === 'safety';
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                tapSoft();
                setActiveTab(tab.id);
              }}
              style={styles.navItem}
            >
              <View
                style={[
                  styles.navIconPill,
                  active &&
                    (isSafety ? styles.navIconPillSafety : styles.navIconPillActive),
                ]}
              >
                <Feather
                  name={tab.icon}
                  size={18}
                  color={
                    active
                      ? isSafety
                        ? COLORS.rose
                        : COLORS.forest
                      : COLORS.inkMuted
                  }
                />
              </View>
              <Text
                style={[
                  styles.navLabel,
                  active &&
                    (isSafety ? { color: COLORS.rose, fontWeight: '700' } : styles.navLabelActive),
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <MobileStoreProvider>
        <AppShell />
      </MobileStoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navIconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  navIconPillActive: {
    backgroundColor: COLORS.forestSoft,
  },
  navIconPillSafety: {
    backgroundColor: COLORS.roseSoft,
  },
  navLabel: {
    fontSize: 10.5,
    color: COLORS.inkMuted,
    fontWeight: '500',
  },
  navLabelActive: {
    color: COLORS.forest,
    fontWeight: '700',
  },
});
