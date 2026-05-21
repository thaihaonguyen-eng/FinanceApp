import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db, getFormattedMonth } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

export default function BudgetManagerScreen({ navigation }) {
  const { user } = useUser();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const [selCat, setSelCat] = useState(null);
  const [limit, setLimit] = useState('');
  const currentMonth = getFormattedMonth(); // vd: 05/2026

  const loadData = async () => {
    // Tải danh mục chi phí
    const cats = await db.getAllAsync('SELECT * FROM categories WHERE type = "expense"');
    setCategories(cats);
    if(cats.length > 0 && !selCat) setSelCat(cats[0].id);

    // Tải ngân sách tháng này
    const bs = await db.getAllAsync(`
      SELECT b.*, c.name as catName, c.icon as catIcon, c.color as catColor 
      FROM budgets b 
      JOIN categories c ON b.category_id = c.id 
      WHERE b.user_id = ? AND b.month_year = ?
    `, [user.id, currentMonth]);

    // Tính tổng đã chi cho ngân sách đó
    const txs = await db.getAllAsync(`
      SELECT category_id, SUM(amount) as total_spent 
      FROM transactions 
      WHERE user_id = ? AND type = 'expense' AND date LIKE ? 
      GROUP BY category_id
    `, [user.id, `%${currentMonth}%`]);

    const txMap = {};
    txs.forEach(t => txMap[t.category_id] = t.total_spent);

    const enrichedBudgets = bs.map(b => ({
      ...b,
      spent: txMap[b.category_id] || 0
    }));

    setBudgets(enrichedBudgets);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addBudget = async () => {
    if (!limit) return Alert.alert("Lỗi", "Vui lòng nhập giới hạn!");
    const limitVal = parseFloat(limit);
    if (isNaN(limitVal) || limitVal <= 0) return Alert.alert("Lỗi", "Hạn mức phải lớn hơn 0!");
    
    // Check if budget already exists for this category this month
    const existing = budgets.find(b => b.category_id === selCat);
    if (existing) {
       await db.runAsync('UPDATE budgets SET amount_limit = ? WHERE id = ?', [limitVal, existing.id]);
    } else {
       await db.runAsync('INSERT INTO budgets (user_id, category_id, amount_limit, month_year) VALUES (?, ?, ?, ?)', [user.id, selCat, limitVal, currentMonth]);
    }

    setLimit('');
    setShowModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadData();
  };

  const deleteBudget = (id) => {
    Alert.alert("Xóa", "Bạn muốn xóa hạn mức này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
          loadData();
      }}
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={32} color="#0F172A"/></TouchableOpacity>
          <Text style={styles.title}>Hạn mức tháng {currentMonth}</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle" size={24} color="#FFF" style={{marginRight: 10}} />
          <Text style={{color: '#FFF', fontWeight: '900', fontSize: 16}}>THIẾT LẬP HẠN MỨC</Text>
        </TouchableOpacity>

        <FlatList 
          data={budgets} 
          keyExtractor={i=>i.id.toString()} 
          contentContainerStyle={{paddingHorizontal: 25, paddingBottom: 100}} 
          renderItem={({item}) => {
            const percent = Math.min((item.spent / item.amount_limit) * 100, 100);
            const isOver = item.spent > item.amount_limit;
            
            return (
              <View style={styles.item}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.iconBox, {backgroundColor: item.catColor + '20'}]}>
                      <Ionicons name={item.catIcon} size={24} color={item.catColor} />
                    </View>
                    <Text style={{fontSize: 18, fontWeight: '900', color: '#1E293B', marginLeft: 15}}>{item.catName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteBudget(item.id)}>
                    <Ionicons name="trash" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 8}}>
                  <Text style={{color: isOver ? '#EF4444' : '#64748B', fontWeight: '800'}}>
                    {isOver ? "Đã vượt hạn mức!" : `Đã tiêu: ${item.spent.toLocaleString()}đ`}
                  </Text>
                  <Text style={{color: '#1E293B', fontWeight: '800'}}>/{item.amount_limit.toLocaleString()}đ</Text>
                </View>
                
                <View style={{height: 12, backgroundColor: '#F1F5F9', borderRadius: 6}}>
                  <View style={{height: 12, borderRadius: 6, backgroundColor: isOver ? '#EF4444' : item.catColor, width: `${percent}%`}} />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{textAlign: 'center', color: '#94A3B8', marginTop: 50}}>Chưa có hạn mức nào trong tháng này.</Text>}
        />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
              <Text style={{fontSize: 22, fontWeight: '900', color: '#0F172A'}}>Tạo Hạn Mức</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close-circle" size={30} color="#94A3B8"/></TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Chọn danh mục:</Text>
            <FlatList 
              data={categories} 
              horizontal 
              showsHorizontalScrollIndicator={false}
              keyExtractor={i=>i.id.toString()}
              style={{maxHeight: 60, marginBottom: 20}}
              renderItem={({item}) => (
                <TouchableOpacity onPress={() => setSelCat(item.id)} style={[styles.chip, selCat===item.id && {backgroundColor: item.color}]}>
                  <Ionicons name={item.icon} size={18} color={selCat===item.id?'#FFF':'#64748B'} style={{marginRight:5}}/>
                  <Text style={{color: selCat===item.id?'#FFF':'#64748B', fontWeight: '800'}}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />

            <TextInput 
              placeholder="Nhập số tiền tối đa (VD: 5,000,000)..." 
              keyboardType="numeric" 
              style={styles.input} 
              value={limit} 
              onChangeText={setLimit} 
            />
            
            <TouchableOpacity style={styles.btn} onPress={addBudget}>
              <Text style={{color: '#FFF', fontWeight: '900', fontSize: 16}}>LƯU HẠN MỨC</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, 
  header: {padding: 25, flexDirection: 'row', alignItems: 'center'}, 
  title: {fontSize: 24, fontWeight: '900', marginLeft: 15, color: '#0F172A'},
  addBtn: { backgroundColor: '#4F46E5', flexDirection: 'row', marginHorizontal: 25, padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 5 },
  item: { backgroundColor: '#FFF', padding: 25, borderRadius: 25, marginBottom: 15, elevation: 4 },
  iconBox: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 30, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: 50 },
  label: {fontSize: 16, fontWeight: '800', color: '#64748B', marginBottom: 10},
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginRight: 10 },
  input: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20, marginBottom: 15, fontSize: 17, fontWeight: '700', borderWidth: 1, borderColor: '#E2E8F0' }, 
  btn: { backgroundColor: '#10B981', padding: 22, borderRadius: 20, alignItems: 'center', marginTop: 10, elevation: 5 }
});
