import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { db, getFormattedMonth, getSetting, fetchExchangeRates } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

const screenWidth = Dimensions.get("window").width;

export default function StatisticsScreen({ navigation }) {
  const { user } = useUser();
  const [chart, setChart] = useState([]); const [prediction, setPrediction] = useState(0);

  useEffect(() => { 
    navigation.addListener('focus', async () => {
      // Tải tỷ giá
      let rates = {};
      const ratesStr = await getSetting('exchange_rates');
      if (ratesStr) rates = JSON.parse(ratesStr);
      else rates = await fetchExchangeRates() || {};

      const getRate = (cur) => {
        if (cur === 'VND' || !cur) return 1;
        if (rates[cur] && rates['VND']) {
          return rates['VND'] / rates[cur];
        }
        switch(cur) { case 'USD': return 25400; case 'EUR': return 27500; default: return 1; }
      };

      // Biểu đồ danh mục - quy đổi sang VND
      const data = await db.getAllAsync(
        `SELECT c.name, c.color, t.amount, w.currency as walletCurrency
         FROM transactions t 
         JOIN categories c ON t.category_id = c.id 
         LEFT JOIN wallets w ON t.wallet_id = w.id
         WHERE t.user_id = ? AND t.type = 'expense'`, [user.id]);

      // Group by category name & sum with currency conversion
      const catMap = {};
      data.forEach(r => {
        const converted = r.amount * getRate(r.walletCurrency);
        if (!catMap[r.name]) {
          catMap[r.name] = { total: 0, color: r.color };
        }
        catMap[r.name].total += converted;
      });

      const chartData = Object.entries(catMap).map(([name, v]) => ({
        name: ` ${name}`, population: Math.round(v.total), color: v.color,
        legendFontColor: "#475569", legendFontSize: 13
      }));
      setChart(chartData);
      
      // Dự phóng chi tiêu - quy đổi sang VND
      const currentMonth = getFormattedMonth();
      const txs = await db.getAllAsync(
        `SELECT t.date, t.amount, w.currency as walletCurrency
         FROM transactions t
         LEFT JOIN wallets w ON t.wallet_id = w.id
         WHERE t.user_id = ? AND t.type = 'expense'`, [user.id]);

      const monthlyTxs = txs.filter(t => t.date.includes(currentMonth));
      
      let dailyData = {};
      monthlyTxs.forEach(t => {
         const day = parseInt(t.date.split('/')[0], 10);
         const converted = t.amount * getRate(t.walletCurrency);
         dailyData[day] = (dailyData[day] || 0) + converted;
      });
      
      const today = new Date().getDate();
      let totalWeight = 0;
      let weightedSum = 0;
      for (let i = 1; i <= today; i++) {
         const amount = dailyData[i] || 0;
         weightedSum += amount * i;
         totalWeight += i;
      }
      const wmaAvg = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      setPrediction(wmaAvg * daysInMonth);
    }); 
  }, [navigation]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
          <Text style={styles.title}>Phân tích & AI</Text>
          <View style={styles.aiCard}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}><Ionicons name="hardware-chip" size={28} color="#8B5CF6" /><Text style={{fontSize: 18, fontWeight: '900', color: '#1E293B', marginLeft: 10}}>Dự phóng chi tiêu theo ngày</Text></View>
            <Text style={{color: '#475569', fontSize: 14, fontWeight: '600', lineHeight: 22}}>Dựa trên thuật toán học máy WMA (Trọng số trung bình động), hệ thống dự phóng tổng chi tiêu cuối tháng của bạn sẽ đạt mức:</Text>
            <Text style={{fontSize: 34, fontWeight: '900', color: '#F43F5E', marginVertical: 15}}>{Math.round(prediction).toLocaleString()}đ</Text>
          </View>
          <View style={styles.chartCard}>
            <Text style={{fontWeight: '900', fontSize: 18, marginBottom: 15, alignSelf: 'flex-start', color: '#1E293B'}}>Cơ cấu danh mục</Text>
            {chart.length > 0 ? <PieChart data={chart} width={screenWidth - 50} height={220} chartConfig={{color:()=>'#000'}} accessor="population" backgroundColor="transparent" paddingLeft="15" /> : <Text style={{color: '#94A3B8'}}>Chưa đủ dữ liệu.</Text>}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' }, title: { fontSize: 36, fontWeight: '900', marginHorizontal: 25, marginBottom: 25, marginTop: 20, color: '#0F172A', letterSpacing: -1.5 },
  aiCard: { backgroundColor: '#FFF', marginHorizontal: 25, padding: 25, borderRadius: 35, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 }, shadowRadius: 15, elevation: 8, marginBottom: 25, borderWidth: 1, borderColor: '#EEF2FF' },
  chartCard: { backgroundColor: '#FFF', marginHorizontal: 25, borderRadius: 40, padding: 25, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 }, shadowRadius: 15, elevation: 8, alignItems: 'center' }
});
