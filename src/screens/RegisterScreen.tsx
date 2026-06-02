import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import { StackNavigationProp } from '@react-navigation/stack';
import { registerLocalUser } from '../services/auth';

export default function RegisterScreen({ navigation }: { navigation: StackNavigationProp<any> }) {
  const [user, setUser] = useState(''); const [pass, setPass] = useState(''); const [name, setName] = useState('');
  
  const handleRegister = async () => {
    if(!user || !pass || !name) return Alert.alert("Lỗi", "Nhập đủ thông tin!");
    try { 
      await registerLocalUser(user, pass, name);
      Alert.alert("Thành công", "Tạo tài khoản thành công!"); navigation.goBack();
    } catch (e) { Alert.alert("Lỗi", "Tài khoản đã tồn tại!"); }
  };

  return (
    <ScreenBackground overlayStyle={styles.authOverlay}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 35 }}>
          <Ionicons name="person-add" size={80} color="#4F46E5" />
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#1E293B', marginVertical: 30, letterSpacing: -1 }}>Tạo tài khoản</Text>
          <TextInput placeholder="Họ và tên" style={styles.input} onChangeText={setName} />
          <TextInput placeholder="Tên đăng nhập" style={styles.input} onChangeText={setUser} autoCapitalize="none" />
          <TextInput placeholder="Mật khẩu" style={styles.input} secureTextEntry onChangeText={setPass} />
          <TouchableOpacity style={styles.btn} onPress={handleRegister}><Text style={{color: '#FFF', fontWeight: '900'}}>ĐĂNG KÝ</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{marginTop: 25, color: '#64748B', fontWeight: '700'}}>Quay lại đăng nhập</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  authOverlay: { backgroundColor: 'rgba(255, 255, 255, 0.68)' },
  input: { width: '100%', backgroundColor: '#F1F5F9', padding: 22, borderRadius: 22, marginBottom: 15, fontSize: 17, fontWeight: '700' },
  btn: { width: '100%', backgroundColor: '#4F46E5', padding: 24, borderRadius: 22, alignItems: 'center', marginTop: 15, shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 5 }
});
