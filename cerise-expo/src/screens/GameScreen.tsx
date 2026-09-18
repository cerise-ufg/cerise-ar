import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Viro3DObject,
  ViroAmbientLight,
  ViroARScene,
  ViroARSceneNavigator,
  ViroNode,
  ViroSpotLight,
  ViroAnimations,
} from '@reactvision/react-viro';
import { Colors, Radius, Space } from '../theme';
import { HUNT_CHARACTERS, HUNT_TIME_SECONDS, huntPositions } from '../game';

ViroAnimations.registerAnimations({
  // Placeholder "dance": spin + gentle bob (loops). Real anime GLBs can use
  // their embedded dance clip via HuntCharacter.danceClip instead.
  huntSpin: { properties: { rotateY: '+=360' }, duration: 2800 },
  huntAppear: {
    properties: { scaleX: 1, scaleY: 1, scaleZ: 1 },
    easing: 'bounce',
    duration: 500,
  },
});

const POSITIONS = huntPositions(HUNT_CHARACTERS.length);

function HuntScene(props: any) {
  const { foundIds, onFound } = props.sceneNavigator.viroAppProps as {
    foundIds: string[];
    onFound: (id: string) => void;
  };

  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={800} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={60}
        direction={[0, -1, 0]}
        position={[0, 4, 0]}
        color="#FFFFFF"
      />
      {HUNT_CHARACTERS.map((c, i) => {
        if (foundIds.includes(c.id)) return null;
        const s = c.scale;
        return (
          <ViroNode
            key={c.id}
            position={POSITIONS[i]}
            animation={{ name: 'huntSpin', run: true, loop: true }}
          >
            <Viro3DObject
              source={c.model}
              type="GLB"
              scale={[s, s, s]}
              animation={c.danceClip ? { name: c.danceClip, run: true, loop: true } : undefined}
              onClick={() => onFound(c.id)}
            />
          </ViroNode>
        );
      })}
    </ViroARScene>
  );
}

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function GameScreen({ onClose }: { onClose: () => void }) {
  const [started, setStarted] = useState(false);
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(HUNT_TIME_SECONDS);
  const total = HUNT_CHARACTERS.length;

  const won = foundIds.length >= total;
  const lost = timeLeft <= 0 && !won;
  const finished = won || lost;

  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [started, finished]);

  const onFound = (id: string) =>
    setFoundIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const restart = () => {
    setFoundIds([]);
    setTimeLeft(HUNT_TIME_SECONDS);
    setStarted(true);
  };

  return (
    <View style={styles.root}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: HuntScene as any }}
        viroAppProps={{ foundIds, onFound }}
        style={styles.nav}
      />

      {/* HUD */}
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable style={styles.chip} onPress={onClose} hitSlop={12}>
            <Text style={styles.chipText}>‹ Sair</Text>
          </Pressable>
          {started && !finished && (
            <>
              <View style={styles.chip}>
                <Text style={styles.chipText}>⏱ {fmt(timeLeft)}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: Colors.cerise }]}>
                <Text style={styles.chipText}>
                  {foundIds.length}/{total}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Start gate */}
        {!started && (
          <View style={styles.center} pointerEvents="auto">
            <Text style={styles.title}>Caça CERISE</Text>
            <Text style={styles.note}>
              {total} personagens estão dançando escondidos pelo espaço. Gire e
              ande para achá-los e toque em cada um. Você tem{' '}
              {Math.round(HUNT_TIME_SECONDS / 60)} minutos!
            </Text>
            <Pressable style={styles.cta} onPress={() => setStarted(true)}>
              <Text style={styles.ctaText}>Começar</Text>
            </Pressable>
          </View>
        )}

        {/* Results */}
        {finished && (
          <View style={styles.center} pointerEvents="auto">
            <Text style={styles.title}>{won ? '🎉 Você achou todos!' : '⏰ Tempo esgotado'}</Text>
            <Text style={styles.note}>
              {won
                ? `Achou os ${total} em ${fmt(HUNT_TIME_SECONDS - timeLeft)}.`
                : `Você achou ${foundIds.length} de ${total}.`}
            </Text>
            <Pressable style={styles.cta} onPress={restart}>
              <Text style={styles.ctaText}>Jogar de novo</Text>
            </Pressable>
            <Pressable style={styles.ctaGhost} onPress={onClose}>
              <Text style={styles.ctaGhostText}>Voltar ao início</Text>
            </Pressable>
          </View>
        )}

        {started && !finished && (
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint}>Gire o celular 360° — alguns estão atrás de você!</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  nav: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Space.xl,
    paddingHorizontal: Space.md,
    gap: Space.sm,
  },
  chip: { backgroundColor: Colors.scrim, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  chipText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  center: {
    marginHorizontal: Space.lg,
    marginBottom: Space.xl,
    backgroundColor: Colors.scrim,
    borderRadius: Radius.lg,
    padding: Space.lg,
    alignItems: 'center',
    gap: Space.sm,
  },
  title: { color: Colors.white, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  note: { color: Colors.white, textAlign: 'center', opacity: 0.9 },
  cta: {
    marginTop: Space.sm,
    backgroundColor: Colors.cerise,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  ctaText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  ctaGhost: { paddingVertical: 10 },
  ctaGhostText: { color: Colors.cyan, fontWeight: '700' },
  hintWrap: { alignItems: 'center', paddingBottom: Space.xl, paddingHorizontal: Space.lg },
  hint: {
    color: Colors.white,
    backgroundColor: Colors.scrim,
    textAlign: 'center',
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
});
