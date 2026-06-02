import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';
import { StackNavigationProp } from '@react-navigation/stack';
import { getBiometricLoginUser, loginWithPassword } from '../services/auth';

interface LoginScreenProps {
  navigation: StackNavigationProp<any>;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useUser();
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    const res = await loginWithPassword(username, password);
    if (res) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
      login(res); 
    } 
    else Alert.alert("Lỗi", "Sai tài khoản hoặc mật khẩu!");
  };

  const handleBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert("Thông báo", "Thiết bị của bạn không hỗ trợ hoặc chưa đăng ký sinh trắc học!");
      return;
    }

    const auth = await LocalAuthentication.authenticateAsync({ 
      promptMessage: 'Đăng nhập Finance Pro',
      fallbackLabel: 'Sử dụng mật khẩu',
      disableDeviceFallback: false
    });

    if (auth.success) {
      const res = await getBiometricLoginUser();
      if (res) {
        if (res.is_biometric_enabled === 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
          login(res);
        } else {
          Alert.alert("Từ chối", "Vui lòng đăng nhập bằng mật khẩu và bật 'Sinh trắc học' trong phần Cài đặt!");
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
          <TextInput 
            placeholder="Tên đăng nhập" 
            style={styles.input} 
            onChangeText={setUsername} 
            autoCapitalize="none" 
          />
          <TextInput 
            placeholder="Mật khẩu" 
            style={styles.input} 
            secureTextEntry 
            onChangeText={setPassword} 
          />
          <TouchableOpacity style={styles.btn} onPress={handleLogin}>
            <Text style={styles.btnText}>ĐĂNG NHẬP</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric}>
            <Ionicons name="finger-print" size={24} color="#4F46E5" />
            <Text style={styles.bioText}>Vân tay / FaceID</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Chưa có tài khoản? Tạo mới</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  authOverlay: { backgroundColor: 'rgba(255, 255, 255, 0.68)' },
  safeArea: { flex: 1, backgroundColor: 'transparent' }, 
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 35 },
  title: { fontSize: 34, fontWeight: '900', color: '#1E293B', marginVertical: 30, letterSpacing: -1 },
  input: { width: '100%', backgroundColor: '#F1F5F9', padding: 22, borderRadius: 22, marginBottom: 15, fontSize: 17, fontWeight: '700' },
  btn: { width: '100%', backgroundColor: '#4F46E5', padding: 24, borderRadius: 22, alignItems: 'center', marginTop: 15, shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 5 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  bioBtn: { width: '100%', backgroundColor: '#EEF2FF', padding: 20, borderRadius: 22, alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center', borderWidth: 2, borderColor: '#C7D2FE' },
  bioText: { color: '#4F46E5', fontWeight: '800', marginLeft: 10 }, 
  link: { marginTop: 25, color: '#64748B', fontWeight: '700' }
});
