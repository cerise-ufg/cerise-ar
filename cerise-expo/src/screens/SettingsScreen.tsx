import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Space } from '../theme';
import { Banner, Button, Card, ScreenHeader, SOFT } from '../ui';
import { DEFAULT_SERVER, SERVER_SUGGESTIONS, isValidServer, normalizeServer, setServerUrl, useSettings } from '../gen3d/settings';
import { errorMessage, getHealth } from '../gen3d/api';
import type { Health } from '../gen3d/types';

type Props = { onBack: () => void; onOpenAbout: () => void; initialDraft?: string };
type Test = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok'; health: Health; ms: number; url: string } | { kind: 'fail'; msg: string; url: string };

export default function SettingsScreen({ onBack, onOpenAbout, initialDraft }: Props) {
  const { serverUrl } = useSettings();
  const [draft, setDraft] = useState(initialDraft ?? serverUrl);
  const [test, setTest] = useState<Test>({ kind: 'idle' });
  const valid = isValidServer(draft);
  const dirty = normalizeServer(draft) !== serverUrl;

  async function runTest() {
    const url = normalizeServer(draft);
    setTest({ kind: 'testing' });
    try {
      const { health, ms } = await getHealth(url);
      setTest({ kind: 'ok', health, ms, url });
    } catch (e) {
      setTest({ kind: 'fail', msg: errorMessage(e), url });
    }
  }

  // Aberto por link com ?server=... -> ja testa a conexao (so um GET /health).
  useEffect(() => {
    if (initialDraft) runTest();
  }, []);

  function save() {
    if (!valid) return;
    setServerUrl(draft);
    setDraft(normalizeServer(draft));
  }

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <ScreenHeader title="Configurações" onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ gap: Space.md, paddingBottom: Space.xl }} keyboardShouldPersistTaps="handled">
          <Card>
            <Text style={st.h}>Servidor de geração 3D</Text>
            <Text style={st.p}>Endereço do serviço que transforma a foto em modelo 3D (API /api/v1).</Text>
            <TextInput
              value={draft}
              onChangeText={(t) => { setDraft(t); setTest({ kind: 'idle' }); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={DEFAULT_SERVER}
              placeholderTextColor="#7D6A78"
              style={[st.input, !valid && { borderColor: Colors.cerise }]}
              accessibilityLabel="URL do servidor"
            />
            {!valid ? <Text style={st.err}>Use uma URL começando com http:// ou https://</Text> : null}
            <Text style={st.current}>Em uso: {serverUrl}</Text>
            <View style={{ gap: Space.sm, marginTop: Space.md }}>
              <Button label="Testar conexão" onPress={runTest} loading={test.kind === 'testing'} disabled={!valid} color={Colors.purple} />
              <Button label={dirty ? 'Salvar endereço' : 'Endereço salvo'} onPress={save} disabled={!valid || !dirty} />
            </View>
            <View style={[st.row, { marginTop: Space.md }]}>
              {SERVER_SUGGESTIONS.map((sug) => (
                <Pressable key={sug.url} onPress={() => { setDraft(sug.url); setTest({ kind: 'idle' }); }} style={st.sug}>
                  <Text style={st.sugLabel}>{sug.label}</Text>
                  <Text style={st.sugUrl}>{sug.url}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {test.kind === 'ok' ? (
            <Banner
              tone="ok"
              title={`Conectado em ${test.ms} ms`}
              text={`${test.url}\nModelo: ${test.health.model}\nGPU: ${test.health.gpu}\nFila: ${test.health.queue_length} · workers: ${test.health.workers}\nPresets: ${test.health.presets?.join(', ')}`}
            />
          ) : null}
          {test.kind === 'fail' ? (
            <Banner
              tone="error"
              title="Servidor não respondeu"
              text={`${test.url}\n${test.msg}\n\nSem servidor a criação de modelos 3D fica indisponível; o catálogo, a RA e a Caça CERISE continuam funcionando.`}
            />
          ) : null}
          {serverUrl === DEFAULT_SERVER ? (
            <Text style={st.note}>
              A URL de produção ({DEFAULT_SERVER}) depende da publicação do servidor 3D do CERISE. Até lá, use um servidor de teste.
            </Text>
          ) : null}

          <Button variant="outline" color={Colors.cyan} label="Sobre o CERISE AR" onPress={onOpenAbout} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink, paddingHorizontal: Space.lg },
  h: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  p: { color: SOFT, marginTop: 4 },
  input: { marginTop: Space.md, borderWidth: 1.5, borderColor: '#4A3656', borderRadius: Radius.md, color: Colors.white, paddingHorizontal: Space.md, paddingVertical: 12, fontSize: 15, backgroundColor: '#22162B' },
  err: { color: '#FF8FB8', marginTop: 6, fontSize: 12 },
  current: { color: SOFT, fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', gap: Space.sm, marginTop: Space.sm, flexWrap: 'wrap' },
  sug: { borderWidth: 1, borderColor: '#4A3656', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  sugLabel: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  sugUrl: { color: SOFT, fontSize: 11 },
  note: { color: SOFT, fontSize: 12, textAlign: 'center' },
});
