import React, { useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import HomeScreen from './src/screens/HomeScreen';
import ArScreen from './src/screens/ArScreen';
import GameScreen from './src/screens/GameScreen';
import { ArModel } from './src/catalog';
import { Colors } from './src/theme';

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
    </SafeAreaProvider>
  );
}
