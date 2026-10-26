import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Viro3DObject,
  ViroAmbientLight,
  ViroARPlaneSelector,
  ViroARScene,
  ViroARSceneNavigator,
  ViroNode,
  ViroSpotLight,
  ViroAnimations,
  ViroTrackingStateConstants,
  isARSupportedOnDevice,
} from '@reactvision/react-viro';
import { Colors, Radius, Space } from '../theme';
import { ArModel } from '../catalog';

// Pop-in when the model lands: the wrapping node scales from ~0 to full.
ViroAnimations.registerAnimations({
  popIn: {
    properties: { scaleX: 1, scaleY: 1, scaleZ: 1 },
    easing: 'bounce',
    duration: 500,
  },
});

type SceneProps = {
  model: ArModel;
  onTracking?: (ok: boolean) => void;
  onLoad?: (state: 'loading' | 'ok' | 'error') => void;
};

/** The Viro AR scene: light rig + tap-a-plane to place the chosen GLB (catalogo ou gerado). */
function ArScene(props: any) {
  const { model, onTracking, onLoad } = props.sceneNavigator.viroAppProps as SceneProps;
  const [mul, setMul] = useState(1); // escala ajustada por pinca
  const [rotY, setRotY] = useState(0); // rotacao ajustada com dois dedos
  const s = model.scaleToUnits * mul;

  return (
    <ViroARScene
      onTrackingUpdated={(state: any) =>
        onTracking?.(state === ViroTrackingStateConstants.TRACKING_NORMAL)
      }
    >
      <ViroAmbientLight color="#FFFFFF" intensity={700} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={45}
        direction={[0, -1, -0.2]}
        position={[0, 3, 1]}
        color="#FFFFFF"
        castsShadow
      />
      <ViroARPlaneSelector>
        <ViroNode
          scale={[0.0001, 0.0001, 0.0001]}
          animation={{ name: 'popIn', run: true }}
          onPinch={(state: number, factor: number) => {
            if (state === 3) setMul((m) => Math.max(0.2, Math.min(6, m * factor)));
          }}
          onRotate={(state: number, factor: number) => {
            if (state === 3) setRotY((r) => r - factor);
          }}
        >
          <Viro3DObject
            source={model.model as any}
            type="GLB"
            scale={[s, s, s]}
            rotation={[0, rotY, 0]}
            dragType="FixedToWorld"
            onDrag={() => {}}
            onLoadStart={() => onLoad?.('loading')}
            onLoadEnd={() => onLoad?.('ok')}
            onError={() => onLoad?.('error')}
          />
        </ViroNode>
      </ViroARPlaneSelector>
    </ViroARScene>
  );
}

export default function ArScreen({
  model,
  onClose,
  onOpen3d,
}: {
  model: ArModel;
  onClose: () => void;
  onOpen3d?: () => void;
}) {
  const [tracking, setTracking] = useState(false);
  const [load, setLoad] = useState<'loading' | 'ok' | 'error' | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    isARSupportedOnDevice()
      .then((r) => alive && setSupported(!!r?.isARSupported))
      .catch(() => alive && setSupported(null));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={styles.root}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: ArScene as any }}
        viroAppProps={{ model, onTracking: setTracking, onLoad: setLoad }}
        style={styles.nav}
      />

      {/* Overlay */}
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable style={styles.backBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </Pressable>
          <View style={[styles.pill, { backgroundColor: model.accent }]}>
            <Text style={styles.pillText} numberOfLines={1}>{model.title}</Text>
          </View>
        </View>

        {supported === false ? (
          <View style={styles.unsupported}>
            <Text style={styles.unsupportedTitle}>RA indisponível neste aparelho</Text>
            <Text style={styles.unsupportedText}>
              O ARCore (Android) ou ARKit (iOS) não está disponível ou não foi instalado. Você ainda pode ver o modelo em 3D.
            </Text>
            {onOpen3d ? (
              <Pressable style={styles.unsupportedBtn} onPress={onOpen3d}>
                <Text style={styles.backText}>Ver em 3D</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.hintWrap} pointerEvents="none">
          <Text style={styles.hint}>
            {load === 'error'
              ? 'Não foi possível carregar este modelo na RA.'
              : load === 'loading'
                ? 'Carregando o modelo…'
                : tracking
                  ? 'Toque numa superfície detectada para posicionar. Pinça = tamanho, dois dedos = girar.'
                  : 'Mova o celular devagar para detectar superfícies…'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  nav: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Space.xl,
    paddingHorizontal: Space.md,
    gap: Space.sm,
  },
  backBtn: {
    backgroundColor: Colors.scrim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  backText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, flexShrink: 1 },
  pillText: { color: Colors.white, fontWeight: '700' },
  unsupported: { marginHorizontal: Space.lg, backgroundColor: 'rgba(26,16,32,0.92)', borderRadius: Radius.lg, padding: Space.lg, gap: Space.sm, borderWidth: 1, borderColor: Colors.cerise },
  unsupportedTitle: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  unsupportedText: { color: '#CDB9C8' },
  unsupportedBtn: { alignSelf: 'flex-start', backgroundColor: Colors.cerise, borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
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
