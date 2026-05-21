import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

export default function WalletManagerScreen({ navigation }) {
  const { user } = useUser();
  const [wallets, setWallets] = useState([]); const [name, setName] = useState(''); const [bal, setBal] = useState('');
  const [currency, setCurrency] = useState('VND'); const [isShared, setIsShared] = useState(false);
  const [excludeFromTotal, setExcludeFromTotal] = useState(false);
  
  const load = async () => setWallets(await db.getAllAsync('SELECT * FROM wallets WHERE user_id = ?', [user.id]));
  useEffect(() => { load(); }, []);

  const addWallet = async () => {
    if(!name || !bal) return Alert.alert("Lỗi", "Vui lòng nhập đủ thông tin!");
    const balVal = parseFloat(bal);
    if (isNaN(balVal) || balVal < 0) return Alert.alert("Lỗi", "Số dư ban đầu phải >= 0!");
    await db.runAsync('INSERT INTO wallets (user_id, name, balance, icon, color, currency, is_shared, exclude_from_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [user.id, name, balVal, 'wallet', '#3B82F6', currency, isShared ? 1 : 0, excludeFromTotal ? 1 : 0]);
    setName(''); setBal(''); setCurrency('VND'); setIsShared(false); setExcludeFromTotal(false); load(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteWallet = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa ví này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
          load();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}><TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={32} color="#0F172A"/></TouchableOpacity><Text style={styles.title}>Quản lý Nguồn tiền</Text></View>
        <View style={{paddingHorizontal: 25, marginBottom: 20}}>
        <TextInput placeholder="Tên ví mới (Momo, VNPay...)" style={styles.input} value={name} onChangeText={setName}/>
        <TextInput placeholder="Số dư ban đầu" keyboardType="numeric" style={styles.input} value={bal} onChangeText={setBal}/>
        
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 0}}>
          {['VND', 'USD', 'EUR'].map(c => (
             <TouchableOpacity key={c} onPress={()=>setCurrency(c)} style={{flex: 1, padding: 12, borderWidth: 1, borderColor: currency===c?'#4F46E5':'#E2E8F0', borderRadius: 15, marginHorizontal: 3, alignItems: 'center', backgroundColor: currency===c?'#EEF2FF':'#FFF'}}>
               <Text style={{fontWeight: '700', color: currency===c?'#4F46E5':'#94A3B8'}}>{c}</Text>
             </TouchableOpacity>
          ))}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 10}}>
          <Text style={{fontSize: 16, fontWeight: '700', color: '#1E293B'}}>Quỹ chung gia đình</Text>
          <Switch value={isShared} onValueChange={setIsShared} trackColor={{ false: "#E2E8F0", true: "#818CF8" }} thumbColor={isShared ? "#4F46E5" : "#f4f3f4"} />
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10}}>
          <Text style={{fontSize: 16, fontWeight: '700', color: '#1E293B'}}>Ví phụ (Loại khỏi Tổng tiền)</Text>
          <Switch value={excludeFromTotal} onValueChange={setExcludeFromTotal} trackColor={{ false: "#E2E8F0", true: "#FCA5A5" }} thumbColor={excludeFromTotal ? "#EF4444" : "#f4f3f4"} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={addWallet}><Text style={{color: '#FFF', fontWeight: '900'}}>THÊM VÍ MỚI</Text></TouchableOpacity>
        </View>
        <FlatList data={wallets} keyExtractor={i=>i.id.toString()} contentContainerStyle={{paddingHorizontal: 25}} renderItem={({item}) => (
          <View style={styles.item}>
            <Ionicons name={item.icon} size={30} color={item.color} style={{marginRight: 20}}/>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 18, fontWeight: '800'}}>{item.name}</Text>
              <Text style={{fontSize: 16, color: '#64748B', marginTop: 5}}>{item.balance.toLocaleString()} {item.currency}</Text>
            </View>
            {item.is_shared===1 && <View style={[styles.sharedTag, {marginRight: 10}]}><Text style={{fontSize:10, color:'#FFF', fontWeight:'bold'}}>Chung</Text></View>}
            {item.exclude_from_total===1 && <View style={[styles.sharedTag, {marginRight: 10, backgroundColor: '#94A3B8'}]}><Text style={{fontSize:10, color:'#FFF', fontWeight:'bold'}}>Phụ</Text></View>}
            <TouchableOpacity onPress={() => deleteWallet(item.id)} style={{padding: 5}}>
              <Ionicons name="trash" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}/>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, header: {padding: 25, flexDirection: 'row', alignItems: 'center'}, title: {fontSize: 26, fontWeight: '900', marginLeft: 15, color: '#0F172A'},
  input: { backgroundColor: '#FFF', padding: 22, borderRadius: 22, marginBottom: 15, fontSize: 17, fontWeight: '700', borderWidth: 1, borderColor: '#E2E8F0' }, btn: { backgroundColor: '#0F172A', padding: 22, borderRadius: 22, alignItems: 'center', marginBottom: 15 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 25, borderRadius: 25, marginBottom: 15, elevation: 3 },
  sharedTag: { backgroundColor: '#F43F5E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }
});
