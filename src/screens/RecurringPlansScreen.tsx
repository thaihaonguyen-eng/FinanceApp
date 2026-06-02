import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db } from '../services/db';

export default function RecurringPlansScreen() {
  const navigation = useNavigation();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      // Join with categories for display
      const result = await db.getAllAsync(`
        SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM recurring_plans r
        LEFT JOIN categories c ON r.category_id = c.id
        ORDER BY r.id DESC
      `);
      setPlans(result);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await db.runAsync('DELETE FROM recurring_plans WHERE id = ?', [id]);
      loadPlans();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xoá kế hoạch này.');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.planItem}>
      <View style={[styles.iconWrapper, { backgroundColor: (item.category_color || '#8EA0BA') + '20' }]}>
        <Ionicons name={item.category_icon || 'calendar'} size={24} color={item.category_color || '#8EA0BA'} />
      </View>
      <View style={styles.planInfo}>
        <Text style={styles.planCategory}>{item.category_name || 'Không rõ danh mục'}</Text>
        <Text style={styles.planAmount}>{item.amount.toLocaleString()} VND</Text>
        <View style={styles.planDetails}>
          <Ionicons name="repeat" size={14} color="#64748B" />
          <Text style={styles.planFrequency}>{item.frequency === 'monthly' ? 'Hàng tháng' : item.frequency === 'weekly' ? 'Hàng tuần' : item.frequency}</Text>
          <Text style={styles.planDate}> • Bắt đầu: {item.next_date}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#F43F5E" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giao dịch định kỳ</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Thông báo', 'Tính năng thêm đang được phát triển!')}>
          <Ionicons name="add" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {plans.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>Chưa có giao dịch định kỳ nào</Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  listContainer: {
    padding: 20,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  planInfo: {
    flex: 1,
  },
  planCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  planAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 6,
  },
  planDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planFrequency: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 4,
  },
  planDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
});
