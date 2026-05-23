import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, getFormattedMonth, getSetting, fetchExchangeRates } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

export default function HomeScreen({ navigation }) {
  const { user } = useUser();
  const [txs, setTxs] = useState([]); const [wallets, setWallets] = useState([]); const [goals, setGoals] = useState([]);
  const [refreshing, setRefreshing] = useState(false); const [currentMonth] = useState(getFormattedMonth());
  const [exchangeRates, setExchangeRates] = useState({});

  const anims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;

  const loadData = async () => {
    if (!user) return;
    setWallets(await db.getAllAsync('SELECT * FROM wallets WHERE user_id = ?', [user.id]));
    setGoals(await db.getAllAsync('SELECT * FROM goals WHERE user_id = ?', [user.id]));
    setTxs(await db.getAllAsync(`SELECT t.*, c.icon as catIcon, c.color as catColor, w.name as walletName, w.currency as walletCurrency FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN wallets w ON t.wallet_id = w.id WHERE t.user_id = ? ORDER BY t.timestamp DESC`, [user.id]));
    
    let rates = {};
    const ratesStr = await getSetting('exchange_rates');
    if (ratesStr) rates = JSON.parse(ratesStr);
    else rates = await fetchExchangeRates() || {};
    setExchangeRates(rates);
    
    // Play animations
    Animated.stagger(150, anims.map(anim => 
      Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true })
    )).start();
  };
  useEffect(() => { const unsub = navigation.addListener('focus', loadData); return unsub; }, [navigation]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setRefreshing(false); }, []);

  const getRate = (cur) => { 
    if (cur === 'VND' || !cur) return 1;
    if (exchangeRates[cur] && exchangeRates['VND']) {
       return exchangeRates['VND'] / exchangeRates[cur];
    }
    switch(cur) { case 'USD': return 25400; case 'EUR': return 27500; default: return 1; } 
  };

  const totalIncome = txs.filter(t => t.type === 'income' && t.date.includes(currentMonth)).reduce((s, t) => s + (t.amount * getRate(t.walletCurrency)), 0);
  const totalExpense = txs.filter(t => t.type === 'expense' && t.date.includes(currentMonth)).reduce((s, t) => s + (t.amount * getRate(t.walletCurrency)), 0);
  const netWorth = wallets.filter(w => w.exclude_from_total !== 1).reduce((s,w)=>s+(w.balance * getRate(w.currency)),0) + goals.reduce((s,g) => s + g.saved_amount, 0);

  if (!user) return null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 92 }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Chào {user.full_name.split(' ').pop()}</Text>
            <Text style={{color: '#64748B', fontWeight: '800', marginTop: 5}}>Tháng {currentMonth}</Text>
          </View>
          <TouchableOpacity style={{marginRight: 15, padding: 12, backgroundColor: '#EEF2FF', borderRadius: 20, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowOffset: {height: 4}, shadowRadius: 8, elevation: 5}} onPress={() => navigation.navigate('AIChat')}>
             <Ionicons name="sparkles" size={24} color="#4F46E5" />
          </TouchableOpacity>
          <View>
            <View style={styles.avatarPlaceholder}><Text style={{color: '#FFF', fontSize: 20, fontWeight:'bold'}}>{user.full_name ? user.full_name.charAt(0) : 'U'}</Text></View>
            {(user.avatar_uri && user.avatar_uri !== 'null' && user.avatar_uri !== 'undefined' && user.avatar_uri !== '') ? <Image source={{ uri: user.avatar_uri }} style={[styles.avatar, {position: 'absolute', top: 0, left: 0}]} /> : null}
          </View>
        </View>

        <Animated.View style={[styles.mainCard, { opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
          <View style={{position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)'}} />
          <View style={{position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.03)'}} />
          <Text style={styles.cardLabel}>Tài sản ròng</Text>
          <Text style={styles.cardBalance} numberOfLines={1} adjustsFontSizeToFit>{netWorth.toLocaleString()}đ</Text>
          <View style={styles.cardRow}>
             <View style={[styles.statItem, { backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 10, borderRadius: 16, marginRight: 10 }]}>
               <Ionicons name="arrow-down-circle" size={24} color="#34D399" />
               <View style={{marginLeft: 8}}>
                 <Text style={{color: '#94A3B8', fontSize: 11, fontWeight: '700'}}>Tổng Thu</Text>
                 <Text style={styles.statText} numberOfLines={1} adjustsFontSizeToFit>{totalIncome.toLocaleString()}</Text>
               </View>
             </View>
             <View style={[styles.statItem, { backgroundColor: 'rgba(244, 63, 94, 0.15)', padding: 10, borderRadius: 16 }]}>
               <Ionicons name="arrow-up-circle" size={24} color="#FB7185" />
               <View style={{marginLeft: 8}}>
                 <Text style={{color: '#94A3B8', fontSize: 11, fontWeight: '700'}}>Tổng Chi</Text>
                 <Text style={styles.statText} numberOfLines={1} adjustsFontSizeToFit>{totalExpense.toLocaleString()}</Text>
               </View>
             </View>
          </View>
        </Animated.View>

        <View style={{flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 25, marginTop: 5, marginBottom: 15}}>
          <TouchableOpacity style={{alignItems: 'center'}} onPress={() => navigation.navigate('Transfer')}>
            <View style={{width: 55, height: 55, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 5}}>
               <Ionicons name="swap-horizontal" size={26} color="#3B82F6" />
            </View>
            <Text style={{fontSize: 12, fontWeight: '700', color: '#1E293B'}}>Chuyển tiền</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{alignItems: 'center'}} onPress={() => navigation.navigate('Budget')}>
            <View style={{width: 55, height: 55, borderRadius: 20, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 5}}>
               <Ionicons name="pie-chart" size={26} color="#EF4444" />
            </View>
            <Text style={{fontSize: 12, fontWeight: '700', color: '#1E293B'}}>Hạn mức</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{alignItems: 'center'}} onPress={() => {navigation.navigate('History')}}>
            <View style={{width: 55, height: 55, borderRadius: 20, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 5}}>
               <Ionicons name="list" size={26} color="#22C55E" />
            </View>
            <Text style={{fontSize: 12, fontWeight: '700', color: '#1E293B'}}>Giao dịch</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: anims[1], transform: [{ translateY: anims[1].interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Ví của bạn</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallets')}><Text style={styles.linkText}>Quản lý</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingLeft: 25}}>
            {wallets.map((w, index) => {
                // Tự động gán dải gradient mượt mà dựa trên index
                const gradients = [
                  ['#4F46E5', '#7C3AED'], // Tím xanh
                  ['#F59E0B', '#EF4444'], // Cam đỏ
                  ['#10B981', '#059669'], // Xanh lá
                  ['#3B82F6', '#2563EB'], // Xanh lam
                ];
                const gradientColors = gradients[index % gradients.length];
                return (
                  <TouchableOpacity activeOpacity={0.8} key={w.id} style={styles.walletCardWrap}>
                    <LinearGradient colors={gradientColors} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.walletCard}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <Ionicons name={w.icon} size={30} color="#FFF" style={{marginBottom: 10}} />
                        {w.is_shared === 1 && <View style={{backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8}}><Text style={{fontSize: 10, color: '#FFF', fontWeight: 'bold'}}>CHUNG</Text></View>}
                      </View>
                      <Text style={styles.walletName} numberOfLines={1}>{w.name}</Text>
                      <Text style={styles.walletBalance} numberOfLines={1} adjustsFontSizeToFit>{w.balance.toLocaleString()} {w.currency || 'VND'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View style={{ opacity: anims[2], transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }}>
          <View style={[styles.rowBetween, {marginTop: 25}]}>
            <Text style={styles.sectionTitle}>Mục tiêu tiết kiệm</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Goals')}><Text style={styles.linkText}>Quản lý</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingLeft: 25, marginBottom: 8}}>
            {goals.map(g => {
               const progress = Math.min((g.saved_amount/g.target_amount)*100, 100);
               return (
                 <TouchableOpacity activeOpacity={0.9} key={g.id} style={styles.goalCard}>
                   <Text style={styles.goalName} numberOfLines={1}>{g.name}</Text>
                   <Text style={styles.goalAmount}>{g.saved_amount.toLocaleString()} / {g.target_amount.toLocaleString()}</Text>
                   <View style={styles.progressBg}>
                     <LinearGradient colors={[g.color, '#A78BFA']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.progressFill, { width: `${progress}%` }]} />
                   </View>
                 </TouchableOpacity>
               );
            })}
          </ScrollView>
        </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, header: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1 }, avatar: { width: 50, height: 50, borderRadius: 25 }, avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  mainCard: { backgroundColor: '#0F172A', margin: 25, marginTop: 5, padding: 30, borderRadius: 40, shadowColor: '#0F172A', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { height: 12 }, elevation: 15, overflow: 'hidden' }, cardLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }, cardBalance: { color: '#FFF', fontSize: 42, fontWeight: '900', marginVertical: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 20 }, statItem: { flexDirection: 'row', alignItems: 'center', flex: 1 }, statText: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 25, marginBottom: 15 }, sectionTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }, linkText: { color: '#4F46E5', fontWeight: '800', fontSize: 16 },
  walletCardWrap: { width: 190, minHeight: 140, marginRight: 15, borderRadius: 32, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 15, elevation: 8 }, walletCard: { flex: 1, padding: 25, borderRadius: 32 }, walletName: { color: '#FFF', fontSize: 15, opacity: 0.9, fontWeight: '600' }, walletBalance: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  goalCard: { width: 180, backgroundColor: '#FFF', padding: 22, borderRadius: 32, marginRight: 15, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 5 }, goalName: { fontSize: 16, fontWeight: '800', color: '#1E293B' }, goalAmount: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 4 }, progressBg: { height: 12, backgroundColor: '#E2E8F0', borderRadius: 10, marginTop: 15 }, progressFill: { height: 12, borderRadius: 10 }
});
