import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

const backgroundImage = require('../../assets/1.png');

export default function ScreenBackground({ children, overlayStyle }) {
  return (
    <ImageBackground source={backgroundImage} resizeMode="cover" style={styles.background}>
      <View style={[styles.overlay, overlayStyle]}>
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(248, 250, 252, 0.78)' },
});
