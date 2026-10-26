import React, { useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Space } from '../theme';
import { Button, Card, ProgressBar, ScreenHeader, SOFT } from '../ui';
import { GeneratedModel, PRESETS, isActive } from '../gen3d/types';
import { STATUS_LABEL, cancel, fmtNum, formatBytes, formatEta, formatMs, remove, rename, retry, useModels } from '../gen3d/jobs';

type Props = {
  onBack: () => void;
  onCreate: () => void;
  onView3d: (m: GeneratedModel) => void;
  onViewAr: (m: GeneratedModel) => void;
  arAvailable: boolean;
};

const STATUS_COLOR: Record<GeneratedModel['status'], string> = {
  uploading: Colors.cyan,
  queued: Colors.yellow,
  running: Colors.orange,
  downloading: Colors.cyan,
  ready: Colors.green,
  error: Colors.cerise,
  cancelled: '#7D6A78',
};

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MyModelsScreen({ onBack, onCreate, onView3d, onViewAr, arAvailable }: Props) {
  const models = useModels();
  const [selected, setSelected] = useState<GeneratedModel | null>(null);
  const [renaming, setRenaming] = useState('');
  const current = selected ? models.find((m) => m.id === selected.id) ?? null : null;

  function confirmDelete(m: GeneratedModel) {
    Alert.alert('Excluir modelo?', `"${m.title}" e seus arquivos serão apagados deste aparelho, e o app pedirá ao servidor que apague a foto e o modelo dele também.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { setSelected(null); remove(m.id); } },
    ]);
  }

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <ScreenHeader title="Meus modelos" onBack={onBack} right={<Pressable onPress={onCreate} hitSlop={12}><Text style={st.add}>＋</Text></Pressable>} />
      <FlatList
        data={models}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: Space.xl, gap: Space.sm, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Text style={st.emptyIcon}>🧊</Text>
            <Text style={st.emptyTitle}>Nenhum modelo ainda</Text>
            <Text style={st.emptyText}>Tire uma foto de um objeto e o servidor do CERISE gera um modelo 3D texturizado para ver em RA.</Text>
            <Button label="Criar modelo 3D" onPress={onCreate} style={{ marginTop: Space.md, alignSelf: 'stretch' }} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => { setSelected(item); setRenaming(item.title); }} style={({ pressed }) => [st.item, pressed && { opacity: 0.85 }]}>
            {item.thumbUri || item.sourceUri ? (
              <Image source={{ uri: item.thumbUri || item.sourceUri }} style={st.itemThumb} />
            ) : (
              <View style={[st.itemThumb, { alignItems: 'center', justifyContent: 'center' }]}><Text>🧊</Text></View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.itemTitle} numberOfLines={1}>{item.title}</Text>
              <View style={st.rowCenter}>
                <View style={[st.badge, { backgroundColor: STATUS_COLOR[item.status] }]}>
                  <Text style={st.badgeText}>{STATUS_LABEL[item.status]}</Text>
                </View>
                <Text style={st.itemMeta}>
                  {PRESETS.find((p) => p.id === item.options.preset)?.label}
                  {item.status === 'ready' ? ` · ${formatBytes(item.glbBytes)}` : ''}
                  {item.status === 'queued' ? ` · posição ${item.position ?? '?'} · ${formatEta(item.etaSeconds)}` : ''}
                  {item.status === 'running' ? ` · ${item.progress}%` : ''}
                </Text>
              </View>
              {isActive(item) ? <ProgressBar value={item.progress} indeterminate={item.status === 'queued'} color={STATUS_COLOR[item.status]} /> : null}
              <Text style={st.itemDate}>{fmtDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={!!current} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={st.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={st.sheet} onPress={() => {}}>
            {current ? (
              <>
                <TextInput
                  value={renaming}
                  onChangeText={setRenaming}
                  onEndEditing={() => rename(current.id, renaming)}
                  style={st.titleInput}
                  maxLength={60}
                  accessibilityLabel="Nome do modelo"
                />
                <Text style={st.itemMeta}>
                  {STATUS_LABEL[current.status]} · {PRESETS.find((p) => p.id === current.options.preset)?.label}
                  {current.options.texture ? ' · textura' : ''}{current.options.remove_background ? ' · sem fundo' : ''}
                </Text>
                {current.error ? <Text style={st.error}>{current.error}</Text> : null}
                <Details m={current} />
                <View style={st.actions}>
                  {current.status === 'ready' ? (
                    <>
                      <Button label="Ver em 3D" onPress={() => { setSelected(null); onView3d(current); }} />
                      {arAvailable ? <Button color={Colors.purple} label="Ver em RA" onPress={() => { setSelected(null); onViewAr(current); }} /> : null}
                    </>
                  ) : null}
                  {isActive(current) ? (
                    <Button variant="outline" color={Colors.orange} label="Cancelar geração" onPress={async () => { const msg = await cancel(current.id); if (msg) Alert.alert('Cancelado', msg); }} />
                  ) : null}
                  {current.status === 'error' || current.status === 'cancelled' ? <Button label="Tentar de novo" onPress={() => retry(current.id)} /> : null}
                  <Button variant="outline" color={Colors.cerise} label="Excluir" onPress={() => confirmDelete(current)} />
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const int = (v: unknown) => (typeof v === 'number' ? v.toLocaleString?.('pt-BR') ?? String(v) : String(v ?? '?'));

function Details({ m }: { m: GeneratedModel }) {
  const local = (m.stats as any)?.local;
  const t = m.timings || {};
  const rows: [string, string][] = [];
  if (local) {
    rows.push(['Malha', `${int(local.vertices)} vértices · ${int(local.triangles)} triângulos`]);
    rows.push(['Materiais', `${local.materials} material(is) · ${local.textures} textura(s)`]);
    rows.push(['Tamanho', `${formatBytes(local.bytes)} · ${local.size.map((v: number) => fmtNum(v, 2)).join(' × ')} m`]);
  }
  if (t.uploadMs !== undefined) rows.push(['Envio', formatMs(t.uploadMs)]);
  if (t.queueMs !== undefined) rows.push(['Fila', formatMs(t.queueMs)]);
  if (t.generationMs !== undefined) rows.push(['Geração', formatMs(t.generationMs)]);
  if (t.downloadMs !== undefined) rows.push(['Download', formatMs(t.downloadMs)]);
  if (t.totalMs !== undefined) rows.push(['Total', formatMs(t.totalMs)]);
  if (m.cached) rows.push(['No servidor', 'resultado do cache (mesma foto e opções)']);
  else if (t.serverRunMs !== undefined)
    rows.push(['No servidor', `fila ${formatMs(t.serverQueueMs ?? 0)} · GPU ${formatMs(t.serverRunMs)}`]);
  if ((m.stats as any)?.mock) rows.push(['Origem', 'servidor MOCK (GLB de exemplo)']);
  rows.push(['Servidor', m.server]);
  return (
    <Card style={{ marginTop: Space.sm, backgroundColor: '#22162B' }}>
      {rows.map(([k, v]) => (
        <View key={k} style={st.detailRow}>
          <Text style={st.detailKey}>{k}</Text>
          <Text style={st.detailVal} numberOfLines={2}>{v}</Text>
        </View>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink, paddingHorizontal: Space.lg },
  add: { color: Colors.cyan, fontSize: 30, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  emptyIcon: { fontSize: 54 },
  emptyTitle: { color: Colors.white, fontSize: 20, fontWeight: '800', marginTop: Space.sm },
  emptyText: { color: SOFT, textAlign: 'center', marginTop: Space.sm },
  item: { flexDirection: 'row', gap: Space.md, backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Space.sm, alignItems: 'center' },
  itemThumb: { width: 84, height: 84, borderRadius: Radius.md, backgroundColor: '#1F1428' },
  itemTitle: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  badgeText: { color: Colors.ink, fontSize: 11, fontWeight: '800' },
  itemMeta: { color: SOFT, fontSize: 12 },
  itemDate: { color: SOFT, fontSize: 11, opacity: 0.7 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.inkSoft, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Space.lg, paddingBottom: Space.xl },
  titleInput: { color: Colors.white, fontSize: 20, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: '#4A3656', paddingVertical: 6, marginBottom: 6 },
  error: { color: '#FF8FB8', marginTop: Space.sm },
  actions: { gap: Space.sm, marginTop: Space.md },
  detailRow: { flexDirection: 'row', paddingVertical: 4, gap: Space.sm },
  detailKey: { color: SOFT, width: 84, fontSize: 12 },
  detailVal: { color: Colors.white, flex: 1, fontSize: 12 },
});
