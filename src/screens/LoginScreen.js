import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { db } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

export default function LoginScreen({ navigation }) {
  const { login } = useUser();
  const [user, setUser] = useState(''); const [pass, setPass] = useState('');
  
  const handleLogin = async () => {
    const hashedPass = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pass);
    const res = await db.getFirstAsync('SELECT * FROM users WHERE username = ? AND password = ?', [user, hashedPass]);
    if (res) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
      await AsyncStorage.setItem('last_username', user);
      login(res); 
    } 
    else Alert.alert("Lỗi", "Sai tài khoản hoặc mật khẩu!");
  };

  const handleBiometric = async () => {
    const auth = await LocalAuthentication.authenticateAsync({ promptMessage: 'Đăng nhập Finance Pro' });
    if (auth.success) {
      const lastUsername = await AsyncStorage.getItem('last_username');
      if (lastUsername) {
        const res = await db.getFirstAsync('SELECT * FROM users WHERE username = ?', [lastUsername]);
        if (res) {
          if (res.is_biometric_enabled === 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
            login(res);
          } else {
            Alert.alert("Từ chối", "Vui lòng đăng nhập bằng mật khẩu và bật 'Sinh trắc học' trong phần Cài đặt!");
          }
        }
      } else {
        Alert.alert("Thông báo", "Vui lòng đăng nhập bằng mật khẩu lần đầu tiên!");
      }
    }
  };

  return (
    <ScreenBackground overlayStyle={styles.authOverlay}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Ionicons name="scan" size={80} color="#4F46E5" />
          <Text style={styles.title}>Finance Master</Text>
          <TextInput placeholder="Tên đăng nhập" style={styles.input} onChangeText={setUser} autoCapitalize="none" />
          <TextInput placeholder="Mật khẩu" style={styles.input} secureTextEntry onChangeText={setPass} />
          <TouchableOpacity style={styles.btn} onPress={handleLogin}><Text style={styles.btnText}>ĐĂNG NHẬP</Text></TouchableOpacity>
          <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric}><Ionicons name="finger-print" size={24} color="#4F46E5" /><Text style={styles.bioText}>Vân tay / FaceID</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={styles.link}>Chưa có tài khoản? Tạo mới</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  authOverlay: { backgroundColor: 'rgba(255, 255, 255, 0.68)' },
  safeArea: { flex: 1, backgroundColor: 'transparent' }, container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 35 },
  title: { fontSize: 34, fontWeight: '900', color: '#1E293B', marginVertical: 30, letterSpacing: -1 },
  input: { width: '100%', backgroundColor: '#F1F5F9', padding: 22, borderRadius: 22, marginBottom: 15, fontSize: 17, fontWeight: '700' },
  btn: { width: '100%', backgroundColor: '#4F46E5', padding: 24, borderRadius: 22, alignItems: 'center', marginTop: 15, shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 5 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  bioBtn: { width: '100%', backgroundColor: '#EEF2FF', padding: 20, borderRadius: 22, alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center', borderWidth: 2, borderColor: '#C7D2FE' },
  bioText: { color: '#4F46E5', fontWeight: '800', marginLeft: 10 }, link: { marginTop: 25, color: '#64748B', fontWeight: '700' }
});
