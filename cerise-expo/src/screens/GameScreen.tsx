import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Viro3DObject,
  ViroAmbientLight,
  ViroARImageMarker,
  ViroARScene,
  ViroARSceneNavigator,
  ViroARTrackingTargets,
  ViroNode,
  ViroSpotLight,
  ViroAnimations,
} from '@reactvision/react-viro';
import { Colors, Radius, Space } from '../theme';
import { HUNT_CHARACTERS, HUNT_TIME_SECONDS, huntPositions } from '../game';

const SCORES_URL = 'https://cerise.wenfur.com.br/updates/scores';

ViroAnimations.registerAnimations({
  huntSpin: { properties: { rotateY: '+=360' }, duration: 2800 },
});

// The printed QR (centered in the room, facing up) is the shared origin: every
// device anchors to the SAME physical marker, so objects land in the same spots.
ViroARTrackingTargets.createTargets({
  ceriseQR: {
    source: require('../assets/qr-cerise.png'),
    orientation: 'Up',
    physicalWidth: 0.3, // print the QR at 30 cm
  },
});

const POSITIONS = huntPositions(HUNT_CHARACTERS.length);

function HuntScene(props: any) {
  const { foundIds, onFound, onAnchor, playing } = props.sceneNavigator
    .viroAppProps as {
    foundIds: string[];
    onFound: (id: string) => void;
    onAnchor: () => void;
    playing: boolean;
  };

  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" intensity={800} />
      <ViroSpotLight innerAngle={5} outerAngle={70} direction={[0, -1, 0]} position={[0, 4, 0]} color="#FFFFFF" />
      <ViroARImageMarker target="ceriseQR" onAnchorFound={onAnchor}>
        {playing &&
          HUNT_CHARACTERS.map((c, i) => {
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
      </ViroARImageMarker>
    </ViroARScene>
  );
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

type Phase = 'intro' | 'scanning' | 'playing' | 'done';
type Score = { name: string; seconds: number; found: number; total: number };

export default function GameScreen({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [name, setName] = useState('');
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(HUNT_TIME_SECONDS);
  const [scores, setScores] = useState<Score[] | null>(null);
  const total = HUNT_CHARACTERS.length;
  const submitted = useRef(false);

  const won = foundIds.length >= total;
  const elapsed = HUNT_TIME_SECONDS - timeLeft;

  // Countdown while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { finish(); return; }
    if (won) { finish(); return; }
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, won]);

  const onAnchor = () => setPhase((p) => (p === 'scanning' ? 'playing' : p));
  const onFound = (id: string) =>
    setFoundIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  async function finish() {
    if (submitted.current) return;
    submitted.current = true;
    setPhase('done');
    const myScore: Score = {
      name: name.trim() || 'Anônimo',
      seconds: foundIds.length >= total ? elapsed : HUNT_TIME_SECONDS,
      found: foundIds.length,
      total,
    };
    try {
      await fetch(SCORES_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(myScore),
      });
      const res = await fetch(SCORES_URL);
      setScores(await res.json());
    } catch {
      setScores([]); // offline: show at least nothing rather than hang
    }
  }

  function restart() {
    submitted.current = false;
    setFoundIds([]);
    setTimeLeft(HUNT_TIME_SECONDS);
    setScores(null);
    setPhase('scanning');
  }

  return (
    <View style={styles.root}>
      {phase !== 'intro' && (
        <ViroARSceneNavigator
          autofocus
          initialScene={{ scene: HuntScene as any }}
          viroAppProps={{ foundIds, onFound, onAnchor, playing: phase === 'playing' }}
          style={styles.nav}
        />
      )}

      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable style={styles.chip} onPress={onClose} hitSlop={12}>
            <Text style={styles.chipText}>‹ Sair</Text>
          </Pressable>
          {phase === 'playing' && (
            <>
              <View style={styles.chip}><Text style={styles.chipText}>⏱ {fmt(timeLeft)}</Text></View>
              <View style={[styles.chip, { backgroundColor: Colors.cerise }]}>
                <Text style={styles.chipText}>{foundIds.length}/{total}</Text>
              </View>
            </>
          )}
        </View>

        {/* Intro: name + start */}
        {phase === 'intro' && (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.title}>Caça CERISE</Text>
            <Text style={styles.note}>
              {total} personagens dançando escondidos pelo espaço. Ache e toque em
              cada um em {Math.round(HUNT_TIME_SECONDS / 60)} minutos!
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={Colors.muted}
              value={name}
              onChangeText={setName}
              maxLength={24}
            />
            <Pressable style={styles.cta} onPress={() => setPhase('scanning')}>
              <Text style={styles.ctaText}>Começar</Text>
            </Pressable>
          </View>
        )}

        {/* Scanning: point at the shared QR */}
        {phase === 'scanning' && (
          <View style={styles.card} pointerEvents="none">
            <ActivityIndicator color={Colors.white} />
            <Text style={styles.title}>Aponte para o QR CERISE</Text>
            <Text style={styles.note}>
              Centralize a câmera no QR code central da sala para calibrar o jogo.
            </Text>
          </View>
        )}

        {/* Results + ranking */}
        {phase === 'done' && (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.title}>{won ? '🎉 Completou!' : '⏰ Tempo esgotado'}</Text>
            <Text style={styles.note}>
              {won ? `Você achou os ${total} em ${fmt(elapsed)}.` : `Você achou ${foundIds.length} de ${total}.`}
            </Text>
            <Text style={styles.rankTitle}>Ranking</Text>
            {scores === null ? (
              <ActivityIndicator color={Colors.white} />
            ) : scores.length === 0 ? (
              <Text style={styles.note}>Sem conexão com o ranking.</Text>
            ) : (
              scores.slice(0, 8).map((s, i) => (
                <View key={i} style={styles.rankRow}>
                  <Text style={styles.rankPos}>{i + 1}º</Text>
                  <Text style={styles.rankName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.rankVal}>
                    {s.found >= s.total ? fmt(s.seconds) : `${s.found}/${s.total}`}
                  </Text>
                </View>
              ))
            )}
            <Pressable style={styles.cta} onPress={restart}>
              <Text style={styles.ctaText}>Jogar de novo</Text>
            </Pressable>
            <Pressable style={styles.ctaGhost} onPress={onClose}>
              <Text style={styles.ctaGhostText}>Voltar ao início</Text>
            </Pressable>
          </View>
        )}

        {phase === 'playing' && (
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint}>Gire 360° — alguns estão atrás de você!</Text>
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Space.xl, paddingHorizontal: Space.md, gap: Space.sm },
  chip: { backgroundColor: Colors.scrim, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  chipText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  card: { marginHorizontal: Space.lg, marginBottom: Space.xl, backgroundColor: Colors.scrim, borderRadius: Radius.lg, padding: Space.lg, alignItems: 'center', gap: Space.sm },
  title: { color: Colors.white, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  note: { color: Colors.white, textAlign: 'center', opacity: 0.9 },
  input: { alignSelf: 'stretch', backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 12, color: Colors.ink, fontSize: 16, marginTop: Space.xs },
  cta: { marginTop: Space.sm, backgroundColor: Colors.cerise, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', alignSelf: 'stretch' },
  ctaText: { color: Colors.white, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  ctaGhost: { paddingVertical: 8 },
  ctaGhostText: { color: Colors.cyan, fontWeight: '700' },
  rankTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', marginTop: Space.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 4, gap: Space.sm },
  rankPos: { color: Colors.cyan, fontWeight: '800', width: 32 },
  rankName: { color: Colors.white, flex: 1 },
  rankVal: { color: Colors.white, fontWeight: '700' },
  hintWrap: { alignItems: 'center', paddingBottom: Space.xl, paddingHorizontal: Space.lg },
  hint: { color: Colors.white, backgroundColor: Colors.scrim, textAlign: 'center', paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.md, overflow: 'hidden' },
});
