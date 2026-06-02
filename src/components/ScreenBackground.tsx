import React, { ReactNode } from 'react';
import { ImageBackground, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const backgroundImage = require('../../assets/6.png');

interface ScreenBackgroundProps {
  children: ReactNode;
  overlayStyle?: ViewStyle;
}

export default function ScreenBackground({ children, overlayStyle }: ScreenBackgroundProps) {
  return (
    <ImageBackground source={backgroundImage} resizeMode="cover" style={styles.background}>
      <LinearGradient
        colors={['rgba(248, 250, 252, 0.65)', 'rgba(238, 242, 255, 0.95)']}
        style={[styles.overlay, overlayStyle]}
      >
        {children}
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1 },
});
