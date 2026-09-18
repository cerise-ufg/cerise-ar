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
import { HUNT_CHARACTERS, HUNT_TIME_SECONDS } from '../game';

const BASE = 'https://cerise.wenfur.com.br/updates';
const SCORES_URL = `${BASE}/scores`;
const LAYOUT_URL = `${BASE}/layout`;
const ADMIN_NAME = 'eduardocaixeta1934';

ViroAnimations.registerAnimations({
  huntSpin: { properties: { rotateY: '+=360' }, duration: 2800 },
});

ViroARTrackingTargets.createTargets({
  ceriseQR: {
    source: require('../../assets/qr-cerise.png'),
    orientation: 'Up',
    physicalWidth: 0.3, // print the QR at 30 cm, centered, facing up
  },
});

const charById = (id: string) => HUNT_CHARACTERS.find((c) => c.id === id);

type Placement = { id: string; pos: [number, number, number] };

function HuntScene(props: any) {
  const p = props.sceneNavigator.viroAppProps as {
    placements: Placement[];
    foundIds: string[];
    isAdmin: boolean;
    onFound: (id: string) => void;
    onMarker: (anchor: any) => void;
    onReticle: (pos: [number, number, number]) => void;
  };

  return (
    <ViroARScene
      onCameraARHitTest={(results: any) => {
        const arr = Array.isArray(results) ? results : results?.hitTestResults;
        if (!arr || !arr.length) return;
        const hit =
          arr.find((r: any) => String(r.type || '').toLowerCase().includes('plane')) || arr[0];
        const pos = hit?.transform?.position || hit?.position;
        if (pos) p.onReticle(pos);
      }}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={800} />
      <ViroSpotLight innerAngle={5} outerAngle={70} direction={[0, -1, 0]} position={[0, 4, 0]} color="#FFFFFF" />
      <ViroARImageMarker
        target="ceriseQR"
        onAnchorFound={(a: any) => p.onMarker(a)}
        onAnchorUpdated={(a: any) => p.onMarker(a)}
      >
        {p.placements.map((pl) => {
          if (!p.isAdmin && p.foundIds.includes(pl.id)) return null;
          const c = charById(pl.id);
          if (!c) return null;
          const s = c.scale;
          return (
            <ViroNode
              key={pl.id}
              position={pl.pos}
              animation={{ name: 'huntSpin', run: true, loop: true }}
            >
              <Viro3DObject
                source={c.model}
                type="GLB"
                scale={[s, s, s]}
                animation={c.danceClip ? { name: c.danceClip, run: true, loop: true } : undefined}
                onClick={() => (p.isAdmin ? undefined : p.onFound(pl.id))}
              />
            </ViroNode>
          );
        })}
      </ViroARImageMarker>
    </ViroARScene>
  );
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

// Convert a world hit point to the QR marker's local frame (yaw-only: the QR
// lies flat/facing up, so only rotation about Y matters).
function worldToLocal(
  world: [number, number, number],
  m: { pos: [number, number, number]; ry: number },
): [number, number, number] {
  const a = (-m.ry * Math.PI) / 180;
  const dx = world[0] - m.pos[0];
  const dy = world[1] - m.pos[1];
  const dz = world[2] - m.pos[2];
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [dx * c + dz * s, dy, -dx * s + dz * c];
}

type Phase = 'intro' | 'scanning' | 'placing' | 'playing' | 'done';
type Score = { name: string; seconds: number; found: number; total: number };

export default function GameScreen({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [placeIndex, setPlaceIndex] = useState(0); // admin: next character to drop
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(HUNT_TIME_SECONDS);
  const [scores, setScores] = useState<Score[] | null>(null);
  const [saving, setSaving] = useState(false);

  const total = HUNT_CHARACTERS.length;
  const reticleRef = useRef<[number, number, number] | null>(null);
  const markerRef = useRef<{ pos: [number, number, number]; ry: number } | null>(null);
  const anchoredOnce = useRef(false);
  const submitted = useRef(false);

  const won = foundIds.length >= total;
  const elapsed = HUNT_TIME_SECONDS - timeLeft;

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0 || won) { finish(); return; }
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, won]);

  const onMarker = (a: any) => {
    if (a?.position) {
      const ry = Array.isArray(a.rotation) ? a.rotation[1] : 0;
      markerRef.current = { pos: a.position, ry };
    }
    if (anchoredOnce.current) return;
    anchoredOnce.current = true;
    if (isAdmin) {
      setPhase('placing');
    } else {
      loadLayoutAndPlay();
    }
  };

  const onReticle = (pos: [number, number, number]) => { reticleRef.current = pos; };

  async function loadLayoutAndPlay() {
    let pls: Placement[] = [];
    try {
      const res = await fetch(LAYOUT_URL);
      const doc = await res.json();
      if (Array.isArray(doc.positions)) pls = doc.positions;
    } catch {}
    if (pls.length === 0) {
      // Fallback: default ring if the admin hasn't built a map yet.
      pls = HUNT_CHARACTERS.map((c, i) => {
        const ang = (i / total) * Math.PI * 2;
        const r = 2.5;
        return { id: c.id, pos: [Math.cos(ang) * r, 0.4, Math.sin(ang) * r] as [number, number, number] };
      });
    }
    setPlacements(pls);
    setPhase('playing');
  }

  // Admin: drop the current character where the reticle points.
  const placeHere = () => {
    const world = reticleRef.current;
    const m = markerRef.current;
    if (!world || !m) return;
    const local = worldToLocal(world, m);
    const c = HUNT_CHARACTERS[placeIndex];
    setPlacements((prev) => [...prev.filter((x) => x.id !== c.id), { id: c.id, pos: local }]);
    setPlaceIndex((i) => i + 1);
  };

  const skip = () => setPlaceIndex((i) => i + 1);

  async function saveLayout() {
    setSaving(true);
    try {
      await fetch(LAYOUT_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ positions: placements }),
      });
    } catch {}
    setSaving(false);
    setPhase('done');
  }

  async function finish() {
    if (submitted.current) return;
    submitted.current = true;
    setPhase('done');
    const my: Score = {
      name: name.trim() || 'Anônimo',
      seconds: foundIds.length >= total ? elapsed : HUNT_TIME_SECONDS,
      found: foundIds.length,
      total,
    };
    try {
      await fetch(SCORES_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(my) });
      const res = await fetch(SCORES_URL);
      setScores(await res.json());
    } catch { setScores([]); }
  }

  const onFound = (id: string) =>
    setFoundIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const start = () => {
    setIsAdmin(name.trim().toLowerCase() === ADMIN_NAME);
    setPhase('scanning');
  };

  const adminDonePlacing = placeIndex >= total;

  return (
    <View style={styles.root}>
      {phase !== 'intro' && (
        <ViroARSceneNavigator
          autofocus
          initialScene={{ scene: HuntScene as any }}
          viroAppProps={{ placements, foundIds, isAdmin, onFound, onMarker, onReticle }}
          style={styles.nav}
        />
      )}

      {/* Center reticle while admin is placing */}
      {phase === 'placing' && !adminDonePlacing && (
        <View pointerEvents="none" style={styles.reticleWrap}>
          <Text style={styles.reticle}>＋</Text>
        </View>
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
          {phase === 'placing' && (
            <View style={[styles.chip, { backgroundColor: Colors.purple }]}>
              <Text style={styles.chipText}>Admin · {Math.min(placeIndex, total)}/{total}</Text>
            </View>
          )}
        </View>

        {phase === 'intro' && (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.title}>Caça CERISE</Text>
            <Text style={styles.note}>
              Ache {total} personagens em AR em {Math.round(HUNT_TIME_SECONDS / 60)} min.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={Colors.muted}
              value={name}
              onChangeText={setName}
              maxLength={24}
              autoCapitalize="none"
            />
            <Pressable style={styles.cta} onPress={start}>
              <Text style={styles.ctaText}>Começar</Text>
            </Pressable>
          </View>
        )}

        {phase === 'scanning' && (
          <View style={styles.card} pointerEvents="none">
            <ActivityIndicator color={Colors.white} />
            <Text style={styles.title}>Aponte para o QR CERISE</Text>
            <Text style={styles.note}>Centralize a câmera no QR central para calibrar.</Text>
          </View>
        )}

        {/* Admin placing controls */}
        {phase === 'placing' && (
          <View style={styles.card} pointerEvents="auto">
            {!adminDonePlacing ? (
              <>
                <Text style={styles.title}>Posicionar: {HUNT_CHARACTERS[placeIndex].name}</Text>
                <Text style={styles.note}>Mire numa superfície (mira central) e toque em Colocar.</Text>
                <View style={styles.row}>
                  <Pressable style={[styles.cta, { flex: 1 }]} onPress={placeHere}>
                    <Text style={styles.ctaText}>Colocar aqui</Text>
                  </Pressable>
                  <Pressable style={[styles.ctaSecondary]} onPress={skip}>
                    <Text style={styles.ctaText}>Pular</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Mapa pronto</Text>
                <Text style={styles.note}>{placements.length} objetos posicionados. Salve para todos os jogadores.</Text>
                <Pressable style={styles.cta} onPress={saveLayout} disabled={saving}>
                  <Text style={styles.ctaText}>{saving ? 'Salvando…' : 'Salvar mapa'}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {phase === 'done' && isAdmin && (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.title}>✅ Ambiente criado!</Text>
            <Text style={styles.note}>{placements.length} objetos salvos. Os jogadores já podem caçar.</Text>
            <Pressable style={styles.cta} onPress={onClose}><Text style={styles.ctaText}>Concluir</Text></Pressable>
          </View>
        )}

        {phase === 'done' && !isAdmin && (
          <View style={styles.card} pointerEvents="auto">
            <Text style={styles.title}>{won ? '🎉 Completou!' : '⏰ Tempo esgotado'}</Text>
            <Text style={styles.note}>
              {won ? `Achou os ${total} em ${fmt(elapsed)}.` : `Achou ${foundIds.length} de ${total}.`}
            </Text>
            <Text style={styles.rankTitle}>Ranking</Text>
            {scores === null ? <ActivityIndicator color={Colors.white} /> : scores.length === 0 ? (
              <Text style={styles.note}>Sem conexão com o ranking.</Text>
            ) : (
              scores.slice(0, 8).map((s, i) => (
                <View key={i} style={styles.rankRow}>
                  <Text style={styles.rankPos}>{i + 1}º</Text>
                  <Text style={styles.rankName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.rankVal}>{s.found >= s.total ? fmt(s.seconds) : `${s.found}/${s.total}`}</Text>
                </View>
              ))
            )}
            <Pressable style={styles.ctaGhost} onPress={onClose}><Text style={styles.ctaGhostText}>Voltar ao início</Text></Pressable>
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
  reticleWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reticle: { color: Colors.cyan, fontSize: 44, fontWeight: '900' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Space.xl, paddingHorizontal: Space.md, gap: Space.sm },
  chip: { backgroundColor: Colors.scrim, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  chipText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  card: { marginHorizontal: Space.lg, marginBottom: Space.xl, backgroundColor: Colors.scrim, borderRadius: Radius.lg, padding: Space.lg, alignItems: 'center', gap: Space.sm },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  note: { color: Colors.white, textAlign: 'center', opacity: 0.9 },
  input: { alignSelf: 'stretch', backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 12, color: Colors.ink, fontSize: 16, marginTop: Space.xs },
  row: { flexDirection: 'row', gap: Space.sm, alignSelf: 'stretch' },
  cta: { marginTop: Space.sm, backgroundColor: Colors.cerise, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 30, alignItems: 'center', alignSelf: 'stretch' },
  ctaSecondary: { marginTop: Space.sm, backgroundColor: Colors.inkSoft, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
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
