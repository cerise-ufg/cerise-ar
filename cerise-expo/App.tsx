import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Updates from 'expo-updates';
import HomeScreen from './src/screens/HomeScreen';
import ArScreen from './src/screens/ArScreen';
import GameScreen from './src/screens/GameScreen';
import { ArModel } from './src/catalog';
import { Colors, Radius, Space } from './src/theme';

/** Custom popup: when an OTA update finishes downloading, tell the user and
 *  offer to relaunch (applies it immediately). */
function UpdateModal() {
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  if (!isUpdatePending || dismissed) return null;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.mTitle}>App atualizado!</Text>
          <Text style={styles.mText}>
            Uma nova versão do CERISE AR foi baixada. Reabra para aplicar as
            novidades.
          </Text>
          <Pressable style={styles.mCta} onPress={() => Updates.reloadAsync()}>
            <Text style={styles.mCtaText}>Reabrir agora</Text>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)}>
            <Text style={styles.mLater}>Depois</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    WorkSans: require('./assets/fonts/WorkSans-Variable.ttf'),
  });
  const [arModel, setArModel] = useState<ArModel | null>(null);
  const [game, setGame] = useState(false);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.ink }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {game ? (
        <GameScreen onClose={() => setGame(false)} />
      ) : arModel ? (
        <ArScreen model={arModel} onClose={() => setArModel(null)} />
      ) : (
        <HomeScreen onOpenAr={setArModel} onOpenGame={() => setGame(true)} />
      )}
      <UpdateModal />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  modal: { backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Space.lg, alignItems: 'center', gap: Space.sm, maxWidth: 360, borderWidth: 1, borderColor: Colors.cerise },
  emoji: { fontSize: 40 },
  mTitle: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  mText: { color: Colors.muted, textAlign: 'center' },
  mCta: { marginTop: Space.sm, backgroundColor: Colors.cerise, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 40, alignSelf: 'stretch', alignItems: 'center' },
  mCtaText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  mLater: { color: Colors.muted, paddingVertical: 8 },
});
