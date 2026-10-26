import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Colors, Radius, Space } from '../theme';
import { Button, ScreenHeader, SOFT } from '../ui';

/**
 * Pre-visualizacao 3D sem RA: WebView com o <model-viewer> embutido no app
 * (assets/viewer/viewer.html, gerado por tools/build-viewer.js). O GLB e lido
 * do armazenamento do app e enviado em pedacos base64 -> Blob URL na pagina.
 * Funciona offline e em emulador/simulador.
 */

export type ViewerSource = number | { uri: string };

type Props = {
  title: string;
  subtitle?: string;
  source: ViewerSource;
  onBack: () => void;
  onOpenAr?: () => void;
};

let viewerHtmlCache: string | null = null;
async function loadViewerHtml(): Promise<string> {
  if (viewerHtmlCache) return viewerHtmlCache;
  const asset = Asset.fromModule(require('../../assets/viewer/viewer.html'));
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  viewerHtmlCache = await new File(uri).text();
  return viewerHtmlCache;
}

async function glbBase64(source: ViewerSource): Promise<string> {
  let uri: string;
  if (typeof source === 'number') {
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    uri = asset.localUri || asset.uri;
  } else {
    uri = source.uri;
  }
  return new File(uri).base64();
}

const CHUNK = 256 * 1024; // caracteres base64 por injecao

export default function ViewerScreen({ title, subtitle, source, onBack, onOpenAr }: Props) {
  const web = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'sending' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ x: number; y: number; z: number } | null>(null);
  const [rotate, setRotate] = useState(true);
  const sent = useRef(false);

  useEffect(() => {
    loadViewerHtml()
      .then(setHtml)
      .catch((e) => {
        setStatus('error');
        setError('Não foi possível abrir o visualizador 3D: ' + String(e?.message || e));
      });
  }, []);

  async function sendModel() {
    if (sent.current) return;
    sent.current = true;
    setStatus('sending');
    try {
      const b64 = await glbBase64(source);
      const n = Math.ceil(b64.length / CHUNK);
      web.current?.injectJavaScript(`window.__glbBegin(${n}); true;`);
      for (let i = 0; i < n; i++) {
        web.current?.injectJavaScript(`window.__glbChunk("${b64.slice(i * CHUNK, (i + 1) * CHUNK)}"); true;`);
      }
      web.current?.injectJavaScript('window.__glbEnd(); true;');
    } catch (e: any) {
      setStatus('error');
      setError('Não foi possível ler o arquivo do modelo: ' + String(e?.message || e));
    }
  }

  function onMessage(ev: WebViewMessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(ev.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') sendModel();
    else if (msg.type === 'loaded') {
      setStatus('ready');
      setDims(msg.dims || null);
    } else if (msg.type === 'error') {
      setStatus('error');
      setError('O visualizador não conseguiu abrir este GLB (' + msg.detail + ').');
    }
  }

  function toggleRotate() {
    const next = !rotate;
    setRotate(next);
    web.current?.injectJavaScript(`window.__setAutoRotate(${next}); true;`);
  }

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: Space.lg }}>
        <ScreenHeader title={title} onBack={onBack} />
      </View>
      <View style={st.stage}>
        {html ? (
          <WebView
            ref={web}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://localhost/' }}
            onMessage={onMessage}
            javaScriptEnabled
            style={st.web}
            containerStyle={st.web}
            setSupportMultipleWindows={false}
            androidLayerType="hardware"
            overScrollMode="never"
            bounces={false}
            scrollEnabled={false}
            webviewDebuggingEnabled={__DEV__}
            onError={(e) => {
              setStatus('error');
              setError('Falha no WebView: ' + e.nativeEvent.description);
            }}
          />
        ) : null}
        {status !== 'ready' && status !== 'error' ? (
          <View style={st.overlay} pointerEvents="none">
            <ActivityIndicator color={Colors.cerise} size="large" />
            <Text style={st.overlayText}>{status === 'sending' ? 'Abrindo modelo…' : 'Preparando visualizador…'}</Text>
          </View>
        ) : null}
        {status === 'error' ? (
          <View style={st.overlay}>
            <Text style={st.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
      <View style={st.footer}>
        {subtitle ? <Text style={st.sub}>{subtitle}</Text> : null}
        {dims ? (
          <Text style={st.sub}>
            Dimensões no arquivo: {[dims.x, dims.y, dims.z].map((v) => v.toFixed(2).replace('.', ',')).join(' × ')} m · arraste para girar, pinça para zoom
          </Text>
        ) : null}
        <View style={st.row}>
          <Button small style={{ flex: 1 }} variant="outline" color={Colors.cyan} label={rotate ? 'Parar giro' : 'Girar'} onPress={toggleRotate} disabled={status !== 'ready'} />
          <Button small style={{ flex: 1 }} variant="outline" color={Colors.cyan} label="Recentrar" onPress={() => web.current?.injectJavaScript('window.__resetCamera(); true;')} disabled={status !== 'ready'} />
          {onOpenAr ? <Button small style={{ flex: 1 }} color={Colors.purple} label="Ver em RA" onPress={onOpenAr} /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  stage: { flex: 1, marginHorizontal: Space.md, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#1F1428' },
  web: { flex: 1, backgroundColor: 'transparent' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: Space.lg, gap: Space.sm },
  overlayText: { color: SOFT },
  errorText: { color: '#FF8FB8', textAlign: 'center' },
  footer: { paddingHorizontal: Space.lg, paddingTop: Space.sm, paddingBottom: Space.md, gap: 6 },
  sub: { color: SOFT, fontSize: 12, textAlign: 'center' },
  row: { flexDirection: 'row', gap: Space.sm, marginTop: Space.xs },
});
