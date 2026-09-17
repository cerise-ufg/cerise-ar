import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Space } from '../theme';
import { ArModel } from '../catalog';

/**
 * Placeholder AR screen. The Viro-based world-tracking AR (plane detection,
 * tap-to-place, embedded animations) is wired in once @reactvision/react-viro
 * is installed and a development build is produced (Viro needs native modules,
 * so it does not run in Expo Go).
 */
export default function ArScreen({
  model,
  onClose,
}: {
  model: ArModel;
  onClose: () => void;
}) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={[styles.dot, { backgroundColor: model.accent }]} />
        <Text style={styles.title}>AR — {model.title}</Text>
        <Text style={styles.note}>
          A experiência de AR (Viro) roda num build de desenvolvimento — próximo
          passo do projeto. A base do app já está pronta.
        </Text>
      </View>
      <Pressable style={styles.btn} onPress={onClose}>
        <Text style={styles.btnText}>Voltar</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
    padding: Space.lg,
    justifyContent: 'space-between',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.md },
  dot: { width: 56, height: 56, borderRadius: 28 },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  note: { color: Colors.muted, textAlign: 'center', paddingHorizontal: Space.lg },
  btn: {
    backgroundColor: Colors.cerise,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});
