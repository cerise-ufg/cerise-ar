import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Colors, Radius, Space } from '../theme';
import { Banner, Button, Card, Chip, ProgressBar, ScreenHeader, SOFT } from '../ui';
import { PRESETS, Preset, GeneratedModel, isActive } from '../gen3d/types';
import { useSettings } from '../gen3d/settings';
import { MAX_IMAGE_BYTES, errorMessage, getHealth } from '../gen3d/api';
import { STATUS_LABEL, cancel, createFromPhoto, formatBytes, formatEta, formatMs, retry, useModel } from '../gen3d/jobs';

type Props = {
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenModels: () => void;
  onView3d: (m: GeneratedModel) => void;
  onViewAr: (m: GeneratedModel) => void;
  arAvailable: boolean;
  /** So em build de teste: foto de exemplo ja copiada para o app e inicio automatico. */
  testPhotoUri?: string;
  autoStart?: boolean;
  initialPreset?: Preset;
};

type Photo = { uri: string; mimeType?: string; width?: number; height?: number; fileSize?: number };
type ServerState =
  | { kind: 'checking' }
  | { kind: 'ok'; text: string }
  | { kind: 'busy'; title: string; text: string }
  | { kind: 'down'; text: string };

/** Estados do /health do servidor real alem de "ok" (o pedido e aceito, mas espera na fila). */
const HEALTH_NOT_READY: Record<string, { title: string; text: string }> = {
  loading: { title: 'Servidor 3D iniciando', text: 'O modelo de IA está carregando (cerca de 2 min). Pedidos enviados agora esperam na fila.' },
  paused: { title: 'Servidor 3D em pausa', text: 'A geração está pausada pela equipe. Pedidos enviados agora esperam na fila.' },
  degraded: { title: 'Servidor 3D sem GPU disponível', text: 'Nenhum worker de geração está ativo. Pedidos enviados agora esperam na fila.' },
};

/** "Hunyuan3D-2 Turbo (dit-v2-0-turbo + ...)" -> "Hunyuan3D-2 Turbo" */
export const shortModelName = (m?: string) => (m || 'modelo 3D').split(' (')[0];

