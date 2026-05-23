import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, SafeAreaView, Alert, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

export default function HistoryScreen({ navigation }) {
  const { user } = useUser();
  const [history, setHistory] = useState([]); const [query, setQuery] = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  
  const loadHist = async () => {
    if (!user) return;
    // Lấy giao dịch thu/chi/tiết kiệm
    const txs = await db.getAllAsync(`
      SELECT t.*, c.icon as catIcon, c.color as catColor, w.name as walletName 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN wallets w ON t.wallet_id = w.id 
      WHERE t.user_id = ? 
      ORDER BY t.timestamp DESC`, [user.id]);

    // Lấy giao dịch chuyển tiền
    const trs = await db.getAllAsync(`
      SELECT tr.*, wf.name as fromWalletName, wt.name as toWalletName 
      FROM transfers tr 
      LEFT JOIN wallets wf ON tr.from_wallet_id = wf.id 
      LEFT JOIN wallets wt ON tr.to_wallet_id = wt.id 
      WHERE tr.user_id = ? 
      ORDER BY tr.id DESC`, [user.id]);

    // Gộp chung và format transfers cho hiển thị đồng nhất
    const formattedTransfers = trs.map(tr => ({
      id: 'tr_' + tr.id,
      title: tr.note || `${tr.fromWalletName} → ${tr.toWalletName}`,
      amount: tr.amount,
      type: 'transfer',
      date: tr.date,
      catIcon: 'swap-horizontal',
      catColor: '#3B82F6',
      walletName: `${tr.fromWalletName} → ${tr.toWalletName}`,
      fee: tr.fee,
      isTransfer: true,
    }));

    // Gộp 2 danh sách, sắp xếp theo ngày giảm dần
    const all = [...txs, ...formattedTransfers].sort((a, b) => {
      // Parse date dd/mm/yyyy
      const parseDate = (d) => {
        if (!d) return 0;
        const parts = d.split('/');
        if (parts.length === 3) return new Date(parts[2], parts[1]-1, parts[0]).getTime();
        return 0;
      };
      return parseDate(b.date) - parseDate(a.date);
    });
    setHistory(all);
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadHist);
    return unsub;
  }, [navigation, user]);

  const handleDelete = (item) => {
    if (item.isTransfer) {
      return Alert.alert("Thông báo", "Không thể xóa giao dịch chuyển tiền từ lịch sử. Hãy liên hệ phần Cài đặt.");
    }
    Alert.alert("Hoàn tác", `Chắc chắn xóa và hoàn tiền?`, [
      { text: "Hủy", style: "cancel" }, 
      { text: "Xóa", style: "destructive", onPress: async () => { 
        if (item.type === 'savings' && item.goal_id) {
          await db.runAsync('UPDATE goals SET saved_amount = MAX(saved_amount - ?, 0) WHERE id = ?', [item.amount || 0, item.goal_id]);
        }
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [item.id]); 
        setDetailModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
        loadHist(); 
      }}
    ]);
  };

  const openDetail = (item) => {
    setSelectedTx(item);
    setDetailModal(true);
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'income': return { text: 'Thu nhập', color: '#10B981', bg: '#ECFDF5' };
      case 'expense': return { text: 'Chi tiêu', color: '#EF4444', bg: '#FEF2F2' };
      case 'savings': return { text: 'Tiết kiệm', color: '#4F46E5', bg: '#EEF2FF' };
      case 'transfer': return { text: 'Chuyển tiền', color: '#3B82F6', bg: '#EFF6FF' };
      default: return { text: type, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Sổ kế toán</Text>
        <View style={styles.searchBar}><Ionicons name="search" size={22} color="#94A3B8" /><TextInput placeholder="Tìm kiếm nội dung..." placeholderTextColor="#94A3B8" style={styles.searchInput} onChangeText={setQuery} /></View>
        <FlatList 
          contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 25 }} 
          data={history.filter(t => (t.title || '').toLowerCase().includes(query.toLowerCase()))} 
          keyExtractor={i => i.id.toString()} 
          renderItem={({ item }) => {
            const typeInfo = getTypeLabel(item.type);
            return (
              <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => openDetail(item)} onLongPress={() => handleDelete(item)}>
                <View style={[styles.iconBox, {backgroundColor: item.catColor || '#94A3B8'}]}><Ionicons name={item.catIcon || 'help'} size={22} color="#FFF"/></View>
                <View style={{flex: 1, marginLeft: 15}}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemDate}>{item.date} • {item.walletName}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={[styles.itemAmount, {color: typeInfo.color}]}>
                    {item.type==='income'?'+':item.type==='transfer'?'':'−'}{(item.amount || 0).toLocaleString()}đ
                  </Text>
                  {item.type === 'transfer' && item.fee > 0 && (
                    <Text style={{fontSize: 11, color: '#94A3B8', marginTop: 2}}>Phí: {item.fee.toLocaleString()}đ</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }} 
        />

      {/* MODAL CHI TIẾT GIAO DỊCH */}
      <Modal visible={detailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
              <Text style={{fontSize: 22, fontWeight: '900', color: '#0F172A'}}>Chi tiết</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}><Ionicons name="close-circle" size={30} color="#94A3B8"/></TouchableOpacity>
            </View>
            
            {selectedTx && (
              <View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
                  <View style={[styles.iconBox, {backgroundColor: selectedTx.catColor || '#94A3B8', width: 50, height: 50, borderRadius: 18}]}>
                    <Ionicons name={selectedTx.catIcon || 'help'} size={26} color="#FFF"/>
                  </View>
                  <View style={{marginLeft: 15, flex: 1}}>
                    <Text style={{fontSize: 20, fontWeight: '900', color: '#0F172A'}}>{selectedTx.title}</Text>
                    <View style={[{paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginTop: 5}, {backgroundColor: getTypeLabel(selectedTx.type).bg}]}>
                      <Text style={{fontSize: 12, fontWeight: '800', color: getTypeLabel(selectedTx.type).color}}>{getTypeLabel(selectedTx.type).text}</Text>
                    </View>
                  </View>
                </View>

                <View style={{backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20, marginBottom: 10}}>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Số tiền</Text><Text style={[styles.detailValue, {color: getTypeLabel(selectedTx.type).color}]}>{(selectedTx.amount || 0).toLocaleString()}đ</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Ngày</Text><Text style={styles.detailValue}>{selectedTx.date}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Nguồn tiền</Text><Text style={styles.detailValue}>{selectedTx.walletName}</Text></View>
                  {selectedTx.location ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Địa điểm</Text><Text style={styles.detailValue}>{selectedTx.location}</Text></View> : null}
                  {selectedTx.isTransfer && selectedTx.fee > 0 ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Phí</Text><Text style={styles.detailValue}>{selectedTx.fee.toLocaleString()}đ</Text></View> : null}
                </View>

                {selectedTx.image_uri && (
                  <View style={{alignItems: 'center', marginTop: 10}}>
                    <Text style={{fontWeight: '800', color: '#64748B', marginBottom: 8}}>Ảnh hóa đơn:</Text>
                    <Image source={{uri: selectedTx.image_uri}} style={{width: '100%', height: 200, borderRadius: 20}} resizeMode="cover" />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, title: { fontSize: 36, fontWeight: '900', marginHorizontal: 25, marginBottom: 20, marginTop: 20, color: '#0F172A' },
  searchBar: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 25, padding: 22, borderRadius: 30, alignItems: 'center', marginBottom: 25, elevation: 6 }, searchInput: { flex: 1, marginLeft: 15, fontSize: 17, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 22, borderRadius: 30, marginBottom: 15, elevation: 4 }, iconBox: { width: 56, height: 56, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' }, itemDate: { fontSize: 13, color: '#64748B', marginTop: 6, fontWeight: '600' }, itemAmount: { fontSize: 19, fontWeight: '900' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 30, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: 50 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailLabel: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  detailValue: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
});
