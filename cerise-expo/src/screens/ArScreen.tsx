import React, { useState } from 'react';
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

/** The Viro AR scene: light rig + tap-a-plane to place the chosen GLB. */
function ArScene(props: any) {
  const model: ArModel = props.sceneNavigator.viroAppProps.model;
  const onTracking = props.sceneNavigator.viroAppProps.onTracking as
    | ((ok: boolean) => void)
    | undefined;
  const s = model.scaleToUnits;

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
        <ViroNode scale={[0.0001, 0.0001, 0.0001]} animation={{ name: 'popIn', run: true }}>
          <Viro3DObject
            source={model.model}
            type="GLB"
            scale={[s, s, s]}
            dragType="FixedToWorld"
            onDrag={() => {}}
          />
        </ViroNode>
      </ViroARPlaneSelector>
    </ViroARScene>
  );
}

export default function ArScreen({
  model,
  onClose,
}: {
  model: ArModel;
  onClose: () => void;
}) {
  const [tracking, setTracking] = useState(false);

  return (
    <View style={styles.root}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: ArScene as any }}
        viroAppProps={{ model, onTracking: setTracking }}
        style={styles.nav}
      />

      {/* Overlay */}
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable style={styles.backBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </Pressable>
          <View style={[styles.pill, { backgroundColor: model.accent }]}>
            <Text style={styles.pillText}>{model.title}</Text>
          </View>
        </View>

        <View style={styles.hintWrap} pointerEvents="none">
          <Text style={styles.hint}>
            {tracking
              ? 'Toque numa superfície detectada para posicionar o modelo.'
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
  },
  backBtn: {
    backgroundColor: Colors.scrim,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  backText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  pillText: { color: Colors.white, fontWeight: '700' },
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
