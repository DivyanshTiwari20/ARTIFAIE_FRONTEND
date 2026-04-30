import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>About</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.card}>
          <Text style={styles.appName}>ARTIFAIE Office App</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.body}>
            This app is built for operational collaboration between admins, managers, and employees across client management,
            task tracking, and finance workflows.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Core Features</Text>
          <Text style={styles.body}>- Role-based access for admin, manager, and employee.</Text>
          <Text style={styles.body}>- Task assignment with status tracking and updates.</Text>
          <Text style={styles.body}>- Client directory and employee directory management.</Text>
          <Text style={styles.body}>- Tally-integrated reporting for eligible users.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Text style={styles.body}>For support or feedback, use the Help & Support page in Settings.</Text>
        </View>
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
  appName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  version: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  body: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 3 },
});
