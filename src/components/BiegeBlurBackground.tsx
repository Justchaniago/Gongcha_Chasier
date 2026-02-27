import React from 'react';
import { View, StyleSheet } from 'react-native';

const BiegeBlurBackground = ({ children }) => (
  <View style={styles.container}>
    {/* Background layer */}
    <View style={styles.background} />
    {/* Content layer */}
    <View style={styles.content}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5DC', // biege
    opacity: 0.95,
    // Blur effect for iOS
    backdropFilter: 'blur(16px)', // web only
    // For React Native, use expo-blur or similar for blur
  },
  content: {
    flex: 1,
    position: 'relative',
  },
});

export default BiegeBlurBackground;
