import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db, getFormattedDate } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';
import { parseMoneyInput } from '../utils/money';

export default function TransferScreen({ navigation }) {
  const { user } = useUser();
  const [wallets, setWallets] = useState([]);
  const [fromWal, setFromWal] = useState(null);
  const [toWal, setToWal] = useState(null);
  const [amt, setAmt] = useState('');
  const [fee, setFee] = useState('0');
  const [note, setNote] = useState('');

  useEffect(() => {
    const loadF = async () => {
      const w = await db.getAllAsync('SELECT * FROM wallets WHERE user_id = ?', [user.id]);
      setWallets(w);
      if(w.length >= 2) {
        setFromWal(w[0].id);
        setToWal(w[1].id);
      } else if (w.length === 1) {
        setFromWal(w[0].id);
      }
    }; 
    loadF();
  }, []);

  const handleSave = async () => {
    if (!amt) return Alert.alert("Lỗi", "Nhập số tiền cần chuyển!");
    const amountVal = parseMoneyInput(amt);
    const feeVal = parseMoneyInput(fee) || 0;

    if (isNaN(amountVal) || amountVal <= 0) {
      return Alert.alert("Lỗi", "Số tiền không hợp lệ!");
    }
    if (fromWal === toWal) {
      return Alert.alert("Lỗi", "Ví nguồn và ví đích không được trùng nhau!");
    }
    if (!fromWal || !toWal) {
      return Alert.alert("Lỗi", "Vui lòng chọn ví nguồn và ví đích!");
    }

    const sourceWallet = wallets.find(w => w.id === fromWal);
    if (sourceWallet && (amountVal + feeVal) > sourceWallet.balance) {
      return Alert.alert("Lỗi", "Số dư trong ví nguồn không đủ để chuyển và trả phí!");
    }

    try {
      await db.runAsync('INSERT INTO transfers (user_id, from_wallet_id, to_wallet_id, amount, date, fee, note) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [user.id, fromWal, toWal, amountVal, getFormattedDate(), feeVal, note]);
      
      // Ghi thêm phí chuyển vào giao dịch nếu có phí > 0
      if (feeVal > 0) {
        await db.runAsync('INSERT INTO transactions (user_id, wallet_id, category_id, title, amount, type, date) VALUES (?, ?, NULL, ?, ?, ?, ?)', 
          [user.id, fromWal, 'Phí chuyển tiền', feeVal, 'expense', getFormattedDate()]);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Lỗi", e.message);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={{padding: 25, flex: 1}}>
        <View style={styles.header}>
          <Text style={styles.title}>Chuyển Tiền</Text>
          <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="close-circle" size={36} color="#94A3B8"/></TouchableOpacity>
        </View>

        <Text style={styles.label}>Từ ví (Nguồn):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight: 55, marginBottom: 15}}>
          {wallets.map(w => (
            <TouchableOpacity key={w.id} onPress={()=>setFromWal(w.id)} style={[styles.chipWal, fromWal===w.id && {borderColor: '#F43F5E', backgroundColor: '#FFF1F2'}]}>
              <Ionicons name={w.icon} size={18} color={w.color} style={{marginRight:5}}/>
              <Text style={{color: '#1E293B', fontWeight: '800'}}>{w.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{alignItems: 'center', marginVertical: -10, zIndex: 10}}>
          <View style={{backgroundColor: '#FFF', padding: 5, borderRadius: 20}}>
            <Ionicons name="arrow-down-circle" size={30} color="#94A3B8" />
          </View>
        </View>

        <Text style={styles.label}>Đến ví (Đích):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight: 55, marginBottom: 25}}>
          {wallets.map(w => (
            <TouchableOpacity key={w.id} onPress={()=>setToWal(w.id)} style={[styles.chipWal, toWal===w.id && {borderColor: '#10B981', backgroundColor: '#ECFDF5'}]}>
              <Ionicons name={w.icon} size={18} color={w.color} style={{marginRight:5}}/>
              <Text style={{color: '#1E293B', fontWeight: '800'}}>{w.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput placeholder="Số tiền chuyển..." keyboardType="numeric" style={styles.input} value={amt} onChangeText={setAmt} />
        <TextInput placeholder="Phí giao dịch (Mặc định: 0)" keyboardType="numeric" style={styles.input} value={fee} onChangeText={setFee} />
        <TextInput placeholder="Ghi chú..." style={styles.input} value={note} onChangeText={setNote} />
        
        <TouchableOpacity style={styles.btn} onPress={handleSave}>
          <Text style={{color: '#FFF', fontWeight: '900', fontSize: 17}}>THỰC HIỆN CHUYỂN</Text>
        </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, 
  header: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center'}, 
  title: {fontSize: 30, fontWeight: '900', color: '#0F172A'},
  label: {fontSize: 16, fontWeight: '800', color: '#64748B', marginBottom: 10, marginLeft: 5},
  chipWal: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 20, marginRight: 12 },
  input: { backgroundColor: '#F1F5F9', padding: 22, borderRadius: 22, marginBottom: 15, fontSize: 18, color: '#1E293B', fontWeight: '800' }, 
  btn: { backgroundColor: '#0F172A', padding: 24, borderRadius: 25, alignItems: 'center', marginTop: 10, elevation: 5 }
});
