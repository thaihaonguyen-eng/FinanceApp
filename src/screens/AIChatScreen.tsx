import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../services/db';
import { generateAIResponse } from '../services/ai';
import { useUser } from '../context/UserContext';
import ScreenBackground from '../components/ScreenBackground';
import { StackNavigationProp } from '@react-navigation/stack';

interface ChatMessage {
  id: string;
  text: string;
  isAi: boolean;
}

export default function AIChatScreen({ navigation }: { navigation: StackNavigationProp<any> }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: 'Chào bạn! Mình là Trợ lý AI Tài chính. (Hãy cài đặt mã Gemini API Key trong phần Cài đặt trước nhé). \n\nMình có thể giúp gì cho bạn hôm nay?', isAi: true }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const handleSend = async () => {
    if(!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    const newMsgs = [...messages, { id: Date.now().toString(), text: userText, isAi: false }];
    setMessages(newMsgs);
    setLoading(true);
    if (!user) return;

    const txs = await db.getAllAsync(`SELECT t.title, t.amount, t.type, t.date, c.name as categoryName FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? ORDER BY t.timestamp DESC LIMIT 10`, [user.id]);
    
    const reply = await generateAIResponse(userText, txs);
    setMessages([...newMsgs, { id: (Date.now()+1).toString(), text: reply, isAi: true }]);
    setLoading(false);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={{padding: 5}}><Ionicons name="arrow-back" size={28} color="#0F172A"/></TouchableOpacity>
          <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="sparkles" size={22} color="#4F46E5" style={{marginRight: 8}}/><Text style={styles.title}>Trợ Lý AI</Text></View>
          <TouchableOpacity onPress={()=>navigation.navigate('MainTabs', { screen: 'Settings' })} style={{padding: 5}}><Ionicons name="settings-outline" size={26} color="#64748B"/></TouchableOpacity>
        </View>
        <FlatList 
          ref={listRef}
          data={messages}
          keyExtractor={i=>i.id}
          onContentSizeChange={()=>listRef.current?.scrollToEnd({animated:true})}
          contentContainerStyle={{padding: 20, paddingBottom: 10}}
          renderItem={({item}) => (
            <View style={[styles.bubble, item.isAi ? styles.aiBubble : styles.userBubble]}>
              {item.isAi && <Ionicons name="hardware-chip" size={20} color="#FFF" style={{marginRight: 10, marginTop: 2}} />}
              <Text style={[styles.msgText, item.isAi ? {color:'#FFF'} : {color:'#1E293B'}]}>{item.text}</Text>
            </View>
          )}
        />
        {loading && <Text style={{marginLeft: 25, fontSize: 13, color: '#94A3B8', marginBottom: 10, fontStyle: 'italic'}}>Trợ lý đang suy nghĩ...</Text>}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputArea}>
            <TextInput style={styles.input} placeholder="Ví dụ: Đánh giá chi tiêu tuần qua" value={input} onChangeText={setInput} onSubmitEditing={handleSend}/>
            <TouchableOpacity style={[styles.sendBtn, !input.trim()&&{opacity: 0.5}]} onPress={handleSend} disabled={!input.trim() || loading}>
              <Ionicons name="send" size={20} color="#FFF"/>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: { padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 3 },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  bubble: { maxWidth: '85%', padding: 18, borderRadius: 24, marginBottom: 18, flexDirection: 'row', alignItems: 'flex-start' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#4F46E5', borderBottomLeftRadius: 5 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFF', borderBottomRightRadius: 5, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  msgText: { fontSize: 15, lineHeight: 24, flexShrink: 1 },
  inputArea: { flexDirection: 'row', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F8FAFC', padding: 18, borderRadius: 30, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sendBtn: { backgroundColor: '#4F46E5', width: 55, height: 55, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginLeft: 12, shadowColor: '#4F46E5', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 5 }
});
