import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Image, Platform, Alert, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { db } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';
import { Transaction } from '../types';

export default function SettingsScreen() {
  const { user, logout, updateUser } = useUser();
  const [geminiKey, setGeminiKey] = useState('');
  const [bioEnabled, setBioEnabled] = useState(user?.is_biometric_enabled === 1);

  const toggleBio = async (val: boolean) => {
    if (!user) return;
    setBioEnabled(val);
    await db.runAsync('UPDATE users SET is_biometric_enabled = ? WHERE id = ?', [val ? 1 : 0, user.id]);
    updateUser({ is_biometric_enabled: val ? 1 : 0 });
  };

  useEffect(() => {
    setBioEnabled(user?.is_biometric_enabled === 1);
  }, [user]);

  useEffect(() => {
    SecureStore.getItemAsync('gemini_api_key').then(k => setGeminiKey(k || ''));
  }, []);

  const saveGeminiKey = async (txt: string) => {
    setGeminiKey(txt);
    await SecureStore.setItemAsync('gemini_api_key', txt);
  };

  const pickImage = async () => {
    if (!user) return;
    let result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.5 
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      await db.runAsync('UPDATE users SET avatar_uri = ? WHERE id = ?', [uri, user.id]);
      updateUser({ avatar_uri: uri });
    }
  };

  const exportCSV = async () => {
    if (!user) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const txs = await db.getAllAsync<Transaction>(`SELECT t.title, t.amount, t.type, t.date, c.name as catName, w.name as walletName FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.user_id = ? ORDER BY t.timestamp DESC`, [user.id]);
      
      let csvString = "\uFEFFTên giao dịch,Số tiền (VND),Loại,Ngày,Danh mục,Nguồn tiền\n";
      txs.forEach(t => { 
        let safeTitle = t.title ? t.title.replace(/,/g, ' ') : 'Trống';
        let typeStr = t.type === 'income' ? 'Thu' : (t.type as any) === 'savings' ? 'Tiết kiệm' : 'Chi';
        csvString += `${safeTitle},${t.amount},${typeStr},${t.date},${(t as any).catName || ''},${t.walletName}\n`; 
      });

      const file = new File(Paths.cache, "BaoCao_Finance.csv");
      file.write(csvString);
      
      const uriToShare = (file as any).uri || `file://${file.name}`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uriToShare, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      } else {
        Alert.alert("Thành công", "File báo cáo Excel đã tạo (Không hỗ trợ chia sẻ)");
      }
    } catch (e: any) { Alert.alert("Lỗi", e.message); }
  };

  const backupDB = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const dbFile = new File(Paths.document, 'SQLite', 'finance_team_pro_2026.db');
      
      if (!dbFile.exists) {
        return Alert.alert("Lỗi", "Không tìm thấy dữ liệu để sao lưu!");
      }

      const uriToShare = (dbFile as any).uri || `file://${dbFile.name}`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uriToShare, { mimeType: 'application/octet-stream', UTI: 'public.database' });
      } else {
        Alert.alert("Thành công", "Đã tìm thấy database, nhưng máy không hỗ trợ Share");
      }
    } catch (e: any) { Alert.alert("Lỗi", e.message); }
  };

  if (!user) return null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
          <Text style={styles.title}>Hệ thống</Text>
        
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {(user.avatar_uri && user.avatar_uri !== 'null') ? <Image source={{ uri: user.avatar_uri }} style={styles.avatar} /> : <View style={[styles.avatar, {backgroundColor: '#4F46E5'}]}><Text style={{color: '#FFF', fontSize: 30, fontWeight: '900'}}>{user.full_name.charAt(0)}</Text></View>}
            <View style={styles.badge}><Ionicons name="camera" size={14} color="#FFF" /></View>
          </TouchableOpacity>
          <View style={{marginLeft: 20}}><Text style={{fontSize: 22, fontWeight: '900', color: '#1E293B'}}>{user.full_name}</Text><Text style={{color: '#64748B', fontWeight: '600', marginTop: 4}}>UID: {user.username}</Text></View>
        </View>

        <View style={styles.group}>
          <TouchableOpacity style={styles.row} onPress={backupDB}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={[styles.iconBox, {backgroundColor: '#EFF6FF'}]}><Ionicons name="cloud-upload" size={20} color="#3B82F6"/></View><Text style={styles.rowText}>Sao lưu dữ liệu (Backup)</Text></View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <View style={{height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20}} />
          <TouchableOpacity style={styles.row} onPress={exportCSV}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}><View style={styles.iconBox}><Ionicons name="document-text" size={20} color="#10B981"/></View><Text style={styles.rowText}>Xuất báo cáo Excel (CSV)</Text></View>
            <Ionicons name="download" size={20} color="#10B981" />
          </TouchableOpacity>
        </View>

        <View style={[styles.group, {marginTop: 20}]}>
          <View style={styles.bioRow}>
            <View style={styles.bioLabelWrap}>
              <View style={[styles.iconBox, {backgroundColor: '#EEF2FF'}]}><Ionicons name="finger-print" size={20} color="#4F46E5"/></View>
              <Text style={[styles.rowText, styles.bioText]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78}>Đăng nhập Sinh trắc học</Text>
            </View>
            <Switch style={styles.bioSwitch} value={bioEnabled} onValueChange={toggleBio} trackColor={{ false: "#E2E8F0", true: "#818CF8" }} thumbColor={bioEnabled ? "#4F46E5" : "#f4f3f4"} />
          </View>
        </View>

        <View style={[styles.group, {marginTop: 20}]}>
          <View style={[styles.row, {flexDirection: 'column', alignItems: 'flex-start', padding: 20}]}>
             <Text style={[styles.rowText, {marginLeft: 0, marginBottom: 15}]}><Ionicons name="sparkles" size={18} color="#8B5CF6"/> API Key Trợ lý AI (Google Gemini)</Text>
             <TextInput style={styles.apiKeyInput} placeholder="Nhập mã API Key của bạn..." value={geminiKey} onChangeText={saveGeminiKey} secureTextEntry={true} />
             <Text style={styles.apiKeyHint}>*Mã này được lưu tuyệt đối bảo mật trên bộ nhớ máy cục bộ. Xin vui lòng không chia sẻ.</Text>
          </View>
        </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}><Ionicons name="log-out" size={24} color="#FFF" style={{marginRight: 10}} /><Text style={{color: '#FFF', fontWeight: '900', fontSize: 16}}>ĐĂNG XUẤT AN TOÀN</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, 
  title: { fontSize: 36, fontWeight: '900', marginHorizontal: 25, marginBottom: 25, marginTop: 20, color: '#0F172A' },
  profileCard: { flexDirection: 'row', alignItems: 'center', margin: 25, padding: 30, backgroundColor: '#FFF', borderRadius: 40, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 }, shadowRadius: 15, elevation: 10 }, 
  avatarContainer: { position: 'relative' }, 
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }, 
  badge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1E293B', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  group: { backgroundColor: '#FFF', marginHorizontal: 25, borderRadius: 35, padding: 15, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10, elevation: 6 }, 
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }, 
  iconBox: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECFDF5' }, 
  rowText: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginLeft: 15 },
  bioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
  bioLabelWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  bioText: { flex: 1, minWidth: 0, lineHeight: 22 },
  bioSwitch: { transform: [{ scale: 0.9 }] },
  apiKeyInput: {backgroundColor: '#F8FAFC', width: '100%', padding: 15, borderRadius: 15, borderColor: '#E2E8F0', borderWidth: 1, fontSize: 13, alignSelf: 'stretch'},
  apiKeyHint: {fontSize: 12, color: '#94A3B8', marginTop: 10},
  logoutBtn: { flexDirection: 'row', margin: 25, backgroundColor: '#EF4444', padding: 24, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 10 }
});
