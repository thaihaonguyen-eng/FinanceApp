import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Image, Platform, Alert, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

export default function SettingsScreen() {
  const { user, logout, updateUser } = useUser();
  const [geminiKey, setGeminiKey] = useState('');
  const [bioEnabled, setBioEnabled] = useState(user?.is_biometric_enabled === 1);

  const toggleBio = async (val) => {
    if (!user) return;
    setBioEnabled(val);
    await db.runAsync('UPDATE users SET is_biometric_enabled = ? WHERE id = ?', [val ? 1 : 0, user.id]);
    updateUser({ ...user, is_biometric_enabled: val ? 1 : 0 });
  };

  useEffect(() => {
    setBioEnabled(user?.is_biometric_enabled === 1);
  }, [user]);

  useEffect(() => {
    AsyncStorage.getItem('gemini_api_key').then(k => setGeminiKey(k || ''));
  }, []);

  const saveGeminiKey = (txt) => {
    setGeminiKey(txt);
    AsyncStorage.setItem('gemini_api_key', txt);
  };

  const pickImage = async () => {
    if (!user) return;
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) {
      await db.runAsync('UPDATE users SET avatar_uri = ? WHERE id = ?', [result.assets[0].uri, user.id]);
      updateUser({ ...user, avatar_uri: result.assets[0].uri });
    }
  };

  const exportCSV = async () => {
    if (!user) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const txs = await db.getAllAsync(`SELECT t.title, t.amount, t.type, t.date, c.name as catName, w.name as walletName FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.user_id = ? ORDER BY t.timestamp DESC`, [user.id]);
      
      let csvString = "\uFEFFTên giao dịch,Số tiền (VND),Loại,Ngày,Danh mục,Nguồn tiền\n";
      txs.forEach(t => { 
        let safeTitle = t.title ? t.title.replace(/,/g, ' ') : 'Trống';
        csvString += `${safeTitle},${t.amount},${t.type === 'income' ? 'Thu' : 'Chi'},${t.date},${t.catName},${t.walletName}\n`; 
      });

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, 'BaoCao_Finance', 'text/csv');
          await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
          Alert.alert("Thành công", "Đã lưu file báo cáo Excel!");
        }
      } else {
        const fileUri = FileSystem.cacheDirectory + "BaoCao_Finance.csv";
        await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      }
    } catch (e) { Alert.alert("Lỗi", e.message); }
  };

  const backupDB = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const dbPath = FileSystem.documentDirectory + 'SQLite/finance_team_pro_2026.db';
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      
      if (!dbInfo.exists) {
        return Alert.alert("Lỗi", "Không tìm thấy dữ liệu để sao lưu!");
      }

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, 'FinanceBackup.db', 'application/octet-stream');
          const base64 = await FileSystem.readAsStringAsync(dbPath, { encoding: FileSystem.EncodingType.Base64 });
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert("Thành công", "Đã sao lưu dữ liệu lên Cloud/Máy thành công!");
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(dbPath, { mimeType: 'application/octet-stream', dialogTitle: 'Sao lưu dữ liệu' });
        }
      }
    } catch (e) { Alert.alert("Lỗi", e.message); }
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
             <TextInput style={{backgroundColor: '#F8FAFC', width: '100%', padding: 15, borderRadius: 15, borderColor: '#E2E8F0', borderWidth: 1, fontSize: 13, alignSelf: 'stretch'}} placeholder="Nhập mã API Key của bạn..." value={geminiKey} onChangeText={saveGeminiKey} secureTextEntry={true} />
             <Text style={{fontSize: 12, color: '#94A3B8', marginTop: 10}}>*Mã này được lưu tuyệt đối bảo mật trên bộ nhớ máy cục bộ. Xin vui lòng không chia sẻ.</Text>
          </View>
        </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}><Ionicons name="log-out" size={24} color="#FFF" style={{marginRight: 10}} /><Text style={{color: '#FFF', fontWeight: '900', fontSize: 16}}>ĐĂNG XUẤT AN TOÀN</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, title: { fontSize: 36, fontWeight: '900', marginHorizontal: 25, marginBottom: 25, marginTop: 20, color: '#0F172A' },
  profileCard: { flexDirection: 'row', alignItems: 'center', margin: 25, padding: 30, backgroundColor: '#FFF', borderRadius: 40, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 }, shadowRadius: 15, elevation: 10 }, avatarContainer: { position: 'relative' }, avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }, badge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1E293B', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  group: { backgroundColor: '#FFF', marginHorizontal: 25, borderRadius: 35, padding: 15, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10, elevation: 6 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }, iconBox: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECFDF5' }, rowText: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginLeft: 15 },
  bioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
  bioLabelWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  bioText: { flex: 1, minWidth: 0, lineHeight: 22 },
  bioSwitch: { transform: [{ scale: 0.9 }] },
  logoutBtn: { flexDirection: 'row', margin: 25, backgroundColor: '#EF4444', padding: 24, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 10 }
});
