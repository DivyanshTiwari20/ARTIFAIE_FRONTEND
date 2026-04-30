import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const faqItems = [
  {
    q: 'Who can create and assign tasks?',
    a: 'Admins and managers can assign tasks. Employees can update status and progress for tasks assigned to them.',
  },
  {
    q: 'Why can an employee not see client lists?',
    a: 'Client list access is restricted to admin and manager roles to keep data access controlled.',
  },
  {
    q: 'How do I update task progress?',
    a: 'Open Home, select your task, update status, and add title/description updates in the task update modal.',
  },
  {
    q: 'How is profile picture shown?',
    a: 'Profile images are shown if available; otherwise, a generated avatar is displayed automatically.',
  },
  {
    q: 'How do I report incorrect data?',
    a: 'Use Help & Support from Settings and share the task/client name, date, and screenshot if possible.',
  },
];

export default function FAQScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>FAQs</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        {faqItems.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.question}>{item.q}</Text>
            <Text style={styles.answer}>{item.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },
  content: { paddingHorizontal: 20, paddingTop: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  question: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  answer: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
});
