import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HelpSupportScreen() {
  const router = useRouter();

  const contactSupport = () => {
    Alert.alert('Support', 'Contact support at support@artifaie.com or +91-00000-00000.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <Text style={styles.sectionText}>1. Login with your assigned company credentials.</Text>
          <Text style={styles.sectionText}>2. Use Home for dashboard or assigned work updates.</Text>
          <Text style={styles.sectionText}>3. Managers can assign tasks and review employee progress.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Support</Text>
          <Text style={styles.sectionText}>- If a task is missing, refresh Home and check your network.</Text>
          <Text style={styles.sectionText}>- Use status update options to mark progress: Pending, In Progress, Completed, or Cancelled.</Text>
          <Text style={styles.sectionText}>- For wrong task assignments, contact your manager.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Support</Text>
          <Text style={styles.sectionText}>- Change password from Settings ? Update Password.</Text>
          <Text style={styles.sectionText}>- If your account is disabled, contact your admin.</Text>
          <Text style={styles.sectionText}>- For deletion requests, use Settings ? Delete Account.</Text>
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={contactSupport}>
          <Ionicons name="call-outline" size={18} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>Contact Support</Text>
        </TouchableOpacity>
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionText: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 4 },
  contactButton: {
    marginTop: 8,
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  contactButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
