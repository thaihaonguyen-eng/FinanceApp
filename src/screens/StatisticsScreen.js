import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { db, getFormattedMonth } from '../services/db';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';

const screenWidth = Dimensions.get("window").width;

export default function StatisticsScreen({ navigation }) {
  const { user } = useUser();
  const [chart, setChart] = useState([]); const [prediction, setPrediction] = useState(0);

  useEffect(() => { 
    navigation.addListener('focus', async () => {
      const data = await db.getAllAsync(`SELECT c.name, c.color, SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.type = 'expense' GROUP BY c.name`, [user.id]);
      setChart(data.map(r => ({ name: ` ${r.name}`, population: r.total, color: r.color, legendFontColor: "#475569", legendFontSize: 13 })));
      
      const currentMonth = getFormattedMonth();
      const txs = await db.getAllAsync(`SELECT date, SUM(amount) as daily_total FROM transactions WHERE user_id = ? AND type = 'expense' GROUP BY date`, [user.id]);
      const monthlyTxs = txs.filter(t => t.date.includes(currentMonth));
      
      let dailyData = {};
      monthlyTxs.forEach(t => {
         const day = parseInt(t.date.split('/')[0], 10);
         dailyData[day] = t.daily_total;
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
            <Text style={{fontSize: 34, fontWeight: '900', color: '#F43F5E', marginVertical: 15}}>{prediction.toLocaleString()}đ</Text>
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
  aiCard: { backgroundColor: '#FFF', marginHorizontal: 25, padding: 25, borderRadius: 35, elevation: 8, marginBottom: 25, borderWidth: 1, borderColor: '#EEF2FF' },
  chartCard: { backgroundColor: '#FFF', marginHorizontal: 25, borderRadius: 40, padding: 25, elevation: 8, alignItems: 'center' }
});
