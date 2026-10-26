import React, { useEffect, useState } from 'react';
import { BackHandler, Linking, Modal, Platform, Pressable, Settings, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import HomeScreen from './src/screens/HomeScreen';
import CreateScreen from './src/screens/CreateScreen';
import MyModelsScreen from './src/screens/MyModelsScreen';
import ViewerScreen from './src/screens/ViewerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';
import { File } from 'expo-file-system';
import { ArModel, MODELS } from './src/catalog';
import { Colors, Radius, Space } from './src/theme';
import { GeneratedModel, Preset, isActive } from './src/gen3d/types';
import { getModels, initJobs, useModels } from './src/gen3d/jobs';
import { isValidServer, setServerUrl } from './src/gen3d/settings';
import { GEN3D_DIR } from './src/gen3d/persist';
import { arScaleFor } from './src/gen3d/glb';

/**
 * RA (ViroReact) pode ser desligada no build (extra.viroEnabled=false, ex.: build
 * de Simulador iOS, onde o ViroKit nao tem fatia de simulador). As telas de RA sao
 * carregadas sob demanda para o app abrir mesmo sem o modulo nativo.
 */
const AR_ENABLED = (Constants.expoConfig?.extra as any)?.viroEnabled !== false;
/** Build de teste (CERISE_TEST_MODE=1): links cerisear:// podem trocar o servidor e usar uma foto de exemplo. */
const TEST_MODE = (Constants.expoConfig?.extra as any)?.testMode === true;

type Route =
  | { name: 'home' }
  | { name: 'create'; testPhotoUri?: string; autoStart?: boolean; preset?: Preset }
  | { name: 'models' }
  | { name: 'settings'; draft?: string }
  | { name: 'about' }
  | { name: 'game' }
  | { name: 'ar'; model: ArModel }
  | { name: 'viewer'; model: ArModel };

/** Converte um modelo gerado (arquivo baixado) no formato usado pela RA e pelo visualizador. */
function generatedToAr(m: GeneratedModel): ArModel {
  const info = (m.stats as any)?.local;
  return {
    id: m.id,
    title: m.title,
    subtitle: (m.stats as any)?.mock ? 'Resultado do servidor MOCK (GLB de exemplo, não gerado da foto)' : 'Gerado a partir de foto',
    category: 'Meus modelos',
    model: { uri: m.glbUri! },
    scaleToUnits: arScaleFor(info, 0.35),
    animated: false,
    accent: Colors.cerise,
    author: 'Servidor de geração 3D do CERISE',
    license: 'gerado pelo usuário',
    generated: true,
  };
}

/** cerisear://rota?x=y -> { path, q } (sem depender de URL/URLSearchParams). */
function parseLink(url: string): { path: string; q: Record<string, string> } | null {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^?#]*)(\?[^#]*)?/i.exec(url || '');
  if (!m) return null;
  const q: Record<string, string> = {};
  (m[2] || '')
    .slice(1)
    .split('&')
    .filter(Boolean)
    .forEach((kv) => {
      const i = kv.indexOf('=');
      const k = i < 0 ? kv : kv.slice(0, i);
      const v = i < 0 ? '' : kv.slice(i + 1);
      try {
        q[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
      } catch {}
    });
  return { path: m[1].replace(/^\/+|\/+$/g, '').toLowerCase(), q };
}

/** Custom popup: when an OTA update finishes downloading, tell the user and
 *  offer to relaunch (applies it immediately). */
function UpdateModal() {
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  if (!isUpdatePending || dismissed) return null;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.mTitle}>App atualizado!</Text>
          <Text style={styles.mText}>
            Uma nova versão do CERISE AR foi baixada. Reabra para aplicar as
            novidades.
          </Text>
          <Pressable style={styles.mCta} onPress={() => Updates.reloadAsync()}>
            <Text style={styles.mCtaText}>Reabrir agora</Text>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)}>
            <Text style={styles.mLater}>Depois</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    WorkSans: require('./assets/fonts/WorkSans-Variable.ttf'),
  });
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const route = stack[stack.length - 1];
  const models = useModels();

  const push = (r: Route) => setStack((s) => [...s, r]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const replace = (r: Route) => setStack((s) => [...s.slice(0, -1), r]);

  useEffect(() => {
    initJobs(); // retoma jobs de geracao que estavam em andamento
  }, []);

  // Links cerisear:// — navegacao (sempre) e atalhos de teste (so em TEST_MODE).
  useEffect(() => {
    const handle = (url: string | null) => {
      const link = url ? parseLink(url) : null;
      if (!link || !link.path) return;
      const { path, q } = link;
      const go = (r: Route) => setStack(r.name === 'home' ? [r] : [{ name: 'home' }, r]);
      const findModel = (): ArModel | null => {
        if (q.catalog) return MODELS.find((m) => m.id === q.catalog) ?? null;
        const list = getModels().filter((m) => m.status === 'ready' && m.glbUri);
        const g = q.model ? list.find((m) => m.id === q.model) : list[0];
        return g ? generatedToAr(g) : null;
      };
      if (path === 'home') go({ name: 'home' });
      else if (path === 'create') {
        let testPhotoUri: string | undefined;
        if (TEST_MODE && q.photo && /^[\w.-]+$/.test(q.photo)) {
          const f = new File(GEN3D_DIR, q.photo); // foto copiada para Documents/gen3d pelo script de captura
          if (f.exists) testPhotoUri = f.uri;
        }
        const preset = (['rapido', 'padrao', 'alto'] as Preset[]).find((p) => p === q.preset);
        go({ name: 'create', testPhotoUri, autoStart: TEST_MODE && q.start === '1', preset });
      } else if (path === 'models') go({ name: 'models' });
      else if (path === 'about') go({ name: 'about' });
      else if (path === 'settings') {
        if (TEST_MODE && q.server && isValidServer(q.server)) setServerUrl(q.server);
        go({ name: 'settings', draft: q.server && isValidServer(q.server) ? q.server : undefined });
      } else if (path === 'viewer' || (path === 'ar' && AR_ENABLED)) {
        const model = findModel();
        if (model) go({ name: path as 'viewer' | 'ar', model });
      } else if (path === 'game' && AR_ENABLED) go({ name: 'game' });
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    // Simulador iOS (build de teste): `simctl openurl` pede confirmacao na tela, entao o
    // script de captura passa o link como argumento de lancamento (-cerisearLink <url>),
    // que o iOS expoe em NSUserDefaults.
    if (TEST_MODE && Platform.OS === 'ios') {
      try {
        const l = Settings.get('cerisearLink');
        if (typeof l === 'string') handle(l);
      } catch {}
    }
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.ink }} />;
  }

  const view3d = (m: GeneratedModel) => m.glbUri && push({ name: 'viewer', model: generatedToAr(m) });
  const viewAr = (m: GeneratedModel) => m.glbUri && push({ name: 'ar', model: generatedToAr(m) });

  let screen: React.ReactNode;
  switch (route.name) {
    case 'create':
      screen = (
        <CreateScreen
          key={JSON.stringify(route)}
          testPhotoUri={route.testPhotoUri}
          autoStart={route.autoStart}
          initialPreset={route.preset}
          onBack={back}
          onOpenSettings={() => push({ name: 'settings' })}
          onOpenModels={() => replace({ name: 'models' })}
          onView3d={view3d}
          onViewAr={viewAr}
          arAvailable={AR_ENABLED}
        />
      );
      break;
    case 'models':
      screen = <MyModelsScreen onBack={back} onCreate={() => push({ name: 'create' })} onView3d={view3d} onViewAr={viewAr} arAvailable={AR_ENABLED} />;
      break;
    case 'settings':
      screen = <SettingsScreen key={route.draft ?? 'settings'} initialDraft={route.draft} onBack={back} onOpenAbout={() => push({ name: 'about' })} />;
      break;
    case 'about':
      screen = <AboutScreen onBack={back} />;
      break;
    case 'viewer':
      screen = (
        <ViewerScreen
          title={route.model.title}
          subtitle={route.model.generated ? route.model.subtitle : `${route.model.author} · ${route.model.license}`}
          source={route.model.model}
          onBack={back}
          onOpenAr={AR_ENABLED ? () => replace({ name: 'ar', model: route.model }) : undefined}
        />
      );
      break;
    case 'ar': {
      const ArScreen = require('./src/screens/ArScreen').default;
      screen = <ArScreen model={route.model} onClose={back} onOpen3d={() => replace({ name: 'viewer', model: route.model })} />;
      break;
    }
    case 'game': {
      const GameScreen = require('./src/screens/GameScreen').default;
      screen = <GameScreen onClose={back} />;
      break;
    }
    default:
      screen = (
        <HomeScreen
          onOpenAr={(m) => push({ name: 'ar', model: m })}
          onOpen3d={(m) => push({ name: 'viewer', model: m })}
          onOpenGame={() => push({ name: 'game' })}
          onCreate={() => push({ name: 'create' })}
          onModels={() => push({ name: 'models' })}
          onSettings={() => push({ name: 'settings' })}
          onAbout={() => push({ name: 'about' })}
          modelsCount={models.length}
          activeCount={models.filter(isActive).length}
          arAvailable={AR_ENABLED}
        />
      );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen}
      <UpdateModal />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  modal: { backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Space.lg, alignItems: 'center', gap: Space.sm, maxWidth: 360, borderWidth: 1, borderColor: Colors.cerise },
  emoji: { fontSize: 40 },
  mTitle: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  mText: { color: Colors.muted, textAlign: 'center' },
  mCta: { marginTop: Space.sm, backgroundColor: Colors.cerise, borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 40, alignSelf: 'stretch', alignItems: 'center' },
  mCtaText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  mLater: { color: Colors.muted, paddingVertical: 8 },
});
