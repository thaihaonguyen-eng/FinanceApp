import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../services/db';
import ScreenBackground from '../components/ScreenBackground';

import * as Crypto from 'expo-crypto';

export default function RegisterScreen({ navigation }) {
  const [user, setUser] = useState(''); const [pass, setPass] = useState(''); const [name, setName] = useState('');
  
  const handleRegister = async () => {
    if(!user || !pass || !name) return Alert.alert("Lỗi", "Nhập đủ thông tin!");
    try { 
      const hashedPass = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pass);
      const result = await db.runAsync('INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)', [user, hashedPass, name]);
      const newId = result.lastInsertRowId;
      await db.runAsync("INSERT INTO wallets (user_id, name, balance, icon, color) VALUES (?, 'Tiền mặt', 0, 'wallet', '#F59E0B')", [newId]);
      await db.runAsync("INSERT INTO goals (user_id, name, target_amount, saved_amount, icon, color) VALUES (?, 'Quỹ dự phòng', 20000000, 0, 'shield-checkmark', '#10B981')", [newId]);
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
  btn: { width: '100%', backgroundColor: '#4F46E5', padding: 24, borderRadius: 22, alignItems: 'center', marginTop: 15, elevation: 5 }
});