export default function CreateScreen({ onBack, onOpenSettings, onOpenModels, onView3d, onViewAr, arAvailable, testPhotoUri, autoStart, initialPreset }: Props) {
  const { serverUrl } = useSettings();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [preset, setPreset] = useState<Preset>(initialPreset ?? 'padrao');
  const [texture, setTexture] = useState(true);
  const [removeBg, setRemoveBg] = useState(true);
  const [jobLocalId, setJobLocalId] = useState<string | null>(null);
  const [server, setServer] = useState<ServerState>({ kind: 'checking' });
  const job = useModel(jobLocalId);
  const scroll = useRef<ScrollView>(null);

  const checkServer = useCallback(async () => {
    setServer({ kind: 'checking' });
    try {
      const { health, ms } = await getHealth(serverUrl);
      const fila = health.queue_length === 1 ? '1 pedido na fila' : `${health.queue_length} pedidos na fila`;
      const gpu = health.gpu && health.gpu !== 'desconhecida' ? ` · ${health.gpu}` : '';
      const text = `${shortModelName(health.model)}${gpu} · ${fila} · ${ms} ms`;
      const notReady = health.status !== 'ok' ? HEALTH_NOT_READY[health.status] ?? { title: `Servidor 3D: ${health.status}`, text: 'Pedidos enviados agora podem demorar.' } : null;
      setServer(notReady ? { kind: 'busy', title: notReady.title, text: `${notReady.text}\n${text}` } : { kind: 'ok', text });
    } catch (e) {
      setServer({ kind: 'down', text: errorMessage(e) });
    }
  }, [serverUrl]);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  // Mantem o cartao de progresso visivel quando o estado muda (fila -> gerando -> pronto).
  useEffect(() => {
    if (job) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 300);
  }, [job?.status]);

  // Build de teste: foto de exemplo vinda do link cerisear://create?photo=...
  useEffect(() => {
    if (!testPhotoUri) return;
    Image.getSize(
      testPhotoUri,
      (width, height) => setPhoto({ uri: testPhotoUri, mimeType: 'image/jpeg', width, height, fileSize: new File(testPhotoUri).size }),
      () => setPhoto({ uri: testPhotoUri, mimeType: 'image/jpeg' }),
    );
  }, [testPhotoUri]);

  useEffect(() => {
    if (autoStart && photo && !jobLocalId && photo.uri === testPhotoUri) {
      const t = setTimeout(start, 1500);
      return () => clearTimeout(t);
    }
  }, [autoStart, photo]);

  async function pick(fromCamera: boolean) {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Câmera bloqueada', 'Permita o acesso à câmera nas configurações do aparelho para fotografar o objeto.');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, exif: false };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      let size = a.fileSize;
      try {
        size = size ?? new File(a.uri).size;
      } catch {}
      if (size && size > MAX_IMAGE_BYTES) {
        Alert.alert('Imagem grande demais', `A foto tem ${formatBytes(size)}; o limite do servidor é 15 MB.`);
        return;
      }
      setPhoto({ uri: a.uri, mimeType: a.mimeType ?? undefined, width: a.width, height: a.height, fileSize: size });
      setJobLocalId(null);
    } catch (e) {
      Alert.alert('Não foi possível abrir', errorMessage(e));
    }
  }

  function start() {
    if (!photo) return;
    const id = createFromPhoto(photo.uri, photo.mimeType, { preset, texture, remove_background: removeBg });
    setJobLocalId(id);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 250); // mostra o cartao de progresso
  }

  async function doCancel() {
    if (!job) return;
    const msg = await cancel(job.id);
    if (msg) Alert.alert('Cancelado', msg);
  }

  const busy = !!job && isActive(job);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <ScreenHeader title="Criar modelo 3D" onBack={onBack} />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: Space.xl, gap: Space.md }} showsVerticalScrollIndicator={false}>
        {server.kind === 'down' ? (
          <Banner
            tone="warn"
            title="Servidor 3D não respondeu"
            text={`${server.text}\n${serverUrl}`}
            action={
              <View style={st.row}>
                <Button small variant="outline" color={Colors.orange} label="Tentar de novo" onPress={checkServer} />
                <Button small variant="ghost" color={Colors.cyan} label="Configurações" onPress={onOpenSettings} />
              </View>
            }
          />
        ) : server.kind === 'ok' ? (
          <Banner tone="ok" title="Servidor 3D online" text={server.text} />
        ) : server.kind === 'busy' ? (
          <Banner
            tone="warn"
            title={server.title}
            text={server.text}
            action={
              <View style={st.row}>
                <Button small variant="outline" color={Colors.orange} label="Verificar de novo" onPress={checkServer} />
              </View>
            }
          />
        ) : (
          <Banner tone="info" title="Verificando o servidor 3D…" text={serverUrl} />
        )}

        {/* 1. Foto */}
        <Card>
          <Text style={st.step}>1 · Foto do objeto</Text>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={st.preview} resizeMode="cover" />
          ) : (
            <View style={[st.preview, st.placeholder]}>
              <Text style={st.placeholderIcon}>📷</Text>
              <Text style={st.placeholderText}>Fotografe um objeto inteiro, bem iluminado e com fundo simples.</Text>
            </View>
          )}
          {photo ? (
            <Text style={st.meta}>
              {photo.width}×{photo.height} px {photo.fileSize ? `· ${formatBytes(photo.fileSize)}` : ''}
            </Text>
          ) : null}
          <View style={st.row}>
            <Button style={{ flex: 1 }} label="Tirar foto" onPress={() => pick(true)} disabled={busy} />
            <Button style={{ flex: 1 }} variant="outline" color={Colors.cyan} label="Galeria" onPress={() => pick(false)} disabled={busy} />
          </View>
        </Card>

        {/* 2. Opcoes */}
        <Card>
          <Text style={st.step}>2 · Qualidade</Text>
          <View style={st.row}>
            {PRESETS.map((p) => (
              <Chip key={p.id} label={p.label} active={preset === p.id} onPress={() => !busy && setPreset(p.id)} />
            ))}
          </View>
          <Text style={st.meta}>{PRESETS.find((p) => p.id === preset)?.hint}</Text>
          <View style={st.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.switchLabel}>Textura colorida</Text>
              <Text style={st.meta}>aplica as cores da foto no modelo</Text>
            </View>
            <Switch value={texture} onValueChange={setTexture} disabled={busy} trackColor={{ true: Colors.cerise, false: '#4A3656' }} thumbColor={Colors.white} />
          </View>
          <View style={st.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.switchLabel}>Remover fundo</Text>
              <Text style={st.meta}>isola o objeto antes de gerar</Text>
            </View>
            <Switch value={removeBg} onValueChange={setRemoveBg} disabled={busy} trackColor={{ true: Colors.cerise, false: '#4A3656' }} thumbColor={Colors.white} />
          </View>
        </Card>

        {!job ? (
          <Button label="Gerar modelo 3D" onPress={start} disabled={!photo} />
        ) : (
          <JobCard job={job} onCancel={doCancel} onRetry={() => retry(job.id)} onView3d={() => onView3d(job)} onViewAr={() => onViewAr(job)} onOpenModels={onOpenModels} arAvailable={arAvailable} onNew={() => { setJobLocalId(null); setPhoto(null); }} />
        )}

        <Text style={st.privacy}>
          A foto é enviada ao servidor do CERISE apenas para gerar o modelo 3D e é apagada depois. Veja a política de privacidade em Sobre.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function JobCard({
  job,
  onCancel,
  onRetry,
  onView3d,
  onViewAr,
  onOpenModels,
  onNew,
  arAvailable,
}: {
  job: GeneratedModel;
  onCancel: () => void;
  onRetry: () => void;
  onView3d: () => void;
  onViewAr: () => void;
  onOpenModels?: () => void;
  onNew?: () => void;
  arAvailable: boolean;
}) {
  const active = isActive(job);
  let line = '';
  if (job.status === 'uploading') line = `Enviando a foto… ${job.progress}%`;
  else if (job.status === 'queued') line = `Posição ${job.position ?? '?'} na fila · ${formatEta(job.etaSeconds)}`;
  else if (job.status === 'running') line = `${job.stage || 'gerando'} · ${job.progress}% · ${formatEta(job.etaSeconds)}`;
  else if (job.status === 'downloading') line = `Baixando o modelo… ${job.progress}%`;
  else if (job.status === 'ready')
    line = `Pronto · ${formatBytes(job.glbBytes)}${(job.stats as any)?.mock ? ' · servidor MOCK (GLB de exemplo)' : job.cached ? ' · do cache do servidor' : ''}`;
  else if (job.status === 'cancelled') line = 'Cancelado';
  const local = (job.stats as any)?.local;

  return (
    <Card style={{ borderWidth: 1.5, borderColor: job.status === 'error' ? Colors.cerise : job.status === 'ready' ? Colors.green : '#4A3656' }}>
      <View style={st.rowBetween}>
        <Text style={st.step}>{STATUS_LABEL[job.status]}</Text>
        <Text style={st.meta}>{PRESETS.find((p) => p.id === job.options.preset)?.label}{job.options.texture ? ' · textura' : ''}</Text>
      </View>
      {job.status === 'ready' && job.thumbUri ? <Image source={{ uri: job.thumbUri }} style={st.thumb} resizeMode="cover" /> : null}
      {active ? <ProgressBar value={job.status === 'queued' ? 0 : job.progress} indeterminate={job.status === 'queued'} /> : null}
      {line ? <Text style={st.jobLine}>{line}</Text> : null}
      {job.status === 'error' ? <Text style={st.error}>{job.error}</Text> : null}
      {job.status === 'ready' && local ? (
        <Text style={st.meta}>
          {local.vertices?.toLocaleString?.('pt-BR') ?? local.vertices} vértices · {local.triangles?.toLocaleString?.('pt-BR') ?? local.triangles} triângulos · {local.textures} textura(s)
          {job.timings?.totalMs ? ` · ${formatMs(job.timings.totalMs)} no total` : ''}
        </Text>
      ) : null}
      <View style={st.row}>
        {active ? <Button style={{ flex: 1 }} variant="outline" color={Colors.orange} label="Cancelar" onPress={onCancel} /> : null}
        {job.status === 'error' || job.status === 'cancelled' ? <Button style={{ flex: 1 }} label="Tentar de novo" onPress={onRetry} /> : null}
        {job.status === 'ready' ? <Button style={{ flex: 1 }} label="Ver em 3D" onPress={onView3d} /> : null}
        {job.status === 'ready' && arAvailable ? <Button style={{ flex: 1 }} color={Colors.purple} label="Ver em RA" onPress={onViewAr} /> : null}
      </View>
      {job.status === 'ready' && (onOpenModels || onNew) ? (
        <View style={st.row}>
          {onOpenModels ? <Button small style={{ flex: 1 }} variant="outline" color={Colors.cyan} label="Meus modelos" onPress={onOpenModels} /> : null}
          {onNew ? <Button small style={{ flex: 1 }} variant="outline" color={Colors.cyan} label="Novo modelo" onPress={onNew} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink, paddingHorizontal: Space.lg },
  row: { flexDirection: 'row', gap: Space.sm, marginTop: Space.sm, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { color: Colors.white, fontSize: 16, fontWeight: '800', marginBottom: Space.sm },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, backgroundColor: '#1F1428' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: Space.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A3656' },
  placeholderIcon: { fontSize: 42 },
  placeholderText: { color: SOFT, textAlign: 'center', marginTop: Space.sm },
  meta: { color: SOFT, fontSize: 12, marginTop: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: Space.md },
  switchLabel: { color: Colors.white, fontWeight: '700' },
  thumb: { width: '100%', aspectRatio: 1.6, borderRadius: Radius.md, marginBottom: Space.sm, backgroundColor: '#1F1428' },
  jobLine: { color: Colors.white, marginTop: Space.sm, fontWeight: '600' },
  error: { color: '#FF8FB8', marginTop: Space.sm },
  privacy: { color: SOFT, fontSize: 11, textAlign: 'center', opacity: 0.8, paddingHorizontal: Space.md },
});
