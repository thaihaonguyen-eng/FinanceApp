import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, SafeAreaView, Modal, KeyboardAvoidingView, Platform, Alert, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db, getFormattedDate } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';
import { parseMoneyInput } from '../utils/money';

export default function GoalManagerScreen({ navigation }) {
  const { user } = useUser();
  const [goals, setGoals] = useState([]); 
  const [name, setName] = useState(''); 
  const [target, setTarget] = useState('');
  
  const [depositModal, setDepositModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositAmt, setDepositAmt] = useState('');
  const [wallets, setWallets] = useState([]);
  const [selWal, setSelWal] = useState(null);

  const load = async () => {
    setGoals(await db.getAllAsync('SELECT * FROM goals WHERE user_id = ?', [user.id]));
    const w = await db.getAllAsync('SELECT * FROM wallets WHERE user_id = ?', [user.id]);
    setWallets(w);
    if(w.length && !selWal) setSelWal(w[0].id);
  };
  useEffect(() => { load(); }, []);

  const addGoal = async () => {
    if(!name || !target) return Alert.alert("Lỗi", "Vui lòng nhập đủ thông tin!");
    const targetVal = parseMoneyInput(target);
    if (isNaN(targetVal) || targetVal <= 0) return Alert.alert("Lỗi", "Số tiền mục tiêu phải lớn hơn 0!");
    await db.runAsync('INSERT INTO goals (user_id, name, target_amount, saved_amount, icon, color) VALUES (?, ?, ?, 0, ?, ?)', 
      [user.id, name, targetVal, 'star', '#D946EF']);
    setName(''); setTarget(''); load(); 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteGoal = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa mục tiêu này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
          load();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
    ]);
  };

  // NẠP TIỀN: PHẢI CHỌN VÍ, TRỪ TIỀN TỪ VÍ, GHI GIAO DỊCH
  const confirmDeposit = async () => {
    if (!depositAmt) return Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ!");
    
    const amountVal = parseMoneyInput(depositAmt);
    if (isNaN(amountVal)) return Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ!");
    if (amountVal <= 0) return Alert.alert("Lỗi", "Số tiền phải lớn hơn 0!");
    if (!selWal) return Alert.alert("Lỗi", "Bạn chưa có ví nào! Hãy tạo ví trước.");

    if (selectedGoal.saved_amount + amountVal > selectedGoal.target_amount) {
      const remaining = selectedGoal.target_amount - selectedGoal.saved_amount;
      return Alert.alert("Thông báo", `Số tiền này vượt quá mục tiêu! Quỹ chỉ còn thiếu ${remaining.toLocaleString()}đ nữa thôi.`);
    }

    const wallet = wallets.find(w => w.id === selWal);
    if (wallet && amountVal > wallet.balance) {
      return Alert.alert("Lỗi", `Ví "${wallet.name}" chỉ còn ${wallet.balance.toLocaleString()}đ, không đủ để nạp!`);
    }

    try {
      await db.runAsync('UPDATE goals SET saved_amount = saved_amount + ? WHERE id = ?', [amountVal, selectedGoal.id]);
      // Ghi giao dịch savings → Trigger tự động trừ tiền ví
      await db.runAsync(
        'INSERT INTO transactions (user_id, wallet_id, category_id, goal_id, title, amount, type, date) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
        [user.id, selWal, selectedGoal.id, `Tiết kiệm: ${selectedGoal.name}`, amountVal, 'savings', getFormattedDate()]
      );
      setDepositModal(false); 
      setDepositAmt(''); 
      load();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch(e) {
      Alert.alert("Lỗi", "Không thể nạp tiền: " + e.message);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={32} color="#0F172A"/></TouchableOpacity>
          <Text style={styles.title}>Mục tiêu tiết kiệm</Text>
        </View>

        <View style={{paddingHorizontal: 25, marginBottom: 15}}>
          <TextInput placeholder="Tên mục tiêu (Mua nhà, Mua xe...)" style={styles.input} value={name} onChangeText={setName}/>
          <TextInput placeholder="Số tiền cần đạt" keyboardType="numeric" style={styles.input} value={target} onChangeText={setTarget}/>
          <TouchableOpacity style={styles.btn} onPress={addGoal}><Text style={{color: '#FFF', fontWeight: '900', fontSize: 16}}>TẠO MỤC TIÊU MỚI</Text></TouchableOpacity>
        </View>

        <FlatList 
          data={goals} 
          keyExtractor={i=>i.id.toString()} 
          contentContainerStyle={{paddingHorizontal: 25, paddingBottom: 100}} 
          renderItem={({item}) => {
            const percent = Math.min((item.saved_amount / item.target_amount) * 100, 100);
            return (
              <View style={styles.item}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{fontSize: 18, fontWeight: '900', color: '#1E293B', flex: 1}}>{item.name}</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity onPress={() => deleteGoal(item.id)} style={{marginRight: 10, padding: 5}}>
                      <Ionicons name="trash" size={24} color="#EF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setSelectedGoal(item); setDepositModal(true); Haptics.selectionAsync(); }} style={{padding: 5}}>
                      <Ionicons name="add-circle" size={28} color={item.color} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={{color: '#64748B', marginVertical: 8, fontWeight: '700'}}>
                  Đã gom: {item.saved_amount.toLocaleString()}đ / {item.target_amount.toLocaleString()}đ
                </Text>
                <View style={{height: 12, backgroundColor: '#F1F5F9', borderRadius: 6}}>
                  <View style={{height: 12, borderRadius: 6, backgroundColor: item.color, width: `${percent}%`}} />
                </View>
                <Text style={{textAlign: 'right', marginTop: 5, fontSize: 12, fontWeight: '800', color: item.color}}>{percent.toFixed(1)}%</Text>
              </View>
            );
          }}
        />

      {/* MODAL NẠP TIỀN - CÓ CHỌN VÍ */}
      <Modal visible={depositModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
              <Text style={{fontSize: 22, fontWeight: '900', color: '#0F172A', flex: 1}} numberOfLines={1}>Nạp tiền: {selectedGoal?.name}</Text>
              <TouchableOpacity onPress={() => setDepositModal(false)}><Ionicons name="close-circle" size={30} color="#94A3B8"/></TouchableOpacity>
            </View>
            
            <Text style={{color: '#64748B', marginBottom: 15, fontWeight: '600'}}>
              Đang có {selectedGoal?.saved_amount.toLocaleString()}đ / {selectedGoal?.target_amount.toLocaleString()}đ. Chọn ví nguồn:
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight: 55, marginBottom: 15}}>
              {wallets.map(w => (
                <TouchableOpacity key={w.id} onPress={()=>setSelWal(w.id)} style={[styles.chipWal, selWal===w.id && {borderColor: '#4F46E5', backgroundColor: '#EEF2FF'}]}>
                  <Ionicons name={w.icon} size={18} color={w.color} style={{marginRight:5}}/>
                  <Text style={{color: '#1E293B', fontWeight: '800'}}>{w.name} ({w.balance.toLocaleString()}đ)</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput 
              placeholder="Nhập số tiền nạp (VNĐ)..." 
              keyboardType="numeric" 
              style={styles.input} 
              value={depositAmt} 
              onChangeText={setDepositAmt} 
              autoFocus
            />
            
            <TouchableOpacity style={styles.depositBtn} onPress={confirmDeposit}>
              <Text style={{color: '#FFF', fontWeight: '900', fontSize: 16}}>XÁC NHẬN NẠP</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, 
  header: {padding: 25, flexDirection: 'row', alignItems: 'center'}, 
  title: {fontSize: 26, fontWeight: '900', marginLeft: 15, color: '#0F172A'},
  input: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 15, fontSize: 17, fontWeight: '700', borderWidth: 1, borderColor: '#E2E8F0' }, 
  btn: { backgroundColor: '#8B5CF6', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 15, elevation: 5 },
  item: { backgroundColor: '#FFF', padding: 25, borderRadius: 25, marginBottom: 15, elevation: 4, borderWidth: 1, borderColor: '#F8FAFC' },
  chipWal: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20, marginRight: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 30, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: 50 },
  depositBtn: { backgroundColor: '#10B981', padding: 22, borderRadius: 20, alignItems: 'center', marginTop: 10, elevation: 5 }
});
