import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Space } from '../theme';
import {
  ArModel,
  CATEGORIES,
  CAT_ALL,
  MODELS,
  creditsText,
  inCategory,
} from '../catalog';

type Props = { onOpenAr: (model: ArModel) => void };

export default function HomeScreen({ onOpenAr }: Props) {
  const [category, setCategory] = useState<string>(CAT_ALL);
  const [selectedId, setSelectedId] = useState<string>(MODELS[0].id);

  const visible = useMemo(() => inCategory(category), [category]);
  const selected =
    visible.find((m) => m.id === selectedId) ?? visible[0] ?? MODELS[0];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header / brand */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>CERISE</Text>
          </View>
          <Pressable
            onPress={() => Alert.alert('Créditos dos modelos', creditsText())}
            hitSlop={12}
          >
            <Text style={styles.credits}>Créditos</Text>
          </Pressable>
        </View>

        <Text style={styles.h1}>Realidade Aumentada</Text>
        <Text style={styles.sub}>
          Escolha um modelo e posicione no mundo real.
        </Text>

        {/* Category chips */}
        <FlatList
          data={CATEGORIES}
          keyExtractor={(c) => c}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const active = item === category;
            return (
              <Pressable
                onPress={() => setCategory(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />

        {/* Model carousel */}
        <FlatList
          data={visible}
          keyExtractor={(m) => m.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => {
            const active = item.id === selected.id;
            return (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                style={[
                  styles.card,
                  { borderColor: active ? item.accent : 'transparent' },
                ]}
              >
                <View style={[styles.cardDot, { backgroundColor: item.accent }]} />
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
                {item.animated && <Text style={styles.badge}>animado</Text>}
              </Pressable>
            );
          }}
        />

        {/* Detail + CTA */}
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>{selected.title}</Text>
          <Text style={styles.detailSub}>{selected.subtitle}</Text>
          <Text style={styles.detailMeta}>
            {selected.category} · {selected.license}
          </Text>
          <Pressable
            style={[styles.cta, { backgroundColor: selected.accent }]}
            onPress={() => onOpenAr(selected)}
          >
            <Text style={styles.ctaText}>Ver em AR</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink, paddingHorizontal: Space.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Space.md,
  },
  logoBadge: {
    backgroundColor: Colors.cerise,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  logoText: { color: Colors.white, fontWeight: '800', letterSpacing: 2 },
  credits: { color: Colors.cyan, fontWeight: '600' },
  h1: { color: Colors.white, fontSize: 28, fontWeight: '800', marginTop: Space.lg },
  sub: { color: Colors.muted, marginTop: 4, marginBottom: Space.md },
  chipsRow: { gap: Space.sm, paddingVertical: Space.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.inkSoft,
  },
  chipActive: { backgroundColor: Colors.cerise },
  chipText: { color: Colors.muted, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  carousel: { gap: Space.md, paddingVertical: Space.md },
  card: {
    width: 160,
    height: 150,
    borderRadius: Radius.lg,
    backgroundColor: Colors.inkSoft,
    padding: Space.md,
    borderWidth: 2,
    justifyContent: 'flex-end',
  },
  cardDot: {
    position: 'absolute',
    top: Space.md,
    left: Space.md,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  cardTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  cardSub: { color: Colors.muted, fontSize: 12, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: Space.md,
    right: Space.md,
    color: Colors.ink,
    backgroundColor: Colors.cyan,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  detail: {
    backgroundColor: Colors.inkSoft,
    borderRadius: Radius.lg,
    padding: Space.lg,
    marginTop: Space.sm,
    marginBottom: Space.xl,
  },
  detailTitle: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  detailSub: { color: Colors.muted, marginTop: 2 },
  detailMeta: { color: Colors.muted, fontSize: 12, marginTop: 8 },
  cta: {
    marginTop: Space.lg,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});
