import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { HUNT_CHARACTERS, HUNT_TIME_SECONDS } from '../game';

const SCORES_URL = 'https://cerise.wenfur.com.br/updates/scores';

type Vec3 = [number, number, number];
type WorldObj = { id: string; world: Vec3 };

ViroAnimations.registerAnimations({
  huntSpin: { properties: { rotateY: '+=360' }, duration: 2800 },
});

const charById = (id: string) => HUNT_CHARACTERS.find((c) => c.id === id);

function HuntScene(props: any) {
  const { worldObjs, foundIds, isPlaying, onFound, onCam } = props.sceneNavigator
    .viroAppProps as {
    worldObjs: WorldObj[];
    foundIds: string[];
    isPlaying: boolean;
    onFound: (id: string) => void;
    onCam: (pos: Vec3, fwd: Vec3) => void;
  };

  return (
    <ViroARScene
      onCameraTransformUpdate={(u: any) => {
        const t = u?.cameraTransform ?? u;
        let pos: Vec3 | null = null;
        let fwd: Vec3 | null = null;
        if (Array.isArray(t) && t.length >= 9) { pos = [t[0], t[1], t[2]]; fwd = [t[6], t[7], t[8]]; }
        else if (t?.position) { pos = t.position; fwd = t.forward; }
        if (pos && fwd) onCam(pos, fwd);
      }}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={900} />
      <ViroSpotLight innerAngle={5} outerAngle={80} direction={[0, -1, 0]} position={[0, 4, 0]} color="#FFFFFF" />
      {worldObjs.map((o) => {
        if (isPlaying && foundIds.includes(o.id)) return null; // captured -> hidden
        const c = charById(o.id);
        if (!c) return null;
        const s = c.scale;
        return (
          <ViroNode key={o.id} position={o.world} animation={{ name: 'huntSpin', run: true, loop: true }}>
            <Viro3DObject
              source={c.model}
              type="GLB"
              scale={[s, s, s]}
              animation={c.danceClip ? { name: c.danceClip, run: true, loop: true } : undefined}
              onClick={() => (isPlaying ? onFound(o.id) : undefined)}
            />
          </ViroNode>
        );
      })}
    </ViroARScene>
  );
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

type Phase = 'intro' | 'placing' | 'playing' | 'done';
type Score = { name: string; seconds: number; found: number; total: number };

export default function GameScreen({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [name, setName] = useState('');
  const [worldObjs, setWorldObjs] = useState<WorldObj[]>([]);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(HUNT_TIME_SECONDS);
  const [scores, setScores] = useState<Score[] | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [worldCreated, setWorldCreated] = useState(false);
  const [lastWasCreator, setLastWasCreator] = useState(false);

  const total = HUNT_CHARACTERS.length;
  const camPosRef = useRef<Vec3 | null>(null);
  const camFwdRef = useRef<Vec3 | null>(null);
  const submitted = useRef(false);

  const won = foundIds.length >= total;
  const elapsed = HUNT_TIME_SECONDS - timeLeft;
  const donePlacing = placeIndex >= total;

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0 || won) { finish(false); return; }
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, won]);

  const onCam = (pos: Vec3, fwd: Vec3) => { camPosRef.current = pos; camFwdRef.current = fwd; };
  const onFound = (id: string) =>
    setFoundIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  // Organizer: drop the current character 1.5 m in front of the camera.
  const placeHere = () => {
    const P = camPosRef.current, F = camFwdRef.current;
    if (!P || !F) return;
    const d = 1.5;
    const world: Vec3 = [P[0] + F[0] * d, P[1] + F[1] * d, P[2] + F[2] * d];
    const c = HUNT_CHARACTERS[placeIndex];
    setWorldObjs((prev) => [...prev.filter((x) => x.id !== c.id), { id: c.id, world }]);
    setPlaceIndex((i) => i + 1);
  };
  const skip = () => setPlaceIndex((i) => i + 1);

  function concludeCreation() {
    setWorldCreated(true);
    setLastWasCreator(true);
    setPhase('done');
  }

  function startHunt() {
    submitted.current = false;
    setFoundIds([]);
    setTimeLeft(HUNT_TIME_SECONDS);
    setScores(null);
    setGaveUp(false);
    setLastWasCreator(false);
    setPhase('playing');
  }

  async function finish(gaveUpNow: boolean) {
    if (submitted.current) return;
    submitted.current = true;
    setGaveUp(gaveUpNow);
    setPhase('done');
    const my: Score = {
      name: name.trim() || 'Anônimo',
      seconds: won ? elapsed : HUNT_TIME_SECONDS,
      found: foundIds.length,
      total,
    };
    try {
      await fetch(SCORES_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(my) });
      const res = await fetch(SCORES_URL);
      setScores(await res.json());
    } catch { setScores([]); }
  }

  function playAgain() { setName(''); setPhase('intro'); }

  const sceneMounted = worldCreated || phase === 'placing' || phase === 'playing' || phase === 'done';

  return (
    <View style={styles.root}>
      {sceneMounted && (
        <ViroARSceneNavigator
          autofocus
          initialScene={{ scene: HuntScene as any }}
          viroAppProps={{ worldObjs, foundIds, isPlaying: phase === 'playing', onFound, onCam }}
          style={styles.nav}
        />
      )}

      {/* Reticle while the organizer is placing */}
      {phase === 'placing' && !donePlacing && (
        <View pointerEvents="none" style={styles.reticleWrap}>
          <Text style={styles.reticle}>＋</Text>
        </View>
      )}

      {/* HUD while playing */}
      {phase === 'playing' && (
        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.topBar} pointerEvents="box-none">
            <View style={styles.chip}><Text style={styles.chipText}>⏱ {fmt(timeLeft)}</Text></View>
            <View style={[styles.chip, { backgroundColor: Colors.cerise }]}>
              <Text style={styles.chipText}>{foundIds.length}/{total}</Text>
            </View>
            <Pressable style={[styles.chip, { backgroundColor: Colors.purple }]} onPress={() => finish(true)} hitSlop={10}>
              <Text style={styles.chipText}>Desistir</Text>
            </Pressable>
          </View>
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint}>Gire 360° e toque nos personagens para capturá-los!</Text>
          </View>
        </View>
      )}

      {/* Organizer placing controls */}
      {phase === 'placing' && (
        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.topBar} pointerEvents="box-none">
            <View style={[styles.chip, { backgroundColor: Colors.purple }]}>
              <Text style={styles.chipText}>Criar mundo · {Math.min(placeIndex, total)}/{total}</Text>
            </View>
          </View>
          <View style={styles.placeCard} pointerEvents="auto">
            {!donePlacing ? (
              <>
                <Text style={styles.note}>Posicionar: <Text style={{ fontWeight: '800' }}>{HUNT_CHARACTERS[placeIndex].name}</Text></Text>
                <Text style={styles.hintSmall}>Aponte para onde quer o personagem e toque em Colocar.</Text>
                <View style={styles.row}>
                  <Pressable style={[styles.cta, { flex: 1 }]} onPress={placeHere}><Text style={styles.ctaText}>Colocar aqui</Text></Pressable>
                  <Pressable style={styles.ctaSecondary} onPress={skip}><Text style={styles.ctaText}>Pular</Text></Pressable>
                </View>
                {placeIndex > 0 && (
                  <Pressable onPress={concludeCreation}><Text style={styles.later}>Concluir agora ({worldObjs.length} colocados)</Text></Pressable>
                )}
              </>
            ) : (
              <>
                <Text style={styles.note}>{worldObjs.length} personagens posicionados.</Text>
                <Pressable style={styles.cta} onPress={concludeCreation}><Text style={styles.ctaText}>Concluir criação</Text></Pressable>
              </>
            )}
          </View>
        </View>
      )}

      {/* Intro popup */}
      <Modal transparent visible={phase === 'intro'} animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            {!worldCreated ? (
              <>
                <Text style={styles.title}>🌍 Criar o mundo</Text>
                <Text style={styles.note}>
                  Você é o organizador: posicione os {total} personagens pelo espaço com
                  "Colocar aqui". Sua rodada NÃO conta no placar.
                </Text>
                <Pressable style={styles.cta} onPress={() => { setWorldObjs([]); setPlaceIndex(0); setPhase('placing'); }}>
                  <Text style={styles.ctaText}>Começar a posicionar</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>🎯 Caça CERISE</Text>
                <Text style={styles.note}>
                  Encontre {total} personagens em AR em {Math.round(HUNT_TIME_SECONDS / 60)} minutos. Toque em cada um para capturar!
                </Text>
                <TextInput style={styles.input} placeholder="Digite seu nome" placeholderTextColor={Colors.muted} value={name} onChangeText={setName} maxLength={24} />
                <Pressable style={[styles.cta, !name.trim() && { opacity: 0.5 }]} disabled={!name.trim()} onPress={startHunt}>
                  <Text style={styles.ctaText}>Começar a caça</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={onClose}><Text style={styles.later}>Sair</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* Results popup */}
      <Modal transparent visible={phase === 'done'} animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            {lastWasCreator ? (
              <>
                <Text style={styles.title}>✅ Mundo criado!</Text>
                <Text style={styles.note}>Os personagens estão posicionados. Não feche o app — passe o celular para o primeiro jogador.</Text>
                <Pressable style={styles.cta} onPress={playAgain}><Text style={styles.ctaText}>Passar o celular</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>{won ? '🎉 Completou!' : gaveUp ? '🏳️ Você desistiu' : '⏰ Tempo esgotado'}</Text>
                <Text style={styles.note}>{won ? `Achou os ${total} em ${fmt(elapsed)}!` : `Você capturou ${foundIds.length} de ${total}.`}</Text>
                <Text style={styles.rankTitle}>🏆 Placar (por tempo)</Text>
                {scores === null ? <ActivityIndicator color={Colors.white} /> : scores.length === 0 ? (
                  <Text style={styles.note}>Sem conexão com o placar.</Text>
                ) : (
                  scores.slice(0, 8).map((s, i) => (
                    <View key={i} style={styles.rankRow}>
                      <Text style={styles.rankPos}>{i + 1}º</Text>
                      <Text style={styles.rankName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.rankVal}>{s.found >= s.total ? fmt(s.seconds) : `${s.found}/${s.total}`}</Text>
                    </View>
                  ))
                )}
                <Pressable style={styles.cta} onPress={playAgain}><Text style={styles.ctaText}>Jogar de novo</Text></Pressable>
              </>
            )}
            <Pressable onPress={onClose}><Text style={styles.later}>Sair</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  nav: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  reticleWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reticle: { color: Colors.cyan, fontSize: 44, fontWeight: '900' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Space.xl, paddingHorizontal: Space.md, gap: Space.sm },
  chip: { backgroundColor: Colors.scrim, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  chipText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  hintWrap: { alignItems: 'center', paddingBottom: Space.xl, paddingHorizontal: Space.lg },
  hint: { color: Colors.white, backgroundColor: Colors.scrim, textAlign: 'center', paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.md, overflow: 'hidden' },
  hintSmall: { color: Colors.white, opacity: 0.8, fontSize: 12, textAlign: 'center' },
  placeCard: { marginHorizontal: Space.lg, marginBottom: Space.xl, backgroundColor: Colors.scrim, borderRadius: Radius.lg, padding: Space.md, alignItems: 'center', gap: Space.sm },
  row: { flexDirection: 'row', gap: Space.sm, alignSelf: 'stretch' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  modal: { width: '100%', maxWidth: 380, backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Space.lg, alignItems: 'center', gap: Space.sm, borderWidth: 1, borderColor: Colors.cerise },
  title: { color: Colors.white, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  note: { color: Colors.white, textAlign: 'center', opacity: 0.9 },
  input: { alignSelf: 'stretch', backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 12, color: Colors.ink, fontSize: 16, marginTop: Space.xs },
  cta: { marginTop: Space.sm, backgroundColor: Colors.cerise, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 30, alignItems: 'center', alignSelf: 'stretch' },
  ctaSecondary: { marginTop: Space.sm, backgroundColor: Colors.inkSoft, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: Colors.white, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  later: { color: Colors.muted, paddingVertical: 8 },
  rankTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', marginTop: Space.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingVertical: 4, gap: Space.sm },
  rankPos: { color: Colors.cyan, fontWeight: '800', width: 32 },
  rankName: { color: Colors.white, flex: 1 },
  rankVal: { color: Colors.white, fontWeight: '700' },
});
