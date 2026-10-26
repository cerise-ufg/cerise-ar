import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Colors, Radius, Space } from '../theme';
import { SOFT } from '../ui';
import {
  ArModel,
  CATEGORIES,
  CAT_ALL,
  MODELS,
  inCategory,
} from '../catalog';

const VERSION_LABEL = `v${Constants.expoConfig?.version ?? Updates.runtimeVersion ?? '1.1.0'} · ${(Updates.updateId || 'base').slice(0, 8)}`;

type Props = {
  onOpenAr: (model: ArModel) => void;
  onOpen3d: (model: ArModel) => void;
  onOpenGame: () => void;
  onCreate: () => void;
  onModels: () => void;
  onSettings: () => void;
  onAbout: () => void;
  modelsCount: number;
  activeCount: number;
  arAvailable: boolean;
};

export default function HomeScreen(p: Props) {
  const [category, setCategory] = useState<string>(CAT_ALL);
  const [selectedId, setSelectedId] = useState<string>(MODELS[0].id);
  const scroll = useRef<ScrollView>(null);
  const catalogY = useRef(0);

  const visible = useMemo(() => inCategory(category), [category]);
  const selected =
    visible.find((m) => m.id === selectedId) ?? visible[0] ?? MODELS[0];

  const tiles = [
    { key: 'create', icon: '✨', title: 'Criar modelo 3D', sub: 'foto → objeto 3D', color: Colors.cerise, onPress: p.onCreate },
    {
      key: 'models',
      icon: '🧊',
      title: 'Meus modelos',
      sub: p.activeCount > 0 ? `${p.activeCount} gerando…` : p.modelsCount === 1 ? '1 modelo' : `${p.modelsCount} modelos`,
      color: Colors.purple,
      onPress: p.onModels,
    },
    {
      key: 'catalog',
      icon: '🪐',
      title: 'Catálogo',
      sub: `${MODELS.length} modelos em RA`,
      color: '#1C6E8C',
      onPress: () => scroll.current?.scrollTo({ y: catalogY.current, animated: true }),
    },
    { key: 'game', icon: '🎯', title: 'Caça CERISE', sub: 'ache 10 personagens', color: '#C25400', onPress: p.onOpenGame },
  ].filter((t) => p.arAvailable || t.key !== 'game'); // sem RA no build (simulador) nao ha jogo

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false}>
        {/* Header / brand */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/emblem.png')}
              style={styles.emblem}
              resizeMode="contain"
            />
            <Text style={styles.brand}>
              CERISE <Text style={{ color: Colors.cerise }}>AR</Text>
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={p.onAbout} hitSlop={10} accessibilityRole="button" accessibilityLabel="Sobre">
              <Text style={styles.headerLink}>Sobre</Text>
            </Pressable>
            <Pressable onPress={p.onSettings} hitSlop={10} style={styles.gear} accessibilityRole="button" accessibilityLabel="Configurações">
              <Text style={styles.gearText}>⚙</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.h1}>Realidade Aumentada</Text>
        <Text style={styles.sub}>
          Crie modelos 3D a partir de fotos e posicione-os no mundo real.
        </Text>

        {/* Entradas principais */}
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <Pressable
              key={t.key}
              onPress={t.onPress}
              style={({ pressed }) => [styles.tile, { backgroundColor: t.color }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={t.title}
            >
              <Text style={styles.tileIcon}>{t.icon}</Text>
              <Text style={styles.tileTitle}>{t.title}</Text>
              <Text style={styles.tileSub}>{t.sub}</Text>
            </Pressable>
          ))}
        </View>

        <View onLayout={(e) => (catalogY.current = e.nativeEvent.layout.y)}>
          <Text style={styles.h2}>Catálogo de modelos</Text>
        </View>

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
            {selected.category} · {selected.license} · {selected.author}
          </Text>
          <View style={styles.ctaRow}>
            {p.arAvailable ? (
              <Pressable
                style={[styles.cta, { backgroundColor: selected.accent }]}
                onPress={() => p.onOpenAr(selected)}
              >
                <Text style={styles.ctaText}>Ver em RA</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.cta, styles.ctaOutline, { borderColor: selected.accent }]}
              onPress={() => p.onOpen3d(selected)}
            >
              <Text style={[styles.ctaText, { color: Colors.white }]}>Ver em 3D</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.version}>{VERSION_LABEL}</Text>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  emblem: { width: 34, height: 34 },
  brand: { color: Colors.white, fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  headerLink: { color: Colors.cyan, fontWeight: '600' },
  gear: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.inkSoft, alignItems: 'center', justifyContent: 'center' },
  gearText: { color: Colors.white, fontSize: 20 },
  h1: { color: Colors.white, fontSize: 28, fontWeight: '800', marginTop: Space.lg },
  sub: { color: SOFT, marginTop: 4, marginBottom: Space.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    minHeight: 118,
    borderRadius: Radius.lg,
    padding: Space.md,
    justifyContent: 'flex-end',
  },
  tileIcon: { fontSize: 26, position: 'absolute', top: Space.md, left: Space.md },
  tileTitle: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  tileSub: { color: Colors.white, opacity: 0.85, fontSize: 12, marginTop: 2 },
  h2: { color: Colors.white, fontSize: 20, fontWeight: '800', marginTop: Space.lg },
  chipsRow: { gap: Space.sm, paddingVertical: Space.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.inkSoft,
  },
  chipActive: { backgroundColor: Colors.cerise },
  chipText: { color: SOFT, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  carousel: { gap: Space.md, paddingVertical: Space.md },
  card: {
    width: 160,
    height: 140,
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
  cardSub: { color: SOFT, fontSize: 12, marginTop: 2 },
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
  detailSub: { color: SOFT, marginTop: 2 },
  detailMeta: { color: SOFT, fontSize: 12, marginTop: 8 },
  ctaRow: { flexDirection: 'row', gap: Space.sm, marginTop: Space.lg },
  cta: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaOutline: { borderWidth: 2 },
  ctaText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  version: { color: SOFT, fontSize: 11, textAlign: 'center', marginBottom: Space.md, opacity: 0.7 },
});
