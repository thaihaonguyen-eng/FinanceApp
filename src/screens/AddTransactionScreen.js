import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db, getFormattedDate } from '../services/db';
import { useUser } from '../context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import ScreenBackground from '../components/ScreenBackground';
import { parseMoneyInput } from '../utils/money';

export default function AddTransactionScreen({ navigation }) {
  const { user } = useUser();
  const [type, setType] = useState('expense'); const [amt, setAmt] = useState(''); const [note, setNote] = useState('');
  const [cats, setCats] = useState([]); const [selCat, setSelCat] = useState(null);
  const [wallets, setWallets] = useState([]); const [selWal, setSelWal] = useState(null);
  const [goals, setGoals] = useState([]);
  const [location, setLocation] = useState(''); const [imageUri, setImageUri] = useState(null); const [showAdvanced, setShowAdvanced] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  useEffect(() => {
    const loadF = async () => {
      if (type === 'savings') {
        const g = await db.getAllAsync('SELECT * FROM goals WHERE user_id = ?', [user.id]); setGoals(g); if(g.length) setSelCat(g[0].id);
      } else {
        const c = await db.getAllAsync('SELECT * FROM categories WHERE type = ?', [type]); setCats(c); if(c.length) setSelCat(c[0].id);
      }
      const w = await db.getAllAsync('SELECT * FROM wallets WHERE user_id = ?', [user.id]); setWallets(w); if(w.length && !selWal) setSelWal(w[0].id);
    }; loadF();
  }, [type]);

  const handleSave = async () => {
    if (!amt || !note) return Alert.alert("Lỗi", "Nhập đủ tiền và nội dung!");
    const amountVal = parseMoneyInput(amt);

    if (isNaN(amountVal) || amountVal <= 0) {
      return Alert.alert("Lỗi", "Số tiền không hợp lệ! Vui lòng nhập số tiền lớn hơn 0.");
    }
    if (!selWal) return Alert.alert("Lỗi", "Vui lòng tạo hoặc chọn ví trước!");
    if (type === 'savings' && !selCat) return Alert.alert("Lỗi", "Vui lòng tạo hoặc chọn mục tiêu tiết kiệm!");

    if (type !== 'income') {
      const selectedWallet = wallets.find(w => w.id === selWal);
      if (selectedWallet && amountVal > selectedWallet.balance) {
        return Alert.alert("Lỗi", "Số dư trong ví không đủ để thực hiện giao dịch này!");
      }
    }

    // Cảnh báo vượt hạn mức chi tiêu
    if (type === 'expense' && selCat) {
      const { getFormattedMonth } = require('../services/db');
      const currentMonth = getFormattedMonth();
      const budget = await db.getFirstAsync(
        'SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month_year = ?',
        [user.id, selCat, currentMonth]
      );
      if (budget) {
        const spentResult = await db.getFirstAsync(
          "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND category_id = ? AND type = 'expense' AND date LIKE ?",
          [user.id, selCat, `%${currentMonth}%`]
        );
        const alreadySpent = spentResult?.total || 0;
        if (alreadySpent + amountVal > budget.amount_limit) {
          return new Promise((resolve) => {
            Alert.alert(
              "⚠️ Vượt hạn mức!",
              `Giao dịch này sẽ khiến bạn chi ${(alreadySpent + amountVal).toLocaleString()}đ / ${budget.amount_limit.toLocaleString()}đ trong tháng.\n\nBạn vẫn muốn tiếp tục?`,
              [
                { text: "Hủy", style: "cancel", onPress: () => resolve() },
                { text: "Vẫn chi", style: "destructive", onPress: async () => {
                  await doSave(amountVal);
                  resolve();
                }}
              ]
            );
          });
        }
      }
    }

    if (type === 'savings') {
      const selectedGoal = goals.find(g => g.id === selCat);
      if (selectedGoal && (selectedGoal.saved_amount + amountVal > selectedGoal.target_amount)) {
        return Alert.alert("Thông báo", `Số tiền này vượt quá mục tiêu! Quỹ chỉ còn thiếu ${(selectedGoal.target_amount - selectedGoal.saved_amount).toLocaleString()}đ nữa thôi.`);
      }
      await db.runAsync('UPDATE goals SET saved_amount = saved_amount + ? WHERE id = ?', [amountVal, selCat]);
      await db.runAsync('INSERT INTO transactions (user_id, wallet_id, category_id, goal_id, title, amount, type, date, location, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [user.id, selWal, null, selCat, note, amountVal, type, getFormattedDate(), location, imageUri]);
    } else {
      await doSave(amountVal);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const doSave = async (amountVal) => {
    await db.runAsync('INSERT INTO transactions (user_id, wallet_id, category_id, goal_id, title, amount, type, date, location, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [user.id, selWal, selCat, null, note, amountVal, type, getFormattedDate(), location, imageUri]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <ScrollView contentContainerStyle={{padding: 25, flexGrow: 1}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}><Text style={styles.title}>Tạo Giao Dịch</Text><TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="close-circle" size={36} color="#94A3B8"/></TouchableOpacity></View>
            <View style={{flexDirection: 'row', marginBottom: 25}}>
              <TouchableOpacity onPress={()=>setType('income')} style={[styles.typeBtn, type==='income' && styles.typeInc]}><Text style={[styles.typeText, {color: type==='income'?'#059669':'#64748B'}]}>THU</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>setType('expense')} style={[styles.typeBtn, type==='expense' && styles.typeExp]}><Text style={[styles.typeText, {color: type==='expense'?'#E11D48':'#64748B'}]}>CHI</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>setType('savings')} style={[styles.typeBtn, type==='savings' && styles.typeSav]}><Text style={[styles.typeText, {color: type==='savings'?'#4F46E5':'#64748B'}]}>TIẾT KIỆM</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>{(type === 'savings' ? goals : cats).map(c => (<TouchableOpacity key={c.id} onPress={()=>setSelCat(c.id)} style={[styles.chip, selCat===c.id && {backgroundColor: c.color}]}><Ionicons name={c.icon} size={18} color={selCat===c.id?'#FFF':'#64748B'} style={{marginRight:5}}/><Text style={{color: selCat===c.id?'#FFF':'#64748B', fontWeight: '800'}}>{c.name}</Text></TouchableOpacity>))}</ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 25}}>{wallets.map(w => (<TouchableOpacity key={w.id} onPress={()=>setSelWal(w.id)} style={[styles.chipWal, selWal===w.id && {borderColor: '#4F46E5', backgroundColor: '#EEF2FF'}]}><Ionicons name={w.icon} size={18} color={w.color} style={{marginRight:5}}/><Text style={{color: '#1E293B', fontWeight: '800'}}>{w.name}</Text></TouchableOpacity>))}</ScrollView>
            <TextInput placeholder={`Số tiền (${wallets.find(w=>w.id===selWal)?.currency || 'VND'})`} keyboardType="numeric" style={styles.input} value={amt} onChangeText={setAmt} />
            <TextInput placeholder="Nội dung..." style={styles.input} value={note} onChangeText={setNote} />
            
            <TouchableOpacity onPress={()=>setShowAdvanced(!showAdvanced)} style={{paddingVertical: 10, alignItems: 'center'}}>
              <Text style={{color: '#64748B', fontWeight: '700'}}>Tính năng mở rộng (Vị trí, Hóa đơn) <Ionicons name={showAdvanced?"chevron-up":"chevron-down"} /></Text>
            </TouchableOpacity>
            {showAdvanced && (
              <View style={{backgroundColor: '#F8FAFC', padding: 15, borderRadius: 20, marginBottom: 15}}>
                 <TextInput placeholder="Địa điểm (Ví dụ: Highlands Coffee)..." style={[styles.input, {backgroundColor: '#FFF'}]} value={location} onChangeText={setLocation} />
                 <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 20}} onPress={pickImage}>
                   <Ionicons name="camera" size={24} color="#4F46E5" style={{marginRight: 10}}/>
                   <Text style={{color: '#1E293B', fontWeight: '700', flex: 1}}>{imageUri ? 'Đã đính kèm ảnh' : 'Đính kèm ảnh hóa đơn'}</Text>
                   {imageUri && <Image source={{uri: imageUri}} style={{width: 40, height: 40, borderRadius: 10}}/>}
                 </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.btn} onPress={handleSave}><Text style={{color: '#FFF', fontWeight: '900', fontSize: 17}}>XÁC NHẬN</Text></TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, header: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center'}, title: {fontSize: 30, fontWeight: '900', color: '#0F172A'},
  typeBtn: { flex: 1, padding: 15, borderRadius: 22, alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#F1F5F9', marginHorizontal: 3 }, typeInc: {borderColor:'#10B981', backgroundColor:'#ECFDF5'}, typeExp: {borderColor:'#F43F5E', backgroundColor:'#FFF1F2'}, typeSav: {borderColor:'#4F46E5', backgroundColor:'#EEF2FF'}, typeText: {fontWeight:'900'},
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 20, marginRight: 12 }, chipWal: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 20, marginRight: 12 },
  input: { backgroundColor: '#F1F5F9', padding: 22, borderRadius: 22, marginBottom: 15, fontSize: 18, color: '#1E293B', fontWeight: '800' }, btn: { backgroundColor: '#4F46E5', padding: 24, borderRadius: 25, alignItems: 'center', marginTop: 10, shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 5 }
});
