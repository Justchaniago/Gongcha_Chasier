import React from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';

export default function DecorativeBackground() {
  const { width, height } = useWindowDimensions();
  const blobTopSize = Math.min(Math.max(width * 0.92, 280), 420);
  const blobBottomSize = Math.min(Math.max(width * 0.86, 250), 390);
  const verticalAnchor1 = Math.round(height * 0.23);
  const verticalAnchor2 = Math.round(height * 0.52);
  const verticalAnchor3 = Math.round(height * 0.78);

  return (
    <View pointerEvents="none" style={styles.backgroundLayer}>
      <Image
        source={require('../../assets/images/abstract1.webp')}
        style={[
          styles.blobTopRight,
          { width: blobTopSize, height: blobTopSize, top: -Math.round(blobTopSize * 0.18), right: -Math.round(blobTopSize * 0.27) },
        ]}
      />
      <Image
        source={require('../../assets/images/abstract2.webp')}
        style={[
          styles.blobBottomLeft,
          { width: blobBottomSize, height: blobBottomSize, left: -Math.round(blobBottomSize * 0.34), bottom: Math.round(height * 0.04) },
        ]}
      />

      <Image
        source={require('../../assets/images/fewleaf.webp')}
        style={[styles.doodleFewLeaf, { top: verticalAnchor1, width: Math.max(30, width * 0.095), height: Math.max(54, width * 0.17) }]}
      />
      <Image
        source={require('../../assets/images/leaf2.webp')}
        style={[styles.doodleLeaf2, { top: verticalAnchor2, width: Math.max(44, width * 0.13), height: Math.max(27, width * 0.082) }]}
      />
      <Image
        source={require('../../assets/images/boba.webp')}
        style={[styles.doodleBoba, { top: verticalAnchor3, width: Math.max(28, width * 0.085), height: Math.max(28, width * 0.085) }]}
      />
      <Image
        source={require('../../assets/images/leaf1.webp')}
        style={[
          styles.doodleLeaf1,
          {
            top: Math.min(height - 88, verticalAnchor3 + Math.round(height * 0.12)),
            width: Math.max(36, width * 0.11),
            height: Math.max(56, width * 0.17),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blobTopRight: {
    position: 'absolute',
    opacity: 0.46,
    transform: [{ rotate: '8deg' }],
  },
  blobBottomLeft: {
    position: 'absolute',
    opacity: 0.25,
  },
  doodleFewLeaf: {
    position: 'absolute',
    left: 10,
    opacity: 0.48,
  },
  doodleLeaf2: {
    position: 'absolute',
    right: 14,
    opacity: 0.52,
    transform: [{ rotate: '-12deg' }],
  },
  doodleBoba: {
    position: 'absolute',
    right: 24,
    opacity: 0.55,
  },
  doodleLeaf1: {
    position: 'absolute',
    left: 22,
    opacity: 0.42,
    transform: [{ rotate: '6deg' }],
  },
});
